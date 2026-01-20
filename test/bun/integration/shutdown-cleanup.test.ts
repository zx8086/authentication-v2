/* test/bun/shutdown-cleanup.test.ts */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
// Cardinality guard module functions
import {
  getBoundedConsumerId,
  getCardinalityStats,
  getCardinalityWarningLevel,
  getHashBucketedConsumerId,
  isConsumerTrackedIndividually,
  resetCardinalityTracking,
  shutdownCardinalityGuard,
} from "../../../src/telemetry/cardinality-guard";
// Consumer volume module functions
import {
  getConsumerCountByVolume,
  getConsumerVolumeStats,
  getVolumeBucket,
  incrementConsumerRequest,
  shutdownConsumerVolume,
} from "../../../src/telemetry/consumer-volume";

// Telemetry circuit breaker module functions
import {
  CircuitBreakerState,
  getTelemetryCircuitBreakerStats,
  resetTelemetryCircuitBreakers,
  shutdownTelemetryCircuitBreakers,
  TelemetryCircuitBreaker,
} from "../../../src/telemetry/telemetry-circuit-breaker";

describe("Graceful Shutdown Functions", () => {
  describe("shutdownConsumerVolume", () => {
    beforeEach(() => {
      // Clear any previous state by calling shutdown first
      shutdownConsumerVolume();
    });

    afterEach(() => {
      // Cleanup after each test
      shutdownConsumerVolume();
    });

    it("should clear consumer volume data on shutdown", () => {
      // Add some consumer requests
      incrementConsumerRequest("consumer-1");
      incrementConsumerRequest("consumer-1");
      incrementConsumerRequest("consumer-2");

      // Verify data exists
      const statsBefore = getConsumerVolumeStats();
      expect(statsBefore.total).toBeGreaterThan(0);

      // Shutdown
      shutdownConsumerVolume();

      // Verify data is cleared
      const statsAfter = getConsumerVolumeStats();
      expect(statsAfter.total).toBe(0);
      expect(statsAfter.high).toBe(0);
      expect(statsAfter.medium).toBe(0);
      expect(statsAfter.low).toBe(0);
    });

    it("should handle multiple shutdown calls gracefully", () => {
      incrementConsumerRequest("consumer-1");

      // Multiple shutdowns should not throw
      expect(() => {
        shutdownConsumerVolume();
        shutdownConsumerVolume();
        shutdownConsumerVolume();
      }).not.toThrow();

      // State should remain clean
      const stats = getConsumerVolumeStats();
      expect(stats.total).toBe(0);
    });

    it("should not throw when called before initialization", () => {
      // First shutdown to ensure clean state
      shutdownConsumerVolume();

      // Call shutdown on already clean state
      expect(() => {
        shutdownConsumerVolume();
      }).not.toThrow();
    });

    it("should stop incrementing consumer counts after shutdown", () => {
      incrementConsumerRequest("consumer-1");
      shutdownConsumerVolume();

      // After shutdown, adding more requests should work but start fresh
      incrementConsumerRequest("consumer-2");
      const stats = getConsumerVolumeStats();
      // New request should be tracked
      expect(stats.total).toBe(1);
    });

    it("should return low volume bucket for unknown consumers after shutdown", () => {
      incrementConsumerRequest("consumer-1");
      for (let i = 0; i < 200; i++) {
        incrementConsumerRequest("consumer-1");
      }

      const volumeBefore = getVolumeBucket("consumer-1");
      expect(volumeBefore).toBe("medium");

      shutdownConsumerVolume();

      // After shutdown, consumer is unknown so returns low
      const volumeAfter = getVolumeBucket("consumer-1");
      expect(volumeAfter).toBe("low");
    });
  });

  describe("shutdownCardinalityGuard", () => {
    beforeEach(() => {
      resetCardinalityTracking();
    });

    afterEach(() => {
      shutdownCardinalityGuard();
    });

    it("should clear tracked consumers on shutdown", () => {
      // Add some consumers
      getBoundedConsumerId("consumer-1");
      getBoundedConsumerId("consumer-2");
      getBoundedConsumerId("consumer-3");

      const statsBefore = getCardinalityStats();
      expect(statsBefore.uniqueConsumersTracked).toBeGreaterThan(0);

      // Shutdown
      shutdownCardinalityGuard();

      // Consumers should no longer be individually tracked
      expect(isConsumerTrackedIndividually("consumer-1")).toBe(false);
      expect(isConsumerTrackedIndividually("consumer-2")).toBe(false);
      expect(isConsumerTrackedIndividually("consumer-3")).toBe(false);
    });

    it("should handle multiple shutdown calls gracefully", () => {
      getBoundedConsumerId("consumer-1");

      // Multiple shutdowns should not throw
      expect(() => {
        shutdownCardinalityGuard();
        shutdownCardinalityGuard();
        shutdownCardinalityGuard();
      }).not.toThrow();
    });

    it("should not throw when called before initialization", () => {
      // Clean state first
      shutdownCardinalityGuard();

      // Call shutdown on already clean state
      expect(() => {
        shutdownCardinalityGuard();
      }).not.toThrow();
    });

    it("should preserve hash bucketing functionality after shutdown", () => {
      // Hash bucketing should still work after shutdown
      shutdownCardinalityGuard();

      const bucketedId = getHashBucketedConsumerId("some-consumer");
      expect(bucketedId).toMatch(/^bucket_\d{3}$/);
    });

    it("should return ok warning level after shutdown", () => {
      // Add many consumers to trigger warning
      for (let i = 0; i < 850; i++) {
        getBoundedConsumerId(`consumer-${i}`);
      }

      const levelBefore = getCardinalityWarningLevel();
      expect(levelBefore).toBe("warning");

      shutdownCardinalityGuard();

      // After shutdown and reset, level should be ok
      resetCardinalityTracking();
      const levelAfter = getCardinalityWarningLevel();
      expect(levelAfter).toBe("ok");
    });
  });

  describe("shutdownTelemetryCircuitBreakers", () => {
    afterEach(() => {
      // Reset breakers to clean state
      resetTelemetryCircuitBreakers();
    });

    it("should shutdown all circuit breakers without throwing", () => {
      expect(() => {
        shutdownTelemetryCircuitBreakers();
      }).not.toThrow();
    });

    it("should handle multiple shutdown calls gracefully", () => {
      expect(() => {
        shutdownTelemetryCircuitBreakers();
        shutdownTelemetryCircuitBreakers();
        shutdownTelemetryCircuitBreakers();
      }).not.toThrow();
    });

    it("should not throw when called before initialization", () => {
      // Call shutdown immediately
      expect(() => {
        shutdownTelemetryCircuitBreakers();
      }).not.toThrow();
    });

    it("should preserve circuit breaker stats after shutdown", () => {
      // Get initial stats
      const statsBefore = getTelemetryCircuitBreakerStats();

      expect(statsBefore).toHaveProperty("traces");
      expect(statsBefore).toHaveProperty("metrics");
      expect(statsBefore).toHaveProperty("logs");

      shutdownTelemetryCircuitBreakers();

      // Stats should still be accessible
      const statsAfter = getTelemetryCircuitBreakerStats();
      expect(statsAfter).toHaveProperty("traces");
      expect(statsAfter).toHaveProperty("metrics");
      expect(statsAfter).toHaveProperty("logs");
    });

    it("should have all circuit breakers in closed state initially", () => {
      resetTelemetryCircuitBreakers();
      const stats = getTelemetryCircuitBreakerStats();

      expect(stats.traces.state).toBe(CircuitBreakerState.CLOSED);
      expect(stats.metrics.state).toBe(CircuitBreakerState.CLOSED);
      expect(stats.logs.state).toBe(CircuitBreakerState.CLOSED);
    });
  });

  describe("TelemetryCircuitBreaker Instance", () => {
    let testBreaker: TelemetryCircuitBreaker;

    beforeEach(() => {
      testBreaker = new TelemetryCircuitBreaker("test_operation", {
        failureThreshold: 3,
        recoveryTimeout: 1000,
        successThreshold: 2,
        monitoringInterval: 100,
      });
    });

    afterEach(() => {
      testBreaker.shutdown();
    });

    it("should shutdown individual circuit breaker cleanly", () => {
      expect(() => {
        testBreaker.shutdown();
      }).not.toThrow();
    });

    it("should handle shutdown called multiple times on same instance", () => {
      expect(() => {
        testBreaker.shutdown();
        testBreaker.shutdown();
        testBreaker.shutdown();
      }).not.toThrow();
    });

    it("should still report stats after shutdown", () => {
      testBreaker.shutdown();

      const stats = testBreaker.getStats();
      expect(stats).toHaveProperty("state");
      expect(stats).toHaveProperty("failureCount");
      expect(stats).toHaveProperty("successCount");
      expect(stats).toHaveProperty("totalRequests");
    });

    it("should maintain state after shutdown", () => {
      // Record some successes
      testBreaker.recordSuccess();
      testBreaker.recordSuccess();

      const statsBefore = testBreaker.getStats();

      testBreaker.shutdown();

      const statsAfter = testBreaker.getStats();
      expect(statsAfter.successCount).toBe(statsBefore.successCount);
    });
  });

  describe("Composite Shutdown", () => {
    beforeEach(() => {
      // Reset all modules
      resetCardinalityTracking();
      resetTelemetryCircuitBreakers();
    });

    afterEach(() => {
      shutdownConsumerVolume();
      shutdownCardinalityGuard();
      shutdownTelemetryCircuitBreakers();
    });

    it("should clean up all resources when all shutdown functions called", () => {
      // Add data to all modules
      incrementConsumerRequest("consumer-1");
      getBoundedConsumerId("consumer-1");

      // Shutdown all
      shutdownConsumerVolume();
      shutdownCardinalityGuard();
      shutdownTelemetryCircuitBreakers();

      // Verify cleanup
      expect(getConsumerVolumeStats().total).toBe(0);
      expect(isConsumerTrackedIndividually("consumer-1")).toBe(false);

      // Circuit breakers should still have stats but be clean
      const cbStats = getTelemetryCircuitBreakerStats();
      expect(cbStats).toBeDefined();
    });

    it("should handle shutdown in any order", () => {
      incrementConsumerRequest("consumer-1");
      getBoundedConsumerId("consumer-1");

      // Shutdown in different order
      expect(() => {
        shutdownTelemetryCircuitBreakers();
        shutdownConsumerVolume();
        shutdownCardinalityGuard();
      }).not.toThrow();

      // Again in another order
      incrementConsumerRequest("consumer-2");
      getBoundedConsumerId("consumer-2");

      expect(() => {
        shutdownCardinalityGuard();
        shutdownTelemetryCircuitBreakers();
        shutdownConsumerVolume();
      }).not.toThrow();
    });

    it("should allow reinitialization after shutdown", () => {
      // Shutdown all
      shutdownConsumerVolume();
      shutdownCardinalityGuard();
      shutdownTelemetryCircuitBreakers();

      // Reinitialize by using the modules
      incrementConsumerRequest("new-consumer");
      const consumerId = getBoundedConsumerId("new-consumer");

      // Verify modules are working again
      expect(getVolumeBucket("new-consumer")).toBe("low");
      expect(consumerId).toBe("new-consumer");
    });

    it("should not leak memory after complete shutdown cycle", () => {
      // Add significant data
      for (let i = 0; i < 100; i++) {
        incrementConsumerRequest(`consumer-${i}`);
        getBoundedConsumerId(`consumer-${i}`);
      }

      const statsBefore = getCardinalityStats();
      expect(statsBefore.uniqueConsumersTracked).toBe(100);

      // Complete shutdown
      shutdownConsumerVolume();
      shutdownCardinalityGuard();
      shutdownTelemetryCircuitBreakers();

      // Verify data is cleared
      expect(getConsumerVolumeStats().total).toBe(0);
    });
  });

  describe("Shutdown Under Load", () => {
    afterEach(() => {
      shutdownConsumerVolume();
      shutdownCardinalityGuard();
      shutdownTelemetryCircuitBreakers();
    });

    it("should handle shutdown with pending operations", async () => {
      // Start multiple operations
      const operations: Promise<void>[] = [];
      for (let i = 0; i < 10; i++) {
        operations.push(
          new Promise((resolve) => {
            incrementConsumerRequest(`consumer-${i}`);
            getBoundedConsumerId(`consumer-${i}`);
            resolve();
          })
        );
      }

      // Shutdown while operations might be pending
      expect(() => {
        shutdownConsumerVolume();
        shutdownCardinalityGuard();
        shutdownTelemetryCircuitBreakers();
      }).not.toThrow();

      // Wait for operations to complete
      await Promise.all(operations);
    });

    it("should not cause data corruption during shutdown", () => {
      // Add some data
      for (let i = 0; i < 50; i++) {
        incrementConsumerRequest(`consumer-${i}`);
      }

      // Shutdown
      shutdownConsumerVolume();

      // Verify no corruption - stats should be clean zeros
      const stats = getConsumerVolumeStats();
      expect(stats.total).toBe(0);
      expect(stats.high).toBe(0);
      expect(stats.medium).toBe(0);
      expect(stats.low).toBe(0);
    });

    it("should handle rapid shutdown and reinitialize cycles", () => {
      for (let cycle = 0; cycle < 5; cycle++) {
        // Add data
        incrementConsumerRequest(`consumer-cycle-${cycle}`);
        getBoundedConsumerId(`consumer-cycle-${cycle}`);

        // Shutdown
        shutdownConsumerVolume();
        shutdownCardinalityGuard();

        // Verify clean state
        expect(getConsumerVolumeStats().total).toBe(0);
      }
    });
  });

  describe("Volume Classification Persistence", () => {
    afterEach(() => {
      shutdownConsumerVolume();
    });

    it("should reset volume classification after shutdown", () => {
      // Create a high-volume consumer
      for (let i = 0; i < 5100; i++) {
        incrementConsumerRequest("high-volume-consumer");
      }

      expect(getVolumeBucket("high-volume-consumer")).toBe("high");
      expect(getConsumerCountByVolume("high")).toBe(1);

      shutdownConsumerVolume();

      // After shutdown, consumer is unknown (low)
      expect(getVolumeBucket("high-volume-consumer")).toBe("low");
      expect(getConsumerCountByVolume("high")).toBe(0);
    });
  });
});
