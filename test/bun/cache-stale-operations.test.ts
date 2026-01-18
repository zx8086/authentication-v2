/* test/bun/cache-stale-operations.test.ts */

/**
 * Tests for local memory cache stale operations.
 * These tests cover the getStale, setStale, and clearStale methods
 * that are used for circuit breaker fallback caching.
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";

describe("Local Memory Cache Stale Operations", () => {
  const originalEnv = { ...Bun.env };

  beforeEach(async () => {
    Object.keys(Bun.env).forEach((key) => {
      if (!["PATH", "HOME", "USER", "SHELL", "TERM"].includes(key)) {
        delete Bun.env[key];
      }
    });
    Bun.env.NODE_ENV = "test";
    Bun.env.KONG_JWT_AUTHORITY = "https://auth.test.com";
    Bun.env.KONG_JWT_AUDIENCE = "https://api.test.com";
    Bun.env.KONG_ADMIN_URL = "http://kong:8001";
    Bun.env.KONG_ADMIN_TOKEN = "test-token-123456789012345678901234567890";
    Bun.env.CACHE_HIGH_AVAILABILITY = "false";

    const { resetConfigCache } = await import("../../src/config/config");
    resetConfigCache();
  });

  afterEach(async () => {
    Object.keys(Bun.env).forEach((key) => {
      if (!(key in originalEnv)) {
        delete Bun.env[key];
      }
    });
    Object.assign(Bun.env, originalEnv);

    const { resetConfigCache } = await import("../../src/config/config");
    resetConfigCache();
  });

  describe("LocalMemoryCache class", () => {
    it("should create instance with default config", async () => {
      const { LocalMemoryCache } = await import("../../src/services/cache/local-memory-cache");
      const { loadConfig } = await import("../../src/config/config");
      const config = loadConfig();

      const cache = new LocalMemoryCache(config.caching);

      expect(cache).toBeDefined();
    });

    it("should set and get values from primary cache", async () => {
      const { LocalMemoryCache } = await import("../../src/services/cache/local-memory-cache");
      const { loadConfig } = await import("../../src/config/config");
      const config = loadConfig();

      const cache = new LocalMemoryCache(config.caching);

      await cache.set("test-key", { value: "test-data" });
      const result = await cache.get("test-key");

      expect(result).toEqual({ value: "test-data" });
    });

    it("should return null for non-existent keys", async () => {
      const { LocalMemoryCache } = await import("../../src/services/cache/local-memory-cache");
      const { loadConfig } = await import("../../src/config/config");
      const config = loadConfig();

      const cache = new LocalMemoryCache(config.caching);

      const result = await cache.get("non-existent-key");

      expect(result).toBeNull();
    });
  });

  describe("Stale cache operations", () => {
    it("should set and get values from stale cache", async () => {
      const { LocalMemoryCache } = await import("../../src/services/cache/local-memory-cache");
      const { loadConfig } = await import("../../src/config/config");
      const config = loadConfig();

      const cache = new LocalMemoryCache(config.caching);

      // Set a value in stale cache
      await cache.setStale("stale-key", { id: "secret-123", key: "jwt-key" });

      // Get it back
      const result = await cache.getStale("stale-key");

      expect(result).toEqual({ id: "secret-123", key: "jwt-key" });
    });

    it("should return null for non-existent stale keys", async () => {
      const { LocalMemoryCache } = await import("../../src/services/cache/local-memory-cache");
      const { loadConfig } = await import("../../src/config/config");
      const config = loadConfig();

      const cache = new LocalMemoryCache(config.caching);

      const result = await cache.getStale("non-existent-stale-key");

      expect(result).toBeNull();
    });

    it("should clear all stale cache entries", async () => {
      const { LocalMemoryCache } = await import("../../src/services/cache/local-memory-cache");
      const { loadConfig } = await import("../../src/config/config");
      const config = loadConfig();

      const cache = new LocalMemoryCache(config.caching);

      // Set multiple stale entries
      await cache.setStale("stale-1", { data: "value1" });
      await cache.setStale("stale-2", { data: "value2" });
      await cache.setStale("stale-3", { data: "value3" });

      // Clear all stale entries
      await cache.clearStale();

      // Verify all are gone
      expect(await cache.getStale("stale-1")).toBeNull();
      expect(await cache.getStale("stale-2")).toBeNull();
      expect(await cache.getStale("stale-3")).toBeNull();
    });

    it("should use custom TTL for stale cache", async () => {
      const { LocalMemoryCache } = await import("../../src/services/cache/local-memory-cache");
      const { loadConfig } = await import("../../src/config/config");
      const config = loadConfig();

      const cache = new LocalMemoryCache(config.caching);

      // Set with custom TTL
      await cache.setStale("custom-ttl-key", { data: "custom" }, 3600);

      const result = await cache.getStale("custom-ttl-key");
      expect(result).toEqual({ data: "custom" });
    });

    it("should handle typed stale cache values", async () => {
      const { LocalMemoryCache } = await import("../../src/services/cache/local-memory-cache");
      const { loadConfig } = await import("../../src/config/config");
      const config = loadConfig();

      const cache = new LocalMemoryCache(config.caching);

      interface CustomType {
        id: string;
        name: string;
        count: number;
      }

      const customValue: CustomType = {
        id: "typed-123",
        name: "test-name",
        count: 42,
      };

      await cache.setStale("typed-key", customValue);
      const result = await cache.getStale<CustomType>("typed-key");

      expect(result).toEqual(customValue);
      expect(result?.id).toBe("typed-123");
      expect(result?.count).toBe(42);
    });
  });

  describe("Cache clear operations", () => {
    it("should clear primary cache", async () => {
      const { LocalMemoryCache } = await import("../../src/services/cache/local-memory-cache");
      const { loadConfig } = await import("../../src/config/config");
      const config = loadConfig();

      const cache = new LocalMemoryCache(config.caching);

      await cache.set("key1", { value: 1 });
      await cache.set("key2", { value: 2 });

      await cache.clear();

      expect(await cache.get("key1")).toBeNull();
      expect(await cache.get("key2")).toBeNull();
    });

    it("should delete specific key from cache", async () => {
      const { LocalMemoryCache } = await import("../../src/services/cache/local-memory-cache");
      const { loadConfig } = await import("../../src/config/config");
      const config = loadConfig();

      const cache = new LocalMemoryCache(config.caching);

      await cache.set("to-delete", { value: "delete-me" });
      await cache.set("to-keep", { value: "keep-me" });

      await cache.delete("to-delete");

      expect(await cache.get("to-delete")).toBeNull();
      expect(await cache.get("to-keep")).toEqual({ value: "keep-me" });
    });
  });

  describe("Cache statistics", () => {
    it("should track cache stats", async () => {
      const { LocalMemoryCache } = await import("../../src/services/cache/local-memory-cache");
      const { loadConfig } = await import("../../src/config/config");
      const config = loadConfig();

      const cache = new LocalMemoryCache(config.caching);

      await cache.set("stats-key", { value: "stats" });
      await cache.get("stats-key"); // Hit
      await cache.get("non-existent"); // Miss

      const stats = await cache.getStats();

      expect(stats).toBeDefined();
      expect(typeof stats.size).toBe("number");
      expect(typeof stats.hitRate).toBe("string");
    });

    it("should return cache size", async () => {
      const { LocalMemoryCache } = await import("../../src/services/cache/local-memory-cache");
      const { loadConfig } = await import("../../src/config/config");
      const config = loadConfig();

      const cache = new LocalMemoryCache(config.caching);

      await cache.set("size-1", { value: 1 });
      await cache.set("size-2", { value: 2 });

      const stats = await cache.getStats();

      expect(stats.size).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Cache clear all", () => {
    it("should clear all entries including stale", async () => {
      const { LocalMemoryCache } = await import("../../src/services/cache/local-memory-cache");
      const { loadConfig } = await import("../../src/config/config");
      const config = loadConfig();

      const cache = new LocalMemoryCache(config.caching);

      await cache.set("primary-key", { value: "primary" });
      await cache.setStale("stale-key", { value: "stale" });

      await cache.clear();
      await cache.clearStale();

      expect(await cache.get("primary-key")).toBeNull();
      expect(await cache.getStale("stale-key")).toBeNull();
    });
  });
});
