// test/bun/services/cache/cache-operation-timeout.test.ts

import { describe, expect, it } from "bun:test";
import {
  CacheOperationTimeoutError,
  DEFAULT_OPERATION_TIMEOUTS,
  withOperationTimeout,
} from "../../../../src/services/cache/cache-operation-timeout";

describe("Cache Operation Timeout", () => {
  describe("DEFAULT_OPERATION_TIMEOUTS", () => {
    it("should have correct default values", () => {
      expect(DEFAULT_OPERATION_TIMEOUTS.get).toBe(1000);
      expect(DEFAULT_OPERATION_TIMEOUTS.set).toBe(2000);
      expect(DEFAULT_OPERATION_TIMEOUTS.delete).toBe(1000);
      expect(DEFAULT_OPERATION_TIMEOUTS.scan).toBe(5000);
      expect(DEFAULT_OPERATION_TIMEOUTS.ping).toBe(500);
      expect(DEFAULT_OPERATION_TIMEOUTS.connect).toBe(5000);
    });
  });

  describe("CacheOperationTimeoutError", () => {
    it("should create error with operation and timeout", () => {
      const error = new CacheOperationTimeoutError("GET", 1000);
      expect(error.message).toBe("Cache GET operation timed out after 1000ms");
      expect(error.operation).toBe("GET");
      expect(error.timeoutMs).toBe(1000);
      expect(error.name).toBe("CacheOperationTimeoutError");
    });

    it("should be instanceof Error", () => {
      const error = new CacheOperationTimeoutError("SET", 2000);
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe("withOperationTimeout", () => {
    it("should resolve with result when operation completes in time", async () => {
      const operation = Promise.resolve("success");
      const result = await withOperationTimeout("GET", 1000, operation);
      expect(result).toBe("success");
    });

    it("should timeout when operation takes too long", async () => {
      const operation = new Promise((resolve) => setTimeout(() => resolve("late"), 100));

      try {
        await withOperationTimeout("GET", 10, operation);
        throw new Error("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(CacheOperationTimeoutError);
        expect((error as CacheOperationTimeoutError).operation).toBe("GET");
        expect((error as CacheOperationTimeoutError).timeoutMs).toBe(10);
      }
    });

    it("should propagate operation errors", async () => {
      const operation = Promise.reject(new Error("Operation failed"));

      try {
        await withOperationTimeout("SET", 1000, operation);
        throw new Error("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe("Operation failed");
      }
    });

    it("should handle very small timeout", async () => {
      const operation = new Promise((resolve) => setTimeout(() => resolve("late"), 100));

      try {
        await withOperationTimeout("GET", 1, operation);
        throw new Error("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(CacheOperationTimeoutError);
      }
    });

    it("should handle different operation types", async () => {
      const operations = ["GET", "SET", "DELETE", "SCAN", "PING", "CONNECT"];

      for (const op of operations) {
        const result = await withOperationTimeout(op, 1000, Promise.resolve(`${op}_result`));
        expect(result).toBe(`${op}_result`);
      }
    });

    it("should resolve with undefined when operation returns void", async () => {
      const operation = Promise.resolve(undefined);
      const result = await withOperationTimeout("DELETE", 1000, operation);
      expect(result).toBeUndefined();
    });

    it("should handle async operations", async () => {
      const operation = (async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return "async result";
      })();

      const result = await withOperationTimeout("GET", 1000, operation);
      expect(result).toBe("async result");
    });

    it("should handle complex return types", async () => {
      const complexResult = { key: "value", nested: { arr: [1, 2, 3] } };
      const operation = Promise.resolve(complexResult);

      const result = await withOperationTimeout("GET", 1000, operation);
      expect(result).toEqual(complexResult);
    });

    it("should include timeout value in error", async () => {
      const operation = new Promise((resolve) => setTimeout(() => resolve("late"), 100));

      try {
        await withOperationTimeout("SCAN", 5, operation);
        throw new Error("Should have thrown");
      } catch (error) {
        expect((error as CacheOperationTimeoutError).message).toContain("5ms");
      }
    });

    it("should race properly with very fast operations", async () => {
      const operation = Promise.resolve("immediate");

      const start = Date.now();
      const result = await withOperationTimeout("GET", 10000, operation);
      const elapsed = Date.now() - start;

      expect(result).toBe("immediate");
      expect(elapsed).toBeLessThan(100);
    });
  });
});
