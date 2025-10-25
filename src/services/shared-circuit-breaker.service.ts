/* src/services/shared-circuit-breaker.service.ts */

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

export class SharedCircuitBreakerService {
  private static instance: SharedCircuitBreakerService | null = null;
  private kongBreaker: CircuitBreaker | null = null;
  private staleCache?: Map<string, { data: ConsumerSecret; timestamp: number }>;
  private config: CircuitBreakerConfig & { highAvailability?: boolean };
  private readonly staleDataToleranceMinutes: number;
  private cacheService?: IKongCacheService;

  private constructor(
    config: CircuitBreakerConfig & { highAvailability?: boolean },
    cachingConfig: CachingConfig,
    cacheService?: IKongCacheService
  ) {
    this.config = config;
    this.staleDataToleranceMinutes = cachingConfig.staleDataToleranceMinutes;
    this.cacheService = cacheService;

    // Only initialize in-memory cache for non-HA mode
    if (!config.highAvailability) {
      this.staleCache = new Map();
    }
  }

  static getInstance(
    config?: CircuitBreakerConfig & { highAvailability?: boolean },
    cachingConfig?: CachingConfig,
    cacheService?: IKongCacheService
  ): SharedCircuitBreakerService {
    if (!SharedCircuitBreakerService.instance) {
      if (!config || !cachingConfig) {
        throw new Error("Configuration required for initial circuit breaker instance creation");
      }
      SharedCircuitBreakerService.instance = new SharedCircuitBreakerService(
        config,
        cachingConfig,
        cacheService
      );
    }
    return SharedCircuitBreakerService.instance;
  }

  static resetInstance(): void {
    if (SharedCircuitBreakerService.instance?.kongBreaker) {
      SharedCircuitBreakerService.instance.kongBreaker.shutdown();
    }
    SharedCircuitBreakerService.instance = null;
  }

  static updateCacheService(cacheService: IKongCacheService): void {
    if (SharedCircuitBreakerService.instance) {
      SharedCircuitBreakerService.instance.cacheService = cacheService;
      winstonTelemetryLogger.info("Updated circuit breaker cache service for HA mode", {
        component: "shared_circuit_breaker",
        action: "cache_service_updated",
        hasCache: !!cacheService,
      });
    }
  }

  private getOrCreateKongBreaker<T>(
    action: (...args: any[]) => Promise<T>
  ): CircuitBreaker<any[], T> {
    if (!this.kongBreaker) {
      this.kongBreaker = new CircuitBreaker(action, {
        timeout: this.config.timeout,
        errorThresholdPercentage: this.config.errorThresholdPercentage,
        resetTimeout: this.config.resetTimeout,
        rollingCountTimeout: this.config.rollingCountTimeout,
        rollingCountBuckets: this.config.rollingCountBuckets,
        volumeThreshold: this.config.volumeThreshold,
        name: "kong_operations",
      });

      this.kongBreaker.on("open", () => {
        winstonTelemetryLogger.warn("Shared Kong circuit breaker opened", {
          component: "shared_circuit_breaker",
          state: "open",
        });
        recordCircuitBreakerStateTransition("kong_operations", "closed", "open");
      });

      this.kongBreaker.on("halfOpen", () => {
        winstonTelemetryLogger.info("Shared Kong circuit breaker half-open", {
          component: "shared_circuit_breaker",
          state: "half-open",
        });
        recordCircuitBreakerStateTransition("kong_operations", "open", "half-open");
      });

      this.kongBreaker.on("close", () => {
        winstonTelemetryLogger.info("Shared Kong circuit breaker closed", {
          component: "shared_circuit_breaker",
          state: "closed",
        });
        recordCircuitBreakerStateTransition("kong_operations", "half-open", "closed");
      });

      this.kongBreaker.on("reject", () => {
        winstonTelemetryLogger.warn("Shared Kong circuit breaker rejected request", {
          component: "shared_circuit_breaker",
          action: "reject",
        });
        recordCircuitBreakerRejection("kong_operations", "circuit_open");
      });

      this.kongBreaker.on("timeout", () => {
        winstonTelemetryLogger.warn("Shared Kong circuit breaker timeout", {
          component: "shared_circuit_breaker",
          action: "timeout",
        });
        recordCircuitBreakerRejection("kong_operations", "timeout");
      });
    }

    // Update the action for this specific call
    (this.kongBreaker as CircuitBreaker & { action?: () => Promise<unknown> }).action = action;
    return this.kongBreaker as CircuitBreaker<any[], T>;
  }

  /**
   * Determines if an HTTP status code represents an infrastructure error
   * vs a business logic response
   */
  private isInfrastructureError(status: number): boolean {
    // Infrastructure failures that should trigger circuit breaker
    if (status >= 500 && status < 600) return true; // 5xx server errors
    if (status === 429) return true; // Rate limiting (infrastructure constraint)
    if (status === 502) return true; // Bad gateway
    if (status === 503) return true; // Service unavailable
    if (status === 504) return true; // Gateway timeout

    // Business logic responses that should NOT trigger circuit breaker
    if (status === 404) return false; // Consumer not found - expected business response
    if (status === 401) return false; // Unauthorized - expected business response
    if (status === 403) return false; // Forbidden - expected business response
    if (status === 409) return false; // Conflict - expected business response
    if (status === 422) return false; // Unprocessable entity - expected business response

    // 4xx client errors (except rate limiting) are generally business logic
    if (status >= 400 && status < 500) return false;

    // 2xx/3xx are successful responses
    if (status >= 200 && status < 400) return false;

    // Default: treat unknown status codes as infrastructure errors (conservative)
    return true;
  }

  /**
   * Determines if an error is a business logic error that should not trigger circuit breaker
   */
  private isBusinessLogicError(error: any): boolean {
    // Handle KongApiError (our custom error with status information)
    if (error?.name === "KongApiError" && typeof error.isInfrastructureError === "boolean") {
      return !error.isInfrastructureError; // Business logic errors are NOT infrastructure errors
    }

    // Handle Response objects (fetch API errors)
    if (error && typeof error.status === "number") {
      return !this.isInfrastructureError(error.status);
    }

    // Handle Error objects with response status
    if (error instanceof Error) {
      // Check if error message contains HTTP status information
      const statusMatch = error.message.match(/(\d{3})/);
      if (statusMatch) {
        const status = Number.parseInt(statusMatch[1], 10);
        return !this.isInfrastructureError(status);
      }
    }

    // Default: treat unknown errors as infrastructure errors (they should trigger circuit breaker)
    return false;
  }

  async wrapKongOperation<T>(
    operation: string,
    action: () => Promise<T>,
    fallbackData?: T
  ): Promise<T | null> {
    if (!this.config.enabled) {
      return await action();
    }

    // Create a wrapper action that handles business logic errors
    const wrappedAction = async (): Promise<T> => {
      try {
        return await action();
      } catch (error) {
        // Check if this is a business logic error that shouldn't trigger circuit breaker
        if (this.isBusinessLogicError(error)) {
          winstonTelemetryLogger.debug(
            `Business logic error for ${operation}, not triggering circuit breaker`,
            {
              operation,
              error: error instanceof Error ? error.message : "Unknown error",
              errorStatus: (error as any)?.status,
              component: "shared_circuit_breaker",
              action: "business_logic_error",
            }
          );

          // For business logic errors, return null as success (don't throw)
          return null as T;
        }

        // For infrastructure errors, re-throw to trigger circuit breaker
        throw error;
      }
    };

    const breaker = this.getOrCreateKongBreaker(wrappedAction);

    try {
      const result = await breaker.fire();
      recordCircuitBreakerRequest(operation, "closed");
      return result;
    } catch (error) {
      winstonTelemetryLogger.warn(`Shared circuit breaker operation failed for ${operation}`, {
        operation,
        error: error instanceof Error ? error.message : "Unknown error",
        component: "shared_circuit_breaker",
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

    const cacheKey = `${operation}:${consumerId}`;

    // Create a wrapper action that handles business logic errors
    const wrappedAction = async (): Promise<ConsumerSecret | null> => {
      try {
        const result = await action();

        // Success - update cache if result exists
        if (result) {
          this.updateStaleCache(cacheKey, result);
        } else if (this.staleCache) {
          this.staleCache.delete(cacheKey);
        }

        return result;
      } catch (error) {
        // Check if this is a business logic error that shouldn't trigger circuit breaker
        if (this.isBusinessLogicError(error)) {
          winstonTelemetryLogger.debug(
            `Business logic error for ${operation}, not triggering circuit breaker`,
            {
              operation,
              consumerId,
              error: error instanceof Error ? error.message : "Unknown error",
              errorStatus: (error as any)?.status,
              component: "shared_circuit_breaker",
              action: "business_logic_error",
            }
          );

          // Clear cache entry if it exists
          if (this.staleCache) {
            this.staleCache.delete(cacheKey);
          }

          // For business logic errors, return null as success (don't throw)
          return null;
        }

        // For infrastructure errors, re-throw to trigger circuit breaker
        throw error;
      }
    };

    const breaker = this.getOrCreateKongBreaker(wrappedAction);

    try {
      const result = await breaker.fire();
      recordCircuitBreakerRequest(operation, "closed");
      return result;
    } catch (error) {
      winstonTelemetryLogger.warn(
        `Shared circuit breaker consumer operation failed for ${operation}`,
        {
          operation,
          consumerId,
          error: error instanceof Error ? error.message : "Unknown error",
          component: "shared_circuit_breaker",
          action: "consumer_operation_failed",
        }
      );

      winstonTelemetryLogger.info(`Circuit breaker error handling for ${operation}`, {
        operation,
        consumerId,
        cacheKey,
        breakerOpened: breaker.opened,
        hasCache: !!this.cacheService,
        isHAMode: this.config.highAvailability,
        component: "shared_circuit_breaker",
        action: "error_handling_debug",
      });

      if (breaker.opened) {
        return await this.handleOpenCircuitWithStaleData(operation, cacheKey, consumerId);
      }

      recordCircuitBreakerRequest(operation, "open");
      return null;
    }
  }

  private handleOpenCircuit<T>(operation: string, fallbackData?: T): T | null {
    recordCircuitBreakerFallback(operation, "circuit_open");

    if (fallbackData !== undefined) {
      winstonTelemetryLogger.info(`Using fallback data for ${operation}`, {
        operation,
        component: "shared_circuit_breaker",
        action: "fallback_data",
      });
      recordCircuitBreakerRequest(operation, "half_open");
      return fallbackData;
    }

    winstonTelemetryLogger.warn(`No fallback available for ${operation}`, {
      operation,
      component: "shared_circuit_breaker",
      action: "no_fallback",
    });
    recordCircuitBreakerRequest(operation, "open");
    return null;
  }

  private async handleOpenCircuitWithStaleData(
    operation: string,
    cacheKey: string,
    consumerId: string
  ): Promise<ConsumerSecret | null> {
    winstonTelemetryLogger.info(`HA mode stale cache access debug`, {
      operation,
      cacheKey,
      consumerId,
      haMode: this.config.highAvailability,
      hasCacheService: !!this.cacheService,
      hasGetStaleMethod: !!this.cacheService?.getStale,
      component: "shared_circuit_breaker",
      action: "ha_mode_debug",
    });

    if (this.config.highAvailability && this.cacheService) {
      const start = performance.now();
      try {
        const extractedKey = this.extractKeyFromCacheKey(cacheKey);
        winstonTelemetryLogger.info(`Attempting Redis stale cache access`, {
          operation,
          cacheKey,
          extractedKey,
          consumerId,
          component: "shared_circuit_breaker",
          action: "redis_stale_lookup_debug",
        });

        const redisStale = await this.cacheService.getStale?.(extractedKey);
        if (redisStale) {
          const latency = performance.now() - start;
          recordCacheTierUsage("redis-stale", operation);
          recordCacheTierLatency("redis-stale", operation, latency);

          winstonTelemetryLogger.info(`Using Redis stale cache data for ${operation}`, {
            operation,
            cacheKey,
            consumerId,
            latencyMs: latency,
            component: "shared_circuit_breaker",
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
          component: "shared_circuit_breaker",
          action: "redis_stale_error",
          tier: "redis-stale",
        });
      }
    } else {
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
          component: "shared_circuit_breaker",
          action: "in_memory_stale_fallback",
          tier: "in-memory",
        });

        recordCircuitBreakerFallback(operation, "in_memory_stale_cache");
        recordCircuitBreakerRequest(operation, "half_open");
        return inMemoryStale.data;
      }
    }

    winstonTelemetryLogger.warn("Shared circuit breaker open, no cache fallback available", {
      operation,
      originalConsumerId: consumerId,
      component: "shared_circuit_breaker",
      action: "no_fallback_available",
      haMode: this.config.highAvailability,
    });

    recordCircuitBreakerRequest(operation, "open");
    return null;
  }

  private extractKeyFromCacheKey(cacheKey: string): string {
    // cacheKey format: "operation:consumerId"
    // We need to map the operation to the actual cache key format used by Kong services
    // Example: "getConsumerSecret:demo_user" -> "consumer_secret:demo_user"
    // Example: "createConsumerSecret:demo_user" -> "consumer_secret:demo_user"
    const parts = cacheKey.split(":");
    if (parts.length !== 2) return cacheKey;

    const [operation, consumerId] = parts;

    // Both getConsumerSecret and createConsumerSecret use the same cache key format
    if (operation === "getConsumerSecret" || operation === "createConsumerSecret") {
      return `consumer_secret:${consumerId}`;
    }

    // For other operations, return the original format
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

    if (this.kongBreaker) {
      const breakerStats = this.kongBreaker.stats;
      const state = this.kongBreaker.opened
        ? "open"
        : this.kongBreaker.halfOpen
          ? "half-open"
          : "closed";

      stats.kong_operations = {
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
      winstonTelemetryLogger.info("Cleared shared circuit breaker stale cache", {
        component: "shared_circuit_breaker",
        action: "cache_cleared",
        cacheMode: "in-memory",
      });
    } else {
      winstonTelemetryLogger.info("No in-memory stale cache to clear (HA mode active)", {
        component: "shared_circuit_breaker",
        action: "cache_clear_skipped",
        cacheMode: "redis-ha",
      });
    }
  }

  getStaleDataInfo(): Array<{ key: string; ageMinutes: number }> {
    const info: Array<{ key: string; ageMinutes: number }> = [];

    if (!this.staleCache) {
      return info;
    }

    const now = Date.now();
    for (const [key, cached] of this.staleCache) {
      const ageMinutes = Math.floor((now - cached.timestamp) / 60000);
      info.push({ key, ageMinutes });
    }

    return info;
  }

  shutdown(): void {
    if (this.kongBreaker) {
      this.kongBreaker.shutdown();
      this.kongBreaker = null;
    }

    if (this.staleCache) {
      this.staleCache.clear();
    }
  }
}
