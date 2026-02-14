import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { TEST_KONG_ADMIN_TOKEN } from "../../shared/test-constants";

describe("OTEL SDK 0.212.0 Integration - LoggerProvider Registration Order", () => {
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

    const { resetConfigCache } = await import("../../../src/config/config");
    resetConfigCache();
  });

  afterEach(async () => {
    try {
      const { shutdownTelemetry } = await import("../../../src/telemetry/instrumentation");
      await shutdownTelemetry();
    } catch (_e) {
      // Ignore shutdown errors during test cleanup
    }

    Object.keys(Bun.env).forEach((key) => {
      if (!(key in originalEnv)) {
        delete Bun.env[key];
      }
    });
    Object.assign(Bun.env, originalEnv);

    const { resetConfigCache } = await import("../../../src/config/config");
    resetConfigCache();
  });

  describe("LoggerProvider Global Registration", () => {
    it("should set global LoggerProvider when TELEMETRY_MODE is 'both'", async () => {
      Bun.env.TELEMETRY_MODE = "both";
      Bun.env.OTEL_EXPORTER_OTLP_ENDPOINT =
        originalEnv.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4318";
      Bun.env.OTLP_TRACES_ENDPOINT = "http://localhost:4318/v1/traces";
      Bun.env.OTLP_METRICS_ENDPOINT = "http://localhost:4318/v1/metrics";
      Bun.env.OTLP_LOGS_ENDPOINT = "http://localhost:4318/v1/logs";

      const { resetConfigCache } = await import("../../../src/config/config");
      resetConfigCache();

      const { logs } = await import("@opentelemetry/api-logs");
      const { initializeTelemetry, getTelemetryStatus } = await import(
        "../../../src/telemetry/instrumentation"
      );

      await initializeTelemetry();

      const loggerProvider = logs.getLoggerProvider();
      expect(loggerProvider).toBeDefined();
      expect(loggerProvider.constructor.name).not.toBe("NoopLoggerProvider");

      const status = getTelemetryStatus();
      expect(status.initialized).toBe(true);
    });

    it("should set global LoggerProvider when TELEMETRY_MODE is 'otlp'", async () => {
      Bun.env.TELEMETRY_MODE = "otlp";
      Bun.env.OTEL_EXPORTER_OTLP_ENDPOINT =
        originalEnv.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4318";
      Bun.env.OTLP_TRACES_ENDPOINT = "http://localhost:4318/v1/traces";
      Bun.env.OTLP_METRICS_ENDPOINT = "http://localhost:4318/v1/metrics";
      Bun.env.OTLP_LOGS_ENDPOINT = "http://localhost:4318/v1/logs";

      const { resetConfigCache } = await import("../../../src/config/config");
      resetConfigCache();

      const { logs } = await import("@opentelemetry/api-logs");
      const { initializeTelemetry, getTelemetryStatus } = await import(
        "../../../src/telemetry/instrumentation"
      );

      await initializeTelemetry();

      const loggerProvider = logs.getLoggerProvider();
      expect(loggerProvider).toBeDefined();

      const status = getTelemetryStatus();
      expect(status.initialized).toBe(true);
    });

    it("should use console mode without full OTLP when TELEMETRY_MODE is 'console'", async () => {
      Bun.env.TELEMETRY_MODE = "console";

      const { loadConfig, resetConfigCache } = await import("../../../src/config/config");
      resetConfigCache();

      const freshConfig = loadConfig();
      expect(freshConfig.telemetry.mode).toBe("console");
      expect(freshConfig.telemetry.enableOpenTelemetry).toBe(false);
    });
  });

  describe("Winston Logger Reinitialization", () => {
    it("should reinitialize Winston logger after LoggerProvider is set", async () => {
      Bun.env.TELEMETRY_MODE = "both";
      Bun.env.OTEL_EXPORTER_OTLP_ENDPOINT =
        originalEnv.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4318";
      Bun.env.OTLP_TRACES_ENDPOINT = "http://localhost:4318/v1/traces";
      Bun.env.OTLP_METRICS_ENDPOINT = "http://localhost:4318/v1/metrics";
      Bun.env.OTLP_LOGS_ENDPOINT = "http://localhost:4318/v1/logs";

      const { resetConfigCache } = await import("../../../src/config/config");
      resetConfigCache();

      const { initializeTelemetry } = await import("../../../src/telemetry/instrumentation");
      const { winstonTelemetryLogger } = await import("../../../src/telemetry/winston-logger");

      let reinitializeCalled = false;
      const originalReinitialize = winstonTelemetryLogger.reinitialize;
      winstonTelemetryLogger.reinitialize = () => {
        reinitializeCalled = true;
        originalReinitialize.call(winstonTelemetryLogger);
      };

      await initializeTelemetry();

      winstonTelemetryLogger.reinitialize = originalReinitialize;

      expect(reinitializeCalled).toBe(true);
    });

    it("should have functional Winston logger after OTEL initialization", async () => {
      Bun.env.TELEMETRY_MODE = "both";
      Bun.env.OTEL_EXPORTER_OTLP_ENDPOINT =
        originalEnv.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4318";
      Bun.env.OTLP_TRACES_ENDPOINT = "http://localhost:4318/v1/traces";
      Bun.env.OTLP_METRICS_ENDPOINT = "http://localhost:4318/v1/metrics";
      Bun.env.OTLP_LOGS_ENDPOINT = "http://localhost:4318/v1/logs";

      const { resetConfigCache } = await import("../../../src/config/config");
      resetConfigCache();

      const { initializeTelemetry } = await import("../../../src/telemetry/instrumentation");
      const { winstonTelemetryLogger } = await import("../../../src/telemetry/winston-logger");

      await initializeTelemetry();

      expect(() => {
        winstonTelemetryLogger.info("Test log message", { testKey: "testValue" });
      }).not.toThrow();
    });
  });

  describe("LoggerProvider Shutdown", () => {
    it("should handle LoggerProvider shutdown gracefully", async () => {
      Bun.env.TELEMETRY_MODE = "both";
      Bun.env.OTEL_EXPORTER_OTLP_ENDPOINT =
        originalEnv.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4318";
      Bun.env.OTLP_TRACES_ENDPOINT = "http://localhost:4318/v1/traces";
      Bun.env.OTLP_METRICS_ENDPOINT = "http://localhost:4318/v1/metrics";
      Bun.env.OTLP_LOGS_ENDPOINT = "http://localhost:4318/v1/logs";

      const { resetConfigCache } = await import("../../../src/config/config");
      resetConfigCache();

      const { initializeTelemetry, shutdownTelemetry } = await import(
        "../../../src/telemetry/instrumentation"
      );

      await initializeTelemetry();

      await expect(shutdownTelemetry()).resolves.toBeUndefined();
    });

    it("should handle LoggerProvider shutdown errors gracefully", async () => {
      Bun.env.TELEMETRY_MODE = "both";
      Bun.env.OTEL_EXPORTER_OTLP_ENDPOINT = "http://invalid-endpoint:9999";
      Bun.env.OTLP_TRACES_ENDPOINT = "http://invalid-endpoint:9999/v1/traces";
      Bun.env.OTLP_METRICS_ENDPOINT = "http://invalid-endpoint:9999/v1/metrics";
      Bun.env.OTLP_LOGS_ENDPOINT = "http://invalid-endpoint:9999/v1/logs";

      const { resetConfigCache } = await import("../../../src/config/config");
      resetConfigCache();

      const { initializeTelemetry, shutdownTelemetry } = await import(
        "../../../src/telemetry/instrumentation"
      );

      await initializeTelemetry();

      await expect(shutdownTelemetry()).resolves.toBeUndefined();
    });
  });

  describe("Batch Log Processor", () => {
    it("should initialize BatchLogRecordProcessor with correct configuration", async () => {
      Bun.env.TELEMETRY_MODE = "both";
      Bun.env.OTEL_EXPORTER_OTLP_ENDPOINT =
        originalEnv.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4318";
      Bun.env.OTLP_TRACES_ENDPOINT = "http://localhost:4318/v1/traces";
      Bun.env.OTLP_METRICS_ENDPOINT = "http://localhost:4318/v1/metrics";
      Bun.env.OTLP_LOGS_ENDPOINT = "http://localhost:4318/v1/logs";

      const { resetConfigCache } = await import("../../../src/config/config");
      resetConfigCache();

      const { initializeTelemetry, getTelemetryStatus } = await import(
        "../../../src/telemetry/instrumentation"
      );

      await initializeTelemetry();

      const status = getTelemetryStatus();
      expect(status.initialized).toBe(true);
      expect(status.config.logsEndpoint).toBeDefined();
    });
  });

  describe("Log Export with Consumer Context", () => {
    it("should be able to log with consumer context after initialization", async () => {
      Bun.env.TELEMETRY_MODE = "both";
      Bun.env.OTEL_EXPORTER_OTLP_ENDPOINT =
        originalEnv.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4318";
      Bun.env.OTLP_TRACES_ENDPOINT = "http://localhost:4318/v1/traces";
      Bun.env.OTLP_METRICS_ENDPOINT = "http://localhost:4318/v1/metrics";
      Bun.env.OTLP_LOGS_ENDPOINT = "http://localhost:4318/v1/logs";

      const { resetConfigCache } = await import("../../../src/config/config");
      resetConfigCache();

      const { initializeTelemetry } = await import("../../../src/telemetry/instrumentation");
      const { winstonTelemetryLogger } = await import("../../../src/telemetry/winston-logger");

      await initializeTelemetry();

      expect(() => {
        winstonTelemetryLogger.info("Token generated", {
          consumerId: "test-consumer",
          consumerUsername: "testuser",
          requestId: "test-request-id",
        });
      }).not.toThrow();
    });
  });

  describe("OTEL SDK Version Compatibility", () => {
    it("should work with SDK 0.212.0 breaking change fix", async () => {
      Bun.env.TELEMETRY_MODE = "both";
      Bun.env.OTEL_EXPORTER_OTLP_ENDPOINT =
        originalEnv.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4318";
      Bun.env.OTLP_TRACES_ENDPOINT = "http://localhost:4318/v1/traces";
      Bun.env.OTLP_METRICS_ENDPOINT = "http://localhost:4318/v1/metrics";
      Bun.env.OTLP_LOGS_ENDPOINT = "http://localhost:4318/v1/logs";

      const { resetConfigCache } = await import("../../../src/config/config");
      resetConfigCache();

      const { logs } = await import("@opentelemetry/api-logs");
      const { initializeTelemetry, getTelemetryStatus, shutdownTelemetry } = await import(
        "../../../src/telemetry/instrumentation"
      );
      const { winstonTelemetryLogger } = await import("../../../src/telemetry/winston-logger");

      await initializeTelemetry();

      const loggerProvider = logs.getLoggerProvider();
      expect(loggerProvider).toBeDefined();

      expect(() => {
        winstonTelemetryLogger.info("SDK 0.212.0 compatibility test", {
          sdkVersion: "0.212.0",
          testType: "integration",
        });
      }).not.toThrow();

      const status = getTelemetryStatus();
      expect(status.initialized).toBe(true);

      await shutdownTelemetry();
    });
  });
});
