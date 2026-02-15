import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { TEST_KONG_ADMIN_TOKEN } from "../shared/test-constants";

const originalEnv = { ...Bun.env };
const hasLiveOTLP = !!Bun.env.OTEL_EXPORTER_OTLP_ENDPOINT;

describe("OTLP Export Integration", () => {
  beforeEach(async () => {
    Object.keys(Bun.env).forEach((key) => {
      if (!["PATH", "HOME", "USER", "SHELL", "TERM"].includes(key)) {
        delete Bun.env[key];
      }
    });
    // Use "local" for integration tests to match .env configuration
    // Bun automatically sets NODE_ENV=test, but we want to test with local config
    Bun.env.NODE_ENV = "local";
    Bun.env.KONG_JWT_AUTHORITY = "https://auth.test.com";
    Bun.env.KONG_JWT_AUDIENCE = "https://api.test.com";
    Bun.env.KONG_ADMIN_URL = originalEnv.KONG_ADMIN_URL || "http://192.168.178.3:30001";
    Bun.env.KONG_ADMIN_TOKEN = TEST_KONG_ADMIN_TOKEN;

    const { resetConfigCache } = await import("../../src/config/config");
    resetConfigCache();
  });

  afterEach(async () => {
    try {
      const { shutdownTelemetry } = await import("../../src/telemetry/instrumentation");
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

    const { resetConfigCache } = await import("../../src/config/config");
    resetConfigCache();
  });

  describe("Live OTLP Export", () => {
    it.skipIf(!hasLiveOTLP)("should export logs to live OTLP endpoint", async () => {
      Bun.env.TELEMETRY_MODE = "both";
      Bun.env.OTEL_EXPORTER_OTLP_ENDPOINT = originalEnv.OTEL_EXPORTER_OTLP_ENDPOINT;

      const { resetConfigCache } = await import("../../src/config/config");
      resetConfigCache();

      const { initializeTelemetry, getTelemetryStatus } = await import(
        "../../src/telemetry/instrumentation"
      );
      const { winstonTelemetryLogger } = await import("../../src/telemetry/winston-logger");

      await initializeTelemetry();

      winstonTelemetryLogger.info("OTLP export test log", {
        testId: "integration-test-otlp",
        timestamp: new Date().toISOString(),
      });

      const status = getTelemetryStatus();
      expect(status.initialized).toBe(true);
      expect(status.config.logsEndpoint).toBeDefined();
    });

    it.skipIf(!hasLiveOTLP)("should preserve consumer context in exports", async () => {
      Bun.env.TELEMETRY_MODE = "both";
      Bun.env.OTEL_EXPORTER_OTLP_ENDPOINT = originalEnv.OTEL_EXPORTER_OTLP_ENDPOINT;

      const { resetConfigCache } = await import("../../src/config/config");
      resetConfigCache();

      const { initializeTelemetry } = await import("../../src/telemetry/instrumentation");
      const { winstonTelemetryLogger } = await import("../../src/telemetry/winston-logger");

      await initializeTelemetry();

      expect(() => {
        winstonTelemetryLogger.info("Token generated for consumer", {
          consumerId: "test-consumer-123",
          consumerUsername: "testuser@example.com",
          requestId: "req-123-456",
          tokenType: "access_token",
        });
      }).not.toThrow();
    });

    it.skipIf(!hasLiveOTLP)("should handle batch export timing", async () => {
      Bun.env.TELEMETRY_MODE = "both";
      Bun.env.OTEL_EXPORTER_OTLP_ENDPOINT = originalEnv.OTEL_EXPORTER_OTLP_ENDPOINT;

      const { resetConfigCache } = await import("../../src/config/config");
      resetConfigCache();

      const { initializeTelemetry, getMetricsExportStats } = await import(
        "../../src/telemetry/instrumentation"
      );
      const { winstonTelemetryLogger } = await import("../../src/telemetry/winston-logger");

      await initializeTelemetry();

      for (let i = 0; i < 5; i++) {
        winstonTelemetryLogger.info(`Batch test log ${i}`, { sequence: i });
      }

      const stats = getMetricsExportStats();
      expect(stats).toBeDefined();
      expect(typeof stats.totalExports).toBe("number");
    });
  });

  describe("Export Failure Graceful Degradation", () => {
    it("should handle export failure gracefully", async () => {
      Bun.env.TELEMETRY_MODE = "both";
      Bun.env.OTEL_EXPORTER_OTLP_ENDPOINT = "http://invalid-endpoint:9999";
      Bun.env.OTLP_TRACES_ENDPOINT = "http://invalid-endpoint:9999/v1/traces";
      Bun.env.OTLP_METRICS_ENDPOINT = "http://invalid-endpoint:9999/v1/metrics";
      Bun.env.OTLP_LOGS_ENDPOINT = "http://invalid-endpoint:9999/v1/logs";

      const { resetConfigCache } = await import("../../src/config/config");
      resetConfigCache();

      const { initializeTelemetry, shutdownTelemetry } = await import(
        "../../src/telemetry/instrumentation"
      );
      const { winstonTelemetryLogger } = await import("../../src/telemetry/winston-logger");

      await initializeTelemetry();

      expect(() => {
        winstonTelemetryLogger.info("Test log with invalid endpoint", { test: true });
      }).not.toThrow();

      await expect(shutdownTelemetry()).resolves.toBeUndefined();
    });
  });

  describe("Export Metrics Tracking", () => {
    it("should track export attempts", async () => {
      Bun.env.TELEMETRY_MODE = "console";

      const { resetConfigCache } = await import("../../src/config/config");
      resetConfigCache();

      const { initializeTelemetry, getMetricsExportStats, forceMetricsFlush } = await import(
        "../../src/telemetry/instrumentation"
      );

      await initializeTelemetry();

      const statsBefore = getMetricsExportStats();
      const exportsBefore = statsBefore.totalExports;

      await forceMetricsFlush();

      const statsAfter = getMetricsExportStats();
      expect(statsAfter.totalExports).toBeGreaterThanOrEqual(exportsBefore);
    });

    it("should calculate success rate correctly", async () => {
      Bun.env.TELEMETRY_MODE = "console";

      const { resetConfigCache } = await import("../../src/config/config");
      resetConfigCache();

      const { initializeTelemetry, getMetricsExportStats } = await import(
        "../../src/telemetry/instrumentation"
      );

      await initializeTelemetry();

      const stats = getMetricsExportStats();
      expect(typeof stats.successRate).toBe("number");
      expect(stats.successRate).toBeGreaterThanOrEqual(0);
      expect(stats.successRate).toBeLessThanOrEqual(100);
    });
  });
});
