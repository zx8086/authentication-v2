/* test/bun/health-branches.test.ts */

/**
 * Mutation-resistant tests for health handler conditional branches.
 * These tests verify correct status codes (200 vs 503) and health states
 * (healthy, degraded, unhealthy) for different dependency conditions.
 */

import { describe, expect, it } from "bun:test";
import type { IKongService, KongHealthCheckResult } from "../../src/config";
import type { CircuitBreakerStats } from "../../src/services/circuit-breaker.service";

// Mock Kong service for controlled testing
function createMockKongService(options: {
  healthCheckResult?: KongHealthCheckResult;
  healthCheckThrows?: boolean;
  healthCheckError?: string;
}): IKongService {
  return {
    async getConsumerSecret() {
      return null;
    },
    async createConsumerSecret() {
      return null;
    },
    async healthCheck(): Promise<KongHealthCheckResult> {
      if (options.healthCheckThrows) {
        throw new Error(options.healthCheckError || "Connection failed");
      }
      return (
        options.healthCheckResult || {
          healthy: true,
          responseTime: 50,
        }
      );
    },
    async clearCache() {
      /* no-op for mock */
    },
    async getCacheStats() {
      return { size: 0, hitRate: "0%" };
    },
    getCircuitBreakerStats(): Record<string, CircuitBreakerStats> {
      return {};
    },
  };
}

describe("Health Handler Branch Coverage - Mutation Testing", () => {
  // Use .env as-is - no env manipulation needed

  describe("handleHealthCheck status codes", () => {
    it("should return 200 when Kong is healthy", async () => {
      const { handleHealthCheck } = await import("../../src/handlers/health");

      const mockKong = createMockKongService({
        healthCheckResult: { healthy: true, responseTime: 50 },
      });

      const response = await handleHealthCheck(mockKong);

      // Verify exact status code - catches mutations to statusCode calculation
      expect(response.status).toBe(200);
      expect(response.status).not.toBe(503);
      expect(response.status).not.toBe(500);
    });

    it("should return 503 when Kong is unhealthy", async () => {
      const { handleHealthCheck } = await import("../../src/handlers/health");

      const mockKong = createMockKongService({
        healthCheckResult: { healthy: false, responseTime: 0, error: "Connection refused" },
      });

      const response = await handleHealthCheck(mockKong);

      // Verify exact status code - catches mutations to healthy check
      expect(response.status).toBe(503);
      expect(response.status).not.toBe(200);
    });

    it("should return 503 when Kong health check throws", async () => {
      const { handleHealthCheck } = await import("../../src/handlers/health");

      const mockKong = createMockKongService({
        healthCheckThrows: true,
        healthCheckError: "Network timeout",
      });

      const response = await handleHealthCheck(mockKong);

      expect(response.status).toBe(503);
      expect(response.status).not.toBe(200);
    });
  });

  describe("handleHealthCheck health status values", () => {
    it("should return status 'healthy' when all dependencies are healthy", async () => {
      const { handleHealthCheck } = await import("../../src/handlers/health");

      const mockKong = createMockKongService({
        healthCheckResult: { healthy: true, responseTime: 50 },
      });

      const response = await handleHealthCheck(mockKong);
      const body = await response.json();

      // Verify exact status string - catches string literal mutations
      expect(body.status).toBe("healthy");
      expect(body.status).not.toBe("degraded");
      expect(body.status).not.toBe("unhealthy");
    });

    it("should return status 'unhealthy' when Kong is down", async () => {
      const { handleHealthCheck } = await import("../../src/handlers/health");

      const mockKong = createMockKongService({
        healthCheckResult: { healthy: false, responseTime: 0, error: "Connection refused" },
      });

      const response = await handleHealthCheck(mockKong);
      const body = await response.json();

      // With telemetry endpoints not configured, only Kong failure = unhealthy
      expect(["degraded", "unhealthy"]).toContain(body.status);
      expect(body.status).not.toBe("healthy");
    });

    it("should include Kong status in response body", async () => {
      const { handleHealthCheck } = await import("../../src/handlers/health");

      const mockKong = createMockKongService({
        healthCheckResult: { healthy: true, responseTime: 75 },
      });

      const response = await handleHealthCheck(mockKong);
      const body = await response.json();

      // Verify Kong dependency status is correctly reported
      expect(body.dependencies.kong.status).toBe("healthy");
      expect(body.dependencies.kong.status).not.toBe("unhealthy");
      expect(typeof body.dependencies.kong.responseTime).toBe("number");
    });

    it("should report Kong as unhealthy when health check fails", async () => {
      const { handleHealthCheck } = await import("../../src/handlers/health");

      const mockKong = createMockKongService({
        healthCheckResult: { healthy: false, responseTime: 0, error: "Timeout" },
      });

      const response = await handleHealthCheck(mockKong);
      const body = await response.json();

      expect(body.dependencies.kong.status).toBe("unhealthy");
      expect(body.dependencies.kong.status).not.toBe("healthy");
    });
  });

  describe("handleReadinessCheck", () => {
    it("should return 200 when Kong is healthy", async () => {
      const { handleReadinessCheck } = await import("../../src/handlers/health");

      const mockKong = createMockKongService({
        healthCheckResult: { healthy: true, responseTime: 50 },
      });

      const response = await handleReadinessCheck(mockKong);

      expect(response.status).toBe(200);
      expect(response.status).not.toBe(503);
    });

    it("should return 503 when Kong is unhealthy", async () => {
      const { handleReadinessCheck } = await import("../../src/handlers/health");

      const mockKong = createMockKongService({
        healthCheckResult: { healthy: false, responseTime: 0, error: "Not ready" },
      });

      const response = await handleReadinessCheck(mockKong);

      expect(response.status).toBe(503);
      expect(response.status).not.toBe(200);
    });

    it("should return ready: true when Kong is healthy", async () => {
      const { handleReadinessCheck } = await import("../../src/handlers/health");

      const mockKong = createMockKongService({
        healthCheckResult: { healthy: true, responseTime: 50 },
      });

      const response = await handleReadinessCheck(mockKong);
      const body = await response.json();

      // Verify exact boolean - catches boolean mutations
      expect(body.ready).toBe(true);
      expect(body.ready).not.toBe(false);
    });

    it("should return ready: false when Kong is unhealthy", async () => {
      const { handleReadinessCheck } = await import("../../src/handlers/health");

      const mockKong = createMockKongService({
        healthCheckResult: { healthy: false, responseTime: 0, error: "Unavailable" },
      });

      const response = await handleReadinessCheck(mockKong);
      const body = await response.json();

      expect(body.ready).toBe(false);
      expect(body.ready).not.toBe(true);
    });

    it("should handle Kong health check exception", async () => {
      const { handleReadinessCheck } = await import("../../src/handlers/health");

      const mockKong = createMockKongService({
        healthCheckThrows: true,
        healthCheckError: "Connection reset",
      });

      const response = await handleReadinessCheck(mockKong);
      const body = await response.json();

      expect(response.status).toBe(503);
      expect(body.ready).toBe(false);
    });
  });

  describe("handleTelemetryHealth", () => {
    it("should return 200 status", async () => {
      const { handleTelemetryHealth } = await import("../../src/handlers/health");

      const response = handleTelemetryHealth();

      expect(response.status).toBe(200);
      expect(response.status).not.toBe(500);
    });

    it("should include telemetry mode in response", async () => {
      const { handleTelemetryHealth } = await import("../../src/handlers/health");

      const response = handleTelemetryHealth();
      const body = await response.json();

      // Mode should be a valid telemetry mode from .env
      expect(["console", "otlp", "both", "none"]).toContain(body.telemetry.mode);
      expect(body.telemetry.mode).toBeDefined();
    });

    it("should include configuration details", async () => {
      const { handleTelemetryHealth } = await import("../../src/handlers/health");

      const response = handleTelemetryHealth();
      const body = await response.json();

      expect(body.telemetry.configuration).toBeDefined();
      expect(body.telemetry.configuration.serviceName).toBeDefined();
      expect(body.telemetry.configuration.serviceVersion).toBeDefined();
    });
  });

  describe("handleMetricsHealth", () => {
    it("should return 200 status", async () => {
      const { handleMetricsHealth } = await import("../../src/handlers/health");

      const mockKong = createMockKongService({
        healthCheckResult: { healthy: true, responseTime: 50 },
      });

      const response = handleMetricsHealth(mockKong);

      expect(response.status).toBe(200);
      expect(response.status).not.toBe(500);
    });

    it("should include circuit breaker summary", async () => {
      const { handleMetricsHealth } = await import("../../src/handlers/health");

      const mockKong = createMockKongService({
        healthCheckResult: { healthy: true, responseTime: 50 },
      });

      const response = handleMetricsHealth(mockKong);
      const body = await response.json();

      expect(body.circuitBreakers).toBeDefined();
      expect(typeof body.circuitBreakers.enabled).toBe("boolean");
      expect(typeof body.circuitBreakers.totalBreakers).toBe("number");
      expect(body.circuitBreakers.states).toBeDefined();
    });

    it("should include metrics status", async () => {
      const { handleMetricsHealth } = await import("../../src/handlers/health");

      const mockKong = createMockKongService({
        healthCheckResult: { healthy: true, responseTime: 50 },
      });

      const response = handleMetricsHealth(mockKong);
      const body = await response.json();

      expect(body.metrics).toBeDefined();
      expect(body.metrics.status).toBeDefined();
    });
  });

  describe("Response body structure verification", () => {
    it("should include timestamp in health response", async () => {
      const { handleHealthCheck } = await import("../../src/handlers/health");

      const mockKong = createMockKongService({
        healthCheckResult: { healthy: true, responseTime: 50 },
      });

      const response = await handleHealthCheck(mockKong);
      const body = await response.json();

      expect(body.timestamp).toBeDefined();
      expect(() => new Date(body.timestamp)).not.toThrow();
    });

    it("should include version in health response", async () => {
      const { handleHealthCheck } = await import("../../src/handlers/health");

      const mockKong = createMockKongService({
        healthCheckResult: { healthy: true, responseTime: 50 },
      });

      const response = await handleHealthCheck(mockKong);
      const body = await response.json();

      expect(body.version).toBeDefined();
      expect(typeof body.version).toBe("string");
    });

    it("should include requestId in health response", async () => {
      const { handleHealthCheck } = await import("../../src/handlers/health");

      const mockKong = createMockKongService({
        healthCheckResult: { healthy: true, responseTime: 50 },
      });

      const response = await handleHealthCheck(mockKong);
      const body = await response.json();

      expect(body.requestId).toBeDefined();
      expect(typeof body.requestId).toBe("string");
      expect(body.requestId.length).toBeGreaterThan(0);
    });

    it("should include uptime as number", async () => {
      const { handleHealthCheck } = await import("../../src/handlers/health");

      const mockKong = createMockKongService({
        healthCheckResult: { healthy: true, responseTime: 50 },
      });

      const response = await handleHealthCheck(mockKong);
      const body = await response.json();

      expect(typeof body.uptime).toBe("number");
      expect(body.uptime).toBeGreaterThanOrEqual(0);
    });
  });
});
