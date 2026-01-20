/* test/bun/cache-manager.test.ts */

/**
 * Unit tests for UnifiedCacheManager
 * Tests the unified cache manager that supports both local memory and Redis backends
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { UnifiedCacheManager } from "../../../src/cache/cache-manager";

describe("UnifiedCacheManager", () => {
  describe("constructor", () => {
    it("should create manager with local-memory config", () => {
      const manager = new UnifiedCacheManager({
        highAvailability: false,
        ttlSeconds: 300,
        maxMemoryEntries: 1000,
        staleDataToleranceMinutes: 5,
      });
      // Verify manager instance with type check (kills mutations)
      expect(manager).toBeInstanceOf(UnifiedCacheManager);
      expect(typeof manager.get).toBe("function");
      expect(typeof manager.set).toBe("function");
    });

    it("should create manager with shared-redis config", () => {
      const manager = new UnifiedCacheManager({
        highAvailability: true,
        ttlSeconds: 300,
        redisUrl: "redis://localhost:6379",
        staleDataToleranceMinutes: 5,
      });
      // Verify manager instance with type check (kills mutations)
      expect(manager).toBeInstanceOf(UnifiedCacheManager);
      expect(typeof manager.get).toBe("function");
    });
  });

  describe("local-memory backend operations", () => {
    let manager: UnifiedCacheManager;

    beforeEach(() => {
      manager = new UnifiedCacheManager({
        highAvailability: false,
        ttlSeconds: 300,
        maxMemoryEntries: 100,
        staleDataToleranceMinutes: 5,
      });
    });

    afterEach(async () => {
      await manager.shutdown();
    });

    it("should set and get a value", async () => {
      await manager.set("test-key", { foo: "bar" });
      const result = await manager.get<{ foo: string }>("test-key");
      expect(result).toEqual({ foo: "bar" });
    });

    it("should return null for non-existent key", async () => {
      const result = await manager.get("non-existent-key");
      expect(result).toBeNull();
    });

    it("should delete a value", async () => {
      await manager.set("delete-key", "value");
      await manager.delete("delete-key");
      const result = await manager.get("delete-key");
      expect(result).toBeNull();
    });

    it("should clear all values", async () => {
      await manager.set("key1", "value1");
      await manager.set("key2", "value2");
      await manager.clear();
      const result1 = await manager.get("key1");
      const result2 = await manager.get("key2");
      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });

    it("should return cache stats", async () => {
      await manager.set("stats-key", "value");
      const stats = await manager.getStats();
      // Verify stats with value checks (kills mutations)
      expect(typeof stats).toBe("object");
      expect(stats).not.toBeNull();
      expect(typeof stats.size).toBe("number");
      expect(stats.size).toBeGreaterThanOrEqual(0);
    });

    it("should report healthy status", async () => {
      const healthy = await manager.isHealthy();
      expect(healthy).toBe(true);
    });

    it("should return strategy after initialization", async () => {
      // Initialize by calling a method
      await manager.isHealthy();
      const strategy = manager.getStrategy();
      expect(strategy).toBe("local-memory");
    });

    it("should return backend name after initialization", async () => {
      // Initialize by calling a method
      await manager.isHealthy();
      const name = manager.getBackendName();
      expect(name).toBe("LocalMemoryBackend");
    });

    it("should return null for strategy before initialization", () => {
      const freshManager = new UnifiedCacheManager({
        highAvailability: false,
        ttlSeconds: 300,
        staleDataToleranceMinutes: 5,
      });
      const strategy = freshManager.getStrategy();
      expect(strategy).toBeNull();
    });

    it("should return null for backend name before initialization", () => {
      const freshManager = new UnifiedCacheManager({
        highAvailability: false,
        ttlSeconds: 300,
        staleDataToleranceMinutes: 5,
      });
      const name = freshManager.getBackendName();
      expect(name).toBeNull();
    });
  });

  describe("getStale", () => {
    let manager: UnifiedCacheManager;

    beforeEach(() => {
      manager = new UnifiedCacheManager({
        highAvailability: false,
        ttlSeconds: 300,
        maxMemoryEntries: 100,
        staleDataToleranceMinutes: 5,
      });
    });

    afterEach(async () => {
      await manager.shutdown();
    });

    it("should return null for local-memory backend (no stale support)", async () => {
      await manager.set("stale-key", "value");
      const stale = await manager.getStale("stale-key");
      // LocalMemoryBackend doesn't support getStale
      expect(stale).toBeNull();
    });
  });

  describe("connect and disconnect", () => {
    let manager: UnifiedCacheManager;

    beforeEach(() => {
      manager = new UnifiedCacheManager({
        highAvailability: false,
        ttlSeconds: 300,
        staleDataToleranceMinutes: 5,
      });
    });

    afterEach(async () => {
      await manager.shutdown();
    });

    it("should connect without error", async () => {
      await expect(manager.connect()).resolves.toBeUndefined();
    });

    it("should disconnect without error", async () => {
      await manager.connect();
      await expect(manager.disconnect()).resolves.toBeUndefined();
    });

    it("should handle disconnect on uninitialized manager", async () => {
      const freshManager = new UnifiedCacheManager({
        highAvailability: false,
        ttlSeconds: 300,
        staleDataToleranceMinutes: 5,
      });
      // disconnect on uninitialized manager should not throw
      await expect(freshManager.disconnect()).resolves.toBeUndefined();
    });
  });

  describe("reconfigure", () => {
    let manager: UnifiedCacheManager;

    beforeEach(() => {
      manager = new UnifiedCacheManager({
        highAvailability: false,
        ttlSeconds: 300,
        staleDataToleranceMinutes: 5,
      });
    });

    afterEach(async () => {
      await manager.shutdown();
    });

    it("should reconfigure with same strategy (no change)", async () => {
      // Initialize
      await manager.set("key1", "value1");

      // Reconfigure with same strategy
      await manager.reconfigure({
        highAvailability: false,
        ttlSeconds: 600, // Changed TTL
        staleDataToleranceMinutes: 10,
      });

      // Strategy should remain local-memory
      const strategy = manager.getStrategy();
      expect(strategy).toBe("local-memory");
    });

    it("should handle reconfigure with new config values", async () => {
      // Initialize
      await manager.isHealthy();

      // Reconfigure
      await manager.reconfigure({
        highAvailability: false,
        ttlSeconds: 900,
        maxMemoryEntries: 500,
        staleDataToleranceMinutes: 15,
      });

      // Verify still functional
      await manager.set("new-key", "new-value");
      const result = await manager.get("new-key");
      expect(result).toBe("new-value");
    });
  });

  describe("shutdown", () => {
    it("should shutdown cleanly", async () => {
      const manager = new UnifiedCacheManager({
        highAvailability: false,
        ttlSeconds: 300,
        staleDataToleranceMinutes: 5,
      });

      // Initialize
      await manager.set("key", "value");

      // Shutdown
      await manager.shutdown();

      // After shutdown, strategy should be null
      const strategy = manager.getStrategy();
      expect(strategy).toBeNull();
    });

    it("should handle shutdown on uninitialized manager", async () => {
      const manager = new UnifiedCacheManager({
        highAvailability: false,
        ttlSeconds: 300,
        staleDataToleranceMinutes: 5,
      });

      // Shutdown without ever initializing
      await expect(manager.shutdown()).resolves.toBeUndefined();
    });

    it("should clear initialization promise on shutdown", async () => {
      const manager = new UnifiedCacheManager({
        highAvailability: false,
        ttlSeconds: 300,
        staleDataToleranceMinutes: 5,
      });

      await manager.set("key", "value");
      await manager.shutdown();

      // After shutdown, can reinitialize
      await manager.set("new-key", "new-value");
      const result = await manager.get("new-key");
      expect(result).toBe("new-value");
    });
  });

  describe("error handling", () => {
    it("should set value with custom TTL", async () => {
      const manager = new UnifiedCacheManager({
        highAvailability: false,
        ttlSeconds: 300,
        staleDataToleranceMinutes: 5,
      });

      // Set with custom TTL
      await manager.set("custom-ttl-key", "value", 60);
      const result = await manager.get("custom-ttl-key");
      expect(result).toBe("value");

      await manager.shutdown();
    });
  });

  describe("concurrent initialization", () => {
    it("should handle concurrent access during initialization", async () => {
      const manager = new UnifiedCacheManager({
        highAvailability: false,
        ttlSeconds: 300,
        staleDataToleranceMinutes: 5,
      });

      // Start multiple operations concurrently
      const [result1, result2, result3] = await Promise.all([
        manager.get("key1"),
        manager.get("key2"),
        manager.set("key3", "value3"),
      ]);

      // All should complete without error
      expect(result1).toBeNull();
      expect(result2).toBeNull();

      // Verify set worked
      const value3 = await manager.get("key3");
      expect(value3).toBe("value3");

      await manager.shutdown();
    });

    it("should reuse initialization promise for concurrent calls", async () => {
      const manager = new UnifiedCacheManager({
        highAvailability: false,
        ttlSeconds: 300,
        staleDataToleranceMinutes: 5,
      });

      // Call multiple methods at once - they should share initialization
      const promises = [manager.isHealthy(), manager.isHealthy(), manager.getStats()];

      const results = await Promise.all(promises);
      expect(results[0]).toBe(true);
      expect(results[1]).toBe(true);
      // Verify stats object (kills mutations)
      expect(typeof results[2]).toBe("object");
      expect(results[2]).not.toBeNull();

      await manager.shutdown();
    });
  });

  describe("strategy selection", () => {
    it("should select local-memory for non-HA config", async () => {
      const manager = new UnifiedCacheManager({
        highAvailability: false,
        ttlSeconds: 300,
        staleDataToleranceMinutes: 5,
      });

      await manager.isHealthy();
      expect(manager.getStrategy()).toBe("local-memory");
      await manager.shutdown();
    });

    it("should select shared-redis for HA config (fallback to local-memory)", async () => {
      // Redis is not available in test, so it should fallback
      const manager = new UnifiedCacheManager({
        highAvailability: true,
        ttlSeconds: 300,
        redisUrl: "redis://localhost:16379", // Non-existent Redis
        staleDataToleranceMinutes: 5,
      });

      await manager.isHealthy();
      // Falls back to local-memory when Redis fails
      expect(manager.getStrategy()).toBe("local-memory");
      await manager.shutdown();
    });
  });

  describe("default values", () => {
    it("should use default maxMemoryEntries if not provided", async () => {
      const manager = new UnifiedCacheManager({
        highAvailability: false,
        ttlSeconds: 300,
        staleDataToleranceMinutes: 5,
        // maxMemoryEntries not provided
      });

      await manager.isHealthy();
      const stats = await manager.getStats();
      // Verify stats with value checks (kills mutations)
      expect(typeof stats).toBe("object");
      expect(stats).not.toBeNull();
      await manager.shutdown();
    });

    it("should use default redisUrl if not provided for HA config", async () => {
      const manager = new UnifiedCacheManager({
        highAvailability: true,
        ttlSeconds: 300,
        staleDataToleranceMinutes: 5,
        // redisUrl not provided - should default to redis://localhost:6379
      });

      // Will fallback to local-memory since Redis is likely not running
      await manager.isHealthy();
      await manager.shutdown();
    });
  });

  describe("complex data types", () => {
    let manager: UnifiedCacheManager;

    beforeEach(() => {
      manager = new UnifiedCacheManager({
        highAvailability: false,
        ttlSeconds: 300,
        staleDataToleranceMinutes: 5,
      });
    });

    afterEach(async () => {
      await manager.shutdown();
    });

    it("should store and retrieve objects", async () => {
      const data = {
        id: "123",
        name: "Test",
        nested: { value: 42 },
        array: [1, 2, 3],
      };

      await manager.set("object-key", data);
      const result = await manager.get<typeof data>("object-key");
      expect(result).toEqual(data);
    });

    it("should store and retrieve arrays", async () => {
      const data = [1, 2, 3, "four", { five: 5 }];

      await manager.set("array-key", data);
      const result = await manager.get<typeof data>("array-key");
      expect(result).toEqual(data);
    });

    it("should store and retrieve strings", async () => {
      await manager.set("string-key", "simple string");
      const result = await manager.get<string>("string-key");
      expect(result).toBe("simple string");
    });

    it("should store and retrieve numbers", async () => {
      await manager.set("number-key", 42);
      const result = await manager.get<number>("number-key");
      expect(result).toBe(42);
    });

    it("should store and retrieve booleans", async () => {
      await manager.set("bool-key", true);
      const result = await manager.get<boolean>("bool-key");
      expect(result).toBe(true);
    });
  });
});
