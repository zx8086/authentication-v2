// test/bun/utils/cache-error-detector.test.ts

import { describe, expect, it } from "bun:test";
import {
  type CacheErrorCategory,
  detectCacheError,
  getSupportedErrorPatterns,
  isConnectionError,
  isRecoverableError,
} from "../../../src/utils/cache-error-detector";

describe("Cache Error Detector", () => {
  describe("detectCacheError", () => {
    describe("connection closed errors", () => {
      it("should detect ERR_REDIS_CONNECTION_CLOSED", () => {
        const result = detectCacheError(new Error("ERR_REDIS_CONNECTION_CLOSED"));
        expect(result.category).toBe("connection_closed");
        expect(result.isRecoverable).toBe(true);
        expect(result.shouldReconnect).toBe(true);
      });

      it("should detect EPIPE error", () => {
        const result = detectCacheError(new Error("EPIPE: broken pipe"));
        expect(result.category).toBe("connection_closed");
        expect(result.shouldReconnect).toBe(true);
      });

      it("should detect ENOTCONN error", () => {
        const result = detectCacheError(new Error("ENOTCONN: not connected"));
        expect(result.category).toBe("connection_closed");
        expect(result.shouldReconnect).toBe(true);
      });

      it("should detect connection closed message", () => {
        const result = detectCacheError(new Error("Connection closed unexpectedly"));
        expect(result.category).toBe("connection_closed");
        expect(result.shouldReconnect).toBe(true);
      });

      it("should detect connection lost message", () => {
        const result = detectCacheError(new Error("Connection lost"));
        expect(result.category).toBe("connection_closed");
        expect(result.shouldReconnect).toBe(true);
      });

      it("should detect socket closed message", () => {
        const result = detectCacheError(new Error("Socket closed"));
        expect(result.category).toBe("connection_closed");
        expect(result.shouldReconnect).toBe(true);
      });

      it("should detect socket hang up message", () => {
        const result = detectCacheError(new Error("socket hang up"));
        expect(result.category).toBe("connection_closed");
        expect(result.shouldReconnect).toBe(true);
      });

      it("should detect broken pipe message", () => {
        const result = detectCacheError(new Error("Broken pipe"));
        expect(result.category).toBe("connection_closed");
        expect(result.shouldReconnect).toBe(true);
      });
    });

    describe("connection reset errors", () => {
      it("should detect ECONNRESET error", () => {
        const result = detectCacheError(new Error("ECONNRESET"));
        expect(result.category).toBe("connection_reset");
        expect(result.isRecoverable).toBe(true);
        expect(result.shouldReconnect).toBe(true);
      });

      it("should detect read ECONNRESET error", () => {
        const result = detectCacheError(new Error("read ECONNRESET"));
        expect(result.category).toBe("connection_reset");
        expect(result.shouldReconnect).toBe(true);
      });

      it("should detect connection reset message", () => {
        const result = detectCacheError(new Error("Connection reset by peer"));
        expect(result.category).toBe("connection_reset");
        expect(result.shouldReconnect).toBe(true);
      });
    });

    describe("connection refused errors", () => {
      it("should detect ECONNREFUSED error", () => {
        const result = detectCacheError(new Error("ECONNREFUSED"));
        expect(result.category).toBe("connection_refused");
        expect(result.isRecoverable).toBe(true);
        expect(result.shouldReconnect).toBe(true);
      });
    });

    describe("timeout errors", () => {
      it("should detect ETIMEDOUT error", () => {
        const result = detectCacheError(new Error("ETIMEDOUT"));
        expect(result.category).toBe("connection_timeout");
        expect(result.isRecoverable).toBe(true);
        expect(result.shouldReconnect).toBe(true);
      });

      it("should detect connection timeout message", () => {
        const result = detectCacheError(new Error("Connection timeout"));
        expect(result.category).toBe("connection_timeout");
        expect(result.shouldReconnect).toBe(true);
      });

      it("should detect operation timed out message", () => {
        const result = detectCacheError(new Error("Operation timed out"));
        expect(result.category).toBe("connection_timeout");
        expect(result.shouldReconnect).toBe(true);
      });

      it("should detect operation timeout message", () => {
        const result = detectCacheError(new Error("Operation timeout"));
        expect(result.category).toBe("connection_timeout");
        expect(result.shouldReconnect).toBe(true);
      });
    });

    describe("network errors", () => {
      it("should detect EHOSTUNREACH error", () => {
        const result = detectCacheError(new Error("EHOSTUNREACH"));
        expect(result.category).toBe("network_error");
        expect(result.isRecoverable).toBe(true);
        expect(result.shouldReconnect).toBe(true);
      });

      it("should detect ENETUNREACH error", () => {
        const result = detectCacheError(new Error("ENETUNREACH"));
        expect(result.category).toBe("network_error");
        expect(result.shouldReconnect).toBe(true);
      });

      it("should detect EADDRNOTAVAIL error", () => {
        const result = detectCacheError(new Error("EADDRNOTAVAIL"));
        expect(result.category).toBe("network_error");
        expect(result.shouldReconnect).toBe(true);
      });

      it("should detect ENETDOWN error", () => {
        const result = detectCacheError(new Error("ENETDOWN"));
        expect(result.category).toBe("network_error");
        expect(result.shouldReconnect).toBe(true);
      });

      it("should detect ENOENT error", () => {
        const result = detectCacheError(new Error("ENOENT"));
        expect(result.category).toBe("network_error");
        expect(result.shouldReconnect).toBe(true);
      });
    });

    describe("server state errors", () => {
      it("should detect READONLY mode", () => {
        const result = detectCacheError(
          new Error("READONLY You can't write against a read only replica")
        );
        expect(result.category).toBe("readonly_mode");
        expect(result.isRecoverable).toBe(false);
        expect(result.shouldReconnect).toBe(false);
      });

      it("should detect LOADING state", () => {
        const result = detectCacheError(
          new Error("LOADING Redis is loading the dataset in memory")
        );
        expect(result.category).toBe("server_busy");
        expect(result.isRecoverable).toBe(true);
        expect(result.shouldReconnect).toBe(false);
      });

      it("should detect BUSY state", () => {
        const result = detectCacheError(new Error("BUSY Redis is busy running a script"));
        expect(result.category).toBe("server_busy");
        expect(result.isRecoverable).toBe(true);
        expect(result.shouldReconnect).toBe(false);
      });

      it("should detect CLUSTERDOWN state", () => {
        const result = detectCacheError(new Error("CLUSTERDOWN The cluster is down"));
        expect(result.category).toBe("server_busy");
        expect(result.isRecoverable).toBe(true);
        expect(result.shouldReconnect).toBe(false);
      });
    });

    describe("unknown errors", () => {
      it("should return unknown for unrecognized error", () => {
        const result = detectCacheError(new Error("Some random error"));
        expect(result.category).toBe("unknown");
        expect(result.isRecoverable).toBe(false);
        expect(result.shouldReconnect).toBe(false);
      });

      it("should handle empty error message", () => {
        const result = detectCacheError(new Error(""));
        expect(result.category).toBe("unknown");
        expect(result.isRecoverable).toBe(false);
        expect(result.shouldReconnect).toBe(false);
      });
    });

    describe("string input", () => {
      it("should accept string error message", () => {
        const result = detectCacheError("ERR_REDIS_CONNECTION_CLOSED");
        expect(result.category).toBe("connection_closed");
        expect(result.shouldReconnect).toBe(true);
        expect(result.message).toBe("ERR_REDIS_CONNECTION_CLOSED");
      });

      it("should handle empty string", () => {
        const result = detectCacheError("");
        expect(result.category).toBe("unknown");
        expect(result.message).toBe("");
      });
    });

    describe("edge cases", () => {
      it("should handle error with undefined message", () => {
        const error = new Error();
        // Force undefined message
        (error as Record<string, unknown>).message = undefined;
        const result = detectCacheError(error as Error);
        expect(result.category).toBe("unknown");
        expect(result.message).toBe("");
      });

      it("should handle error with null message", () => {
        const error = new Error();
        // Force null message
        (error as Record<string, unknown>).message = null;
        const result = detectCacheError(error as Error);
        expect(result.category).toBe("unknown");
        expect(result.message).toBe("");
      });

      it("should handle error with numeric message", () => {
        const error = new Error();
        // Force numeric message
        (error as Record<string, unknown>).message = 123;
        const result = detectCacheError(error as Error);
        expect(result.category).toBe("unknown");
        expect(result.message).toBe("123");
      });

      it("should preserve original message in result", () => {
        const originalMessage = "ERR_REDIS_CONNECTION_CLOSED: connection was closed";
        const result = detectCacheError(new Error(originalMessage));
        expect(result.message).toBe(originalMessage);
      });
    });
  });

  describe("isConnectionError", () => {
    it("should return true for connection closed errors", () => {
      expect(isConnectionError(new Error("ERR_REDIS_CONNECTION_CLOSED"))).toBe(true);
    });

    it("should return true for connection reset errors", () => {
      expect(isConnectionError(new Error("ECONNRESET"))).toBe(true);
    });

    it("should return true for timeout errors", () => {
      expect(isConnectionError(new Error("ETIMEDOUT"))).toBe(true);
    });

    it("should return false for server busy errors", () => {
      expect(isConnectionError(new Error("LOADING"))).toBe(false);
    });

    it("should return false for readonly errors", () => {
      expect(isConnectionError(new Error("READONLY"))).toBe(false);
    });

    it("should return false for unknown errors", () => {
      expect(isConnectionError(new Error("Some random error"))).toBe(false);
    });

    it("should accept string input", () => {
      expect(isConnectionError("ERR_REDIS_CONNECTION_CLOSED")).toBe(true);
    });
  });

  describe("isRecoverableError", () => {
    it("should return true for connection closed errors", () => {
      expect(isRecoverableError(new Error("ERR_REDIS_CONNECTION_CLOSED"))).toBe(true);
    });

    it("should return true for server busy errors", () => {
      expect(isRecoverableError(new Error("LOADING"))).toBe(true);
    });

    it("should return false for readonly errors", () => {
      expect(isRecoverableError(new Error("READONLY"))).toBe(false);
    });

    it("should return false for unknown errors", () => {
      expect(isRecoverableError(new Error("Some random error"))).toBe(false);
    });

    it("should accept string input", () => {
      expect(isRecoverableError("ETIMEDOUT")).toBe(true);
    });
  });

  describe("getSupportedErrorPatterns", () => {
    it("should return patterns grouped by category", () => {
      const patterns = getSupportedErrorPatterns();
      expect(Array.isArray(patterns)).toBe(true);
      expect(patterns.length).toBeGreaterThan(0);
    });

    it("should include all expected categories", () => {
      const patterns = getSupportedErrorPatterns();
      const categories = patterns.map((p) => p.category);

      const expectedCategories: CacheErrorCategory[] = [
        "connection_closed",
        "connection_reset",
        "connection_refused",
        "connection_timeout",
        "network_error",
        "readonly_mode",
        "server_busy",
      ];

      for (const expected of expectedCategories) {
        expect(categories).toContain(expected);
      }
    });

    it("should have patterns array for each category", () => {
      const patterns = getSupportedErrorPatterns();
      for (const entry of patterns) {
        expect(Array.isArray(entry.patterns)).toBe(true);
        expect(entry.patterns.length).toBeGreaterThan(0);
      }
    });

    it("should include connection_closed with multiple patterns", () => {
      const patterns = getSupportedErrorPatterns();
      const connectionClosed = patterns.find((p) => p.category === "connection_closed");
      expect(connectionClosed).toBeDefined();
      expect(connectionClosed!.patterns.length).toBeGreaterThan(3);
    });
  });
});
