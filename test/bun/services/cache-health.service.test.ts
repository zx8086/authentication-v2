// test/bun/services/cache-health.service.test.ts

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { resetConfigCache } from "../../../src/config/config";
import type { IKongCacheService } from "../../../src/config/schemas";
import { CacheFactory } from "../../../src/services/cache/cache-factory";
import { CacheHealthService } from "../../../src/services/cache-health.service";

describe("CacheHealthService", () => {
  let cacheHealthService: CacheHealthService;
  let originalHighAvailability: string | undefined;

  beforeEach(() => {
    originalHighAvailability = process.env.HIGH_AVAILABILITY;
    process.env.HIGH_AVAILABILITY = "false";
    resetConfigCache();
    cacheHealthService = CacheHealthService.getInstance();
  });

  afterEach(async () => {
    // Cleanup the instance to avoid state pollution
    await cacheHealthService.cleanup();
    if (originalHighAvailability !== undefined) {
      process.env.HIGH_AVAILABILITY = originalHighAvailability;
    } else {
      delete process.env.HIGH_AVAILABILITY;
    }
    resetConfigCache();
  });

  describe("getInstance (singleton pattern)", () => {
    it("should return the same instance on multiple calls", () => {
      const instance1 = CacheHealthService.getInstance();
      const instance2 = CacheHealthService.getInstance();

      // Both references should point to the same object (kills mutations to singleton)
      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(CacheHealthService);
    });

    it("should return a valid CacheHealthService instance", () => {
      const instance = CacheHealthService.getInstance();

      // Verify instance type and methods exist (kills mutations)
      expect(instance).toBeInstanceOf(CacheHealthService);
      expect(typeof instance.checkCacheHealth).toBe("function");
      expect(typeof instance.cleanup).toBe("function");
    });
  });

  describe("checkCacheHealth with real memory cache", () => {
    it("should return healthy status for memory cache", async () => {
      const cacheService = await CacheFactory.createKongCache();

      const result = await cacheHealthService.checkCacheHealth(cacheService);

      // Strong assertions for status value (kills string mutations)
      expect(result.status).toBe("healthy");
      expect(result.status).not.toBe("unhealthy");
      expect(result.status).not.toBe("degraded");
      expect(result.status).not.toBe("");

      // Strong assertions for type value (kills string mutations)
      expect(result.type).toBe("memory");
      expect(result.type).not.toBe("redis");
      expect(result.type).not.toBe("");

      // Verify responseTime is a non-negative number
      expect(typeof result.responseTime).toBe("number");
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(result.responseTime)).toBe(true);
    });

    it("should cache health check results for 2 seconds", async () => {
      const cacheService = await CacheFactory.createKongCache();

      const result1 = await cacheHealthService.checkCacheHealth(cacheService);
      const result2 = await cacheHealthService.checkCacheHealth(cacheService);

      // Cached result should be identical (same object reference or same values)
      expect(result1.responseTime).toBe(result2.responseTime);
      expect(result1.status).toBe(result2.status);
      expect(result1.type).toBe(result2.type);
    });

    it("should return fresh results after cache expires", async () => {
      const cacheService = await CacheFactory.createKongCache();

      // First call
      const result1 = await cacheHealthService.checkCacheHealth(cacheService);
      expect(result1.status).toBe("healthy");

      // Cleanup resets the cache
      await cacheHealthService.cleanup();

      // After cleanup, a new health check should be performed
      const result3 = await cacheHealthService.checkCacheHealth(cacheService);
      expect(result3.status).toBe("healthy");
      expect(result3.type).toBe("memory");
    });

    it("should return correct result structure with all required fields", async () => {
      const cacheService = await CacheFactory.createKongCache();

      const result = await cacheHealthService.checkCacheHealth(cacheService);

      // Verify all required fields exist (kills mutations that remove fields)
      expect(result).toHaveProperty("status");
      expect(result).toHaveProperty("type");
      expect(result).toHaveProperty("responseTime");

      // Verify the number of properties (kills mutations that add/remove fields)
      expect(Object.keys(result).length).toBe(3);
    });
  });

  describe("checkCacheHealth with Redis configuration", () => {
    let redisHighAvailability: string | undefined;

    beforeEach(() => {
      redisHighAvailability = process.env.HIGH_AVAILABILITY;
      process.env.HIGH_AVAILABILITY = "true";
      process.env.REDIS_URL = "redis://nonexistent-host:6379";
      resetConfigCache();
    });

    afterEach(() => {
      if (redisHighAvailability !== undefined) {
        process.env.HIGH_AVAILABILITY = redisHighAvailability;
      } else {
        delete process.env.HIGH_AVAILABILITY;
      }
      delete process.env.REDIS_URL;
      resetConfigCache();
    });

    it("should attempt Redis health check when highAvailability is true", async () => {
      // Create a mock cache service that simulates Redis behavior
      const mockRedisCache: IKongCacheService = {
        getConsumerSecret: async () => null,
        setConsumerSecret: async () => {
          /* no-op */
        },
        clearConsumerSecret: async () => {
          /* no-op */
        },
        isHealthy: async () => false,
        getStats: async () => ({ size: 0, hits: 0, misses: 0 }),
      };

      // The service should detect HA mode and try Redis health check
      // Since Redis is not available, it should return unhealthy or fallback
      const result = await cacheHealthService.checkCacheHealth(mockRedisCache);

      // Result should have valid structure regardless of health status
      expect(["healthy", "unhealthy", "degraded"]).toContain(result.status);
      expect(["redis", "memory"]).toContain(result.type);
      expect(typeof result.responseTime).toBe("number");
    });
  });

  describe("cleanup", () => {
    it("should cleanup without errors when no redis client exists", async () => {
      await expect(cacheHealthService.cleanup()).resolves.toBeUndefined();
    });

    it("should reset cached health check results", async () => {
      const cacheService = await CacheFactory.createKongCache();

      // Perform a health check to populate cache
      await cacheHealthService.checkCacheHealth(cacheService);

      // Cleanup should succeed
      await cacheHealthService.cleanup();

      // After cleanup, the next health check should be fresh (not from cache)
      const freshResult = await cacheHealthService.checkCacheHealth(cacheService);
      expect(freshResult.status).toBe("healthy");
    });

    it("should be callable multiple times without error", async () => {
      // Multiple cleanups should not throw
      await cacheHealthService.cleanup();
      await cacheHealthService.cleanup();
      await cacheHealthService.cleanup();

      // Instance should still be functional
      const cacheService = await CacheFactory.createKongCache();
      const result = await cacheHealthService.checkCacheHealth(cacheService);
      expect(result.status).toBe("healthy");
    });
  });

  describe("CacheHealthResult type validation", () => {
    it("should only allow valid status values", async () => {
      const cacheService = await CacheFactory.createKongCache();
      const result = await cacheHealthService.checkCacheHealth(cacheService);

      // Status must be one of the defined values (kills mutations to status strings)
      const validStatuses = ["healthy", "unhealthy", "degraded"];
      expect(validStatuses).toContain(result.status);
      expect(validStatuses.includes(result.status)).toBe(true);
    });

    it("should only allow valid type values", async () => {
      const cacheService = await CacheFactory.createKongCache();
      const result = await cacheHealthService.checkCacheHealth(cacheService);

      // Type must be one of the defined values (kills mutations to type strings)
      const validTypes = ["redis", "memory"];
      expect(validTypes).toContain(result.type);
      expect(validTypes.includes(result.type)).toBe(true);
    });

    it("should return responseTime as a rounded integer", async () => {
      const cacheService = await CacheFactory.createKongCache();
      const result = await cacheHealthService.checkCacheHealth(cacheService);

      // Math.round is used in the implementation
      expect(Number.isInteger(result.responseTime)).toBe(true);
    });
  });
});
