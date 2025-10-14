/* src/services/circuit-breaker.service.ts */

import CircuitBreaker from "opossum";
import type { CircuitBreakerConfig, ConsumerSecret } from "../config/schemas";
import {
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
    latencies: number[];
  };
}

export class KongCircuitBreakerService {
  private breakers: Map<string, CircuitBreaker> = new Map();
  private staleCache: Map<string, { data: ConsumerSecret; timestamp: number }> = new Map();
  private config: CircuitBreakerConfig;

  constructor(config: CircuitBreakerConfig) {
    this.config = config;
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
        return this.handleOpenCircuitWithStaleData(operation, cacheKey);
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

  private handleOpenCircuitWithStaleData(
    operation: string,
    cacheKey: string
  ): ConsumerSecret | null {
    const staleData = this.getStaleData(cacheKey);

    if (staleData) {
      winstonTelemetryLogger.info(`Using stale cache data for ${operation}`, {
        operation,
        cacheKey,
        staleAgeMinutes: Math.floor((Date.now() - staleData.timestamp) / 60000),
        component: "circuit_breaker",
        action: "stale_data_fallback",
      });
      recordCircuitBreakerFallback(operation, "stale_cache");
      recordCircuitBreakerRequest(operation, true, true);
      return staleData.data;
    }

    winstonTelemetryLogger.warn(`No stale data available for ${operation}`, {
      operation,
      cacheKey,
      component: "circuit_breaker",
      action: "no_stale_data",
    });
    recordCircuitBreakerFallback(operation, "no_data_available");
    recordCircuitBreakerRequest(operation, false, true);
    return null;
  }

  private updateStaleCache(key: string, data: ConsumerSecret): void {
    this.staleCache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  private getStaleData(key: string): { data: ConsumerSecret; timestamp: number } | null {
    const cached = this.staleCache.get(key);
    if (!cached) return null;

    const ageMinutes = (Date.now() - cached.timestamp) / 60000;
    if (ageMinutes > this.config.staleDataToleranceMinutes) {
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
          latencies: breakerStats.latencyTimes,
        },
      };
    }

    return stats;
  }

  clearStaleCache(): void {
    this.staleCache.clear();
    winstonTelemetryLogger.info("Cleared circuit breaker stale cache", {
      component: "circuit_breaker",
      action: "cache_cleared",
    });
  }

  getStaleDataInfo(): Array<{ key: string; ageMinutes: number }> {
    const info: Array<{ key: string; ageMinutes: number }> = [];
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
    this.staleCache.clear();
  }
}
