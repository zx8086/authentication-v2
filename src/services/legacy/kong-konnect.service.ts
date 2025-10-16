/* src/services/kong-konnect.service.ts */

import type {
  Consumer,
  ConsumerResponse,
  ConsumerSecret,
  IKongCacheService,
  IKongService,
  KongCacheStats,
  KongHealthCheckResult,
} from "../../config";
import { getCachingConfig, getKongConfig } from "../../config";
import { recordError, recordKongOperation } from "../../telemetry/metrics";
import { winstonTelemetryLogger } from "../../telemetry/winston-logger";
import { withRetry } from "../../utils/retry";
import { CacheFactory } from "../cache/cache-factory";
import type { CircuitBreakerStats } from "../shared-circuit-breaker.service";
import { SharedCircuitBreakerService } from "../shared-circuit-breaker.service";

export class KongKonnectService implements IKongService {
  private readonly gatewayAdminUrl: string;
  private readonly consumerAdminUrl: string;
  private readonly adminToken: string;
  private readonly controlPlaneId: string;
  private readonly realmId: string;
  private cache: IKongCacheService | null = null;
  private circuitBreaker: SharedCircuitBreakerService;

  constructor(adminUrl: string, adminToken: string) {
    const url = new URL(adminUrl);

    if (url.hostname.includes("konghq.com")) {
      const pathMatch = url.pathname.match(/\/v2\/control-planes\/([a-f0-9-]+)/);
      if (!pathMatch) {
        throw new Error(
          "Invalid Kong Konnect URL format. Expected: https://region.api.konghq.com/v2/control-planes/{id}"
        );
      }

      this.controlPlaneId = pathMatch[1];
      this.gatewayAdminUrl = adminUrl.replace(/\/$/, "");
      this.consumerAdminUrl = `${url.protocol}//${url.hostname}/v1`;
      this.realmId = `auth-realm-${this.controlPlaneId.substring(0, 8)}`;
    } else {
      this.gatewayAdminUrl = adminUrl.replace(/\/$/, "");
      this.consumerAdminUrl = adminUrl.replace(/\/$/, "");
      this.controlPlaneId = "self-hosted";
      this.realmId = "default";
    }

    this.adminToken = adminToken;

    // Initialize shared circuit breaker with configuration
    const kongConfig = getKongConfig();
    const cachingConfig = getCachingConfig();
    const circuitBreakerConfig = {
      ...kongConfig.circuitBreaker,
      highAvailability: kongConfig.highAvailability,
    };
    this.circuitBreaker = SharedCircuitBreakerService.getInstance(
      circuitBreakerConfig,
      cachingConfig,
      undefined
    );

    // Initialize cache asynchronously - cache operations will handle connection automatically
    CacheFactory.createKongCache()
      .then((cache) => {
        this.cache = cache;
        // Update circuit breaker with cache service for HA mode if needed
        if (kongConfig.highAvailability) {
          SharedCircuitBreakerService.updateCacheService(cache);
        }
      })
      .catch(console.error);
  }

  async getConsumerSecret(consumerId: string): Promise<ConsumerSecret | null> {
    // Ensure cache is initialized
    if (!this.cache) {
      this.cache = await CacheFactory.createKongCache();
    }

    const cacheKey = `consumer_secret:${consumerId}`;

    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Wrap ALL Kong operations in circuit breaker to enable stale cache fallback
    // when any Kong operation fails (including prerequisite calls)
    return await this.circuitBreaker.wrapKongConsumerOperation(
      "getConsumerSecret",
      consumerId,
      async () => {
        // ALL Kong operations inside circuit breaker for consistent fallback behavior
        await this.ensureRealmExists();
        const consumerUuid = await this.getConsumerId(consumerId);

        if (!consumerUuid) {
          // Consumer doesn't exist - this is a legitimate business case, not a circuit breaker scenario
          return null;
        }

        const keysUrl = `${this.gatewayAdminUrl}/core-entities/consumers/${consumerUuid}/jwt`;

        const response = await withRetry(
          () =>
            fetch(keysUrl, {
              method: "GET",
              headers: {
                Authorization: `Bearer ${this.adminToken}`,
                "Content-Type": "application/json",
                "User-Agent": "Authentication-Service/1.0",
              },
              signal: AbortSignal.timeout(5000),
            }),
          { maxAttempts: 2, baseDelayMs: 100 }
        );

        if (!response.ok) {
          if (response.status === 404) {
            return null;
          }

          const _errorText = await response.text();
          throw new Error(`Kong API error: ${response.status} ${response.statusText}`);
        }

        const data = (await response.json()) as ConsumerResponse;

        if (!data.data || data.data.length === 0) {
          return null;
        }

        const secret = data.data[0];

        // Store in cache after successful retrieval
        if (this.cache) {
          await this.cache.set(cacheKey, secret);
        }

        return secret;
      }
    );
  }

  async createConsumerSecret(consumerId: string): Promise<ConsumerSecret | null> {
    return await this.circuitBreaker.wrapKongConsumerOperation(
      "createConsumerSecret",
      consumerId,
      async () => {
        // ALL Kong operations inside circuit breaker for consistent fallback behavior
        await this.ensureRealmExists();
        const consumerUuid = await this.getConsumerId(consumerId);

        if (!consumerUuid) {
          return null;
        }

        const key = crypto.randomUUID().replace(/-/g, "");
        const secret = this.generateSecureSecret();

        const url = `${this.gatewayAdminUrl}/core-entities/consumers/${consumerUuid}/jwt`;

        const response = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.adminToken}`,
            "Content-Type": "application/json",
            "User-Agent": "Authentication-Service/1.0",
          },
          body: JSON.stringify({
            key: key,
            secret: secret,
          }),
          signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
          const errorText = await response.text();
          winstonTelemetryLogger.error("Failed to create JWT credentials in Kong", {
            consumerId,
            status: response.status,
            statusText: response.statusText,
            error: errorText,
            operation: "create_jwt_credentials",
          });
          throw new Error(`Kong API error: ${response.status} ${response.statusText}`);
        }

        const createdSecret = (await response.json()) as ConsumerSecret;

        // Store in cache after successful creation
        const cacheKey = `consumer_secret:${consumerId}`;
        if (this.cache) {
          await this.cache.set(cacheKey, createdSecret);
        }

        return createdSecret;
      }
    );
  }

  private async ensureRealmExists(): Promise<void> {
    const checkUrl = `${this.consumerAdminUrl}/realms/${this.realmId}`;

    const checkResponse = await fetch(checkUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.adminToken}`,
        "User-Agent": "Authentication-Service/1.0",
      },
      signal: AbortSignal.timeout(5000),
    });

    if (checkResponse.ok) {
      return;
    }

    if (checkResponse.status !== 404) {
      throw new Error(`Unexpected error checking realm: ${checkResponse.status}`);
    }

    const createUrl = `${this.consumerAdminUrl}/realms`;

    const createRealmRequest = {
      name: this.realmId,
      allowed_control_planes: [this.controlPlaneId],
    };

    const createResponse = await fetch(createUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.adminToken}`,
        "Content-Type": "application/json",
        "User-Agent": "Authentication-Service/1.0",
      },
      body: JSON.stringify(createRealmRequest),
      signal: AbortSignal.timeout(10000),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();

      if (createResponse.status === 400 && errorText.includes("realm name must be unique")) {
        return;
      }

      throw new Error(`Failed to create realm: ${createResponse.status} ${errorText}`);
    }
  }

  private async getConsumerId(consumerId: string): Promise<string | null> {
    const checkUrl = `${this.gatewayAdminUrl}/core-entities/consumers/${consumerId}`;

    const checkResponse = await fetch(checkUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.adminToken}`,
        "User-Agent": "Authentication-Service/1.0",
      },
      signal: AbortSignal.timeout(5000),
    });

    if (checkResponse.ok) {
      const existingConsumer = (await checkResponse.json()) as Consumer;
      return existingConsumer.id;
    }

    if (checkResponse.status === 404) {
      winstonTelemetryLogger.warn("Consumer not found in Kong", {
        consumerId,
        message: "Consumer must be created in Kong before JWT credentials can be provisioned",
        operation: "consumer_not_found",
      });
      return null;
    }

    winstonTelemetryLogger.error("Unexpected error checking consumer existence", {
      consumerId,
      status: checkResponse.status,
      operation: "check_consumer",
    });
    throw new Error(`Unexpected error checking consumer: ${checkResponse.status}`);
  }

  private generateSecureSecret(): string {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  async healthCheck(): Promise<KongHealthCheckResult> {
    const startTime = Bun.nanoseconds();

    const result = await this.circuitBreaker.wrapKongOperation<KongHealthCheckResult>(
      "healthCheck",
      async () => {
        const response = await withRetry(
          () =>
            fetch(`${this.gatewayAdminUrl}`, {
              method: "GET",
              headers: {
                Authorization: `Bearer ${this.adminToken}`,
                "User-Agent": "Authentication-Service/1.0",
              },
              signal: AbortSignal.timeout(5000),
            }),
          { maxAttempts: 2, baseDelayMs: 50 }
        );

        const responseTime = (Bun.nanoseconds() - startTime) / 1_000_000;

        if (response.ok) {
          recordKongOperation("health_check", "success", responseTime, true);
          winstonTelemetryLogger.debug("Kong health check successful", {
            responseTime,
            operation: "health_check",
          });
          return { healthy: true, responseTime };
        } else {
          const errorMsg = `HTTP ${response.status}`;
          let detailedError = errorMsg;

          if (response.status === 401) {
            detailedError = "Authentication failed - invalid Kong admin token";
            winstonTelemetryLogger.error("Kong authentication failed", {
              status: response.status,
              message: "Invalid or expired Kong admin token",
              operation: "health_check",
            });
          } else if (response.status === 403) {
            detailedError = "Permission denied - insufficient Kong admin privileges";
            winstonTelemetryLogger.error("Kong permission denied", {
              status: response.status,
              message: "Admin token lacks necessary permissions",
              operation: "health_check",
            });
          } else if (response.status === 404) {
            detailedError = "Kong admin API endpoint not found - check URL configuration";
            winstonTelemetryLogger.error("Kong endpoint not found", {
              status: response.status,
              url: this.gatewayAdminUrl,
              message: "Kong admin URL may be incorrect",
              operation: "health_check",
            });
          } else {
            winstonTelemetryLogger.error("Kong health check failed", {
              status: response.status,
              statusText: response.statusText || "Unknown",
              operation: "health_check",
            });
          }

          recordKongOperation("health_check", "failure", responseTime, false);
          recordError("kong_health_check_failed", {
            status: response.status,
            statusText: response.statusText || "Unknown",
          });

          throw new Error(detailedError);
        }
      }
    );

    if (result === null) {
      // Circuit breaker is open and rejected the request
      const responseTime = (Bun.nanoseconds() - startTime) / 1_000_000;
      recordKongOperation("health_check", "failure", responseTime, false);
      recordError("kong_health_check_circuit_breaker", {
        status: "circuit_open",
        message: "Circuit breaker rejected request",
      });

      return {
        healthy: false,
        responseTime,
        error: "Circuit breaker open - Kong Admin API unavailable",
      };
    }

    return result;
  }

  async clearCache(consumerId?: string): Promise<void> {
    // Ensure cache is initialized before clearing
    if (!this.cache) {
      this.cache = await CacheFactory.createKongCache();
    }

    if (consumerId) {
      const cacheKey = `consumer_secret:${consumerId}`;
      await this.cache.delete(cacheKey);
    } else {
      await this.cache.clear();
    }
  }

  async getCacheStats(): Promise<KongCacheStats> {
    // Ensure cache is initialized before getting stats
    if (!this.cache) {
      this.cache = await CacheFactory.createKongCache();
    }
    return await this.cache.getStats();
  }

  getCircuitBreakerStats(): Record<string, CircuitBreakerStats> {
    return this.circuitBreaker.getStats();
  }
}
