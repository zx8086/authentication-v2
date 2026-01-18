/* test/bun/health-handlers.test.ts */

import { afterEach, beforeEach, describe, expect, it, mock, test } from "bun:test";
import type { IKongService, KongCacheStats, KongHealthCheckResult } from "../../src/config";
import {
  handleHealthCheck,
  handleMetricsHealth,
  handleReadinessCheck,
  handleTelemetryHealth,
} from "../../src/handlers/health";
import type { CircuitBreakerStats } from "../../src/services/circuit-breaker.service";

describe("Health Handlers", () => {
  const mockHealthyKongResult: KongHealthCheckResult = {
    healthy: true,
    responseTime: 25,
  };

  const mockUnhealthyKongResult: KongHealthCheckResult = {
    healthy: false,
    responseTime: 5000,
    error: "Connection timeout",
  };

  const mockCacheStats: KongCacheStats = {
    strategy: "local-memory",
    size: 10,
    entries: [],
    activeEntries: 10,
    hitRate: "85.50",
    memoryUsageMB: 1.5,
    averageLatencyMs: 0.5,
  };

  const mockCircuitBreakerStats: Record<string, CircuitBreakerStats> = {
    getConsumerSecret: {
      state: "closed",
      failures: 0,
      successes: 100,
      lastFailure: null,
      lastSuccess: Date.now(),
      consecutiveFailures: 0,
      consecutiveSuccesses: 50,
    },
    healthCheck: {
      state: "closed",
      failures: 2,
      successes: 500,
      lastFailure: Date.now() - 3600000,
      lastSuccess: Date.now(),
      consecutiveFailures: 0,
      consecutiveSuccesses: 100,
    },
  };

  let mockKongService: IKongService;

  beforeEach(() => {
    mockKongService = {
      getConsumerSecret: mock(() => Promise.resolve(null)),
      createConsumerSecret: mock(() => Promise.resolve(null)),
      clearCache: mock(() => Promise.resolve(undefined)),
      getCacheStats: mock(() => Promise.resolve(mockCacheStats)),
      healthCheck: mock(() => Promise.resolve(mockHealthyKongResult)),
      getCircuitBreakerStats: mock(() => mockCircuitBreakerStats),
    };
  });

  afterEach(() => {
    mock.restore();
  });

  describe("handleHealthCheck", () => {
    it("should return 200 when Kong is healthy", async () => {
      const response = await handleHealthCheck(mockKongService);

      expect(response.status).toBe(200);
      expect(mockKongService.healthCheck).toHaveBeenCalledTimes(1);
    });

    it("should return 503 when Kong is unhealthy", async () => {
      const unhealthyService: IKongService = {
        ...mockKongService,
        healthCheck: mock(() => Promise.resolve(mockUnhealthyKongResult)),
      };

      const response = await handleHealthCheck(unhealthyService);

      expect(response.status).toBe(503);
      expect(unhealthyService.healthCheck).toHaveBeenCalledTimes(1);
    });

    it("should include correct response body structure", async () => {
      const response = await handleHealthCheck(mockKongService);
      const body = await response.json();

      // Verify top-level fields with value checks (kills ObjectLiteral mutations)
      expect(body.status).toBe("healthy");
      expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(typeof body.version).toBe("string");
      expect(body.version.length).toBeGreaterThan(0);
      expect(typeof body.environment).toBe("string");
      expect(body.environment.length).toBeGreaterThan(0);
      expect(typeof body.uptime).toBe("number");
      expect(body.uptime).toBeGreaterThanOrEqual(0);
      expect(typeof body.dependencies).toBe("object");
      expect(body.dependencies).not.toBeNull();
      expect(typeof body.requestId).toBe("string");
      expect(body.requestId.length).toBeGreaterThan(0);
    });

    it("should return healthy status when all dependencies are healthy", async () => {
      const response = await handleHealthCheck(mockKongService);
      const body = await response.json();

      expect(body.status).toBe("healthy");
    });

    it("should include Kong dependency details", async () => {
      const response = await handleHealthCheck(mockKongService);
      const body = await response.json();

      // Verify Kong dependency with actual values (kills mutations)
      expect(body.dependencies.kong).toBeDefined();
      expect(body.dependencies.kong.status).toBe("healthy");
      expect(typeof body.dependencies.kong.responseTime).toBe("number");
      expect(body.dependencies.kong.responseTime).toBeGreaterThanOrEqual(0);
      expect(body.dependencies.kong.responseTime).toBeLessThan(60000);
      expect(typeof body.dependencies.kong.details).toBe("object");
      expect(typeof body.dependencies.kong.details.adminUrl).toBe("string");
      expect(body.dependencies.kong.details.adminUrl.length).toBeGreaterThan(0);
      expect(typeof body.dependencies.kong.details.mode).toBe("string");
      expect(["API_GATEWAY", "KONNECT"]).toContain(body.dependencies.kong.details.mode);
    });

    it("should include cache dependency details", async () => {
      const response = await handleHealthCheck(mockKongService);
      const body = await response.json();

      // Verify cache dependency with actual values (kills mutations)
      expect(body.dependencies.cache).toBeDefined();
      expect(["healthy", "unhealthy", "degraded"]).toContain(body.dependencies.cache.status);
      expect(typeof body.dependencies.cache.type).toBe("string");
      expect(body.dependencies.cache.type.length).toBeGreaterThan(0);
      expect(typeof body.dependencies.cache.responseTime).toBe("number");
      expect(body.dependencies.cache.responseTime).toBeGreaterThanOrEqual(0);
      expect(body.dependencies.cache.responseTime).toBeLessThan(60000);
    });

    it("should include telemetry dependency details", async () => {
      const response = await handleHealthCheck(mockKongService);
      const body = await response.json();

      // Verify telemetry structure with value checks (kills ObjectLiteral mutations)
      expect(body.dependencies.telemetry).toBeDefined();
      expect(typeof body.dependencies.telemetry.traces).toBe("object");
      expect(typeof body.dependencies.telemetry.metrics).toBe("object");
      expect(typeof body.dependencies.telemetry.logs).toBe("object");
      expect(typeof body.dependencies.telemetry.exportHealth).toBe("object");
      expect(body.dependencies.telemetry.traces).not.toBeNull();
      expect(body.dependencies.telemetry.metrics).not.toBeNull();
      expect(body.dependencies.telemetry.logs).not.toBeNull();
      expect(body.dependencies.telemetry.exportHealth).not.toBeNull();
    });

    it("should include telemetry export health details", async () => {
      const response = await handleHealthCheck(mockKongService);
      const body = await response.json();

      const exportHealth = body.dependencies.telemetry.exportHealth;
      // Verify export health with value checks and ranges (kills mutations)
      expect(typeof exportHealth.successRate).toBe("number");
      expect(exportHealth.successRate).toBeGreaterThanOrEqual(0);
      expect(exportHealth.successRate).toBeLessThanOrEqual(100);
      expect(typeof exportHealth.totalExports).toBe("number");
      expect(exportHealth.totalExports).toBeGreaterThanOrEqual(0);
      expect(typeof exportHealth.recentFailures).toBe("number");
      expect(exportHealth.recentFailures).toBeGreaterThanOrEqual(0);
      expect(typeof exportHealth.circuitBreakerState).toBe("string");
      expect(["closed", "open", "half-open"]).toContain(exportHealth.circuitBreakerState);
    });

    it("should include valid timestamp in ISO format", async () => {
      const response = await handleHealthCheck(mockKongService);
      const body = await response.json();

      // Verify timestamp format and validity (kills mutations)
      expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      const parsedDate = new Date(body.timestamp);
      expect(parsedDate.getTime()).not.toBeNaN();
      // Timestamp should be within last minute (not stale)
      const now = Date.now();
      expect(parsedDate.getTime()).toBeLessThanOrEqual(now);
      expect(parsedDate.getTime()).toBeGreaterThan(now - 60000);
    });

    it("should include uptime as non-negative number", async () => {
      const response = await handleHealthCheck(mockKongService);
      const body = await response.json();

      expect(typeof body.uptime).toBe("number");
      expect(body.uptime).toBeGreaterThanOrEqual(0);
    });

    it("should include requestId in response", async () => {
      const response = await handleHealthCheck(mockKongService);
      const body = await response.json();

      expect(body.requestId).toBeDefined();
      expect(typeof body.requestId).toBe("string");
      expect(body.requestId.length).toBeGreaterThan(0);
    });

    it("should handle Kong healthCheck exception gracefully", async () => {
      const errorService: IKongService = {
        ...mockKongService,
        healthCheck: mock(() => Promise.reject(new Error("Network unreachable"))),
      };

      const response = await handleHealthCheck(errorService);
      const body = await response.json();

      // Should still return a response (503) not throw
      expect(response.status).toBe(503);
      // When Kong is unhealthy but telemetry and cache are healthy, status is "degraded"
      expect(body.status).toBe("degraded");
      expect(body.dependencies.kong.status).toBe("unhealthy");
    });

    it("should handle circuit breaker stats retrieval failure gracefully", async () => {
      const errorService: IKongService = {
        ...mockKongService,
        getCircuitBreakerStats: mock(() => {
          throw new Error("Circuit breaker unavailable");
        }),
      };

      // Should not throw
      const response = await handleHealthCheck(errorService);
      expect(response.status).toBe(200);
    });

    it("should include highAvailability field in response", async () => {
      const response = await handleHealthCheck(mockKongService);
      const body = await response.json();

      // Verify highAvailability with explicit value check (kills mutations)
      expect(typeof body.highAvailability).toBe("boolean");
      // Default test config has highAvailability disabled (false)
      expect(body.highAvailability).toBe(false);
    });

    test.concurrent("should handle multiple concurrent health checks", async () => {
      const promises = Array.from({ length: 10 }, () => handleHealthCheck(mockKongService));

      const responses = await Promise.all(promises);

      expect(responses).toHaveLength(10);
      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });
    });

    it("should set correct Content-Type header", async () => {
      const response = await handleHealthCheck(mockKongService);

      expect(response.headers.get("Content-Type")).toBe("application/json");
    });

    it("should include X-Request-ID header", async () => {
      const response = await handleHealthCheck(mockKongService);

      const requestId = response.headers.get("X-Request-ID");
      // Verify request ID is valid UUID format (kills mutations)
      expect(typeof requestId).toBe("string");
      expect(requestId!.length).toBeGreaterThan(0);
      expect(requestId).toMatch(/^[a-f0-9-]{36}$/);
    });
  });

  describe("handleTelemetryHealth", () => {
    it("should return 200 for successful telemetry health check", () => {
      const response = handleTelemetryHealth();

      expect(response.status).toBe(200);
    });

    it("should include telemetry configuration in response", async () => {
      const response = handleTelemetryHealth();
      const body = await response.json();

      // Verify telemetry structure with value checks (kills mutations)
      expect(typeof body.telemetry).toBe("object");
      expect(body.telemetry).not.toBeNull();
      expect(["console", "otlp", "both"]).toContain(body.telemetry.mode);
      expect(typeof body.telemetry.status).toBe("object");
      expect(body.telemetry.status).not.toBeNull();
      expect(typeof body.telemetry.simple).toBe("object");
      expect(typeof body.telemetry.configuration).toBe("object");
      expect(body.telemetry.configuration).not.toBeNull();
    });

    it("should include telemetry configuration details", async () => {
      const response = handleTelemetryHealth();
      const body = await response.json();

      const config = body.telemetry.configuration;
      // Verify configuration with value checks (kills mutations)
      expect(typeof config.serviceName).toBe("string");
      expect(config.serviceName.length).toBeGreaterThan(0);
      expect(typeof config.serviceVersion).toBe("string");
      expect(config.serviceVersion.length).toBeGreaterThan(0);
      expect(typeof config.environment).toBe("string");
      expect(config.environment.length).toBeGreaterThan(0);
      expect(typeof config.endpoints).toBe("object");
      expect(config.endpoints).not.toBeNull();
      expect(typeof config.timeout).toBe("number");
      expect(typeof config.batchSize).toBe("number");
      expect(typeof config.queueSize).toBe("number");
    });

    it("should include endpoint configuration", async () => {
      const response = handleTelemetryHealth();
      const body = await response.json();

      const endpoints = body.telemetry.configuration.endpoints;
      // Verify endpoint URLs with value checks (kills mutations)
      expect(typeof endpoints.traces).toBe("string");
      expect(typeof endpoints.metrics).toBe("string");
      expect(typeof endpoints.logs).toBe("string");
      // Endpoints should be valid URLs or empty strings (not null/undefined)
      expect(endpoints.traces).not.toBeNull();
      expect(endpoints.metrics).not.toBeNull();
      expect(endpoints.logs).not.toBeNull();
    });

    it("should include valid timestamp", async () => {
      const response = handleTelemetryHealth();
      const body = await response.json();

      // Verify timestamp format and validity (kills mutations)
      expect(typeof body.timestamp).toBe("string");
      expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      const parsedDate = new Date(body.timestamp);
      expect(parsedDate.getTime()).not.toBeNaN();
    });

    it("should return valid JSON response", async () => {
      const response = handleTelemetryHealth();

      // Verify JSON structure with value checks (kills mutations)
      const body = await response.json();
      expect(typeof body).toBe("object");
      expect(body).not.toBeNull();
      expect(Object.keys(body).length).toBeGreaterThan(0);
    });

    it("should set correct Content-Type header", () => {
      const response = handleTelemetryHealth();

      expect(response.headers.get("Content-Type")).toBe("application/json");
    });

    it("should include telemetry mode in response", async () => {
      const response = handleTelemetryHealth();
      const body = await response.json();

      expect(body.telemetry.mode).toBeDefined();
      expect(["console", "otlp", "both"]).toContain(body.telemetry.mode);
    });

    it("should include numeric timeout and batch configuration", async () => {
      const response = handleTelemetryHealth();
      const body = await response.json();

      const config = body.telemetry.configuration;
      expect(typeof config.timeout).toBe("number");
      expect(config.timeout).toBeGreaterThan(0);
      expect(typeof config.batchSize).toBe("number");
      expect(config.batchSize).toBeGreaterThan(0);
      expect(typeof config.queueSize).toBe("number");
      expect(config.queueSize).toBeGreaterThan(0);
    });
  });

  describe("handleReadinessCheck", () => {
    it("should return 200 when Kong is healthy", async () => {
      const response = await handleReadinessCheck(mockKongService);

      expect(response.status).toBe(200);
      expect(mockKongService.healthCheck).toHaveBeenCalledTimes(1);
    });

    it("should return 503 when Kong is unhealthy", async () => {
      const unhealthyService: IKongService = {
        ...mockKongService,
        healthCheck: mock(() => Promise.resolve(mockUnhealthyKongResult)),
      };

      const response = await handleReadinessCheck(unhealthyService);

      expect(response.status).toBe(503);
    });

    it("should include ready field in response body", async () => {
      const response = await handleReadinessCheck(mockKongService);
      const body = await response.json();

      // Verify ready field with explicit value check (kills mutations)
      expect(typeof body.ready).toBe("boolean");
      expect(body.ready).toBe(true);
    });

    it("should return ready=true when Kong is healthy", async () => {
      const response = await handleReadinessCheck(mockKongService);
      const body = await response.json();

      expect(body.ready).toBe(true);
    });

    it("should return ready=false when Kong is unhealthy", async () => {
      const unhealthyService: IKongService = {
        ...mockKongService,
        healthCheck: mock(() => Promise.resolve(mockUnhealthyKongResult)),
      };

      const response = await handleReadinessCheck(unhealthyService);
      const body = await response.json();

      expect(body.ready).toBe(false);
    });

    it("should include checks field with Kong status", async () => {
      const response = await handleReadinessCheck(mockKongService);
      const body = await response.json();

      // Verify checks with value checks (kills mutations)
      expect(typeof body.checks).toBe("object");
      expect(body.checks).not.toBeNull();
      expect(typeof body.checks.kong).toBe("object");
      expect(body.checks.kong.status).toBe("healthy");
      expect(typeof body.checks.kong.responseTime).toBe("number");
      expect(body.checks.kong.responseTime).toBeGreaterThanOrEqual(0);
      expect(typeof body.checks.kong.details).toBe("object");
      expect(body.checks.kong.details).not.toBeNull();
    });

    it("should include Kong details in checks", async () => {
      const response = await handleReadinessCheck(mockKongService);
      const body = await response.json();

      // Verify Kong details with value checks (kills mutations)
      expect(typeof body.checks.kong.details.adminUrl).toBe("string");
      expect(body.checks.kong.details.adminUrl.length).toBeGreaterThan(0);
      expect(typeof body.checks.kong.details.mode).toBe("string");
      expect(["API_GATEWAY", "KONNECT"]).toContain(body.checks.kong.details.mode);
    });

    it("should include responseTime at top level", async () => {
      const response = await handleReadinessCheck(mockKongService);
      const body = await response.json();

      // Verify responseTime with range check (kills mutations)
      expect(typeof body.responseTime).toBe("number");
      expect(body.responseTime).toBeGreaterThanOrEqual(0);
      expect(body.responseTime).toBeLessThan(60000);
    });

    it("should include requestId in response", async () => {
      const response = await handleReadinessCheck(mockKongService);
      const body = await response.json();

      // Verify requestId is valid UUID format (kills mutations)
      expect(typeof body.requestId).toBe("string");
      expect(body.requestId.length).toBeGreaterThan(0);
      expect(body.requestId).toMatch(/^[a-f0-9-]{36}$/);
    });

    it("should include valid timestamp", async () => {
      const response = await handleReadinessCheck(mockKongService);
      const body = await response.json();

      // Verify timestamp format and validity (kills mutations)
      expect(typeof body.timestamp).toBe("string");
      expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      const parsedDate = new Date(body.timestamp);
      expect(parsedDate.getTime()).not.toBeNaN();
    });

    it("should handle Kong healthCheck exception gracefully", async () => {
      const errorService: IKongService = {
        ...mockKongService,
        healthCheck: mock(() => Promise.reject(new Error("Connection refused"))),
      };

      const response = await handleReadinessCheck(errorService);
      const body = await response.json();

      expect(response.status).toBe(503);
      expect(body.ready).toBe(false);
      expect(body.checks.kong.status).toBe("unhealthy");
    });

    it("should include error in Kong details when unhealthy", async () => {
      const unhealthyService: IKongService = {
        ...mockKongService,
        healthCheck: mock(() => Promise.resolve(mockUnhealthyKongResult)),
      };

      const response = await handleReadinessCheck(unhealthyService);
      const body = await response.json();

      expect(body.checks.kong.details).toHaveProperty("error");
      expect(body.checks.kong.details.error).toBe("Connection timeout");
    });

    it("should set correct Content-Type header", async () => {
      const response = await handleReadinessCheck(mockKongService);

      expect(response.headers.get("Content-Type")).toBe("application/json");
    });

    test.concurrent("should handle multiple concurrent readiness checks", async () => {
      const promises = Array.from({ length: 5 }, () => handleReadinessCheck(mockKongService));

      const responses = await Promise.all(promises);

      expect(responses).toHaveLength(5);
      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });
    });
  });

  describe("handleMetricsHealth", () => {
    it("should return 200 for successful metrics health check", () => {
      const response = handleMetricsHealth(mockKongService);

      expect(response.status).toBe(200);
    });

    it("should include metrics status in response", async () => {
      const response = handleMetricsHealth(mockKongService);
      const body = await response.json();

      expect(body).toHaveProperty("metrics");
      expect(body.metrics).toHaveProperty("status");
      expect(body.metrics).toHaveProperty("exports");
      expect(body.metrics).toHaveProperty("configuration");
    });

    it("should include metrics configuration details", async () => {
      const response = handleMetricsHealth(mockKongService);
      const body = await response.json();

      const config = body.metrics.configuration;
      expect(config).toHaveProperty("exportInterval");
      expect(config).toHaveProperty("batchTimeout");
      expect(config).toHaveProperty("endpoint");
    });

    it("should include circuit breaker summary", async () => {
      const response = handleMetricsHealth(mockKongService);
      const body = await response.json();

      expect(body).toHaveProperty("circuitBreakers");
      expect(body.circuitBreakers).toHaveProperty("enabled");
      expect(body.circuitBreakers).toHaveProperty("totalBreakers");
      expect(body.circuitBreakers).toHaveProperty("states");
    });

    it("should include circuit breaker state counts", async () => {
      const response = handleMetricsHealth(mockKongService);
      const body = await response.json();

      const states = body.circuitBreakers.states;
      expect(states).toHaveProperty("closed");
      expect(states).toHaveProperty("open");
      expect(states).toHaveProperty("halfOpen");
      expect(typeof states.closed).toBe("number");
      expect(typeof states.open).toBe("number");
      expect(typeof states.halfOpen).toBe("number");
    });

    it("should count circuit breaker states correctly", async () => {
      // Mock with 2 closed circuit breakers
      const response = handleMetricsHealth(mockKongService);
      const body = await response.json();

      // Our mockCircuitBreakerStats has 2 breakers both in "closed" state
      expect(body.circuitBreakers.totalBreakers).toBe(2);
      expect(body.circuitBreakers.states.closed).toBe(2);
      expect(body.circuitBreakers.states.open).toBe(0);
      expect(body.circuitBreakers.states.halfOpen).toBe(0);
    });

    it("should handle open circuit breakers", async () => {
      const openBreakerStats: Record<string, CircuitBreakerStats> = {
        failingOperation: {
          state: "open",
          failures: 50,
          successes: 10,
          lastFailure: Date.now(),
          lastSuccess: Date.now() - 60000,
          consecutiveFailures: 10,
          consecutiveSuccesses: 0,
        },
      };

      const serviceWithOpenBreaker: IKongService = {
        ...mockKongService,
        getCircuitBreakerStats: mock(() => openBreakerStats),
      };

      const response = handleMetricsHealth(serviceWithOpenBreaker);
      const body = await response.json();

      expect(body.circuitBreakers.states.open).toBe(1);
      expect(body.circuitBreakers.states.closed).toBe(0);
    });

    it("should handle half-open circuit breakers", async () => {
      const halfOpenBreakerStats: Record<string, CircuitBreakerStats> = {
        recoveringOperation: {
          state: "half-open",
          failures: 20,
          successes: 30,
          lastFailure: Date.now() - 30000,
          lastSuccess: Date.now(),
          consecutiveFailures: 0,
          consecutiveSuccesses: 2,
        },
      };

      const serviceWithHalfOpenBreaker: IKongService = {
        ...mockKongService,
        getCircuitBreakerStats: mock(() => halfOpenBreakerStats),
      };

      const response = handleMetricsHealth(serviceWithHalfOpenBreaker);
      const body = await response.json();

      expect(body.circuitBreakers.states.halfOpen).toBe(1);
    });

    it("should include valid timestamp", async () => {
      const response = handleMetricsHealth(mockKongService);
      const body = await response.json();

      expect(body).toHaveProperty("timestamp");
      expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it("should handle circuit breaker stats retrieval failure gracefully", async () => {
      const errorService: IKongService = {
        ...mockKongService,
        getCircuitBreakerStats: mock(() => {
          throw new Error("Stats unavailable");
        }),
      };

      const response = handleMetricsHealth(errorService);
      const body = await response.json();

      // Should return 200 with empty circuit breaker stats
      expect(response.status).toBe(200);
      expect(body.circuitBreakers.totalBreakers).toBe(0);
    });

    it("should set correct Content-Type header", () => {
      const response = handleMetricsHealth(mockKongService);

      expect(response.headers.get("Content-Type")).toBe("application/json");
    });

    it("should include export statistics", async () => {
      const response = handleMetricsHealth(mockKongService);
      const body = await response.json();

      expect(body.metrics.exports).toBeDefined();
      expect(typeof body.metrics.exports).toBe("object");
    });

    it("should include enabled status for circuit breakers", async () => {
      const response = handleMetricsHealth(mockKongService);
      const body = await response.json();

      expect(typeof body.circuitBreakers.enabled).toBe("boolean");
    });
  });

  describe("Response headers", () => {
    it("should include X-Request-ID in handleHealthCheck response", async () => {
      const response = await handleHealthCheck(mockKongService);
      expect(response.headers.has("X-Request-ID")).toBe(true);
    });

    it("should include X-Request-ID in handleTelemetryHealth response", () => {
      const response = handleTelemetryHealth();
      expect(response.headers.has("X-Request-ID")).toBe(true);
    });

    it("should include X-Request-ID in handleReadinessCheck response", async () => {
      const response = await handleReadinessCheck(mockKongService);
      expect(response.headers.has("X-Request-ID")).toBe(true);
    });

    it("should include X-Request-ID in handleMetricsHealth response", () => {
      const response = handleMetricsHealth(mockKongService);
      expect(response.headers.has("X-Request-ID")).toBe(true);
    });
  });

  describe("Error handling edge cases", () => {
    it("should handle null error message in Kong exception", async () => {
      const errorService: IKongService = {
        ...mockKongService,
        healthCheck: mock(() => Promise.reject("Non-Error rejection")),
      };

      const response = await handleHealthCheck(errorService);

      expect(response.status).toBe(503);
    });

    it("should handle undefined Kong health result properties", async () => {
      const partialResult: KongHealthCheckResult = {
        healthy: false,
        responseTime: 0,
      };

      const partialService: IKongService = {
        ...mockKongService,
        healthCheck: mock(() => Promise.resolve(partialResult)),
      };

      const response = await handleHealthCheck(partialService);

      expect(response.status).toBe(503);
    });
  });

  describe("Performance", () => {
    test.concurrent("should complete health check within reasonable time", async () => {
      const startTime = Bun.nanoseconds();
      await handleHealthCheck(mockKongService);
      const duration = (Bun.nanoseconds() - startTime) / 1_000_000;

      // Should complete within 100ms for mocked dependencies
      expect(duration).toBeLessThan(100);
      expect(duration).toBeGreaterThanOrEqual(0);
    });

    test.concurrent("should complete readiness check within reasonable time", async () => {
      const startTime = Bun.nanoseconds();
      await handleReadinessCheck(mockKongService);
      const duration = (Bun.nanoseconds() - startTime) / 1_000_000;

      expect(duration).toBeLessThan(50);
      expect(duration).toBeGreaterThanOrEqual(0);
    });

    it("should complete telemetry health check within reasonable time", () => {
      const startTime = Bun.nanoseconds();
      handleTelemetryHealth();
      const duration = (Bun.nanoseconds() - startTime) / 1_000_000;

      // Sync operation should be very fast
      expect(duration).toBeLessThan(20);
      expect(duration).toBeGreaterThanOrEqual(0);
    });

    it("should complete metrics health check within reasonable time", () => {
      const startTime = Bun.nanoseconds();
      handleMetricsHealth(mockKongService);
      const duration = (Bun.nanoseconds() - startTime) / 1_000_000;

      expect(duration).toBeLessThan(20);
      expect(duration).toBeGreaterThanOrEqual(0);
    });
  });
});
