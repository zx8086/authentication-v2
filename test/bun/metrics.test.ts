/* test/bun/metrics.test.ts */

import { beforeEach, describe, expect, it, test } from "bun:test";
import {
  initializeMetrics,
  recordAuthenticationAttempt,
  recordAuthenticationFailure,
  recordAuthenticationSuccess,
  recordException,
  recordHttpRequest,
  recordHttpRequestSize,
  recordHttpResponseSize,
  recordHttpResponseTime,
  recordJwtTokenIssued,
  recordKongCacheHit,
  recordKongCacheMiss,
  recordKongOperation,
  recordKongResponseTime,
  recordOperationDuration,
  recordRedisOperation,
  recordTelemetryExport,
  recordTelemetryExportError,
  startSystemMetricsCollection,
  stopSystemMetricsCollection,
} from "../../src/telemetry/metrics";

describe("OpenTelemetry Metrics System", () => {
  beforeEach(() => {
    stopSystemMetricsCollection();
  });

  describe.concurrent("Metrics Initialization", () => {
    test.concurrent("should initialize metrics system without errors", () => {
      expect(() => initializeMetrics()).not.toThrow();
    });

    test.concurrent("should handle multiple initialization calls gracefully", () => {
      initializeMetrics();
      initializeMetrics();
      initializeMetrics();

      expect(() => initializeMetrics()).not.toThrow();
    });

    test.concurrent("should initialize all metric instruments", () => {
      initializeMetrics();

      expect(() => recordHttpRequest("GET", "/test")).not.toThrow();
      expect(() => recordHttpResponseTime(0.1, "GET", "/test")).not.toThrow();
      expect(() => recordJwtTokenIssued("test-consumer")).not.toThrow();
      expect(() => recordKongOperation("consumer_lookup")).not.toThrow();
    });
  });

  describe.concurrent("HTTP Metrics Recording", () => {
    beforeEach(() => {
      initializeMetrics();
    });

    it("should record HTTP requests with various methods and paths", () => {
      const methods = ["GET", "POST", "PUT", "DELETE", "PATCH"];
      const paths = ["/tokens", "/health", "/metrics", "/debug/test"];

      methods.forEach((method) => {
        paths.forEach((path) => {
          expect(() => recordHttpRequest(method, path)).not.toThrow();
        });
      });
    });

    it("should record HTTP response times with realistic values", () => {
      const responseTimes = [0.001, 0.01, 0.1, 0.5, 1.0, 2.5, 5.0];
      const statusCodes = [200, 201, 400, 401, 403, 404, 500, 502, 503];

      responseTimes.forEach((time) => {
        statusCodes.forEach((status) => {
          expect(() => recordHttpResponseTime(time, "GET", "/test", status)).not.toThrow();
        });
      });
    });

    it("should record HTTP request and response sizes", () => {
      const sizes = [0, 128, 1024, 4096, 65536, 1048576];

      sizes.forEach((size) => {
        expect(() => recordHttpRequestSize(size, "POST", "/tokens")).not.toThrow();
        expect(() => recordHttpResponseSize(size, "GET", "/health")).not.toThrow();
      });
    });

    it("should handle edge case HTTP metrics", () => {
      // Very small response time
      expect(() => recordHttpResponseTime(0.0001, "GET", "/")).not.toThrow();

      // Large response time
      expect(() => recordHttpResponseTime(30.0, "POST", "/bulk")).not.toThrow();

      // Zero-byte responses
      expect(() => recordHttpRequestSize(0, "HEAD", "/status")).not.toThrow();
      expect(() => recordHttpResponseSize(0, "HEAD", "/status")).not.toThrow();

      // Large payloads
      expect(() => recordHttpRequestSize(10485760, "POST", "/upload")).not.toThrow(); // 10MB
      expect(() => recordHttpResponseSize(10485760, "GET", "/download")).not.toThrow();
    });
  });

  describe.concurrent("Authentication & JWT Metrics", () => {
    beforeEach(() => {
      initializeMetrics();
    });

    it("should record JWT token issuance for various consumers", () => {
      const consumers = [
        "test-consumer-001",
        "api-client-prod",
        "mobile-app-v2",
        "web-dashboard",
        "integration-service",
      ];

      consumers.forEach((consumer) => {
        expect(() => recordJwtTokenIssued(consumer)).not.toThrow();
      });
    });

    it("should record authentication flow metrics", () => {
      const consumers = ["consumer-1", "consumer-2", "consumer-3"];
      const results = ["valid_credentials", "expired_token", "invalid_signature"];

      consumers.forEach((consumer) => {
        expect(() => recordAuthenticationAttempt(consumer)).not.toThrow();
        expect(() => recordAuthenticationSuccess(consumer)).not.toThrow();

        results.forEach((reason) => {
          expect(() => recordAuthenticationFailure(consumer, reason)).not.toThrow();
        });
      });
    });

    it("should handle authentication metrics at scale", () => {
      // Simulate high-volume authentication scenarios
      for (let i = 0; i < 1000; i++) {
        const consumerId = `high-volume-consumer-${i % 10}`;
        recordAuthenticationAttempt(consumerId);

        if (i % 10 === 0) {
          recordAuthenticationFailure(consumerId, "rate_limit_exceeded");
        } else {
          recordAuthenticationSuccess(consumerId);
          recordJwtTokenIssued(consumerId);
        }
      }

      expect(true).toBe(true); // If we get here, no exceptions were thrown
    });
  });

  describe("Kong Integration Metrics", () => {
    beforeEach(() => {
      initializeMetrics();
    });

    it("should record Kong operations with realistic scenarios", () => {
      const operations = [
        "consumer_lookup",
        "jwt_credential_create",
        "jwt_credential_update",
        "health_check",
        "admin_api_status",
      ];

      const statuses = ["success", "failure", "timeout"];
      const responseTimes = [0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.0, 5.0];

      operations.forEach((operation) => {
        statuses.forEach((status) => {
          expect(() => recordKongOperation(operation, status)).not.toThrow();
        });
      });

      responseTimes.forEach((time) => {
        operations.forEach((operation) => {
          expect(() => recordKongResponseTime(time, operation)).not.toThrow();
        });
      });
    });

    it("should record Kong cache performance metrics", () => {
      const consumerIds = ["cached-consumer-1", "cached-consumer-2", "new-consumer-1"];
      const operations = ["get_consumer_secret", "validate_jwt_key", "check_permissions"];

      // Simulate cache hits and misses
      consumerIds.forEach((consumerId) => {
        operations.forEach((operation) => {
          expect(() => recordKongCacheHit(consumerId, operation)).not.toThrow();
          expect(() => recordKongCacheMiss(consumerId, operation)).not.toThrow();
        });
      });
    });

    it("should handle Kong failure scenarios", () => {
      const failureTypes = [
        "connection_timeout",
        "authentication_failed",
        "permission_denied",
        "resource_not_found",
        "internal_server_error",
      ];

      failureTypes.forEach((failureType) => {
        expect(() => recordKongOperation("admin_api_call", "failure", failureType)).not.toThrow();
        expect(() => recordKongResponseTime(5.0, "failed_operation", failureType)).not.toThrow();
      });
    });
  });

  describe("Redis Cache Metrics", () => {
    beforeEach(() => {
      initializeMetrics();
    });

    it("should record Redis operations with comprehensive coverage", () => {
      const operations = ["get", "set", "delete", "exists", "expire", "ttl"];
      const statuses = ["success", "failure", "timeout", "connection_error"];
      const durations = [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5];

      operations.forEach((operation) => {
        statuses.forEach((status) => {
          durations.forEach((duration) => {
            expect(() => recordRedisOperation(operation, status, duration)).not.toThrow();
          });
        });
      });
    });

    it("should record Redis operations successfully", () => {
      const operations = ["get", "set", "delete", "ping"];
      const statuses = ["success", "failure"];

      operations.forEach((operation) => {
        statuses.forEach((status) => {
          expect(() => recordRedisOperation(operation, status, 0.01)).not.toThrow();
        });
      });
    });

    it("should handle Redis performance scenarios", () => {
      // Simulate various Redis performance patterns
      const scenarios = [
        { operation: "get", hit: true, duration: 0.001 },
        { operation: "get", hit: false, duration: 0.002 },
        { operation: "set", hit: false, duration: 0.005 },
        { operation: "delete", hit: true, duration: 0.003 },
      ];

      scenarios.forEach((scenario) => {
        expect(() => recordRedisOperation(scenario.operation, "success", scenario.duration)).not.toThrow();

        if (scenario.hit) {
          expect(() => recordKongCacheHit("redis-test", scenario.operation)).not.toThrow();
        } else {
          expect(() => recordKongCacheMiss("redis-test", scenario.operation)).not.toThrow();
        }
      });
    });
  });

  describe("System Metrics Collection", () => {
    beforeEach(() => {
      initializeMetrics();
    });

    it("should start and stop system metrics collection", () => {
      expect(() => startSystemMetricsCollection()).not.toThrow();
      expect(() => stopSystemMetricsCollection()).not.toThrow();
    });

    it("should handle multiple start/stop cycles", () => {
      for (let i = 0; i < 5; i++) {
        startSystemMetricsCollection();
        stopSystemMetricsCollection();
      }

      expect(true).toBe(true); // If we get here, no exceptions were thrown
    });

    it("should collect system metrics over time", () => {
      startSystemMetricsCollection();

      return new Promise((resolve) => {
        // Let system metrics collection run for a short period
        setTimeout(() => {
          stopSystemMetricsCollection();
          resolve();
        }, 500);
      });
    });
  });

  describe("Error and Exception Metrics", () => {
    beforeEach(() => {
      initializeMetrics();
    });

    it("should record various types of exceptions", () => {
      const errorTypes = [
        "jwt_generation_failed",
        "kong_api_error",
        "cache_error",
        "network_timeout",
        "validation_error",
        "configuration_error",
        "database_error",
      ];

      const components = ["jwt-service", "kong-service", "cache-service", "config-loader"];

      errorTypes.forEach((errorType) => {
        components.forEach((component) => {
          expect(() => recordException(errorType, component)).not.toThrow();
        });
      });
    });

    it("should record operation duration metrics", () => {
      const operations = [
        "jwt_token_generation",
        "kong_consumer_lookup",
        "cache_get_operation",
        "redis_connection_establish",
        "config_validation",
      ];

      const durations = [0.001, 0.01, 0.1, 0.5, 1.0, 2.5, 5.0, 10.0];

      operations.forEach((operation) => {
        durations.forEach((duration) => {
          expect(() => recordOperationDuration(operation, duration)).not.toThrow();
        });
      });
    });
  });

  describe("Telemetry Export Metrics", () => {
    beforeEach(() => {
      initializeMetrics();
    });

    it("should record telemetry export operations", () => {
      const exportTypes = ["otlp_traces", "otlp_metrics", "otlp_logs"];
      const statuses = ["success", "failure", "timeout", "retry"];

      exportTypes.forEach((exportType) => {
        statuses.forEach((status) => {
          if (status === "success") {
            expect(() => recordTelemetryExport(exportType)).not.toThrow();
          } else {
            expect(() => recordTelemetryExportError(exportType, status)).not.toThrow();
          }
        });
      });
    });

    it("should handle telemetry export at scale", () => {
      // Simulate high-frequency telemetry exports
      for (let i = 0; i < 100; i++) {
        recordTelemetryExport("otlp_metrics");

        if (i % 20 === 0) {
          recordTelemetryExportError("otlp_metrics", "timeout");
        }
      }

      expect(true).toBe(true);
    });
  });

  describe("Metrics Integration and Edge Cases", () => {
    beforeEach(() => {
      initializeMetrics();
    });

    it("should handle concurrent metric recording", async () => {
      const promises: Promise<void>[] = [];

      // Create multiple concurrent metric recording operations
      for (let i = 0; i < 50; i++) {
        promises.push(
          new Promise((resolve) => {
            recordHttpRequest("GET", `/concurrent-${i}`);
            recordHttpResponseTime(Math.random() * 2, "GET", `/concurrent-${i}`);
            recordJwtTokenIssued(`concurrent-consumer-${i % 5}`);
            resolve();
          })
        );
      }

      await Promise.all(promises);
      expect(true).toBe(true);
    });

    it("should handle extreme metric values", () => {
      // Very small values
      expect(() => recordHttpResponseTime(0.0000001, "GET", "/micro")).not.toThrow();
      expect(() => recordKongResponseTime(0.0001, "fast_lookup")).not.toThrow();

      // Very large values
      expect(() => recordHttpResponseTime(3600, "GET", "/slow")).not.toThrow();
      expect(() => recordHttpRequestSize(1073741824, "POST", "/huge")).not.toThrow(); // 1GB

      // Zero values
      expect(() => recordHttpResponseTime(0, "HEAD", "/empty")).not.toThrow();
      expect(() => recordHttpRequestSize(0, "GET", "/no-body")).not.toThrow();
    });

    it("should handle metrics with special characters in labels", () => {
      const specialConsumers = [
        "consumer-with-dash",
        "consumer_with_underscore",
        "consumer.with.dots",
        "consumer@domain.com",
        "consumer/path/like",
      ];

      specialConsumers.forEach((consumer) => {
        expect(() => recordJwtTokenIssued(consumer)).not.toThrow();
        expect(() => recordAuthenticationSuccess(consumer)).not.toThrow();
      });
    });
  });

  describe("Memory Pressure Integration", () => {
    beforeEach(() => {
      initializeMetrics();
    });

    it("should handle metrics recording under simulated memory pressure", () => {
      // Start system metrics collection
      startSystemMetricsCollection();

      try {
        // Record metrics while system is under observation
        for (let i = 0; i < 100; i++) {
          recordHttpRequest("POST", "/memory-test");
          recordJwtTokenIssued(`memory-test-${i}`);
          recordKongOperation("memory_test_operation");
        }

        expect(true).toBe(true);
      } finally {
        stopSystemMetricsCollection();
      }
    });
  });
});