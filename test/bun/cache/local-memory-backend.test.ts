/* test/bun/cache/local-memory-backend.test.ts */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { LocalMemoryBackend } from "../../../src/cache/backends/local-memory-backend";

describe("LocalMemoryBackend", () => {
  let backend: LocalMemoryBackend;

  beforeEach(() => {
    backend = new LocalMemoryBackend({
      ttlSeconds: 300,
      maxEntries: 100,
    });
  });

  afterEach(async () => {
    await backend.disconnect();
  });

  describe("constructor", () => {
    it("should create backend with correct strategy and name", () => {
      expect(backend.strategy).toBe("local-memory");
      expect(backend.name).toBe("LocalMemoryBackend");
    });
  });

  describe("basic operations", () => {
    it("should set and get a value", async () => {
      await backend.set("test-key", { foo: "bar" });
      const result = await backend.get<{ foo: string }>("test-key");
      expect(result).toEqual({ foo: "bar" });
    });

    it("should return null for non-existent key", async () => {
      const result = await backend.get("non-existent");
      expect(result).toBeNull();
    });

    it("should delete a value", async () => {
      await backend.set("delete-key", "value");
      await backend.delete("delete-key");
      const result = await backend.get("delete-key");
      expect(result).toBeNull();
    });

    it("should clear all values", async () => {
      await backend.set("key1", "value1");
      await backend.set("key2", "value2");
      await backend.clear();
      const result1 = await backend.get("key1");
      const result2 = await backend.get("key2");
      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });
  });

  describe("stats", () => {
    it("should return cache stats", async () => {
      await backend.set("stats-key", "value");
      const stats = await backend.getStats();
      expect(typeof stats).toBe("object");
      expect(stats).not.toBeNull();
      expect(typeof stats.size).toBe("number");
      expect(stats.size).toBeGreaterThanOrEqual(0);
    });
  });

  describe("health check", () => {
    it("should always return true for healthy status", async () => {
      const healthy = await backend.isHealthy();
      expect(healthy).toBe(true);
    });

    it("should return true even after operations", async () => {
      await backend.set("key1", "value1");
      await backend.delete("key1");
      await backend.clear();
      const healthy = await backend.isHealthy();
      expect(healthy).toBe(true);
    });

    it("should never return false for local memory backend", async () => {
      for (let i = 0; i < 5; i++) {
        const healthy = await backend.isHealthy();
        expect(healthy).toBe(true);
        expect(healthy).not.toBe(false);
      }
    });
  });

  describe("connection lifecycle", () => {
    it("should connect without error", async () => {
      await expect(backend.connect()).resolves.toBeUndefined();
    });

    it("should disconnect without error", async () => {
      await expect(backend.disconnect()).resolves.toBeUndefined();
    });

    it("should handle multiple connect calls", async () => {
      await backend.connect();
      await backend.connect();
      await expect(backend.connect()).resolves.toBeUndefined();
    });

    it("should handle multiple disconnect calls", async () => {
      await backend.disconnect();
      await backend.disconnect();
      await expect(backend.disconnect()).resolves.toBeUndefined();
    });
  });

  describe("complex data types", () => {
    it("should handle objects", async () => {
      const data = { id: "123", nested: { value: 42 } };
      await backend.set("obj", data);
      const result = await backend.get<typeof data>("obj");
      expect(result).toEqual(data);
    });

    it("should handle arrays", async () => {
      const data = [1, 2, 3, "four"];
      await backend.set("arr", data);
      const result = await backend.get<typeof data>("arr");
      expect(result).toEqual(data);
    });

    it("should handle strings", async () => {
      await backend.set("str", "test string");
      const result = await backend.get<string>("str");
      expect(result).toBe("test string");
    });

    it("should handle numbers", async () => {
      await backend.set("num", 42);
      const result = await backend.get<number>("num");
      expect(result).toBe(42);
    });

    it("should handle booleans", async () => {
      await backend.set("bool", true);
      const result = await backend.get<boolean>("bool");
      expect(result).toBe(true);
    });
  });

  describe("custom TTL", () => {
    it("should set value with custom TTL", async () => {
      await backend.set("custom-ttl", "value", 60);
      const result = await backend.get("custom-ttl");
      expect(result).toBe("value");
    });
  });
});
