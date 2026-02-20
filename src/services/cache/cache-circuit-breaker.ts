// src/services/cache/cache-circuit-breaker.ts

import { recordCircuitBreakerOperation, recordCircuitBreakerState } from "../../telemetry/metrics";
import { winstonTelemetryLogger } from "../../telemetry/winston-logger";
import { CircuitBreakerStateEnum } from "../../types/circuit-breaker.types";
import { isConnectionError } from "../../utils/cache-error-detector";

export interface CacheCircuitBreakerConfig {
  enabled: boolean;
  failureThreshold: number;
  resetTimeout: number;
  successThreshold: number;
}

export interface CacheCircuitBreakerStats {
  state: CircuitBreakerStateEnum;
  failureCount: number;
  successCount: number;
  lastFailureTime: number;
  lastSuccessTime: number;
  totalRequests: number;
  rejectedRequests: number;
  lastStateChange: number;
  halfOpenSuccesses: number;
}

export const DEFAULT_CACHE_CIRCUIT_BREAKER_CONFIG: CacheCircuitBreakerConfig = {
  enabled: true,
  failureThreshold: 5,
  resetTimeout: 30000,
  successThreshold: 2,
};

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

  canExecute(): boolean {
    if (!this.config.enabled) {
      return true;
    }

    this.totalRequests++;

    switch (this.state) {
      case CircuitBreakerStateEnum.CLOSED:
        return true;

      case CircuitBreakerStateEnum.OPEN: {
        const now = Date.now();
        if (now - this.lastFailureTime >= this.config.resetTimeout) {
          this.transitionTo(CircuitBreakerStateEnum.HALF_OPEN);
          return true;
        }

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
        return true;

      default:
        return false;
    }
  }

  recordSuccess(): void {
    if (!this.config.enabled) return;

    this.failureCount = 0;
    this.successCount++;
    this.lastSuccessTime = Date.now();

    if (this.state === CircuitBreakerStateEnum.HALF_OPEN) {
      this.halfOpenSuccesses++;

      if (this.halfOpenSuccesses >= this.config.successThreshold) {
        this.transitionTo(CircuitBreakerStateEnum.CLOSED);
        this.halfOpenSuccesses = 0;
      }
    }

    recordCircuitBreakerOperation(CacheCircuitBreaker.OPERATION_NAME, this.state, "request");
  }

  recordFailure(error: Error | string): void {
    if (!this.config.enabled) return;

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

    if (
      this.state === CircuitBreakerStateEnum.CLOSED &&
      this.failureCount >= this.config.failureThreshold
    ) {
      this.transitionTo(CircuitBreakerStateEnum.OPEN);
    } else if (this.state === CircuitBreakerStateEnum.HALF_OPEN) {
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

  getState(): CircuitBreakerStateEnum {
    return this.state;
  }

  isOpen(): boolean {
    return this.state === CircuitBreakerStateEnum.OPEN;
  }

  isHalfOpen(): boolean {
    return this.state === CircuitBreakerStateEnum.HALF_OPEN;
  }

  isClosed(): boolean {
    return this.state === CircuitBreakerStateEnum.CLOSED;
  }

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

  getTimeUntilRecoveryMs(): number {
    if (this.state !== CircuitBreakerStateEnum.OPEN) {
      return 0;
    }
    const elapsed = Date.now() - this.lastFailureTime;
    return Math.max(0, this.config.resetTimeout - elapsed);
  }
}
