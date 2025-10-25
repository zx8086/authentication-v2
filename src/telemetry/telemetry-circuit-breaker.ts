/* src/telemetry/telemetry-circuit-breaker.ts */

import { error, log, warn } from "../utils/logger";
import { recordCircuitBreakerOperation, recordCircuitBreakerState } from "./metrics";

export enum CircuitBreakerState {
  CLOSED = "closed", // Normal operation
  OPEN = "open", // Blocking requests
  HALF_OPEN = "half_open", // Testing recovery
}

export interface CircuitBreakerConfig {
  failureThreshold: number; // Number of failures to open circuit
  recoveryTimeout: number; // Time to wait before trying half-open (ms)
  successThreshold: number; // Successes needed in half-open to close
  monitoringInterval: number; // How often to check circuit state (ms)
}

export interface CircuitBreakerStats {
  state: CircuitBreakerState;
  failureCount: number;
  successCount: number;
  lastFailureTime: number;
  lastSuccessTime: number;
  totalRequests: number;
  rejectedRequests: number;
  lastStateChange: number;
}

export class TelemetryCircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private lastSuccessTime = 0;
  private totalRequests = 0;
  private rejectedRequests = 0;
  private lastStateChange = Date.now();
  private halfOpenSuccesses = 0;

  constructor(
    private readonly operation: string,
    private readonly config: CircuitBreakerConfig
  ) {
    // Start monitoring circuit breaker state
    setInterval(() => this.checkRecovery(), config.monitoringInterval);
  }

  public canExecute(): boolean {
    this.totalRequests++;

    switch (this.state) {
      case CircuitBreakerState.CLOSED:
        return true;

      case CircuitBreakerState.OPEN:
        if (Date.now() - this.lastFailureTime >= this.config.recoveryTimeout) {
          this.transitionTo(CircuitBreakerState.HALF_OPEN);
          return true;
        }
        this.rejectedRequests++;
        recordCircuitBreakerOperation(this.operation, this.state, "rejected");
        return false;

      case CircuitBreakerState.HALF_OPEN:
        return true;

      default:
        return false;
    }
  }

  public recordSuccess(): void {
    this.failureCount = 0;
    this.successCount++;
    this.lastSuccessTime = Date.now();

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.halfOpenSuccesses++;
      if (this.halfOpenSuccesses >= this.config.successThreshold) {
        this.transitionTo(CircuitBreakerState.CLOSED);
        this.halfOpenSuccesses = 0;
      }
    }

    recordCircuitBreakerOperation(this.operation, this.state, "request");
  }

  public recordFailure(errorMessage?: string): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    this.halfOpenSuccesses = 0; // Reset half-open progress

    if (
      this.state === CircuitBreakerState.CLOSED &&
      this.failureCount >= this.config.failureThreshold
    ) {
      this.transitionTo(CircuitBreakerState.OPEN);
    } else if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.transitionTo(CircuitBreakerState.OPEN);
    }

    recordCircuitBreakerOperation(this.operation, this.state, "request");

    if (errorMessage) {
      warn(`Telemetry circuit breaker recorded failure`, {
        component: "telemetry_circuit_breaker",
        operation: this.operation,
        state: this.state,
        failureCount: this.failureCount,
        error: errorMessage,
      });
    }
  }

  private transitionTo(newState: CircuitBreakerState): void {
    const previousState = this.state;
    this.state = newState;
    this.lastStateChange = Date.now();

    recordCircuitBreakerState(this.operation, newState);
    recordCircuitBreakerOperation(this.operation, newState, "state_transition");

    log(`Telemetry circuit breaker state transition`, {
      component: "telemetry_circuit_breaker",
      operation: this.operation,
      previousState,
      newState,
      failureCount: this.failureCount,
      successCount: this.successCount,
      totalRequests: this.totalRequests,
    });

    // Log critical state changes
    if (newState === CircuitBreakerState.OPEN) {
      error(`Telemetry circuit breaker OPENED - ${this.operation} exports failing`, {
        component: "telemetry_circuit_breaker",
        operation: this.operation,
        failureThreshold: this.config.failureThreshold,
        failureCount: this.failureCount,
        impact: "Telemetry exports will be rejected until recovery",
      });
    } else if (
      newState === CircuitBreakerState.CLOSED &&
      previousState === CircuitBreakerState.HALF_OPEN
    ) {
      log(`Telemetry circuit breaker RECOVERED - ${this.operation} exports healthy`, {
        component: "telemetry_circuit_breaker",
        operation: this.operation,
        successThreshold: this.config.successThreshold,
        recoveryTime: Date.now() - this.lastStateChange,
      });
    }
  }

  private checkRecovery(): void {
    if (
      this.state === CircuitBreakerState.OPEN &&
      Date.now() - this.lastFailureTime >= this.config.recoveryTimeout
    ) {
      this.transitionTo(CircuitBreakerState.HALF_OPEN);
    }
  }

  public getStats(): CircuitBreakerStats {
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
    this.transitionTo(CircuitBreakerState.CLOSED);
    this.failureCount = 0;
    this.successCount = 0;
    this.halfOpenSuccesses = 0;
    this.totalRequests = 0;
    this.rejectedRequests = 0;

    log(`Telemetry circuit breaker manually reset`, {
      component: "telemetry_circuit_breaker",
      operation: this.operation,
    });
  }
}

// Circuit breaker instances for different telemetry types
const circuitBreakerConfig: CircuitBreakerConfig = {
  failureThreshold: 5, // 5 failures to open
  recoveryTimeout: 60000, // 60 seconds before retry
  successThreshold: 3, // 3 successes to close
  monitoringInterval: 10000, // Check every 10 seconds
};

export const telemetryCircuitBreakers = {
  traces: new TelemetryCircuitBreaker("telemetry_traces_export", circuitBreakerConfig),
  metrics: new TelemetryCircuitBreaker("telemetry_metrics_export", circuitBreakerConfig),
  logs: new TelemetryCircuitBreaker("telemetry_logs_export", circuitBreakerConfig),
};

export function getTelemetryCircuitBreakerStats(): Record<string, CircuitBreakerStats> {
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
    component: "telemetry_circuit_breaker",
    operation: "reset_all",
  });
}
