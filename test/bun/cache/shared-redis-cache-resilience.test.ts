/* test/bun/cache/shared-redis-cache-resilience.test.ts */

import { afterEach, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import type { ConsumerSecret } from "../../../src/config/schemas";
import { SharedRedisCache } from "../../../src/services/cache/shared-redis-cache";

let redisAvailable = false;

async function checkRedisAvailable(): Promise<boolean> {
  try {
    const testCache = new SharedRedisCache({
      url: process.env.REDIS_URL || "redis://localhost:6379",
      password: undefined,
      db: 15,
      ttlSeconds: 10,
      staleDataToleranceMinutes: 1,
    });
    await testCache.connect();
    await testCache.disconnect();
    return true;
  } catch {
    return false;
  }
}

/**
 * Tests Redis connection resilience using REAL Redis connections.
 * No mocks - all tests connect to live Redis at localhost:6379.
 * These tests are SKIPPED in CI/CD when Redis is not available.
 */
describe("SharedRedisCache Connection Resilience", () => {
  beforeAll(async () => {
    redisAvailable = await checkRedisAvailable();
    if (!redisAvailable) {
      console.log("Skipping SharedRedisCache resilience tests: Redis not available");
    }
  });
  let cache: SharedRedisCache;

  const testValue: ConsumerSecret = {
    consumer: {
      id: "resilience-test-consumer",
      username: "resilience-test@example.com",
      custom_id: "resilience-custom-123",
      created_at: 1234567890,
    },
    key: "resilience-test-key",
    secret: "resilience-test-secret",
  };

  beforeEach(async () => {
    if (!redisAvailable) return;

    cache = new SharedRedisCache({
      url: process.env.REDIS_URL || "redis://localhost:6379",
      password: undefined,
      db: 15, // Use DB 15 to isolate resilience tests
      ttlSeconds: 300,
      staleDataToleranceMinutes: 30,
    });

    await cache.connect();
    // Clean up any leftover test data
    await cache.clear();
    await cache.clearStale();
  });

  afterEach(async () => {
    if (!redisAvailable) return;

    try {
      await cache.clear();
      await cache.clearStale();
      await cache.disconnect();
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("Basic operations with real Redis", () => {
    it.skipIf(!redisAvailable)("should set and get values", async () => {
      await cache.set("consumer_secret:resilience-test-consumer", testValue);
      const result = await cache.get<ConsumerSecret>("consumer_secret:resilience-test-consumer");

      expect(result).toBeDefined();
      expect(result?.consumer.id).toBe("resilience-test-consumer");
    });

    it.skipIf(!redisAvailable)("should return null for non-existent keys", async () => {
      const result = await cache.get("consumer_secret:non-existent-key-xyz");
      expect(result).toBeNull();
    });

    it.skipIf(!redisAvailable)("should delete values", async () => {
      await cache.set("consumer_secret:resilience-test-consumer", testValue);
      await cache.delete("consumer_secret:resilience-test-consumer");

      const result = await cache.get("consumer_secret:resilience-test-consumer");
      expect(result).toBeNull();
    });
  });

  describe("Stale cache operations", () => {
    it.skipIf(!redisAvailable)("should set and get stale values", async () => {
      await cache.setStale("consumer_secret:resilience-test-consumer", testValue);
      const result = await cache.getStale("consumer_secret:resilience-test-consumer");

      expect(result).toBeDefined();
      expect(result?.consumer.id).toBe("resilience-test-consumer");
    });

    it.skipIf(!redisAvailable)("should clear stale cache", async () => {
      await cache.setStale("consumer_secret:resilience-test-consumer", testValue);
      await cache.clearStale();

      const result = await cache.getStale("consumer_secret:resilience-test-consumer");
      expect(result).toBeNull();
    });

    it.skipIf(!redisAvailable)("should maintain stale data when primary is cleared", async () => {
      await cache.set("consumer_secret:resilience-test-consumer", testValue);
      // set() also writes to stale cache
      await cache.clear(); // Only clears primary

      const staleResult = await cache.getStale("consumer_secret:resilience-test-consumer");
      expect(staleResult).toBeDefined();
      expect(staleResult?.consumer.id).toBe("resilience-test-consumer");
    });
  });

  describe("Stats and server detection", () => {
    it.skipIf(!redisAvailable)("should return valid stats", async () => {
      await cache.set("consumer_secret:resilience-test-consumer", testValue);

      const stats = await cache.getStats();
      expect(stats.strategy).toBe("shared-redis");
      expect(stats.redisConnected).toBe(true);
      expect(stats.primary).toBeDefined();
      expect(stats.stale).toBeDefined();
    });

    it.skipIf(!redisAvailable)("should detect server type", async () => {
      const serverType = await cache.getServerType();
      expect(["redis", "valkey"]).toContain(serverType);
    });
  });

  describe("Disconnect and reconnect behavior", () => {
    it.skipIf(!redisAvailable)("should handle disconnect gracefully", async () => {
      await cache.disconnect();
      // Should not throw
    });

    it.skipIf(!redisAvailable)("should handle multiple disconnect calls", async () => {
      await cache.disconnect();
      await cache.disconnect(); // Should not throw
    });

    it.skipIf(!redisAvailable)(
      "should fail operations after disconnect without reconnecting",
      async () => {
        await cache.disconnect();

        // Operations should return null/undefined gracefully, not throw
        const result = await cache.get("consumer_secret:test-key");
        expect(result).toBeNull();
      }
    );
  });

  describe("Connection to invalid Redis", () => {
    it.skipIf(!redisAvailable)("should fail to connect to non-existent Redis", async () => {
      const badCache = new SharedRedisCache({
        url: "redis://localhost:16379", // Non-existent port
        password: undefined,
        db: 0,
        ttlSeconds: 300,
        staleDataToleranceMinutes: 30,
      });

      await expect(badCache.connect()).rejects.toThrow();
    });

    it.skipIf(!redisAvailable)(
      "should handle operations gracefully when not connected",
      async () => {
        const unconnectedCache = new SharedRedisCache({
          url: process.env.REDIS_URL || "redis://localhost:6379",
          password: undefined,
          db: 0,
          ttlSeconds: 300,
          staleDataToleranceMinutes: 30,
        });

        // Don't call connect() - operations should fail gracefully
        const result = await unconnectedCache.get("test-key");
        expect(result).toBeNull();

        // Set should not throw
        await expect(unconnectedCache.set("test-key", testValue)).resolves.toBeUndefined();

        // getStale should return null
        const staleResult = await unconnectedCache.getStale("test-key");
        expect(staleResult).toBeNull();
      }
    );

    it.skipIf(!redisAvailable)("should return default stats when not connected", async () => {
      const unconnectedCache = new SharedRedisCache({
        url: process.env.REDIS_URL || "redis://localhost:6379",
        password: undefined,
        db: 0,
        ttlSeconds: 300,
        staleDataToleranceMinutes: 30,
      });

      const stats = await unconnectedCache.getStats();
      expect(stats.strategy).toBe("shared-redis");
      expect(stats.redisConnected).toBe(false);
      expect(stats.size).toBe(0);
    });
  });

  describe("Cache pollution prevention", () => {
    it.skipIf(!redisAvailable)(
      "should reject cache entries with mismatched consumer IDs",
      async () => {
        const mismatchedValue: ConsumerSecret = {
          consumer: {
            id: "different-consumer-id", // Different from key
            username: "test@example.com",
            custom_id: "custom-123",
            created_at: 1234567890,
          },
          key: "test-key",
          secret: "test-secret",
        };

        // This should be rejected due to consumer ID mismatch
        await cache.set("consumer_secret:expected-consumer-id", mismatchedValue);

        // Value should NOT be cached
        const result = await cache.get("consumer_secret:expected-consumer-id");
        expect(result).toBeNull();
      }
    );
  });
});
