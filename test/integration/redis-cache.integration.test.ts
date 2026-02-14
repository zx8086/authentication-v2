// test/integration/redis-cache.integration.test.ts

import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { SharedRedisBackend } from "../../src/cache/backends/shared-redis-backend";
import type { ConsumerSecret } from "../../src/config/schemas";
import { SharedRedisCache } from "../../src/services/cache/shared-redis-cache";
import {
  disableFetchPolyfill,
  enableFetchPolyfill,
  INTEGRATION_CONFIG,
  TEST_CONSUMERS,
} from "./setup";

const CONNECTION_TIMEOUT_MS = 3000;

let redisAvailable = false;
let redisCache: SharedRedisCache | null = null;
let redisBackend: SharedRedisBackend | null = null;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${operation} timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

async function safeDisconnect(
  instance: SharedRedisCache | SharedRedisBackend | null,
  name: string
): Promise<void> {
  if (!instance) return;
  try {
    await withTimeout(instance.disconnect(), CONNECTION_TIMEOUT_MS, `${name}.disconnect`);
  } catch (error) {
    console.warn(`Warning: ${name} disconnect failed:`, error);
  }
}

async function isRedisAvailable(): Promise<boolean> {
  try {
    const { RedisClient } = await import("bun");
    const testClient = new RedisClient(INTEGRATION_CONFIG.REDIS_URL, {
      connectionTimeout: CONNECTION_TIMEOUT_MS,
    });
    await withTimeout(testClient.connect(), CONNECTION_TIMEOUT_MS, "Redis ping connect");
    await withTimeout(testClient.send("PING", []), CONNECTION_TIMEOUT_MS, "Redis PING");
    await withTimeout(testClient.close(), CONNECTION_TIMEOUT_MS, "Redis ping close");
    return true;
  } catch {
    return false;
  }
}

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
  enableFetchPolyfill();

  redisAvailable = await isRedisAvailable();
  if (!redisAvailable) {
    return;
  }

  try {
    // Use database 10 to avoid cache pollution during parallel test execution
    redisCache = new SharedRedisCache({
      url: INTEGRATION_CONFIG.REDIS_URL,
      password: process.env.REDIS_PASSWORD || undefined,
      db: 10,
      ttlSeconds: 300,
      staleDataToleranceMinutes: 30,
    });
    await withTimeout(redisCache.connect(), CONNECTION_TIMEOUT_MS, "SharedRedisCache.connect");

    redisBackend = new SharedRedisBackend({
      url: INTEGRATION_CONFIG.REDIS_URL,
      password: process.env.REDIS_PASSWORD || undefined,
      db: 10,
      ttlSeconds: 300,
      staleDataToleranceMinutes: 30,
    });
    await withTimeout(redisBackend.connect(), CONNECTION_TIMEOUT_MS, "SharedRedisBackend.connect");
  } catch (error) {
    console.error("Failed to initialize Redis connections:", error);
    redisAvailable = false;
    await safeDisconnect(redisCache, "redisCache");
    await safeDisconnect(redisBackend, "redisBackend");
    redisCache = null;
    redisBackend = null;
  }
});

afterAll(async () => {
  if (!redisAvailable || !redisCache) return;

  try {
    await withTimeout(redisCache.clear(), CONNECTION_TIMEOUT_MS, "redisCache.clear");
  } catch {
    // Ignore cleanup errors
  }

  try {
    await withTimeout(redisCache.clearStale(), CONNECTION_TIMEOUT_MS, "redisCache.clearStale");
  } catch {
    // Ignore cleanup errors
  }

  await safeDisconnect(redisCache, "redisCache");
  await safeDisconnect(redisBackend, "redisBackend");

  disableFetchPolyfill();
});

describe("SharedRedisCache Integration", () => {
  describe("connect", () => {
    it("should connect to Redis successfully", async () => {
      if (!redisAvailable || !redisCache) {
        console.log("Skipping: Redis not available");
        return;
      }

      const stats = await redisCache.getStats();
      expect(stats.redisConnected).toBe(true);
    });
  });

  describe("set and get", () => {
    it("should set and retrieve a consumer secret", async () => {
      if (!redisAvailable || !redisCache) {
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
      if (!redisAvailable || !redisCache) {
        console.log("Skipping: Redis not available");
        return;
      }

      const result = await redisCache.get("non-existent-key-12345");
      expect(result).toBeNull();
    });

    it("should handle multiple set/get operations", async () => {
      if (!redisAvailable || !redisCache) {
        console.log("Skipping: Redis not available");
        return;
      }

      for (let i = 0; i < TEST_CONSUMERS.length; i++) {
        const consumer = TEST_CONSUMERS[i];
        const cacheKey = `consumer_secret:${consumer.id}`;
        const secret = createMockConsumerSecret(consumer.id, i);
        await redisCache.set(cacheKey, secret);
      }

      for (const consumer of TEST_CONSUMERS) {
        const cacheKey = `consumer_secret:${consumer.id}`;
        const retrieved = await redisCache.get<ConsumerSecret>(cacheKey);

        expect(retrieved).not.toBeNull();
        expect(retrieved?.consumer?.id).toBe(consumer.id);
      }
    });

    it("should prevent cache pollution when consumer ID mismatches", async () => {
      if (!redisAvailable || !redisCache) {
        console.log("Skipping: Redis not available");
        return;
      }

      const consumer1 = TEST_CONSUMERS[0];
      const consumer2 = TEST_CONSUMERS[1];

      const mismatchedSecret = createMockConsumerSecret(consumer2.id, 99);
      const wrongKey = `consumer_secret:${consumer1.id}`;

      await redisCache.set(wrongKey, mismatchedSecret);

      const retrieved = await redisCache.get<ConsumerSecret>(wrongKey);
      if (retrieved !== null) {
        expect(retrieved.consumer?.id).toBe(consumer1.id);
      }
    });
  });

  describe("delete", () => {
    it("should delete a cached value", async () => {
      if (!redisAvailable || !redisCache) {
        console.log("Skipping: Redis not available");
        return;
      }

      const consumer = TEST_CONSUMERS[2];
      const cacheKey = `consumer_secret:${consumer.id}`;
      const secret = createMockConsumerSecret(consumer.id, 2);

      await redisCache.set(cacheKey, secret);
      await redisCache.delete(cacheKey);

      const retrieved = await redisCache.get(cacheKey);
      expect(retrieved).toBeNull();
    });
  });

  describe("clear", () => {
    it("should clear all cached values", async () => {
      if (!redisAvailable || !redisCache) {
        console.log("Skipping: Redis not available");
        return;
      }

      for (let i = 0; i < 3; i++) {
        const consumer = TEST_CONSUMERS[i];
        const cacheKey = `consumer_secret:${consumer.id}`;
        const secret = createMockConsumerSecret(consumer.id, i);
        await redisCache.set(cacheKey, secret);
      }

      await redisCache.clear();

      const stats = await redisCache.getStats();
      expect(stats.size).toBe(0);
    });
  });

  describe("getStats", () => {
    it("should return accurate cache statistics", async () => {
      if (!redisAvailable || !redisCache) {
        console.log("Skipping: Redis not available");
        return;
      }

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

      const freshCache = new SharedRedisCache({
        url: INTEGRATION_CONFIG.REDIS_URL,
        db: 1,
        ttlSeconds: 300,
      });

      try {
        await withTimeout(freshCache.connect(), CONNECTION_TIMEOUT_MS, "freshCache.connect");

        const consumer = TEST_CONSUMERS[0];
        const cacheKey = `consumer_secret:${consumer.id}`;
        const secret = createMockConsumerSecret(consumer.id, 1);

        await freshCache.get(cacheKey);
        await freshCache.set(cacheKey, secret);
        await freshCache.get(cacheKey);
        await freshCache.get(cacheKey);

        const stats = await freshCache.getStats();

        expect(Number.parseFloat(stats.hitRate)).toBeGreaterThan(0);
      } finally {
        try {
          await withTimeout(freshCache.clear(), CONNECTION_TIMEOUT_MS, "freshCache.clear");
        } catch {
          // Ignore cleanup errors
        }
        await safeDisconnect(freshCache, "freshCache");
      }
    });
  });

  describe("stale cache operations", () => {
    it("should set and get stale cache data", async () => {
      if (!redisAvailable || !redisCache) {
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
      if (!redisAvailable || !redisCache) {
        console.log("Skipping: Redis not available");
        return;
      }

      const result = await redisCache.getStale("non-existent-stale-key");
      expect(result).toBeNull();
    });

    it("should clear stale cache", async () => {
      if (!redisAvailable || !redisCache) {
        console.log("Skipping: Redis not available");
        return;
      }

      const consumer = TEST_CONSUMERS[0];
      const cacheKey = `consumer_secret:${consumer.id}`;
      const secret = createMockConsumerSecret(consumer.id, 1);

      await redisCache.setStale(cacheKey, secret);
      await redisCache.clearStale();

      const retrieved = await redisCache.getStale(cacheKey);
      expect(retrieved).toBeNull();
    });
  });

  describe("set also stores in stale cache", () => {
    it("should store data in both primary and stale cache on set", async () => {
      if (!redisAvailable || !redisCache) {
        console.log("Skipping: Redis not available");
        return;
      }

      await redisCache.clear();
      await redisCache.clearStale();

      const consumer = TEST_CONSUMERS[0];
      const cacheKey = `consumer_secret:${consumer.id}`;
      const secret = createMockConsumerSecret(consumer.id, 1);

      await redisCache.set(cacheKey, secret);

      const primary = await redisCache.get<ConsumerSecret>(cacheKey);
      const stale = await redisCache.getStale(cacheKey);

      expect(primary).not.toBeNull();
      expect(stale).not.toBeNull();
      expect(primary?.key).toBe(stale?.key);
    });
  });

  describe("getClientForHealthCheck", () => {
    it("should return the Redis client for health checks", async () => {
      if (!redisAvailable || !redisCache) {
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
      if (!redisAvailable || !redisBackend) {
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
      if (!redisAvailable || !redisBackend) {
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
      if (!redisAvailable || !redisBackend) {
        console.log("Skipping: Redis not available");
        return;
      }

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
      if (!redisAvailable || !redisBackend) {
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
      if (!redisAvailable || !redisBackend) {
        console.log("Skipping: Redis not available");
        return;
      }

      const healthy = await redisBackend.isHealthy();
      expect(healthy).toBe(true);
    });
  });

  describe("getStale", () => {
    it("should get stale data through backend", async () => {
      if (!redisAvailable || !redisCache || !redisBackend) {
        console.log("Skipping: Redis not available");
        return;
      }

      const consumer = TEST_CONSUMERS[2];
      const cacheKey = `backend_stale_test:${consumer.id}`;
      const secret = createMockConsumerSecret(consumer.id, 1);

      await redisCache.set(cacheKey, secret);

      const stale = await redisBackend.getStale<ConsumerSecret>(cacheKey);
      expect(stale).not.toBeNull();
      expect(stale?.key).toBe(secret.key);
    });
  });

  describe("strategy property", () => {
    it("should have correct strategy value", async () => {
      if (!redisAvailable || !redisBackend) {
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
    if (!redisAvailable || !redisCache) {
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

    expect(avgLatency).toBeLessThan(50);
    expect(p99).toBeLessThan(100);
  });

  it("should handle concurrent operations", async () => {
    if (!redisAvailable || !redisCache) {
      console.log("Skipping: Redis not available");
      return;
    }

    const setPromises = TEST_CONSUMERS.map((consumer, i) => {
      const cacheKey = `concurrent_test:${consumer.id}`;
      const secret = createMockConsumerSecret(consumer.id, i);
      return redisCache!.set(cacheKey, secret);
    });
    await Promise.all(setPromises);

    const getPromises = TEST_CONSUMERS.map((consumer) => {
      const cacheKey = `concurrent_test:${consumer.id}`;
      return redisCache!.get<ConsumerSecret>(cacheKey);
    });
    const results = await Promise.all(getPromises);

    for (let i = 0; i < results.length; i++) {
      expect(results[i]).not.toBeNull();
      expect(results[i]?.consumer?.id).toBe(TEST_CONSUMERS[i].id);
    }
  });
});
