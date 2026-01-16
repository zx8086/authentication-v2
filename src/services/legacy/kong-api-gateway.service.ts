/* src/services/kong-api-gateway.service.ts */

import { createStandardHeaders } from "../../adapters/kong-utils";
import type {
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
import { generateKeyId } from "../../utils/response";
import { CacheFactory } from "../cache/cache-factory";
import type { CircuitBreakerStats } from "../circuit-breaker.service";
import { KongCircuitBreakerService } from "../circuit-breaker.service";

export class KongApiGatewayService implements IKongService {
  private readonly baseUrl: string;
  private readonly adminToken: string;
  private cache: IKongCacheService | null = null;
  private circuitBreaker?: KongCircuitBreakerService;

  constructor(adminUrl: string, adminToken: string) {
    this.baseUrl = adminUrl.replace(/\/$/, "");
    this.adminToken = adminToken;

    // Initialize cache and shared circuit breaker with HA configuration
    const kongConfig = getKongConfig();
    const cachingConfig = getCachingConfig();
    const circuitBreakerConfig = {
      ...kongConfig.circuitBreaker,
      highAvailability: kongConfig.highAvailability,
    };

    // Initialize per-operation circuit breaker
    this.circuitBreaker = new KongCircuitBreakerService(
      circuitBreakerConfig,
      cachingConfig,
      undefined
    );

    // Initialize cache asynchronously - cache operations will handle connection automatically
    CacheFactory.createKongCache()
      .then((cache) => {
        this.cache = cache;
        // Update circuit breaker with cache service for HA mode
        if (kongConfig.highAvailability && cache) {
          this.circuitBreaker = new KongCircuitBreakerService(
            circuitBreakerConfig,
            cachingConfig,
            cache
          );
        }
      })
      .catch((error) => {
        console.error("Failed to initialize cache:", error);
        // Keep the existing shared circuit breaker instance for non-HA mode
      });
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

    // Use per-operation circuit breaker for consumer operations
    if (!this.circuitBreaker) {
      const kongConfig = getKongConfig();
      const cachingConfig = getCachingConfig();
      const circuitBreakerConfig = {
        ...kongConfig.circuitBreaker,
        highAvailability: kongConfig.highAvailability,
      };
      this.circuitBreaker = new KongCircuitBreakerService(
        circuitBreakerConfig,
        cachingConfig,
        this.cache || undefined
      );
    }

    return await this.circuitBreaker.wrapKongConsumerOperation(
      "getConsumerSecret",
      consumerId,
      async () => {
        // Kong API Gateway supports consumer lookup by username directly
        const url = `${this.baseUrl}/consumers/${consumerId}/jwt`;

        // Use createStandardHeaders for W3C trace context propagation
        const headers = createStandardHeaders(
          this.adminToken ? { "Kong-Admin-Token": this.adminToken } : {}
        );

        const response = await fetch(url, {
          method: "GET",
          headers,
          signal: AbortSignal.timeout(5000),
        });

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
    // Ensure circuit breaker is initialized
    if (!this.circuitBreaker) {
      const kongConfig = getKongConfig();
      const cachingConfig = getCachingConfig();
      const circuitBreakerConfig = {
        ...kongConfig.circuitBreaker,
        highAvailability: kongConfig.highAvailability,
      };
      this.circuitBreaker = new KongCircuitBreakerService(
        circuitBreakerConfig,
        cachingConfig,
        this.cache || undefined
      );
    }

    return await this.circuitBreaker.wrapKongConsumerOperation(
      "createConsumerSecret",
      consumerId,
      async () => {
        const key = generateKeyId();
        const secret = this.generateSecureSecret();

        // Kong API Gateway supports consumer lookup by username directly
        const url = `${this.baseUrl}/consumers/${consumerId}/jwt`;

        // Use createStandardHeaders for W3C trace context propagation
        const headers = createStandardHeaders(
          this.adminToken ? { "Kong-Admin-Token": this.adminToken } : {}
        );

        const response = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify({
            key: key,
            secret: secret,
          }),
          signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
          const errorText = await response.text();

          if (response.status === 404) {
            winstonTelemetryLogger.warn("Consumer not found in Kong", {
              consumerId,
              message: "Consumer must be created in Kong before JWT credentials can be provisioned",
              operation: "create_consumer_secret",
            });
            return null; // Consumer doesn't exist, return null as per interface
          } else {
            winstonTelemetryLogger.error("Failed to create JWT credentials in Kong", {
              consumerId,
              status: response.status,
              statusText: response.statusText,
              error: errorText,
              operation: "create_jwt_credentials",
            });
            throw new Error(`Kong API error: ${response.status} ${response.statusText}`);
          }
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

  private generateSecureSecret(): string {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  async healthCheck(): Promise<KongHealthCheckResult> {
    const startTime = Bun.nanoseconds();

    // Ensure circuit breaker is initialized
    if (!this.circuitBreaker) {
      const kongConfig = getKongConfig();
      const cachingConfig = getCachingConfig();
      const circuitBreakerConfig = {
        ...kongConfig.circuitBreaker,
        highAvailability: kongConfig.highAvailability,
      };
      this.circuitBreaker = new KongCircuitBreakerService(
        circuitBreakerConfig,
        cachingConfig,
        this.cache || undefined
      );
    }

    try {
      const result = await this.circuitBreaker.wrapKongOperation<KongHealthCheckResult>(
        "healthCheck",
        async () => {
          // Use createStandardHeaders for W3C trace context propagation
          const headers = createStandardHeaders(
            this.adminToken ? { "Kong-Admin-Token": this.adminToken } : {}
          );

          const response = await fetch(`${this.baseUrl}/status`, {
            method: "GET",
            headers,
            signal: AbortSignal.timeout(5000),
          });

          const responseTime = (Bun.nanoseconds() - startTime) / 1_000_000;

          if (response.ok) {
            recordKongOperation("health_check", responseTime, true);
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
                url: `${this.baseUrl}/status`,
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

            recordKongOperation("health_check", responseTime, false);
            recordError("kong_health_check_failed", {
              status: response.status,
              statusText: response.statusText || "Unknown",
            });

            // Return unhealthy status instead of throwing
            return {
              healthy: false,
              responseTime,
              error: detailedError,
            };
          }
        }
      );

      if (result === null) {
        // Circuit breaker is open and rejected the request
        const responseTime = (Bun.nanoseconds() - startTime) / 1_000_000;
        recordKongOperation("health_check", responseTime, false);
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
    } catch (error) {
      // Handle errors when circuit breaker is disabled or other unexpected errors
      const responseTime = (Bun.nanoseconds() - startTime) / 1_000_000;
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      recordKongOperation("health_check", responseTime, false);
      recordError("kong_health_check_error", {
        error: errorMessage,
        message: "Health check failed with error",
      });

      return {
        healthy: false,
        responseTime,
        error: errorMessage,
      };
    }
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
    if (!this.cache) {
      this.cache = await CacheFactory.createKongCache();
    }
    return await this.cache.getStats();
  }

  getCircuitBreakerStats(): Record<string, CircuitBreakerStats> {
    return this.circuitBreaker?.getStats() ?? {};
  }
}
