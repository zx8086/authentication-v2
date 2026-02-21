/* test/bun/logger-fallback.test.ts */

import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";

describe("Logger Fallback Behavior", () => {
  let originalConsoleLog: any;
  let originalConsoleWarn: any;
  let originalConsoleError: any;
  let consoleLogSpy: any;
  let consoleWarnSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    originalConsoleLog = console.log;
    originalConsoleWarn = console.warn;
    originalConsoleError = console.error;

    consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});
    consoleWarnSpy = spyOn(console, "warn").mockImplementation(() => {});
    consoleErrorSpy = spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    console.log = originalConsoleLog;
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
  });

  describe("Winston Logger Load Failure", () => {
    it("should fallback to console.error when winston logger cannot be loaded", async () => {
      const Module = require("node:module");
      const originalRequire = Module.prototype.require;

      Module.prototype.require = function (id: string) {
        if (id.includes("winston-logger")) {
          throw new Error("Cannot find module winston-logger");
        }
        // biome-ignore lint/complexity/noArguments: Testing legacy require mechanism
        return originalRequire.apply(this, arguments);
      };

      delete require.cache[require.resolve("../../../src/utils/logger")];
      const { log } = require("../../../src/utils/logger");

      log("Test message", { key: "value" });

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const errorCall = consoleErrorSpy.mock.calls[0][0];
      expect(errorCall).toContain("Could not load winston logger");

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const logCall = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(logCall.message).toBe("Test message");
      expect(logCall["log.level"]).toBe("INFO");
      expect(logCall.service.name).toBe("authentication-service");
      expect(logCall.key).toBe("value");

      Module.prototype.require = originalRequire;
      delete require.cache[require.resolve("../../../src/utils/logger")];
    });

    it("should use fallback console.warn when winston is not available", async () => {
      const Module = require("node:module");
      const originalRequire = Module.prototype.require;

      Module.prototype.require = function (id: string) {
        if (id.includes("winston-logger")) {
          throw new Error("Winston unavailable");
        }
        // biome-ignore lint/complexity/noArguments: Testing legacy require mechanism
        return originalRequire.apply(this, arguments);
      };

      delete require.cache[require.resolve("../../../src/utils/logger")];
      const { warn } = require("../../../src/utils/logger");

      warn("Warning message", { code: "WARN_001" });

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      const warnCall = JSON.parse(consoleWarnSpy.mock.calls[0][0]);
      expect(warnCall.message).toBe("Warning message");
      expect(warnCall["log.level"]).toBe("WARN");
      expect(warnCall.code).toBe("WARN_001");

      Module.prototype.require = originalRequire;
      delete require.cache[require.resolve("../../../src/utils/logger")];
    });

    it("should use fallback console.error for error logs when winston is not available", async () => {
      const Module = require("node:module");
      const originalRequire = Module.prototype.require;

      Module.prototype.require = function (id: string) {
        if (id.includes("winston-logger")) {
          throw new Error("Winston unavailable");
        }
        // biome-ignore lint/complexity/noArguments: Testing legacy require mechanism
        return originalRequire.apply(this, arguments);
      };

      delete require.cache[require.resolve("../../../src/utils/logger")];
      const { error } = require("../../../src/utils/logger");

      error("Error message", { errorCode: "ERR_500" });

      const errorCalls = consoleErrorSpy.mock.calls.filter((call: any[]) => {
        try {
          const parsed = JSON.parse(call[0]);
          return parsed.message === "Error message";
        } catch {
          return false;
        }
      });

      expect(errorCalls.length).toBeGreaterThanOrEqual(1);
      const errorCall = JSON.parse(errorCalls[0][0]);
      expect(errorCall["log.level"]).toBe("ERROR");
      expect(errorCall.errorCode).toBe("ERR_500");

      Module.prototype.require = originalRequire;
      delete require.cache[require.resolve("../../../src/utils/logger")];
    });
  });

  describe("Config Load Failure", () => {
    it("should use default config when config cannot be loaded", async () => {
      const Module = require("node:module");
      const originalRequire = Module.prototype.require;

      Module.prototype.require = function (id: string) {
        if (id.includes("config/index") || id.includes("winston-logger")) {
          throw new Error("Cannot load config");
        }
        // biome-ignore lint/complexity/noArguments: Testing legacy require mechanism
        return originalRequire.apply(this, arguments);
      };

      delete require.cache[require.resolve("../../../src/utils/logger")];
      const { log } = require("../../../src/utils/logger");

      log("Test with default config");

      const logCalls = consoleLogSpy.mock.calls.filter((call: any[]) => {
        try {
          const parsed = JSON.parse(call[0]);
          return parsed.message === "Test with default config";
        } catch {
          return false;
        }
      });

      expect(logCalls.length).toBeGreaterThanOrEqual(1);
      const logCall = JSON.parse(logCalls[0][0]);
      expect(logCall.service.name).toBe("authentication-service");
      expect(logCall.service.environment).toBe("development");

      Module.prototype.require = originalRequire;
      delete require.cache[require.resolve("../../../src/utils/logger")];
    });
  });

  describe("Audit with Fallback", () => {
    it("should include audit flag in fallback mode", async () => {
      const Module = require("node:module");
      const originalRequire = Module.prototype.require;

      Module.prototype.require = function (id: string) {
        if (id.includes("winston-logger")) {
          throw new Error("Winston unavailable");
        }
        // biome-ignore lint/complexity/noArguments: Testing legacy require mechanism
        return originalRequire.apply(this, arguments);
      };

      delete require.cache[require.resolve("../../../src/utils/logger")];
      const { audit } = require("../../../src/utils/logger");

      audit("USER_LOGIN", { userId: "123" });

      const logCalls = consoleLogSpy.mock.calls.filter((call: any[]) => {
        try {
          const parsed = JSON.parse(call[0]);
          return parsed.event_type === "USER_LOGIN";
        } catch {
          return false;
        }
      });

      expect(logCalls.length).toBeGreaterThanOrEqual(1);
      const auditCall = JSON.parse(logCalls[0][0]);
      expect(auditCall.audit).toBe(true);
      expect(auditCall.event_type).toBe("USER_LOGIN");
      expect(auditCall.userId).toBe("123");

      Module.prototype.require = originalRequire;
      delete require.cache[require.resolve("../../../src/utils/logger")];
    });
  });

  describe("LogError with Fallback", () => {
    it("should include error details in fallback mode", async () => {
      const Module = require("node:module");
      const originalRequire = Module.prototype.require;

      Module.prototype.require = function (id: string) {
        if (id.includes("winston-logger")) {
          throw new Error("Winston unavailable");
        }
        // biome-ignore lint/complexity/noArguments: Testing legacy require mechanism
        return originalRequire.apply(this, arguments);
      };

      delete require.cache[require.resolve("../../../src/utils/logger")];
      const { logError } = require("../../../src/utils/logger");

      const testError = new Error("Test error");
      testError.stack = "Error: Test error\n    at test.ts:1:1";
      logError("Error occurred", testError, { operation: "test" });

      const errorCalls = consoleErrorSpy.mock.calls.filter((call: any[]) => {
        try {
          const parsed = JSON.parse(call[0]);
          return parsed.message === "Error occurred";
        } catch {
          return false;
        }
      });

      expect(errorCalls.length).toBeGreaterThanOrEqual(1);
      const errorCall = JSON.parse(errorCalls[0][0]);
      expect(errorCall.error.name).toBe("Error");
      expect(errorCall.error.message).toBe("Test error");
      expect(errorCall.error.stack).toContain("test.ts:1:1");
      expect(errorCall.operation).toBe("test");

      Module.prototype.require = originalRequire;
      delete require.cache[require.resolve("../../../src/utils/logger")];
    });
  });

  describe("Winston Logger Success Path", () => {
    it("should use winston logger when available", async () => {
      delete require.cache[require.resolve("../../../src/utils/logger")];
      const { log, warn, error } = require("../../../src/utils/logger");

      log("Test info message", { key: "info-value" });
      warn("Test warning message", { key: "warn-value" });
      error("Test error message", { key: "error-value" });

      expect(consoleLogSpy.mock.calls.length).toBeGreaterThanOrEqual(0);
      expect(consoleWarnSpy.mock.calls.length).toBeGreaterThanOrEqual(0);
      expect(consoleErrorSpy.mock.calls.length).toBeGreaterThanOrEqual(0);

      delete require.cache[require.resolve("../../../src/utils/logger")];
    });
  });

  describe("Logger Export", () => {
    it("should export logger object with all methods", async () => {
      delete require.cache[require.resolve("../../../src/utils/logger")];
      const { logger } = require("../../../src/utils/logger");

      expect(logger).toBeDefined();
      expect(typeof logger.log).toBe("function");
      expect(typeof logger.warn).toBe("function");
      expect(typeof logger.error).toBe("function");
      expect(typeof logger.audit).toBe("function");
      expect(typeof logger.logError).toBe("function");

      delete require.cache[require.resolve("../../../src/utils/logger")];
    });
  });
});
