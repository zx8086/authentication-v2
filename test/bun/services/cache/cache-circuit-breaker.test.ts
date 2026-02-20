// test/bun/services/cache/cache-circuit-breaker.test.ts

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import {
  CacheCircuitBreaker,
  DEFAULT_CACHE_CIRCUIT_BREAKER_CONFIG,
} from "../../../../src/services/cache/cache-circuit-breaker";
import { CircuitBreakerStateEnum } from "../../../../src/types/circuit-breaker.types";

describe("Cache Circuit Breaker", () => {
  describe("DEFAULT_CACHE_CIRCUIT_BREAKER_CONFIG", () => {
    it("should have correct default values", () => {
      expect(DEFAULT_CACHE_CIRCUIT_BREAKER_CONFIG.enabled).toBe(true);
      expect(DEFAULT_CACHE_CIRCUIT_BREAKER_CONFIG.failureThreshold).toBe(5);
      expect(DEFAULT_CACHE_CIRCUIT_BREAKER_CONFIG.resetTimeout).toBe(30000);
      expect(DEFAULT_CACHE_CIRCUIT_BREAKER_CONFIG.successThreshold).toBe(2);
    });
  });

  describe("CacheCircuitBreaker", () => {
    let breaker: CacheCircuitBreaker;

    beforeEach(() => {
      breaker = new CacheCircuitBreaker();
    });

    afterEach(() => {
      breaker.reset();
    });

    describe("initial state", () => {
      it("should start in CLOSED state", () => {
        expect(breaker.getState()).toBe(CircuitBreakerStateEnum.CLOSED);
      });

      it("should allow execution initially", () => {
        expect(breaker.canExecute()).toBe(true);
      });

      it("should have zero failure count", () => {
        const stats = breaker.getStats();
        expect(stats.failureCount).toBe(0);
        expect(stats.successCount).toBe(0);
      });
    });

    describe("recordSuccess", () => {
      it("should increment success count", () => {
        breaker.recordSuccess();
        expect(breaker.getStats().successCount).toBe(1);
      });

      it("should reset failure count", () => {
        breaker.recordFailure(new Error("test"));
        breaker.recordFailure(new Error("test"));
        breaker.recordSuccess();
        expect(breaker.getStats().failureCount).toBe(0);
      });
    });

    describe("recordFailure", () => {
      it("should increment failure count for connection errors", () => {
        // Only connection errors are counted
        breaker.recordFailure(new Error("ECONNRESET"));
        expect(breaker.getStats().failureCount).toBe(1);
      });

      it("should ignore non-connection errors", () => {
        // Non-connection errors are ignored by the circuit breaker
        breaker.recordFailure(new Error("some random error"));
        expect(breaker.getStats().failureCount).toBe(0);
      });

      it("should open circuit after threshold failures", () => {
        const breaker = new CacheCircuitBreaker({
          enabled: true,
          failureThreshold: 3,
          resetTimeout: 30000,
          successThreshold: 2,
        });

        // Use connection errors that trigger state changes
        breaker.recordFailure(new Error("ECONNRESET"));
        breaker.recordFailure(new Error("ECONNRESET"));
        expect(breaker.getState()).toBe(CircuitBreakerStateEnum.CLOSED);

        breaker.recordFailure(new Error("ECONNRESET"));
        expect(breaker.getState()).toBe(CircuitBreakerStateEnum.OPEN);
        expect(breaker.canExecute()).toBe(false);
      });

      it("should open circuit when threshold reached", () => {
        const breaker = new CacheCircuitBreaker({
          enabled: true,
          failureThreshold: 2,
          resetTimeout: 30000,
          successThreshold: 2,
        });

        breaker.recordFailure(new Error("ECONNRESET"));
        expect(breaker.getState()).toBe(CircuitBreakerStateEnum.CLOSED);

        breaker.recordFailure(new Error("ECONNRESET"));
        expect(breaker.getState()).toBe(CircuitBreakerStateEnum.OPEN);
      });
    });

    describe("state transitions", () => {
      it("should transition from OPEN to HALF_OPEN after reset timeout", async () => {
        const breaker = new CacheCircuitBreaker({
          enabled: true,
          failureThreshold: 1,
          resetTimeout: 50,
          successThreshold: 2,
        });

        breaker.recordFailure(new Error("ECONNRESET"));
        expect(breaker.getState()).toBe(CircuitBreakerStateEnum.OPEN);
        expect(breaker.canExecute()).toBe(false);

        // Wait for reset timeout
        await new Promise((resolve) => setTimeout(resolve, 60));

        // canExecute() triggers state transition when timeout elapsed
        expect(breaker.canExecute()).toBe(true);
        expect(breaker.getState()).toBe(CircuitBreakerStateEnum.HALF_OPEN);
      });

      it("should transition from HALF_OPEN to CLOSED after success threshold", async () => {
        const breaker = new CacheCircuitBreaker({
          enabled: true,
          failureThreshold: 1,
          resetTimeout: 10,
          successThreshold: 2,
        });

        breaker.recordFailure(new Error("ECONNRESET"));
        await new Promise((resolve) => setTimeout(resolve, 20));
        breaker.canExecute(); // Trigger transition to HALF_OPEN
        expect(breaker.getState()).toBe(CircuitBreakerStateEnum.HALF_OPEN);

        breaker.recordSuccess();
        expect(breaker.getState()).toBe(CircuitBreakerStateEnum.HALF_OPEN);

        breaker.recordSuccess();
        expect(breaker.getState()).toBe(CircuitBreakerStateEnum.CLOSED);
      });

      it("should transition from HALF_OPEN back to OPEN on failure", async () => {
        const breaker = new CacheCircuitBreaker({
          enabled: true,
          failureThreshold: 1,
          resetTimeout: 10,
          successThreshold: 2,
        });

        breaker.recordFailure(new Error("ECONNRESET"));
        await new Promise((resolve) => setTimeout(resolve, 20));
        breaker.canExecute(); // Trigger transition to HALF_OPEN
        expect(breaker.getState()).toBe(CircuitBreakerStateEnum.HALF_OPEN);

        breaker.recordFailure(new Error("ECONNRESET"));
        expect(breaker.getState()).toBe(CircuitBreakerStateEnum.OPEN);
      });
    });

    describe("disabled circuit breaker", () => {
      it("should always be available when disabled", () => {
        const breaker = new CacheCircuitBreaker({
          enabled: false,
          failureThreshold: 5,
          resetTimeout: 30000,
          successThreshold: 2,
        });

        // Record many failures (using connection errors)
        for (let i = 0; i < 10; i++) {
          breaker.recordFailure(new Error("ECONNRESET"));
        }

        expect(breaker.canExecute()).toBe(true);
        expect(breaker.getState()).toBe(CircuitBreakerStateEnum.CLOSED);
      });

      it("should not track failures when disabled", () => {
        const breaker = new CacheCircuitBreaker({
          enabled: false,
          failureThreshold: 5,
          resetTimeout: 30000,
          successThreshold: 2,
        });

        breaker.recordFailure(new Error("ECONNRESET"));
        breaker.recordSuccess();

        // When disabled, recordFailure and recordSuccess return early
        const stats = breaker.getStats();
        expect(stats.failureCount).toBe(0);
        expect(stats.successCount).toBe(0);
      });
    });

    describe("reset", () => {
      it("should reset to initial state", () => {
        const breaker = new CacheCircuitBreaker({
          enabled: true,
          failureThreshold: 1,
          resetTimeout: 30000,
          successThreshold: 2,
        });

        breaker.recordFailure(new Error("ECONNRESET"));
        expect(breaker.getState()).toBe(CircuitBreakerStateEnum.OPEN);

        breaker.reset();

        expect(breaker.getState()).toBe(CircuitBreakerStateEnum.CLOSED);
        expect(breaker.canExecute()).toBe(true);
        expect(breaker.getStats().failureCount).toBe(0);
        expect(breaker.getStats().successCount).toBe(0);
      });
    });

    describe("getStats", () => {
      it("should return comprehensive statistics", () => {
        const breaker = new CacheCircuitBreaker({
          enabled: true,
          failureThreshold: 5,
          resetTimeout: 30000,
          successThreshold: 2,
        });

        breaker.recordSuccess();
        breaker.recordSuccess();
        breaker.recordFailure(new Error("ECONNRESET"));

        const stats = breaker.getStats();

        expect(stats.state).toBe(CircuitBreakerStateEnum.CLOSED);
        expect(stats.failureCount).toBe(1);
        expect(stats.successCount).toBe(2);
      });

      it("should include state change time when open", () => {
        const breaker = new CacheCircuitBreaker({
          enabled: true,
          failureThreshold: 1,
          resetTimeout: 30000,
          successThreshold: 2,
        });
        const beforeTime = Date.now();

        breaker.recordFailure(new Error("ECONNRESET"));

        const stats = breaker.getStats();
        expect(stats.lastStateChange).toBeDefined();
        expect(stats.lastStateChange).toBeGreaterThanOrEqual(beforeTime);
      });
    });

    describe("isOpen", () => {
      it("should return true when circuit is OPEN", () => {
        const breaker = new CacheCircuitBreaker({
          enabled: true,
          failureThreshold: 1,
          resetTimeout: 30000,
          successThreshold: 2,
        });
        breaker.recordFailure(new Error("ECONNRESET"));
        expect(breaker.isOpen()).toBe(true);
      });

      it("should return false when circuit is CLOSED", () => {
        expect(breaker.isOpen()).toBe(false);
      });

      it("should return false when circuit is HALF_OPEN", async () => {
        const breaker = new CacheCircuitBreaker({
          enabled: true,
          failureThreshold: 1,
          resetTimeout: 10,
          successThreshold: 2,
        });
        breaker.recordFailure(new Error("ECONNRESET"));
        await new Promise((resolve) => setTimeout(resolve, 20));
        breaker.canExecute(); // Trigger transition to HALF_OPEN
        expect(breaker.isOpen()).toBe(false);
      });
    });

    describe("multiple rapid failures", () => {
      it("should handle rapid consecutive failures", () => {
        const breaker = new CacheCircuitBreaker({
          enabled: true,
          failureThreshold: 3,
          resetTimeout: 30000,
          successThreshold: 2,
        });

        // Rapid fire failures (using connection errors)
        breaker.recordFailure(new Error("ECONNRESET"));
        breaker.recordFailure(new Error("ECONNRESET"));
        breaker.recordFailure(new Error("ECONNRESET"));
        breaker.recordFailure(new Error("ECONNRESET"));
        breaker.recordFailure(new Error("ECONNRESET"));

        expect(breaker.getState()).toBe(CircuitBreakerStateEnum.OPEN);
        expect(breaker.getStats().failureCount).toBe(5);
      });
    });

    describe("mixed success and failure", () => {
      it("should reset failure count on success in CLOSED state", () => {
        const breaker = new CacheCircuitBreaker({
          enabled: true,
          failureThreshold: 5,
          resetTimeout: 30000,
          successThreshold: 2,
        });

        breaker.recordFailure(new Error("ECONNRESET"));
        breaker.recordFailure(new Error("ECONNRESET"));
        expect(breaker.getStats().failureCount).toBe(2);

        breaker.recordSuccess();
        expect(breaker.getStats().failureCount).toBe(0);

        breaker.recordFailure(new Error("ECONNRESET"));
        expect(breaker.getStats().failureCount).toBe(1);
      });
    });
  });
});
