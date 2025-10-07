/* test/bun/logger.test.ts */

import { describe, expect, it } from "bun:test";
import { log, warn, error, logger } from "../../src/utils/logger";

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
      expect(() => log("complex context", {
        nested: { object: true },
        array: [1, 2, 3],
        number: 42,
        boolean: true
      })).not.toThrow();
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
  });
});