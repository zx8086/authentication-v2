// src/services/cache/cache-circuit-breaker.ts

import { recordCircuitBreakerOperation, recordCircuitBreakerState } from "../../telemetry/metrics";
import { winstonTelemetryLogger } from "../../telemetry/winston-logger";
import { CircuitBreakerStateEnum } from "../../types/circuit-breaker.types";
import { isConnectionError } from "../../utils/cache-error-detector";

/**
 * Configuration for the cache circuit breaker.
 */
export interface CacheCircuitBreakerConfig {
  /** Enable/disable the circuit breaker (default: true) */
  enabled: boolean;
  /** Number of failures before circuit opens (default: 5) */
  failureThreshold: number;
  /** Time in ms before attempting recovery (default: 30000) */
  resetTimeout: number;
  /** Number of successes in half-open to close circuit (default: 2) */
  successThreshold: number;
}

/**
 * Statistics about the cache circuit breaker state.
 */
export interface CacheCircuitBreakerStats {
  /** Current circuit state */
  state: CircuitBreakerStateEnum;
  /** Number of consecutive failures */
  failureCount: number;
  /** Number of consecutive successes */
  successCount: number;
  /** Timestamp of last failure */
  lastFailureTime: number;
  /** Timestamp of last success */
  lastSuccessTime: number;
  /** Total requests since creation */
  totalRequests: number;
  /** Total rejected requests (when circuit open) */
  rejectedRequests: number;
  /** Timestamp of last state change */
  lastStateChange: number;
  /** Number of successes while in half-open state */
  halfOpenSuccesses: number;
}

/**
 * Default configuration (conservative settings).
 */
export const DEFAULT_CACHE_CIRCUIT_BREAKER_CONFIG: CacheCircuitBreakerConfig = {
  enabled: true,
  failureThreshold: 5,
  resetTimeout: 30000,
  successThreshold: 2,
};

/**
 * Circuit breaker for cache operations (Redis/Valkey).
 *
 * This is separate from the Kong circuit breaker and operates at the cache layer.
 * When the cache circuit opens:
 * - Returns fast failure (null) instead of waiting for timeout
 * - Kong circuit breaker handles actual fallback to in-memory stale cache
 *
 * State machine:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Circuit tripped, requests rejected immediately
 * - HALF_OPEN: Testing recovery, limited requests allowed
 *
 * @example
 * ```typescript
 * const cb = new CacheCircuitBreaker({
 *   failureThreshold: 5,
 *   resetTimeout: 30000,
 *   successThreshold: 2,
 * });
 *
 * if (!cb.canExecute()) {
 *   return null; // Fast failure
 * }
 *
 * try {
 *   const result = await redisClient.get(key);
 *   cb.recordSuccess();
 *   return result;
 * } catch (error) {
 *   cb.recordFailure(error);
 *   return null;
 * }
 * ```
 */
export class CacheCircuitBreaker {
  private state: CircuitBreakerStateEnum = CircuitBreakerStateEnum.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private lastSuccessTime = 0;
  private totalRequests = 0;
  private rejectedRequests = 0;
  private lastStateChange = Date.now();
  private halfOpenSuccesses = 0;

  private static readonly OPERATION_NAME = "cache_operations";

  constructor(
    private readonly config: CacheCircuitBreakerConfig = DEFAULT_CACHE_CIRCUIT_BREAKER_CONFIG
  ) {
    winstonTelemetryLogger.debug("Cache circuit breaker initialized", {
      component: "cache_circuit_breaker",
      operation: "init",
      config: {
        enabled: config.enabled,
        failureThreshold: config.failureThreshold,
        resetTimeout: config.resetTimeout,
        successThreshold: config.successThreshold,
      },
    });
  }

  /**
   * Check if a request can be executed.
   *
   * @returns true if the request should proceed, false if circuit is open
   */
  canExecute(): boolean {
    // If disabled, always allow
    if (!this.config.enabled) {
      return true;
    }

    this.totalRequests++;

    switch (this.state) {
      case CircuitBreakerStateEnum.CLOSED:
        return true;

      case CircuitBreakerStateEnum.OPEN: {
        // Check if reset timeout has elapsed
        const now = Date.now();
        if (now - this.lastFailureTime >= this.config.resetTimeout) {
          this.transitionTo(CircuitBreakerStateEnum.HALF_OPEN);
          return true;
        }

        // Circuit is open, reject request
        this.rejectedRequests++;
        recordCircuitBreakerOperation(CacheCircuitBreaker.OPERATION_NAME, this.state, "rejected");

        winstonTelemetryLogger.debug("Cache circuit breaker rejecting request", {
          component: "cache_circuit_breaker",
          operation: "reject",
          state: this.state,
          timeUntilReset: this.config.resetTimeout - (now - this.lastFailureTime),
        });

        return false;
      }

      case CircuitBreakerStateEnum.HALF_OPEN:
        // Allow request to test if service recovered
        return true;

      default:
        return false;
    }
  }

  /**
   * Record a successful operation.
   * Call this after a cache operation completes successfully.
   */
  recordSuccess(): void {
    if (!this.config.enabled) return;

    this.failureCount = 0;
    this.successCount++;
    this.lastSuccessTime = Date.now();

    if (this.state === CircuitBreakerStateEnum.HALF_OPEN) {
      this.halfOpenSuccesses++;

      if (this.halfOpenSuccesses >= this.config.successThreshold) {
        // Enough successes in half-open, close the circuit
        this.transitionTo(CircuitBreakerStateEnum.CLOSED);
        this.halfOpenSuccesses = 0;
      }
    }

    recordCircuitBreakerOperation(CacheCircuitBreaker.OPERATION_NAME, this.state, "request");
  }

  /**
   * Record a failed operation.
   * Only connection errors should trigger circuit breaker state changes.
   *
   * @param error - The error that occurred
   */
  recordFailure(error: Error | string): void {
    if (!this.config.enabled) return;

    // Only count connection errors toward threshold
    const errorMessage = error instanceof Error ? error.message : error;
    if (!isConnectionError(error)) {
      winstonTelemetryLogger.debug("Non-connection error, not counting toward circuit breaker", {
        component: "cache_circuit_breaker",
        operation: "ignore_error",
        error: errorMessage,
      });
      return;
    }

    this.failureCount++;
    this.lastFailureTime = Date.now();
    this.halfOpenSuccesses = 0;

    // Check if we should open the circuit
    if (
      this.state === CircuitBreakerStateEnum.CLOSED &&
      this.failureCount >= this.config.failureThreshold
    ) {
      this.transitionTo(CircuitBreakerStateEnum.OPEN);
    } else if (this.state === CircuitBreakerStateEnum.HALF_OPEN) {
      // Any failure in half-open immediately opens the circuit
      this.transitionTo(CircuitBreakerStateEnum.OPEN);
    }

    recordCircuitBreakerOperation(CacheCircuitBreaker.OPERATION_NAME, this.state, "request");

    winstonTelemetryLogger.warn("Cache circuit breaker recorded failure", {
      component: "cache_circuit_breaker",
      operation: "record_failure",
      state: this.state,
      failureCount: this.failureCount,
      failureThreshold: this.config.failureThreshold,
      error: errorMessage,
    });
  }

  /**
   * Transition to a new state with logging and metrics.
   */
  private transitionTo(newState: CircuitBreakerStateEnum): void {
    const previousState = this.state;
    this.state = newState;
    this.lastStateChange = Date.now();

    recordCircuitBreakerState(CacheCircuitBreaker.OPERATION_NAME, newState);
    recordCircuitBreakerOperation(CacheCircuitBreaker.OPERATION_NAME, newState, "state_transition");

    winstonTelemetryLogger.info("Cache circuit breaker state transition", {
      component: "cache_circuit_breaker",
      operation: "state_transition",
      previousState,
      newState,
      failureCount: this.failureCount,
      successCount: this.successCount,
      totalRequests: this.totalRequests,
    });

    if (newState === CircuitBreakerStateEnum.OPEN) {
      winstonTelemetryLogger.error(
        "Cache circuit breaker OPENED - cache operations will fail fast",
        {
          component: "cache_circuit_breaker",
          operation: "circuit_open",
          failureThreshold: this.config.failureThreshold,
          failureCount: this.failureCount,
          resetTimeout: this.config.resetTimeout,
          impact: "Cache operations will return null immediately. Kong CB handles fallback.",
        }
      );
    } else if (
      newState === CircuitBreakerStateEnum.CLOSED &&
      previousState === CircuitBreakerStateEnum.HALF_OPEN
    ) {
      winstonTelemetryLogger.info("Cache circuit breaker RECOVERED - cache operations healthy", {
        component: "cache_circuit_breaker",
        operation: "circuit_recovered",
        successThreshold: this.config.successThreshold,
        recoveryTimeMs: Date.now() - this.lastStateChange,
      });
    }
  }

  /**
   * Get current circuit breaker statistics.
   */
  getStats(): CacheCircuitBreakerStats {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      totalRequests: this.totalRequests,
      rejectedRequests: this.rejectedRequests,
      lastStateChange: this.lastStateChange,
      halfOpenSuccesses: this.halfOpenSuccesses,
    };
  }

  /**
   * Get current state.
   */
  getState(): CircuitBreakerStateEnum {
    return this.state;
  }

  /**
   * Check if circuit is currently open.
   */
  isOpen(): boolean {
    return this.state === CircuitBreakerStateEnum.OPEN;
  }

  /**
   * Check if circuit is in half-open (testing) state.
   */
  isHalfOpen(): boolean {
    return this.state === CircuitBreakerStateEnum.HALF_OPEN;
  }

  /**
   * Check if circuit is closed (healthy).
   */
  isClosed(): boolean {
    return this.state === CircuitBreakerStateEnum.CLOSED;
  }

  /**
   * Manually reset the circuit breaker to closed state.
   * Use with caution - typically for testing or manual intervention.
   */
  reset(): void {
    const previousState = this.state;

    this.state = CircuitBreakerStateEnum.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.halfOpenSuccesses = 0;
    this.totalRequests = 0;
    this.rejectedRequests = 0;
    this.lastStateChange = Date.now();

    winstonTelemetryLogger.info("Cache circuit breaker manually reset", {
      component: "cache_circuit_breaker",
      operation: "manual_reset",
      previousState,
    });
  }

  /**
   * Get time remaining until circuit attempts recovery (in ms).
   * Returns 0 if circuit is not open.
   */
  getTimeUntilRecoveryMs(): number {
    if (this.state !== CircuitBreakerStateEnum.OPEN) {
      return 0;
    }
    const elapsed = Date.now() - this.lastFailureTime;
    return Math.max(0, this.config.resetTimeout - elapsed);
  }
}
