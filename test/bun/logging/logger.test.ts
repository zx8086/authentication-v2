// test/bun/logging/logger.test.ts

import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
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
    it("should not throw when calling log with event_name", () => {
      expect(() => log("test message", { event_name: "auth.request.success" })).not.toThrow();
    });

    it("should not throw when calling warn with event_name", () => {
      expect(() => warn("test warning", { event_name: "auth.request.failed" })).not.toThrow();
    });

    it("should not throw when calling error with event_name", () => {
      expect(() => error("test error", { event_name: "http.request.failed" })).not.toThrow();
    });

    it("should handle context with extra data", () => {
      expect(() =>
        log("with context", { event_name: "auth.request.success", key: "value" })
      ).not.toThrow();
    });

    it("should handle complex context objects", () => {
      expect(() =>
        log("complex context", {
          event_name: "http.request.completed",
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
      expect(() =>
        logger.log("test message", { event_name: "auth.request.success" })
      ).not.toThrow();
    });

    it("should not throw when calling logger.warn", () => {
      expect(() =>
        logger.warn("test warning", { event_name: "auth.request.failed" })
      ).not.toThrow();
    });

    it("should not throw when calling logger.error", () => {
      expect(() => logger.error("test error", { event_name: "http.request.failed" })).not.toThrow();
    });

    it("should not throw when calling logger.audit", () => {
      expect(() => logger.audit("auth.request.success")).not.toThrow();
    });

    it("should not throw when calling logger.logError", () => {
      const testError = new Error("Test error");
      expect(() =>
        logger.logError("Error occurred", testError, { event_name: "http.error.unhandled" })
      ).not.toThrow();
    });
  });

  describe("Audit Function", () => {
    it("should export audit function", () => {
      expect(typeof audit).toBe("function");
    });

    it("should not throw when calling audit with a SpanEventName", () => {
      expect(() => audit("auth.request.success")).not.toThrow();
    });

    it("should handle audit with extra context", () => {
      expect(() =>
        audit("auth.request.success", {
          userId: "123",
          ipAddress: "192.168.1.1",
          timestamp: new Date().toISOString(),
        })
      ).not.toThrow();
    });

    it("should handle various audit event types", () => {
      expect(() => audit("token.request.success")).not.toThrow();
      expect(() => audit("token.request.failed")).not.toThrow();
      expect(() => audit("auth.request.failed")).not.toThrow();
      expect(() => audit("kong.consumer.found")).not.toThrow();
    });

    it("should handle audit with empty extra context", () => {
      expect(() => audit("auth.request.success", {})).not.toThrow();
    });
  });

  describe("LogError Function", () => {
    it("should export logError function", () => {
      expect(typeof logError).toBe("function");
    });

    it("should not throw when calling logError with event_name", () => {
      const testError = new Error("Test error message");
      expect(() =>
        logError("An error occurred", testError, { event_name: "http.error.unhandled" })
      ).not.toThrow();
    });

    it("should handle error with stack trace", () => {
      const testError = new Error("Test with stack");
      testError.stack = "Error: Test\n    at Test.run (test.ts:1:1)";
      expect(() =>
        logError("Stack trace error", testError, { event_name: "http.error.unhandled" })
      ).not.toThrow();
    });

    it("should handle error with custom context", () => {
      const testError = new Error("Context error");
      expect(() =>
        logError("Error with context", testError, {
          event_name: "kong.request.failed",
          operation: "getConsumerSecret",
          consumerId: "test-123",
          duration: 150,
        })
      ).not.toThrow();
    });

    it("should handle TypeError", () => {
      const typeError = new TypeError("Cannot read property 'x' of undefined");
      expect(() =>
        logError("Type error occurred", typeError, { event_name: "http.error.unhandled" })
      ).not.toThrow();
    });

    it("should handle SyntaxError", () => {
      const syntaxError = new SyntaxError("Unexpected token");
      expect(() =>
        logError("Syntax error occurred", syntaxError, { event_name: "validation.failed" })
      ).not.toThrow();
    });

    it("should handle RangeError", () => {
      const rangeError = new RangeError("Invalid array length");
      expect(() =>
        logError("Range error occurred", rangeError, { event_name: "http.error.unhandled" })
      ).not.toThrow();
    });

    it("should handle error without stack", () => {
      const noStackError = new Error("No stack");
      noStackError.stack = undefined;
      expect(() =>
        logError("Error without stack", noStackError, { event_name: "http.error.unhandled" })
      ).not.toThrow();
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

  // SIO-755: Runtime guard for event_name. Verifies that when callers bypass the
  // LogContext type (e.g. via `as any`), the logger still emits a usable record
  // with event_name="unknown" AND a separate logger.event_name.missing warning.
  //
  // Strategy: force the logger's console-fallback path by blocking the container
  // and winston-logger modules from loading, then spy on console.log/warn/error.
  describe("event_name runtime guard (SIO-755)", () => {
    let consoleLogSpy: ReturnType<typeof spyOn>;
    let consoleWarnSpy: ReturnType<typeof spyOn>;
    let consoleErrorSpy: ReturnType<typeof spyOn>;
    let originalRequire: typeof require;
    let isolatedLogger: typeof import("../../../src/utils/logger");

    beforeEach(() => {
      consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});
      consoleWarnSpy = spyOn(console, "warn").mockImplementation(() => {});
      consoleErrorSpy = spyOn(console, "error").mockImplementation(() => {});

      // biome-ignore lint/correctness/noUndeclaredVariables: Module is a Node API available in Bun
      const Module = require("node:module");
      originalRequire = Module.prototype.require;
      Module.prototype.require = function (id: string) {
        if (id.includes("logging/container") || id.includes("winston-logger")) {
          throw new Error("Logger unavailable (test forcing fallback)");
        }
        // biome-ignore lint/complexity/noArguments: legacy require shape
        return originalRequire.apply(this, arguments);
      };

      // biome-ignore lint/correctness/noUndeclaredVariables: require is available in Bun
      delete require.cache[require.resolve("../../../src/utils/logger")];
      // biome-ignore lint/correctness/noUndeclaredVariables: require is available in Bun
      isolatedLogger = require("../../../src/utils/logger");
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
      consoleWarnSpy.mockRestore();
      consoleErrorSpy.mockRestore();
      // biome-ignore lint/correctness/noUndeclaredVariables: Module is a Node API available in Bun
      const Module = require("node:module");
      Module.prototype.require = originalRequire;
      // biome-ignore lint/correctness/noUndeclaredVariables: require is available in Bun
      delete require.cache[require.resolve("../../../src/utils/logger")];
    });

    function parsedCalls(spy: ReturnType<typeof spyOn>): Record<string, unknown>[] {
      return spy.mock.calls
        .map((c: unknown[]) => c[0])
        .filter((arg: unknown): arg is string => typeof arg === "string" && arg.startsWith("{"))
        .map((arg: string) => JSON.parse(arg) as Record<string, unknown>);
    }

    it("passes event_name through unchanged on happy path", () => {
      isolatedLogger.log("happy", { event_name: "auth.request.success", foo: 1 });
      const calls = parsedCalls(consoleLogSpy);
      expect(calls).toHaveLength(1);
      expect(calls[0]?.event_name).toBe("auth.request.success");
      expect(calls[0]?.foo).toBe(1);
      expect(calls[0]?.message).toBe("happy");
    });

    it("substitutes 'unknown' and emits a missing-warn when event_name is omitted", () => {
      isolatedLogger.log("no event name", {} as any);

      const warns = parsedCalls(consoleWarnSpy);
      expect(warns).toHaveLength(1);
      expect(warns[0]?.event_name).toBe("logger.event_name.missing");
      expect(warns[0]?.original_message).toBe("no event name");

      const infos = parsedCalls(consoleLogSpy);
      expect(infos).toHaveLength(1);
      expect(infos[0]?.event_name).toBe("unknown");
      expect(infos[0]?.message).toBe("no event name");
    });

    it("treats empty-string event_name the same as missing", () => {
      isolatedLogger.warn("empty", { event_name: "" } as any);

      const warns = parsedCalls(consoleWarnSpy);
      expect(warns).toHaveLength(2);
      // First warn is the guard's missing-warn (uses warn level)
      expect(warns[0]?.event_name).toBe("logger.event_name.missing");
      expect(warns[0]?.provided_event_name).toBe("");
      // Second warn is the original call with substituted event_name
      expect(warns[1]?.event_name).toBe("unknown");
      expect(warns[1]?.message).toBe("empty");
    });

    it("audit() sets both event_name and event_type to the eventType", () => {
      isolatedLogger.audit("auth.request.success", { userId: "u1" });
      const calls = parsedCalls(consoleLogSpy);
      expect(calls).toHaveLength(1);
      expect(calls[0]?.event_name).toBe("auth.request.success");
      expect(calls[0]?.event_type).toBe("auth.request.success");
      expect(calls[0]?.audit).toBe(true);
      expect(calls[0]?.userId).toBe("u1");
    });

    it("audit() ignores a caller-supplied event_name in favour of the eventType", () => {
      isolatedLogger.audit("auth.request.success", { event_name: "auth.request.failed" } as any);
      const calls = parsedCalls(consoleLogSpy);
      expect(calls).toHaveLength(1);
      expect(calls[0]?.event_name).toBe("auth.request.success");
      expect(calls[0]?.event_type).toBe("auth.request.success");
    });

    it("logError() preserves event_name and merges error fields", () => {
      const err = new Error("boom");
      isolatedLogger.logError("op failed", err, {
        event_name: "kong.request.failed",
        consumerId: "c1",
      });
      const calls = parsedCalls(consoleErrorSpy).filter((c) => c.message === "op failed");
      expect(calls).toHaveLength(1);
      expect(calls[0]?.event_name).toBe("kong.request.failed");
      expect(calls[0]?.consumerId).toBe("c1");
      expect((calls[0]?.error as { message: string }).message).toBe("boom");
    });
  });
});
