/* test/bun/cache/shared-redis-cache-errors.test.ts */

import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import { RedisClient } from "bun";
import type { ConsumerSecret } from "../../../src/config/schemas";
import { SharedRedisCache } from "../../../src/services/cache/shared-redis-cache";

describe("SharedRedisCache Error Handling", () => {
  let cache: SharedRedisCache;
  let mockClient: any;

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

    spyOn(RedisClient.prototype, "connect").mockImplementation(mockClient.connect);
    spyOn(RedisClient.prototype, "send").mockImplementation(mockClient.send);
    spyOn(RedisClient.prototype, "get").mockImplementation(mockClient.get);
    spyOn(RedisClient.prototype, "set").mockImplementation(mockClient.set);
    spyOn(RedisClient.prototype, "expire").mockImplementation(mockClient.expire);
    spyOn(RedisClient.prototype, "del").mockImplementation(mockClient.del);
    spyOn(RedisClient.prototype, "close").mockImplementation(mockClient.close);

    await cache.connect();
  });

  afterEach(async () => {
    try {
      await cache.disconnect();
    } catch {}
  });

  describe("get operation errors", () => {
    it("should handle Redis get operation failure and return null", async () => {
      mockClient.get.mockImplementation(async () => {
        throw new Error("Redis connection lost");
      });

      const result = await cache.get("test-key");

      expect(result).toBeNull();
    });

    it("should handle Redis get operation with non-Error exception", async () => {
      mockClient.get.mockImplementation(async () => {
        throw "String error";
      });

      const result = await cache.get("test-key");

      expect(result).toBeNull();
    });

    it("should handle Redis get operation timeout", async () => {
      mockClient.get.mockImplementation(async () => {
        throw new Error("Operation timeout");
      });

      const result = await cache.get("timeout-key");

      expect(result).toBeNull();
    });

    it("should handle JSON parse errors gracefully", async () => {
      mockClient.get.mockImplementation(async () => "invalid json {");

      const result = await cache.get("invalid-json-key");

      expect(result).toBeNull();
    });
  });

  describe("set operation errors", () => {
    it("should handle Redis set operation failure silently", async () => {
      mockClient.set.mockImplementation(async () => {
        throw new Error("Redis write failed");
      });

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

      await expect(cache.set("test-key", testValue)).resolves.toBeUndefined();
    });

    it("should handle Redis set operation with non-Error exception", async () => {
      mockClient.set.mockImplementation(async () => {
        throw { message: "Object error" };
      });

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

      await expect(cache.set("test-key", testValue)).resolves.toBeUndefined();
    });

    it("should handle Redis expire operation failure during set", async () => {
      mockClient.set.mockImplementation(async () => {});
      mockClient.expire.mockImplementation(async () => {
        throw new Error("Expire command failed");
      });

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

      await expect(cache.set("test-key", testValue)).resolves.toBeUndefined();
    });

    it("should prevent cache pollution with mismatched consumer ID", async () => {
      const mismatchedValue: ConsumerSecret = {
        consumer: {
          id: "different-consumer-id",
          username: "test@example.com",
          custom_id: "custom-123",
          created_at: 1234567890,
        },
        key: "test-key",
        secret: "test-secret",
      };

      await cache.set("consumer_secret:expected-id", mismatchedValue);

      expect(mockClient.set).not.toHaveBeenCalled();
    });
  });

  describe("delete operation errors", () => {
    it("should handle Redis delete operation failure silently", async () => {
      mockClient.del.mockImplementation(async () => {
        throw new Error("Delete operation failed");
      });

      await expect(cache.delete("test-key")).resolves.toBeUndefined();
    });

    it("should handle Redis delete operation with non-Error exception", async () => {
      mockClient.del.mockImplementation(async () => {
        throw "Unknown error";
      });

      await expect(cache.delete("test-key")).resolves.toBeUndefined();
    });

    it("should handle Redis connection loss during delete", async () => {
      mockClient.del.mockImplementation(async () => {
        throw new Error("Connection closed");
      });

      await expect(cache.delete("connection-test")).resolves.toBeUndefined();
    });
  });

  describe("getStale operation errors", () => {
    it("should handle Redis getStale operation failure and return null", async () => {
      mockClient.get.mockImplementation(async (key: string) => {
        if (key.includes("stale")) {
          throw new Error("Stale cache access failed");
        }
        return null;
      });

      const result = await cache.getStale("test-key");

      expect(result).toBeNull();
    });

    it("should handle Redis getStale with non-Error exception", async () => {
      mockClient.get.mockImplementation(async (key: string) => {
        if (key.includes("stale")) {
          throw { code: "ERR_UNKNOWN" };
        }
        return null;
      });

      const result = await cache.getStale("test-key");

      expect(result).toBeNull();
    });

    it("should handle stale cache with invalid JSON", async () => {
      mockClient.get.mockImplementation(async (key: string) => {
        if (key.includes("stale")) {
          return "malformed json [";
        }
        return null;
      });

      const result = await cache.getStale("malformed-key");

      expect(result).toBeNull();
    });
  });

  describe("setStale operation errors", () => {
    it("should handle Redis setStale operation failure silently", async () => {
      let _callCount = 0;
      mockClient.set.mockImplementation(async (key: string) => {
        _callCount++;
        if (key.includes("stale")) {
          throw new Error("Stale cache write failed");
        }
      });

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

      await expect(cache.setStale("test-key", testValue)).resolves.toBeUndefined();
    });

    it("should handle Redis setStale with non-Error exception", async () => {
      mockClient.set.mockImplementation(async (key: string) => {
        if (key.includes("stale")) {
          throw new TypeError("Type error occurred");
        }
      });

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

      await expect(cache.setStale("test-key", testValue)).resolves.toBeUndefined();
    });

    it("should handle stale cache expire failure", async () => {
      mockClient.set.mockImplementation(async () => {});
      mockClient.expire.mockImplementation(async (key: string) => {
        if (key.includes("stale")) {
          throw new Error("Stale expire failed");
        }
      });

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

      await expect(cache.setStale("test-key", testValue)).resolves.toBeUndefined();
    });
  });

  describe("clear operation errors", () => {
    it("should handle Redis SCAN command failure during clear", async () => {
      mockClient.send.mockImplementation(async (cmd: string) => {
        if (cmd === "SCAN") {
          throw new Error("SCAN operation failed");
        }
        return ["0", []];
      });

      await expect(cache.clear()).resolves.toBeUndefined();
    });

    it("should handle Redis DEL command failure during clear", async () => {
      mockClient.send.mockImplementation(async (cmd: string) => {
        if (cmd === "SCAN") {
          return ["0", ["key1", "key2"]];
        }
        throw new Error("Should not reach here");
      });

      mockClient.del.mockImplementation(async () => {
        throw new Error("DEL operation failed");
      });

      await expect(cache.clear()).resolves.toBeUndefined();
    });
  });

  describe("clearStale operation errors", () => {
    it("should handle Redis SCAN failure during clearStale", async () => {
      mockClient.send.mockImplementation(async (cmd: string, args: string[]) => {
        if (cmd === "SCAN" && args[2]?.includes("stale")) {
          throw new Error("SCAN stale failed");
        }
        return ["0", []];
      });

      await expect(cache.clearStale()).resolves.toBeUndefined();
    });

    it("should handle Redis DEL failure during clearStale", async () => {
      mockClient.send.mockImplementation(async (cmd: string, args: string[]) => {
        if (cmd === "SCAN" && args[2]?.includes("stale")) {
          return ["0", ["stale_key1", "stale_key2"]];
        }
        return ["0", []];
      });

      mockClient.del.mockImplementation(async (...keys: string[]) => {
        if (keys.some((k) => k.includes("stale"))) {
          throw new Error("DEL stale failed");
        }
      });

      await expect(cache.clearStale()).resolves.toBeUndefined();
    });
  });

  describe("getStats operation errors", () => {
    it("should return default stats on Redis failure", async () => {
      mockClient.send.mockImplementation(async (cmd: string) => {
        if (cmd === "SCAN") {
          throw new Error("SCAN failed for stats");
        }
        return ["0", []];
      });

      const stats = await cache.getStats();

      expect(stats.strategy).toBe("shared-redis");
      expect(stats.size).toBe(0);
      expect(stats.primary.entries).toBe(0);
      expect(stats.activeEntries).toBe(0);
      expect(stats.hitRate).toBe("0.00");
      expect(stats.redisConnected).toBe(false);
      expect(stats.averageLatencyMs).toBe(0);
    });

    it("should handle TTL check failures during stats collection", async () => {
      mockClient.send.mockImplementation(async (cmd: string) => {
        if (cmd === "SCAN") {
          return ["0", ["key1", "key2", "key3"]];
        }
        if (cmd === "TTL") {
          throw new Error("TTL check failed");
        }
        return 0;
      });

      const stats = await cache.getStats();

      expect(stats.strategy).toBe("shared-redis");
      expect(stats.size).toBe(3);
      expect(stats.primary.entries).toBe(3);
    });
  });

  describe("connection error handling", () => {
    it("should handle Redis connection failure gracefully", async () => {
      const failingCache = new SharedRedisCache({
        url: "redis://invalid-host:6379",
        password: undefined,
        db: 0,
        ttlSeconds: 300,
        staleDataToleranceMinutes: 30,
      });

      const originalConnect = RedisClient.prototype.connect;
      spyOn(RedisClient.prototype, "connect").mockImplementation(async () => {
        throw new Error("Connection refused");
      });

      await expect(failingCache.connect()).rejects.toThrow("Connection refused");

      RedisClient.prototype.connect = originalConnect;
    });
  });
});
