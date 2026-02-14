// test/bun/health/health-telemetry-branches.test.ts

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import type { KongAdapter } from "../../../src/adapters/kong.adapter";
import type { IKongService } from "../../../src/config";
import { APIGatewayService } from "../../../src/services/api-gateway.service";
import {
  getSkipMessage,
  resetKongAvailabilityCache,
  setupKongTestContext,
} from "../../shared/kong-test-helpers";
import { TEST_KONG_ADMIN_TOKEN } from "../../shared/test-constants";

describe("Health Handler Telemetry Branches", () => {
  const originalEnv = { ...Bun.env };
  let kongAvailable = false;
  let kongAdapter: KongAdapter | null = null;
  let kongService: IKongService | null = null;

  beforeAll(async () => {
    const context = await setupKongTestContext();
    kongAvailable = context.available;
    kongAdapter = context.adapter;
    if (kongAdapter) {
      kongService = new APIGatewayService(kongAdapter);
    }
  });

  afterAll(() => {
    resetKongAvailabilityCache();
  });

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
      if (!kongAvailable || !kongService) {
        console.log(getSkipMessage());
        return;
      }

      const { handleHealthCheck } = await import("../../../src/handlers/health");
      const response = await handleHealthCheck(kongService);
      const body = await response.json();

      expect(body.dependencies).toBeDefined();
      expect(body.dependencies.telemetry).toBeDefined();
    });

    it("should check telemetry dependencies when configured", async () => {
      if (!kongAvailable || !kongService) {
        console.log(getSkipMessage());
        return;
      }

      const { handleHealthCheck } = await import("../../../src/handlers/health");
      const response = await handleHealthCheck(kongService);
      const body = await response.json();

      // Telemetry may have different structure based on configuration
      expect(body.dependencies.telemetry).toBeDefined();
    });
  });

  describe("handleHealthCheck with cache status", () => {
    it("should include cache status in response", async () => {
      if (!kongAvailable || !kongService) {
        console.log(getSkipMessage());
        return;
      }

      const { handleHealthCheck } = await import("../../../src/handlers/health");
      const response = await handleHealthCheck(kongService);
      const body = await response.json();

      expect(body.dependencies.cache).toBeDefined();
      expect(body.dependencies.cache.status).toBeDefined();
    });

    it("should show stale cache as available in non-HA mode", async () => {
      if (!kongAvailable || !kongService) {
        console.log(getSkipMessage());
        return;
      }

      Bun.env.CACHE_HIGH_AVAILABILITY = "false";
      const { resetConfigCache } = await import("../../../src/config/config");
      resetConfigCache();

      const { handleHealthCheck } = await import("../../../src/handlers/health");
      const response = await handleHealthCheck(kongService);
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
      if (!kongAvailable || !kongService) {
        console.log(getSkipMessage());
        return;
      }

      const { handleMetricsHealth } = await import("../../../src/handlers/health");
      const response = handleMetricsHealth(kongService);
      const body = await response.json();

      expect(body.metrics).toBeDefined();
      expect(body.metrics.status).toBeDefined();
    });

    it("should include circuit breaker summary", async () => {
      if (!kongAvailable || !kongService) {
        console.log(getSkipMessage());
        return;
      }

      const { handleMetricsHealth } = await import("../../../src/handlers/health");
      const response = handleMetricsHealth(kongService);
      const body = await response.json();

      expect(body.circuitBreakers).toBeDefined();
      expect(typeof body.circuitBreakers.enabled).toBe("boolean");
      expect(typeof body.circuitBreakers.totalBreakers).toBe("number");
    });

    it("should include circuit breaker states breakdown", async () => {
      if (!kongAvailable || !kongService) {
        console.log(getSkipMessage());
        return;
      }

      const { handleMetricsHealth } = await import("../../../src/handlers/health");
      const response = handleMetricsHealth(kongService);
      const body = await response.json();

      expect(body.circuitBreakers.states).toBeDefined();
      expect(typeof body.circuitBreakers.states.closed).toBe("number");
      expect(typeof body.circuitBreakers.states.open).toBe("number");
      expect(typeof body.circuitBreakers.states.halfOpen).toBe("number");
    });
  });

  describe("handleReadinessCheck with cache", () => {
    it("should check cache readiness", async () => {
      if (!kongAvailable || !kongService) {
        console.log(getSkipMessage());
        return;
      }

      const { handleReadinessCheck } = await import("../../../src/handlers/health");
      const response = await handleReadinessCheck(kongService);
      const body = await response.json();

      expect(body.ready).toBeDefined();
      expect(typeof body.ready).toBe("boolean");
    });

    it("should include checks in readiness response", async () => {
      if (!kongAvailable || !kongService) {
        console.log(getSkipMessage());
        return;
      }

      const { handleReadinessCheck } = await import("../../../src/handlers/health");
      const response = await handleReadinessCheck(kongService);
      const body = await response.json();

      expect(body.checks).toBeDefined();
      expect(body.checks.kong).toBeDefined();
    });
  });

  describe("handleReadinessCheck response structure", () => {
    it("should include checks in response", async () => {
      if (!kongAvailable || !kongService) {
        console.log(getSkipMessage());
        return;
      }

      const { handleReadinessCheck } = await import("../../../src/handlers/health");
      const response = await handleReadinessCheck(kongService);
      const body = await response.json();

      expect(body.checks).toBeDefined();
      expect(body.checks.kong).toBeDefined();
    });

    it("should include timestamp in readiness response", async () => {
      if (!kongAvailable || !kongService) {
        console.log(getSkipMessage());
        return;
      }

      const { handleReadinessCheck } = await import("../../../src/handlers/health");
      const response = await handleReadinessCheck(kongService);
      const body = await response.json();

      expect(body.timestamp).toBeDefined();
      expect(() => new Date(body.timestamp)).not.toThrow();
    });
  });

  describe("Edge cases", () => {
    it("should handle Kong being completely unavailable", async () => {
      // Test with invalid Kong URL to simulate unavailable Kong
      Bun.env.KONG_ADMIN_URL = "http://192.168.254.254:9999"; // Non-routable IP
      const { resetConfigCache } = await import("../../../src/config/config");
      resetConfigCache();

      // Create a new context with invalid URL
      const invalidContext = await setupKongTestContext();
      const invalidKongService = invalidContext.adapter
        ? new APIGatewayService(invalidContext.adapter)
        : null;

      if (!invalidKongService) {
        console.log("Skipping: Cannot create Kong service for unavailable test");
        return;
      }

      const { handleHealthCheck } = await import("../../../src/handlers/health");
      const response = await handleHealthCheck(invalidKongService);

      expect(response.status).toBe(503);
    });

    it("should handle missing telemetry endpoints gracefully", async () => {
      if (!kongAvailable || !kongService) {
        console.log(getSkipMessage());
        return;
      }

      // In console mode, OTLP endpoints are not required
      Bun.env.TELEMETRY_MODE = "console";
      Bun.env.KONG_ADMIN_URL = originalEnv.KONG_ADMIN_URL || "http://192.168.178.3:30001";
      const { resetConfigCache } = await import("../../../src/config/config");
      resetConfigCache();

      const { handleHealthCheck } = await import("../../../src/handlers/health");
      const response = await handleHealthCheck(kongService);

      // Should return 200 when Kong is healthy
      expect(response.status).toBe(200);
    });
  });

  describe("Response headers", () => {
    it("should include Content-Type header", async () => {
      if (!kongAvailable || !kongService) {
        console.log(getSkipMessage());
        return;
      }

      const { handleHealthCheck } = await import("../../../src/handlers/health");
      const response = await handleHealthCheck(kongService);

      expect(response.headers.get("Content-Type")).toBe("application/json");
    });

    it("should include Cache-Control header", async () => {
      if (!kongAvailable || !kongService) {
        console.log(getSkipMessage());
        return;
      }

      const { handleHealthCheck } = await import("../../../src/handlers/health");
      const response = await handleHealthCheck(kongService);

      expect(response.headers.get("Cache-Control")).toBe("no-cache");
    });
  });
});
