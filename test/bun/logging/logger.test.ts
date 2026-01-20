/* test/bun/logger.test.ts */

import { describe, expect, it } from "bun:test";
import { audit, error, log, logError, logger, warn } from "../../../src/utils/logger";

describe("Logger Utility", () => {
  describe("Logger Functions", () => {
    it("should export log function", () => {
      expect(typeof log).toBe("function");
    });

    it("should export warn function", () => {
      expect(typeof warn).toBe("function");
    });

    it("should export error function", () => {
      expect(typeof error).toBe("function");
    });

    it("should export logger object with all methods", () => {
      expect(logger).toHaveProperty("log");
      expect(logger).toHaveProperty("warn");
      expect(logger).toHaveProperty("error");
      expect(typeof logger.log).toBe("function");
      expect(typeof logger.warn).toBe("function");
      expect(typeof logger.error).toBe("function");
    });
  });

  describe("Function Calls", () => {
    it("should not throw when calling log", () => {
      expect(() => log("test message")).not.toThrow();
    });

    it("should not throw when calling warn", () => {
      expect(() => warn("test warning")).not.toThrow();
    });

    it("should not throw when calling error", () => {
      expect(() => error("test error")).not.toThrow();
    });

    it("should handle missing context parameter", () => {
      expect(() => log("no context")).not.toThrow();
    });

    it("should handle empty context object", () => {
      expect(() => log("empty context", {})).not.toThrow();
    });

    it("should handle context with data", () => {
      expect(() => log("with context", { key: "value" })).not.toThrow();
    });

    it("should handle complex context objects", () => {
      expect(() =>
        log("complex context", {
          nested: { object: true },
          array: [1, 2, 3],
          number: 42,
          boolean: true,
        })
      ).not.toThrow();
    });
  });

  describe("Logger Object Methods", () => {
    it("should not throw when calling logger.log", () => {
      expect(() => logger.log("test message")).not.toThrow();
    });

    it("should not throw when calling logger.warn", () => {
      expect(() => logger.warn("test warning")).not.toThrow();
    });

    it("should not throw when calling logger.error", () => {
      expect(() => logger.error("test error")).not.toThrow();
    });

    it("should not throw when calling logger.audit", () => {
      expect(() => logger.audit("USER_LOGIN")).not.toThrow();
    });

    it("should not throw when calling logger.logError", () => {
      const testError = new Error("Test error");
      expect(() => logger.logError("Error occurred", testError)).not.toThrow();
    });
  });

  describe("Audit Function", () => {
    it("should export audit function", () => {
      expect(typeof audit).toBe("function");
    });

    it("should not throw when calling audit", () => {
      expect(() => audit("USER_LOGIN")).not.toThrow();
    });

    it("should handle audit with context", () => {
      expect(() =>
        audit("USER_LOGIN", {
          userId: "123",
          ipAddress: "192.168.1.1",
          timestamp: new Date().toISOString(),
        })
      ).not.toThrow();
    });

    it("should handle various audit event types", () => {
      expect(() => audit("TOKEN_ISSUED")).not.toThrow();
      expect(() => audit("TOKEN_REVOKED")).not.toThrow();
      expect(() => audit("AUTH_FAILED")).not.toThrow();
      expect(() => audit("CONSUMER_LOOKUP")).not.toThrow();
    });

    it("should handle audit with empty context", () => {
      expect(() => audit("SECURITY_EVENT", {})).not.toThrow();
    });
  });

  describe("LogError Function", () => {
    it("should export logError function", () => {
      expect(typeof logError).toBe("function");
    });

    it("should not throw when calling logError", () => {
      const testError = new Error("Test error message");
      expect(() => logError("An error occurred", testError)).not.toThrow();
    });

    it("should handle error with stack trace", () => {
      const testError = new Error("Test with stack");
      testError.stack = "Error: Test\n    at Test.run (test.ts:1:1)";
      expect(() => logError("Stack trace error", testError)).not.toThrow();
    });

    it("should handle error with custom context", () => {
      const testError = new Error("Context error");
      expect(() =>
        logError("Error with context", testError, {
          operation: "getConsumerSecret",
          consumerId: "test-123",
          duration: 150,
        })
      ).not.toThrow();
    });

    it("should handle TypeError", () => {
      const typeError = new TypeError("Cannot read property 'x' of undefined");
      expect(() => logError("Type error occurred", typeError)).not.toThrow();
    });

    it("should handle SyntaxError", () => {
      const syntaxError = new SyntaxError("Unexpected token");
      expect(() => logError("Syntax error occurred", syntaxError)).not.toThrow();
    });

    it("should handle RangeError", () => {
      const rangeError = new RangeError("Invalid array length");
      expect(() => logError("Range error occurred", rangeError)).not.toThrow();
    });

    it("should handle error without stack", () => {
      const noStackError = new Error("No stack");
      noStackError.stack = undefined;
      expect(() => logError("Error without stack", noStackError)).not.toThrow();
    });
  });

  describe("Logger Object Complete API", () => {
    it("should have audit method on logger object", () => {
      expect(logger).toHaveProperty("audit");
      expect(typeof logger.audit).toBe("function");
    });

    it("should have logError method on logger object", () => {
      expect(logger).toHaveProperty("logError");
      expect(typeof logger.logError).toBe("function");
    });
  });
});
