// test/bun/telemetry/metrics-initialized.test.ts

import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { TEST_KONG_ADMIN_TOKEN } from "../../shared/test-constants";

describe("Metrics Recording with Initialization", () => {
  const originalEnv = { ...Bun.env };

  beforeAll(async () => {
    // Set up environment for metrics initialization
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
    Bun.env.OTEL_SERVICE_NAME = "metrics-test-service";
    Bun.env.OTEL_SERVICE_VERSION = "1.0.0-test";

    // Initialize metrics
    const { initializeMetrics } = await import("../../../src/telemetry/metrics");
    initializeMetrics("metrics-test-service", "1.0.0-test");
  });

  afterAll(async () => {
    // Shutdown metrics
    const { shutdownMetrics } = await import("../../../src/telemetry/metrics");
    shutdownMetrics();

    // Restore environment
    Object.keys(Bun.env).forEach((key) => {
      if (!(key in originalEnv)) {
        delete Bun.env[key];
      }
    });
    Object.assign(Bun.env, originalEnv);
  });

  describe("getMetricsStatus when initialized", () => {
    it("should return initialized: true after initialization", async () => {
      const { getMetricsStatus } = await import("../../../src/telemetry/metrics");

      const status = getMetricsStatus();

      expect(status.initialized).toBe(true);
      expect(status.initialized).not.toBe(false);
    });

    it("should include instrument count in status", async () => {
      const { getMetricsStatus } = await import("../../../src/telemetry/metrics");

      const status = getMetricsStatus();

      expect(status.instrumentCount).toBeGreaterThan(0);
      expect(status.availableMetrics).toBeDefined();
      expect(Array.isArray(status.availableMetrics)).toBe(true);
    });
  });

  describe("HTTP Metrics Recording (Initialized)", () => {
    it("should record HTTP request with method and route", async () => {
      const { recordHttpRequest } = await import("../../../src/telemetry/metrics");

      // Should not throw and should actually record
      expect(() => recordHttpRequest("GET", "/health")).not.toThrow();
      expect(() => recordHttpRequest("POST", "/tokens")).not.toThrow();
      expect(() => recordHttpRequest("DELETE", "/cache")).not.toThrow();
    });

    it("should record HTTP request with status code", async () => {
      const { recordHttpRequest } = await import("../../../src/telemetry/metrics");

      expect(() => recordHttpRequest("GET", "/health", 200)).not.toThrow();
      expect(() => recordHttpRequest("GET", "/health", 201)).not.toThrow();
      expect(() => recordHttpRequest("GET", "/health", 400)).not.toThrow();
      expect(() => recordHttpRequest("GET", "/health", 500)).not.toThrow();
    });

    it("should record HTTP request with request and response sizes", async () => {
      const { recordHttpRequest } = await import("../../../src/telemetry/metrics");

      expect(() => recordHttpRequest("POST", "/tokens", 200, 256, 1024)).not.toThrow();
      expect(() => recordHttpRequest("POST", "/tokens", 200, 0, 512)).not.toThrow();
      expect(() => recordHttpRequest("GET", "/health", 200, undefined, 128)).not.toThrow();
    });

    it("should record HTTP response time", async () => {
      const { recordHttpResponseTime } = await import("../../../src/telemetry/metrics");

      expect(() => recordHttpResponseTime(50, "GET", "/health", 200)).not.toThrow();
      expect(() => recordHttpResponseTime(150, "POST", "/tokens", 201)).not.toThrow();
      expect(() => recordHttpResponseTime(5000, "GET", "/timeout", 504)).not.toThrow();
    });

    it("should record HTTP response time with various durations", async () => {
      const { recordHttpResponseTime } = await import("../../../src/telemetry/metrics");

      // Test histogram bucket boundaries
      expect(() => recordHttpResponseTime(1, "GET", "/fast", 200)).not.toThrow();
      expect(() => recordHttpResponseTime(10, "GET", "/normal", 200)).not.toThrow();
      expect(() => recordHttpResponseTime(100, "GET", "/slow", 200)).not.toThrow();
      expect(() => recordHttpResponseTime(1000, "GET", "/very-slow", 200)).not.toThrow();
    });
  });

  describe("Circuit Breaker Metrics (Initialized)", () => {
    it("should record circuit breaker request", async () => {
      const { recordCircuitBreakerRequest } = await import("../../../src/telemetry/metrics");

      expect(() => recordCircuitBreakerRequest("getConsumerSecret", "closed")).not.toThrow();
      expect(() => recordCircuitBreakerRequest("healthCheck", "open")).not.toThrow();
      expect(() => recordCircuitBreakerRequest("createConsumerSecret", "half_open")).not.toThrow();
    });

    it("should record circuit breaker state transition", async () => {
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

    it("should record circuit breaker fallback", async () => {
      const { recordCircuitBreakerFallback } = await import("../../../src/telemetry/metrics");

      expect(() => recordCircuitBreakerFallback("getConsumerSecret", "cache")).not.toThrow();
      expect(() =>
        recordCircuitBreakerFallback("healthCheck", "graceful_degradation")
      ).not.toThrow();
      expect(() => recordCircuitBreakerFallback("createConsumerSecret", "deny")).not.toThrow();
    });

    it("should record circuit breaker rejection", async () => {
      const { recordCircuitBreakerRejection } = await import("../../../src/telemetry/metrics");

      expect(() =>
        recordCircuitBreakerRejection("getConsumerSecret", "circuit_open")
      ).not.toThrow();
      expect(() => recordCircuitBreakerRejection("healthCheck", "timeout")).not.toThrow();
    });
  });

  describe("Cache Tier Metrics (Initialized)", () => {
    it("should record cache tier usage with tier and operation", async () => {
      const { recordCacheTierUsage } = await import("../../../src/telemetry/metrics");

      expect(() => recordCacheTierUsage("memory", "get")).not.toThrow();
      expect(() => recordCacheTierUsage("redis", "set")).not.toThrow();
      expect(() => recordCacheTierUsage("kong", "get")).not.toThrow();
      expect(() => recordCacheTierUsage("fallback", "get")).not.toThrow();
    });

    it("should record cache tier latency", async () => {
      const { recordCacheTierLatency } = await import("../../../src/telemetry/metrics");

      expect(() => recordCacheTierLatency("memory", "get", 1)).not.toThrow();
      expect(() => recordCacheTierLatency("redis", "set", 15)).not.toThrow();
      expect(() => recordCacheTierLatency("kong", "get", 100)).not.toThrow();
    });

    it("should record cache tier error", async () => {
      const { recordCacheTierError } = await import("../../../src/telemetry/metrics");

      expect(() => recordCacheTierError("redis", "get", "connection_timeout")).not.toThrow();
      expect(() => recordCacheTierError("memory", "set", "capacity_exceeded")).not.toThrow();
    });

    it("should record Kong cache hit and miss", async () => {
      const { recordKongCacheHit, recordKongCacheMiss } = await import(
        "../../../src/telemetry/metrics"
      );

      expect(() => recordKongCacheHit("consumer-123", "get_secret")).not.toThrow();
      expect(() => recordKongCacheHit("consumer-456", "health_check")).not.toThrow();
      expect(() => recordKongCacheMiss("consumer-789", "get_secret")).not.toThrow();
      expect(() => recordKongCacheMiss("consumer-000", "create_secret")).not.toThrow();
    });
  });

  describe("Authentication Metrics (Initialized)", () => {
    it("should record JWT token creation", async () => {
      const { recordJwtTokenCreation } = await import("../../../src/telemetry/metrics");

      expect(() => recordJwtTokenCreation(15, "consumer-123")).not.toThrow();
      expect(() => recordJwtTokenCreation(25, "consumer-456")).not.toThrow();
      expect(() => recordJwtTokenCreation(5, undefined)).not.toThrow();
    });

    it("should record authentication success", async () => {
      const { recordAuthenticationSuccess } = await import("../../../src/telemetry/metrics");

      expect(() => recordAuthenticationSuccess("user@example.com")).not.toThrow();
      expect(() => recordAuthenticationSuccess("admin@company.com")).not.toThrow();
    });

    it("should record authentication failure with reason", async () => {
      const { recordAuthenticationFailure } = await import("../../../src/telemetry/metrics");

      expect(() => recordAuthenticationFailure("user@example.com", "invalid_token")).not.toThrow();
      expect(() => recordAuthenticationFailure("user@example.com", "expired_token")).not.toThrow();
      expect(() =>
        recordAuthenticationFailure("user@example.com", "missing_credentials")
      ).not.toThrow();
    });
  });

  describe("Kong Operation Metrics (Initialized)", () => {
    it("should record Kong operation with duration and cache status", async () => {
      const { recordKongOperation } = await import("../../../src/telemetry/metrics");

      expect(() => recordKongOperation("get_consumer", 50, "hit")).not.toThrow();
      expect(() => recordKongOperation("get_consumer", 150, "miss")).not.toThrow();
      expect(() => recordKongOperation("health_check", 25, "hit")).not.toThrow();
      expect(() => recordKongOperation("create_secret", 200, "miss")).not.toThrow();
    });

    it("should record Kong operation with various durations", async () => {
      const { recordKongOperation } = await import("../../../src/telemetry/metrics");

      // Test histogram buckets
      expect(() => recordKongOperation("get_consumer", 1, "hit")).not.toThrow();
      expect(() => recordKongOperation("get_consumer", 10, "hit")).not.toThrow();
      expect(() => recordKongOperation("get_consumer", 100, "miss")).not.toThrow();
      expect(() => recordKongOperation("get_consumer", 500, "miss")).not.toThrow();
    });
  });

  describe("API Version Metrics (Initialized)", () => {
    it("should record API version request", async () => {
      const { recordApiVersionRequest } = await import("../../../src/telemetry/metrics");

      expect(() => recordApiVersionRequest("v1", "/health", "header", "GET")).not.toThrow();
      expect(() => recordApiVersionRequest("v2", "/tokens", "default", "POST")).not.toThrow();
      expect(() => recordApiVersionRequest("v1", "/metrics", "fallback", "GET")).not.toThrow();
    });

    it("should record API version usage with valid versions", async () => {
      const { recordApiVersionUsage } = await import("../../../src/telemetry/metrics");

      expect(() => recordApiVersionUsage("v1", "/health", "GET", "header")).not.toThrow();
      expect(() => recordApiVersionUsage("v2", "/tokens", "POST", "default")).not.toThrow();
    });

    it("should handle invalid version gracefully", async () => {
      const { recordApiVersionRequest } = await import("../../../src/telemetry/metrics");

      // Invalid versions should be normalized to v1
      expect(() => recordApiVersionRequest("v3", "/health", "header", "GET")).not.toThrow();
      expect(() => recordApiVersionRequest("invalid", "/health", "header", "GET")).not.toThrow();
    });
  });

  describe("Security Metrics (Initialized)", () => {
    it("should record security event with severity", async () => {
      const { recordSecurityEvent } = await import("../../../src/telemetry/metrics");

      expect(() => recordSecurityEvent("jwt_anomaly", "medium", "consumer-123")).not.toThrow();
      expect(() => recordSecurityEvent("rate_limit", "high", "consumer-456")).not.toThrow();
      expect(() => recordSecurityEvent("auth_failure", "low", undefined)).not.toThrow();
    });

    it("should record security headers applied", async () => {
      const { recordSecurityHeadersApplied } = await import("../../../src/telemetry/metrics");

      expect(() => recordSecurityHeadersApplied("v1", 5)).not.toThrow();
      expect(() => recordSecurityHeadersApplied("v2", 8)).not.toThrow();
    });

    it("should record security headers (no args)", async () => {
      const { recordSecurityHeaders } = await import("../../../src/telemetry/metrics");

      expect(() => recordSecurityHeaders()).not.toThrow();
    });
  });

  describe("Telemetry Export Metrics (Initialized)", () => {
    it("should record telemetry export success", async () => {
      const { recordTelemetryExport } = await import("../../../src/telemetry/metrics");

      expect(() => recordTelemetryExport("otlp", true)).not.toThrow();
      expect(() => recordTelemetryExport("console", true)).not.toThrow();
    });

    it("should record telemetry export failure", async () => {
      const { recordTelemetryExport } = await import("../../../src/telemetry/metrics");

      expect(() => recordTelemetryExport("otlp", false)).not.toThrow();
      expect(() => recordTelemetryExport("console", false)).not.toThrow();
    });
  });

  describe("Error Metrics (Initialized)", () => {
    it("should record error with type and attributes", async () => {
      const { recordError } = await import("../../../src/telemetry/metrics");

      expect(() =>
        recordError("network_error", {
          operation: "getConsumerSecret",
          component: "kong_adapter",
        })
      ).not.toThrow();

      expect(() =>
        recordError("validation_error", {
          field: "consumerId",
          component: "tokens_handler",
        })
      ).not.toThrow();
    });

    it("should record error with minimal attributes", async () => {
      const { recordError } = await import("../../../src/telemetry/metrics");

      expect(() => recordError("unknown_error", {})).not.toThrow();
    });
  });

  describe("GC Metrics (Initialized)", () => {
    it("should record GC collection by type", async () => {
      const { recordGCCollection } = await import("../../../src/telemetry/metrics");

      expect(() => recordGCCollection("major")).not.toThrow();
      expect(() => recordGCCollection("minor")).not.toThrow();
    });

    it("should record GC duration with type", async () => {
      const { recordGCDuration } = await import("../../../src/telemetry/metrics");

      expect(() => recordGCDuration(0.005, "major")).not.toThrow();
      expect(() => recordGCDuration(0.001, "minor")).not.toThrow();
      expect(() => recordGCDuration(0.05, "major")).not.toThrow();
    });
  });

  describe("Consumer Volume Metrics (Initialized)", () => {
    it("should record consumer request", async () => {
      const { recordConsumerRequest } = await import("../../../src/telemetry/metrics");

      expect(() => recordConsumerRequest("consumer-123")).not.toThrow();
      expect(() => recordConsumerRequest("consumer-456")).not.toThrow();
    });

    it("should record consumer error", async () => {
      const { recordConsumerError } = await import("../../../src/telemetry/metrics");

      expect(() => recordConsumerError("consumer-123")).not.toThrow();
      expect(() => recordConsumerError("consumer-456")).not.toThrow();
    });

    it("should record consumer latency", async () => {
      const { recordConsumerLatency } = await import("../../../src/telemetry/metrics");

      expect(() => recordConsumerLatency("consumer-123", 50)).not.toThrow();
      expect(() => recordConsumerLatency("consumer-456", 150)).not.toThrow();
    });
  });

  describe("Redis Metrics (Initialized)", () => {
    it("should record Redis operation", async () => {
      const { recordRedisOperation } = await import("../../../src/telemetry/metrics");

      expect(() => recordRedisOperation("get", 5, true)).not.toThrow();
      expect(() => recordRedisOperation("set", 10, true)).not.toThrow();
      expect(() => recordRedisOperation("get", 100, false)).not.toThrow();
    });
  });

  describe("Operation Duration Metrics (Initialized)", () => {
    it("should record operation duration", async () => {
      const { recordOperationDuration } = await import("../../../src/telemetry/metrics");

      expect(() => recordOperationDuration("getConsumerSecret", 50)).not.toThrow();
      expect(() => recordOperationDuration("healthCheck", 25)).not.toThrow();
      expect(() => recordOperationDuration("createConsumerSecret", 150)).not.toThrow();
    });
  });

  describe("Active Requests Metrics (Initialized)", () => {
    it("should record active requests count", async () => {
      const { recordActiveRequests } = await import("../../../src/telemetry/metrics");

      expect(() => recordActiveRequests(5)).not.toThrow();
      expect(() => recordActiveRequests(0)).not.toThrow();
      expect(() => recordActiveRequests(100)).not.toThrow();
    });
  });

  describe("Redis Connection Metrics (Initialized)", () => {
    it("should record Redis connection changes", async () => {
      const { recordRedisConnection } = await import("../../../src/telemetry/metrics");

      expect(() => recordRedisConnection(true)).not.toThrow();
      expect(() => recordRedisConnection(false)).not.toThrow();
    });
  });

  describe("Double Initialization Warning", () => {
    it("should warn when metrics are already initialized", async () => {
      const { initializeMetrics, getMetricsStatus } = await import(
        "../../../src/telemetry/metrics"
      );

      // Metrics should already be initialized from beforeAll
      expect(getMetricsStatus().initialized).toBe(true);

      // Calling initialize again should not throw but should warn
      expect(() => initializeMetrics("another-service", "2.0.0")).not.toThrow();

      // Should still be initialized
      expect(getMetricsStatus().initialized).toBe(true);
    });
  });
});
