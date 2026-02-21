// test/bun/health/health-fetch-spy.test.ts

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

describe("Health Handler Fetch Behavior - Real HTTP", () => {
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

  describe("Health endpoint with real Kong", () => {
    it("should successfully check health with live Kong", async () => {
      if (!kongAvailable || !kongService) {
        console.log(getSkipMessage());
        return;
      }

      const { handleHealthCheck } = await import("../../../src/handlers/health");
      const response = await handleHealthCheck(kongService);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.status).toBe("healthy");
      expect(body.dependencies.kong).toBeDefined();
    });

    it("should handle telemetry configuration", async () => {
      if (!kongAvailable || !kongService) {
        console.log(getSkipMessage());
        return;
      }

      const { handleHealthCheck } = await import("../../../src/handlers/health");
      const response = await handleHealthCheck(kongService);
      const body = await response.json();

      expect(body.dependencies.telemetry).toBeDefined();
    });

    it("should include cache status", async () => {
      if (!kongAvailable || !kongService) {
        console.log(getSkipMessage());
        return;
      }

      const { handleHealthCheck } = await import("../../../src/handlers/health");
      const response = await handleHealthCheck(kongService);
      const body = await response.json();

      expect(body.dependencies.cache).toBeDefined();
      // Status is in healthMonitor for distributed cache, null for memory cache
      if (body.dependencies.cache.healthMonitor) {
        expect(body.dependencies.cache.healthMonitor.status).toBeDefined();
      }
    });
  });

  describe("Readiness endpoint with real Kong", () => {
    it("should check readiness successfully", async () => {
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

    it("should include kong check in readiness", async () => {
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

  describe("Telemetry health endpoint", () => {
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
  });

  describe("Metrics health endpoint", () => {
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
  });

  // NOTE: Kong unavailable scenario testing has been moved to test/chaos/kong-failure.test.ts
  // which provides comprehensive chaos engineering coverage for this scenario.
  // The test was removed from here because it relies on module-level state that cannot
  // be properly isolated in the Bun test runner when running as part of the full suite.
});
