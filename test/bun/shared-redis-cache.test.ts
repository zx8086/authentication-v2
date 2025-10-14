/* test/bun/shared-redis-cache-minimal.test.ts */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import type { ConsumerSecret } from "../../src/config/schemas";
import { SharedRedisCache } from "../../src/services/cache/shared-redis-cache";

describe("SharedRedisCache Essential Tests", () => {
  let cache: SharedRedisCache;
  let isRedisAvailable = false;

  const testConfig = {
    url: "redis://localhost:6379",
    password: process.env.REDIS_PASSWORD,
    db: 15,
    ttlSeconds: 300,
  };

  beforeAll(async () => {
    try {
      cache = new SharedRedisCache(testConfig);
      await cache.connect();
      isRedisAvailable = true;
      console.log("Redis connected for essential tests");
    } catch (error) {
      console.warn("Redis not available:", error instanceof Error ? error.message : String(error));
      isRedisAvailable = false;
    }
  });

  afterAll(async () => {
    if (cache && isRedisAvailable) {
      try {
        await cache.clear();
        await cache.disconnect();
        console.log("Redis cleaned up after essential tests");
      } catch (error) {
        console.warn("Error during Redis cleanup:", error);
      }
    }
  });

  beforeEach(async () => {
    if (!isRedisAvailable) return;
    await cache.clear();
  });

  const skipIfRedisUnavailable = (testName: string, testFn: () => Promise<void> | void) => {
    it(testName, async () => {
      if (!isRedisAvailable) {
        console.log(`Skipping test "${testName}" - Redis not available`);
        return;
      }
      await testFn();
    });
  };

  describe("Basic Operations", () => {
    skipIfRedisUnavailable("should store and retrieve values", async () => {
      const key = "test-consumer-1";
      const secret: ConsumerSecret = {
        consumerId: "test-consumer-1",
        consumerUsername: "test-user",
        jwtKey: "test-jwt-key",
        jwtSecret: "test-jwt-secret",
        algorithm: "HS256",
      };

      await cache.set(key, secret);
      const retrieved = await cache.get(key);
      expect(retrieved).toEqual(secret);
    });

    skipIfRedisUnavailable("should return null for non-existent keys", async () => {
      const result = await cache.get("non-existent-key");
      expect(result).toBeNull();
    });

    skipIfRedisUnavailable("should delete individual entries", async () => {
      const key = "delete-test";
      const secret: ConsumerSecret = {
        consumerId: "delete-consumer",
        consumerUsername: "delete-user",
        jwtKey: "delete-key",
        jwtSecret: "delete-secret",
        algorithm: "HS256",
      };

      await cache.set(key, secret);
      expect(await cache.get(key)).toEqual(secret);

      await cache.delete(key);
      expect(await cache.get(key)).toBeNull();
    });

    skipIfRedisUnavailable("should clear all entries", async () => {
      // Set multiple entries
      await cache.set("clear-1", { consumerId: "c1", consumerUsername: "u1", jwtKey: "k1", jwtSecret: "s1", algorithm: "HS256" });
      await cache.set("clear-2", { consumerId: "c2", consumerUsername: "u2", jwtKey: "k2", jwtSecret: "s2", algorithm: "HS256" });

      // Verify entries exist
      expect(await cache.get("clear-1")).not.toBeNull();
      expect(await cache.get("clear-2")).not.toBeNull();

      // Clear all
      await cache.clear();

      // Verify all entries are gone
      expect(await cache.get("clear-1")).toBeNull();
      expect(await cache.get("clear-2")).toBeNull();
    });
  });

  describe("TTL and Expiration", () => {
    skipIfRedisUnavailable("should handle custom TTL values", async () => {
      const key = "custom-ttl";
      const secret: ConsumerSecret = {
        consumerId: "custom-ttl-consumer",
        consumerUsername: "custom-ttl-user",
        jwtKey: "custom-ttl-key",
        jwtSecret: "custom-ttl-secret",
        algorithm: "HS256",
      };

      await cache.set(key, secret, 1); // 1 second TTL

      // Should be available immediately
      const immediate = await cache.get(key);
      expect(immediate).toEqual(secret);

      // Wait for TTL to expire
      await Bun.sleep(1200);
      const expired = await cache.get(key);
      expect(expired).toBeNull();
    });
  });

  describe("Statistics", () => {
    skipIfRedisUnavailable("should provide basic statistics", async () => {
      // Record miss
      await cache.get("non-existent-key");

      // Record hit
      const key = "stats-test";
      const secret: ConsumerSecret = {
        consumerId: "stats-consumer",
        consumerUsername: "stats-user",
        jwtKey: "stats-key",
        jwtSecret: "stats-secret",
        algorithm: "HS256",
      };

      await cache.set(key, secret);
      await cache.get(key);

      const stats = await cache.getStats();
      expect(stats.strategy).toBe("shared-redis");
      expect(parseFloat(stats.hitRate)).toBeGreaterThan(0);
      expect(stats.averageLatencyMs).toBeGreaterThan(0);
    });
  });

  describe("Connection Management", () => {
    skipIfRedisUnavailable("should maintain connection", async () => {
      expect(cache).toBeDefined();
      expect(cache.getClientForHealthCheck()).not.toBeNull();
    });
  });
});