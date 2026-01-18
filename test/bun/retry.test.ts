/* test/bun/retry.test.ts */

import { describe, expect, it } from "bun:test";
import { withRetry } from "../../src/utils/retry";

describe("Retry Utility", () => {
  describe("withRetry - Success Cases", () => {
    it("should return result on first successful attempt", async () => {
      const operation = async () => "success";
      const result = await withRetry(operation);
      expect(result).toBe("success");
    });

    it("should return result with custom options", async () => {
      const operation = async () => 42;
      const result = await withRetry(operation, { maxAttempts: 5, baseDelayMs: 50 });
      expect(result).toBe(42);
    });

    it("should handle async operations that return objects", async () => {
      const operation = async () => ({ data: "test", count: 10 });
      const result = await withRetry(operation);
      expect(result).toEqual({ data: "test", count: 10 });
    });

    it("should handle async operations that return arrays", async () => {
      const operation = async () => [1, 2, 3];
      const result = await withRetry(operation);
      expect(result).toEqual([1, 2, 3]);
    });

    it("should handle async operations that return null", async () => {
      const operation = async () => null;
      const result = await withRetry(operation);
      expect(result).toBeNull();
    });

    it("should handle async operations that return undefined", async () => {
      const operation = async () => undefined;
      const result = await withRetry(operation);
      expect(result).toBeUndefined();
    });
  });

  describe("withRetry - Retry Behavior", () => {
    it("should retry on failure and succeed on second attempt", async () => {
      let attempts = 0;
      const operation = async () => {
        attempts++;
        if (attempts < 2) {
          throw new Error("First attempt failed");
        }
        return "success";
      };

      const result = await withRetry(operation, { maxAttempts: 3, baseDelayMs: 10 });
      expect(result).toBe("success");
      expect(attempts).toBe(2);
    });

    it("should retry on failure and succeed on third attempt", async () => {
      let attempts = 0;
      const operation = async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error(`Attempt ${attempts} failed`);
        }
        return "finally success";
      };

      const result = await withRetry(operation, { maxAttempts: 3, baseDelayMs: 10 });
      expect(result).toBe("finally success");
      expect(attempts).toBe(3);
    });

    it("should track number of attempts correctly", async () => {
      let attempts = 0;
      const operation = async () => {
        attempts++;
        if (attempts < 2) {
          throw new Error("Retry needed");
        }
        return attempts;
      };

      const result = await withRetry(operation, { maxAttempts: 5, baseDelayMs: 10 });
      expect(result).toBe(2);
    });
  });

  describe("withRetry - Failure Cases", () => {
    it("should throw after max attempts exceeded", async () => {
      let attempts = 0;
      const operation = async () => {
        attempts++;
        throw new Error("Always fails");
      };

      await expect(withRetry(operation, { maxAttempts: 3, baseDelayMs: 10 })).rejects.toThrow(
        "Always fails"
      );
      expect(attempts).toBe(3);
    });

    it("should throw the last error after all retries", async () => {
      let attempts = 0;
      const operation = async () => {
        attempts++;
        throw new Error(`Error on attempt ${attempts}`);
      };

      await expect(withRetry(operation, { maxAttempts: 3, baseDelayMs: 10 })).rejects.toThrow(
        "Error on attempt 3"
      );
    });

    it("should convert non-Error throws to Error objects", async () => {
      const operation = async () => {
        throw "string error";
      };

      await expect(withRetry(operation, { maxAttempts: 1, baseDelayMs: 10 })).rejects.toThrow(
        "string error"
      );
    });

    it("should handle TypeError", async () => {
      const operation = async () => {
        throw new TypeError("Type error occurred");
      };

      await expect(withRetry(operation, { maxAttempts: 2, baseDelayMs: 10 })).rejects.toThrow(
        TypeError
      );
    });

    it("should handle custom error types", async () => {
      class CustomError extends Error {
        constructor(message: string) {
          super(message);
          this.name = "CustomError";
        }
      }

      const operation = async () => {
        throw new CustomError("Custom error occurred");
      };

      await expect(withRetry(operation, { maxAttempts: 2, baseDelayMs: 10 })).rejects.toThrow(
        "Custom error occurred"
      );
    });
  });

  describe("withRetry - Options", () => {
    it("should use default options when none provided", async () => {
      const operation = async () => "default options";
      const result = await withRetry(operation);
      expect(result).toBe("default options");
    });

    it("should respect maxAttempts option", async () => {
      let attempts = 0;
      const operation = async () => {
        attempts++;
        throw new Error("Always fails");
      };

      await expect(withRetry(operation, { maxAttempts: 5, baseDelayMs: 1 })).rejects.toThrow();
      expect(attempts).toBe(5);
    });

    it("should respect maxAttempts of 1 (no retries)", async () => {
      let attempts = 0;
      const operation = async () => {
        attempts++;
        throw new Error("Single attempt");
      };

      await expect(withRetry(operation, { maxAttempts: 1 })).rejects.toThrow("Single attempt");
      expect(attempts).toBe(1);
    });

    it("should use baseDelayMs for initial delay", async () => {
      let attempts = 0;
      const start = Date.now();
      const operation = async () => {
        attempts++;
        if (attempts < 2) {
          throw new Error("Retry");
        }
        return "done";
      };

      await withRetry(operation, { maxAttempts: 2, baseDelayMs: 50 });
      const elapsed = Date.now() - start;

      // Should have waited at least 50ms (baseDelayMs) before second attempt
      expect(elapsed).toBeGreaterThanOrEqual(40); // Allow some margin
    });

    it("should respect maxDelayMs to cap delay time", async () => {
      let attempts = 0;
      const start = Date.now();
      const operation = async () => {
        attempts++;
        if (attempts < 4) {
          throw new Error("Retry");
        }
        return "done";
      };

      await withRetry(operation, {
        maxAttempts: 5,
        baseDelayMs: 100,
        maxDelayMs: 150,
      });
      const elapsed = Date.now() - start;

      // With maxDelayMs=150, delays should be capped
      // Without cap: 100 + 200 + 400 = 700ms
      // With cap: 100 + 150 + 150 = 400ms
      expect(elapsed).toBeLessThan(600);
    });
  });

  describe("withRetry - Exponential Backoff", () => {
    it("should apply exponential backoff on retries", async () => {
      const delays: number[] = [];
      let lastTime = Date.now();
      let attempts = 0;

      const operation = async () => {
        const now = Date.now();
        if (attempts > 0) {
          delays.push(now - lastTime);
        }
        lastTime = now;
        attempts++;
        if (attempts < 4) {
          throw new Error("Retry");
        }
        return "done";
      };

      await withRetry(operation, { maxAttempts: 4, baseDelayMs: 20, maxDelayMs: 1000 });

      // delays[0] should be ~20ms (baseDelayMs * 2^0)
      // delays[1] should be ~40ms (baseDelayMs * 2^1)
      // delays[2] should be ~80ms (baseDelayMs * 2^2)
      expect(delays.length).toBe(3);
      // Check that delays are roughly increasing (exponential)
      expect(delays[1]).toBeGreaterThan(delays[0] * 0.8); // Allow margin for timing
      expect(delays[2]).toBeGreaterThan(delays[1] * 0.8);
    });
  });

  describe("withRetry - Edge Cases", () => {
    it("should handle operation that resolves after delay", async () => {
      const operation = async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return "delayed result";
      };

      const result = await withRetry(operation);
      expect(result).toBe("delayed result");
    });

    it("should handle empty options object", async () => {
      const operation = async () => "empty options";
      const result = await withRetry(operation, {});
      expect(result).toBe("empty options");
    });

    it("should handle partial options", async () => {
      const operation = async () => "partial options";
      const result = await withRetry(operation, { maxAttempts: 2 });
      expect(result).toBe("partial options");
    });
  });
});
