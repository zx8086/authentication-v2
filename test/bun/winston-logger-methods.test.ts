/* test/bun/winston-logger-methods.test.ts */

/**
 * Tests for WinstonTelemetryLogger methods that are not exercised
 * by the basic logger tests. These improve coverage of winston-logger.ts
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";

describe("WinstonTelemetryLogger Methods", () => {
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
    Bun.env.KONG_ADMIN_URL = "http://kong:8001";
    Bun.env.KONG_ADMIN_TOKEN = "test-token-123456789012345678901234567890";
    Bun.env.TELEMETRY_MODE = "console";
    Bun.env.OTEL_SERVICE_NAME = "winston-test-service";

    const { resetConfigCache } = await import("../../src/config/config");
    resetConfigCache();
  });

  afterEach(async () => {
    Object.keys(Bun.env).forEach((key) => {
      if (!(key in originalEnv)) {
        delete Bun.env[key];
      }
    });
    Object.assign(Bun.env, originalEnv);

    const { resetConfigCache } = await import("../../src/config/config");
    resetConfigCache();
  });

  describe("Core logging methods", () => {
    it("should log info messages", async () => {
      const { winstonTelemetryLogger } = await import("../../src/telemetry/winston-logger");

      expect(() => winstonTelemetryLogger.info("Test info message")).not.toThrow();
      expect(() =>
        winstonTelemetryLogger.info("Info with context", { key: "value" })
      ).not.toThrow();
    });

    it("should log warn messages", async () => {
      const { winstonTelemetryLogger } = await import("../../src/telemetry/winston-logger");

      expect(() => winstonTelemetryLogger.warn("Test warning message")).not.toThrow();
      expect(() =>
        winstonTelemetryLogger.warn("Warning with context", { level: "high" })
      ).not.toThrow();
    });

    it("should log error messages", async () => {
      const { winstonTelemetryLogger } = await import("../../src/telemetry/winston-logger");

      expect(() => winstonTelemetryLogger.error("Test error message")).not.toThrow();
      expect(() =>
        winstonTelemetryLogger.error("Error with context", { code: "ERR_001" })
      ).not.toThrow();
    });

    it("should log debug messages", async () => {
      const { winstonTelemetryLogger } = await import("../../src/telemetry/winston-logger");

      expect(() => winstonTelemetryLogger.debug("Test debug message")).not.toThrow();
      expect(() =>
        winstonTelemetryLogger.debug("Debug with context", { detail: "verbose" })
      ).not.toThrow();
    });
  });

  describe("HTTP request logging", () => {
    it("should log HTTP request with basic parameters", async () => {
      const { winstonTelemetryLogger } = await import("../../src/telemetry/winston-logger");

      expect(() => winstonTelemetryLogger.logHttpRequest("GET", "/health", 200, 50)).not.toThrow();
      expect(() =>
        winstonTelemetryLogger.logHttpRequest("POST", "/tokens", 201, 150)
      ).not.toThrow();
      expect(() =>
        winstonTelemetryLogger.logHttpRequest("DELETE", "/cache", 204, 25)
      ).not.toThrow();
    });

    it("should log HTTP request with various status codes", async () => {
      const { winstonTelemetryLogger } = await import("../../src/telemetry/winston-logger");

      expect(() => winstonTelemetryLogger.logHttpRequest("GET", "/health", 200, 50)).not.toThrow();
      expect(() => winstonTelemetryLogger.logHttpRequest("GET", "/health", 400, 30)).not.toThrow();
      expect(() => winstonTelemetryLogger.logHttpRequest("GET", "/health", 401, 25)).not.toThrow();
      expect(() => winstonTelemetryLogger.logHttpRequest("GET", "/health", 500, 100)).not.toThrow();
      expect(() =>
        winstonTelemetryLogger.logHttpRequest("GET", "/health", 503, 5000)
      ).not.toThrow();
    });

    it("should log HTTP request with context", async () => {
      const { winstonTelemetryLogger } = await import("../../src/telemetry/winston-logger");

      expect(() =>
        winstonTelemetryLogger.logHttpRequest("POST", "/tokens", 201, 150, {
          consumerId: "consumer-123",
          requestId: "req-456",
        })
      ).not.toThrow();
    });
  });

  describe("Authentication event logging", () => {
    it("should log authentication success events", async () => {
      const { winstonTelemetryLogger } = await import("../../src/telemetry/winston-logger");

      expect(() => winstonTelemetryLogger.logAuthenticationEvent("login", true)).not.toThrow();
      expect(() =>
        winstonTelemetryLogger.logAuthenticationEvent("token_validation", true)
      ).not.toThrow();
      expect(() =>
        winstonTelemetryLogger.logAuthenticationEvent("token_refresh", true)
      ).not.toThrow();
    });

    it("should log authentication failure events", async () => {
      const { winstonTelemetryLogger } = await import("../../src/telemetry/winston-logger");

      expect(() => winstonTelemetryLogger.logAuthenticationEvent("login", false)).not.toThrow();
      expect(() =>
        winstonTelemetryLogger.logAuthenticationEvent("token_validation", false)
      ).not.toThrow();
      expect(() =>
        winstonTelemetryLogger.logAuthenticationEvent("token_expired", false)
      ).not.toThrow();
    });

    it("should log authentication events with context", async () => {
      const { winstonTelemetryLogger } = await import("../../src/telemetry/winston-logger");

      expect(() =>
        winstonTelemetryLogger.logAuthenticationEvent("login", true, {
          userId: "user-123",
          method: "jwt",
        })
      ).not.toThrow();

      expect(() =>
        winstonTelemetryLogger.logAuthenticationEvent("login", false, {
          userId: "user-456",
          reason: "invalid_token",
        })
      ).not.toThrow();
    });
  });

  describe("Kong operation logging", () => {
    it("should log Kong operation success", async () => {
      const { winstonTelemetryLogger } = await import("../../src/telemetry/winston-logger");

      expect(() => winstonTelemetryLogger.logKongOperation("get_consumer", 50, true)).not.toThrow();
      expect(() =>
        winstonTelemetryLogger.logKongOperation("create_secret", 150, true)
      ).not.toThrow();
      expect(() => winstonTelemetryLogger.logKongOperation("health_check", 25, true)).not.toThrow();
    });

    it("should log Kong operation failure", async () => {
      const { winstonTelemetryLogger } = await import("../../src/telemetry/winston-logger");

      expect(() =>
        winstonTelemetryLogger.logKongOperation("get_consumer", 5000, false)
      ).not.toThrow();
      expect(() =>
        winstonTelemetryLogger.logKongOperation("create_secret", 3000, false)
      ).not.toThrow();
      expect(() =>
        winstonTelemetryLogger.logKongOperation("health_check", 10000, false)
      ).not.toThrow();
    });

    it("should log Kong operation with context", async () => {
      const { winstonTelemetryLogger } = await import("../../src/telemetry/winston-logger");

      expect(() =>
        winstonTelemetryLogger.logKongOperation("get_consumer", 50, true, {
          consumerId: "consumer-123",
          cacheHit: true,
        })
      ).not.toThrow();

      expect(() =>
        winstonTelemetryLogger.logKongOperation("create_secret", 150, false, {
          consumerId: "consumer-456",
          errorCode: "KONG_UNAVAILABLE",
        })
      ).not.toThrow();
    });
  });

  describe("WinstonTelemetryLogger class methods", () => {
    it("should access winstonTelemetryLogger instance", async () => {
      const { winstonTelemetryLogger } = await import("../../src/telemetry/winston-logger");

      expect(winstonTelemetryLogger).toBeDefined();
      expect(typeof winstonTelemetryLogger.info).toBe("function");
      expect(typeof winstonTelemetryLogger.warn).toBe("function");
      expect(typeof winstonTelemetryLogger.error).toBe("function");
      expect(typeof winstonTelemetryLogger.debug).toBe("function");
    });

    it("should call reinitialize without error", async () => {
      const { winstonTelemetryLogger } = await import("../../src/telemetry/winston-logger");

      expect(() => winstonTelemetryLogger.reinitialize()).not.toThrow();
    });

    it("should call flush without error", async () => {
      const { winstonTelemetryLogger } = await import("../../src/telemetry/winston-logger");

      // flush returns a promise
      await expect(winstonTelemetryLogger.flush()).resolves.toBeUndefined();
    });
  });

  describe("Logger with different telemetry modes", () => {
    it("should work with console mode", async () => {
      Bun.env.TELEMETRY_MODE = "console";
      const { resetConfigCache } = await import("../../src/config/config");
      resetConfigCache();

      const { winstonTelemetryLogger } = await import("../../src/telemetry/winston-logger");
      expect(() => winstonTelemetryLogger.info("Console mode test")).not.toThrow();
    });

    it("should work with both mode", async () => {
      Bun.env.TELEMETRY_MODE = "both";
      const { resetConfigCache } = await import("../../src/config/config");
      resetConfigCache();

      const { winstonTelemetryLogger } = await import("../../src/telemetry/winston-logger");
      winstonTelemetryLogger.reinitialize();
      expect(() => winstonTelemetryLogger.info("Both mode test")).not.toThrow();
    });
  });
});
