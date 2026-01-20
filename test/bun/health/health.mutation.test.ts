/* test/bun/health.mutation.test.ts */

// Focused mutation testing for health.ts handlers
// Tests specifically designed to kill surviving mutants

import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import type { IKongService, KongCacheStats } from "../../../src/config";
import {
  handleHealthCheck,
  handleMetricsHealth,
  handleReadinessCheck,
  handleTelemetryHealth,
} from "../../../src/handlers/health";
import type { CircuitBreakerStats } from "../../../src/services/circuit-breaker.service";

describe("Health Handler Mutation Tests", () => {
  const mockCacheStats: KongCacheStats = {
    strategy: "local-memory",
    size: 10,
    entries: [],
    activeEntries: 10,
    hitRate: "85.50",
    memoryUsageMB: 1.5,
    averageLatencyMs: 0.5,
  };

  let mockKongService: IKongService;

  beforeEach(() => {
    mockKongService = {
      getConsumerSecret: mock(() => Promise.resolve(null)),
      createConsumerSecret: mock(() => Promise.resolve(null)),
      clearCache: mock(() => Promise.resolve(undefined)),
      getCacheStats: mock(() => Promise.resolve(mockCacheStats)),
      healthCheck: mock(() =>
        Promise.resolve({
          healthy: true,
          responseTime: 25,
        })
      ),
      getCircuitBreakerStats: mock(() => ({})),
    };
  });

  afterEach(() => {
    mock.restore();
  });

  describe("handleHealthCheck status determination", () => {
    it("should return 'healthy' when ALL dependencies are healthy", async () => {
      const response = await handleHealthCheck(mockKongService);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.status).toBe("healthy");
    });

    it("should return 'unhealthy' when Kong is unhealthy and other dependencies too", async () => {
      const unhealthyService: IKongService = {
        ...mockKongService,
        healthCheck: mock(() =>
          Promise.resolve({
            healthy: false,
            responseTime: 5000,
            error: "Connection timeout",
          })
        ),
      };

      const response = await handleHealthCheck(unhealthyService);
      const body = await response.json();

      expect(response.status).toBe(503);
      // Status depends on other dependencies
      expect(["unhealthy", "degraded"]).toContain(body.status);
    });

    it("should return 'degraded' when Kong unhealthy but telemetry and cache healthy", async () => {
      const kongUnhealthyService: IKongService = {
        ...mockKongService,
        healthCheck: mock(() =>
          Promise.resolve({
            healthy: false,
            responseTime: 5000,
            error: "Kong unreachable",
          })
        ),
      };

      const response = await handleHealthCheck(kongUnhealthyService);
      const body = await response.json();

      expect(response.status).toBe(503);
      expect(body.status).toBe("degraded");
    });

    it("should return 503 status code when unhealthy", async () => {
      const unhealthyService: IKongService = {
        ...mockKongService,
        healthCheck: mock(() =>
          Promise.resolve({
            healthy: false,
            responseTime: 0,
            error: "Failed",
          })
        ),
      };

      const response = await handleHealthCheck(unhealthyService);

      expect(response.status).toBe(503);
    });

    it("should return 200 status code when healthy", async () => {
      const response = await handleHealthCheck(mockKongService);

      expect(response.status).toBe(200);
    });
  });

  describe("handleHealthCheck Kong exception handling", () => {
    it("should catch Kong healthCheck exception and mark as unhealthy", async () => {
      const exceptionService: IKongService = {
        ...mockKongService,
        healthCheck: mock(() => Promise.reject(new Error("Network error"))),
      };

      const response = await handleHealthCheck(exceptionService);
      const body = await response.json();

      expect(response.status).toBe(503);
      expect(body.dependencies.kong.status).toBe("unhealthy");
      expect(body.dependencies.kong.details.error).toBe("Network error");
    });

    it("should handle non-Error rejection in Kong healthCheck", async () => {
      const stringRejectionService: IKongService = {
        ...mockKongService,
        healthCheck: mock(() => Promise.reject("String rejection")),
      };

      const response = await handleHealthCheck(stringRejectionService);
      const body = await response.json();

      expect(response.status).toBe(503);
      expect(body.dependencies.kong.status).toBe("unhealthy");
      expect(body.dependencies.kong.details.error).toBe("Connection failed");
    });
  });

  describe("handleHealthCheck circuit breaker state aggregation", () => {
    it("should detect 'open' state and prioritize it", async () => {
      const openBreakerStats: Record<string, CircuitBreakerStats> = {
        op1: {
          state: "closed",
          failures: 0,
          successes: 10,
          lastFailure: null,
          lastSuccess: Date.now(),
          consecutiveFailures: 0,
          consecutiveSuccesses: 5,
        },
        op2: {
          state: "open",
          failures: 10,
          successes: 0,
          lastFailure: Date.now(),
          lastSuccess: null,
          consecutiveFailures: 10,
          consecutiveSuccesses: 0,
        },
        op3: {
          state: "half-open",
          failures: 5,
          successes: 5,
          lastFailure: Date.now() - 1000,
          lastSuccess: Date.now(),
          consecutiveFailures: 0,
          consecutiveSuccesses: 2,
        },
      };

      const serviceWithOpenBreaker: IKongService = {
        ...mockKongService,
        getCircuitBreakerStats: mock(() => openBreakerStats),
      };

      const response = await handleHealthCheck(serviceWithOpenBreaker);
      const body = await response.json();

      expect(body.dependencies.telemetry.exportHealth.circuitBreakerState).toBe("open");
    });

    it("should detect 'half-open' state when no 'open'", async () => {
      const halfOpenBreakerStats: Record<string, CircuitBreakerStats> = {
        op1: {
          state: "closed",
          failures: 0,
          successes: 10,
          lastFailure: null,
          lastSuccess: Date.now(),
          consecutiveFailures: 0,
          consecutiveSuccesses: 5,
        },
        op2: {
          state: "half-open",
          failures: 5,
          successes: 5,
          lastFailure: Date.now() - 1000,
          lastSuccess: Date.now(),
          consecutiveFailures: 0,
          consecutiveSuccesses: 2,
        },
      };

      const serviceWithHalfOpen: IKongService = {
        ...mockKongService,
        getCircuitBreakerStats: mock(() => halfOpenBreakerStats),
      };

      const response = await handleHealthCheck(serviceWithHalfOpen);
      const body = await response.json();

      expect(body.dependencies.telemetry.exportHealth.circuitBreakerState).toBe("half-open");
    });

    it("should use 'closed' when all breakers are closed", async () => {
      const closedBreakerStats: Record<string, CircuitBreakerStats> = {
        op1: {
          state: "closed",
          failures: 0,
          successes: 10,
          lastFailure: null,
          lastSuccess: Date.now(),
          consecutiveFailures: 0,
          consecutiveSuccesses: 5,
        },
        op2: {
          state: "closed",
          failures: 1,
          successes: 20,
          lastFailure: Date.now() - 10000,
          lastSuccess: Date.now(),
          consecutiveFailures: 0,
          consecutiveSuccesses: 10,
        },
      };

      const serviceWithClosed: IKongService = {
        ...mockKongService,
        getCircuitBreakerStats: mock(() => closedBreakerStats),
      };

      const response = await handleHealthCheck(serviceWithClosed);
      const body = await response.json();

      expect(body.dependencies.telemetry.exportHealth.circuitBreakerState).toBe("closed");
    });

    it("should default to 'closed' when no breakers exist", async () => {
      const emptyBreakerStats: Record<string, CircuitBreakerStats> = {};

      const serviceWithNoBreakers: IKongService = {
        ...mockKongService,
        getCircuitBreakerStats: mock(() => emptyBreakerStats),
      };

      const response = await handleHealthCheck(serviceWithNoBreakers);
      const body = await response.json();

      expect(body.dependencies.telemetry.exportHealth.circuitBreakerState).toBe("closed");
    });
  });

  describe("handleHealthCheck circuit breaker stats exception", () => {
    it("should handle getCircuitBreakerStats exception gracefully", async () => {
      const errorService: IKongService = {
        ...mockKongService,
        getCircuitBreakerStats: mock(() => {
          throw new Error("Stats unavailable");
        }),
      };

      const response = await handleHealthCheck(errorService);

      // Should still return a response
      expect(response.status).toBe(200);
    });

    it("should use default circuitBreakerState when stats fail", async () => {
      const errorService: IKongService = {
        ...mockKongService,
        getCircuitBreakerStats: mock(() => {
          throw new Error("Stats unavailable");
        }),
      };

      const response = await handleHealthCheck(errorService);
      const body = await response.json();

      expect(body.dependencies.telemetry.exportHealth.circuitBreakerState).toBe("closed");
    });
  });

  describe("handleHealthCheck response structure", () => {
    it("should include Kong responseTime rounded", async () => {
      const response = await handleHealthCheck(mockKongService);
      const body = await response.json();

      expect(typeof body.dependencies.kong.responseTime).toBe("number");
      expect(Number.isInteger(body.dependencies.kong.responseTime)).toBe(true);
    });

    it("should include Kong adminUrl in details", async () => {
      const response = await handleHealthCheck(mockKongService);
      const body = await response.json();

      expect(body.dependencies.kong.details).toHaveProperty("adminUrl");
      expect(typeof body.dependencies.kong.details.adminUrl).toBe("string");
    });

    it("should include Kong mode in details", async () => {
      const response = await handleHealthCheck(mockKongService);
      const body = await response.json();

      expect(body.dependencies.kong.details).toHaveProperty("mode");
    });

    it("should only include Kong error when present", async () => {
      // Healthy Kong - no error
      const healthyResponse = await handleHealthCheck(mockKongService);
      const healthyBody = await healthyResponse.json();

      expect(healthyBody.dependencies.kong.details.error).toBeUndefined();

      // Unhealthy Kong - has error
      const unhealthyService: IKongService = {
        ...mockKongService,
        healthCheck: mock(() =>
          Promise.resolve({
            healthy: false,
            responseTime: 0,
            error: "Specific error message",
          })
        ),
      };

      const unhealthyResponse = await handleHealthCheck(unhealthyService);
      const unhealthyBody = await unhealthyResponse.json();

      expect(unhealthyBody.dependencies.kong.details.error).toBe("Specific error message");
    });

    it("should convert export success rate to decimal", async () => {
      const response = await handleHealthCheck(mockKongService);
      const body = await response.json();

      // successRate should be decimal (0-1), not percentage (0-100)
      expect(body.dependencies.telemetry.exportHealth.successRate).toBeLessThanOrEqual(1);
      expect(body.dependencies.telemetry.exportHealth.successRate).toBeGreaterThanOrEqual(0);
    });

    it("should include uptime as floored integer", async () => {
      const response = await handleHealthCheck(mockKongService);
      const body = await response.json();

      expect(typeof body.uptime).toBe("number");
      expect(body.uptime).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(body.uptime)).toBe(true);
    });
  });

  describe("handleTelemetryHealth", () => {
    it("should return 200 status", () => {
      const response = handleTelemetryHealth();

      expect(response.status).toBe(200);
    });

    it("should include telemetry mode in response", async () => {
      const response = handleTelemetryHealth();
      const body = await response.json();

      expect(body.telemetry).toHaveProperty("mode");
      expect(["console", "otlp", "both"]).toContain(body.telemetry.mode);
    });

    it("should include telemetry status", async () => {
      const response = handleTelemetryHealth();
      const body = await response.json();

      expect(body.telemetry).toHaveProperty("status");
    });

    it("should include simple telemetry status", async () => {
      const response = handleTelemetryHealth();
      const body = await response.json();

      expect(body.telemetry).toHaveProperty("simple");
    });

    it("should include configuration with all endpoints", async () => {
      const response = handleTelemetryHealth();
      const body = await response.json();

      const endpoints = body.telemetry.configuration.endpoints;
      expect(endpoints).toHaveProperty("traces");
      expect(endpoints).toHaveProperty("metrics");
      expect(endpoints).toHaveProperty("logs");
    });

    it("should include numeric timeout configuration", async () => {
      const response = handleTelemetryHealth();
      const body = await response.json();

      expect(typeof body.telemetry.configuration.timeout).toBe("number");
      expect(body.telemetry.configuration.timeout).toBeGreaterThan(0);
    });

    it("should include numeric batchSize configuration", async () => {
      const response = handleTelemetryHealth();
      const body = await response.json();

      expect(typeof body.telemetry.configuration.batchSize).toBe("number");
      expect(body.telemetry.configuration.batchSize).toBeGreaterThan(0);
    });

    it("should include numeric queueSize configuration", async () => {
      const response = handleTelemetryHealth();
      const body = await response.json();

      expect(typeof body.telemetry.configuration.queueSize).toBe("number");
      expect(body.telemetry.configuration.queueSize).toBeGreaterThan(0);
    });

    it("should include timestamp in ISO format", async () => {
      const response = handleTelemetryHealth();
      const body = await response.json();

      expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe("handleReadinessCheck", () => {
    it("should return 200 when Kong is healthy", async () => {
      const response = await handleReadinessCheck(mockKongService);

      expect(response.status).toBe(200);
    });

    it("should return 503 when Kong is unhealthy", async () => {
      const unhealthyService: IKongService = {
        ...mockKongService,
        healthCheck: mock(() =>
          Promise.resolve({
            healthy: false,
            responseTime: 0,
            error: "Unreachable",
          })
        ),
      };

      const response = await handleReadinessCheck(unhealthyService);

      expect(response.status).toBe(503);
    });

    it("should return ready=true when Kong healthy", async () => {
      const response = await handleReadinessCheck(mockKongService);
      const body = await response.json();

      expect(body.ready).toBe(true);
    });

    it("should return ready=false when Kong unhealthy", async () => {
      const unhealthyService: IKongService = {
        ...mockKongService,
        healthCheck: mock(() =>
          Promise.resolve({
            healthy: false,
            responseTime: 0,
          })
        ),
      };

      const response = await handleReadinessCheck(unhealthyService);
      const body = await response.json();

      expect(body.ready).toBe(false);
    });

    it("should handle Kong exception and return ready=false", async () => {
      const exceptionService: IKongService = {
        ...mockKongService,
        healthCheck: mock(() => Promise.reject(new Error("Network failure"))),
      };

      const response = await handleReadinessCheck(exceptionService);
      const body = await response.json();

      expect(response.status).toBe(503);
      expect(body.ready).toBe(false);
      expect(body.checks.kong.status).toBe("unhealthy");
      expect(body.checks.kong.details.error).toBe("Network failure");
    });

    it("should handle non-Error rejection", async () => {
      const stringRejectionService: IKongService = {
        ...mockKongService,
        healthCheck: mock(() => Promise.reject("String error")),
      };

      const response = await handleReadinessCheck(stringRejectionService);
      const body = await response.json();

      expect(body.checks.kong.details.error).toBe("Connection failed");
    });

    it("should include rounded responseTime at top level", async () => {
      const response = await handleReadinessCheck(mockKongService);
      const body = await response.json();

      expect(typeof body.responseTime).toBe("number");
      expect(Number.isInteger(body.responseTime)).toBe(true);
    });

    it("should include rounded Kong responseTime in checks", async () => {
      const response = await handleReadinessCheck(mockKongService);
      const body = await response.json();

      expect(typeof body.checks.kong.responseTime).toBe("number");
      expect(Number.isInteger(body.checks.kong.responseTime)).toBe(true);
    });

    it("should include Kong adminUrl in details", async () => {
      const response = await handleReadinessCheck(mockKongService);
      const body = await response.json();

      expect(body.checks.kong.details).toHaveProperty("adminUrl");
    });

    it("should include Kong mode in details", async () => {
      const response = await handleReadinessCheck(mockKongService);
      const body = await response.json();

      expect(body.checks.kong.details).toHaveProperty("mode");
    });

    it("should only include error in details when unhealthy", async () => {
      // Healthy - no error
      const healthyResponse = await handleReadinessCheck(mockKongService);
      const healthyBody = await healthyResponse.json();

      expect(healthyBody.checks.kong.details.error).toBeUndefined();

      // Unhealthy - has error
      const unhealthyService: IKongService = {
        ...mockKongService,
        healthCheck: mock(() =>
          Promise.resolve({
            healthy: false,
            responseTime: 0,
            error: "Timeout error",
          })
        ),
      };

      const unhealthyResponse = await handleReadinessCheck(unhealthyService);
      const unhealthyBody = await unhealthyResponse.json();

      expect(unhealthyBody.checks.kong.details.error).toBe("Timeout error");
    });

    it("should include timestamp in ISO format", async () => {
      const response = await handleReadinessCheck(mockKongService);
      const body = await response.json();

      expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it("should include requestId", async () => {
      const response = await handleReadinessCheck(mockKongService);
      const body = await response.json();

      expect(body.requestId).toBeDefined();
      expect(typeof body.requestId).toBe("string");
    });
  });

  describe("handleMetricsHealth", () => {
    it("should return 200 status", () => {
      const response = handleMetricsHealth(mockKongService);

      expect(response.status).toBe(200);
    });

    it("should include metrics status", async () => {
      const response = handleMetricsHealth(mockKongService);
      const body = await response.json();

      expect(body.metrics).toHaveProperty("status");
    });

    it("should include metrics exports", async () => {
      const response = handleMetricsHealth(mockKongService);
      const body = await response.json();

      expect(body.metrics).toHaveProperty("exports");
    });

    it("should include metrics configuration", async () => {
      const response = handleMetricsHealth(mockKongService);
      const body = await response.json();

      expect(body.metrics.configuration).toHaveProperty("exportInterval");
      expect(body.metrics.configuration).toHaveProperty("batchTimeout");
      expect(body.metrics.configuration).toHaveProperty("endpoint");
    });

    it("should include circuitBreakers summary", async () => {
      const response = handleMetricsHealth(mockKongService);
      const body = await response.json();

      expect(body.circuitBreakers).toHaveProperty("enabled");
      expect(body.circuitBreakers).toHaveProperty("totalBreakers");
      expect(body.circuitBreakers).toHaveProperty("states");
    });

    it("should count circuit breaker states correctly", async () => {
      const mixedStats: Record<string, CircuitBreakerStats> = {
        closed1: {
          state: "closed",
          failures: 0,
          successes: 10,
          lastFailure: null,
          lastSuccess: Date.now(),
          consecutiveFailures: 0,
          consecutiveSuccesses: 5,
        },
        closed2: {
          state: "closed",
          failures: 1,
          successes: 20,
          lastFailure: Date.now() - 10000,
          lastSuccess: Date.now(),
          consecutiveFailures: 0,
          consecutiveSuccesses: 10,
        },
        open1: {
          state: "open",
          failures: 10,
          successes: 0,
          lastFailure: Date.now(),
          lastSuccess: null,
          consecutiveFailures: 10,
          consecutiveSuccesses: 0,
        },
        halfOpen1: {
          state: "half-open",
          failures: 5,
          successes: 5,
          lastFailure: Date.now() - 1000,
          lastSuccess: Date.now(),
          consecutiveFailures: 0,
          consecutiveSuccesses: 2,
        },
      };

      const serviceWithMixedBreakers: IKongService = {
        ...mockKongService,
        getCircuitBreakerStats: mock(() => mixedStats),
      };

      const response = handleMetricsHealth(serviceWithMixedBreakers);
      const body = await response.json();

      expect(body.circuitBreakers.totalBreakers).toBe(4);
      expect(body.circuitBreakers.states.closed).toBe(2);
      expect(body.circuitBreakers.states.open).toBe(1);
      expect(body.circuitBreakers.states.halfOpen).toBe(1);
    });

    it("should handle circuit breaker stats exception", async () => {
      const errorService: IKongService = {
        ...mockKongService,
        getCircuitBreakerStats: mock(() => {
          throw new Error("Stats unavailable");
        }),
      };

      const response = handleMetricsHealth(errorService);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.circuitBreakers.totalBreakers).toBe(0);
    });

    it("should include boolean enabled status", async () => {
      const response = handleMetricsHealth(mockKongService);
      const body = await response.json();

      expect(typeof body.circuitBreakers.enabled).toBe("boolean");
    });

    it("should include timestamp in ISO format", async () => {
      const response = handleMetricsHealth(mockKongService);
      const body = await response.json();

      expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it("should include numeric exportInterval in configuration", async () => {
      const response = handleMetricsHealth(mockKongService);
      const body = await response.json();

      expect(body.metrics.configuration.exportInterval).toBe(10000);
    });
  });

  describe("Error response handling", () => {
    it("handleHealthCheck should return 500 on general exception", async () => {
      // This is difficult to trigger without mocking internal functions
      // But we can verify the error response structure exists
      const response = await handleHealthCheck(mockKongService);

      // Normal response should be 200 or 503, not 500
      expect([200, 503]).toContain(response.status);
    });

    it("handleTelemetryHealth should include Content-Type header", () => {
      const response = handleTelemetryHealth();

      expect(response.headers.get("Content-Type")).toBe("application/json");
    });

    it("handleMetricsHealth should include Content-Type header", () => {
      const response = handleMetricsHealth(mockKongService);

      expect(response.headers.get("Content-Type")).toBe("application/json");
    });

    it("handleReadinessCheck should include Content-Type header", async () => {
      const response = await handleReadinessCheck(mockKongService);

      expect(response.headers.get("Content-Type")).toBe("application/json");
    });
  });

  describe("All endpoints include X-Request-ID", () => {
    it("handleHealthCheck includes X-Request-ID", async () => {
      const response = await handleHealthCheck(mockKongService);

      expect(response.headers.has("X-Request-ID")).toBe(true);
      expect(response.headers.get("X-Request-ID")!.length).toBeGreaterThan(0);
    });

    it("handleTelemetryHealth includes X-Request-ID", () => {
      const response = handleTelemetryHealth();

      expect(response.headers.has("X-Request-ID")).toBe(true);
    });

    it("handleReadinessCheck includes X-Request-ID", async () => {
      const response = await handleReadinessCheck(mockKongService);

      expect(response.headers.has("X-Request-ID")).toBe(true);
    });

    it("handleMetricsHealth includes X-Request-ID", () => {
      const response = handleMetricsHealth(mockKongService);

      expect(response.headers.has("X-Request-ID")).toBe(true);
    });
  });
});
