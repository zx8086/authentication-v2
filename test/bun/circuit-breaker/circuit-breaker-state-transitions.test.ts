/* test/bun/circuit-breaker-state-transitions.test.ts */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import type { CachingConfig, CircuitBreakerConfig } from "../../../src/config/schemas";
import { KongCircuitBreakerService } from "../../../src/services/circuit-breaker.service";

describe("Circuit Breaker State Transitions", () => {
  let circuitBreaker: KongCircuitBreakerService;

  const defaultCircuitBreakerConfig: CircuitBreakerConfig = {
    enabled: true,
    timeout: 100,
    errorThresholdPercentage: 50,
    resetTimeout: 200,
    rollingCountTimeout: 1000,
    rollingCountBuckets: 10,
    volumeThreshold: 3,
  };

  const cachingConfig: CachingConfig = {
    highAvailability: false,
    redisUrl: "redis://localhost:6379",
    redisPassword: undefined,
    redisDb: 0,
    ttlSeconds: 300,
    staleDataToleranceMinutes: 60,
  };

  beforeEach(() => {
    circuitBreaker = new KongCircuitBreakerService(defaultCircuitBreakerConfig, cachingConfig);
  });

  afterEach(() => {
    circuitBreaker.shutdown();
  });

  describe("HalfOpen State Transition", () => {
    it("should trigger halfOpen event when circuit transitions from open to half-open", async () => {
      const failingOperation = async () => {
        throw new Error("Operation failed");
      };

      for (let i = 0; i < 5; i++) {
        try {
          await circuitBreaker.wrapKongOperation("testOperation", failingOperation);
        } catch {
          // Expected to fail
        }
      }

      const stats = circuitBreaker.getStats();
      expect(stats.testOperation?.state).toBe("open");

      await new Promise((resolve) => setTimeout(resolve, 250));

      const successOperation = async () => ({ data: "success" });
      const result = await circuitBreaker.wrapKongOperation("testOperation", successOperation);

      expect(result).toEqual({ data: "success" });
      const finalStats = circuitBreaker.getStats();
      expect(finalStats.testOperation?.state).toBe("closed");
    });

    it("should log halfOpen state transition correctly", async () => {
      const failingOperation = async () => {
        throw new Error("Operation failed");
      };

      for (let i = 0; i < 5; i++) {
        try {
          await circuitBreaker.wrapKongOperation("halfOpenTest", failingOperation);
        } catch {
          // Expected to fail
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 250));

      const successOperation = async () => ({ data: "recovered" });
      await circuitBreaker.wrapKongOperation("halfOpenTest", successOperation);

      const stats = circuitBreaker.getStats();
      expect(stats.halfOpenTest?.stats.successes).toBeGreaterThan(0);
    });
  });

  describe("Close State Transition", () => {
    it("should trigger close event when circuit transitions from half-open to closed", async () => {
      const failingOperation = async () => {
        throw new Error("Failure");
      };

      for (let i = 0; i < 5; i++) {
        try {
          await circuitBreaker.wrapKongOperation("closeTest", failingOperation);
        } catch {
          // Expected
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 250));

      const successOperation = async () => ({ status: "ok" });
      const result = await circuitBreaker.wrapKongOperation("closeTest", successOperation);

      expect(result).toEqual({ status: "ok" });

      const stats = circuitBreaker.getStats();
      expect(stats.closeTest?.state).toBe("closed");
      expect(stats.closeTest?.stats.successes).toBeGreaterThanOrEqual(1);
    });

    it("should track multiple close transitions", async () => {
      for (let cycle = 0; cycle < 2; cycle++) {
        const failingOp = async () => {
          throw new Error("Fail");
        };

        for (let i = 0; i < 5; i++) {
          try {
            await circuitBreaker.wrapKongOperation("multiClose", failingOp);
          } catch {
            // Expected
          }
        }

        await new Promise((resolve) => setTimeout(resolve, 250));

        const successOp = async () => ({ cycle });
        await circuitBreaker.wrapKongOperation("multiClose", successOp);
      }

      const stats = circuitBreaker.getStats();
      expect(stats.multiClose?.state).toBe("closed");
    });
  });

  describe("Timeout Event", () => {
    it("should trigger timeout event when operation exceeds timeout threshold", async () => {
      const slowOperation = async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
        return { data: "too slow" };
      };

      const result = await circuitBreaker.wrapKongOperation("timeoutTest", slowOperation);

      expect(result).toBeNull();

      const stats = circuitBreaker.getStats();
      expect(stats.timeoutTest?.stats.timeouts).toBeGreaterThan(0);
    });

    it("should count multiple timeouts correctly", async () => {
      const slowOperation = async () => {
        await new Promise((resolve) => setTimeout(resolve, 150));
        return { data: "delayed" };
      };

      for (let i = 0; i < 3; i++) {
        await circuitBreaker.wrapKongOperation("multiTimeout", slowOperation);
      }

      const stats = circuitBreaker.getStats();
      expect(stats.multiTimeout?.stats.timeouts).toBeGreaterThanOrEqual(3);
    });

    it("should log timeout with operation context", async () => {
      const delayedOperation = async () => {
        await new Promise((resolve) => setTimeout(resolve, 300));
        return { result: "never reaches here" };
      };

      await circuitBreaker.wrapKongOperation("loggedTimeout", delayedOperation);

      const stats = circuitBreaker.getStats();
      expect(stats.loggedTimeout).toBeDefined();
      expect(stats.loggedTimeout?.stats.timeouts).toBe(1);
    });
  });

  describe("Combined State Transitions", () => {
    it("should handle open -> halfOpen -> closed transition sequence", async () => {
      const failOp = async () => {
        throw new Error("Fail");
      };

      for (let i = 0; i < 5; i++) {
        try {
          await circuitBreaker.wrapKongOperation("fullCycle", failOp);
        } catch {
          // Expected
        }
      }

      let stats = circuitBreaker.getStats();
      expect(stats.fullCycle?.state).toBe("open");

      await new Promise((resolve) => setTimeout(resolve, 250));

      const successOp = async () => ({ recovered: true });
      const result = await circuitBreaker.wrapKongOperation("fullCycle", successOp);

      expect(result).toEqual({ recovered: true });

      stats = circuitBreaker.getStats();
      expect(stats.fullCycle?.state).toBe("closed");
      expect(stats.fullCycle?.stats.failures).toBeGreaterThanOrEqual(3);
      expect(stats.fullCycle?.stats.successes).toBeGreaterThanOrEqual(1);
    });
  });
});
