/* test/bun/health-telemetry-branches.test.ts */

/**
 * Tests for health handler telemetry branches and HA mode behavior.
 * These tests cover code paths that require specific configurations:
 * - High Availability mode stale cache checks
 * - Telemetry endpoint health checks
 * - Cache health error paths
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import type { IKongService, KongHealthCheckResult } from "../../../src/config";
import type { CircuitBreakerStats } from "../../../src/services/circuit-breaker.service";

// Mock Kong service
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

describe("Health Handler Telemetry Branches", () => {
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
    Bun.env.KONG_ADMIN_URL = "http://kong:8001";
    Bun.env.KONG_ADMIN_TOKEN = "test-token-123456789012345678901234567890";
    Bun.env.TELEMETRY_MODE = "console";
    Bun.env.CACHE_HIGH_AVAILABILITY = "false";

    const { resetConfigCache } = await import("../../../src/config/config");
    resetConfigCache();

    const { CacheFactory } = await import("../../../src/services/cache/cache-factory");
    CacheFactory.reset();
  });

  afterEach(async () => {
    Object.keys(Bun.env).forEach((key) => {
      if (!(key in originalEnv)) {
        delete Bun.env[key];
      }
    });
    Object.assign(Bun.env, originalEnv);

    const { resetConfigCache } = await import("../../../src/config/config");
    resetConfigCache();

    const { CacheFactory } = await import("../../../src/services/cache/cache-factory");
    CacheFactory.reset();
  });

  describe("handleHealthCheck with telemetry configuration", () => {
    it("should include telemetry status in health response", async () => {
      const { handleHealthCheck } = await import("../../../src/handlers/health");
      const mockKong = createMockKongService({
        healthCheckResult: { healthy: true, responseTime: 50 },
      });

      const response = await handleHealthCheck(mockKong);
      const body = await response.json();

      expect(body.dependencies).toBeDefined();
      expect(body.dependencies.telemetry).toBeDefined();
    });

    it("should check telemetry dependencies when configured", async () => {
      const { handleHealthCheck } = await import("../../../src/handlers/health");
      const mockKong = createMockKongService({
        healthCheckResult: { healthy: true, responseTime: 50 },
      });

      const response = await handleHealthCheck(mockKong);
      const body = await response.json();

      // Telemetry may have different structure based on configuration
      expect(body.dependencies.telemetry).toBeDefined();
    });
  });

  describe("handleHealthCheck with cache status", () => {
    it("should include cache status in response", async () => {
      const { handleHealthCheck } = await import("../../../src/handlers/health");
      const mockKong = createMockKongService({
        healthCheckResult: { healthy: true, responseTime: 50 },
      });

      const response = await handleHealthCheck(mockKong);
      const body = await response.json();

      expect(body.dependencies.cache).toBeDefined();
      expect(body.dependencies.cache.status).toBeDefined();
    });

    it("should show stale cache as available in non-HA mode", async () => {
      Bun.env.CACHE_HIGH_AVAILABILITY = "false";
      const { resetConfigCache } = await import("../../../src/config/config");
      resetConfigCache();

      const { handleHealthCheck } = await import("../../../src/handlers/health");
      const mockKong = createMockKongService({
        healthCheckResult: { healthy: true, responseTime: 50 },
      });

      const response = await handleHealthCheck(mockKong);
      const body = await response.json();

      // In non-HA mode, stale cache should be available via in-memory circuit breaker
      if (body.dependencies.cache.staleCache) {
        expect(body.dependencies.cache.staleCache.available).toBe(true);
      }
    });
  });

  describe("handleTelemetryHealth endpoint", () => {
    it("should return telemetry configuration", async () => {
      const { handleTelemetryHealth } = await import("../../../src/handlers/health");

      const response = handleTelemetryHealth();
      const body = await response.json();

      expect(body.telemetry).toBeDefined();
      expect(body.telemetry.mode).toBeDefined();
    });

    it("should include configuration details", async () => {
      const { handleTelemetryHealth } = await import("../../../src/handlers/health");

      const response = handleTelemetryHealth();
      const body = await response.json();

      expect(body.telemetry.configuration).toBeDefined();
      expect(body.telemetry.configuration.serviceName).toBeDefined();
    });

    it("should indicate OTLP endpoint status", async () => {
      const { handleTelemetryHealth } = await import("../../../src/handlers/health");

      const response = handleTelemetryHealth();
      const body = await response.json();

      // Should have endpoints field
      if (body.telemetry.endpoints) {
        expect(typeof body.telemetry.endpoints).toBe("object");
      }
    });
  });

  describe("handleMetricsHealth endpoint", () => {
    it("should return metrics status", async () => {
      const { handleMetricsHealth } = await import("../../../src/handlers/health");
      const mockKong = createMockKongService({
        healthCheckResult: { healthy: true, responseTime: 50 },
      });

      const response = handleMetricsHealth(mockKong);
      const body = await response.json();

      expect(body.metrics).toBeDefined();
      expect(body.metrics.status).toBeDefined();
    });

    it("should include circuit breaker summary", async () => {
      const { handleMetricsHealth } = await import("../../../src/handlers/health");
      const mockKong = createMockKongService({
        healthCheckResult: { healthy: true, responseTime: 50 },
      });

      const response = handleMetricsHealth(mockKong);
      const body = await response.json();

      expect(body.circuitBreakers).toBeDefined();
      expect(typeof body.circuitBreakers.enabled).toBe("boolean");
      expect(typeof body.circuitBreakers.totalBreakers).toBe("number");
    });

    it("should include circuit breaker states breakdown", async () => {
      const { handleMetricsHealth } = await import("../../../src/handlers/health");
      const mockKong = createMockKongService({
        healthCheckResult: { healthy: true, responseTime: 50 },
      });

      const response = handleMetricsHealth(mockKong);
      const body = await response.json();

      expect(body.circuitBreakers.states).toBeDefined();
      expect(typeof body.circuitBreakers.states.closed).toBe("number");
      expect(typeof body.circuitBreakers.states.open).toBe("number");
      expect(typeof body.circuitBreakers.states.halfOpen).toBe("number");
    });
  });

  describe("handleReadinessCheck with cache", () => {
    it("should check cache readiness", async () => {
      const { handleReadinessCheck } = await import("../../../src/handlers/health");
      const mockKong = createMockKongService({
        healthCheckResult: { healthy: true, responseTime: 50 },
      });

      const response = await handleReadinessCheck(mockKong);
      const body = await response.json();

      expect(body.ready).toBeDefined();
      expect(typeof body.ready).toBe("boolean");
    });

    it("should include checks in readiness response", async () => {
      const { handleReadinessCheck } = await import("../../../src/handlers/health");
      const mockKong = createMockKongService({
        healthCheckResult: { healthy: true, responseTime: 50 },
      });

      const response = await handleReadinessCheck(mockKong);
      const body = await response.json();

      expect(body.checks).toBeDefined();
      expect(body.checks.kong).toBeDefined();
    });
  });

  describe("handleReadinessCheck response structure", () => {
    it("should include checks in response", async () => {
      const { handleReadinessCheck } = await import("../../../src/handlers/health");
      const mockKong = createMockKongService({
        healthCheckResult: { healthy: true, responseTime: 50 },
      });

      const response = await handleReadinessCheck(mockKong);
      const body = await response.json();

      expect(body.checks).toBeDefined();
      expect(body.checks.kong).toBeDefined();
    });

    it("should include timestamp in readiness response", async () => {
      const { handleReadinessCheck } = await import("../../../src/handlers/health");
      const mockKong = createMockKongService({
        healthCheckResult: { healthy: true, responseTime: 50 },
      });

      const response = await handleReadinessCheck(mockKong);
      const body = await response.json();

      expect(body.timestamp).toBeDefined();
      expect(() => new Date(body.timestamp)).not.toThrow();
    });
  });

  describe("Edge cases", () => {
    it("should handle Kong being completely unavailable", async () => {
      const { handleHealthCheck } = await import("../../../src/handlers/health");
      const mockKong = createMockKongService({
        healthCheckThrows: true,
        healthCheckError: "ECONNREFUSED",
      });

      const response = await handleHealthCheck(mockKong);

      expect(response.status).toBe(503);
    });

    it("should handle Kong timeout", async () => {
      const { handleHealthCheck } = await import("../../../src/handlers/health");
      const mockKong = createMockKongService({
        healthCheckThrows: true,
        healthCheckError: "Request timeout",
      });

      const response = await handleHealthCheck(mockKong);
      const body = await response.json();

      expect(response.status).toBe(503);
      expect(body.dependencies.kong.status).toBe("unhealthy");
    });

    it("should handle missing telemetry endpoints gracefully", async () => {
      // In console mode, OTLP endpoints are not required
      Bun.env.TELEMETRY_MODE = "console";
      const { resetConfigCache } = await import("../../../src/config/config");
      resetConfigCache();

      const { handleHealthCheck } = await import("../../../src/handlers/health");
      const mockKong = createMockKongService({
        healthCheckResult: { healthy: true, responseTime: 50 },
      });

      const response = await handleHealthCheck(mockKong);

      // Should return 200 when Kong is healthy
      expect(response.status).toBe(200);
    });
  });

  describe("Response headers", () => {
    it("should include Content-Type header", async () => {
      const { handleHealthCheck } = await import("../../../src/handlers/health");
      const mockKong = createMockKongService({
        healthCheckResult: { healthy: true, responseTime: 50 },
      });

      const response = await handleHealthCheck(mockKong);

      expect(response.headers.get("Content-Type")).toBe("application/json");
    });

    it("should include Cache-Control header", async () => {
      const { handleHealthCheck } = await import("../../../src/handlers/health");
      const mockKong = createMockKongService({
        healthCheckResult: { healthy: true, responseTime: 50 },
      });

      const response = await handleHealthCheck(mockKong);

      expect(response.headers.get("Cache-Control")).toBe("no-cache");
    });
  });
});
