/* test/bun/health-handlers.test.ts */

/**
 * Tests for health check handlers.
 *
 * Uses real Kong integration when available.
 * Tests skip gracefully when Kong is not accessible.
 */

import { afterAll, beforeAll, describe, expect, it, test } from "bun:test";
import type { KongAdapter } from "../../../src/adapters/kong.adapter";
import type { IKongService } from "../../../src/config";
import {
  handleHealthCheck,
  handleMetricsHealth,
  handleReadinessCheck,
  handleTelemetryHealth,
} from "../../../src/handlers/health";
import { APIGatewayService } from "../../../src/services/api-gateway.service";
import { disableFetchPolyfill, enableFetchPolyfill } from "../../integration/setup";
import {
  getSkipMessage,
  resetKongAvailabilityCache,
  setupKongTestContext,
} from "../../shared/kong-test-helpers";

describe("Health Handlers", () => {
  let kongAvailable = false;
  let kongAdapter: KongAdapter | null = null;
  let kongService: IKongService | null = null;

  beforeAll(async () => {
    enableFetchPolyfill();
    const context = await setupKongTestContext();
    kongAvailable = context.available;
    kongAdapter = context.adapter;
    if (kongAdapter) {
      kongService = new APIGatewayService(kongAdapter);
    }
  });

  afterAll(() => {
    disableFetchPolyfill();
    resetKongAvailabilityCache();
  });

  describe("handleHealthCheck", () => {
    it("should return 200 when Kong is healthy", async () => {
      if (!kongAvailable || !kongService) {
        console.log(getSkipMessage());
        return;
      }

      const response = await handleHealthCheck(kongService);

      expect(response.status).toBe(200);
    });

    it("should include correct response body structure", async () => {
      if (!kongAvailable || !kongService) {
        console.log(getSkipMessage());
        return;
      }

      const response = await handleHealthCheck(kongService);
      const body = await response.json();

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
      if (!kongAvailable || !kongService) {
        console.log(getSkipMessage());
        return;
      }

      const response = await handleHealthCheck(kongService);
      const body = await response.json();

      expect(body.status).toBe("healthy");
    });

    it("should include Kong dependency details", async () => {
      if (!kongAvailable || !kongService) {
        console.log(getSkipMessage());
        return;
      }

      const response = await handleHealthCheck(kongService);
      const body = await response.json();

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
      if (!kongAvailable || !kongService) {
        console.log(getSkipMessage());
        return;
      }

      const response = await handleHealthCheck(kongService);
      const body = await response.json();

      expect(body.dependencies.cache).toBeDefined();
      expect(["healthy", "unhealthy", "degraded"]).toContain(body.dependencies.cache.status);
      expect(typeof body.dependencies.cache.type).toBe("string");
      expect(body.dependencies.cache.type.length).toBeGreaterThan(0);
      expect(typeof body.dependencies.cache.responseTime).toBe("number");
      expect(body.dependencies.cache.responseTime).toBeGreaterThanOrEqual(0);
      expect(body.dependencies.cache.responseTime).toBeLessThan(60000);
    });

    it("should include telemetry dependency details", async () => {
      if (!kongAvailable || !kongService) {
        console.log(getSkipMessage());
        return;
      }

      const response = await handleHealthCheck(kongService);
      const body = await response.json();

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
      if (!kongAvailable || !kongService) {
        console.log(getSkipMessage());
        return;
      }

      const response = await handleHealthCheck(kongService);
      const body = await response.json();

      const exportHealth = body.dependencies.telemetry.exportHealth;
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
      if (!kongAvailable || !kongService) {
        console.log(getSkipMessage());
        return;
      }

      const response = await handleHealthCheck(kongService);
      const body = await response.json();

      expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      const parsedDate = new Date(body.timestamp);
      expect(parsedDate.getTime()).not.toBeNaN();
      const now = Date.now();
      expect(parsedDate.getTime()).toBeLessThanOrEqual(now);
      expect(parsedDate.getTime()).toBeGreaterThan(now - 60000);
    });

    it("should include uptime as non-negative number", async () => {
      if (!kongAvailable || !kongService) {
        console.log(getSkipMessage());
        return;
      }

      const response = await handleHealthCheck(kongService);
      const body = await response.json();

      expect(typeof body.uptime).toBe("number");
      expect(body.uptime).toBeGreaterThanOrEqual(0);
    });

    it("should include requestId in response", async () => {
      if (!kongAvailable || !kongService) {
        console.log(getSkipMessage());
        return;
      }

      const response = await handleHealthCheck(kongService);
      const body = await response.json();

      expect(body.requestId).toBeDefined();
      expect(typeof body.requestId).toBe("string");
      expect(body.requestId.length).toBeGreaterThan(0);
    });

    it("should include highAvailability field in response", async () => {
      if (!kongAvailable || !kongService) {
        console.log(getSkipMessage());
        return;
      }

      const response = await handleHealthCheck(kongService);
      const body = await response.json();

      expect(typeof body.highAvailability).toBe("boolean");
    });

    test.concurrent("should handle multiple concurrent health checks", async () => {
      if (!kongAvailable || !kongService) {
        console.log(getSkipMessage());
        return;
      }

      const promises = Array.from({ length: 5 }, () => handleHealthCheck(kongService!));

      const responses = await Promise.all(promises);

      expect(responses).toHaveLength(5);
      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });
    });

    it("should set correct Content-Type header", async () => {
      if (!kongAvailable || !kongService) {
        console.log(getSkipMessage());
        return;
      }

      const response = await handleHealthCheck(kongService);

      expect(response.headers.get("Content-Type")).toBe("application/json");
    });

    it("should include X-Request-ID header", async () => {
      if (!kongAvailable || !kongService) {
        console.log(getSkipMessage());
        return;
      }

      const response = await handleHealthCheck(kongService);

      const requestId = response.headers.get("X-Request-ID");
      expect(typeof requestId).toBe("string");
      expect(requestId!.length).toBeGreaterThan(0);
      expect(requestId).toMatch(/^[a-f0-9-]{36}$/);
    });
  });

  describe("handleTelemetryHealth", () => {
    // handleTelemetryHealth doesn't depend on Kong, so these tests don't need Kong availability check
    it("should return 200 for successful telemetry health check", () => {
      const response = handleTelemetryHealth();

      expect(response.status).toBe(200);
    });

    it("should include telemetry configuration in response", async () => {
      const response = handleTelemetryHealth();
      const body = await response.json();

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
      expect(typeof endpoints.traces).toBe("string");
      expect(typeof endpoints.metrics).toBe("string");
      expect(typeof endpoints.logs).toBe("string");
      expect(endpoints.traces).not.toBeNull();
      expect(endpoints.metrics).not.toBeNull();
      expect(endpoints.logs).not.toBeNull();
    });

    it("should include valid timestamp", async () => {
      const response = handleTelemetryHealth();
      const body = await response.json();

      expect(typeof body.timestamp).toBe("string");
      expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      const parsedDate = new Date(body.timestamp);
      expect(parsedDate.getTime()).not.toBeNaN();
    });

    it("should return valid JSON response", async () => {
      const response = handleTelemetryHealth();

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
      if (!kongAvailable || !kongService) {
        console.log(getSkipMessage());
        return;
      }

      const response = await handleReadinessCheck(kongService);

      expect(response.status).toBe(200);
    });

    it("should include ready field in response body", async () => {
      if (!kongAvailable || !kongService) {
        console.log(getSkipMessage());
        return;
      }

      const response = await handleReadinessCheck(kongService);
      const body = await response.json();

      expect(typeof body.ready).toBe("boolean");
      expect(body.ready).toBe(true);
    });

    it("should return ready=true when Kong is healthy", async () => {
      if (!kongAvailable || !kongService) {
        console.log(getSkipMessage());
        return;
      }

      const response = await handleReadinessCheck(kongService);
      const body = await response.json();

      expect(body.ready).toBe(true);
    });

    it("should include checks field with Kong status", async () => {
      if (!kongAvailable || !kongService) {
        console.log(getSkipMessage());
        return;
      }

      const response = await handleReadinessCheck(kongService);
      const body = await response.json();

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
      if (!kongAvailable || !kongService) {
        console.log(getSkipMessage());
        return;
      }

      const response = await handleReadinessCheck(kongService);
      const body = await response.json();

      expect(typeof body.checks.kong.details.adminUrl).toBe("string");
      expect(body.checks.kong.details.adminUrl.length).toBeGreaterThan(0);
      expect(typeof body.checks.kong.details.mode).toBe("string");
      expect(["API_GATEWAY", "KONNECT"]).toContain(body.checks.kong.details.mode);
    });

    it("should include responseTime at top level", async () => {
      if (!kongAvailable || !kongService) {
        console.log(getSkipMessage());
        return;
      }

      const response = await handleReadinessCheck(kongService);
      const body = await response.json();

      expect(typeof body.responseTime).toBe("number");
      expect(body.responseTime).toBeGreaterThanOrEqual(0);
      expect(body.responseTime).toBeLessThan(60000);
    });

    it("should include requestId in response", async () => {
      if (!kongAvailable || !kongService) {
        console.log(getSkipMessage());
        return;
      }

      const response = await handleReadinessCheck(kongService);
      const body = await response.json();

      expect(typeof body.requestId).toBe("string");
      expect(body.requestId.length).toBeGreaterThan(0);
      expect(body.requestId).toMatch(/^[a-f0-9-]{36}$/);
    });

    it("should include valid timestamp", async () => {
      if (!kongAvailable || !kongService) {
        console.log(getSkipMessage());
        return;
      }

      const response = await handleReadinessCheck(kongService);
      const body = await response.json();

      expect(typeof body.timestamp).toBe("string");
      expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      const parsedDate = new Date(body.timestamp);
      expect(parsedDate.getTime()).not.toBeNaN();
    });

    it("should set correct Content-Type header", async () => {
      if (!kongAvailable || !kongService) {
        console.log(getSkipMessage());
        return;
      }

      const response = await handleReadinessCheck(kongService);

      expect(response.headers.get("Content-Type")).toBe("application/json");
    });

    test.concurrent("should handle multiple concurrent readiness checks", async () => {
      if (!kongAvailable || !kongService) {
        console.log(getSkipMessage());
        return;
      }

      const promises = Array.from({ length: 5 }, () => handleReadinessCheck(kongService!));

      const responses = await Promise.all(promises);

      expect(responses).toHaveLength(5);
      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });
    });
  });

  describe("handleMetricsHealth", () => {
    it("should return 200 for successful metrics health check", async () => {
      if (!kongAvailable || !kongService) {
        console.log(getSkipMessage());
        return;
      }

      const response = handleMetricsHealth(kongService);

      expect(response.status).toBe(200);
    });

    it("should include metrics status in response", async () => {
      if (!kongAvailable || !kongService) {
        console.log(getSkipMessage());
        return;
      }

      const response = handleMetricsHealth(kongService);
      const body = await response.json();

      expect(body).toHaveProperty("metrics");
      expect(body.metrics).toHaveProperty("status");
      expect(body.metrics).toHaveProperty("exports");
      expect(body.metrics).toHaveProperty("configuration");
    });

    it("should include metrics configuration details", async () => {
      if (!kongAvailable || !kongService) {
        console.log(getSkipMessage());
        return;
      }

      const response = handleMetricsHealth(kongService);
      const body = await response.json();

      const config = body.metrics.configuration;
      expect(config).toHaveProperty("exportInterval");
      expect(config).toHaveProperty("batchTimeout");
      expect(config).toHaveProperty("endpoint");
    });

    it("should include circuit breaker summary", async () => {
      if (!kongAvailable || !kongService) {
        console.log(getSkipMessage());
        return;
      }

      const response = handleMetricsHealth(kongService);
      const body = await response.json();

      expect(body).toHaveProperty("circuitBreakers");
      expect(body.circuitBreakers).toHaveProperty("enabled");
      expect(body.circuitBreakers).toHaveProperty("totalBreakers");
      expect(body.circuitBreakers).toHaveProperty("states");
    });

    it("should include circuit breaker state counts", async () => {
      if (!kongAvailable || !kongService) {
        console.log(getSkipMessage());
        return;
      }

      const response = handleMetricsHealth(kongService);
      const body = await response.json();

      const states = body.circuitBreakers.states;
      expect(states).toHaveProperty("closed");
      expect(states).toHaveProperty("open");
      expect(states).toHaveProperty("halfOpen");
      expect(typeof states.closed).toBe("number");
      expect(typeof states.open).toBe("number");
      expect(typeof states.halfOpen).toBe("number");
    });

    it("should include valid timestamp", async () => {
      if (!kongAvailable || !kongService) {
        console.log(getSkipMessage());
        return;
      }

      const response = handleMetricsHealth(kongService);
      const body = await response.json();

      expect(body).toHaveProperty("timestamp");
      expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it("should set correct Content-Type header", async () => {
      if (!kongAvailable || !kongService) {
        console.log(getSkipMessage());
        return;
      }

      const response = handleMetricsHealth(kongService);

      expect(response.headers.get("Content-Type")).toBe("application/json");
    });

    it("should include export statistics", async () => {
      if (!kongAvailable || !kongService) {
        console.log(getSkipMessage());
        return;
      }

      const response = handleMetricsHealth(kongService);
      const body = await response.json();

      expect(body.metrics.exports).toBeDefined();
      expect(typeof body.metrics.exports).toBe("object");
    });

    it("should include enabled status for circuit breakers", async () => {
      if (!kongAvailable || !kongService) {
        console.log(getSkipMessage());
        return;
      }

      const response = handleMetricsHealth(kongService);
      const body = await response.json();

      expect(typeof body.circuitBreakers.enabled).toBe("boolean");
    });
  });

  describe("Response headers", () => {
    it("should include X-Request-ID in handleHealthCheck response", async () => {
      if (!kongAvailable || !kongService) {
        console.log(getSkipMessage());
        return;
      }

      const response = await handleHealthCheck(kongService);
      expect(response.headers.has("X-Request-ID")).toBe(true);
    });

    it("should include X-Request-ID in handleTelemetryHealth response", () => {
      const response = handleTelemetryHealth();
      expect(response.headers.has("X-Request-ID")).toBe(true);
    });

    it("should include X-Request-ID in handleReadinessCheck response", async () => {
      if (!kongAvailable || !kongService) {
        console.log(getSkipMessage());
        return;
      }

      const response = await handleReadinessCheck(kongService);
      expect(response.headers.has("X-Request-ID")).toBe(true);
    });

    it("should include X-Request-ID in handleMetricsHealth response", async () => {
      if (!kongAvailable || !kongService) {
        console.log(getSkipMessage());
        return;
      }

      const response = handleMetricsHealth(kongService);
      expect(response.headers.has("X-Request-ID")).toBe(true);
    });
  });

  describe("Performance", () => {
    test.concurrent("should complete health check within reasonable time", async () => {
      if (!kongAvailable || !kongService) {
        console.log(getSkipMessage());
        return;
      }

      const startTime = Bun.nanoseconds();
      await handleHealthCheck(kongService);
      const duration = (Bun.nanoseconds() - startTime) / 1_000_000;

      // Should complete within 500ms for real Kong (including network latency)
      expect(duration).toBeLessThan(500);
      expect(duration).toBeGreaterThanOrEqual(0);
    });

    test.concurrent("should complete readiness check within reasonable time", async () => {
      if (!kongAvailable || !kongService) {
        console.log(getSkipMessage());
        return;
      }

      const startTime = Bun.nanoseconds();
      await handleReadinessCheck(kongService);
      const duration = (Bun.nanoseconds() - startTime) / 1_000_000;

      expect(duration).toBeLessThan(500);
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

    it("should complete metrics health check within reasonable time", async () => {
      if (!kongAvailable || !kongService) {
        console.log(getSkipMessage());
        return;
      }

      const startTime = Bun.nanoseconds();
      handleMetricsHealth(kongService);
      const duration = (Bun.nanoseconds() - startTime) / 1_000_000;

      expect(duration).toBeLessThan(50);
      expect(duration).toBeGreaterThanOrEqual(0);
    });
  });
});
