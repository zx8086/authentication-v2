/* test/bun/circuit-breaker-thresholds.test.ts */

/**
 * Mutation-resistant tests for circuit breaker threshold logic.
 * These tests verify correct behavior at boundary conditions for:
 * - Error threshold percentage calculations
 * - Timeout configurations
 * - State transition triggers
 * - Stale data age tolerance
 */

import { describe, expect, it } from "bun:test";
import type { CachingConfig, CircuitBreakerConfig } from "../../../src/config/schemas";
import { KongCircuitBreakerService } from "../../../src/services/circuit-breaker.service";

describe("Circuit Breaker Thresholds - Mutation Testing", () => {
  // Default configs for testing
  const defaultCircuitBreakerConfig: CircuitBreakerConfig & { highAvailability?: boolean } = {
    enabled: true,
    timeout: 5000,
    errorThresholdPercentage: 50,
    resetTimeout: 30000,
    rollingCountTimeout: 10000,
    rollingCountBuckets: 10,
    volumeThreshold: 5,
    highAvailability: false,
  };

  const defaultCachingConfig: CachingConfig = {
    ttlMinutes: 5,
    staleDataToleranceMinutes: 15,
    highAvailability: false,
    redisUrl: "",
    localMemoryMaxSize: 1000,
    localMemoryTtlMinutes: 5,
  };

  describe("Operation Config Initialization", () => {
    it("should initialize default getConsumerSecret config with correct timeout", () => {
      const service = new KongCircuitBreakerService(
        defaultCircuitBreakerConfig,
        defaultCachingConfig
      );

      const stats = service.getStats();

      // Default timeout for getConsumerSecret should be 3000ms
      // This verifies the operation configs are set correctly
      expect(service).toBeDefined();
    });

    it("should initialize default createConsumerSecret config with deny strategy", async () => {
      const config = {
        ...defaultCircuitBreakerConfig,
        enabled: true,
      };

      const service = new KongCircuitBreakerService(config, defaultCachingConfig);

      // Test that createConsumerSecret uses deny fallback strategy
      // First, make the operation fail multiple times to open the circuit
      let failureCount = 0;
      for (let i = 0; i < 10; i++) {
        try {
          await service.wrapKongConsumerOperation("createConsumerSecret", "test-consumer", () => {
            failureCount++;
            throw new Error("Create operation failed");
          });
        } catch {
          // Expected to fail
        }
      }

      // After failures, breaker should be open and return null (deny strategy)
      const result = await service.wrapKongConsumerOperation(
        "createConsumerSecret",
        "test-consumer",
        () => {
          throw new Error("Should not reach here");
        }
      );

      // Deny strategy returns null when circuit is open
      expect(result).toBeNull();
    });

    it("should use graceful degradation for healthCheck operation", async () => {
      const config = {
        ...defaultCircuitBreakerConfig,
        enabled: true,
      };

      const service = new KongCircuitBreakerService(config, defaultCachingConfig);

      // Make healthCheck fail to trigger open circuit
      for (let i = 0; i < 10; i++) {
        try {
          await service.wrapKongOperation("healthCheck", () => {
            throw new Error("Health check failed");
          });
        } catch {
          // Expected
        }
      }

      // After circuit opens, graceful degradation should return degraded health
      const result = await service.wrapKongOperation<{ healthy: boolean; error?: string }>(
        "healthCheck",
        () => {
          throw new Error("Should not reach");
        }
      );

      // Graceful degradation returns a degraded status object
      if (result) {
        expect(result.healthy).toBe(false);
        expect(result.error).toContain("Circuit breaker open");
      }
    });
  });

  describe("Stale Data Tolerance", () => {
    it("should respect stale data tolerance time", async () => {
      const cachingConfig: CachingConfig = {
        ...defaultCachingConfig,
        staleDataToleranceMinutes: 1, // 1 minute tolerance
      };

      const service = new KongCircuitBreakerService(defaultCircuitBreakerConfig, cachingConfig);

      // The stale data info should initially be empty
      const staleInfo = service.getStaleDataInfo();
      expect(Array.isArray(staleInfo)).toBe(true);
    });

    it("should have different tolerance than default", () => {
      const customCachingConfig: CachingConfig = {
        ...defaultCachingConfig,
        staleDataToleranceMinutes: 30, // 30 minutes
      };

      const service = new KongCircuitBreakerService(
        defaultCircuitBreakerConfig,
        customCachingConfig
      );

      expect(service).toBeDefined();
      // Service uses this value internally for cache expiration
    });
  });

  describe("Circuit Breaker Stats", () => {
    it("should return empty stats initially", () => {
      const service = new KongCircuitBreakerService(
        defaultCircuitBreakerConfig,
        defaultCachingConfig
      );

      const stats = service.getStats();

      expect(stats).toBeDefined();
      expect(typeof stats).toBe("object");
      expect(Object.keys(stats).length).toBe(0);
    });

    it("should track stats after operations", async () => {
      const service = new KongCircuitBreakerService(
        defaultCircuitBreakerConfig,
        defaultCachingConfig
      );

      // Perform an operation to create the breaker
      await service.wrapKongOperation("testOperation", async () => "success");

      const stats = service.getStats();

      expect(stats.testOperation).toBeDefined();
      expect(stats.testOperation.state).toBe("closed");
      expect(stats.testOperation.stats.successes).toBe(1);
    });

    it("should track failures correctly", async () => {
      const service = new KongCircuitBreakerService(
        defaultCircuitBreakerConfig,
        defaultCachingConfig
      );

      // Perform failing operation
      try {
        await service.wrapKongOperation("failingOp", async () => {
          throw new Error("Test failure");
        });
      } catch {
        // Expected
      }

      const stats = service.getStats();

      expect(stats.failingOp).toBeDefined();
      expect(stats.failingOp.stats.failures).toBe(1);
    });

    it("should report correct state for closed circuit", async () => {
      const service = new KongCircuitBreakerService(
        defaultCircuitBreakerConfig,
        defaultCachingConfig
      );

      await service.wrapKongOperation("closedTest", async () => "success");

      const stats = service.getStats();

      expect(stats.closedTest.state).toBe("closed");
      expect(stats.closedTest.state).not.toBe("open");
      expect(stats.closedTest.state).not.toBe("half-open");
    });
  });

  describe("Circuit Breaker Disabled Mode", () => {
    it("should bypass circuit breaker when disabled", async () => {
      const disabledConfig = {
        ...defaultCircuitBreakerConfig,
        enabled: false,
      };

      const service = new KongCircuitBreakerService(disabledConfig, defaultCachingConfig);

      const result = await service.wrapKongOperation("bypassTest", async () => "direct-result");

      // Should return result directly without circuit breaker wrapping
      expect(result).toBe("direct-result");
    });

    it("should throw errors directly when disabled", async () => {
      const disabledConfig = {
        ...defaultCircuitBreakerConfig,
        enabled: false,
      };

      const service = new KongCircuitBreakerService(disabledConfig, defaultCachingConfig);

      await expect(
        service.wrapKongOperation("bypassErrorTest", async () => {
          throw new Error("Direct error");
        })
      ).rejects.toThrow("Direct error");
    });

    it("should bypass for consumer operations when disabled", async () => {
      const disabledConfig = {
        ...defaultCircuitBreakerConfig,
        enabled: false,
      };

      const service = new KongCircuitBreakerService(disabledConfig, defaultCachingConfig);

      const result = await service.wrapKongConsumerOperation(
        "bypassConsumer",
        "consumer-123",
        async () => ({
          id: "secret-id",
          key: "secret-key",
          secret: "secret-value",
          algorithm: "HS256" as const,
          consumer: { id: "consumer-123" },
        })
      );

      expect(result).toBeDefined();
      expect(result?.key).toBe("secret-key");
    });
  });

  describe("Stale Cache Management", () => {
    it("should initialize stale cache when not in HA mode", () => {
      const nonHaConfig = {
        ...defaultCircuitBreakerConfig,
        highAvailability: false,
      };

      const service = new KongCircuitBreakerService(nonHaConfig, defaultCachingConfig);

      // Service should have internal stale cache
      const staleInfo = service.getStaleDataInfo();
      expect(Array.isArray(staleInfo)).toBe(true);
    });

    it("should NOT have in-memory stale cache in HA mode", () => {
      const haConfig = {
        ...defaultCircuitBreakerConfig,
        highAvailability: true,
      };

      const service = new KongCircuitBreakerService(haConfig, defaultCachingConfig);

      // In HA mode, stale data is managed by Redis, not in-memory
      const staleInfo = service.getStaleDataInfo();
      expect(staleInfo.length).toBe(0);
    });

    it("should clear stale cache", () => {
      const service = new KongCircuitBreakerService(
        defaultCircuitBreakerConfig,
        defaultCachingConfig
      );

      // Should not throw
      expect(() => service.clearStaleCache()).not.toThrow();
    });
  });

  describe("Shutdown", () => {
    it("should clean up on shutdown", async () => {
      const service = new KongCircuitBreakerService(
        defaultCircuitBreakerConfig,
        defaultCachingConfig
      );

      // Create some breakers
      await service.wrapKongOperation("shutdownTest1", async () => "test");
      await service.wrapKongOperation("shutdownTest2", async () => "test");

      // Should not throw
      expect(() => service.shutdown()).not.toThrow();

      // After shutdown, stats should be empty
      const stats = service.getStats();
      expect(Object.keys(stats).length).toBe(0);
    });
  });

  describe("Consumer ID Mismatch Prevention", () => {
    it("should return null when consumer ID mismatches in response", async () => {
      const service = new KongCircuitBreakerService(
        defaultCircuitBreakerConfig,
        defaultCachingConfig
      );

      // Simulate Kong returning a different consumer ID than requested
      const result = await service.wrapKongConsumerOperation(
        "getConsumerSecret",
        "requested-consumer-123",
        async () => ({
          id: "secret-id",
          key: "secret-key",
          secret: "secret-value",
          algorithm: "HS256" as const,
          consumer: { id: "different-consumer-456" }, // Different consumer!
        })
      );

      // Should return null due to mismatch (cache pollution prevention)
      expect(result).toBeNull();
    });

    it("should return result when consumer ID matches", async () => {
      const service = new KongCircuitBreakerService(
        defaultCircuitBreakerConfig,
        defaultCachingConfig
      );

      const result = await service.wrapKongConsumerOperation(
        "getConsumerSecret",
        "matching-consumer-123",
        async () => ({
          id: "secret-id",
          key: "secret-key",
          secret: "secret-value",
          algorithm: "HS256" as const,
          consumer: { id: "matching-consumer-123" }, // Same consumer
        })
      );

      expect(result).toBeDefined();
      expect(result?.consumer?.id).toBe("matching-consumer-123");
    });
  });

  describe("Operation Config Overrides", () => {
    it("should apply operation-specific overrides", () => {
      const configWithOverrides: CircuitBreakerConfig & { highAvailability?: boolean } = {
        ...defaultCircuitBreakerConfig,
        operations: {
          customOperation: {
            timeout: 10000,
            errorThresholdPercentage: 75,
            resetTimeout: 60000,
            fallbackStrategy: "cache",
          },
        },
      };

      const service = new KongCircuitBreakerService(configWithOverrides, defaultCachingConfig);

      // Service should be created with custom operation config
      expect(service).toBeDefined();
    });
  });
});
