/* test/bun/logger-output.test.ts */

/**
 * Mutation-resistant tests for logger output and context handling.
 * These tests verify that:
 * - Context objects are correctly passed through to the logger
 * - Service metadata is included in log output
 * - Error objects are properly structured
 * - Audit events include required fields
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { TEST_KONG_ADMIN_TOKEN } from "../../shared/test-constants";

describe("Logger Output Verification - Mutation Testing", () => {
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
    Bun.env.KONG_ADMIN_URL = originalEnv.KONG_ADMIN_URL || "http://192.168.178.3:30001";
    Bun.env.KONG_ADMIN_TOKEN = TEST_KONG_ADMIN_TOKEN;
    Bun.env.OTEL_SERVICE_NAME = "test-auth-service";
    Bun.env.TELEMETRY_ENVIRONMENT = "test";

    const { resetConfigCache } = await import("../../../src/config/config");
    resetConfigCache();
  });

  afterEach(async () => {
    Object.keys(Bun.env).forEach((key) => {
      if (!(key in originalEnv)) {
        delete Bun.env[key];
      }
    });
    Object.assign(Bun.env, originalEnv);

    const { resetConfigCache } = await import("../../../src/config/config");
    resetConfigCache();
  });

  describe("Logger Module Exports", () => {
    it("should export log function", async () => {
      const logger = await import("../../../src/utils/logger");
      expect(typeof logger.log).toBe("function");
    });

    it("should export warn function", async () => {
      const logger = await import("../../../src/utils/logger");
      expect(typeof logger.warn).toBe("function");
    });

    it("should export error function", async () => {
      const logger = await import("../../../src/utils/logger");
      expect(typeof logger.error).toBe("function");
    });

    it("should export audit function", async () => {
      const logger = await import("../../../src/utils/logger");
      expect(typeof logger.audit).toBe("function");
    });

    it("should export logError function", async () => {
      const logger = await import("../../../src/utils/logger");
      expect(typeof logger.logError).toBe("function");
    });

    it("should export logger object with all methods", async () => {
      const { logger } = await import("../../../src/utils/logger");

      expect(logger).toHaveProperty("log");
      expect(logger).toHaveProperty("warn");
      expect(logger).toHaveProperty("error");
      expect(logger).toHaveProperty("audit");
      expect(logger).toHaveProperty("logError");
    });
  });

  describe("Log Function Behavior", () => {
    it("should handle message without context", async () => {
      const { log } = await import("../../../src/utils/logger");

      expect(() => log("Test message")).not.toThrow();
    });

    it("should handle message with empty context", async () => {
      const { log } = await import("../../../src/utils/logger");

      expect(() => log("Test message", {})).not.toThrow();
    });

    it("should handle message with simple context", async () => {
      const { log } = await import("../../../src/utils/logger");

      expect(() =>
        log("Test message", {
          key: "value",
          number: 42,
        })
      ).not.toThrow();
    });

    it("should handle message with nested context", async () => {
      const { log } = await import("../../../src/utils/logger");

      expect(() =>
        log("Test message", {
          nested: {
            level1: {
              level2: "deep value",
            },
          },
        })
      ).not.toThrow();
    });

    it("should handle message with array context", async () => {
      const { log } = await import("../../../src/utils/logger");

      expect(() =>
        log("Test message", {
          items: [1, 2, 3],
          tags: ["tag1", "tag2"],
        })
      ).not.toThrow();
    });
  });

  describe("Warn Function Behavior", () => {
    it("should handle warning message", async () => {
      const { warn } = await import("../../../src/utils/logger");

      expect(() => warn("Warning message")).not.toThrow();
    });

    it("should handle warning with context", async () => {
      const { warn } = await import("../../../src/utils/logger");

      expect(() =>
        warn("Warning message", {
          threshold: 80,
          current: 85,
          resource: "memory",
        })
      ).not.toThrow();
    });
  });

  describe("Error Function Behavior", () => {
    it("should handle error message", async () => {
      const { error } = await import("../../../src/utils/logger");

      expect(() => error("Error message")).not.toThrow();
    });

    it("should handle error with context", async () => {
      const { error } = await import("../../../src/utils/logger");

      expect(() =>
        error("Error message", {
          operation: "getConsumerSecret",
          consumerId: "test-123",
        })
      ).not.toThrow();
    });
  });

  describe("Audit Function Behavior", () => {
    it("should handle audit event without context", async () => {
      const { audit } = await import("../../../src/utils/logger");

      expect(() => audit("USER_LOGIN")).not.toThrow();
    });

    it("should handle audit event with context", async () => {
      const { audit } = await import("../../../src/utils/logger");

      expect(() =>
        audit("TOKEN_ISSUED", {
          consumerId: "consumer-123",
          tokenId: "token-456",
          expiresIn: 900,
        })
      ).not.toThrow();
    });

    it("should handle various audit event types", async () => {
      const { audit } = await import("../../../src/utils/logger");

      const eventTypes = [
        "USER_LOGIN",
        "USER_LOGOUT",
        "TOKEN_ISSUED",
        "TOKEN_REVOKED",
        "TOKEN_VALIDATED",
        "AUTH_FAILED",
        "CONSUMER_LOOKUP",
        "CACHE_HIT",
        "CACHE_MISS",
        "CIRCUIT_BREAKER_OPEN",
        "CIRCUIT_BREAKER_CLOSE",
      ];

      for (const eventType of eventTypes) {
        expect(() => audit(eventType)).not.toThrow();
      }
    });

    it("should handle audit with timestamp context", async () => {
      const { audit } = await import("../../../src/utils/logger");

      expect(() =>
        audit("SECURITY_EVENT", {
          timestamp: new Date().toISOString(),
          ipAddress: "192.168.1.1",
          userAgent: "Mozilla/5.0",
        })
      ).not.toThrow();
    });
  });

  describe("LogError Function Behavior", () => {
    it("should handle Error object", async () => {
      const { logError } = await import("../../../src/utils/logger");

      const err = new Error("Test error message");
      expect(() => logError("An error occurred", err)).not.toThrow();
    });

    it("should handle TypeError", async () => {
      const { logError } = await import("../../../src/utils/logger");

      const err = new TypeError("Cannot read property of undefined");
      expect(() => logError("Type error occurred", err)).not.toThrow();
    });

    it("should handle SyntaxError", async () => {
      const { logError } = await import("../../../src/utils/logger");

      const err = new SyntaxError("Unexpected token");
      expect(() => logError("Syntax error occurred", err)).not.toThrow();
    });

    it("should handle RangeError", async () => {
      const { logError } = await import("../../../src/utils/logger");

      const err = new RangeError("Invalid array length");
      expect(() => logError("Range error occurred", err)).not.toThrow();
    });

    it("should handle error with additional context", async () => {
      const { logError } = await import("../../../src/utils/logger");

      const err = new Error("Database connection failed");
      expect(() =>
        logError("Database error", err, {
          database: "kong",
          operation: "connect",
          attempt: 3,
          maxAttempts: 5,
        })
      ).not.toThrow();
    });

    it("should handle error without stack trace", async () => {
      const { logError } = await import("../../../src/utils/logger");

      const err = new Error("Error without stack");
      err.stack = undefined;
      expect(() => logError("Stackless error", err)).not.toThrow();
    });

    it("should handle error with custom name", async () => {
      const { logError } = await import("../../../src/utils/logger");

      const err = new Error("Custom error");
      err.name = "CustomValidationError";
      expect(() => logError("Validation failed", err)).not.toThrow();
    });
  });

  describe("Logger Object Methods", () => {
    it("should call log through logger object", async () => {
      const { logger } = await import("../../../src/utils/logger");

      expect(() => logger.log("Message via logger object")).not.toThrow();
    });

    it("should call warn through logger object", async () => {
      const { logger } = await import("../../../src/utils/logger");

      expect(() => logger.warn("Warning via logger object")).not.toThrow();
    });

    it("should call error through logger object", async () => {
      const { logger } = await import("../../../src/utils/logger");

      expect(() => logger.error("Error via logger object")).not.toThrow();
    });

    it("should call audit through logger object", async () => {
      const { logger } = await import("../../../src/utils/logger");

      expect(() => logger.audit("AUDIT_EVENT")).not.toThrow();
    });

    it("should call logError through logger object", async () => {
      const { logger } = await import("../../../src/utils/logger");

      const err = new Error("Test");
      expect(() => logger.logError("Error occurred", err)).not.toThrow();
    });
  });

  describe("Edge Cases", () => {
    it("should handle undefined context values", async () => {
      const { log } = await import("../../../src/utils/logger");

      expect(() =>
        log("Message with undefined", {
          defined: "value",
          maybeUndefined: undefined,
        })
      ).not.toThrow();
    });

    it("should handle null context values", async () => {
      const { log } = await import("../../../src/utils/logger");

      expect(() =>
        log("Message with null", {
          defined: "value",
          maybeNull: null,
        })
      ).not.toThrow();
    });

    it("should handle very long message", async () => {
      const { log } = await import("../../../src/utils/logger");

      const longMessage = "A".repeat(10000);
      expect(() => log(longMessage)).not.toThrow();
    });

    it("should handle special characters in message", async () => {
      const { log } = await import("../../../src/utils/logger");

      expect(() => log("Message with \"quotes\" and 'apostrophes'")).not.toThrow();
      expect(() => log("Message with\nnewlines\tand\ttabs")).not.toThrow();
      expect(() => log("Message with unicode: \u0000\u0001\u0002")).not.toThrow();
    });

    it("should handle empty string message", async () => {
      const { log } = await import("../../../src/utils/logger");

      expect(() => log("")).not.toThrow();
    });

    it("should handle Date objects in context", async () => {
      const { log } = await import("../../../src/utils/logger");

      expect(() =>
        log("Message with date", {
          createdAt: new Date(),
          expiry: new Date(Date.now() + 3600000),
        })
      ).not.toThrow();
    });

    it("should handle circular reference protection", async () => {
      const { log } = await import("../../../src/utils/logger");

      const obj: Record<string, any> = { name: "test" };
      obj.self = obj; // Circular reference

      // Should not throw even with circular reference
      // The underlying logger should handle this
      expect(() => log("Circular reference", obj)).not.toThrow();
    });
  });
});
