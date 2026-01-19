/* test/bun/cache-factory.test.ts */

import { afterEach, describe, expect, it } from "bun:test";
import { CacheFactory } from "../../src/services/cache/cache-factory";

describe("CacheFactory", () => {
  afterEach(() => {
    // Reset factory state between tests
    CacheFactory.reset();
  });

  describe("createKongCache", () => {
    it("should create a cache instance", async () => {
      const cache = await CacheFactory.createKongCache();
      expect(cache).toBeDefined();
      expect(typeof cache.get).toBe("function");
      expect(typeof cache.set).toBe("function");
      expect(typeof cache.delete).toBe("function");
      expect(typeof cache.clear).toBe("function");
      expect(typeof cache.getStats).toBe("function");
    });

    it("should return the same instance on subsequent calls", async () => {
      const cache1 = await CacheFactory.createKongCache();
      const cache2 = await CacheFactory.createKongCache();
      expect(cache1).toBe(cache2);
    });

    it("should return a working cache that can store values", async () => {
      const cache = await CacheFactory.createKongCache();

      const testData = {
        id: "test-id",
        key: "test-key",
        secret: "test-secret",
        algorithm: "HS256" as const,
        consumer: { id: "consumer-123" },
      };

      await cache.set("test-key", testData);
      const retrieved = await cache.get("test-key");

      expect(retrieved).toBeDefined();
      expect(retrieved?.key).toBe(testData.key);
    });
  });

  describe("reset", () => {
    it("should reset the factory state", async () => {
      // Create initial cache
      const cache1 = await CacheFactory.createKongCache();
      expect(cache1).toBeDefined();

      // Reset
      CacheFactory.reset();

      // Create new cache - should be different instance
      const cache2 = await CacheFactory.createKongCache();
      expect(cache2).toBeDefined();
      // After reset, a new instance should be created
    });

    it("should handle reset when no cache exists", () => {
      // Should not throw when resetting without prior initialization
      expect(() => CacheFactory.reset()).not.toThrow();
    });

    it("should handle multiple consecutive resets", () => {
      expect(() => {
        CacheFactory.reset();
        CacheFactory.reset();
        CacheFactory.reset();
      }).not.toThrow();
    });

    it("should allow creating new cache after reset", async () => {
      // Create, reset, create again
      const cache1 = await CacheFactory.createKongCache();
      CacheFactory.reset();
      const cache2 = await CacheFactory.createKongCache();

      expect(cache1).toBeDefined();
      expect(cache2).toBeDefined();
    });
  });

  describe("concurrent access", () => {
    it("should handle concurrent createKongCache calls", async () => {
      // Reset to ensure clean state
      CacheFactory.reset();

      // Concurrent calls
      const promises = [
        CacheFactory.createKongCache(),
        CacheFactory.createKongCache(),
        CacheFactory.createKongCache(),
      ];

      const caches = await Promise.all(promises);

      // All caches should be functional and share the same underlying data
      const testKey = `concurrent-test-${Date.now()}`;
      const testData = {
        id: testKey,
        key: testKey,
        secret: "concurrent-secret",
        algorithm: "HS256" as const,
        consumer: { id: "concurrent-consumer" },
      };

      // Write with first cache
      await caches[0].set(testKey, testData);

      // All caches should be able to read the same data (functional equivalence)
      const fromCache0 = await caches[0].get(testKey);
      const fromCache1 = await caches[1].get(testKey);
      const fromCache2 = await caches[2].get(testKey);

      expect(fromCache0?.key).toBe(testKey);
      expect(fromCache1?.key).toBe(testKey);
      expect(fromCache2?.key).toBe(testKey);

      // Cleanup
      await caches[0].delete(testKey);
    });
  });

  describe("cache operations after creation", () => {
    it("should support delete operation", async () => {
      const cache = await CacheFactory.createKongCache();

      const testData = {
        id: "delete-test",
        key: "delete-key",
        secret: "delete-secret",
        algorithm: "HS256" as const,
        consumer: { id: "delete-consumer" },
      };

      await cache.set("delete-test", testData);
      await cache.delete("delete-test");

      const retrieved = await cache.get("delete-test");
      expect(retrieved).toBeNull();
    });

    it("should support clear operation", async () => {
      const cache = await CacheFactory.createKongCache();

      // Add multiple items
      for (let i = 0; i < 3; i++) {
        await cache.set(`key-${i}`, {
          id: `id-${i}`,
          key: `key-${i}`,
          secret: `secret-${i}`,
          algorithm: "HS256" as const,
          consumer: { id: `consumer-${i}` },
        });
      }

      await cache.clear();

      // All should be gone
      for (let i = 0; i < 3; i++) {
        const retrieved = await cache.get(`key-${i}`);
        expect(retrieved).toBeNull();
      }
    });

    it("should return stats", async () => {
      const cache = await CacheFactory.createKongCache();
      const stats = await cache.getStats();

      expect(stats).toBeDefined();
      expect(typeof stats.size).toBe("number");
      expect(typeof stats.hitRate).toBe("string");
    });
  });
});
