/* src/services/circuit-breaker.service.ts */

import CircuitBreaker from "opossum";
import type {
  CachingConfig,
  CircuitBreakerConfig,
  ConsumerSecret,
  IKongCacheService,
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

  constructor(
    config: CircuitBreakerConfig & { highAvailability?: boolean },
    cachingConfig: CachingConfig,
    private cacheService?: IKongCacheService
  ) {
    this.config = config;
    this.staleDataToleranceMinutes = cachingConfig.staleDataToleranceMinutes;
    // Only initialize in-memory cache for non-HA mode
    if (!config.highAvailability) {
      this.staleCache = new Map();
    }
  }

  private getOrCreateBreaker<T>(
    operation: string,
    action: (...args: any[]) => Promise<T>
  ): CircuitBreaker<any[], T> {
    if (!this.breakers.has(operation)) {
      const breaker = new CircuitBreaker(action, {
        timeout: this.config.timeout,
        errorThresholdPercentage: this.config.errorThresholdPercentage,
        resetTimeout: this.config.resetTimeout,
        rollingCountTimeout: this.config.rollingCountTimeout,
        rollingCountBuckets: this.config.rollingCountBuckets,
        volumeThreshold: this.config.volumeThreshold,
        name: operation,
      });

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
      recordCircuitBreakerRequest(operation, true, false);
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

      recordCircuitBreakerRequest(operation, false, false);
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
    const cacheKey = `${operation}:${consumerId}`;

    try {
      const result = await breaker.fire();
      recordCircuitBreakerRequest(operation, true, false);

      if (result) {
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

      recordCircuitBreakerRequest(operation, false, false);
      return null;
    }
  }

  private handleOpenCircuit<T>(operation: string, fallbackData?: T): T | null {
    recordCircuitBreakerFallback(operation, "circuit_open");

    if (fallbackData !== undefined) {
      winstonTelemetryLogger.info(`Using fallback data for ${operation}`, {
        operation,
        component: "circuit_breaker",
        action: "fallback_data",
      });
      recordCircuitBreakerRequest(operation, true, true);
      return fallbackData;
    }

    winstonTelemetryLogger.warn(`No fallback available for ${operation}`, {
      operation,
      component: "circuit_breaker",
      action: "no_fallback",
    });
    recordCircuitBreakerRequest(operation, false, true);
    return null;
  }

  private async handleOpenCircuitWithStaleData(
    operation: string,
    cacheKey: string,
    consumerId: string
  ): Promise<ConsumerSecret | null> {
    if (this.config.highAvailability && this.cacheService) {
      // HA Mode: Use Redis stale cache
      const start = performance.now();
      try {
        const redisStale = await this.cacheService.getStale?.(
          this.extractKeyFromCacheKey(cacheKey)
        );
        if (redisStale) {
          const latency = performance.now() - start;
          recordCacheTierUsage("redis-stale", operation);
          recordCacheTierLatency("redis-stale", operation, latency);

          winstonTelemetryLogger.info(`Using Redis stale cache data for ${operation}`, {
            operation,
            cacheKey,
            consumerId,
            latencyMs: latency,
            component: "circuit_breaker",
            action: "redis_stale_fallback",
            tier: "redis-stale",
          });

          recordCircuitBreakerFallback(operation, "redis_stale_cache");
          recordCircuitBreakerRequest(operation, true, true);
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
        // Fall through to anonymous fallback
      }
    } else {
      // Non-HA Mode: Use in-memory cache
      const start = performance.now();
      const inMemoryStale = this.getStaleData(cacheKey);
      if (inMemoryStale) {
        const latency = performance.now() - start;
        recordCacheTierUsage("in-memory", operation);
        recordCacheTierLatency("in-memory", operation, latency);

        winstonTelemetryLogger.info(`Using in-memory stale cache data for ${operation}`, {
          operation,
          cacheKey,
          consumerId,
          staleAgeMinutes: Math.floor((Date.now() - inMemoryStale.timestamp) / 60000),
          latencyMs: latency,
          component: "circuit_breaker",
          action: "in_memory_stale_fallback",
          tier: "in-memory",
        });

        recordCircuitBreakerFallback(operation, "in_memory_stale_cache");
        recordCircuitBreakerRequest(operation, true, true);
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

    recordCircuitBreakerRequest(operation, false, true);
    return null;
  }

  private extractKeyFromCacheKey(cacheKey: string): string {
    // Extract the consumer ID from the cache key format: "operation:consumerId"
    const parts = cacheKey.split(":");
    return parts.length > 1 ? parts[1] : cacheKey;
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
