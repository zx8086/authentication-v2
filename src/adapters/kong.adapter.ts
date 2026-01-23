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
import type { CircuitBreakerStats } from "../services/circuit-breaker.service";
import { KongCircuitBreakerService } from "../services/circuit-breaker.service";
import { recordError, recordKongOperation } from "../telemetry/metrics";
import { winstonTelemetryLogger } from "../telemetry/winston-logger";
import { fetchWithFallback } from "../utils/bun-fetch-fallback";
import { withRetry } from "../utils/retry";
import type { IAPIGatewayAdapter, IKongModeStrategy } from "./api-gateway-adapter.interface";
import { createKongModeStrategy } from "./kong-mode-strategies";
import {
  createKongApiError,
  createRequestTimeout,
  extractConsumerSecret,
  generateCacheKey,
  generateJwtKey,
  generateSecureSecret,
  isConsumerNotFound,
  isSuccessResponse,
} from "./kong-utils";

// Unified adapter for Kong API Gateway and Kong Konnect using strategy pattern
export class KongAdapter implements IAPIGatewayAdapter {
  private readonly strategy: IKongModeStrategy;
  private cache: IKongCacheService | null = null;
  private circuitBreaker: KongCircuitBreakerService;

  constructor(
    private readonly mode: KongModeType,
    private readonly adminUrl: string,
    private readonly adminToken: string
  ) {
    this.strategy = createKongModeStrategy(mode, adminUrl, adminToken);

    const kongConfig = getKongConfig();
    const cachingConfig = getCachingConfig();
    const circuitBreakerConfig = {
      ...kongConfig.circuitBreaker,
      highAvailability: kongConfig.highAvailability,
    };

    this.circuitBreaker = new KongCircuitBreakerService(
      circuitBreakerConfig,
      cachingConfig,
      undefined
    );

    this.initializeCache();
  }

  private async initializeCache(): Promise<void> {
    try {
      this.cache = await CacheFactory.createKongCache();

      const kongConfig = getKongConfig();
      if (kongConfig.highAvailability && this.cache) {
        const circuitBreakerConfig = {
          ...kongConfig.circuitBreaker,
          highAvailability: kongConfig.highAvailability,
        };
        const cachingConfig = getCachingConfig();
        this.circuitBreaker = new KongCircuitBreakerService(
          circuitBreakerConfig,
          cachingConfig,
          this.cache
        );
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
    await this.ensureCacheInitialized();

    const cacheKey = generateCacheKey(consumerId);

    const cached = await this.cache?.get(cacheKey);
    if (cached) {
      return cached;
    }

    return await this.circuitBreaker.wrapKongConsumerOperation(
      "getConsumerSecret",
      consumerId,
      async () => {
        if (this.strategy.ensurePrerequisites) {
          await this.strategy.ensurePrerequisites();
        }

        let resolvedConsumerId = consumerId;
        if (this.strategy.resolveConsumerId) {
          const resolved = await this.strategy.resolveConsumerId(consumerId);
          if (!resolved) {
            return null;
          }
          resolvedConsumerId = resolved;
        }

        const url = await this.strategy.buildConsumerUrl(this.adminUrl, resolvedConsumerId);

        const response = await withRetry(
          () =>
            fetchWithFallback(url, {
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

          throw await createKongApiError(response);
        }

        const data = (await response.json()) as ConsumerResponse;
        const secret = extractConsumerSecret(data);

        if (!secret) {
          return null;
        }

        // Prevent cache pollution - validate consumer ID matches before caching
        if (secret.consumer && secret.consumer.id !== consumerId) {
          winstonTelemetryLogger.error(`Consumer ID mismatch in Kong response, not caching`, {
            operation: "getConsumerSecret",
            requestedConsumerId: consumerId,
            responseConsumerId: secret.consumer.id,
            cacheKey,
            component: "kong_adapter",
            action: "consumer_id_mismatch",
            mode: this.mode,
          });
          return secret;
        }

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
        if (this.strategy.ensurePrerequisites) {
          await this.strategy.ensurePrerequisites();
        }

        let resolvedConsumerId = consumerId;
        if (this.strategy.resolveConsumerId) {
          const resolved = await this.strategy.resolveConsumerId(consumerId);
          if (!resolved) {
            return null;
          }
          resolvedConsumerId = resolved;
        }

        const url = await this.strategy.buildConsumerUrl(this.adminUrl, resolvedConsumerId);
        const maxRetries = 3;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          const key = generateJwtKey();
          const secret = generateSecureSecret();

          const response = await fetchWithFallback(url, {
            method: "POST",
            headers: this.strategy.createAuthHeaders(this.adminToken),
            body: JSON.stringify({
              key: key,
              secret: secret,
            }),
            signal: createRequestTimeout(10000),
          });

          if (isSuccessResponse(response)) {
            const createdSecret = (await response.json()) as ConsumerSecret;

            // Prevent cache pollution - validate consumer ID matches before caching
            if (createdSecret.consumer && createdSecret.consumer.id !== consumerId) {
              winstonTelemetryLogger.error(
                `Consumer ID mismatch in Kong create response, not caching`,
                {
                  operation: "createConsumerSecret",
                  requestedConsumerId: consumerId,
                  responseConsumerId: createdSecret.consumer.id,
                  component: "kong_adapter",
                  action: "consumer_id_mismatch",
                  mode: this.mode,
                }
              );
              return createdSecret;
            }

            await this.ensureCacheInitialized();
            const cacheKey = generateCacheKey(consumerId);
            await this.cache?.set(cacheKey, createdSecret);

            return createdSecret;
          }

          if (isConsumerNotFound(response)) {
            winstonTelemetryLogger.warn("Consumer not found when creating JWT credentials", {
              consumerId,
              message: "Consumer must be created in Kong before JWT credentials can be provisioned",
              operation: "create_consumer_secret",
              mode: this.mode,
            });
            return null;
          }

          // Handle 409 Conflict (unique constraint violation) - retry with new key
          if (response.status === 409) {
            winstonTelemetryLogger.warn("JWT key collision detected, retrying with new key", {
              consumerId,
              attempt,
              maxRetries,
              status: response.status,
              operation: "create_consumer_secret",
              mode: this.mode,
            });

            if (attempt < maxRetries) {
              continue; // Retry with new key
            }

            // Max retries exhausted
            const kongError = await createKongApiError(response);
            winstonTelemetryLogger.error(
              "Failed to create JWT credentials after max retries due to key collisions",
              {
                consumerId,
                error: kongError.message,
                status: kongError.status,
                attempts: maxRetries,
                operation: "create_jwt_credentials",
                mode: this.mode,
              }
            );
            throw kongError;
          }

          // Other errors - fail immediately
          const kongError = await createKongApiError(response);
          winstonTelemetryLogger.error("Failed to create JWT credentials in Kong", {
            consumerId,
            error: kongError.message,
            status: kongError.status,
            operation: "create_jwt_credentials",
            mode: this.mode,
          });
          throw kongError;
        }

        // Should never reach here, but TypeScript needs this
        return null;
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
              fetchWithFallback(url, {
                method: "GET",
                headers: this.strategy.createAuthHeaders(this.adminToken),
                signal: createRequestTimeout(5000),
              }),
            { maxAttempts: 2, baseDelayMs: 50 }
          );

          const responseTime = (Bun.nanoseconds() - startTime) / 1_000_000;

          if (isSuccessResponse(response)) {
            recordKongOperation("health_check", responseTime, true);
            winstonTelemetryLogger.debug("Kong health check successful", {
              responseTime,
              operation: "health_check",
              mode: this.mode,
            });
            return { healthy: true, responseTime };
          } else {
            const kongError = await createKongApiError(response);

            recordKongOperation("health_check", responseTime, false);
            recordError("kong_health_check_failed", {
              status: kongError.status,
              statusText: kongError.statusText,
              mode: this.mode,
            });

            winstonTelemetryLogger.error("Kong health check failed", {
              status: kongError.status,
              statusText: kongError.statusText,
              error: kongError.message,
              operation: "health_check",
              mode: this.mode,
            });

            // Throw infrastructure errors to trigger circuit breaker
            if (kongError.isInfrastructureError) {
              throw kongError;
            }

            return {
              healthy: false,
              responseTime,
              error: kongError.message,
            };
          }
        }
      );

      if (result === null) {
        const responseTime = (Bun.nanoseconds() - startTime) / 1_000_000;
        recordKongOperation("health_check", responseTime, false);
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
      const responseTime = (Bun.nanoseconds() - startTime) / 1_000_000;
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      recordKongOperation("health_check", responseTime, false);
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
