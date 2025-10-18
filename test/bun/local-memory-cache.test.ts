/* test/bun/local-memory-cache.test.ts */

import { beforeEach, describe, expect, it, test } from "bun:test";
import type { ConsumerSecret } from "../../src/config/schemas";
import { LocalMemoryCache } from "../../src/services/cache/local-memory-cache";
import { TestConsumerSecretFactory, TestScenarios } from "../shared/test-consumer-secrets";

describe("LocalMemoryCache", () => {
  let cache: LocalMemoryCache;
  const testConfig = { ttlSeconds: 300, maxEntries: 1000 };

  beforeEach(() => {
    cache = new LocalMemoryCache(testConfig);
  });

  describe("Basic Cache Operations", () => {
    it("should initialize with correct configuration", () => {
      expect(cache).toBeInstanceOf(LocalMemoryCache);
    });

    test.concurrent("should store and retrieve values", async () => {
      const key = "test-consumer-1";
      const secret: ConsumerSecret = TestConsumerSecretFactory.createNew({
        idPrefix: "test-jwt-credential-1",
        consumerIdPrefix: "test-consumer-1",
        deterministic: true
      });

      await cache.set(key, secret);
      const retrieved = await cache.get(key);

      expect(retrieved).toEqual(secret);
    });

    test.concurrent("should return null for non-existent keys", async () => {
      const result = await cache.get("non-existent-key");
      expect(result).toBeNull();
    });

    test.concurrent("should handle multiple concurrent operations", async () => {
      const operations: Promise<void>[] = [];
      const testData: Array<{ key: string; secret: ConsumerSecret }> = [];

      // Create test data
      for (let i = 0; i < 50; i++) {
        testData.push({
          key: `concurrent-consumer-${i}`,
          secret: TestScenarios.CONCURRENCY(i),
        });
      }

      // Set operations
      testData.forEach((data) => {
        operations.push(cache.set(data.key, data.secret));
      });

      await Promise.all(operations);

      // Verify all data was stored correctly
      const verificationPromises = testData.map(async (data) => {
        const retrieved = await cache.get(data.key);
        expect(retrieved).toEqual(data.secret);
      });

      await Promise.all(verificationPromises);
    });
  });

  describe("TTL (Time To Live) Functionality", () => {
    it("should respect default TTL configuration", async () => {
      const key = "ttl-test-default";
      const secret: ConsumerSecret = TestConsumerSecretFactory.createForTTL("default");

      await cache.set(key, secret);

      // Should be available immediately
      const immediate = await cache.get(key);
      expect(immediate).toEqual(secret);
    });

    it("should respect custom TTL values", async () => {
      const key = "custom-ttl-test";
      const secret: ConsumerSecret = TestScenarios.CUSTOM_TTL();

      const customTtl = 1; // 1 second
      await cache.set(key, secret, customTtl);

      // Should be available immediately
      const immediate = await cache.get(key);
      expect(immediate).toEqual(secret);

      // Wait for TTL to expire
      return new Promise((resolve) => {
        setTimeout(async () => {
          const expired = await cache.get(key);
          expect(expired).toBeNull();
          resolve();
        }, 1100); // Wait slightly longer than TTL
      });
    });

    it("should handle expired entries correctly", async () => {
      const shortTtlCache = new LocalMemoryCache({ ttlSeconds: 1, maxEntries: 100 });

      const key = "expire-test";
      const secret: ConsumerSecret = TestScenarios.EXPIRE_TEST();

      await shortTtlCache.set(key, secret);

      return new Promise((resolve) => {
        setTimeout(async () => {
          const result = await shortTtlCache.get(key);
          expect(result).toBeNull();

          // Verify expired entry was cleaned up
          const stats = await shortTtlCache.getStats();
          expect(stats.activeEntries).toBe(0);
          resolve();
        }, 1100);
      });
    });
  });

  describe("Delete and Clear Operations", () => {
    it("should delete individual entries", async () => {
      const key = "delete-test";
      const secret: ConsumerSecret = TestScenarios.DELETE_TEST();

      await cache.set(key, secret);
      expect(await cache.get(key)).toEqual(secret);

      await cache.delete(key);
      expect(await cache.get(key)).toBeNull();
    });

    it("should clear all entries", async () => {
      const entries = [
        { key: "clear-test-1", secret: TestConsumerSecretFactory.createWithId("clear-1") },
        { key: "clear-test-2", secret: TestConsumerSecretFactory.createWithId("clear-2") },
        { key: "clear-test-3", secret: TestConsumerSecretFactory.createWithId("clear-3") },
      ];

      // Set multiple entries
      await Promise.all(entries.map((entry) => cache.set(entry.key, entry.secret)));

      // Verify entries exist
      for (const entry of entries) {
        expect(await cache.get(entry.key)).toEqual(entry.secret);
      }

      // Clear all
      await cache.clear();

      // Verify all entries are gone
      for (const entry of entries) {
        expect(await cache.get(entry.key)).toBeNull();
      }

      const stats = await cache.getStats();
      expect(stats.size).toBe(0);
      expect(stats.activeEntries).toBe(0);
    });

    it("should handle delete operations on non-existent keys", async () => {
      await expect(cache.delete("non-existent-key")).resolves.toBeUndefined();
    });
  });

  describe("Statistics and Performance Monitoring", () => {
    it("should track hit and miss statistics", async () => {
      const key = "stats-test";
      const secret: ConsumerSecret = TestScenarios.STATS_TEST();

      // Record miss
      await cache.get(key);

      // Record hit
      await cache.set(key, secret);
      await cache.get(key);

      const stats = await cache.getStats();
      expect(stats.strategy).toBe("local-memory");
      expect(parseFloat(stats.hitRate)).toBeGreaterThan(0);
      expect(stats.averageLatencyMs).toBeGreaterThanOrEqual(0);
    });

    it("should calculate hit rate correctly", async () => {
      const testData = [
        { key: "hit-rate-1", secret: TestConsumerSecretFactory.createWithId("hit-rate-1") },
        { key: "hit-rate-2", secret: TestConsumerSecretFactory.createWithId("hit-rate-2") },
      ];

      // Set up data
      await Promise.all(testData.map((data) => cache.set(data.key, data.secret)));

      // Generate hits
      await cache.get(testData[0].key);
      await cache.get(testData[1].key);

      // Generate misses
      await cache.get("non-existent-1");
      await cache.get("non-existent-2");

      const stats = await cache.getStats();
      const expectedHitRate = "50.00"; // 2 hits out of 4 total operations
      expect(stats.hitRate).toBe(expectedHitRate);
    });

    it("should provide accurate cache size information", async () => {
      const initialStats = await cache.getStats();
      expect(initialStats.size).toBe(0);
      expect(initialStats.activeEntries).toBe(0);

      // Add entries
      const numEntries = 10;
      for (let i = 0; i < numEntries; i++) {
        await cache.set(`size-test-${i}`, TestConsumerSecretFactory.createWithId(`size-${i}`));
      }

      const finalStats = await cache.getStats();
      expect(finalStats.size).toBe(numEntries);
      expect(finalStats.activeEntries).toBe(numEntries);
      expect(finalStats.entries).toHaveLength(numEntries);
    });

    it("should track latency accurately", async () => {
      const key = "latency-test";
      const secret: ConsumerSecret = TestScenarios.LATENCY_TEST();

      await cache.set(key, secret);

      // Perform operations to generate latency data
      for (let i = 0; i < 10; i++) {
        await cache.get(key);
      }

      const stats = await cache.getStats();
      expect(stats.averageLatencyMs).toBeGreaterThan(0);
      expect(stats.averageLatencyMs).toBeLessThan(100); // Should be very fast for memory cache
    });
  });

  describe("Memory Management and Limits", () => {
    it("should enforce maximum entries limit", async () => {
      const smallCache = new LocalMemoryCache({ ttlSeconds: 300, maxEntries: 5 });

      // Add more entries than the limit
      for (let i = 0; i < 10; i++) {
        await smallCache.set(`limit-test-${i}`, TestConsumerSecretFactory.createWithId(`limit-${i}`));
      }

      const stats = await smallCache.getStats();
      expect(stats.size).toBeLessThanOrEqual(5);
      expect(stats.activeEntries).toBeLessThanOrEqual(5);
    });

    it("should evict oldest entries when limit is exceeded", async () => {
      const smallCache = new LocalMemoryCache({ ttlSeconds: 300, maxEntries: 3 });

      const entries = [
        { key: "evict-1", secret: TestConsumerSecretFactory.createWithId("evict-1") },
        { key: "evict-2", secret: TestConsumerSecretFactory.createWithId("evict-2") },
        { key: "evict-3", secret: TestConsumerSecretFactory.createWithId("evict-3") },
        { key: "evict-4", secret: TestConsumerSecretFactory.createWithId("evict-4") },
      ];

      // Add entries sequentially
      for (const entry of entries) {
        await smallCache.set(entry.key, entry.secret);
        // Small delay to ensure creation time ordering
        await new Promise(resolve => setTimeout(resolve, 1));
      }

      // First entry should be evicted
      expect(await smallCache.get("evict-1")).toBeNull();

      // Newer entries should still exist
      expect(await smallCache.get("evict-2")).toEqual(entries[1].secret);
      expect(await smallCache.get("evict-3")).toEqual(entries[2].secret);
      expect(await smallCache.get("evict-4")).toEqual(entries[3].secret);
    });

    it("should provide memory usage estimates", async () => {
      const stats = await cache.getStats();
      expect(stats.memoryUsageMB).toBeGreaterThanOrEqual(0);

      // Add some data
      for (let i = 0; i < 100; i++) {
        await cache.set(`memory-${i}`, TestConsumerSecretFactory.createWithId(`memory-${i}`));
      }

      const statsWithData = await cache.getStats();
      expect(typeof statsWithData.memoryUsageMB).toBe("number");
      expect(statsWithData.memoryUsageMB).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle empty string keys", async () => {
      const secret: ConsumerSecret = TestConsumerSecretFactory.createWithId("empty-key");

      await cache.set("", secret);
      const retrieved = await cache.get("");
      expect(retrieved).toEqual(secret);

      await cache.delete("");
      expect(await cache.get("")).toBeNull();
    });

    it("should handle special characters in keys", async () => {
      const specialKeys = [
        "key-with-dashes",
        "key_with_underscores",
        "key.with.dots",
        "key@with@symbols",
        "key/with/slashes",
        "key with spaces",
        "key\\with\\backslashes",
      ];

      const secret: ConsumerSecret = TestScenarios.SPECIAL_CHARS();

      for (const key of specialKeys) {
        await cache.set(key, secret);
        const retrieved = await cache.get(key);
        expect(retrieved).toEqual(secret);
      }
    });

    it("should handle very long keys", async () => {
      const longKey = "very-long-key-".repeat(100);
      const secret: ConsumerSecret = TestConsumerSecretFactory.createWithId("long-key");

      await cache.set(longKey, secret);
      const retrieved = await cache.get(longKey);
      expect(retrieved).toEqual(secret);
    });

    it("should handle zero TTL values", async () => {
      const key = "zero-ttl-test";
      const secret: ConsumerSecret = TestScenarios.ZERO_TTL();

      await cache.set(key, secret, 0);

      // Zero TTL falls back to default TTL due to `ttlSeconds || this.config.ttlSeconds`
      // So the entry should still be valid
      const result = await cache.get(key);
      expect(result).toEqual(secret);
    });

    it("should handle negative TTL values gracefully", async () => {
      const key = "negative-ttl-test";
      const secret: ConsumerSecret = TestScenarios.NEGATIVE_TTL();

      await cache.set(key, secret, -1);

      // Should expire immediately
      const result = await cache.get(key);
      expect(result).toBeNull();
    });
  });

  describe("Performance and Scalability", () => {
    it("should handle high-volume operations efficiently", async () => {
      const numOperations = 1000;
      const startTime = performance.now();

      // Perform many set operations
      const setPromises: Promise<void>[] = [];
      for (let i = 0; i < numOperations; i++) {
        setPromises.push(
          cache.set(`perf-test-${i}`, TestScenarios.PERFORMANCE(i))
        );
      }

      await Promise.all(setPromises);

      // Perform many get operations
      const getPromises: Promise<ConsumerSecret | null>[] = [];
      for (let i = 0; i < numOperations; i++) {
        getPromises.push(cache.get(`perf-test-${i}`));
      }

      const results = await Promise.all(getPromises);
      const endTime = performance.now();

      // Verify all operations completed
      expect(results).toHaveLength(numOperations);
      expect(results.every((result) => result !== null)).toBe(true);

      // Performance should be reasonable (less than 1 second for 1000 operations)
      const executionTime = endTime - startTime;
      expect(executionTime).toBeLessThan(1000);

      const stats = await cache.getStats();
      expect(stats.size).toBeLessThanOrEqual(numOperations);
      expect(stats.averageLatencyMs).toBeGreaterThan(0);
    });

    it("should maintain performance under mixed workloads", async () => {
      const operations: Promise<any>[] = [];

      // Mix of set, get, delete operations
      for (let i = 0; i < 200; i++) {
        const key = `mixed-${i}`;
        const secret: ConsumerSecret = TestConsumerSecretFactory.createWithId(`mixed-${i}`);

        operations.push(cache.set(key, secret));
        operations.push(cache.get(key));

        if (i % 10 === 0) {
          operations.push(cache.delete(key));
        }
      }

      const startTime = performance.now();
      await Promise.all(operations);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(500); // Should complete quickly

      const stats = await cache.getStats();
      expect(stats.averageLatencyMs).toBeGreaterThan(0);
      expect(parseFloat(stats.hitRate)).toBeGreaterThan(0);
    });
  });
});