// test/bun/cache/cache-manager-integration.test.ts

import { describe, expect, it } from "bun:test";
import { UnifiedCacheManager } from "../../../src/cache/cache-manager";

describe("UnifiedCacheManager - Integration Tests", () => {
  describe("reconfigure strategy changes", () => {
    it("should reconfigure from local-memory to shared-redis (with fallback)", async () => {
      const manager = new UnifiedCacheManager({
        highAvailability: false,
        ttlSeconds: 300,
        staleDataToleranceMinutes: 5,
      });

      await manager.set("test-key", "test-value");
      expect(manager.getStrategy()).toBe("local-memory");

      // Use localhost with invalid port - fails fast (no DNS resolution delay)
      await manager.reconfigure({
        highAvailability: true,
        ttlSeconds: 600,
        redisUrl: "redis://localhost:59999",
        staleDataToleranceMinutes: 10,
      });

      expect(manager.getStrategy()).toBe("local-memory");
      const value = await manager.get("test-key");
      expect(value).toBeNull();

      await manager.shutdown();
    });

    it("should preserve backend when reconfiguring with same strategy", async () => {
      const manager = new UnifiedCacheManager({
        highAvailability: false,
        ttlSeconds: 300,
        maxMemoryEntries: 100,
        staleDataToleranceMinutes: 5,
      });

      await manager.set("preserve-test", "value");
      const strategyBefore = manager.getStrategy();

      await manager.reconfigure({
        highAvailability: false,
        ttlSeconds: 600,
        maxMemoryEntries: 200,
        staleDataToleranceMinutes: 10,
      });

      expect(manager.getStrategy()).toBe(strategyBefore);
      const value = await manager.get("preserve-test");
      expect(value).toBe("value");

      await manager.shutdown();
    });
  });

  describe("concurrent initialization", () => {
    it("should handle multiple concurrent operations during initialization", async () => {
      const manager = new UnifiedCacheManager({
        highAvailability: false,
        ttlSeconds: 300,
        staleDataToleranceMinutes: 5,
      });

      await Promise.all([
        manager.set("key1", "value1"),
        manager.set("key2", "value2"),
        manager.get("key1"),
        manager.isHealthy(),
      ]);

      expect(await manager.get("key1")).toBe("value1");
      expect(await manager.get("key2")).toBe("value2");
      expect(manager.getStrategy()).toBe("local-memory");

      await manager.shutdown();
    });
  });

  describe("shutdown and reinitialize", () => {
    it("should clear backend on shutdown and reinitialize on next operation", async () => {
      const manager = new UnifiedCacheManager({
        highAvailability: false,
        ttlSeconds: 300,
        staleDataToleranceMinutes: 5,
      });

      await manager.set("shutdown-test", "value");
      expect(manager.getBackendName()).toBe("LocalMemoryBackend");

      await manager.shutdown();
      expect(manager.getBackendName()).toBeNull();
      expect(manager.getStrategy()).toBeNull();

      await manager.set("reinit-test", "new-value");
      expect(manager.getBackendName()).toBe("LocalMemoryBackend");
      expect(await manager.get("reinit-test")).toBe("new-value");
      expect(await manager.get("shutdown-test")).toBeNull();

      await manager.shutdown();
    });

    it("should handle shutdown when no backend exists", async () => {
      const manager = new UnifiedCacheManager({
        highAvailability: false,
        ttlSeconds: 300,
        staleDataToleranceMinutes: 5,
      });

      await manager.shutdown();
      expect(manager.getBackendName()).toBeNull();
      expect(manager.getStrategy()).toBeNull();
    });
  });

  describe("backend creation paths", () => {
    it("should create LocalMemoryBackend for local-memory strategy", async () => {
      const manager = new UnifiedCacheManager({
        highAvailability: false,
        ttlSeconds: 300,
        maxMemoryEntries: 500,
        staleDataToleranceMinutes: 5,
      });

      await manager.isHealthy();
      expect(manager.getStrategy()).toBe("local-memory");
      expect(manager.getBackendName()).toBe("LocalMemoryBackend");

      await manager.shutdown();
    });

    it("should attempt SharedRedisBackend and fallback for shared-redis strategy", async () => {
      const manager = new UnifiedCacheManager({
        highAvailability: true,
        ttlSeconds: 300,
        // Use localhost with invalid port - fails fast (no DNS resolution delay)
        redisUrl: "redis://localhost:59998",
        staleDataToleranceMinutes: 5,
      });

      await manager.isHealthy();
      expect(manager.getStrategy()).toBe("local-memory");

      await manager.shutdown();
    });
  });

  describe("fallback behavior", () => {
    it("should fallback from redis to local-memory on connection failure", async () => {
      const manager = new UnifiedCacheManager({
        highAvailability: true,
        ttlSeconds: 300,
        // Use localhost with invalid port - fails fast (no DNS resolution delay)
        redisUrl: "redis://localhost:59997",
        staleDataToleranceMinutes: 5,
      });

      await manager.set("fallback-key", "fallback-value");
      expect(manager.getStrategy()).toBe("local-memory");
      expect(await manager.get("fallback-key")).toBe("fallback-value");

      await manager.shutdown();
    });
  });

  describe("cache operations", () => {
    it("should perform set, get, delete operations", async () => {
      const manager = new UnifiedCacheManager({
        highAvailability: false,
        ttlSeconds: 300,
        staleDataToleranceMinutes: 5,
      });

      await manager.set("op-key", "op-value");
      expect(await manager.get("op-key")).toBe("op-value");

      await manager.delete("op-key");
      expect(await manager.get("op-key")).toBeNull();

      await manager.shutdown();
    });

    it("should handle health checks", async () => {
      const manager = new UnifiedCacheManager({
        highAvailability: false,
        ttlSeconds: 300,
        staleDataToleranceMinutes: 5,
      });

      const healthy = await manager.isHealthy();
      expect(typeof healthy).toBe("boolean");

      await manager.shutdown();
    });
  });

  describe("strategy selection", () => {
    it("should select local-memory when highAvailability is false", async () => {
      const manager = new UnifiedCacheManager({
        highAvailability: false,
        ttlSeconds: 300,
        staleDataToleranceMinutes: 5,
      });

      await manager.isHealthy();
      expect(manager.getStrategy()).toBe("local-memory");

      await manager.shutdown();
    });

    it("should attempt shared-redis when highAvailability is true", async () => {
      const manager = new UnifiedCacheManager({
        highAvailability: true,
        ttlSeconds: 300,
        // Use localhost with invalid port - fails fast (no DNS resolution delay)
        redisUrl: "redis://localhost:59996",
        staleDataToleranceMinutes: 5,
      });

      await manager.isHealthy();
      const strategy = manager.getStrategy();
      expect(strategy).toBe("local-memory");

      await manager.shutdown();
    });
  });
});
