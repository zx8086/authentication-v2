/* src/adapters/kong.adapter.ts */

import type {
  ConsumerResponse,
  ConsumerSecret,
  IKongCacheService,
  KongCacheStats,
  KongHealthCheckResult,
  KongModeType,
} from "../config";
import { getCachingConfig, getKongConfig } from "../config";
import { CacheFactory } from "../services/cache/cache-factory";
import type { CircuitBreakerStats } from "../services/shared-circuit-breaker.service";
import { SharedCircuitBreakerService } from "../services/shared-circuit-breaker.service";
import { recordError, recordKongOperation } from "../telemetry/metrics";
import { winstonTelemetryLogger } from "../telemetry/winston-logger";
import { withRetry } from "../utils/retry";
import type { IAPIGatewayAdapter, IKongModeStrategy } from "./api-gateway-adapter.interface";
import { createKongModeStrategy } from "./kong-mode-strategies";
import {
  createRequestTimeout,
  extractConsumerSecret,
  generateCacheKey,
  generateJwtKey,
  generateSecureSecret,
  isConsumerNotFound,
  isSuccessResponse,
  parseKongApiError,
} from "./kong-utils";

/**
 * Kong Adapter
 *
 * Unified adapter for Kong API Gateway and Kong Konnect that consolidates
 * the previously duplicated logic from KongApiGatewayService and KongKonnectService.
 *
 * This adapter:
 * - Encapsulates Kong mode-specific differences using strategy pattern
 * - Centralizes cache management and circuit breaker integration
 * - Provides consistent error handling and logging across Kong modes
 * - Maintains backward compatibility with existing IKongService interface
 */
export class KongAdapter implements IAPIGatewayAdapter {
  private readonly strategy: IKongModeStrategy;
  private cache: IKongCacheService | null = null;
  private circuitBreaker: SharedCircuitBreakerService;

  constructor(
    private readonly mode: KongModeType,
    private readonly adminUrl: string,
    private readonly adminToken: string
  ) {
    // Create mode-specific strategy
    this.strategy = createKongModeStrategy(mode, adminUrl, adminToken);

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

    // Initialize cache asynchronously
    this.initializeCache();
  }

  private async initializeCache(): Promise<void> {
    try {
      this.cache = await CacheFactory.createKongCache();

      // Update circuit breaker with cache service for HA mode
      const kongConfig = getKongConfig();
      if (kongConfig.highAvailability) {
        SharedCircuitBreakerService.updateCacheService(this.cache);
      }
    } catch (error) {
      winstonTelemetryLogger.error("Failed to initialize Kong adapter cache", {
        error: error instanceof Error ? error.message : "Unknown error",
        mode: this.mode,
        operation: "cache_initialization",
      });
    }
  }

  async getConsumerSecret(consumerId: string): Promise<ConsumerSecret | null> {
    // Ensure cache is initialized
    await this.ensureCacheInitialized();

    const cacheKey = generateCacheKey(consumerId);

    // Check cache first
    const cached = await this.cache?.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Use circuit breaker for Kong operations
    return await this.circuitBreaker.wrapKongConsumerOperation(
      "getConsumerSecret",
      consumerId,
      async () => {
        // Ensure prerequisites (realm for Konnect)
        if (this.strategy.ensurePrerequisites) {
          await this.strategy.ensurePrerequisites();
        }

        // Build consumer URL using strategy
        const url = await this.strategy.buildConsumerUrl(this.adminUrl, consumerId);

        const response = await withRetry(
          () =>
            fetch(url, {
              method: "GET",
              headers: this.strategy.createAuthHeaders(this.adminToken),
              signal: createRequestTimeout(5000),
            }),
          { maxAttempts: 2, baseDelayMs: 100 }
        );

        if (!isSuccessResponse(response)) {
          if (isConsumerNotFound(response)) {
            return null;
          }

          const errorMessage = await parseKongApiError(response);
          throw new Error(errorMessage);
        }

        const data = (await response.json()) as ConsumerResponse;
        const secret = extractConsumerSecret(data);

        if (!secret) {
          return null;
        }

        // Store in cache after successful retrieval
        await this.cache?.set(cacheKey, secret);

        return secret;
      }
    );
  }

  async createConsumerSecret(consumerId: string): Promise<ConsumerSecret | null> {
    return await this.circuitBreaker.wrapKongConsumerOperation(
      "createConsumerSecret",
      consumerId,
      async () => {
        // Ensure prerequisites (realm for Konnect)
        if (this.strategy.ensurePrerequisites) {
          await this.strategy.ensurePrerequisites();
        }

        // Resolve consumer ID if needed (UUID for Konnect)
        let resolvedConsumerId = consumerId;
        if (this.strategy.resolveConsumerId) {
          const resolved = await this.strategy.resolveConsumerId(consumerId);
          if (!resolved) {
            return null; // Consumer doesn't exist
          }
          resolvedConsumerId = resolved;
        }

        const key = generateJwtKey();
        const secret = generateSecureSecret();

        // Build consumer URL using strategy
        const url = await this.strategy.buildConsumerUrl(this.adminUrl, resolvedConsumerId);

        const response = await fetch(url, {
          method: "POST",
          headers: this.strategy.createAuthHeaders(this.adminToken),
          body: JSON.stringify({
            key: key,
            secret: secret,
          }),
          signal: createRequestTimeout(10000),
        });

        if (!isSuccessResponse(response)) {
          if (isConsumerNotFound(response)) {
            winstonTelemetryLogger.warn("Consumer not found when creating JWT credentials", {
              consumerId,
              message: "Consumer must be created in Kong before JWT credentials can be provisioned",
              operation: "create_consumer_secret",
              mode: this.mode,
            });
            return null;
          }

          const errorMessage = await parseKongApiError(response);
          winstonTelemetryLogger.error("Failed to create JWT credentials in Kong", {
            consumerId,
            error: errorMessage,
            operation: "create_jwt_credentials",
            mode: this.mode,
          });
          throw new Error(errorMessage);
        }

        const createdSecret = (await response.json()) as ConsumerSecret;

        // Store in cache after successful creation
        await this.ensureCacheInitialized();
        const cacheKey = generateCacheKey(consumerId);
        await this.cache?.set(cacheKey, createdSecret);

        return createdSecret;
      }
    );
  }

  async healthCheck(): Promise<KongHealthCheckResult> {
    const startTime = Bun.nanoseconds();

    try {
      const result = await this.circuitBreaker.wrapKongOperation<KongHealthCheckResult>(
        "healthCheck",
        async () => {
          const url = this.strategy.buildHealthUrl(this.adminUrl);

          const response = await withRetry(
            () =>
              fetch(url, {
                method: "GET",
                headers: this.strategy.createAuthHeaders(this.adminToken),
                signal: createRequestTimeout(5000),
              }),
            { maxAttempts: 2, baseDelayMs: 50 }
          );

          const responseTime = (Bun.nanoseconds() - startTime) / 1_000_000;

          if (isSuccessResponse(response)) {
            recordKongOperation("health_check", "success", responseTime, true);
            winstonTelemetryLogger.debug("Kong health check successful", {
              responseTime,
              operation: "health_check",
              mode: this.mode,
            });
            return { healthy: true, responseTime };
          } else {
            const errorMessage = await parseKongApiError(response);

            recordKongOperation("health_check", "failure", responseTime, false);
            recordError("kong_health_check_failed", {
              status: response.status,
              statusText: response.statusText || "Unknown",
              mode: this.mode,
            });

            winstonTelemetryLogger.error("Kong health check failed", {
              status: response.status,
              statusText: response.statusText || "Unknown",
              error: errorMessage,
              operation: "health_check",
              mode: this.mode,
            });

            return {
              healthy: false,
              responseTime,
              error: errorMessage,
            };
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
          mode: this.mode,
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

      recordKongOperation("health_check", "failure", responseTime, false);
      recordError("kong_health_check_error", {
        error: errorMessage,
        message: "Health check failed with error",
        mode: this.mode,
      });

      return {
        healthy: false,
        responseTime,
        error: errorMessage,
      };
    }
  }

  async clearCache(consumerId?: string): Promise<void> {
    await this.ensureCacheInitialized();

    if (consumerId) {
      const cacheKey = generateCacheKey(consumerId);
      await this.cache?.delete(cacheKey);
    } else {
      await this.cache?.clear();
    }
  }

  async getCacheStats(): Promise<KongCacheStats> {
    await this.ensureCacheInitialized();
    if (!this.cache) {
      throw new Error("Cache not initialized");
    }
    return await this.cache.getStats();
  }

  getCircuitBreakerStats(): Record<string, CircuitBreakerStats> {
    return this.circuitBreaker.getStats();
  }

  private async ensureCacheInitialized(): Promise<void> {
    if (!this.cache) {
      this.cache = await CacheFactory.createKongCache();
    }
  }
}
