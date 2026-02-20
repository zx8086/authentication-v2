// test/bun/cache/cache-health-edge-cases.test.ts

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { resetConfigCache } from "../../../src/config/config";
import type { IKongCacheService } from "../../../src/config/schemas";
import { CacheHealthService } from "../../../src/services/cache-health.service";

describe("CacheHealthService Edge Cases", () => {
  let cacheHealthService: CacheHealthService;
  let originalHighAvailability: string | undefined;

  beforeEach(() => {
    originalHighAvailability = process.env.HIGH_AVAILABILITY;
    resetConfigCache();
    cacheHealthService = CacheHealthService.getInstance();
  });

  afterEach(async () => {
    await cacheHealthService.cleanup();
    if (originalHighAvailability !== undefined) {
      process.env.HIGH_AVAILABILITY = originalHighAvailability;
    } else {
      delete process.env.HIGH_AVAILABILITY;
    }
    resetConfigCache();
  });

  describe("Redis health check error scenarios", () => {
    it("should handle PING returning non-PONG response", async () => {
      process.env.HIGH_AVAILABILITY = "true";
      resetConfigCache();

      // Create a mock cache with getClientForHealthCheck that returns invalid PING
      const mockRedisCache: any = {
        getConsumerSecret: async () => null,
        // biome-ignore lint/suspicious/noEmptyBlockStatements: Mock function intentionally empty
        setConsumerSecret: async () => {},
        // biome-ignore lint/suspicious/noEmptyBlockStatements: Mock function intentionally empty
        clearConsumerSecret: async () => {},
        isHealthy: async () => true,
        getStats: async () => ({ size: 0, hits: 0, misses: 0 }),
        getClientForHealthCheck: () => ({
          send: async (command: string) => {
            if (command === "PING") {
              return "INVALID"; // Not PONG
            }
            return null;
          },
        }),
      };

      const result = await cacheHealthService.checkCacheHealth(mockRedisCache);

      expect(result).toBeDefined();
      expect(result.status).toBe("unhealthy");
      expect(result.type).toBe("redis");
      expect(typeof result.responseTime).toBe("string");
      expect(result.responseTime).toMatch(/^\d+(\.\d+)?(ms|s|m\s\d+s|m)$/);
    });

    it("should handle PING timeout", async () => {
      process.env.HIGH_AVAILABILITY = "true";
      resetConfigCache();

      // Create a mock cache with slow PING response
      const mockRedisCache: any = {
        getConsumerSecret: async () => null,
        // biome-ignore lint/suspicious/noEmptyBlockStatements: Mock function intentionally empty
        setConsumerSecret: async () => {},
        // biome-ignore lint/suspicious/noEmptyBlockStatements: Mock function intentionally empty
        clearConsumerSecret: async () => {},
        isHealthy: async () => true,
        getStats: async () => ({ size: 0, hits: 0, misses: 0 }),
        getClientForHealthCheck: () => ({
          send: async (command: string) => {
            if (command === "PING") {
              // Simulate slow response that will timeout
              await new Promise((resolve) => setTimeout(resolve, 1500));
              return "PONG";
            }
            return null;
          },
        }),
      };

      const result = await cacheHealthService.checkCacheHealth(mockRedisCache);

      expect(result).toBeDefined();
      expect(result.status).toBe("unhealthy");
      expect(result.type).toBe("redis");
      expect(typeof result.responseTime).toBe("string");
      expect(result.responseTime).toMatch(/^\d+(\.\d+)?(ms|s|m\s\d+s|m)$/);
    });

    it("should handle missing getClientForHealthCheck method", async () => {
      process.env.HIGH_AVAILABILITY = "true";
      resetConfigCache();

      // Create a mock cache without getClientForHealthCheck
      const mockRedisCache: IKongCacheService = {
        getConsumerSecret: async () => null,
        // biome-ignore lint/suspicious/noEmptyBlockStatements: Mock function intentionally empty
        setConsumerSecret: async () => {},
        // biome-ignore lint/suspicious/noEmptyBlockStatements: Mock function intentionally empty
        clearConsumerSecret: async () => {},
        isHealthy: async () => true,
        getStats: async () => ({ size: 0, hits: 0, misses: 0 }),
      };

      const result = await cacheHealthService.checkCacheHealth(mockRedisCache);

      // Should use fallback health check
      expect(result).toBeDefined();
      expect(result.status).toBe("healthy");
      expect(result.type).toBe("redis");
      expect(typeof result.responseTime).toBe("string");
      expect(result.responseTime).toMatch(/^\d+(\.\d+)?(ms|s|m\s\d+s|m)$/);
    });

    it("should handle Redis client errors", async () => {
      process.env.HIGH_AVAILABILITY = "true";
      resetConfigCache();

      // Create a mock cache with error-throwing PING
      const mockRedisCache: any = {
        getConsumerSecret: async () => null,
        // biome-ignore lint/suspicious/noEmptyBlockStatements: Mock function intentionally empty
        setConsumerSecret: async () => {},
        // biome-ignore lint/suspicious/noEmptyBlockStatements: Mock function intentionally empty
        clearConsumerSecret: async () => {},
        isHealthy: async () => true,
        getStats: async () => ({ size: 0, hits: 0, misses: 0 }),
        getClientForHealthCheck: () => ({
          send: async (command: string) => {
            if (command === "PING") {
              throw new Error("Redis connection error");
            }
            return null;
          },
        }),
      };

      const result = await cacheHealthService.checkCacheHealth(mockRedisCache);

      expect(result).toBeDefined();
      expect(result.status).toBe("unhealthy");
      expect(result.type).toBe("redis");
      expect(typeof result.responseTime).toBe("string");
      expect(result.responseTime).toMatch(/^\d+(\.\d+)?(ms|s|m\s\d+s|m)$/);
    });
  });

  describe("Memory cache error scenarios", () => {
    it("should handle memory cache errors gracefully", async () => {
      process.env.HIGH_AVAILABILITY = "false";
      resetConfigCache();

      // Create a mock cache that throws during health check
      // This is unlikely but we want to cover the error path
      const mockMemoryCache: any = {
        getConsumerSecret: async () => {
          throw new Error("Memory cache error");
        },
        setConsumerSecret: async () => {
          throw new Error("Memory cache error");
        },
        clearConsumerSecret: async () => {
          throw new Error("Memory cache error");
        },
        isHealthy: async () => {
          throw new Error("Memory cache error");
        },
        getStats: async () => {
          throw new Error("Memory cache error");
        },
      };

      // The checkMemoryHealth method doesn't actually call these methods,
      // so it should still return healthy
      const result = await cacheHealthService.checkCacheHealth(mockMemoryCache);

      expect(result).toBeDefined();
      expect(result.status).toBe("healthy");
      expect(result.type).toBe("memory");
      expect(typeof result.responseTime).toBe("string");
      expect(result.responseTime).toMatch(/^\d+(\.\d+)?(ms|s|m\s\d+s|m)$/);
    });
  });

  describe("Response time measurements", () => {
    it("should measure response time for Redis health check", async () => {
      process.env.HIGH_AVAILABILITY = "true";
      resetConfigCache();

      const mockRedisCache: any = {
        getConsumerSecret: async () => null,
        // biome-ignore lint/suspicious/noEmptyBlockStatements: Mock function intentionally empty
        setConsumerSecret: async () => {},
        // biome-ignore lint/suspicious/noEmptyBlockStatements: Mock function intentionally empty
        clearConsumerSecret: async () => {},
        isHealthy: async () => true,
        getStats: async () => ({ size: 0, hits: 0, misses: 0 }),
        getClientForHealthCheck: () => ({
          send: async (command: string) => {
            if (command === "PING") {
              // Small delay to ensure measurable response time
              await new Promise((resolve) => setTimeout(resolve, 5));
              return "PONG";
            }
            return null;
          },
        }),
      };

      const result = await cacheHealthService.checkCacheHealth(mockRedisCache);

      // Response time is now a human-readable string
      expect(typeof result.responseTime).toBe("string");
      expect(result.responseTime).toMatch(/^\d+(\.\d+)?(ms|s|m\s\d+s|m)$/);
    });

    it("should measure response time for memory health check", async () => {
      process.env.HIGH_AVAILABILITY = "false";
      resetConfigCache();

      const mockMemoryCache: IKongCacheService = {
        getConsumerSecret: async () => null,
        // biome-ignore lint/suspicious/noEmptyBlockStatements: Mock function intentionally empty
        setConsumerSecret: async () => {},
        // biome-ignore lint/suspicious/noEmptyBlockStatements: Mock function intentionally empty
        clearConsumerSecret: async () => {},
        isHealthy: async () => true,
        getStats: async () => ({ size: 0, hits: 0, misses: 0 }),
      };

      const result = await cacheHealthService.checkCacheHealth(mockMemoryCache);

      // Response time is now a human-readable string
      expect(typeof result.responseTime).toBe("string");
      expect(result.responseTime).toMatch(/^\d+(\.\d+)?(ms|s|m\s\d+s|m)$/);
    });

    it("should measure response time even for failed checks", async () => {
      process.env.HIGH_AVAILABILITY = "true";
      resetConfigCache();

      const mockRedisCache: any = {
        getConsumerSecret: async () => null,
        // biome-ignore lint/suspicious/noEmptyBlockStatements: Mock function intentionally empty
        setConsumerSecret: async () => {},
        // biome-ignore lint/suspicious/noEmptyBlockStatements: Mock function intentionally empty
        clearConsumerSecret: async () => {},
        isHealthy: async () => true,
        getStats: async () => ({ size: 0, hits: 0, misses: 0 }),
        getClientForHealthCheck: () => ({
          send: async (command: string) => {
            if (command === "PING") {
              throw new Error("Connection failed");
            }
            return null;
          },
        }),
      };

      const result = await cacheHealthService.checkCacheHealth(mockRedisCache);

      expect(result.status).toBe("unhealthy");
      // Response time is now a human-readable string
      expect(typeof result.responseTime).toBe("string");
      expect(result.responseTime).toMatch(/^\d+(\.\d+)?(ms|s|m\s\d+s|m)$/);
    });
  });

  describe("Non-Error objects in catch blocks", () => {
    it("should handle non-Error objects thrown during Redis health check", async () => {
      process.env.HIGH_AVAILABILITY = "true";
      resetConfigCache();

      const mockRedisCache: any = {
        getConsumerSecret: async () => null,
        // biome-ignore lint/suspicious/noEmptyBlockStatements: Mock function intentionally empty
        setConsumerSecret: async () => {},
        // biome-ignore lint/suspicious/noEmptyBlockStatements: Mock function intentionally empty
        clearConsumerSecret: async () => {},
        isHealthy: async () => true,
        getStats: async () => ({ size: 0, hits: 0, misses: 0 }),
        getClientForHealthCheck: () => ({
          send: async (command: string) => {
            if (command === "PING") {
              throw "String error"; // Non-Error object
            }
            return null;
          },
        }),
      };

      const result = await cacheHealthService.checkCacheHealth(mockRedisCache);

      expect(result.status).toBe("unhealthy");
      expect(result.type).toBe("redis");
    });
  });
});
