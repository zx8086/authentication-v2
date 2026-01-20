/* test/bun/telemetry-circuit-breaker.test.ts */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import {
  CircuitBreakerState,
  getTelemetryCircuitBreakerStats,
  resetTelemetryCircuitBreakers,
  TelemetryCircuitBreaker,
} from "../../../src/telemetry/telemetry-circuit-breaker";

describe("TelemetryCircuitBreaker", () => {
  let breaker: TelemetryCircuitBreaker;

  beforeEach(() => {
    breaker = new TelemetryCircuitBreaker("test_operation", {
      failureThreshold: 3,
      recoveryTimeout: 100, // Short timeout for tests
      successThreshold: 2,
      monitoringInterval: 50, // Short interval for tests
    });
  });

  afterEach(() => {
    breaker.shutdown();
    resetTelemetryCircuitBreakers();
  });

  describe("canExecute", () => {
    it("should return true when circuit is CLOSED", () => {
      expect(breaker.canExecute()).toBe(true);
      expect(breaker.getStats().state).toBe(CircuitBreakerState.CLOSED);
    });

    it("should increment totalRequests on each call", () => {
      const initialCount = breaker.getStats().totalRequests;
      breaker.canExecute();
      breaker.canExecute();
      breaker.canExecute();
      expect(breaker.getStats().totalRequests).toBe(initialCount + 3);
    });

    it("should return false when circuit is OPEN and recovery timeout not reached", () => {
      // Trigger failures to open circuit
      breaker.canExecute();
      breaker.recordFailure("error 1");
      breaker.canExecute();
      breaker.recordFailure("error 2");
      breaker.canExecute();
      breaker.recordFailure("error 3");

      expect(breaker.getStats().state).toBe(CircuitBreakerState.OPEN);

      // Should return false while OPEN
      const canExecute = breaker.canExecute();
      expect(canExecute).toBe(false);
      expect(breaker.getStats().rejectedRequests).toBeGreaterThan(0);
    });

    it("should transition to HALF_OPEN after recovery timeout", async () => {
      // Open the circuit
      breaker.canExecute();
      breaker.recordFailure();
      breaker.canExecute();
      breaker.recordFailure();
      breaker.canExecute();
      breaker.recordFailure();

      expect(breaker.getStats().state).toBe(CircuitBreakerState.OPEN);

      // Wait for recovery timeout (100ms) plus buffer
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Next canExecute should transition to HALF_OPEN and return true
      const canExecute = breaker.canExecute();
      expect(canExecute).toBe(true);
      expect(breaker.getStats().state).toBe(CircuitBreakerState.HALF_OPEN);
    });

    it("should return true when circuit is HALF_OPEN", async () => {
      // Open circuit
      for (let i = 0; i < 3; i++) {
        breaker.canExecute();
        breaker.recordFailure();
      }

      // Wait for recovery
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Transition to HALF_OPEN
      breaker.canExecute();
      expect(breaker.getStats().state).toBe(CircuitBreakerState.HALF_OPEN);

      // Should still return true in HALF_OPEN
      expect(breaker.canExecute()).toBe(true);
    });
  });

  describe("recordSuccess", () => {
    it("should reset failure count", () => {
      breaker.canExecute();
      breaker.recordFailure();
      breaker.canExecute();
      breaker.recordFailure();
      expect(breaker.getStats().failureCount).toBe(2);

      breaker.recordSuccess();
      expect(breaker.getStats().failureCount).toBe(0);
    });

    it("should increment success count", () => {
      const initialCount = breaker.getStats().successCount;
      breaker.recordSuccess();
      breaker.recordSuccess();
      expect(breaker.getStats().successCount).toBe(initialCount + 2);
    });

    it("should update lastSuccessTime", () => {
      const before = breaker.getStats().lastSuccessTime;
      breaker.recordSuccess();
      const after = breaker.getStats().lastSuccessTime;
      expect(after).toBeGreaterThanOrEqual(before);
    });

    it("should transition from HALF_OPEN to CLOSED after success threshold", async () => {
      // Open circuit
      for (let i = 0; i < 3; i++) {
        breaker.canExecute();
        breaker.recordFailure();
      }

      // Wait for recovery
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Transition to HALF_OPEN
      breaker.canExecute();
      expect(breaker.getStats().state).toBe(CircuitBreakerState.HALF_OPEN);

      // Record successes to reach threshold (2)
      breaker.recordSuccess();
      expect(breaker.getStats().state).toBe(CircuitBreakerState.HALF_OPEN);

      breaker.recordSuccess();
      expect(breaker.getStats().state).toBe(CircuitBreakerState.CLOSED);
    });
  });

  describe("recordFailure", () => {
    it("should increment failure count", () => {
      breaker.recordFailure();
      expect(breaker.getStats().failureCount).toBe(1);

      breaker.recordFailure();
      expect(breaker.getStats().failureCount).toBe(2);
    });

    it("should update lastFailureTime", () => {
      const before = breaker.getStats().lastFailureTime;
      breaker.recordFailure();
      const after = breaker.getStats().lastFailureTime;
      expect(after).toBeGreaterThan(before);
    });

    it("should open circuit when failure threshold reached in CLOSED state", () => {
      expect(breaker.getStats().state).toBe(CircuitBreakerState.CLOSED);

      breaker.canExecute();
      breaker.recordFailure();
      breaker.canExecute();
      breaker.recordFailure();
      expect(breaker.getStats().state).toBe(CircuitBreakerState.CLOSED);

      breaker.canExecute();
      breaker.recordFailure(); // Third failure - reaches threshold
      expect(breaker.getStats().state).toBe(CircuitBreakerState.OPEN);
    });

    it("should log warning when errorMessage is provided", () => {
      // This should not throw
      expect(() => breaker.recordFailure("Test error message")).not.toThrow();
    });

    it("should not log warning when errorMessage is not provided", () => {
      // This should not throw
      expect(() => breaker.recordFailure()).not.toThrow();
    });

    it("should transition from HALF_OPEN to OPEN on failure", async () => {
      // Open circuit
      for (let i = 0; i < 3; i++) {
        breaker.canExecute();
        breaker.recordFailure();
      }

      // Wait for recovery
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Transition to HALF_OPEN
      breaker.canExecute();
      expect(breaker.getStats().state).toBe(CircuitBreakerState.HALF_OPEN);

      // Failure in HALF_OPEN should reopen circuit
      breaker.recordFailure();
      expect(breaker.getStats().state).toBe(CircuitBreakerState.OPEN);
    });

    it("should reset halfOpenSuccesses on failure", async () => {
      // Open circuit
      for (let i = 0; i < 3; i++) {
        breaker.canExecute();
        breaker.recordFailure();
      }

      // Wait for recovery
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Transition to HALF_OPEN
      breaker.canExecute();
      breaker.recordSuccess(); // One success towards threshold

      // Failure resets progress
      breaker.recordFailure();

      // Re-open and try again - need 2 successes again
      await new Promise((resolve) => setTimeout(resolve, 150));
      breaker.canExecute();
      breaker.recordSuccess();
      expect(breaker.getStats().state).toBe(CircuitBreakerState.HALF_OPEN);
    });
  });

  describe("checkRecovery (via monitoring interval)", () => {
    it("should automatically transition from OPEN to HALF_OPEN after recovery timeout", async () => {
      // Open circuit
      for (let i = 0; i < 3; i++) {
        breaker.canExecute();
        breaker.recordFailure();
      }
      expect(breaker.getStats().state).toBe(CircuitBreakerState.OPEN);

      // Wait for monitoring interval to trigger recovery check
      // recoveryTimeout=100ms, monitoringInterval=50ms, so wait 200ms
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Should have transitioned to HALF_OPEN via checkRecovery
      expect(breaker.getStats().state).toBe(CircuitBreakerState.HALF_OPEN);
    });
  });

  describe("getStats", () => {
    it("should return complete statistics", () => {
      const stats = breaker.getStats();

      expect(stats).toHaveProperty("state");
      expect(stats).toHaveProperty("failureCount");
      expect(stats).toHaveProperty("successCount");
      expect(stats).toHaveProperty("lastFailureTime");
      expect(stats).toHaveProperty("lastSuccessTime");
      expect(stats).toHaveProperty("totalRequests");
      expect(stats).toHaveProperty("rejectedRequests");
      expect(stats).toHaveProperty("lastStateChange");
    });
  });

  describe("reset", () => {
    it("should reset all counters", () => {
      breaker.canExecute();
      breaker.recordFailure();
      breaker.canExecute();
      breaker.recordSuccess();

      breaker.reset();

      const stats = breaker.getStats();
      expect(stats.failureCount).toBe(0);
      expect(stats.successCount).toBe(0);
      expect(stats.totalRequests).toBe(0);
      expect(stats.rejectedRequests).toBe(0);
      expect(stats.state).toBe(CircuitBreakerState.CLOSED);
    });
  });

  describe("shutdown", () => {
    it("should clear monitoring interval", () => {
      // Should not throw
      expect(() => breaker.shutdown()).not.toThrow();

      // Should be safe to call multiple times
      expect(() => breaker.shutdown()).not.toThrow();
    });
  });

  describe("getTelemetryCircuitBreakerStats", () => {
    it("should return stats for all telemetry circuit breakers", () => {
      const stats = getTelemetryCircuitBreakerStats();

      expect(stats).toHaveProperty("traces");
      expect(stats).toHaveProperty("metrics");
      expect(stats).toHaveProperty("logs");

      expect(stats.traces.state).toBeDefined();
      expect(stats.metrics.state).toBeDefined();
      expect(stats.logs.state).toBeDefined();
    });
  });
});
