/* src/types/circuit-breaker.types.ts */

/**
 * Circuit breaker statistics interface.
 * Extracted to break circular dependency between config/schemas.ts and services/circuit-breaker.service.ts
 */
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
