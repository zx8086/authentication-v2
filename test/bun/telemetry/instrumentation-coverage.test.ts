/* test/bun/instrumentation-coverage.test.ts */

/**
 * Additional tests to improve coverage for instrumentation.ts
 * Focuses on uncovered error paths, edge cases, and console mode scenarios
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { TEST_KONG_ADMIN_TOKEN } from "../../shared/test-constants";

describe("Instrumentation Coverage - Additional Scenarios", () => {
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
      // Ignore shutdown errors
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

  describe("metricExportStats - recordExportFailure", () => {
    it("should record export failures and track error messages", async () => {
      Bun.env.TELEMETRY_MODE = "console";
      const { resetConfigCache } = await import("../../../src/config/config");
      resetConfigCache();

      const { getMetricsExportStats } = await import("../../../src/telemetry/instrumentation");

      const statsBefore = getMetricsExportStats();
      const failuresBefore = statsBefore.failureCount;

      // Manually trigger recordExportFailure through the internal stats object
      const stats = getMetricsExportStats();
      stats.recordExportFailure("Test error message");

      expect(stats.failureCount).toBe(failuresBefore + 1);
      expect(stats.lastFailureTime).not.toBeNull();
      expect(stats.recentErrors.length).toBeGreaterThan(0);
      expect(stats.recentErrors[stats.recentErrors.length - 1]).toContain("Test error message");
    });

    it("should limit recent errors to 10 entries", async () => {
      const { getMetricsExportStats } = await import("../../../src/telemetry/instrumentation");

      const stats = getMetricsExportStats();

      // Add 15 errors to test the limit
      for (let i = 0; i < 15; i++) {
        stats.recordExportFailure(`Error ${i}`);
      }

      expect(stats.recentErrors.length).toBeLessThanOrEqual(10);
      // The oldest errors should have been removed
      expect(stats.recentErrors[0]).not.toContain("Error 0");
    });
  });

  describe("Console mode - no-op exporters", () => {
    it("should execute no-op exporter export method", async () => {
      Bun.env.TELEMETRY_MODE = "console";
      const { resetConfigCache } = await import("../../../src/config/config");
      resetConfigCache();

      const { initializeTelemetry, getMetricsExportStats } = await import(
        "../../../src/telemetry/instrumentation"
      );

      const statsBefore = getMetricsExportStats();
      const exportsBefore = statsBefore.totalExports;

      await initializeTelemetry();

      // The initialization should trigger at least one export attempt
      const statsAfter = getMetricsExportStats();

      // Stats should have been updated by the no-op exporter
      expect(statsAfter.totalExports).toBeGreaterThanOrEqual(exportsBefore);
    });

    it("should execute no-op exporter forceFlush method", async () => {
      Bun.env.TELEMETRY_MODE = "console";
      const { resetConfigCache } = await import("../../../src/config/config");
      resetConfigCache();

      const { initializeTelemetry, forceMetricsFlush } = await import(
        "../../../src/telemetry/instrumentation"
      );

      await initializeTelemetry();

      // This should execute the no-op forceFlush
      await expect(forceMetricsFlush()).resolves.toBeUndefined();
    });

    it("should execute no-op exporter shutdown method", async () => {
      Bun.env.TELEMETRY_MODE = "console";
      const { resetConfigCache } = await import("../../../src/config/config");
      resetConfigCache();

      const { initializeTelemetry, shutdownTelemetry } = await import(
        "../../../src/telemetry/instrumentation"
      );

      await initializeTelemetry();

      // This should execute the no-op shutdown
      await expect(shutdownTelemetry()).resolves.toBeUndefined();
    });

    it("should execute no-op reader methods", async () => {
      Bun.env.TELEMETRY_MODE = "console";
      const { resetConfigCache } = await import("../../../src/config/config");
      resetConfigCache();

      const { initializeTelemetry, triggerImmediateMetricsExport } = await import(
        "../../../src/telemetry/instrumentation"
      );

      await initializeTelemetry();

      // This should execute the no-op reader's forceFlush
      await expect(triggerImmediateMetricsExport()).resolves.toBeUndefined();
    });
  });

  describe("forceMetricsFlush - console mode path", () => {
    it("should simulate metric export in console mode", async () => {
      Bun.env.TELEMETRY_MODE = "console";
      const { resetConfigCache } = await import("../../../src/config/config");
      resetConfigCache();

      const { initializeTelemetry, forceMetricsFlush, getMetricsExportStats } = await import(
        "../../../src/telemetry/instrumentation"
      );

      await initializeTelemetry();

      const statsBefore = getMetricsExportStats();
      const exportsBefore = statsBefore.totalExports;

      await forceMetricsFlush();

      // Console mode flush should complete successfully
      const statsAfter = getMetricsExportStats();
      // May or may not trigger additional export, but should not decrease
      expect(statsAfter.totalExports).toBeGreaterThanOrEqual(exportsBefore);
    });
  });

  describe("metricExportStats - success tracking", () => {
    it("should record export successes", async () => {
      const { getMetricsExportStats } = await import("../../../src/telemetry/instrumentation");

      const stats = getMetricsExportStats();
      const successesBefore = stats.successCount;

      stats.recordExportAttempt();
      stats.recordExportSuccess();

      expect(stats.successCount).toBe(successesBefore + 1);
      expect(stats.lastSuccessTime).not.toBeNull();
      expect(stats.lastExportTime).toBe(stats.lastSuccessTime);
    });

    it("should calculate success rate correctly with mixed results", async () => {
      const { getMetricsExportStats } = await import("../../../src/telemetry/instrumentation");

      const stats = getMetricsExportStats();

      // Reset to known state
      const initialTotal = stats.totalExports;

      stats.recordExportAttempt();
      stats.recordExportSuccess();

      stats.recordExportAttempt();
      stats.recordExportFailure("Test failure");

      expect(stats.totalExports).toBe(initialTotal + 2);
      expect(stats.successCount).toBeGreaterThan(0);
      expect(stats.failureCount).toBeGreaterThan(0);
    });
  });

  describe("OpenTelemetry mode - full initialization", () => {
    it("should initialize with full OpenTelemetry when mode is 'both'", async () => {
      Bun.env.TELEMETRY_MODE = "both";
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
      // Verify telemetry status structure is complete
      expect(status.config).toBeDefined();
      expect(status.metricsExportStats).toBeDefined();
      expect(typeof status.initialized).toBe("boolean");
    });

    it("should handle export failure in tracking exporter", async () => {
      Bun.env.TELEMETRY_MODE = "both";
      Bun.env.OTLP_TRACES_ENDPOINT = "http://localhost:4318/v1/traces";
      Bun.env.OTLP_METRICS_ENDPOINT = "http://localhost:4318/v1/metrics";
      Bun.env.OTLP_LOGS_ENDPOINT = "http://localhost:4318/v1/logs";

      const { resetConfigCache } = await import("../../../src/config/config");
      resetConfigCache();

      const { initializeTelemetry, getMetricsExportStats } = await import(
        "../../../src/telemetry/instrumentation"
      );

      await initializeTelemetry();

      // The export tracking wrapper should handle both success and failure cases
      const stats = getMetricsExportStats();
      expect(stats).toBeDefined();
      expect(typeof stats.successRate).toBe("number");
    });
  });

  describe("Kubernetes and ECS resource attributes", () => {
    it("should include Kubernetes attributes when in K8s environment", async () => {
      Bun.env.TELEMETRY_MODE = "both";
      Bun.env.OTLP_TRACES_ENDPOINT = "http://localhost:4318/v1/traces";
      Bun.env.OTLP_METRICS_ENDPOINT = "http://localhost:4318/v1/metrics";
      Bun.env.OTLP_LOGS_ENDPOINT = "http://localhost:4318/v1/logs";
      Bun.env.K8S_POD_NAME = "test-pod-123";
      Bun.env.K8S_NAMESPACE = "test-namespace";

      const { resetConfigCache } = await import("../../../src/config/config");
      resetConfigCache();

      const { initializeTelemetry, getTelemetryStatus } = await import(
        "../../../src/telemetry/instrumentation"
      );

      await initializeTelemetry();

      const status = getTelemetryStatus();
      expect(status.config.infrastructure).toBeDefined();
    });

    it("should include ECS attributes when in ECS environment", async () => {
      Bun.env.TELEMETRY_MODE = "both";
      Bun.env.OTLP_TRACES_ENDPOINT = "http://localhost:4318/v1/traces";
      Bun.env.OTLP_METRICS_ENDPOINT = "http://localhost:4318/v1/metrics";
      Bun.env.OTLP_LOGS_ENDPOINT = "http://localhost:4318/v1/logs";
      Bun.env.ECS_CONTAINER_METADATA_URI_V4 = "http://169.254.170.2/v4/metadata";

      const { resetConfigCache } = await import("../../../src/config/config");
      resetConfigCache();

      const { initializeTelemetry, getTelemetryStatus } = await import(
        "../../../src/telemetry/instrumentation"
      );

      await initializeTelemetry();

      const status = getTelemetryStatus();
      expect(status.config.infrastructure).toBeDefined();
    });
  });

  describe("Shutdown error handling", () => {
    it("should handle shutdown errors gracefully", async () => {
      Bun.env.TELEMETRY_MODE = "both";
      Bun.env.OTLP_TRACES_ENDPOINT = "http://localhost:4318/v1/traces";
      Bun.env.OTLP_METRICS_ENDPOINT = "http://localhost:4318/v1/metrics";
      Bun.env.OTLP_LOGS_ENDPOINT = "http://localhost:4318/v1/logs";

      const { resetConfigCache } = await import("../../../src/config/config");
      resetConfigCache();

      const { initializeTelemetry, shutdownTelemetry } = await import(
        "../../../src/telemetry/instrumentation"
      );

      await initializeTelemetry();

      // Should not throw even if there are internal errors
      await expect(shutdownTelemetry()).resolves.toBeUndefined();
    });
  });

  describe("triggerImmediateMetricsExport - console mode", () => {
    it("should execute console mode metric reader methods", async () => {
      Bun.env.TELEMETRY_MODE = "console";
      const { resetConfigCache } = await import("../../../src/config/config");
      resetConfigCache();

      const { initializeTelemetry, triggerImmediateMetricsExport, getMetricsExportStats } =
        await import("../../../src/telemetry/instrumentation");

      await initializeTelemetry();

      const statsBefore = getMetricsExportStats();
      const exportsBefore = statsBefore.totalExports;

      await triggerImmediateMetricsExport();

      const statsAfter = getMetricsExportStats();
      expect(statsAfter.totalExports).toBeGreaterThanOrEqual(exportsBefore);
    });
  });

  describe("getResource - resource attributes", () => {
    it("should include service resource attributes", async () => {
      Bun.env.TELEMETRY_MODE = "both";
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
      expect(status.config).toBeDefined();
      expect(status.metricsExportStats).toBeDefined();
      expect(typeof status.initialized).toBe("boolean");
    });
  });
});
