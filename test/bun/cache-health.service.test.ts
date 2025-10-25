/* test/bun/cache-health.service.test.ts */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { resetConfigCache } from "../../src/config/config";
import { CacheFactory } from "../../src/services/cache/cache-factory";
import { CacheHealthService } from "../../src/services/cache-health.service";

describe("CacheHealthService", () => {
  let cacheHealthService: CacheHealthService;
  let originalHighAvailability: string | undefined;

  beforeEach(() => {
    originalHighAvailability = process.env.HIGH_AVAILABILITY;
    process.env.HIGH_AVAILABILITY = "false";
    resetConfigCache();
    cacheHealthService = CacheHealthService.getInstance();
  });

  afterEach(() => {
    if (originalHighAvailability !== undefined) {
      process.env.HIGH_AVAILABILITY = originalHighAvailability;
    } else {
      delete process.env.HIGH_AVAILABILITY;
    }
    resetConfigCache();
  });

  describe("checkCacheHealth with real memory cache", () => {
    it("should return healthy status for memory cache", async () => {
      const cacheService = await CacheFactory.createKongCache();

      const result = await cacheHealthService.checkCacheHealth(cacheService);

      expect(result.status).toBe("healthy");
      expect(result.type).toBe("memory");
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
    });

    it("should cache health check results for 2 seconds", async () => {
      const cacheService = await CacheFactory.createKongCache();

      const result1 = await cacheHealthService.checkCacheHealth(cacheService);
      const result2 = await cacheHealthService.checkCacheHealth(cacheService);

      expect(result1.responseTime).toBe(result2.responseTime);
    });
  });

  describe("cleanup", () => {
    it("should cleanup without errors when no redis client exists", async () => {
      await expect(cacheHealthService.cleanup()).resolves.toBeUndefined();
    });
  });
});
