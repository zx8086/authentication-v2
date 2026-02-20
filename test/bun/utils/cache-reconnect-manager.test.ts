// test/bun/utils/cache-reconnect-manager.test.ts

import { afterEach, beforeEach, describe, expect, it, jest } from "bun:test";
import {
  CacheReconnectManager,
  DEFAULT_RECONNECT_CONFIG,
} from "../../../src/utils/cache-reconnect-manager";

describe("Cache Reconnect Manager", () => {
  describe("DEFAULT_RECONNECT_CONFIG", () => {
    it("should have correct default values", () => {
      expect(DEFAULT_RECONNECT_CONFIG.maxAttempts).toBe(5);
      expect(DEFAULT_RECONNECT_CONFIG.baseDelayMs).toBe(100);
      expect(DEFAULT_RECONNECT_CONFIG.maxDelayMs).toBe(5000);
      expect(DEFAULT_RECONNECT_CONFIG.cooldownMs).toBe(60000);
    });
  });

  describe("CacheReconnectManager", () => {
    let manager: CacheReconnectManager;

    beforeEach(() => {
      manager = new CacheReconnectManager();
    });

    afterEach(() => {
      manager.reset();
    });

    describe("executeReconnect", () => {
      it("should successfully reconnect on first attempt", async () => {
        const reconnectFn = jest.fn().mockResolvedValue(undefined);
        const result = await manager.executeReconnect(reconnectFn);

        expect(result.success).toBe(true);
        expect(result.attempts).toBe(1);
        expect(reconnectFn).toHaveBeenCalledTimes(1);
      });

      it("should return failure result on failed reconnect", async () => {
        const reconnectFn = jest.fn().mockRejectedValue(new Error("Connection failed"));
        const result = await manager.executeReconnect(reconnectFn);

        expect(result.success).toBe(false);
        expect(result.error?.message).toBe("Connection failed");
        expect(result.attempts).toBe(1);
      });

      it("should prevent concurrent reconnection attempts (mutex)", async () => {
        let resolveFirst: () => void;
        const firstPromise = new Promise<void>((resolve) => {
          resolveFirst = resolve;
        });

        const reconnectFn = jest.fn().mockImplementation(async () => {
          await firstPromise;
        });

        // Start first reconnection
        const result1Promise = manager.executeReconnect(reconnectFn);

        // Second call should wait for first (mutex)
        const result2Promise = manager.executeReconnect(reconnectFn);

        // Complete first reconnection
        resolveFirst!();

        // Both should get the same result (from the first call)
        const result1 = await result1Promise;
        const result2 = await result2Promise;

        expect(result1.success).toBe(true);
        expect(result2.success).toBe(true);
        // Only one actual reconnection attempt
        expect(reconnectFn).toHaveBeenCalledTimes(1);
      });

      it("should track attempt count across calls", async () => {
        const reconnectFn = jest.fn().mockRejectedValue(new Error("Connection failed"));

        const result1 = await manager.executeReconnect(reconnectFn);
        const result2 = await manager.executeReconnect(reconnectFn);
        const result3 = await manager.executeReconnect(reconnectFn);

        expect(result1.attempts).toBe(1);
        expect(result2.attempts).toBe(2);
        expect(result3.attempts).toBe(3);
      });

      it("should fail when max attempts exceeded", async () => {
        const manager = new CacheReconnectManager({
          maxAttempts: 2,
          baseDelayMs: 1,
          maxDelayMs: 10,
          cooldownMs: 60000,
        });
        const reconnectFn = jest.fn().mockRejectedValue(new Error("Connection failed"));

        await manager.executeReconnect(reconnectFn);
        await manager.executeReconnect(reconnectFn);
        const result = await manager.executeReconnect(reconnectFn);

        expect(result.success).toBe(false);
        expect(result.error?.message).toContain("Max reconnection attempts");
        // Should not have called reconnectFn for the 3rd attempt
        expect(reconnectFn).toHaveBeenCalledTimes(2);
      });

      it("should reset attempts on successful reconnection", async () => {
        const manager = new CacheReconnectManager({
          maxAttempts: 5,
          baseDelayMs: 1,
          maxDelayMs: 10,
          cooldownMs: 60000,
        });
        const reconnectFn = jest.fn().mockResolvedValue(undefined);

        await manager.executeReconnect(reconnectFn);

        const stats = manager.getStats();
        expect(stats.attempts).toBe(0); // Reset after success
      });
    });

    describe("getStats", () => {
      it("should return initial stats", () => {
        const stats = manager.getStats();
        expect(stats.attempts).toBe(0);
        expect(stats.lastAttemptTime).toBe(0);
        expect(stats.isReconnecting).toBe(false);
        expect(stats.totalSuccesses).toBe(0);
        expect(stats.totalFailures).toBe(0);
      });

      it("should track total successes", async () => {
        const reconnectFn = jest.fn().mockResolvedValue(undefined);

        await manager.executeReconnect(reconnectFn);
        await manager.executeReconnect(reconnectFn);

        const stats = manager.getStats();
        expect(stats.totalSuccesses).toBe(2);
      });

      it("should track total failures", async () => {
        const reconnectFn = jest.fn().mockRejectedValue(new Error("fail"));

        await manager.executeReconnect(reconnectFn);
        await manager.executeReconnect(reconnectFn);

        const stats = manager.getStats();
        expect(stats.totalFailures).toBe(2);
      });
    });

    describe("isReconnecting", () => {
      it("should return false initially", () => {
        expect(manager.isReconnecting()).toBe(false);
      });

      it("should return true during reconnection", async () => {
        let resolveReconnect: () => void;
        const reconnectPromise = new Promise<void>((resolve) => {
          resolveReconnect = resolve;
        });

        const reconnectFn = jest.fn().mockImplementation(async () => {
          await reconnectPromise;
        });

        const executePromise = manager.executeReconnect(reconnectFn);

        // Check state during reconnection
        expect(manager.isReconnecting()).toBe(true);

        // Complete reconnection
        resolveReconnect!();
        await executePromise;

        // Check state after reconnection
        expect(manager.isReconnecting()).toBe(false);
      });
    });

    describe("reset", () => {
      it("should reset all state", async () => {
        const reconnectFn = jest.fn().mockRejectedValue(new Error("fail"));

        await manager.executeReconnect(reconnectFn);
        await manager.executeReconnect(reconnectFn);

        expect(manager.getStats().attempts).toBe(2);

        manager.reset();

        const stats = manager.getStats();
        expect(stats.attempts).toBe(0);
        expect(stats.lastAttemptTime).toBe(0);
      });
    });

    describe("isExhausted", () => {
      it("should return false initially", () => {
        expect(manager.isExhausted()).toBe(false);
      });

      it("should return true after max attempts", async () => {
        const manager = new CacheReconnectManager({
          maxAttempts: 2,
          baseDelayMs: 1,
          maxDelayMs: 10,
          cooldownMs: 60000,
        });
        const reconnectFn = jest.fn().mockRejectedValue(new Error("fail"));

        await manager.executeReconnect(reconnectFn);
        expect(manager.isExhausted()).toBe(false);

        await manager.executeReconnect(reconnectFn);
        expect(manager.isExhausted()).toBe(true);
      });
    });

    describe("getNextDelayMs", () => {
      it("should calculate exponential backoff", async () => {
        const reconnectFn = jest.fn().mockRejectedValue(new Error("fail"));

        // Initial delay should be baseDelayMs (100)
        expect(manager.getNextDelayMs()).toBe(100);

        await manager.executeReconnect(reconnectFn);
        // After 1 failure, next delay = 100 * 2^1 = 200
        expect(manager.getNextDelayMs()).toBe(200);

        await manager.executeReconnect(reconnectFn);
        // After 2 failures, next delay = 100 * 2^2 = 400
        expect(manager.getNextDelayMs()).toBe(400);
      });
    });

    describe("cooldown", () => {
      it("should respect cooldown after max attempts", async () => {
        const manager = new CacheReconnectManager({
          maxAttempts: 1,
          baseDelayMs: 1,
          maxDelayMs: 10,
          cooldownMs: 100,
        });
        const reconnectFn = jest.fn().mockRejectedValue(new Error("fail"));

        await manager.executeReconnect(reconnectFn);
        expect(manager.isExhausted()).toBe(true);

        // Cooldown remaining should be close to 100ms
        const remaining = manager.getCooldownRemainingMs();
        expect(remaining).toBeGreaterThan(0);
        expect(remaining).toBeLessThanOrEqual(100);
      });

      it("should reset cooldown after period elapses", async () => {
        const manager = new CacheReconnectManager({
          maxAttempts: 1,
          baseDelayMs: 1,
          maxDelayMs: 10,
          cooldownMs: 50,
        });
        const reconnectFn = jest.fn().mockRejectedValue(new Error("fail"));

        await manager.executeReconnect(reconnectFn);
        expect(manager.isExhausted()).toBe(true);

        // Wait for cooldown
        await new Promise((resolve) => setTimeout(resolve, 60));

        // Should allow new attempt after cooldown
        reconnectFn.mockResolvedValueOnce(undefined);
        const result = await manager.executeReconnect(reconnectFn);
        expect(result.success).toBe(true);
      });
    });
  });
});
