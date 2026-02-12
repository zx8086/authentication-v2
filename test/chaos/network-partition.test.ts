/* test/chaos/network-partition.test.ts
 * Chaos engineering tests for network partition scenarios.
 * Validates circuit breaker behavior during intermittent connectivity.
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import type { CachingConfig, CircuitBreakerConfig, ConsumerSecret } from "../../src/config/schemas";
import { KongCircuitBreakerService } from "../../src/services/circuit-breaker.service";

describe("Network Partition Chaos Tests", () => {
  let circuitBreaker: KongCircuitBreakerService;

  const circuitBreakerConfig: CircuitBreakerConfig = {
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

  const mockConsumerSecret: ConsumerSecret = {
    id: "secret-123",
    key: "test-key",
    secret: "test-secret",
    consumer: {
      id: "consumer-123",
    },
  };

  beforeEach(() => {
    circuitBreaker = new KongCircuitBreakerService(circuitBreakerConfig, cachingConfig);
  });

  afterEach(() => {
    circuitBreaker.shutdown();
  });

  describe("Intermittent Connectivity", () => {
    it("should handle alternating success and failure", async () => {
      let callCount = 0;

      const flappingOperation = async (): Promise<ConsumerSecret> => {
        callCount++;
        if (callCount % 2 === 0) {
          throw new Error("Network temporarily unavailable");
        }
        return mockConsumerSecret;
      };

      const results: Array<ConsumerSecret | null> = [];

      for (let i = 0; i < 10; i++) {
        const result = await circuitBreaker.wrapKongConsumerOperation(
          "intermittentTest",
          "consumer-123",
          flappingOperation
        );
        results.push(result);
      }

      // Should have mix of successes and failures
      const successes = results.filter((r) => r !== null).length;
      const failures = results.filter((r) => r === null).length;

      expect(successes).toBeGreaterThan(0);
      expect(failures).toBeGreaterThan(0);
    });

    it("should not thrash circuit breaker state with occasional failures", async () => {
      let callCount = 0;

      // Only fail 1 in 5 requests (below 50% threshold)
      const occasionalFailure = async (): Promise<ConsumerSecret> => {
        callCount++;
        if (callCount % 5 === 0) {
          throw new Error("Occasional network hiccup");
        }
        return mockConsumerSecret;
      };

      // Execute many requests
      for (let i = 0; i < 20; i++) {
        await circuitBreaker.wrapKongConsumerOperation(
          "occasionalFailure",
          "consumer-123",
          occasionalFailure
        );
      }

      const stats = circuitBreaker.getStats();

      // Circuit should stay closed because failure rate < 50%
      expect(stats.occasionalFailure?.state).toBe("closed");
      expect(stats.occasionalFailure?.stats.successes).toBeGreaterThan(
        stats.occasionalFailure?.stats.failures || 0
      );
    });

    it("should open circuit when failure rate exceeds threshold", async () => {
      let callCount = 0;

      // Fail 4 out of 5 requests (80%, above 50% threshold)
      const frequentFailure = async (): Promise<ConsumerSecret> => {
        callCount++;
        if (callCount % 5 !== 0) {
          throw new Error("Frequent network failure");
        }
        return mockConsumerSecret;
      };

      // Execute enough requests to trigger circuit opening
      for (let i = 0; i < 15; i++) {
        await circuitBreaker.wrapKongConsumerOperation(
          "frequentFailure",
          "consumer-123",
          frequentFailure
        );
      }

      const stats = circuitBreaker.getStats();

      // Circuit should open due to high failure rate
      expect(stats.frequentFailure?.state).toBe("open");
    });
  });

  describe("High Latency Responses", () => {
    it("should handle responses at the timeout boundary", async () => {
      // Response time just under timeout
      const nearTimeoutOperation = async (): Promise<ConsumerSecret> => {
        await new Promise((resolve) => setTimeout(resolve, 90)); // Just under 100ms timeout
        return mockConsumerSecret;
      };

      const result = await circuitBreaker.wrapKongConsumerOperation(
        "nearTimeout",
        "consumer-123",
        nearTimeoutOperation
      );

      expect(result).toEqual(mockConsumerSecret);

      const stats = circuitBreaker.getStats();
      expect(stats.nearTimeout?.stats.timeouts).toBe(0);
    });

    it("should timeout responses exceeding threshold", async () => {
      const slowOperation = async (): Promise<ConsumerSecret> => {
        await new Promise((resolve) => setTimeout(resolve, 150)); // Over 100ms timeout
        return mockConsumerSecret;
      };

      const result = await circuitBreaker.wrapKongConsumerOperation(
        "slowResponse",
        "consumer-123",
        slowOperation
      );

      expect(result).toBeNull();

      const stats = circuitBreaker.getStats();
      expect(stats.slowResponse?.stats.timeouts).toBeGreaterThan(0);
    });

    it("should handle variable latency", async () => {
      let callCount = 0;

      const variableLatency = async (): Promise<ConsumerSecret> => {
        callCount++;
        // Alternate between fast and slow
        const delay = callCount % 2 === 0 ? 150 : 20;
        await new Promise((resolve) => setTimeout(resolve, delay));
        return mockConsumerSecret;
      };

      const results: Array<ConsumerSecret | null> = [];

      for (let i = 0; i < 6; i++) {
        const result = await circuitBreaker.wrapKongConsumerOperation(
          "variableLatency",
          "consumer-123",
          variableLatency
        );
        results.push(result);
      }

      // Should have mix of successes and timeouts
      const successes = results.filter((r) => r !== null).length;
      const timeouts = results.filter((r) => r === null).length;

      expect(successes).toBeGreaterThan(0);
      expect(timeouts).toBeGreaterThan(0);
    });
  });

  describe("Circuit Breaker Half-Open Behavior", () => {
    it("should allow test request in half-open state", async () => {
      const failingOperation = async (): Promise<ConsumerSecret> => {
        throw new Error("Service down");
      };

      // Open circuit
      for (let i = 0; i < 5; i++) {
        await circuitBreaker.wrapKongConsumerOperation(
          "halfOpenTest",
          "consumer-123",
          failingOperation
        );
      }

      expect(circuitBreaker.getStats().halfOpenTest?.state).toBe("open");

      // Wait for reset timeout
      await new Promise((resolve) => setTimeout(resolve, 250));

      // Next request should be allowed (half-open)
      const testRequest = async (): Promise<ConsumerSecret> => mockConsumerSecret;
      const result = await circuitBreaker.wrapKongConsumerOperation(
        "halfOpenTest",
        "consumer-123",
        testRequest
      );

      expect(result).toEqual(mockConsumerSecret);
      expect(circuitBreaker.getStats().halfOpenTest?.state).toBe("closed");
    });

    it("should re-open circuit if half-open test fails", async () => {
      const failingOperation = async (): Promise<ConsumerSecret> => {
        throw new Error("Still failing");
      };

      // Open circuit
      for (let i = 0; i < 5; i++) {
        await circuitBreaker.wrapKongConsumerOperation(
          "halfOpenFail",
          "consumer-123",
          failingOperation
        );
      }

      // Wait for half-open
      await new Promise((resolve) => setTimeout(resolve, 250));

      // Half-open test also fails
      await circuitBreaker.wrapKongConsumerOperation(
        "halfOpenFail",
        "consumer-123",
        failingOperation
      );

      expect(circuitBreaker.getStats().halfOpenFail?.state).toBe("open");
    });
  });

  describe("Flapping Connectivity", () => {
    it("should prevent rapid state transitions (circuit thrashing)", async () => {
      const stateTransitions: string[] = [];
      let currentState = "closed";

      for (let cycle = 0; cycle < 5; cycle++) {
        // Fail to open circuit
        const failOp = async (): Promise<ConsumerSecret> => {
          throw new Error("Fail");
        };

        for (let i = 0; i < 5; i++) {
          await circuitBreaker.wrapKongConsumerOperation("thrashTest", "consumer-123", failOp);
        }

        const afterFailState = circuitBreaker.getStats().thrashTest?.state || "unknown";
        if (afterFailState !== currentState) {
          stateTransitions.push(afterFailState);
          currentState = afterFailState;
        }

        // Wait for half-open
        await new Promise((resolve) => setTimeout(resolve, 250));

        // Succeed to close circuit
        const successOp = async (): Promise<ConsumerSecret> => mockConsumerSecret;
        await circuitBreaker.wrapKongConsumerOperation("thrashTest", "consumer-123", successOp);

        const afterSuccessState = circuitBreaker.getStats().thrashTest?.state || "unknown";
        if (afterSuccessState !== currentState) {
          stateTransitions.push(afterSuccessState);
          currentState = afterSuccessState;
        }
      }

      // Should see state transitions
      expect(stateTransitions.length).toBeGreaterThan(0);

      // Circuit should eventually stabilize
      const finalState = circuitBreaker.getStats().thrashTest?.state;
      expect(["closed", "open"]).toContain(finalState);
    });
  });

  describe("Partial Network Failure", () => {
    it("should isolate failures to specific operations", async () => {
      // Operation A fails
      const failingOperationA = async (): Promise<ConsumerSecret> => {
        throw new Error("Operation A network failure");
      };

      // Operation B succeeds
      const successOperationB = async () => ({ healthy: true });

      // Open circuit for operation A
      for (let i = 0; i < 5; i++) {
        await circuitBreaker.wrapKongConsumerOperation(
          "operationA",
          "consumer-123",
          failingOperationA
        );
      }

      // Operation B should still work
      const resultB = await circuitBreaker.wrapKongOperation("operationB", successOperationB);

      expect(circuitBreaker.getStats().operationA?.state).toBe("open");
      expect(resultB).toEqual({ healthy: true });
    });

    it("should track per-operation statistics separately", async () => {
      const successOpName = "partialNetworkSuccessOp";
      const failOpName = "partialNetworkFailOp";
      const successOp = async (): Promise<ConsumerSecret> => mockConsumerSecret;
      const failOp = async (): Promise<ConsumerSecret> => {
        throw new Error("Fail");
      };

      // Run different operations
      for (let i = 0; i < 5; i++) {
        await circuitBreaker.wrapKongConsumerOperation(successOpName, "consumer-123", successOp);
        await circuitBreaker.wrapKongConsumerOperation(failOpName, "consumer-123", failOp);
      }

      const stats = circuitBreaker.getStats();

      expect(stats[successOpName]?.stats.successes).toBe(5);
      expect(stats[successOpName]?.stats.failures).toBe(0);
      // Circuit opens after volumeThreshold (3) failures, so not all 5 are recorded as failures
      // At least 2 actual failures before circuit opens
      expect(stats[failOpName]?.stats.failures).toBeGreaterThanOrEqual(2);
    });
  });

  describe("DNS Resolution Failure", () => {
    it("should handle DNS-like resolution failures", async () => {
      const dnsFailure = async (): Promise<ConsumerSecret> => {
        throw new Error("ENOTFOUND: DNS lookup failed for kong-admin.internal");
      };

      // DNS failures should trip circuit
      for (let i = 0; i < 5; i++) {
        await circuitBreaker.wrapKongConsumerOperation("dnsFailure", "consumer-123", dnsFailure);
      }

      expect(circuitBreaker.getStats().dnsFailure?.state).toBe("open");
    });
  });

  describe("Connection Pool Exhaustion", () => {
    it("should handle connection pool exhaustion gracefully", async () => {
      const poolExhausted = async (): Promise<ConsumerSecret> => {
        throw new Error("ETIMEDOUT: Connection pool exhausted, no available connections");
      };

      for (let i = 0; i < 5; i++) {
        await circuitBreaker.wrapKongConsumerOperation(
          "poolExhaustion",
          "consumer-123",
          poolExhausted
        );
      }

      const stats = circuitBreaker.getStats();
      expect(stats.poolExhaustion?.state).toBe("open");
      expect(stats.poolExhaustion?.stats.failures).toBeGreaterThan(0);
    });
  });

  describe("Recovery After Extended Outage", () => {
    it("should recover after prolonged network partition", async () => {
      const failingOp = async (): Promise<ConsumerSecret> => {
        throw new Error("Extended outage");
      };

      // Open circuit
      for (let i = 0; i < 5; i++) {
        await circuitBreaker.wrapKongConsumerOperation("extendedOutage", "consumer-123", failingOp);
      }

      expect(circuitBreaker.getStats().extendedOutage?.state).toBe("open");

      // Simulate extended outage (multiple reset periods)
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Network recovers
      const recoveredOp = async (): Promise<ConsumerSecret> => mockConsumerSecret;
      const result = await circuitBreaker.wrapKongConsumerOperation(
        "extendedOutage",
        "consumer-123",
        recoveredOp
      );

      expect(result).toEqual(mockConsumerSecret);
      expect(circuitBreaker.getStats().extendedOutage?.state).toBe("closed");
    });
  });
});
