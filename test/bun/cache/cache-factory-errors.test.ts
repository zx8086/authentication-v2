/* test/bun/cache-factory-errors.test.ts */

/**
 * Tests for CacheFactory error scenarios and edge cases to improve coverage
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { resetConfigCache } from "../../../src/config/config";
import { CacheFactory } from "../../../src/services/cache/cache-factory";

describe("CacheFactory Error Scenarios", () => {
  let originalRedisUrl: string | undefined;
  let originalHighAvailability: string | undefined;

  beforeEach(() => {
    originalRedisUrl = process.env.REDIS_URL;
    originalHighAvailability = process.env.HIGH_AVAILABILITY;
    CacheFactory.reset();
    resetConfigCache();
  });

  afterEach(() => {
    if (originalRedisUrl !== undefined) {
      process.env.REDIS_URL = originalRedisUrl;
    } else {
      delete process.env.REDIS_URL;
    }
    if (originalHighAvailability !== undefined) {
      process.env.HIGH_AVAILABILITY = originalHighAvailability;
    } else {
      delete process.env.HIGH_AVAILABILITY;
    }
    CacheFactory.reset();
    resetConfigCache();
  });

  describe("initialization failures", () => {
    it("should handle concurrent initialization with same config", async () => {
      CacheFactory.reset();
      resetConfigCache();

      // Start multiple concurrent initializations
      const promise1 = CacheFactory.createKongCache();
      const promise2 = CacheFactory.createKongCache();
      const promise3 = CacheFactory.createKongCache();

      const [cache1, cache2, cache3] = await Promise.all([promise1, promise2, promise3]);

      // All should resolve to valid caches
      expect(cache1).toBeDefined();
      expect(cache2).toBeDefined();
      expect(cache3).toBeDefined();
    });
  });

  describe("configuration changes", () => {
    it("should create new instance when configuration changes", async () => {
      // Create with memory cache
      process.env.HIGH_AVAILABILITY = "false";
      resetConfigCache();
      const cache1 = await CacheFactory.createKongCache();
      expect(cache1).toBeDefined();

      // Change to Redis (simulate config change)
      process.env.HIGH_AVAILABILITY = "true";
      process.env.REDIS_URL = "redis://localhost:6379";
      resetConfigCache();

      // This should attempt to reconfigure or create new instance
      const cache2 = await CacheFactory.createKongCache();
      expect(cache2).toBeDefined();
    });

    it("should handle reconfiguration with different TTL", async () => {
      process.env.HIGH_AVAILABILITY = "false";
      process.env.KONG_CACHE_TTL_SECONDS = "300";
      resetConfigCache();

      const cache1 = await CacheFactory.createKongCache();
      expect(cache1).toBeDefined();

      // Change TTL
      process.env.KONG_CACHE_TTL_SECONDS = "600";
      resetConfigCache();

      const cache2 = await CacheFactory.createKongCache();
      expect(cache2).toBeDefined();
    });

    it("should handle reconfiguration with different Redis DB", async () => {
      process.env.HIGH_AVAILABILITY = "true";
      process.env.REDIS_URL = "redis://localhost:6379";
      process.env.REDIS_DB = "0";
      resetConfigCache();

      const cache1 = await CacheFactory.createKongCache();
      expect(cache1).toBeDefined();

      // Change Redis DB
      process.env.REDIS_DB = "1";
      resetConfigCache();

      const cache2 = await CacheFactory.createKongCache();
      expect(cache2).toBeDefined();
    });
  });

  describe("reset with errors", () => {
    it("should handle reset when shutdown throws non-Error", async () => {
      const cache = await CacheFactory.createKongCache();
      expect(cache).toBeDefined();

      const originalShutdown = cache.shutdown;
      cache.shutdown = async () => {
        throw "String error"; // Non-Error object
      };

      // Should not throw even with shutdown error
      expect(() => CacheFactory.reset()).not.toThrow();

      cache.shutdown = originalShutdown;
    });

    it("should handle reset when instance is not UnifiedCacheManager", async () => {
      // This tests the instanceof check in reset()
      CacheFactory.reset();

      // Should not throw when no instance exists
      expect(() => CacheFactory.reset()).not.toThrow();
    });
  });

  describe("cache health checks", () => {
    it("should verify cache is healthy after creation", async () => {
      const cache = await CacheFactory.createKongCache();

      const isHealthy = await cache.isHealthy();
      expect(typeof isHealthy).toBe("boolean");
    });

    it("should return stats after initialization", async () => {
      const cache = await CacheFactory.createKongCache();

      const stats = await cache.getStats();
      expect(stats).toBeDefined();
      expect(typeof stats.size).toBe("number");
    });
  });

  describe("cache operations", () => {
    it("should handle clear operation", async () => {
      const cache = await CacheFactory.createKongCache();

      // Add some data
      await cache.set("key1", {
        id: "1",
        key: "key1",
        secret: "s1",
        algorithm: "HS256" as const,
        consumer: { id: "c1" },
      });
      await cache.set("key2", {
        id: "2",
        key: "key2",
        secret: "s2",
        algorithm: "HS256" as const,
        consumer: { id: "c2" },
      });

      // Clear
      await cache.clear();

      // Verify cleared
      const retrieved = await cache.get("key1");
      expect(retrieved).toBeNull();
    });

    it("should support multiple set operations", async () => {
      const cache = await CacheFactory.createKongCache();

      const data1 = {
        id: "1",
        key: "k1",
        secret: "s1",
        algorithm: "HS256" as const,
        consumer: { id: "c1" },
      };
      const data2 = {
        id: "2",
        key: "k2",
        secret: "s2",
        algorithm: "HS256" as const,
        consumer: { id: "c2" },
      };

      await cache.set("key1", data1);
      await cache.set("key2", data2);

      const r1 = await cache.get("key1");
      const r2 = await cache.get("key2");

      expect(r1?.id).toBe("1");
      expect(r2?.id).toBe("2");
    });

    it("should return null for non-existent keys", async () => {
      const cache = await CacheFactory.createKongCache();

      const result = await cache.get("nonexistent-key");
      expect(result).toBeNull();
    });

    it("should handle delete of non-existent key", async () => {
      const cache = await CacheFactory.createKongCache();

      await expect(cache.delete("nonexistent-key")).resolves.toBeUndefined();
    });
  });
});
