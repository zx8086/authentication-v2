/* src/services/circuit-breaker.service.ts */

import CircuitBreaker from "opossum";
import type {
  CachingConfig,
  CircuitBreakerConfig,
  ConsumerSecret,
  IKongCacheService,
  OperationCircuitBreakerConfig,
} from "../config/schemas";
import {
  recordCacheTierError,
  recordCacheTierLatency,
  recordCacheTierUsage,
  recordCircuitBreakerFallback,
  recordCircuitBreakerRejection,
  recordCircuitBreakerRequest,
  recordCircuitBreakerStateTransition,
} from "../telemetry/metrics";
import { winstonTelemetryLogger } from "../telemetry/winston-logger";

export interface CircuitBreakerStats {
  state: "closed" | "open" | "half-open";
  stats: {
    fires: number;
    rejections: number;
    timeouts: number;
    failures: number;
    successes: number;
    fallbacks: number;
    semaphoreRejections: number;
    percentiles: Record<string, number>;
  };
}

export class KongCircuitBreakerService {
  private breakers: Map<string, CircuitBreaker> = new Map();
  private staleCache?: Map<string, { data: ConsumerSecret; timestamp: number }>;
  private config: CircuitBreakerConfig & { highAvailability?: boolean };
  private readonly staleDataToleranceMinutes: number;
  private operationConfigs: Map<string, OperationCircuitBreakerConfig> = new Map();

  constructor(
    config: CircuitBreakerConfig & { highAvailability?: boolean },
    cachingConfig: CachingConfig,
    private cacheService?: IKongCacheService
  ) {
    this.config = config;
    this.staleDataToleranceMinutes = cachingConfig.staleDataToleranceMinutes;

    // Initialize operation-specific configurations
    this.initializeOperationConfigs();

    // Only initialize in-memory cache for non-HA mode
    if (!config.highAvailability) {
      this.staleCache = new Map();
    }
  }

  private initializeOperationConfigs(): void {
    // Default operation configurations based on operation type
    const defaultConfigs: Record<string, OperationCircuitBreakerConfig> = {
      // Consumer operations - standard data retrieval
      getConsumerSecret: {
        timeout: 3000,
        errorThresholdPercentage: 50,
        resetTimeout: 60000,
        fallbackStrategy: "cache",
      },
      createConsumerSecret: {
        timeout: 5000,
        errorThresholdPercentage: 30,
        resetTimeout: 120000,
        fallbackStrategy: "deny",
      },
      // Health check operations - fast recovery
      healthCheck: {
        timeout: 1000,
        errorThresholdPercentage: 75,
        resetTimeout: 10000,
        fallbackStrategy: "graceful_degradation",
      },
    };

    // Set defaults first
    for (const [operation, opConfig] of Object.entries(defaultConfigs)) {
      this.operationConfigs.set(operation, opConfig);
    }

    // Apply any user-defined overrides from config
    if (this.config.operations) {
      for (const [operation, overrides] of Object.entries(this.config.operations)) {
        const existing = this.operationConfigs.get(operation) || {};
        this.operationConfigs.set(operation, { ...existing, ...overrides });
      }
    }
  }

  private getOrCreateBreaker<T>(
    operation: string,
    action: (...args: any[]) => Promise<T>
  ): CircuitBreaker<any[], T> {
    if (!this.breakers.has(operation)) {
      // Get operation-specific configuration or fallback to global defaults
      const operationConfig = this.operationConfigs.get(operation);

      const circuitBreakerOptions = {
        timeout: operationConfig?.timeout ?? this.config.timeout,
        errorThresholdPercentage:
          operationConfig?.errorThresholdPercentage ?? this.config.errorThresholdPercentage,
        resetTimeout: operationConfig?.resetTimeout ?? this.config.resetTimeout,
        rollingCountTimeout:
          operationConfig?.rollingCountTimeout ?? this.config.rollingCountTimeout,
        rollingCountBuckets:
          operationConfig?.rollingCountBuckets ?? this.config.rollingCountBuckets,
        volumeThreshold: operationConfig?.volumeThreshold ?? this.config.volumeThreshold,
        name: operation,
      };

      const breaker = new CircuitBreaker(action, circuitBreakerOptions);

      breaker.on("open", () => {
        winstonTelemetryLogger.warn(`Circuit breaker opened for ${operation}`, {
          operation,
          component: "circuit_breaker",
          state: "open",
        });
        recordCircuitBreakerStateTransition(operation, "closed", "open");
      });

      breaker.on("halfOpen", () => {
        winstonTelemetryLogger.info(`Circuit breaker half-open for ${operation}`, {
          operation,
          component: "circuit_breaker",
          state: "half-open",
        });
        recordCircuitBreakerStateTransition(operation, "open", "half-open");
      });

      breaker.on("close", () => {
        winstonTelemetryLogger.info(`Circuit breaker closed for ${operation}`, {
          operation,
          component: "circuit_breaker",
          state: "closed",
        });
        recordCircuitBreakerStateTransition(operation, "half-open", "closed");
      });

      breaker.on("reject", () => {
        winstonTelemetryLogger.warn(`Circuit breaker rejected request for ${operation}`, {
          operation,
          component: "circuit_breaker",
          action: "reject",
        });
        recordCircuitBreakerRejection(operation, "circuit_open");
      });

      breaker.on("timeout", () => {
        winstonTelemetryLogger.warn(`Circuit breaker timeout for ${operation}`, {
          operation,
          component: "circuit_breaker",
          action: "timeout",
        });
        recordCircuitBreakerRejection(operation, "timeout");
      });

      this.breakers.set(operation, breaker);
    }
    const breaker = this.breakers.get(operation);
    if (!breaker) {
      throw new Error(`Circuit breaker not found for operation: ${operation}`);
    }
    return breaker as CircuitBreaker<any[], T>;
  }

  async wrapKongOperation<T>(
    operation: string,
    action: () => Promise<T>,
    fallbackData?: T
  ): Promise<T | null> {
    if (!this.config.enabled) {
      return await action();
    }

    const breaker = this.getOrCreateBreaker(operation, action);

    try {
      const result = await breaker.fire();
      recordCircuitBreakerRequest(operation, "closed");
      return result;
    } catch (error) {
      winstonTelemetryLogger.warn(`Circuit breaker operation failed for ${operation}`, {
        operation,
        error: error instanceof Error ? error.message : "Unknown error",
        component: "circuit_breaker",
        action: "operation_failed",
      });

      if (breaker.opened) {
        return this.handleOpenCircuit(operation, fallbackData);
      }

      recordCircuitBreakerRequest(operation, "open");
      return null;
    }
  }

  async wrapKongConsumerOperation(
    operation: string,
    consumerId: string,
    action: () => Promise<ConsumerSecret | null>
  ): Promise<ConsumerSecret | null> {
    if (!this.config.enabled) {
      return await action();
    }

    const breaker = this.getOrCreateBreaker(operation, action);
    // Use consistent cache key format with Kong services: consumer_secret:consumerId
    const cacheKey = `consumer_secret:${consumerId}`;

    try {
      const result = await breaker.fire();
      recordCircuitBreakerRequest(operation, "closed");

      if (result) {
        // CRITICAL FIX: Validate consumer data before caching to prevent cache pollution
        if (result.consumer && result.consumer.id !== consumerId) {
          winstonTelemetryLogger.error(`Consumer ID mismatch in Kong response, not caching`, {
            operation,
            requestedConsumerId: consumerId,
            responseConsumerId: result.consumer.id,
            cacheKey,
            component: "circuit_breaker",
            action: "consumer_id_mismatch",
          });
          // Don't cache wrong consumer data, and don't return it either (would cause auth failures)
          // Return null to indicate consumer not found rather than returning wrong consumer data
          return null;
        }
        this.updateStaleCache(cacheKey, result);
      } else if (this.staleCache) {
        // Explicitly cache null results to prevent serving stale data for non-existent consumers
        this.staleCache.delete(cacheKey);
      }

      return result;
    } catch (error) {
      winstonTelemetryLogger.warn(`Circuit breaker consumer operation failed for ${operation}`, {
        operation,
        consumerId,
        error: error instanceof Error ? error.message : "Unknown error",
        component: "circuit_breaker",
        action: "consumer_operation_failed",
      });

      if (breaker.opened) {
        return await this.handleOpenCircuitWithStaleData(operation, cacheKey, consumerId);
      }

      recordCircuitBreakerRequest(operation, "open");
      return null;
    }
  }

  private handleOpenCircuit<T>(operation: string, fallbackData?: T): T | null {
    const operationConfig = this.operationConfigs.get(operation);
    const fallbackStrategy = operationConfig?.fallbackStrategy || "deny";

    recordCircuitBreakerFallback(operation, "circuit_open");

    switch (fallbackStrategy) {
      case "graceful_degradation":
        return this.handleGracefulDegradation(operation) as T;
      case "deny":
        winstonTelemetryLogger.warn(`Circuit breaker open, denying request for ${operation}`, {
          operation,
          component: "circuit_breaker",
          action: "deny_fallback",
          fallbackStrategy: "deny",
        });
        recordCircuitBreakerRequest(operation, "open");
        return null;
      default:
        if (fallbackData !== undefined) {
          winstonTelemetryLogger.info(`Using fallback data for ${operation}`, {
            operation,
            component: "circuit_breaker",
            action: "fallback_data",
            fallbackStrategy: "cache",
          });
          recordCircuitBreakerRequest(operation, "half_open");
          return fallbackData;
        }

        winstonTelemetryLogger.warn(`No fallback available for ${operation}`, {
          operation,
          component: "circuit_breaker",
          action: "no_fallback",
          fallbackStrategy: fallbackStrategy,
        });
        recordCircuitBreakerRequest(operation, "open");
        return null;
    }
  }

  private handleGracefulDegradation(operation: string): any {
    winstonTelemetryLogger.info(`Using graceful degradation for ${operation}`, {
      operation,
      component: "circuit_breaker",
      action: "graceful_degradation",
      fallbackStrategy: "graceful_degradation",
    });

    recordCircuitBreakerRequest(operation, "half_open");

    // Return operation-specific degraded responses
    switch (operation) {
      case "healthCheck":
        return {
          healthy: false,
          responseTime: 0,
          error: "Circuit breaker open - Kong Admin API unavailable",
        };
      default:
        return {
          status: "degraded",
          message: "Service temporarily unavailable",
          operation,
          timestamp: new Date().toISOString(),
        };
    }
  }

  private async handleOpenCircuitWithStaleData(
    operation: string,
    cacheKey: string,
    consumerId: string
  ): Promise<ConsumerSecret | null> {
    const operationConfig = this.operationConfigs.get(operation);
    const fallbackStrategy = operationConfig?.fallbackStrategy || "deny";

    // For operations with deny strategy, don't attempt cache fallback
    if (fallbackStrategy === "deny") {
      winstonTelemetryLogger.warn(
        `Circuit breaker open, denying consumer operation for ${operation}`,
        {
          operation,
          consumerId,
          component: "circuit_breaker",
          action: "deny_consumer_operation",
          fallbackStrategy: "deny",
        }
      );
      recordCircuitBreakerRequest(operation, "open");
      return null;
    }

    // For graceful degradation, return a standardized response indicating unavailability
    if (fallbackStrategy === "graceful_degradation") {
      winstonTelemetryLogger.info(`Circuit breaker open, graceful degradation for ${operation}`, {
        operation,
        consumerId,
        component: "circuit_breaker",
        action: "graceful_degradation_consumer_operation",
        fallbackStrategy: "graceful_degradation",
      });
      recordCircuitBreakerRequest(operation, "half_open");
      return null; // For consumer operations, graceful degradation means returning null
    }

    // Continue with cache-based fallback for cache strategy
    if (this.config.highAvailability && this.cacheService) {
      // HA Mode: Use Redis stale cache
      const start = performance.now();
      try {
        const extractedKey = this.extractKeyFromCacheKey(cacheKey);
        const redisStale = await this.cacheService.getStale?.(extractedKey);

        if (redisStale) {
          // CRITICAL FIX: Validate that the cached consumer data actually belongs to the requested consumer
          // This prevents cache pollution where one consumer gets another consumer's data
          if (redisStale.consumer && redisStale.consumer.id !== consumerId) {
            winstonTelemetryLogger.error(`Cache pollution detected: cached consumer ID mismatch`, {
              operation,
              requestedConsumerId: consumerId,
              cachedConsumerId: redisStale.consumer.id,
              cacheKey,
              extractedKey,
              component: "circuit_breaker",
              action: "cache_pollution_detected",
              tier: "redis-stale",
            });
            recordCacheTierError("redis-stale", operation, "cache_pollution");
            return null; // Don't return wrong consumer's data
          }

          const latency = performance.now() - start;
          recordCacheTierUsage("redis-stale", operation);
          recordCacheTierLatency("redis-stale", operation, latency);

          winstonTelemetryLogger.info(`Using Redis stale cache data for ${operation}`, {
            operation,
            cacheKey,
            consumerId,
            cachedConsumerId: redisStale.consumer?.id,
            latencyMs: latency,
            component: "circuit_breaker",
            action: "redis_stale_fallback",
            tier: "redis-stale",
          });

          recordCircuitBreakerFallback(operation, "redis_stale_cache");
          recordCircuitBreakerRequest(operation, "half_open");
          return redisStale;
        }
      } catch (error) {
        const latency = performance.now() - start;
        recordCacheTierError("redis-stale", operation, "access_error");
        recordCacheTierLatency("redis-stale", operation, latency);

        winstonTelemetryLogger.warn(`Redis stale cache access failed for ${operation}`, {
          operation,
          cacheKey,
          consumerId,
          error: error instanceof Error ? error.message : "Unknown error",
          latencyMs: latency,
          component: "circuit_breaker",
          action: "redis_stale_error",
          tier: "redis-stale",
        });
        // Fall through to in-memory fallback
      }
    } else {
      // Non-HA Mode: Use in-memory cache
      const start = performance.now();
      const inMemoryStale = this.getStaleData(cacheKey);
      if (inMemoryStale) {
        // CRITICAL FIX: Validate that the cached consumer data actually belongs to the requested consumer
        // This prevents cache pollution where one consumer gets another consumer's data
        if (inMemoryStale.data.consumer && inMemoryStale.data.consumer.id !== consumerId) {
          winstonTelemetryLogger.error(`Cache pollution detected: cached consumer ID mismatch`, {
            operation,
            requestedConsumerId: consumerId,
            cachedConsumerId: inMemoryStale.data.consumer.id,
            cacheKey,
            component: "circuit_breaker",
            action: "cache_pollution_detected",
            tier: "in-memory",
          });
          recordCacheTierError("in-memory", operation, "cache_pollution");
          // Remove the polluted cache entry
          this.staleCache?.delete(cacheKey);
          return null; // Don't return wrong consumer's data
        }

        const latency = performance.now() - start;
        recordCacheTierUsage("in-memory", operation);
        recordCacheTierLatency("in-memory", operation, latency);

        winstonTelemetryLogger.info(`Using in-memory stale cache data for ${operation}`, {
          operation,
          cacheKey,
          consumerId,
          cachedConsumerId: inMemoryStale.data.consumer?.id,
          staleAgeMinutes: Math.floor((Date.now() - inMemoryStale.timestamp) / 60000),
          latencyMs: latency,
          component: "circuit_breaker",
          action: "in_memory_stale_fallback",
          tier: "in-memory",
        });

        recordCircuitBreakerFallback(operation, "in_memory_stale_cache");
        recordCircuitBreakerRequest(operation, "half_open");
        return inMemoryStale.data;
      }
    }

    // No fallback available - return null
    winstonTelemetryLogger.warn(`Circuit breaker open, no cache fallback available`, {
      operation,
      originalConsumerId: consumerId,
      component: "circuit_breaker",
      action: "no_fallback_available",
      haMode: this.config.highAvailability,
    });

    recordCircuitBreakerRequest(operation, "open");
    return null;
  }

  private extractKeyFromCacheKey(cacheKey: string): string {
    // For consumer operations, the cache key is already in the correct format: "consumer_secret:consumerId"
    // Return the cache key as-is for Redis operations
    return cacheKey;
  }

  private updateStaleCache(key: string, data: ConsumerSecret): void {
    if (this.staleCache) {
      this.staleCache.set(key, {
        data,
        timestamp: Date.now(),
      });
    }
  }

  private getStaleData(key: string): { data: ConsumerSecret; timestamp: number } | null {
    if (!this.staleCache) return null;

    const cached = this.staleCache.get(key);
    if (!cached) return null;

    const ageMinutes = (Date.now() - cached.timestamp) / 60000;
    if (ageMinutes > this.staleDataToleranceMinutes) {
      this.staleCache.delete(key);
      return null;
    }

    return cached;
  }

  getStats(): Record<string, CircuitBreakerStats> {
    const stats: Record<string, CircuitBreakerStats> = {};

    for (const [operation, breaker] of this.breakers) {
      const breakerStats = breaker.stats;
      const state = breaker.opened ? "open" : breaker.halfOpen ? "half-open" : "closed";

      stats[operation] = {
        state,
        stats: {
          fires: breakerStats.fires,
          rejections: breakerStats.rejects,
          timeouts: breakerStats.timeouts,
          failures: breakerStats.failures,
          successes: breakerStats.successes,
          fallbacks: breakerStats.fallbacks,
          semaphoreRejections: breakerStats.semaphoreRejections,
          percentiles: breakerStats.percentiles,
        },
      };
    }

    return stats;
  }

  clearStaleCache(): void {
    if (this.staleCache) {
      this.staleCache.clear();
      winstonTelemetryLogger.info("Cleared circuit breaker stale cache", {
        component: "circuit_breaker",
        action: "cache_cleared",
        cacheMode: "in-memory",
      });
    } else {
      winstonTelemetryLogger.info("No in-memory stale cache to clear (HA mode active)", {
        component: "circuit_breaker",
        action: "cache_clear_skipped",
        cacheMode: "redis-ha",
      });
    }
  }

  getStaleDataInfo(): Array<{ key: string; ageMinutes: number }> {
    const info: Array<{ key: string; ageMinutes: number }> = [];

    if (!this.staleCache) {
      return info; // Return empty array for HA mode
    }

    const now = Date.now();
    for (const [key, cached] of this.staleCache) {
      const ageMinutes = Math.floor((now - cached.timestamp) / 60000);
      info.push({ key, ageMinutes });
    }

    return info;
  }

  shutdown(): void {
    for (const breaker of this.breakers.values()) {
      breaker.shutdown();
    }
    this.breakers.clear();

    if (this.staleCache) {
      this.staleCache.clear();
    }
  }
}
