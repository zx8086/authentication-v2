/* test/bun/cache/shared-redis-backend.test.ts */

import { afterEach, describe, expect, it } from "bun:test";
import { SharedRedisBackend } from "../../../src/cache/backends/shared-redis-backend";

describe("SharedRedisBackend", () => {
  describe("constructor", () => {
    it("should create backend with correct strategy and name", () => {
      const backend = new SharedRedisBackend({
        url: "redis://localhost:16379",
        db: 0,
        ttlSeconds: 300,
        staleDataToleranceMinutes: 5,
      });

      expect(backend.strategy).toBe("shared-redis");
      expect(backend.name).toBe("SharedRedisBackend");
    });
  });

  describe("health check behavior", () => {
    let backend: SharedRedisBackend;

    afterEach(async () => {
      await backend.disconnect();
    });

    it("should return true even when Redis fails (graceful fallback)", async () => {
      backend = new SharedRedisBackend({
        url: "redis://localhost:16379",
        db: 0,
        ttlSeconds: 300,
        staleDataToleranceMinutes: 5,
      });

      await expect(backend.connect()).rejects.toThrow();
      const healthy = await backend.isHealthy();
      expect(healthy).toBe(true);
    });

    it("should handle multiple isHealthy calls with graceful fallback", async () => {
      backend = new SharedRedisBackend({
        url: "redis://localhost:16379",
        db: 0,
        ttlSeconds: 300,
        staleDataToleranceMinutes: 5,
      });

      for (let i = 0; i < 3; i++) {
        const healthy = await backend.isHealthy();
        expect(healthy).toBe(true);
      }
    });
  });

  describe("operations with unavailable Redis", () => {
    let backend: SharedRedisBackend;

    afterEach(async () => {
      await backend.disconnect();
    });

    it("should return null for get operation with unavailable Redis", async () => {
      backend = new SharedRedisBackend({
        url: "redis://localhost:16379",
        db: 0,
        ttlSeconds: 300,
        staleDataToleranceMinutes: 5,
      });

      const result = await backend.get("test-key");
      expect(result).toBeNull();
    });

    it("should handle set operation with unavailable Redis gracefully", async () => {
      backend = new SharedRedisBackend({
        url: "redis://localhost:16379",
        db: 0,
        ttlSeconds: 300,
        staleDataToleranceMinutes: 5,
      });

      await expect(backend.set("test-key", "value")).resolves.toBeUndefined();
    });

    it("should return null for getStale with unavailable Redis", async () => {
      backend = new SharedRedisBackend({
        url: "redis://localhost:16379",
        db: 0,
        ttlSeconds: 300,
        staleDataToleranceMinutes: 5,
      });

      const result = await backend.getStale("test-key");
      expect(result).toBeNull();
    });
  });

  describe("connection lifecycle", () => {
    let backend: SharedRedisBackend;

    afterEach(async () => {
      await backend.disconnect();
    });

    it("should handle connect failure gracefully", async () => {
      backend = new SharedRedisBackend({
        url: "redis://localhost:16379",
        db: 0,
        ttlSeconds: 300,
        staleDataToleranceMinutes: 5,
      });

      await expect(backend.connect()).rejects.toThrow();
    });

    it("should handle disconnect without prior connection", async () => {
      backend = new SharedRedisBackend({
        url: "redis://localhost:16379",
        db: 0,
        ttlSeconds: 300,
        staleDataToleranceMinutes: 5,
      });

      await expect(backend.disconnect()).resolves.toBeUndefined();
    });
  });
});
