/* test/bun/cache/cache-ha-fallback-chain.test.ts */

import { describe, expect, it, mock } from "bun:test";
import type {
  CachingConfig,
  CircuitBreakerConfig,
  ConsumerSecret,
  IKongCacheService,
} from "../../../src/config/schemas";
import { KongCircuitBreakerService } from "../../../src/services/circuit-breaker.service";

describe("HA Fallback Chain Tests", () => {
  const consumerSecret: ConsumerSecret = {
    id: "test-secret-id",
    key: "test-key",
    secret: "test-secret",
    consumer: { id: "consumer-123", username: "test-consumer" },
  };

  const haConfig: CircuitBreakerConfig = {
    enabled: true,
    timeout: 100,
    errorThresholdPercentage: 50,
    resetTimeout: 100,
    rollingCountTimeout: 1000,
    rollingCountBuckets: 10,
    volumeThreshold: 1,
    highAvailability: true,
  };

  const nonHaConfig: CircuitBreakerConfig = {
    ...haConfig,
    highAvailability: false,
  };

  const cachingConfig: CachingConfig = {
    highAvailability: true,
    redisUrl: "redis://localhost:6379",
    redisPassword: undefined,
    redisDb: 0,
    ttlSeconds: 300,
    staleDataToleranceMinutes: 60,
  };

  describe("Redis Primary -> Redis Stale -> In-Memory Fallback chain", () => {
    it("should use in-memory fallback when Redis stale returns null in HA mode", async () => {
      // Mock Redis cache that has no stale data
      const mockCache: IKongCacheService = {
        get: mock(() => Promise.resolve(null)),
        set: mock(() => Promise.resolve()),
        delete: mock(() => Promise.resolve()),
        clear: mock(() => Promise.resolve()),
        getStats: mock(() => Promise.resolve({})),
        getStale: mock(() => Promise.resolve(null)), // Redis stale returns null
      };

      const service = new KongCircuitBreakerService(haConfig, cachingConfig, mockCache);

      // Pre-populate in-memory stale cache (simulating lazy population)
      const cacheKey = "consumer_secret:consumer-123";
      (service as any).staleCache.set(cacheKey, {
        data: consumerSecret,
        timestamp: Date.now(),
      });

      // Force circuit to open by failing multiple times
      for (let i = 0; i < 5; i++) {
        try {
          await service.wrapKongConsumerOperation("getConsumerSecret", "consumer-123", async () => {
            throw new Error("Kong unavailable");
          });
        } catch {
          // Expected failure
        }
      }

      // Circuit should now be open, should fall back to in-memory
      const result = await service.wrapKongConsumerOperation(
        "getConsumerSecret",
        "consumer-123",
        async () => {
          throw new Error("Kong unavailable");
        }
      );

      expect(result).toEqual(consumerSecret);
      // Verify Redis stale was called first
      expect(mockCache.getStale).toHaveBeenCalled();

      service.shutdown();
    });

    it("should use in-memory fallback when Redis stale throws error in HA mode", async () => {
      // Mock Redis cache that throws error on stale access
      const mockCache: IKongCacheService = {
        get: mock(() => Promise.resolve(null)),
        set: mock(() => Promise.resolve()),
        delete: mock(() => Promise.resolve()),
        clear: mock(() => Promise.resolve()),
        getStats: mock(() => Promise.resolve({})),
        getStale: mock(() => Promise.reject(new Error("Redis connection failed"))),
      };

      const service = new KongCircuitBreakerService(haConfig, cachingConfig, mockCache);

      // Pre-populate in-memory stale cache
      const cacheKey = "consumer_secret:consumer-123";
      (service as any).staleCache.set(cacheKey, {
        data: consumerSecret,
        timestamp: Date.now(),
      });

      // Force circuit to open
      for (let i = 0; i < 5; i++) {
        try {
          await service.wrapKongConsumerOperation("getConsumerSecret", "consumer-123", async () => {
            throw new Error("Kong unavailable");
          });
        } catch {
          // Expected failure
        }
      }

      // Circuit should now be open, Redis stale should fail, should fall back to in-memory
      const result = await service.wrapKongConsumerOperation(
        "getConsumerSecret",
        "consumer-123",
        async () => {
          throw new Error("Kong unavailable");
        }
      );

      expect(result).toEqual(consumerSecret);

      service.shutdown();
    });

    it("should return null when all fallbacks are exhausted in HA mode", async () => {
      // Mock Redis cache with no stale data
      const mockCache: IKongCacheService = {
        get: mock(() => Promise.resolve(null)),
        set: mock(() => Promise.resolve()),
        delete: mock(() => Promise.resolve()),
        clear: mock(() => Promise.resolve()),
        getStats: mock(() => Promise.resolve({})),
        getStale: mock(() => Promise.resolve(null)),
      };

      const service = new KongCircuitBreakerService(haConfig, cachingConfig, mockCache);

      // Do NOT pre-populate in-memory stale cache - testing complete failure

      // Force circuit to open
      for (let i = 0; i < 5; i++) {
        try {
          await service.wrapKongConsumerOperation("getConsumerSecret", "consumer-123", async () => {
            throw new Error("Kong unavailable");
          });
        } catch {
          // Expected failure
        }
      }

      // Circuit open, no Redis stale, no in-memory fallback -> should return null
      const result = await service.wrapKongConsumerOperation(
        "getConsumerSecret",
        "consumer-123",
        async () => {
          throw new Error("Kong unavailable");
        }
      );

      expect(result).toBeNull();

      service.shutdown();
    });
  });

  describe("Consumer ID validation at in-memory tier in HA mode", () => {
    it("should reject in-memory stale data with mismatched consumer ID in HA mode", async () => {
      const mockCache: IKongCacheService = {
        get: mock(() => Promise.resolve(null)),
        set: mock(() => Promise.resolve()),
        delete: mock(() => Promise.resolve()),
        clear: mock(() => Promise.resolve()),
        getStats: mock(() => Promise.resolve({})),
        getStale: mock(() => Promise.resolve(null)),
      };

      const service = new KongCircuitBreakerService(haConfig, cachingConfig, mockCache);

      // Pre-populate in-memory stale cache with DIFFERENT consumer ID
      const cacheKey = "consumer_secret:consumer-123";
      const wrongConsumerSecret: ConsumerSecret = {
        id: "test-secret-id",
        key: "test-key",
        secret: "test-secret",
        consumer: { id: "different-consumer-999", username: "wrong-consumer" },
      };

      (service as any).staleCache.set(cacheKey, {
        data: wrongConsumerSecret,
        timestamp: Date.now(),
      });

      // Force circuit to open
      for (let i = 0; i < 5; i++) {
        try {
          await service.wrapKongConsumerOperation("getConsumerSecret", "consumer-123", async () => {
            throw new Error("Kong unavailable");
          });
        } catch {
          // Expected failure
        }
      }

      // Circuit open, Redis stale returns null, in-memory has wrong consumer ID
      const result = await service.wrapKongConsumerOperation(
        "getConsumerSecret",
        "consumer-123",
        async () => {
          throw new Error("Kong unavailable");
        }
      );

      // Should return null due to consumer ID mismatch
      expect(result).toBeNull();

      // Verify the polluted cache entry was removed
      expect((service as any).staleCache.has(cacheKey)).toBe(false);

      service.shutdown();
    });
  });

  describe("Lazy population of in-memory cache in HA mode", () => {
    it("should populate in-memory stale cache on successful Kong operation in HA mode", async () => {
      const mockCache: IKongCacheService = {
        get: mock(() => Promise.resolve(null)),
        set: mock(() => Promise.resolve()),
        delete: mock(() => Promise.resolve()),
        clear: mock(() => Promise.resolve()),
        getStats: mock(() => Promise.resolve({})),
        getStale: mock(() => Promise.resolve(null)),
      };

      const service = new KongCircuitBreakerService(haConfig, cachingConfig, mockCache);

      // In-memory cache should be empty initially
      expect((service as any).staleCache.size).toBe(0);

      // Successful operation should populate in-memory stale cache
      const result = await service.wrapKongConsumerOperation(
        "getConsumerSecret",
        "consumer-123",
        async () => consumerSecret
      );

      expect(result).toEqual(consumerSecret);

      // Verify in-memory stale cache was populated
      const cacheKey = "consumer_secret:consumer-123";
      expect((service as any).staleCache.has(cacheKey)).toBe(true);

      const cachedData = (service as any).staleCache.get(cacheKey);
      expect(cachedData.data).toEqual(consumerSecret);

      service.shutdown();
    });

    it("should not populate in-memory stale cache on failed operation", async () => {
      const mockCache: IKongCacheService = {
        get: mock(() => Promise.resolve(null)),
        set: mock(() => Promise.resolve()),
        delete: mock(() => Promise.resolve()),
        clear: mock(() => Promise.resolve()),
        getStats: mock(() => Promise.resolve({})),
        getStale: mock(() => Promise.resolve(null)),
      };

      const service = new KongCircuitBreakerService(haConfig, cachingConfig, mockCache);

      // Try operation that returns null (consumer not found)
      const result = await service.wrapKongConsumerOperation(
        "getConsumerSecret",
        "consumer-123",
        async () => null
      );

      expect(result).toBeNull();

      // In-memory cache should NOT be populated
      const cacheKey = "consumer_secret:consumer-123";
      expect((service as any).staleCache.has(cacheKey)).toBe(false);

      service.shutdown();
    });
  });

  describe("LRU eviction for in-memory stale cache", () => {
    it("should evict oldest entries when maxStaleEntries is exceeded", async () => {
      const mockCache: IKongCacheService = {
        get: mock(() => Promise.resolve(null)),
        set: mock(() => Promise.resolve()),
        delete: mock(() => Promise.resolve()),
        clear: mock(() => Promise.resolve()),
        getStats: mock(() => Promise.resolve({})),
        getStale: mock(() => Promise.resolve(null)),
      };

      // Use small maxMemoryEntries for testing
      const smallCacheConfig: CachingConfig & { maxMemoryEntries?: number } = {
        ...cachingConfig,
        maxMemoryEntries: 3,
      };

      const service = new KongCircuitBreakerService(haConfig, smallCacheConfig, mockCache);

      // Verify maxStaleEntries is set correctly
      expect((service as any).maxStaleEntries).toBe(3);

      // Add entries with known timestamps (oldest first)
      const now = Date.now();
      (service as any).staleCache.set("key1", { data: { id: "1" }, timestamp: now - 3000 });
      (service as any).staleCache.set("key2", { data: { id: "2" }, timestamp: now - 2000 });
      (service as any).staleCache.set("key3", { data: { id: "3" }, timestamp: now - 1000 });

      expect((service as any).staleCache.size).toBe(3);

      // Add a new entry via updateStaleCache (which triggers eviction)
      (service as any).updateStaleCache("key4", { id: "4" });

      // Should still have 3 entries (oldest one evicted)
      expect((service as any).staleCache.size).toBe(3);

      // key1 (oldest) should be evicted
      expect((service as any).staleCache.has("key1")).toBe(false);
      expect((service as any).staleCache.has("key2")).toBe(true);
      expect((service as any).staleCache.has("key3")).toBe(true);
      expect((service as any).staleCache.has("key4")).toBe(true);

      service.shutdown();
    });

    it("should use default maxStaleEntries of 1000 when not specified", () => {
      const mockCache: IKongCacheService = {
        get: mock(() => Promise.resolve(null)),
        set: mock(() => Promise.resolve()),
        delete: mock(() => Promise.resolve()),
        clear: mock(() => Promise.resolve()),
        getStats: mock(() => Promise.resolve({})),
        getStale: mock(() => Promise.resolve(null)),
      };

      const service = new KongCircuitBreakerService(haConfig, cachingConfig, mockCache);

      // Default should be 1000
      expect((service as any).maxStaleEntries).toBe(1000);

      service.shutdown();
    });
  });

  describe("Non-HA mode fallback behavior", () => {
    it("should use in-memory stale cache directly in non-HA mode", async () => {
      // No Redis cache provided for non-HA
      const service = new KongCircuitBreakerService(nonHaConfig, {
        ...cachingConfig,
        highAvailability: false,
      });

      // Pre-populate in-memory stale cache
      const cacheKey = "consumer_secret:consumer-123";
      (service as any).staleCache.set(cacheKey, {
        data: consumerSecret,
        timestamp: Date.now(),
      });

      // Force circuit to open
      for (let i = 0; i < 5; i++) {
        try {
          await service.wrapKongConsumerOperation("getConsumerSecret", "consumer-123", async () => {
            throw new Error("Kong unavailable");
          });
        } catch {
          // Expected failure
        }
      }

      // Circuit open, should use in-memory directly (no Redis)
      const result = await service.wrapKongConsumerOperation(
        "getConsumerSecret",
        "consumer-123",
        async () => {
          throw new Error("Kong unavailable");
        }
      );

      expect(result).toEqual(consumerSecret);

      service.shutdown();
    });
  });

  describe("Stale data expiration", () => {
    it("should reject expired stale data in in-memory cache", async () => {
      const mockCache: IKongCacheService = {
        get: mock(() => Promise.resolve(null)),
        set: mock(() => Promise.resolve()),
        delete: mock(() => Promise.resolve()),
        clear: mock(() => Promise.resolve()),
        getStats: mock(() => Promise.resolve({})),
        getStale: mock(() => Promise.resolve(null)),
      };

      // Use short stale tolerance for testing
      const shortToleranceConfig: CachingConfig = {
        ...cachingConfig,
        staleDataToleranceMinutes: 1, // 1 minute tolerance
      };

      const service = new KongCircuitBreakerService(haConfig, shortToleranceConfig, mockCache);

      // Pre-populate in-memory stale cache with EXPIRED data (2 minutes old)
      const cacheKey = "consumer_secret:consumer-123";
      const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
      (service as any).staleCache.set(cacheKey, {
        data: consumerSecret,
        timestamp: twoMinutesAgo,
      });

      // Force circuit to open
      for (let i = 0; i < 5; i++) {
        try {
          await service.wrapKongConsumerOperation("getConsumerSecret", "consumer-123", async () => {
            throw new Error("Kong unavailable");
          });
        } catch {
          // Expected failure
        }
      }

      // Circuit open, Redis stale returns null, in-memory stale is expired
      const result = await service.wrapKongConsumerOperation(
        "getConsumerSecret",
        "consumer-123",
        async () => {
          throw new Error("Kong unavailable");
        }
      );

      // Should return null because stale data is expired
      expect(result).toBeNull();

      // Verify expired entry was removed
      expect((service as any).staleCache.has(cacheKey)).toBe(false);

      service.shutdown();
    });
  });
});
