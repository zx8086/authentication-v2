/* test/bun/local-memory-cache-maxentries.test.ts */

/**
 * Tests for LocalMemoryCache max entries enforcement
 */

import { describe, expect, it } from "bun:test";
import { LocalMemoryCache } from "../../../src/services/cache/local-memory-cache";

describe("LocalMemoryCache Max Entries", () => {
  it("should enforce max entries limit and evict oldest", async () => {
    const cache = new LocalMemoryCache({ ttlSeconds: 300, maxEntries: 5 });

    // Fill cache to max
    for (let i = 0; i < 5; i++) {
      await cache.set(`key${i}`, {
        id: `id${i}`,
        key: `key${i}`,
        secret: `secret${i}`,
        algorithm: "HS256" as const,
        consumer: { id: `consumer${i}` },
      });
    }

    const stats1 = await cache.getStats();
    expect(stats1.size).toBe(5);

    // Add one more - should trigger eviction of oldest
    await cache.set("key5", {
      id: "id5",
      key: "key5",
      secret: "secret5",
      algorithm: "HS256" as const,
      consumer: { id: "consumer5" },
    });

    const stats2 = await cache.getStats();
    expect(stats2.size).toBe(5); // Still at max

    // Oldest entry (key0) should be evicted
    const oldest = await cache.get("key0");
    expect(oldest).toBeNull();

    // Newest entries should still be there
    const newest = await cache.get("key5");
    expect(newest).not.toBeNull();
  });

  it("should enforce stale cache max entries (2x normal limit)", async () => {
    const cache = new LocalMemoryCache({ ttlSeconds: 1, maxEntries: 3 });

    // Add 10 entries to exceed stale limit (2x3 = 6)
    for (let i = 0; i < 10; i++) {
      await cache.set(`stale-key${i}`, {
        id: `id${i}`,
        key: `stale-key${i}`,
        secret: `secret${i}`,
        algorithm: "HS256" as const,
        consumer: { id: `consumer${i}` },
      });
      // Small delay to ensure different createdAt times
      await new Promise((resolve) => setTimeout(resolve, 2));
    }

    // The cache should have enforced limits
    const stats = await cache.getStats();
    expect(stats.size).toBeLessThanOrEqual(3);
  });

  it("should clean up expired entries during getStats", async () => {
    const cache = new LocalMemoryCache({ ttlSeconds: 0.05, maxEntries: 100 });

    // Add entry with very short TTL
    await cache.set("short-lived", {
      id: "id",
      key: "short-lived",
      secret: "secret",
      algorithm: "HS256" as const,
      consumer: { id: "consumer" },
    });

    // Wait for expiration
    await new Promise((resolve) => setTimeout(resolve, 100));

    const stats = await cache.getStats();
    // Expired entry should be cleaned up
    expect(stats.activeEntries).toBe(0);
  });

  it("should correctly calculate hitRate with zero operations", async () => {
    const cache = new LocalMemoryCache({ ttlSeconds: 300, maxEntries: 100 });

    const stats = await cache.getStats();
    expect(stats.hitRate).toBe("0.00");
  });

  it("should correctly calculate average latency with zero operations", async () => {
    const cache = new LocalMemoryCache({ ttlSeconds: 300, maxEntries: 100 });

    const stats = await cache.getStats();
    expect(stats.averageLatencyMs).toBe(0);
  });

  it("should support getStale for stale cache access", async () => {
    const cache = new LocalMemoryCache({ ttlSeconds: 0.05, maxEntries: 100 });

    const data = {
      id: "stale-id",
      key: "stale-key",
      secret: "stale-secret",
      algorithm: "HS256" as const,
      consumer: { id: "stale-consumer" },
    };

    await cache.set("stale-key", data);

    // Wait for regular cache to expire
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Regular cache should be expired
    const regular = await cache.get("stale-key");
    expect(regular).toBeNull();

    // Stale cache should still have it (24x TTL)
    const stale = await cache.getStale("stale-key");
    expect(stale).not.toBeNull();
    expect(stale?.key).toBe("stale-key");
  });

  it("should support setStale for direct stale cache writes", async () => {
    const cache = new LocalMemoryCache({ ttlSeconds: 300, maxEntries: 100 });

    const data = {
      id: "direct-stale",
      key: "direct-stale-key",
      secret: "secret",
      algorithm: "HS256" as const,
      consumer: { id: "consumer" },
    };

    await cache.setStale("direct-stale-key", data);

    const stale = await cache.getStale("direct-stale-key");
    expect(stale).not.toBeNull();
    expect(stale?.key).toBe("direct-stale-key");
  });

  it("should support clearStale operation", async () => {
    const cache = new LocalMemoryCache({ ttlSeconds: 300, maxEntries: 100 });

    await cache.setStale("clear-test", {
      id: "id",
      key: "clear-test",
      secret: "secret",
      algorithm: "HS256" as const,
      consumer: { id: "consumer" },
    });

    await cache.clearStale();

    const stale = await cache.getStale("clear-test");
    expect(stale).toBeNull();
  });
});
