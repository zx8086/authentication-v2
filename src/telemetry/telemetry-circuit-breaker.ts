// src/telemetry/telemetry-circuit-breaker.ts

import {
  CircuitBreakerStateEnum,
  type TelemetryCircuitBreakerConfig,
  type TelemetryCircuitBreakerStats,
} from "../types/circuit-breaker.types";
import { error, log, warn } from "../utils/logger";
import { recordCircuitBreakerOperation, recordCircuitBreakerState } from "./metrics";

export { CircuitBreakerStateEnum as CircuitBreakerState };
export type { TelemetryCircuitBreakerConfig as CircuitBreakerConfig };
export type { TelemetryCircuitBreakerStats as CircuitBreakerStats };

export class TelemetryCircuitBreaker {
  private state: CircuitBreakerStateEnum = CircuitBreakerStateEnum.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private lastSuccessTime = 0;
  private totalRequests = 0;
  private rejectedRequests = 0;
  private lastStateChange = Date.now();
  private halfOpenSuccesses = 0;
  private monitoringIntervalId: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly operation: string,
    private readonly config: TelemetryCircuitBreakerConfig
  ) {
    this.monitoringIntervalId = setInterval(() => this.checkRecovery(), config.monitoringInterval);
  }

  public shutdown(): void {
    if (this.monitoringIntervalId) {
      clearInterval(this.monitoringIntervalId);
      this.monitoringIntervalId = null;
    }
  }

  public canExecute(): boolean {
    this.totalRequests++;

    switch (this.state) {
      case CircuitBreakerStateEnum.CLOSED:
        return true;

      case CircuitBreakerStateEnum.OPEN:
        if (Date.now() - this.lastFailureTime >= this.config.recoveryTimeout) {
          this.transitionTo(CircuitBreakerStateEnum.HALF_OPEN);
          return true;
        }
        this.rejectedRequests++;
        recordCircuitBreakerOperation(this.operation, this.state, "rejected");
        return false;

      case CircuitBreakerStateEnum.HALF_OPEN:
        return true;

      default:
        return false;
    }
  }

  public recordSuccess(): void {
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

    recordCircuitBreakerOperation(this.operation, this.state, "request");
  }

  public recordFailure(errorMessage?: string): void {
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

    recordCircuitBreakerOperation(this.operation, this.state, "request");

    if (errorMessage) {
      warn(`Telemetry circuit breaker recorded failure`, {
        event_name: "telemetry.circuit_breaker.failure_recorded",
        component: "telemetry_circuit_breaker",
        operation: this.operation,
        state: this.state,
        failure_count: this.failureCount,
        error: errorMessage,
      });
    }
  }

  private transitionTo(newState: CircuitBreakerStateEnum): void {
    const previousState = this.state;
    this.state = newState;
    this.lastStateChange = Date.now();

    recordCircuitBreakerState(this.operation, newState);
    recordCircuitBreakerOperation(this.operation, newState, "state_transition");

    log(`Telemetry circuit breaker state transition`, {
      event_name: `telemetry.circuit_breaker.${newState}`,
      component: "telemetry_circuit_breaker",
      operation: this.operation,
      previous_state: previousState,
      new_state: newState,
      failure_count: this.failureCount,
      success_count: this.successCount,
      total_requests: this.totalRequests,
    });

    if (newState === CircuitBreakerStateEnum.OPEN) {
      error(`Telemetry circuit breaker OPENED - ${this.operation} exports failing`, {
        event_name: "telemetry.circuit_breaker.opened",
        component: "telemetry_circuit_breaker",
        operation: this.operation,
        failure_threshold: this.config.failureThreshold,
        failure_count: this.failureCount,
        impact: "Telemetry exports will be rejected until recovery",
      });
    } else if (
      newState === CircuitBreakerStateEnum.CLOSED &&
      previousState === CircuitBreakerStateEnum.HALF_OPEN
    ) {
      log(`Telemetry circuit breaker RECOVERED - ${this.operation} exports healthy`, {
        event_name: "telemetry.circuit_breaker.closed",
        component: "telemetry_circuit_breaker",
        operation: this.operation,
        success_threshold: this.config.successThreshold,
        recovery_time_ms: Date.now() - this.lastStateChange,
      });
    }
  }

  private checkRecovery(): void {
    if (
      this.state === CircuitBreakerStateEnum.OPEN &&
      Date.now() - this.lastFailureTime >= this.config.recoveryTimeout
    ) {
      this.transitionTo(CircuitBreakerStateEnum.HALF_OPEN);
    }
  }

  public getStats(): TelemetryCircuitBreakerStats {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      totalRequests: this.totalRequests,
      rejectedRequests: this.rejectedRequests,
      lastStateChange: this.lastStateChange,
    };
  }

  public reset(): void {
    this.transitionTo(CircuitBreakerStateEnum.CLOSED);
    this.failureCount = 0;
    this.successCount = 0;
    this.halfOpenSuccesses = 0;
    this.totalRequests = 0;
    this.rejectedRequests = 0;

    log(`Telemetry circuit breaker manually reset`, {
      event_name: "telemetry.circuit_breaker.reset",
      component: "telemetry_circuit_breaker",
      operation: this.operation,
    });
  }
}

const circuitBreakerConfig: TelemetryCircuitBreakerConfig = {
  failureThreshold: 5,
  recoveryTimeout: 60000,
  successThreshold: 3,
  monitoringInterval: 10000,
};

export const telemetryCircuitBreakers = {
  traces: new TelemetryCircuitBreaker("telemetry_traces_export", circuitBreakerConfig),
  metrics: new TelemetryCircuitBreaker("telemetry_metrics_export", circuitBreakerConfig),
  logs: new TelemetryCircuitBreaker("telemetry_logs_export", circuitBreakerConfig),
};

export function getTelemetryCircuitBreakerStats(): Record<string, TelemetryCircuitBreakerStats> {
  return {
    traces: telemetryCircuitBreakers.traces.getStats(),
    metrics: telemetryCircuitBreakers.metrics.getStats(),
    logs: telemetryCircuitBreakers.logs.getStats(),
  };
}

export function resetTelemetryCircuitBreakers(): void {
  Object.values(telemetryCircuitBreakers).forEach((cb) => {
    cb.reset();
  });

  log("All telemetry circuit breakers reset", {
    event_name: "telemetry.circuit_breaker.reset",
    component: "telemetry_circuit_breaker",
    operation: "reset_all",
  });
}

export function shutdownTelemetryCircuitBreakers(): void {
  Object.values(telemetryCircuitBreakers).forEach((cb) => {
    cb.shutdown();
  });

  log("All telemetry circuit breakers shutdown", {
    event_name: "telemetry.circuit_breaker.shutdown",
    component: "telemetry_circuit_breaker",
    operation: "shutdown_all",
  });
}
