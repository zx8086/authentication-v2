/* test/integration/redis-cache.integration.test.ts */

/**
 * Integration tests for Redis cache with real Redis instance.
 * Tests SharedRedisCache and SharedRedisBackend functionality.
 *
 * Prerequisites:
 * - Redis must be running (docker compose up or local instance)
 * - REDIS_URL environment variable should point to the Redis instance
 *
 * Run: bun test test/integration/redis-cache.integration.test.ts
 */

import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { SharedRedisBackend } from "../../src/cache/backends/shared-redis-backend";
import type { ConsumerSecret } from "../../src/config/schemas";
import { SharedRedisCache } from "../../src/services/cache/shared-redis-cache";
import { INTEGRATION_CONFIG, TEST_CONSUMERS } from "./setup";

let redisAvailable = false;
let redisCache: SharedRedisCache;
let redisBackend: SharedRedisBackend;

// Helper to check if Redis is available
async function isRedisAvailable(): Promise<boolean> {
  try {
    const { RedisClient } = await import("bun");
    const testClient = new RedisClient(INTEGRATION_CONFIG.REDIS_URL, {
      connectionTimeout: 3000,
    });
    await testClient.connect();
    await testClient.send("PING", []);
    await testClient.close();
    return true;
  } catch {
    return false;
  }
}

// Create mock consumer secret for testing
function createMockConsumerSecret(consumerId: string, index: number): ConsumerSecret {
  return {
    id: `jwt-cred-${index}`,
    key: `test-jwt-key-${index}`,
    secret: `test-jwt-secret-${index}-minimum-32-characters-long-value`,
    algorithm: "HS256",
    consumer: {
      id: consumerId,
    },
  };
}

beforeAll(async () => {
  redisAvailable = await isRedisAvailable();
  if (!redisAvailable) {
    console.log("Redis not available. Start with: docker compose -f docker-compose.test.yml up -d");
    return;
  }

  // Initialize SharedRedisCache
  redisCache = new SharedRedisCache({
    url: INTEGRATION_CONFIG.REDIS_URL,
    password: process.env.REDIS_PASSWORD || undefined,
    db: Number.parseInt(process.env.REDIS_DB || "0", 10),
    ttlSeconds: 300,
    staleDataToleranceMinutes: 30,
  });
  await redisCache.connect();

  // Initialize SharedRedisBackend
  redisBackend = new SharedRedisBackend({
    url: INTEGRATION_CONFIG.REDIS_URL,
    password: process.env.REDIS_PASSWORD || undefined,
    db: Number.parseInt(process.env.REDIS_DB || "0", 10),
    ttlSeconds: 300,
    staleDataToleranceMinutes: 30,
  });
  await redisBackend.connect();
});

afterAll(async () => {
  if (redisAvailable) {
    // Clean up test data
    await redisCache?.clear();
    await redisCache?.clearStale();
    await redisCache?.disconnect();
    await redisBackend?.disconnect();
  }
});

describe("SharedRedisCache Integration", () => {
  describe("connect", () => {
    it("should connect to Redis successfully", async () => {
      if (!redisAvailable) {
        console.log("Skipping: Redis not available");
        return;
      }

      // Connection was already made in beforeAll
      // Verify we can perform operations
      const stats = await redisCache.getStats();
      expect(stats.redisConnected).toBe(true);
    });
  });

  describe("set and get", () => {
    it("should set and retrieve a consumer secret", async () => {
      if (!redisAvailable) {
        console.log("Skipping: Redis not available");
        return;
      }

      const consumer = TEST_CONSUMERS[0];
      const cacheKey = `consumer_secret:${consumer.id}`;
      const secret = createMockConsumerSecret(consumer.id, 1);

      await redisCache.set(cacheKey, secret);
      const retrieved = await redisCache.get<ConsumerSecret>(cacheKey);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.key).toBe(secret.key);
      expect(retrieved?.secret).toBe(secret.secret);
      expect(retrieved?.consumer?.id).toBe(consumer.id);
    });

    it("should return null for non-existent key", async () => {
      if (!redisAvailable) {
        console.log("Skipping: Redis not available");
        return;
      }

      const result = await redisCache.get("non-existent-key-12345");
      expect(result).toBeNull();
    });

    it("should handle multiple set/get operations", async () => {
      if (!redisAvailable) {
        console.log("Skipping: Redis not available");
        return;
      }

      // Set multiple values
      for (let i = 0; i < TEST_CONSUMERS.length; i++) {
        const consumer = TEST_CONSUMERS[i];
        const cacheKey = `consumer_secret:${consumer.id}`;
        const secret = createMockConsumerSecret(consumer.id, i);
        await redisCache.set(cacheKey, secret);
      }

      // Verify all values
      for (const consumer of TEST_CONSUMERS) {
        const cacheKey = `consumer_secret:${consumer.id}`;
        const retrieved = await redisCache.get<ConsumerSecret>(cacheKey);

        expect(retrieved).not.toBeNull();
        expect(retrieved?.consumer?.id).toBe(consumer.id);
      }
    });

    it("should prevent cache pollution when consumer ID mismatches", async () => {
      if (!redisAvailable) {
        console.log("Skipping: Redis not available");
        return;
      }

      const consumer1 = TEST_CONSUMERS[0];
      const consumer2 = TEST_CONSUMERS[1];

      // Try to cache a secret with mismatched consumer ID in the key
      const mismatchedSecret = createMockConsumerSecret(consumer2.id, 99);
      const wrongKey = `consumer_secret:${consumer1.id}`; // Key says consumer1

      // This should NOT cache due to mismatch protection
      await redisCache.set(wrongKey, mismatchedSecret);

      // The mismatched data should not have been cached
      const retrieved = await redisCache.get<ConsumerSecret>(wrongKey);
      // If protection works, either null or the correct consumer ID
      if (retrieved !== null) {
        expect(retrieved.consumer?.id).toBe(consumer1.id);
      }
    });
  });

  describe("delete", () => {
    it("should delete a cached value", async () => {
      if (!redisAvailable) {
        console.log("Skipping: Redis not available");
        return;
      }

      const consumer = TEST_CONSUMERS[2];
      const cacheKey = `consumer_secret:${consumer.id}`;
      const secret = createMockConsumerSecret(consumer.id, 2);

      // Set then delete
      await redisCache.set(cacheKey, secret);
      await redisCache.delete(cacheKey);

      // Should be gone
      const retrieved = await redisCache.get(cacheKey);
      expect(retrieved).toBeNull();
    });
  });

  describe("clear", () => {
    it("should clear all cached values", async () => {
      if (!redisAvailable) {
        console.log("Skipping: Redis not available");
        return;
      }

      // Set multiple values
      for (let i = 0; i < 3; i++) {
        const consumer = TEST_CONSUMERS[i];
        const cacheKey = `consumer_secret:${consumer.id}`;
        const secret = createMockConsumerSecret(consumer.id, i);
        await redisCache.set(cacheKey, secret);
      }

      // Clear all
      await redisCache.clear();

      // All should be gone
      const stats = await redisCache.getStats();
      expect(stats.size).toBe(0);
    });
  });

  describe("getStats", () => {
    it("should return accurate cache statistics", async () => {
      if (!redisAvailable) {
        console.log("Skipping: Redis not available");
        return;
      }

      // Clear and populate with known data
      await redisCache.clear();

      const consumer = TEST_CONSUMERS[0];
      const cacheKey = `consumer_secret:${consumer.id}`;
      const secret = createMockConsumerSecret(consumer.id, 1);

      await redisCache.set(cacheKey, secret);

      const stats = await redisCache.getStats();

      expect(stats.strategy).toBe("shared-redis");
      expect(stats.redisConnected).toBe(true);
      expect(stats.size).toBeGreaterThanOrEqual(1);
      expect(typeof stats.hitRate).toBe("string");
      expect(typeof stats.averageLatencyMs).toBe("number");
    });

    it("should track hit rate across operations", async () => {
      if (!redisAvailable) {
        console.log("Skipping: Redis not available");
        return;
      }

      // Create fresh cache for clean hit tracking
      const freshCache = new SharedRedisCache({
        url: INTEGRATION_CONFIG.REDIS_URL,
        db: 1, // Use different DB to avoid interference
        ttlSeconds: 300,
      });
      await freshCache.connect();

      try {
        const consumer = TEST_CONSUMERS[0];
        const cacheKey = `consumer_secret:${consumer.id}`;
        const secret = createMockConsumerSecret(consumer.id, 1);

        // Miss
        await freshCache.get(cacheKey);

        // Set
        await freshCache.set(cacheKey, secret);

        // Hit
        await freshCache.get(cacheKey);
        await freshCache.get(cacheKey);

        const stats = await freshCache.getStats();

        // Hit rate should be positive (2 hits out of 3 gets = 66.67%)
        expect(Number.parseFloat(stats.hitRate)).toBeGreaterThan(0);
      } finally {
        await freshCache.clear();
        await freshCache.disconnect();
      }
    });
  });

  describe("stale cache operations", () => {
    it("should set and get stale cache data", async () => {
      if (!redisAvailable) {
        console.log("Skipping: Redis not available");
        return;
      }

      const consumer = TEST_CONSUMERS[1];
      const cacheKey = `consumer_secret:${consumer.id}`;
      const secret = createMockConsumerSecret(consumer.id, 1);

      await redisCache.setStale(cacheKey, secret);
      const retrieved = await redisCache.getStale(cacheKey);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.key).toBe(secret.key);
      expect(retrieved?.consumer?.id).toBe(consumer.id);
    });

    it("should return null for non-existent stale key", async () => {
      if (!redisAvailable) {
        console.log("Skipping: Redis not available");
        return;
      }

      const result = await redisCache.getStale("non-existent-stale-key");
      expect(result).toBeNull();
    });

    it("should clear stale cache", async () => {
      if (!redisAvailable) {
        console.log("Skipping: Redis not available");
        return;
      }

      // Set stale data
      const consumer = TEST_CONSUMERS[0];
      const cacheKey = `consumer_secret:${consumer.id}`;
      const secret = createMockConsumerSecret(consumer.id, 1);

      await redisCache.setStale(cacheKey, secret);

      // Clear stale
      await redisCache.clearStale();

      // Should be gone
      const retrieved = await redisCache.getStale(cacheKey);
      expect(retrieved).toBeNull();
    });
  });

  describe("set also stores in stale cache", () => {
    it("should store data in both primary and stale cache on set", async () => {
      if (!redisAvailable) {
        console.log("Skipping: Redis not available");
        return;
      }

      await redisCache.clear();
      await redisCache.clearStale();

      const consumer = TEST_CONSUMERS[0];
      const cacheKey = `consumer_secret:${consumer.id}`;
      const secret = createMockConsumerSecret(consumer.id, 1);

      // Set should populate both caches
      await redisCache.set(cacheKey, secret);

      // Both should have the data
      const primary = await redisCache.get<ConsumerSecret>(cacheKey);
      const stale = await redisCache.getStale(cacheKey);

      expect(primary).not.toBeNull();
      expect(stale).not.toBeNull();
      expect(primary?.key).toBe(stale?.key);
    });
  });

  describe("getClientForHealthCheck", () => {
    it("should return the Redis client for health checks", async () => {
      if (!redisAvailable) {
        console.log("Skipping: Redis not available");
        return;
      }

      const client = redisCache.getClientForHealthCheck();
      expect(client).not.toBeNull();
    });
  });
});

describe("SharedRedisBackend Integration", () => {
  describe("basic operations", () => {
    it("should set and get values", async () => {
      if (!redisAvailable) {
        console.log("Skipping: Redis not available");
        return;
      }

      const consumer = TEST_CONSUMERS[0];
      const cacheKey = `backend_test:${consumer.id}`;
      const secret = createMockConsumerSecret(consumer.id, 1);

      await redisBackend.set(cacheKey, secret);
      const retrieved = await redisBackend.get<ConsumerSecret>(cacheKey);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.key).toBe(secret.key);
    });

    it("should delete values", async () => {
      if (!redisAvailable) {
        console.log("Skipping: Redis not available");
        return;
      }

      const consumer = TEST_CONSUMERS[1];
      const cacheKey = `backend_test:${consumer.id}`;
      const secret = createMockConsumerSecret(consumer.id, 1);

      await redisBackend.set(cacheKey, secret);
      await redisBackend.delete(cacheKey);

      const retrieved = await redisBackend.get(cacheKey);
      expect(retrieved).toBeNull();
    });

    it("should clear all values", async () => {
      if (!redisAvailable) {
        console.log("Skipping: Redis not available");
        return;
      }

      // Set some values
      for (let i = 0; i < 3; i++) {
        const consumer = TEST_CONSUMERS[i];
        const cacheKey = `backend_test:${consumer.id}`;
        const secret = createMockConsumerSecret(consumer.id, i);
        await redisBackend.set(cacheKey, secret);
      }

      await redisBackend.clear();

      const stats = await redisBackend.getStats();
      expect(stats).toBeDefined();
    });
  });

  describe("getStats", () => {
    it("should return backend statistics", async () => {
      if (!redisAvailable) {
        console.log("Skipping: Redis not available");
        return;
      }

      const stats = await redisBackend.getStats();

      expect(stats).toBeDefined();
      expect(stats.strategy).toBe("shared-redis");
      expect(stats.redisConnected).toBe(true);
    });
  });

  describe("isHealthy", () => {
    it("should return true when Redis is healthy", async () => {
      if (!redisAvailable) {
        console.log("Skipping: Redis not available");
        return;
      }

      const healthy = await redisBackend.isHealthy();
      expect(healthy).toBe(true);
    });
  });

  describe("getStale", () => {
    it("should get stale data through backend", async () => {
      if (!redisAvailable) {
        console.log("Skipping: Redis not available");
        return;
      }

      const consumer = TEST_CONSUMERS[2];
      const cacheKey = `backend_stale_test:${consumer.id}`;
      const secret = createMockConsumerSecret(consumer.id, 1);

      // Set via cache (which populates stale)
      await redisCache.set(cacheKey, secret);

      // Get stale via backend
      const stale = await redisBackend.getStale<ConsumerSecret>(cacheKey);
      expect(stale).not.toBeNull();
      expect(stale?.key).toBe(secret.key);
    });
  });

  describe("strategy property", () => {
    it("should have correct strategy value", async () => {
      if (!redisAvailable) {
        console.log("Skipping: Redis not available");
        return;
      }

      expect(redisBackend.strategy).toBe("shared-redis");
      expect(redisBackend.name).toBe("SharedRedisBackend");
    });
  });
});

describe("Redis Cache Performance", () => {
  it("should have low latency for cache operations", async () => {
    if (!redisAvailable) {
      console.log("Skipping: Redis not available");
      return;
    }

    const consumer = TEST_CONSUMERS[0];
    const cacheKey = `perf_test:${consumer.id}`;
    const secret = createMockConsumerSecret(consumer.id, 1);

    // Warm up
    await redisCache.set(cacheKey, secret);
    await redisCache.get(cacheKey);

    // Measure latency
    const timings: number[] = [];
    for (let i = 0; i < 100; i++) {
      const start = performance.now();
      await redisCache.get(cacheKey);
      timings.push(performance.now() - start);
    }

    const avgLatency = timings.reduce((a, b) => a + b, 0) / timings.length;
    const p99 = timings.sort((a, b) => a - b)[Math.floor(timings.length * 0.99)];

    console.log(`Redis GET latency - Avg: ${avgLatency.toFixed(2)}ms, P99: ${p99.toFixed(2)}ms`);

    // Should be very fast (< 10ms on average)
    expect(avgLatency).toBeLessThan(50);
    expect(p99).toBeLessThan(100);
  });

  it("should handle concurrent operations", async () => {
    if (!redisAvailable) {
      console.log("Skipping: Redis not available");
      return;
    }

    // Concurrent sets
    const setPromises = TEST_CONSUMERS.map((consumer, i) => {
      const cacheKey = `concurrent_test:${consumer.id}`;
      const secret = createMockConsumerSecret(consumer.id, i);
      return redisCache.set(cacheKey, secret);
    });
    await Promise.all(setPromises);

    // Concurrent gets
    const getPromises = TEST_CONSUMERS.map((consumer) => {
      const cacheKey = `concurrent_test:${consumer.id}`;
      return redisCache.get<ConsumerSecret>(cacheKey);
    });
    const results = await Promise.all(getPromises);

    // All should succeed
    for (let i = 0; i < results.length; i++) {
      expect(results[i]).not.toBeNull();
      expect(results[i]?.consumer?.id).toBe(TEST_CONSUMERS[i].id);
    }
  });
});
