/* test/bun/circuit-breaker.mutation.test.ts */

// Focused mutation testing for circuit-breaker.service.ts
// Tests specifically designed to kill surviving mutants

import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { CachingConfig, CircuitBreakerConfig, ConsumerSecret } from "../../src/config/schemas";
import { KongCircuitBreakerService } from "../../src/services/circuit-breaker.service";

describe("Circuit Breaker Mutation Tests", () => {
  let mockCache: any;

  const defaultCachingConfig: CachingConfig = {
    highAvailability: false,
    redisUrl: "redis://localhost:6379",
    redisPassword: undefined,
    redisDb: 0,
    ttlSeconds: 300,
    staleDataToleranceMinutes: 60,
  };

  beforeEach(() => {
    mockCache = {
      get: mock(() => Promise.resolve(null)),
      set: mock(() => Promise.resolve()),
      delete: mock(() => Promise.resolve()),
      clear: mock(() => Promise.resolve()),
      getStats: mock(() => Promise.resolve({})),
      getStale: mock(() => Promise.resolve(null)),
    };
  });

  describe("config.enabled boundary tests", () => {
    it("should bypass circuit breaker when disabled (enabled=false)", async () => {
      const config: CircuitBreakerConfig = {
        enabled: false,
        timeout: 1000,
        errorThresholdPercentage: 50,
        resetTimeout: 5000,
        rollingCountTimeout: 10000,
        rollingCountBuckets: 10,
        volumeThreshold: 3,
      };

      const service = new KongCircuitBreakerService(config, defaultCachingConfig, mockCache);
      let actionCalled = false;

      const result = await service.wrapKongOperation("test", async () => {
        actionCalled = true;
        return { data: "direct" };
      });

      expect(actionCalled).toBe(true);
      expect(result).toEqual({ data: "direct" });

      service.shutdown();
    });

    it("should use circuit breaker when enabled (enabled=true)", async () => {
      const config: CircuitBreakerConfig = {
        enabled: true,
        timeout: 1000,
        errorThresholdPercentage: 50,
        resetTimeout: 5000,
        rollingCountTimeout: 10000,
        rollingCountBuckets: 10,
        volumeThreshold: 3,
      };

      const service = new KongCircuitBreakerService(config, defaultCachingConfig, mockCache);

      const result = await service.wrapKongOperation("test", async () => {
        return { data: "through-breaker" };
      });

      expect(result).toEqual({ data: "through-breaker" });

      // Verify stats are tracked (proves circuit breaker was used)
      const stats = service.getStats();
      expect(stats).toHaveProperty("test");

      service.shutdown();
    });
  });

  describe("wrapKongConsumerOperation enabled check", () => {
    it("should bypass circuit breaker for consumer operations when disabled", async () => {
      const config: CircuitBreakerConfig = {
        enabled: false,
        timeout: 1000,
        errorThresholdPercentage: 50,
        resetTimeout: 5000,
        rollingCountTimeout: 10000,
        rollingCountBuckets: 10,
        volumeThreshold: 3,
      };

      const service = new KongCircuitBreakerService(config, defaultCachingConfig, mockCache);
      const consumerSecret: ConsumerSecret = {
        id: "test-id",
        key: "test-key",
        secret: "test-secret",
        consumer: { id: "consumer-123" },
      };

      const result = await service.wrapKongConsumerOperation(
        "getConsumerSecret",
        "consumer-123",
        async () => consumerSecret
      );

      expect(result).toEqual(consumerSecret);

      // Stats should be empty (no breaker created)
      const stats = service.getStats();
      expect(Object.keys(stats).length).toBe(0);

      service.shutdown();
    });
  });

  describe("highAvailability stale cache initialization", () => {
    it("should NOT create staleCache when highAvailability is true", () => {
      const config: CircuitBreakerConfig = {
        enabled: true,
        timeout: 1000,
        errorThresholdPercentage: 50,
        resetTimeout: 5000,
        rollingCountTimeout: 10000,
        rollingCountBuckets: 10,
        volumeThreshold: 3,
        highAvailability: true,
      };

      const service = new KongCircuitBreakerService(config, defaultCachingConfig, mockCache);

      // In HA mode, staleCache should be undefined
      expect((service as any).staleCache).toBeUndefined();

      service.shutdown();
    });

    it("should create staleCache when highAvailability is false", () => {
      const config: CircuitBreakerConfig = {
        enabled: true,
        timeout: 1000,
        errorThresholdPercentage: 50,
        resetTimeout: 5000,
        rollingCountTimeout: 10000,
        rollingCountBuckets: 10,
        volumeThreshold: 3,
        highAvailability: false,
      };

      const service = new KongCircuitBreakerService(config, defaultCachingConfig, mockCache);

      // In non-HA mode, staleCache should exist
      expect((service as any).staleCache).toBeDefined();
      expect((service as any).staleCache instanceof Map).toBe(true);

      service.shutdown();
    });
  });

  describe("getStaleData boundary conditions", () => {
    it("should return null when staleCache is undefined", () => {
      const config: CircuitBreakerConfig = {
        enabled: true,
        timeout: 1000,
        errorThresholdPercentage: 50,
        resetTimeout: 5000,
        rollingCountTimeout: 10000,
        rollingCountBuckets: 10,
        volumeThreshold: 3,
        highAvailability: true, // This makes staleCache undefined
      };

      const service = new KongCircuitBreakerService(config, defaultCachingConfig, mockCache);

      // Access private method via prototype
      const result = (service as any).getStaleData("any-key");

      expect(result).toBeNull();

      service.shutdown();
    });

    it("should return null when key not in cache", () => {
      const config: CircuitBreakerConfig = {
        enabled: true,
        timeout: 1000,
        errorThresholdPercentage: 50,
        resetTimeout: 5000,
        rollingCountTimeout: 10000,
        rollingCountBuckets: 10,
        volumeThreshold: 3,
      };

      const service = new KongCircuitBreakerService(config, defaultCachingConfig, mockCache);

      const result = (service as any).getStaleData("nonexistent-key");

      expect(result).toBeNull();

      service.shutdown();
    });

    it("should delete expired stale data and return null", () => {
      const config: CircuitBreakerConfig = {
        enabled: true,
        timeout: 1000,
        errorThresholdPercentage: 50,
        resetTimeout: 5000,
        rollingCountTimeout: 10000,
        rollingCountBuckets: 10,
        volumeThreshold: 3,
      };

      // Use very short tolerance to ensure data is expired
      const cachingConfig: CachingConfig = {
        ...defaultCachingConfig,
        staleDataToleranceMinutes: 0, // 0 minutes = expired immediately
      };

      const service = new KongCircuitBreakerService(config, cachingConfig, mockCache);

      // Manually add expired data (1 hour ago)
      const expiredData: ConsumerSecret = {
        id: "expired-id",
        key: "expired-key",
        secret: "expired-secret",
        consumer: { id: "expired-consumer" },
      };

      (service as any).staleCache.set("expired-key", {
        data: expiredData,
        timestamp: Date.now() - 3600000, // 1 hour ago
      });

      const result = (service as any).getStaleData("expired-key");

      expect(result).toBeNull();
      // Verify it was deleted
      expect((service as any).staleCache.has("expired-key")).toBe(false);

      service.shutdown();
    });

    it("should return valid stale data when not expired", () => {
      const config: CircuitBreakerConfig = {
        enabled: true,
        timeout: 1000,
        errorThresholdPercentage: 50,
        resetTimeout: 5000,
        rollingCountTimeout: 10000,
        rollingCountBuckets: 10,
        volumeThreshold: 3,
      };

      const service = new KongCircuitBreakerService(config, defaultCachingConfig, mockCache);

      const validData: ConsumerSecret = {
        id: "valid-id",
        key: "valid-key",
        secret: "valid-secret",
        consumer: { id: "valid-consumer" },
      };

      const timestamp = Date.now(); // Current time (not expired)
      (service as any).staleCache.set("valid-key", {
        data: validData,
        timestamp,
      });

      const result = (service as any).getStaleData("valid-key");

      expect(result).not.toBeNull();
      expect(result.data).toEqual(validData);
      expect(result.timestamp).toBe(timestamp);

      service.shutdown();
    });
  });

  describe("updateStaleCache conditions", () => {
    it("should only update cache when staleCache exists", () => {
      const config: CircuitBreakerConfig = {
        enabled: true,
        timeout: 1000,
        errorThresholdPercentage: 50,
        resetTimeout: 5000,
        rollingCountTimeout: 10000,
        rollingCountBuckets: 10,
        volumeThreshold: 3,
      };

      const service = new KongCircuitBreakerService(config, defaultCachingConfig, mockCache);

      const data: ConsumerSecret = {
        id: "test-id",
        key: "test-key",
        secret: "test-secret",
        consumer: { id: "consumer-123" },
      };

      (service as any).updateStaleCache("test-cache-key", data);

      const cached = (service as any).staleCache.get("test-cache-key");
      expect(cached).not.toBeNull();
      expect(cached.data).toEqual(data);
      expect(typeof cached.timestamp).toBe("number");

      service.shutdown();
    });

    it("should not throw when staleCache is undefined (HA mode)", () => {
      const config: CircuitBreakerConfig = {
        enabled: true,
        timeout: 1000,
        errorThresholdPercentage: 50,
        resetTimeout: 5000,
        rollingCountTimeout: 10000,
        rollingCountBuckets: 10,
        volumeThreshold: 3,
        highAvailability: true,
      };

      const service = new KongCircuitBreakerService(config, defaultCachingConfig, mockCache);

      const data: ConsumerSecret = {
        id: "test-id",
        key: "test-key",
        secret: "test-secret",
        consumer: { id: "consumer-123" },
      };

      // Should not throw
      expect(() => {
        (service as any).updateStaleCache("test-cache-key", data);
      }).not.toThrow();

      service.shutdown();
    });
  });

  describe("consumer ID mismatch detection", () => {
    it("should return null when Kong response consumer ID mismatches request", async () => {
      const config: CircuitBreakerConfig = {
        enabled: true,
        timeout: 1000,
        errorThresholdPercentage: 50,
        resetTimeout: 5000,
        rollingCountTimeout: 10000,
        rollingCountBuckets: 10,
        volumeThreshold: 3,
      };

      const service = new KongCircuitBreakerService(config, defaultCachingConfig, mockCache);

      // Action returns data with different consumer ID
      const result = await service.wrapKongConsumerOperation(
        "getConsumerSecret",
        "requested-consumer-id",
        async () => ({
          id: "test-id",
          key: "test-key",
          secret: "test-secret",
          consumer: { id: "different-consumer-id" }, // Mismatch!
        })
      );

      expect(result).toBeNull();

      service.shutdown();
    });

    it("should cache data when consumer IDs match", async () => {
      const config: CircuitBreakerConfig = {
        enabled: true,
        timeout: 1000,
        errorThresholdPercentage: 50,
        resetTimeout: 5000,
        rollingCountTimeout: 10000,
        rollingCountBuckets: 10,
        volumeThreshold: 3,
      };

      const service = new KongCircuitBreakerService(config, defaultCachingConfig, mockCache);

      const consumerId = "matching-consumer-id";
      const consumerSecret: ConsumerSecret = {
        id: "test-id",
        key: "test-key",
        secret: "test-secret",
        consumer: { id: consumerId }, // Matches!
      };

      const result = await service.wrapKongConsumerOperation(
        "getConsumerSecret",
        consumerId,
        async () => consumerSecret
      );

      expect(result).toEqual(consumerSecret);

      // Verify data was cached
      const cacheKey = `consumer_secret:${consumerId}`;
      const cached = (service as any).staleCache.get(cacheKey);
      expect(cached).not.toBeNull();
      expect(cached.data).toEqual(consumerSecret);

      service.shutdown();
    });
  });

  describe("stale cache deletion on null result", () => {
    it("should delete stale cache entry when result is null", async () => {
      const config: CircuitBreakerConfig = {
        enabled: true,
        timeout: 1000,
        errorThresholdPercentage: 50,
        resetTimeout: 5000,
        rollingCountTimeout: 10000,
        rollingCountBuckets: 10,
        volumeThreshold: 3,
      };

      const service = new KongCircuitBreakerService(config, defaultCachingConfig, mockCache);

      const consumerId = "consumer-to-delete";
      const cacheKey = `consumer_secret:${consumerId}`;

      // Pre-populate cache
      const oldData: ConsumerSecret = {
        id: "old-id",
        key: "old-key",
        secret: "old-secret",
        consumer: { id: consumerId },
      };
      (service as any).staleCache.set(cacheKey, {
        data: oldData,
        timestamp: Date.now(),
      });

      // Verify data exists before
      expect((service as any).staleCache.has(cacheKey)).toBe(true);

      // Action returns null
      await service.wrapKongConsumerOperation("getConsumerSecret", consumerId, async () => null);

      // Verify data was deleted
      expect((service as any).staleCache.has(cacheKey)).toBe(false);

      service.shutdown();
    });
  });

  describe("getStats state detection", () => {
    it("should detect closed state correctly", async () => {
      const config: CircuitBreakerConfig = {
        enabled: true,
        timeout: 1000,
        errorThresholdPercentage: 50,
        resetTimeout: 5000,
        rollingCountTimeout: 10000,
        rollingCountBuckets: 10,
        volumeThreshold: 3,
      };

      const service = new KongCircuitBreakerService(config, defaultCachingConfig, mockCache);

      // Perform successful operation
      await service.wrapKongOperation("test-op", async () => ({ success: true }));

      const stats = service.getStats();
      expect(stats["test-op"].state).toBe("closed");

      service.shutdown();
    });

    it("should detect open state after failures", async () => {
      const config: CircuitBreakerConfig = {
        enabled: true,
        timeout: 1000,
        errorThresholdPercentage: 50,
        resetTimeout: 5000,
        rollingCountTimeout: 10000,
        rollingCountBuckets: 10,
        volumeThreshold: 1, // Low threshold for quick open
      };

      const service = new KongCircuitBreakerService(config, defaultCachingConfig, mockCache);

      // Fail enough times to open circuit
      for (let i = 0; i < 5; i++) {
        try {
          await service.wrapKongOperation("failing-op", async () => {
            throw new Error("Failure");
          });
        } catch {
          /* intentionally swallowed */
        }
      }

      const stats = service.getStats();
      expect(stats["failing-op"].state).toBe("open");

      service.shutdown();
    });
  });

  describe("clearStaleCache behavior", () => {
    it("should clear in-memory cache in non-HA mode", () => {
      const config: CircuitBreakerConfig = {
        enabled: true,
        timeout: 1000,
        errorThresholdPercentage: 50,
        resetTimeout: 5000,
        rollingCountTimeout: 10000,
        rollingCountBuckets: 10,
        volumeThreshold: 3,
        highAvailability: false,
      };

      const service = new KongCircuitBreakerService(config, defaultCachingConfig, mockCache);

      // Add data to cache
      (service as any).staleCache.set("key1", { data: {}, timestamp: Date.now() });
      (service as any).staleCache.set("key2", { data: {}, timestamp: Date.now() });

      expect((service as any).staleCache.size).toBe(2);

      service.clearStaleCache();

      expect((service as any).staleCache.size).toBe(0);

      service.shutdown();
    });

    it("should not throw in HA mode when staleCache is undefined", () => {
      const config: CircuitBreakerConfig = {
        enabled: true,
        timeout: 1000,
        errorThresholdPercentage: 50,
        resetTimeout: 5000,
        rollingCountTimeout: 10000,
        rollingCountBuckets: 10,
        volumeThreshold: 3,
        highAvailability: true,
      };

      const service = new KongCircuitBreakerService(config, defaultCachingConfig, mockCache);

      expect((service as any).staleCache).toBeUndefined();

      // Should not throw
      expect(() => service.clearStaleCache()).not.toThrow();

      service.shutdown();
    });
  });

  describe("getStaleDataInfo behavior", () => {
    it("should return empty array when staleCache is undefined", () => {
      const config: CircuitBreakerConfig = {
        enabled: true,
        timeout: 1000,
        errorThresholdPercentage: 50,
        resetTimeout: 5000,
        rollingCountTimeout: 10000,
        rollingCountBuckets: 10,
        volumeThreshold: 3,
        highAvailability: true, // No staleCache
      };

      const service = new KongCircuitBreakerService(config, defaultCachingConfig, mockCache);

      const info = service.getStaleDataInfo();

      expect(Array.isArray(info)).toBe(true);
      expect(info.length).toBe(0);

      service.shutdown();
    });

    it("should return correct age in minutes for cached items", () => {
      const config: CircuitBreakerConfig = {
        enabled: true,
        timeout: 1000,
        errorThresholdPercentage: 50,
        resetTimeout: 5000,
        rollingCountTimeout: 10000,
        rollingCountBuckets: 10,
        volumeThreshold: 3,
      };

      const service = new KongCircuitBreakerService(config, defaultCachingConfig, mockCache);

      // Add items with known timestamps
      const now = Date.now();
      const twoMinutesAgo = now - 2 * 60 * 1000;
      const fiveMinutesAgo = now - 5 * 60 * 1000;

      (service as any).staleCache.set("recent", { data: {}, timestamp: twoMinutesAgo });
      (service as any).staleCache.set("older", { data: {}, timestamp: fiveMinutesAgo });

      const info = service.getStaleDataInfo();

      expect(info.length).toBe(2);

      const recentItem = info.find((i) => i.key === "recent");
      const olderItem = info.find((i) => i.key === "older");

      expect(recentItem).toBeDefined();
      expect(olderItem).toBeDefined();
      expect(recentItem!.ageMinutes).toBeGreaterThanOrEqual(1);
      expect(recentItem!.ageMinutes).toBeLessThanOrEqual(3);
      expect(olderItem!.ageMinutes).toBeGreaterThanOrEqual(4);
      expect(olderItem!.ageMinutes).toBeLessThanOrEqual(6);

      service.shutdown();
    });
  });

  describe("shutdown cleanup", () => {
    it("should shutdown all breakers and clear caches", async () => {
      const config: CircuitBreakerConfig = {
        enabled: true,
        timeout: 1000,
        errorThresholdPercentage: 50,
        resetTimeout: 5000,
        rollingCountTimeout: 10000,
        rollingCountBuckets: 10,
        volumeThreshold: 3,
      };

      const service = new KongCircuitBreakerService(config, defaultCachingConfig, mockCache);

      // Create some breakers
      await service.wrapKongOperation("op1", async () => ({}));
      await service.wrapKongOperation("op2", async () => ({}));

      // Add some stale cache
      (service as any).staleCache.set("key1", { data: {}, timestamp: Date.now() });

      const statsBefore = service.getStats();
      expect(Object.keys(statsBefore).length).toBe(2);
      expect((service as any).staleCache.size).toBe(1);

      service.shutdown();

      // After shutdown, breakers should be cleared
      expect((service as any).breakers.size).toBe(0);
      expect((service as any).staleCache.size).toBe(0);
    });
  });

  describe("fallback strategy: graceful_degradation switch cases", () => {
    it("should return healthCheck degradation response for healthCheck operation", async () => {
      const config: CircuitBreakerConfig = {
        enabled: true,
        timeout: 100,
        errorThresholdPercentage: 50,
        resetTimeout: 100,
        rollingCountTimeout: 1000,
        rollingCountBuckets: 10,
        volumeThreshold: 1,
        operations: {
          healthCheck: {
            timeout: 100,
            errorThresholdPercentage: 50,
            resetTimeout: 100,
            fallbackStrategy: "graceful_degradation",
          },
        },
      };

      const service = new KongCircuitBreakerService(config, defaultCachingConfig, mockCache);

      // Force circuit to open
      for (let i = 0; i < 5; i++) {
        try {
          await service.wrapKongOperation("healthCheck", async () => {
            throw new Error("Health check failed");
          });
        } catch {
          /* intentionally swallowed */
        }
      }

      // Request when circuit is open should return degradation response
      const result = await service.wrapKongOperation("healthCheck", async () => {
        throw new Error("Still failing");
      });

      expect(result).toEqual({
        healthy: false,
        responseTime: 0,
        error: "Circuit breaker open - Kong Admin API unavailable",
      });

      service.shutdown();
    });

    it("should return generic degradation response for unknown operations", async () => {
      const config: CircuitBreakerConfig = {
        enabled: true,
        timeout: 100,
        errorThresholdPercentage: 50,
        resetTimeout: 100,
        rollingCountTimeout: 1000,
        rollingCountBuckets: 10,
        volumeThreshold: 1,
        operations: {
          unknownOp: {
            timeout: 100,
            errorThresholdPercentage: 50,
            resetTimeout: 100,
            fallbackStrategy: "graceful_degradation",
          },
        },
      };

      const service = new KongCircuitBreakerService(config, defaultCachingConfig, mockCache);

      // Force circuit to open
      for (let i = 0; i < 5; i++) {
        try {
          await service.wrapKongOperation("unknownOp", async () => {
            throw new Error("Operation failed");
          });
        } catch {
          /* intentionally swallowed */
        }
      }

      const result = await service.wrapKongOperation("unknownOp", async () => {
        throw new Error("Still failing");
      });

      expect(result).toHaveProperty("status", "degraded");
      expect(result).toHaveProperty("message", "Service temporarily unavailable");
      expect(result).toHaveProperty("operation", "unknownOp");
      expect(result).toHaveProperty("timestamp");

      service.shutdown();
    });
  });

  describe("handleOpenCircuit with fallbackData", () => {
    it("should use provided fallbackData when available", async () => {
      const config: CircuitBreakerConfig = {
        enabled: true,
        timeout: 100,
        errorThresholdPercentage: 50,
        resetTimeout: 100,
        rollingCountTimeout: 1000,
        rollingCountBuckets: 10,
        volumeThreshold: 1,
        operations: {
          testOp: {
            timeout: 100,
            errorThresholdPercentage: 50,
            resetTimeout: 100,
            fallbackStrategy: "cache", // Not deny, not graceful_degradation
          },
        },
      };

      const service = new KongCircuitBreakerService(config, defaultCachingConfig, mockCache);

      // Force circuit to open
      for (let i = 0; i < 5; i++) {
        try {
          await service.wrapKongOperation("testOp", async () => {
            throw new Error("Failure");
          });
        } catch {
          /* intentionally swallowed */
        }
      }

      const fallback = { fromFallback: true };
      const result = await service.wrapKongOperation(
        "testOp",
        async () => {
          throw new Error("Still failing");
        },
        fallback
      );

      expect(result).toEqual(fallback);

      service.shutdown();
    });

    it("should return null when fallback is undefined and strategy is cache", async () => {
      const config: CircuitBreakerConfig = {
        enabled: true,
        timeout: 100,
        errorThresholdPercentage: 50,
        resetTimeout: 100,
        rollingCountTimeout: 1000,
        rollingCountBuckets: 10,
        volumeThreshold: 1,
        operations: {
          noFallbackOp: {
            timeout: 100,
            errorThresholdPercentage: 50,
            resetTimeout: 100,
            fallbackStrategy: "cache",
          },
        },
      };

      const service = new KongCircuitBreakerService(config, defaultCachingConfig, mockCache);

      // Force circuit to open
      for (let i = 0; i < 5; i++) {
        try {
          await service.wrapKongOperation("noFallbackOp", async () => {
            throw new Error("Failure");
          });
        } catch {
          /* intentionally swallowed */
        }
      }

      // No fallback provided
      const result = await service.wrapKongOperation("noFallbackOp", async () => {
        throw new Error("Still failing");
      });

      expect(result).toBeNull();

      service.shutdown();
    });
  });

  describe("handleOpenCircuitWithStaleData cache pollution detection", () => {
    it("should detect and reject cache pollution in in-memory cache", async () => {
      const config: CircuitBreakerConfig = {
        enabled: true,
        timeout: 100,
        errorThresholdPercentage: 50,
        resetTimeout: 100,
        rollingCountTimeout: 1000,
        rollingCountBuckets: 10,
        volumeThreshold: 1,
        highAvailability: false,
        operations: {
          getConsumerSecret: {
            timeout: 100,
            errorThresholdPercentage: 50,
            resetTimeout: 100,
            fallbackStrategy: "cache",
          },
        },
      };

      const service = new KongCircuitBreakerService(config, defaultCachingConfig, mockCache);

      const requestedConsumerId = "requested-consumer-123";
      const cachedConsumerId = "cached-consumer-456"; // Different!
      const cacheKey = `consumer_secret:${requestedConsumerId}`;

      // Pre-populate cache with polluted data (wrong consumer ID)
      const pollutedData: ConsumerSecret = {
        id: "test-id",
        key: "test-key",
        secret: "test-secret",
        consumer: { id: cachedConsumerId },
      };
      (service as any).staleCache.set(cacheKey, {
        data: pollutedData,
        timestamp: Date.now(),
      });

      // Force circuit to open
      for (let i = 0; i < 5; i++) {
        try {
          await service.wrapKongConsumerOperation(
            "getConsumerSecret",
            requestedConsumerId,
            async () => {
              throw new Error("Kong unavailable");
            }
          );
        } catch {
          /* intentionally swallowed */
        }
      }

      // Request with open circuit - should detect pollution and return null
      const result = await service.wrapKongConsumerOperation(
        "getConsumerSecret",
        requestedConsumerId,
        async () => {
          throw new Error("Still unavailable");
        }
      );

      expect(result).toBeNull();

      // Polluted cache should be deleted
      expect((service as any).staleCache.has(cacheKey)).toBe(false);

      service.shutdown();
    });
  });

  describe("Redis stale cache fallback (HA mode)", () => {
    it("should use Redis stale cache when available in HA mode", async () => {
      const config: CircuitBreakerConfig = {
        enabled: true,
        timeout: 100,
        errorThresholdPercentage: 50,
        resetTimeout: 100,
        rollingCountTimeout: 1000,
        rollingCountBuckets: 10,
        volumeThreshold: 1,
        highAvailability: true,
        operations: {
          getConsumerSecret: {
            timeout: 100,
            errorThresholdPercentage: 50,
            resetTimeout: 100,
            fallbackStrategy: "cache",
          },
        },
      };

      const consumerId = "ha-consumer-123";
      const staleData: ConsumerSecret = {
        id: "stale-id",
        key: "stale-key",
        secret: "stale-secret",
        consumer: { id: consumerId },
      };

      // Mock cache with getStale that returns data
      const haCache = {
        ...mockCache,
        getStale: mock(() => Promise.resolve(staleData)),
      };

      const service = new KongCircuitBreakerService(config, defaultCachingConfig, haCache);

      // Force circuit to open
      for (let i = 0; i < 5; i++) {
        try {
          await service.wrapKongConsumerOperation("getConsumerSecret", consumerId, async () => {
            throw new Error("Kong unavailable");
          });
        } catch {
          /* intentionally swallowed */
        }
      }

      // Should return Redis stale data
      const result = await service.wrapKongConsumerOperation(
        "getConsumerSecret",
        consumerId,
        async () => {
          throw new Error("Still unavailable");
        }
      );

      expect(result).toEqual(staleData);
      expect(haCache.getStale).toHaveBeenCalled();

      service.shutdown();
    });

    it("should detect cache pollution in Redis stale data", async () => {
      const config: CircuitBreakerConfig = {
        enabled: true,
        timeout: 100,
        errorThresholdPercentage: 50,
        resetTimeout: 100,
        rollingCountTimeout: 1000,
        rollingCountBuckets: 10,
        volumeThreshold: 1,
        highAvailability: true,
        operations: {
          getConsumerSecret: {
            timeout: 100,
            errorThresholdPercentage: 50,
            resetTimeout: 100,
            fallbackStrategy: "cache",
          },
        },
      };

      const requestedConsumerId = "requested-consumer-ha";
      const pollutedData: ConsumerSecret = {
        id: "polluted-id",
        key: "polluted-key",
        secret: "polluted-secret",
        consumer: { id: "wrong-consumer-id" }, // Mismatch!
      };

      const haCache = {
        ...mockCache,
        getStale: mock(() => Promise.resolve(pollutedData)),
      };

      const service = new KongCircuitBreakerService(config, defaultCachingConfig, haCache);

      // Force circuit to open
      for (let i = 0; i < 5; i++) {
        try {
          await service.wrapKongConsumerOperation(
            "getConsumerSecret",
            requestedConsumerId,
            async () => {
              throw new Error("Kong unavailable");
            }
          );
        } catch {
          /* intentionally swallowed */
        }
      }

      // Should detect pollution and return null
      const result = await service.wrapKongConsumerOperation(
        "getConsumerSecret",
        requestedConsumerId,
        async () => {
          throw new Error("Still unavailable");
        }
      );

      expect(result).toBeNull();

      service.shutdown();
    });

    it("should handle Redis stale cache access error gracefully", async () => {
      const config: CircuitBreakerConfig = {
        enabled: true,
        timeout: 100,
        errorThresholdPercentage: 50,
        resetTimeout: 100,
        rollingCountTimeout: 1000,
        rollingCountBuckets: 10,
        volumeThreshold: 1,
        highAvailability: true,
        operations: {
          getConsumerSecret: {
            timeout: 100,
            errorThresholdPercentage: 50,
            resetTimeout: 100,
            fallbackStrategy: "cache",
          },
        },
      };

      const haCache = {
        ...mockCache,
        getStale: mock(() => Promise.reject(new Error("Redis connection failed"))),
      };

      const service = new KongCircuitBreakerService(config, defaultCachingConfig, haCache);

      // Force circuit to open
      for (let i = 0; i < 5; i++) {
        try {
          await service.wrapKongConsumerOperation("getConsumerSecret", "consumer-123", async () => {
            throw new Error("Kong unavailable");
          });
        } catch {
          /* intentionally swallowed */
        }
      }

      // Should handle Redis error gracefully and return null
      const result = await service.wrapKongConsumerOperation(
        "getConsumerSecret",
        "consumer-123",
        async () => {
          throw new Error("Still unavailable");
        }
      );

      expect(result).toBeNull();

      service.shutdown();
    });
  });

  describe("operation config fallback to defaults", () => {
    it("should use global timeout when operation-specific is not set", async () => {
      const config: CircuitBreakerConfig = {
        enabled: true,
        timeout: 2000, // Global timeout
        errorThresholdPercentage: 50,
        resetTimeout: 5000,
        rollingCountTimeout: 10000,
        rollingCountBuckets: 10,
        volumeThreshold: 3,
        // No operations specified
      };

      const service = new KongCircuitBreakerService(config, defaultCachingConfig, mockCache);

      // Use an operation not in defaults
      await service.wrapKongOperation("customOperation", async () => ({ data: "test" }));

      const stats = service.getStats();
      expect(stats).toHaveProperty("customOperation");

      service.shutdown();
    });

    it("should merge operation overrides with existing defaults", async () => {
      const config: CircuitBreakerConfig = {
        enabled: true,
        timeout: 1000,
        errorThresholdPercentage: 50,
        resetTimeout: 5000,
        rollingCountTimeout: 10000,
        rollingCountBuckets: 10,
        volumeThreshold: 3,
        operations: {
          getConsumerSecret: {
            timeout: 5000, // Override only timeout
            // Other settings should come from defaults
          },
        },
      };

      const service = new KongCircuitBreakerService(config, defaultCachingConfig, mockCache);

      // The merged config should have both override and defaults
      const opConfig = (service as any).operationConfigs.get("getConsumerSecret");
      expect(opConfig).toBeDefined();
      expect(opConfig.timeout).toBe(5000); // Overridden
      expect(opConfig.fallbackStrategy).toBe("cache"); // From default

      service.shutdown();
    });
  });
});
