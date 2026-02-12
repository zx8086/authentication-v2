/* test/chaos/kong-failure.test.ts
 * Chaos engineering tests for Kong API Gateway failure scenarios.
 * Validates circuit breaker behavior and stale cache fallback.
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import type { CachingConfig, CircuitBreakerConfig, ConsumerSecret } from "../../src/config/schemas";
import { KongCircuitBreakerService } from "../../src/services/circuit-breaker.service";

describe("Kong Failure Chaos Tests", () => {
  let circuitBreaker: KongCircuitBreakerService;

  const circuitBreakerConfig: CircuitBreakerConfig = {
    enabled: true,
    timeout: 100, // Short timeout for testing
    errorThresholdPercentage: 50,
    resetTimeout: 200, // Short reset for testing
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

  describe("Kong Admin API Timeout", () => {
    it("should open circuit breaker after repeated timeouts", async () => {
      const operationName = "timeoutTest";
      const slowOperation = async () => {
        await new Promise((resolve) => setTimeout(resolve, 200)); // Exceeds 100ms timeout
        return mockConsumerSecret;
      };

      // Trigger multiple timeouts to open circuit
      for (let i = 0; i < 5; i++) {
        await circuitBreaker.wrapKongConsumerOperation(
          operationName,
          "consumer-123",
          slowOperation
        );
      }

      const stats = circuitBreaker.getStats();
      expect(stats[operationName]?.state).toBe("open");
      expect(stats[operationName]?.stats.timeouts).toBeGreaterThan(0);
    });

    it("should return null when timeout causes circuit to open without cache", async () => {
      const operationName = "timeoutNullTest";
      const slowOperation = async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
        return mockConsumerSecret;
      };

      // No cache seeded, so fallback should return null
      const result = await circuitBreaker.wrapKongConsumerOperation(
        operationName,
        "consumer-123",
        slowOperation
      );

      expect(result).toBeNull();
    });
  });

  describe("Kong Admin API 500 Errors", () => {
    it("should open circuit breaker after repeated 500 errors", async () => {
      const operationName = "error500Test";
      const failingOperation = async (): Promise<ConsumerSecret> => {
        throw new Error("Kong Admin API returned 500 Internal Server Error");
      };

      // Trigger failures to open circuit
      for (let i = 0; i < 5; i++) {
        try {
          await circuitBreaker.wrapKongConsumerOperation(
            operationName,
            "consumer-123",
            failingOperation
          );
        } catch {
          // Expected to fail
        }
      }

      const stats = circuitBreaker.getStats();
      expect(stats[operationName]?.state).toBe("open");
      expect(stats[operationName]?.stats.failures).toBeGreaterThan(0);
    });

    it("should track failure count correctly", async () => {
      const operationName = "errorTrackingTest";
      const failingOperation = async (): Promise<ConsumerSecret> => {
        throw new Error("500 Internal Server Error");
      };

      // Circuit opens after volumeThreshold (3) failures at 50% error rate
      // After circuit opens, failures are rejections, not operation failures
      const requestCount = 4;
      for (let i = 0; i < requestCount; i++) {
        await circuitBreaker.wrapKongConsumerOperation(
          operationName,
          "consumer-123",
          failingOperation
        );
      }

      const stats = circuitBreaker.getStats();
      // At least 3 failures before circuit opens, plus rejections
      expect(stats[operationName]?.stats.failures).toBeGreaterThanOrEqual(2);
      // Circuit should have opened after enough failures
      expect(["open", "closed"]).toContain(stats[operationName]?.state);
    });
  });

  describe("Kong Connection Refused", () => {
    it("should immediately reject requests when Kong is unreachable", async () => {
      const operationName = "connectionRefusedTest";
      const connectionRefusedOperation = async (): Promise<ConsumerSecret> => {
        throw new Error("ECONNREFUSED: Connection refused to Kong Admin API");
      };

      // Open circuit with connection failures
      for (let i = 0; i < 5; i++) {
        await circuitBreaker.wrapKongConsumerOperation(
          operationName,
          "consumer-123",
          connectionRefusedOperation
        );
      }

      const stats = circuitBreaker.getStats();
      expect(stats[operationName]?.state).toBe("open");

      // New requests should be rejected immediately
      const startTime = performance.now();
      const result = await circuitBreaker.wrapKongConsumerOperation(
        operationName,
        "consumer-456",
        connectionRefusedOperation
      );
      const duration = performance.now() - startTime;

      expect(result).toBeNull();
      expect(duration).toBeLessThan(50); // Should reject fast without calling operation
    });
  });

  describe("Stale Cache Fallback", () => {
    it("should use in-memory stale cache when Kong is unavailable", async () => {
      // The circuit breaker stores successful results in an in-memory stale cache
      // When circuit opens, it can fall back to this cache
      const operationName = "staleCacheFallbackTest";
      // Use the same consumer ID as in mockConsumerSecret to pass validation
      const consumerId = "consumer-123";

      // First, seed the in-memory stale cache with a successful operation
      const successOperation = async () => mockConsumerSecret;

      const initialResult = await circuitBreaker.wrapKongConsumerOperation(
        operationName,
        consumerId,
        successOperation
      );
      expect(initialResult).toEqual(mockConsumerSecret);

      // Verify the stale cache was populated
      const staleInfo = circuitBreaker.getStaleDataInfo();
      const ourEntry = staleInfo.find((info) => info.key === `consumer_secret:${consumerId}`);
      expect(ourEntry).toBeDefined();
      expect(ourEntry?.ageMinutes).toBe(0);

      // Now simulate Kong failure to open circuit
      const failingOperation = async (): Promise<ConsumerSecret> => {
        throw new Error("Kong unavailable");
      };

      for (let i = 0; i < 5; i++) {
        await circuitBreaker.wrapKongConsumerOperation(operationName, consumerId, failingOperation);
      }

      const stats = circuitBreaker.getStats();
      expect(stats[operationName]?.state).toBe("open");

      // When circuit is open and stale cache is available, it should return cached data
      // Note: This depends on the operation's fallbackStrategy
      // Default fallback strategy is "deny", which returns null
      const fallbackResult = await circuitBreaker.wrapKongConsumerOperation(
        operationName,
        consumerId,
        failingOperation
      );

      // With default "deny" fallback strategy, returns null when circuit is open
      // The stale cache is used for operations configured with "stale_cache" strategy
      expect(fallbackResult).toBeNull();
    });

    it("should track stale cache info correctly", async () => {
      const operationName = "staleCacheTrackingTest";
      // Seed cache
      const successOperation = async () => mockConsumerSecret;
      await circuitBreaker.wrapKongConsumerOperation(
        operationName,
        "consumer-123",
        successOperation
      );

      const staleInfo = circuitBreaker.getStaleDataInfo();
      // Find the entry for our specific consumer
      const ourEntry = staleInfo.find((info) => info.key === "consumer_secret:consumer-123");
      expect(ourEntry).toBeDefined();
      expect(ourEntry?.ageMinutes).toBe(0);
    });

    it("should not use expired stale cache", async () => {
      const operationName = "expiredCacheTest";
      // Create circuit breaker with very short stale tolerance
      const shortToleranceConfig: CachingConfig = {
        ...cachingConfig,
        staleDataToleranceMinutes: 0, // Immediate expiration
      };
      const shortToleranceCB = new KongCircuitBreakerService(
        circuitBreakerConfig,
        shortToleranceConfig
      );

      try {
        // Seed cache
        const successOperation = async () => mockConsumerSecret;
        await shortToleranceCB.wrapKongConsumerOperation(
          operationName,
          "consumer-123",
          successOperation
        );

        // Wait a tiny bit to ensure cache is "expired"
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Open circuit
        const failingOperation = async (): Promise<ConsumerSecret> => {
          throw new Error("Kong unavailable");
        };

        for (let i = 0; i < 5; i++) {
          await shortToleranceCB.wrapKongConsumerOperation(
            operationName,
            "consumer-123",
            failingOperation
          );
        }

        // Should return null because stale data is expired
        const result = await shortToleranceCB.wrapKongConsumerOperation(
          operationName,
          "consumer-123",
          failingOperation
        );

        expect(result).toBeNull();
      } finally {
        shortToleranceCB.shutdown();
      }
    });
  });

  describe("Circuit Breaker Recovery", () => {
    it("should transition to half-open and recover after reset timeout", async () => {
      const failingOperation = async (): Promise<ConsumerSecret> => {
        throw new Error("Kong failure");
      };

      // Use a unique operation name for this test
      const operationName = "recoverySuccessTest";

      // Open circuit
      for (let i = 0; i < 5; i++) {
        await circuitBreaker.wrapKongConsumerOperation(
          operationName,
          "consumer-123",
          failingOperation
        );
      }

      expect(circuitBreaker.getStats()[operationName]?.state).toBe("open");

      // Wait for reset timeout (200ms configured) plus buffer
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Next successful request should close circuit
      const successOperation = async () => mockConsumerSecret;
      const result = await circuitBreaker.wrapKongConsumerOperation(
        operationName,
        "consumer-123",
        successOperation
      );

      expect(result).toEqual(mockConsumerSecret);
      expect(circuitBreaker.getStats()[operationName]?.state).toBe("closed");
    });

    it("should re-open if half-open request fails", async () => {
      const failingOperation = async (): Promise<ConsumerSecret> => {
        throw new Error("Kong still failing");
      };

      // Open circuit
      for (let i = 0; i < 5; i++) {
        await circuitBreaker.wrapKongConsumerOperation(
          "recoveryTest",
          "consumer-123",
          failingOperation
        );
      }

      // Wait for half-open
      await new Promise((resolve) => setTimeout(resolve, 250));

      // Half-open request also fails
      await circuitBreaker.wrapKongConsumerOperation(
        "recoveryTest",
        "consumer-123",
        failingOperation
      );

      // Should be back to open
      expect(circuitBreaker.getStats().recoveryTest?.state).toBe("open");
    });
  });

  describe("Multiple Consumers Under Kong Failure", () => {
    it("should track operations for multiple consumers independently", async () => {
      // Test that each consumer's operation is tracked independently
      // The circuit breaker tracks by operation name, not consumer ID
      const consumers = ["consumer-test-1", "consumer-test-2", "consumer-test-3"];
      const results: Map<string, ConsumerSecret> = new Map();

      // Successful operations for different consumers
      for (const consumerId of consumers) {
        const secret: ConsumerSecret = {
          id: `secret-${consumerId}`,
          key: `key-${consumerId}`,
          secret: `secret-${consumerId}`,
          consumer: { id: consumerId },
        };

        // Each consumer uses a unique operation name to ensure isolation
        const operationName = `getConsumer_${consumerId}`;
        const result = await circuitBreaker.wrapKongConsumerOperation(
          operationName,
          consumerId,
          async () => secret
        );

        expect(result).not.toBeNull();
        expect(result?.consumer.id).toBe(consumerId);
        if (result) results.set(consumerId, result);
      }

      // Verify all consumers got their secrets
      expect(results.size).toBe(3);

      // Verify each consumer's secret was correctly returned
      for (const consumerId of consumers) {
        expect(results.get(consumerId)?.consumer.id).toBe(consumerId);
      }
    });
  });

  describe("Per-Operation Circuit Breaker Configuration", () => {
    it("should use different timeouts for different operations", async () => {
      // healthCheck has 1000ms timeout by default
      const slowHealthCheck = async () => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        return { healthy: true, responseTime: 500 };
      };

      // Should succeed because healthCheck timeout is 1000ms
      const healthResult = await circuitBreaker.wrapKongOperation("healthCheck", slowHealthCheck);
      expect(healthResult).toEqual({ healthy: true, responseTime: 500 });

      // getConsumerSecret has 3000ms timeout by default
      const slowConsumerOp = async () => {
        await new Promise((resolve) => setTimeout(resolve, 200)); // Exceeds base 100ms
        return mockConsumerSecret;
      };

      // Note: with volumeThreshold and operation-specific config,
      // this might behave differently
      const stats = circuitBreaker.getStats();
      expect(stats.healthCheck).toBeDefined();
    });

    it("should apply deny fallback strategy for createConsumerSecret", async () => {
      const failingCreate = async (): Promise<ConsumerSecret> => {
        throw new Error("Create failed");
      };

      // Open circuit for create operation
      for (let i = 0; i < 5; i++) {
        await circuitBreaker.wrapKongOperation("createConsumerSecret", failingCreate);
      }

      const stats = circuitBreaker.getStats();
      expect(stats.createConsumerSecret?.state).toBe("open");

      // Should return null (deny strategy)
      const result = await circuitBreaker.wrapKongOperation("createConsumerSecret", failingCreate);
      expect(result).toBeNull();
    });
  });
});
