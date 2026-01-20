/* test/bun/cardinality-guard.test.ts */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import {
  getBoundedConsumerId,
  getCardinalityStats,
  getCardinalityWarningLevel,
  getHashBucketedConsumerId,
  isConsumerTrackedIndividually,
  resetCardinalityTracking,
} from "../../../src/telemetry/cardinality-guard";

describe("cardinality-guard", () => {
  beforeEach(() => {
    // Reset tracking before each test
    resetCardinalityTracking();
  });

  afterEach(() => {
    // Clean up after each test
    resetCardinalityTracking();
  });

  describe("getBoundedConsumerId", () => {
    it("should return 'unknown' for empty consumer ID", () => {
      expect(getBoundedConsumerId("")).toBe("unknown");
    });

    it("should track consumer IDs individually when under limit", () => {
      const consumerId = "consumer-123";
      const result = getBoundedConsumerId(consumerId);

      expect(result).toBe(consumerId);
      expect(isConsumerTrackedIndividually(consumerId)).toBe(true);
    });

    it("should return same ID for previously tracked consumers", () => {
      const consumerId = "consumer-456";

      // First call tracks it
      const first = getBoundedConsumerId(consumerId);
      // Second call should return same
      const second = getBoundedConsumerId(consumerId);

      expect(first).toBe(consumerId);
      expect(second).toBe(consumerId);
    });

    it("should use bucketing when cardinality limit is exceeded", () => {
      // Track 1000 unique consumers to hit the limit
      for (let i = 0; i < 1000; i++) {
        getBoundedConsumerId(`consumer-${i}`);
      }

      // The next consumer should be bucketed
      const newConsumer = getBoundedConsumerId("new-consumer-after-limit");

      expect(newConsumer).toMatch(/^bucket_\d{3}$/);
      expect(isConsumerTrackedIndividually("new-consumer-after-limit")).toBe(false);
    });

    it("should continue tracking already-known consumers after limit", () => {
      // Track some consumers
      getBoundedConsumerId("known-consumer-1");
      getBoundedConsumerId("known-consumer-2");

      // Fill up to limit with other consumers
      for (let i = 0; i < 998; i++) {
        getBoundedConsumerId(`filler-${i}`);
      }

      // Known consumers should still be tracked individually
      expect(getBoundedConsumerId("known-consumer-1")).toBe("known-consumer-1");
      expect(getBoundedConsumerId("known-consumer-2")).toBe("known-consumer-2");
    });

    it("should produce consistent bucket assignments for same consumer ID", () => {
      // Fill to limit
      for (let i = 0; i < 1000; i++) {
        getBoundedConsumerId(`consumer-${i}`);
      }

      // Same ID should always hash to same bucket
      const id = "consistent-test-id";
      const first = getBoundedConsumerId(id);
      const second = getBoundedConsumerId(id);

      expect(first).toBe(second);
      expect(first).toMatch(/^bucket_\d{3}$/);
    });
  });

  describe("getHashBucketedConsumerId", () => {
    it("should return 'bucket_unknown' for empty consumer ID", () => {
      expect(getHashBucketedConsumerId("")).toBe("bucket_unknown");
    });

    it("should always return bucketed ID", () => {
      const result = getHashBucketedConsumerId("any-consumer-id");

      expect(result).toMatch(/^bucket_\d{3}$/);
    });

    it("should produce consistent bucket for same ID", () => {
      const id = "test-consumer";
      const first = getHashBucketedConsumerId(id);
      const second = getHashBucketedConsumerId(id);

      expect(first).toBe(second);
    });

    it("should distribute different IDs across buckets", () => {
      const buckets = new Set<string>();

      // Generate many different IDs
      for (let i = 0; i < 1000; i++) {
        buckets.add(getHashBucketedConsumerId(`unique-id-${i}`));
      }

      // Should have reasonable distribution (not all same bucket)
      // With 256 buckets and 1000 IDs, we expect good distribution
      expect(buckets.size).toBeGreaterThan(50);
      expect(buckets.size).toBeLessThanOrEqual(256); // Cannot exceed total bucket count
    });
  });

  describe("isConsumerTrackedIndividually", () => {
    it("should return false for untracked consumer", () => {
      expect(isConsumerTrackedIndividually("unknown-consumer")).toBe(false);
    });

    it("should return true for tracked consumer", () => {
      const consumerId = "tracked-consumer";
      getBoundedConsumerId(consumerId);

      expect(isConsumerTrackedIndividually(consumerId)).toBe(true);
    });
  });

  describe("getCardinalityStats", () => {
    it("should return initial stats", () => {
      const stats = getCardinalityStats();

      expect(stats.uniqueConsumersTracked).toBe(0);
      expect(stats.maxUniqueConsumers).toBe(1000);
      expect(stats.usagePercent).toBe(0);
      expect(stats.limitExceeded).toBe(false);
      expect(stats.limitExceededAt).toBeNull();
      expect(stats.bucketsUsed).toBe(0);
      expect(stats.totalBuckets).toBe(256);
    });

    it("should update stats as consumers are tracked", () => {
      getBoundedConsumerId("consumer-1");
      getBoundedConsumerId("consumer-2");
      getBoundedConsumerId("consumer-3");

      const stats = getCardinalityStats();

      expect(stats.uniqueConsumersTracked).toBe(3);
      expect(stats.usagePercent).toBe(0.3);
      expect(stats.totalRequests).toBe(3);
    });

    it("should track when limit is exceeded", () => {
      // Fill to limit
      for (let i = 0; i < 1000; i++) {
        getBoundedConsumerId(`consumer-${i}`);
      }

      // Exceed limit
      getBoundedConsumerId("overflow-consumer");

      const stats = getCardinalityStats();

      expect(stats.limitExceeded).toBe(true);
      expect(stats.limitExceededAt).not.toBeNull();
      expect(stats.bucketsUsed).toBeGreaterThan(0);
      expect(stats.bucketsUsed).toBeLessThanOrEqual(256); // Cannot exceed total bucket count
    });
  });

  describe("getCardinalityWarningLevel", () => {
    it("should return 'ok' when well under limit", () => {
      // Add a few consumers
      for (let i = 0; i < 100; i++) {
        getBoundedConsumerId(`consumer-${i}`);
      }

      expect(getCardinalityWarningLevel()).toBe("ok");
    });

    it("should return 'warning' when approaching limit", () => {
      // Add 80% of limit
      for (let i = 0; i < 800; i++) {
        getBoundedConsumerId(`consumer-${i}`);
      }

      expect(getCardinalityWarningLevel()).toBe("warning");
    });

    it("should return 'critical' when limit exceeded", () => {
      // Fill and exceed limit
      for (let i = 0; i < 1001; i++) {
        getBoundedConsumerId(`consumer-${i}`);
      }

      expect(getCardinalityWarningLevel()).toBe("critical");
    });
  });

  describe("resetCardinalityTracking", () => {
    it("should clear all tracked consumers", () => {
      // Track some consumers
      getBoundedConsumerId("consumer-1");
      getBoundedConsumerId("consumer-2");

      expect(isConsumerTrackedIndividually("consumer-1")).toBe(true);

      // Reset
      resetCardinalityTracking();

      expect(isConsumerTrackedIndividually("consumer-1")).toBe(false);
      expect(getCardinalityStats().uniqueConsumersTracked).toBe(0);
    });

    it("should reset limit exceeded state", () => {
      // Fill and exceed limit
      for (let i = 0; i < 1001; i++) {
        getBoundedConsumerId(`consumer-${i}`);
      }

      expect(getCardinalityStats().limitExceeded).toBe(true);

      // Reset
      resetCardinalityTracking();

      expect(getCardinalityStats().limitExceeded).toBe(false);
    });
  });

  describe("hash distribution", () => {
    it("should distribute similar IDs to different buckets", () => {
      const buckets = new Map<string, number>();

      // Test similar IDs
      const similarIds = ["user-001", "user-002", "user-003", "user-010", "user-100"];

      for (const id of similarIds) {
        const bucket = getHashBucketedConsumerId(id);
        buckets.set(id, Number.parseInt(bucket.replace("bucket_", ""), 10));
      }

      // Check that not all went to same bucket
      const uniqueBuckets = new Set(buckets.values());
      expect(uniqueBuckets.size).toBeGreaterThan(1);
      expect(uniqueBuckets.size).toBeLessThanOrEqual(5); // 5 similar IDs should go to at most 5 buckets
    });
  });

  describe("shutdownCardinalityGuard", () => {
    it("should shutdown gracefully without errors", async () => {
      const { shutdownCardinalityGuard } = await import("../../../src/telemetry/cardinality-guard");

      expect(() => shutdownCardinalityGuard()).not.toThrow();
    });

    it("should clear tracked data on shutdown", async () => {
      const { shutdownCardinalityGuard, getBoundedConsumerId, isConsumerTrackedIndividually } =
        await import("../../../src/telemetry/cardinality-guard");

      getBoundedConsumerId("test-consumer-1");
      getBoundedConsumerId("test-consumer-2");

      expect(isConsumerTrackedIndividually("test-consumer-1")).toBe(true);

      shutdownCardinalityGuard();

      expect(isConsumerTrackedIndividually("test-consumer-1")).toBe(false);
    });

    it("should handle multiple shutdown calls", async () => {
      const { shutdownCardinalityGuard } = await import("../../../src/telemetry/cardinality-guard");

      shutdownCardinalityGuard();
      shutdownCardinalityGuard();
      shutdownCardinalityGuard();
    });
  });
});
