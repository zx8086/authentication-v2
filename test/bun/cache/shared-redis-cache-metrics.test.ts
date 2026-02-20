// test/bun/cache/shared-redis-cache-metrics.test.ts

import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import { RedisClient } from "bun";
import type { ConsumerSecret } from "../../../src/config/schemas";
import { SharedRedisCache } from "../../../src/services/cache/shared-redis-cache";
import * as metricsModule from "../../../src/telemetry/metrics";

describe("SharedRedisCache Metrics Recording", () => {
  let cache: SharedRedisCache;
  let mockClient: any;
  let recordCacheOperationSpy: ReturnType<typeof spyOn>;
  let connectSpy: ReturnType<typeof spyOn>;
  let sendSpy: ReturnType<typeof spyOn>;
  let getSpy: ReturnType<typeof spyOn>;
  let setSpy: ReturnType<typeof spyOn>;
  let expireSpy: ReturnType<typeof spyOn>;
  let delSpy: ReturnType<typeof spyOn>;
  let closeSpy: ReturnType<typeof spyOn>;

  beforeEach(async () => {
    cache = new SharedRedisCache({
      url: "redis://localhost:6379",
      password: undefined,
      db: 0,
      ttlSeconds: 300,
      staleDataToleranceMinutes: 30,
    });

    mockClient = {
      connect: mock(async () => {}),
      send: mock(async () => {}),
      get: mock(async () => null),
      set: mock(async () => {}),
      expire: mock(async () => {}),
      del: mock(async () => {}),
      close: mock(async () => {}),
    };

    connectSpy = spyOn(RedisClient.prototype, "connect").mockImplementation(mockClient.connect);
    sendSpy = spyOn(RedisClient.prototype, "send").mockImplementation(mockClient.send);
    getSpy = spyOn(RedisClient.prototype, "get").mockImplementation(mockClient.get);
    setSpy = spyOn(RedisClient.prototype, "set").mockImplementation(mockClient.set);
    expireSpy = spyOn(RedisClient.prototype, "expire").mockImplementation(mockClient.expire);
    delSpy = spyOn(RedisClient.prototype, "del").mockImplementation(mockClient.del);
    closeSpy = spyOn(RedisClient.prototype, "close").mockImplementation(mockClient.close);

    recordCacheOperationSpy = spyOn(metricsModule, "recordCacheOperation");

    await cache.connect();
  });

  afterEach(async () => {
    // Restore all spies to prevent test pollution
    connectSpy.mockRestore();
    sendSpy.mockRestore();
    getSpy.mockRestore();
    setSpy.mockRestore();
    expireSpy.mockRestore();
    delSpy.mockRestore();
    closeSpy.mockRestore();
    recordCacheOperationSpy.mockRestore();

    try {
      await cache.disconnect();
    } catch {}
  });

  describe("cache hit metrics", () => {
    const testValue: ConsumerSecret = {
      consumer: {
        id: "test-consumer",
        username: "test@example.com",
        custom_id: "custom-123",
        created_at: 1234567890,
      },
      key: "test-key",
      secret: "test-secret",
    };

    it("should record cache hit when get returns data", async () => {
      mockClient.get.mockImplementation(async () => JSON.stringify(testValue));

      await cache.get("consumer_secret:test-consumer");

      expect(recordCacheOperationSpy).toHaveBeenCalledWith("hit", "redis");
    });

    it("should record cache hit when getStale returns data", async () => {
      mockClient.get.mockImplementation(async (key: string) => {
        if (key.includes("stale")) {
          return JSON.stringify(testValue);
        }
        return null;
      });

      await cache.getStale("consumer_secret:test-consumer");

      expect(recordCacheOperationSpy).toHaveBeenCalledWith("hit", "redis");
    });

    it("should record multiple cache hits", async () => {
      mockClient.get.mockImplementation(async () => JSON.stringify(testValue));

      await cache.get("consumer_secret:test-1");
      await cache.get("consumer_secret:test-2");
      await cache.get("consumer_secret:test-3");

      expect(recordCacheOperationSpy).toHaveBeenCalledTimes(3);
      expect(recordCacheOperationSpy).toHaveBeenCalledWith("hit", "redis");
    });
  });

  describe("cache miss metrics", () => {
    it("should record cache miss when get returns null", async () => {
      mockClient.get.mockImplementation(async () => null);

      await cache.get("consumer_secret:nonexistent");

      expect(recordCacheOperationSpy).toHaveBeenCalledWith("miss", "redis");
    });

    it("should record cache miss when getStale returns null", async () => {
      mockClient.get.mockImplementation(async () => null);

      await cache.getStale("consumer_secret:nonexistent");

      expect(recordCacheOperationSpy).toHaveBeenCalledWith("miss", "redis");
    });

    it("should record cache miss on Redis error", async () => {
      mockClient.get.mockImplementation(async () => {
        throw new Error("Redis connection lost");
      });

      await cache.get("consumer_secret:error-key");

      expect(recordCacheOperationSpy).toHaveBeenCalledWith("miss", "redis");
    });

    it("should record cache miss on JSON parse error", async () => {
      mockClient.get.mockImplementation(async () => "invalid json {");

      await cache.get("consumer_secret:invalid-json");

      expect(recordCacheOperationSpy).toHaveBeenCalledWith("miss", "redis");
    });

    it("should record multiple cache misses", async () => {
      mockClient.get.mockImplementation(async () => null);

      await cache.get("consumer_secret:miss-1");
      await cache.get("consumer_secret:miss-2");

      expect(recordCacheOperationSpy).toHaveBeenCalledTimes(2);
      expect(recordCacheOperationSpy).toHaveBeenCalledWith("miss", "redis");
    });
  });

  describe("mixed hit and miss metrics", () => {
    const testValue: ConsumerSecret = {
      consumer: {
        id: "hit-consumer",
        username: "test@example.com",
        custom_id: "custom-123",
        created_at: 1234567890,
      },
      key: "test-key",
      secret: "test-secret",
    };

    it("should correctly record both hits and misses", async () => {
      let callCount = 0;
      mockClient.get.mockImplementation(async () => {
        callCount++;
        // First and third calls return data (hits), second returns null (miss)
        if (callCount === 1 || callCount === 3) {
          return JSON.stringify(testValue);
        }
        return null;
      });

      await cache.get("consumer_secret:hit-1");
      await cache.get("consumer_secret:miss-1");
      await cache.get("consumer_secret:hit-2");

      expect(recordCacheOperationSpy).toHaveBeenCalledTimes(3);

      const calls = recordCacheOperationSpy.mock.calls;
      expect(calls[0]).toEqual(["hit", "redis"]);
      expect(calls[1]).toEqual(["miss", "redis"]);
      expect(calls[2]).toEqual(["hit", "redis"]);
    });
  });

  describe("metrics tier parameter", () => {
    it("should always use redis tier for SharedRedisCache operations", async () => {
      const testValue: ConsumerSecret = {
        consumer: {
          id: "test-consumer",
          username: "test@example.com",
          custom_id: "custom-123",
          created_at: 1234567890,
        },
        key: "test-key",
        secret: "test-secret",
      };

      mockClient.get.mockImplementation(async () => JSON.stringify(testValue));

      await cache.get("consumer_secret:test");

      expect(recordCacheOperationSpy).toHaveBeenCalledWith("hit", "redis");
      expect(recordCacheOperationSpy).not.toHaveBeenCalledWith("hit", "kong");
      expect(recordCacheOperationSpy).not.toHaveBeenCalledWith("hit", "memory");
    });
  });
});
