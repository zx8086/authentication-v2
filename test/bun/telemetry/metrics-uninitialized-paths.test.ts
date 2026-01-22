/* test/bun/telemetry/metrics-uninitialized-paths.test.ts */

/**
 * Tests for metrics recording functions when metrics are NOT initialized.
 * These tests cover the warning paths that execute when operations
 * are called before initialization, improving coverage of metrics.ts.
 */

import { beforeEach, describe, expect, it } from "bun:test";

describe("Metrics Uninitialized Warning Paths", () => {
  const originalEnv = { ...Bun.env };

  beforeEach(async () => {
    // Clean environment before each test
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

    const { resetConfigCache } = await import("../../../src/config/config");
    resetConfigCache();

    // Reset metrics state to ensure uninitialized
    const { shutdownMetrics } = await import("../../../src/telemetry/metrics");
    shutdownMetrics();
  });

  describe("recordHttpRequest - uninitialized warning", () => {
    it("should warn and return early when not initialized", async () => {
      const { recordHttpRequest, getMetricsStatus } = await import(
        "../../../src/telemetry/metrics"
      );

      // Verify not initialized
      expect(getMetricsStatus().initialized).toBe(false);

      // Should not throw, just warn and return
      expect(() => recordHttpRequest("GET", "/health")).not.toThrow();
      expect(() => recordHttpRequest("POST", "/tokens", 200)).not.toThrow();
    });
  });

  describe("recordHttpResponseTime - uninitialized warning", () => {
    it("should warn and return early when not initialized", async () => {
      const { recordHttpResponseTime, getMetricsStatus } = await import(
        "../../../src/telemetry/metrics"
      );

      expect(getMetricsStatus().initialized).toBe(false);

      expect(() => recordHttpResponseTime(50, "GET", "/health", 200)).not.toThrow();
    });
  });

  describe("recordCircuitBreakerRequest - uninitialized warning", () => {
    it("should warn and return early when not initialized", async () => {
      const { recordCircuitBreakerRequest, getMetricsStatus } = await import(
        "../../../src/telemetry/metrics"
      );

      expect(getMetricsStatus().initialized).toBe(false);

      expect(() => recordCircuitBreakerRequest("getConsumerSecret", "closed")).not.toThrow();
    });
  });

  describe("recordCircuitBreakerStateTransition - uninitialized warning", () => {
    it("should warn and return early when not initialized", async () => {
      const { recordCircuitBreakerStateTransition, getMetricsStatus } = await import(
        "../../../src/telemetry/metrics"
      );

      expect(getMetricsStatus().initialized).toBe(false);

      expect(() =>
        recordCircuitBreakerStateTransition("getConsumerSecret", "closed", "open")
      ).not.toThrow();
    });
  });

  describe("recordCircuitBreakerFallback - uninitialized warning", () => {
    it("should warn and return early when not initialized", async () => {
      const { recordCircuitBreakerFallback, getMetricsStatus } = await import(
        "../../../src/telemetry/metrics"
      );

      expect(getMetricsStatus().initialized).toBe(false);

      expect(() => recordCircuitBreakerFallback("getConsumerSecret", "cache")).not.toThrow();
    });
  });

  describe("recordCircuitBreakerRejection - uninitialized warning", () => {
    it("should warn and return early when not initialized", async () => {
      const { recordCircuitBreakerRejection, getMetricsStatus } = await import(
        "../../../src/telemetry/metrics"
      );

      expect(getMetricsStatus().initialized).toBe(false);

      expect(() =>
        recordCircuitBreakerRejection("getConsumerSecret", "circuit_open")
      ).not.toThrow();
    });
  });

  describe("recordCacheTierUsage - uninitialized warning", () => {
    it("should warn and return early when not initialized", async () => {
      const { recordCacheTierUsage, getMetricsStatus } = await import(
        "../../../src/telemetry/metrics"
      );

      expect(getMetricsStatus().initialized).toBe(false);

      expect(() => recordCacheTierUsage("memory", "get")).not.toThrow();
    });
  });

  describe("recordCacheTierLatency - uninitialized warning", () => {
    it("should warn and return early when not initialized", async () => {
      const { recordCacheTierLatency, getMetricsStatus } = await import(
        "../../../src/telemetry/metrics"
      );

      expect(getMetricsStatus().initialized).toBe(false);

      expect(() => recordCacheTierLatency("memory", "get", 5)).not.toThrow();
    });
  });

  describe("recordCacheTierError - uninitialized warning", () => {
    it("should warn and return early when not initialized", async () => {
      const { recordCacheTierError, getMetricsStatus } = await import(
        "../../../src/telemetry/metrics"
      );

      expect(getMetricsStatus().initialized).toBe(false);

      expect(() => recordCacheTierError("redis", "get", "connection_timeout")).not.toThrow();
    });
  });

  describe("recordKongCacheHit - uninitialized warning", () => {
    it("should warn and return early when not initialized", async () => {
      const { recordKongCacheHit, getMetricsStatus } = await import(
        "../../../src/telemetry/metrics"
      );

      expect(getMetricsStatus().initialized).toBe(false);

      expect(() => recordKongCacheHit("consumer-123", "get_secret")).not.toThrow();
    });
  });

  describe("recordKongCacheMiss - uninitialized warning", () => {
    it("should warn and return early when not initialized", async () => {
      const { recordKongCacheMiss, getMetricsStatus } = await import(
        "../../../src/telemetry/metrics"
      );

      expect(getMetricsStatus().initialized).toBe(false);

      expect(() => recordKongCacheMiss("consumer-123", "get_secret")).not.toThrow();
    });
  });

  describe("recordJwtTokenCreation - uninitialized warning", () => {
    it("should warn and return early when not initialized", async () => {
      const { recordJwtTokenCreation, getMetricsStatus } = await import(
        "../../../src/telemetry/metrics"
      );

      expect(getMetricsStatus().initialized).toBe(false);

      expect(() => recordJwtTokenCreation(15, "consumer-123")).not.toThrow();
    });
  });

  describe("recordAuthenticationSuccess - uninitialized warning", () => {
    it("should warn and return early when not initialized", async () => {
      const { recordAuthenticationSuccess, getMetricsStatus } = await import(
        "../../../src/telemetry/metrics"
      );

      expect(getMetricsStatus().initialized).toBe(false);

      expect(() => recordAuthenticationSuccess("user@example.com")).not.toThrow();
    });
  });

  describe("recordAuthenticationFailure - uninitialized warning", () => {
    it("should warn and return early when not initialized", async () => {
      const { recordAuthenticationFailure, getMetricsStatus } = await import(
        "../../../src/telemetry/metrics"
      );

      expect(getMetricsStatus().initialized).toBe(false);

      expect(() => recordAuthenticationFailure("user@example.com", "invalid_token")).not.toThrow();
    });
  });

  describe("recordKongOperation - uninitialized warning", () => {
    it("should warn and return early when not initialized", async () => {
      const { recordKongOperation, getMetricsStatus } = await import(
        "../../../src/telemetry/metrics"
      );

      expect(getMetricsStatus().initialized).toBe(false);

      expect(() => recordKongOperation("get_consumer", 50, "hit")).not.toThrow();
    });
  });

  describe("recordApiVersionRequest - uninitialized warning", () => {
    it("should warn and return early when not initialized", async () => {
      const { recordApiVersionRequest, getMetricsStatus } = await import(
        "../../../src/telemetry/metrics"
      );

      expect(getMetricsStatus().initialized).toBe(false);

      expect(() => recordApiVersionRequest("v1", "/health", "header", "GET")).not.toThrow();
    });
  });

  describe("recordApiVersionUsage - uninitialized warning", () => {
    it("should warn and return early when not initialized", async () => {
      const { recordApiVersionUsage, getMetricsStatus } = await import(
        "../../../src/telemetry/metrics"
      );

      expect(getMetricsStatus().initialized).toBe(false);

      expect(() => recordApiVersionUsage("v1", "/health", "GET", "header")).not.toThrow();
    });
  });

  describe("recordSecurityEvent - uninitialized warning", () => {
    it("should warn and return early when not initialized", async () => {
      const { recordSecurityEvent, getMetricsStatus } = await import(
        "../../../src/telemetry/metrics"
      );

      expect(getMetricsStatus().initialized).toBe(false);

      expect(() => recordSecurityEvent("jwt_anomaly", "medium", "consumer-123")).not.toThrow();
    });
  });

  describe("recordSecurityHeadersApplied - uninitialized warning", () => {
    it("should warn and return early when not initialized", async () => {
      const { recordSecurityHeadersApplied, getMetricsStatus } = await import(
        "../../../src/telemetry/metrics"
      );

      expect(getMetricsStatus().initialized).toBe(false);

      expect(() => recordSecurityHeadersApplied("v2", 8)).not.toThrow();
    });
  });

  describe("recordSecurityHeaders - uninitialized warning", () => {
    it("should warn and return early when not initialized", async () => {
      const { recordSecurityHeaders, getMetricsStatus } = await import(
        "../../../src/telemetry/metrics"
      );

      expect(getMetricsStatus().initialized).toBe(false);

      expect(() => recordSecurityHeaders()).not.toThrow();
    });
  });

  describe("recordTelemetryExport - uninitialized warning", () => {
    it("should warn and return early when not initialized", async () => {
      const { recordTelemetryExport, getMetricsStatus } = await import(
        "../../../src/telemetry/metrics"
      );

      expect(getMetricsStatus().initialized).toBe(false);

      expect(() => recordTelemetryExport("otlp", true)).not.toThrow();
    });
  });

  describe("recordError - uninitialized warning", () => {
    it("should warn and return early when not initialized", async () => {
      const { recordError, getMetricsStatus } = await import("../../../src/telemetry/metrics");

      expect(getMetricsStatus().initialized).toBe(false);

      expect(() =>
        recordError("network_error", {
          operation: "getConsumerSecret",
          component: "kong_adapter",
        })
      ).not.toThrow();
    });
  });

  describe("recordGCCollection - uninitialized warning", () => {
    it("should warn and return early when not initialized", async () => {
      const { recordGCCollection, getMetricsStatus } = await import(
        "../../../src/telemetry/metrics"
      );

      expect(getMetricsStatus().initialized).toBe(false);

      expect(() => recordGCCollection("major")).not.toThrow();
    });
  });

  describe("recordGCDuration - uninitialized warning", () => {
    it("should warn and return early when not initialized", async () => {
      const { recordGCDuration, getMetricsStatus } = await import("../../../src/telemetry/metrics");

      expect(getMetricsStatus().initialized).toBe(false);

      expect(() => recordGCDuration(0.005, "major")).not.toThrow();
    });
  });

  describe("recordConsumerRequest - uninitialized warning", () => {
    it("should warn and return early when not initialized", async () => {
      const { recordConsumerRequest, getMetricsStatus } = await import(
        "../../../src/telemetry/metrics"
      );

      expect(getMetricsStatus().initialized).toBe(false);

      expect(() => recordConsumerRequest("consumer-123")).not.toThrow();
    });
  });

  describe("recordConsumerError - uninitialized warning", () => {
    it("should warn and return early when not initialized", async () => {
      const { recordConsumerError, getMetricsStatus } = await import(
        "../../../src/telemetry/metrics"
      );

      expect(getMetricsStatus().initialized).toBe(false);

      expect(() => recordConsumerError("consumer-123")).not.toThrow();
    });
  });

  describe("recordConsumerLatency - uninitialized warning", () => {
    it("should warn and return early when not initialized", async () => {
      const { recordConsumerLatency, getMetricsStatus } = await import(
        "../../../src/telemetry/metrics"
      );

      expect(getMetricsStatus().initialized).toBe(false);

      expect(() => recordConsumerLatency("consumer-123", 50)).not.toThrow();
    });
  });

  describe("recordRedisOperation - uninitialized warning", () => {
    it("should warn and return early when not initialized", async () => {
      const { recordRedisOperation, getMetricsStatus } = await import(
        "../../../src/telemetry/metrics"
      );

      expect(getMetricsStatus().initialized).toBe(false);

      expect(() => recordRedisOperation("get", 5, true)).not.toThrow();
    });
  });

  describe("recordOperationDuration - uninitialized warning", () => {
    it("should warn and return early when not initialized", async () => {
      const { recordOperationDuration, getMetricsStatus } = await import(
        "../../../src/telemetry/metrics"
      );

      expect(getMetricsStatus().initialized).toBe(false);

      expect(() => recordOperationDuration("getConsumerSecret", 50)).not.toThrow();
    });
  });

  describe("recordActiveRequests - uninitialized warning", () => {
    it("should warn and return early when not initialized", async () => {
      const { recordActiveRequests, getMetricsStatus } = await import(
        "../../../src/telemetry/metrics"
      );

      expect(getMetricsStatus().initialized).toBe(false);

      expect(() => recordActiveRequests(5)).not.toThrow();
    });
  });

  describe("recordRedisConnection - uninitialized warning", () => {
    it("should warn and return early when not initialized", async () => {
      const { recordRedisConnection, getMetricsStatus } = await import(
        "../../../src/telemetry/metrics"
      );

      expect(getMetricsStatus().initialized).toBe(false);

      expect(() => recordRedisConnection(true)).not.toThrow();
    });
  });
});
