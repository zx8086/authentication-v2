// test/bun/telemetry/metrics-attributes.test.ts

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { TEST_KONG_ADMIN_TOKEN } from "../../shared/test-constants";

// Since metrics use OpenTelemetry which may not be initialized in tests,
// we test the functions that CAN be tested without full OTEL setup

describe("Metrics Attribute Verification - Mutation Testing", () => {
  const originalEnv = { ...Bun.env };

  beforeEach(() => {
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
    Bun.env.TELEMETRY_MODE = "console";
  });

  afterEach(() => {
    Object.keys(Bun.env).forEach((key) => {
      if (!(key in originalEnv)) {
        delete Bun.env[key];
      }
    });
    Object.assign(Bun.env, originalEnv);
  });

  describe("Metrics Module Exports", () => {
    it("should export recordHttpRequest function", async () => {
      const metrics = await import("../../../src/telemetry/metrics");
      expect(typeof metrics.recordHttpRequest).toBe("function");
    });

    it("should export recordHttpResponseTime function", async () => {
      const metrics = await import("../../../src/telemetry/metrics");
      expect(typeof metrics.recordHttpResponseTime).toBe("function");
    });

    it("should export recordCircuitBreakerRequest function", async () => {
      const metrics = await import("../../../src/telemetry/metrics");
      expect(typeof metrics.recordCircuitBreakerRequest).toBe("function");
    });

    it("should export recordCircuitBreakerStateTransition function", async () => {
      const metrics = await import("../../../src/telemetry/metrics");
      expect(typeof metrics.recordCircuitBreakerStateTransition).toBe("function");
    });

    it("should export recordCacheTierUsage function", async () => {
      const metrics = await import("../../../src/telemetry/metrics");
      expect(typeof metrics.recordCacheTierUsage).toBe("function");
    });

    it("should export getMetricsStatus function", async () => {
      const metrics = await import("../../../src/telemetry/metrics");
      expect(typeof metrics.getMetricsStatus).toBe("function");
    });
  });

  describe("Metrics Status", () => {
    it("should return metrics status object", async () => {
      const { getMetricsStatus } = await import("../../../src/telemetry/metrics");

      const status = getMetricsStatus();

      expect(status).toBeDefined();
      expect(typeof status).toBe("object");
    });

    it("should include initialized state in status", async () => {
      const { getMetricsStatus } = await import("../../../src/telemetry/metrics");

      const status = getMetricsStatus();

      expect(status).toHaveProperty("initialized");
      expect(typeof status.initialized).toBe("boolean");
    });
  });

  describe("HTTP Metrics Recording (No-Op when not initialized)", () => {
    it("should not throw when recording HTTP request without initialization", async () => {
      const { recordHttpRequest } = await import("../../../src/telemetry/metrics");

      // Should be a no-op when not initialized, not throw
      expect(() => recordHttpRequest("GET", "/health", 200)).not.toThrow();
    });

    it("should not throw when recording HTTP response time without initialization", async () => {
      const { recordHttpResponseTime } = await import("../../../src/telemetry/metrics");

      expect(() => recordHttpResponseTime(150, "GET", "/health", 200)).not.toThrow();
    });

    it("should handle various HTTP methods", async () => {
      const { recordHttpRequest } = await import("../../../src/telemetry/metrics");

      // Verify different methods are accepted
      expect(() => recordHttpRequest("GET", "/health")).not.toThrow();
      expect(() => recordHttpRequest("POST", "/tokens")).not.toThrow();
      expect(() => recordHttpRequest("DELETE", "/cache")).not.toThrow();
      expect(() => recordHttpRequest("PUT", "/update")).not.toThrow();
    });

    it("should handle various status codes", async () => {
      const { recordHttpRequest } = await import("../../../src/telemetry/metrics");

      expect(() => recordHttpRequest("GET", "/health", 200)).not.toThrow();
      expect(() => recordHttpRequest("GET", "/health", 201)).not.toThrow();
      expect(() => recordHttpRequest("GET", "/health", 400)).not.toThrow();
      expect(() => recordHttpRequest("GET", "/health", 401)).not.toThrow();
      expect(() => recordHttpRequest("GET", "/health", 500)).not.toThrow();
      expect(() => recordHttpRequest("GET", "/health", 503)).not.toThrow();
    });

    it("should handle optional size parameters", async () => {
      const { recordHttpRequest } = await import("../../../src/telemetry/metrics");

      expect(() => recordHttpRequest("POST", "/tokens", 200, 100, 500)).not.toThrow();
      expect(() => recordHttpRequest("POST", "/tokens", 200, undefined, 500)).not.toThrow();
      expect(() => recordHttpRequest("POST", "/tokens", 200, 100, undefined)).not.toThrow();
    });
  });

  describe("Circuit Breaker Metrics Recording (No-Op when not initialized)", () => {
    it("should not throw when recording circuit breaker request", async () => {
      const { recordCircuitBreakerRequest } = await import("../../../src/telemetry/metrics");

      expect(() => recordCircuitBreakerRequest("getConsumerSecret", "closed")).not.toThrow();
      expect(() => recordCircuitBreakerRequest("healthCheck", "open")).not.toThrow();
      expect(() => recordCircuitBreakerRequest("createConsumerSecret", "half_open")).not.toThrow();
    });

    it("should not throw when recording circuit breaker state transition", async () => {
      const { recordCircuitBreakerStateTransition } = await import(
        "../../../src/telemetry/metrics"
      );

      expect(() =>
        recordCircuitBreakerStateTransition("getConsumerSecret", "closed", "open")
      ).not.toThrow();
      expect(() =>
        recordCircuitBreakerStateTransition("healthCheck", "open", "half-open")
      ).not.toThrow();
      expect(() =>
        recordCircuitBreakerStateTransition("createConsumerSecret", "half-open", "closed")
      ).not.toThrow();
    });

    it("should not throw when recording circuit breaker fallback", async () => {
      const { recordCircuitBreakerFallback } = await import("../../../src/telemetry/metrics");

      expect(() => recordCircuitBreakerFallback("getConsumerSecret", "cache")).not.toThrow();
      expect(() =>
        recordCircuitBreakerFallback("healthCheck", "graceful_degradation")
      ).not.toThrow();
    });

    it("should not throw when recording circuit breaker rejection", async () => {
      const { recordCircuitBreakerRejection } = await import("../../../src/telemetry/metrics");

      expect(() =>
        recordCircuitBreakerRejection("getConsumerSecret", "circuit_open")
      ).not.toThrow();
      expect(() => recordCircuitBreakerRejection("healthCheck", "timeout")).not.toThrow();
    });
  });

  describe("Cache Tier Metrics Recording (No-Op when not initialized)", () => {
    it("should not throw when recording cache tier usage", async () => {
      const { recordCacheTierUsage } = await import("../../../src/telemetry/metrics");

      expect(() => recordCacheTierUsage("memory", "get")).not.toThrow();
      expect(() => recordCacheTierUsage("redis", "set")).not.toThrow();
      expect(() => recordCacheTierUsage("kong", "get")).not.toThrow();
      expect(() => recordCacheTierUsage("fallback", "get")).not.toThrow();
    });

    it("should not throw when recording cache tier latency", async () => {
      const { recordCacheTierLatency } = await import("../../../src/telemetry/metrics");

      expect(() => recordCacheTierLatency("memory", "get", 5)).not.toThrow();
      expect(() => recordCacheTierLatency("redis", "set", 25)).not.toThrow();
      expect(() => recordCacheTierLatency("kong", "get", 150)).not.toThrow();
    });

    it("should not throw when recording cache tier error", async () => {
      const { recordCacheTierError } = await import("../../../src/telemetry/metrics");

      expect(() => recordCacheTierError("redis", "get", "connection_timeout")).not.toThrow();
      expect(() => recordCacheTierError("memory", "set", "capacity_exceeded")).not.toThrow();
    });
  });

  describe("Authentication Metrics Recording (No-Op when not initialized)", () => {
    it("should not throw when recording JWT token creation", async () => {
      const { recordJwtTokenCreation } = await import("../../../src/telemetry/metrics");

      expect(() => recordJwtTokenCreation(15, "consumer-123")).not.toThrow();
      expect(() => recordJwtTokenCreation(20, "consumer-456")).not.toThrow();
    });

    it("should not throw when recording authentication success/failure", async () => {
      const { recordAuthenticationSuccess, recordAuthenticationFailure } = await import(
        "../../../src/telemetry/metrics"
      );

      expect(() => recordAuthenticationSuccess("user@example.com")).not.toThrow();
      expect(() => recordAuthenticationFailure("user@example.com", "invalid_token")).not.toThrow();
    });
  });

  describe("Error Metrics Recording (No-Op when not initialized)", () => {
    it("should not throw when recording error", async () => {
      const { recordError } = await import("../../../src/telemetry/metrics");

      expect(() =>
        recordError("network_error", {
          operation: "getConsumerSecret",
          component: "kong_adapter",
        })
      ).not.toThrow();
    });
  });

  describe("API Versioning Metrics Recording (No-Op when not initialized)", () => {
    it("should not throw when recording API version request", async () => {
      const { recordApiVersionRequest } = await import("../../../src/telemetry/metrics");

      expect(() => recordApiVersionRequest("v1", "/health", "header", "GET")).not.toThrow();
      expect(() => recordApiVersionRequest("v2", "/tokens", "default", "POST")).not.toThrow();
    });
  });

  describe("Security Metrics Recording (No-Op when not initialized)", () => {
    it("should not throw when recording security event", async () => {
      const { recordSecurityEvent } = await import("../../../src/telemetry/metrics");

      expect(() => recordSecurityEvent("jwt_anomaly", "medium", "consumer-123")).not.toThrow();
      expect(() => recordSecurityEvent("rate_limit", "high", undefined)).not.toThrow();
    });

    it("should not throw when recording security headers applied", async () => {
      const { recordSecurityHeadersApplied } = await import("../../../src/telemetry/metrics");

      expect(() => recordSecurityHeadersApplied("/health")).not.toThrow();
      expect(() => recordSecurityHeadersApplied("/tokens")).not.toThrow();
    });
  });

  describe("Telemetry Export Metrics (No-Op when not initialized)", () => {
    it("should not throw when recording telemetry export success", async () => {
      const { recordTelemetryExport } = await import("../../../src/telemetry/metrics");

      expect(() => recordTelemetryExport("otlp", true)).not.toThrow();
      expect(() => recordTelemetryExport("console", true)).not.toThrow();
    });

    it("should not throw when recording telemetry export failure", async () => {
      const { recordTelemetryExport } = await import("../../../src/telemetry/metrics");

      expect(() => recordTelemetryExport("otlp", false)).not.toThrow();
    });
  });

  describe("Kong Operation Metrics (No-Op when not initialized)", () => {
    it("should not throw when recording Kong operation", async () => {
      const { recordKongOperation } = await import("../../../src/telemetry/metrics");

      expect(() => recordKongOperation("get_consumer", 50, "hit")).not.toThrow();
      expect(() => recordKongOperation("get_consumer", 150, "miss")).not.toThrow();
      expect(() => recordKongOperation("health_check", 30, "hit")).not.toThrow();
    });
  });

  describe("GC Metrics (No-Op when not initialized)", () => {
    it("should not throw when recording GC collection", async () => {
      const { recordGCCollection } = await import("../../../src/telemetry/metrics");

      expect(() => recordGCCollection("major")).not.toThrow();
      expect(() => recordGCCollection("minor")).not.toThrow();
    });

    it("should not throw when recording GC duration", async () => {
      const { recordGCDuration } = await import("../../../src/telemetry/metrics");

      expect(() => recordGCDuration(0.005, "major")).not.toThrow();
      expect(() => recordGCDuration(0.001, "minor")).not.toThrow();
    });
  });
});
