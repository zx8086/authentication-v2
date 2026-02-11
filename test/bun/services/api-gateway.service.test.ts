/* test/bun/api-gateway.service.test.ts */

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

describe("APIGatewayService - Live Kong Integration", () => {
  const originalEnv = { ...Bun.env };
  let kongAvailable = false;
  let kongAdapter: KongAdapter | null = null;
  let service: IKongService | null = null;

  beforeAll(async () => {
    const context = await setupKongTestContext();
    kongAvailable = context.available;
    kongAdapter = context.adapter;
    if (kongAdapter) {
      service = new APIGatewayService(kongAdapter);
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

    const { resetConfigCache } = await import("../../../src/config/config");
    resetConfigCache();
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
  });

  describe("getConsumerSecret with live Kong", () => {
    it("should handle getConsumerSecret request", async () => {
      if (!kongAvailable || !service) {
        console.log(getSkipMessage());
        return;
      }

      const result = await service.getConsumerSecret("test-consumer-001");

      // Result may be null if consumer doesn't exist, or have credentials if it does
      if (result) {
        expect(result.key).toBeDefined();
        expect(result.secret).toBeDefined();
      } else {
        expect(result).toBeNull();
      }
    });

    it("should return null for non-existent consumer", async () => {
      if (!kongAvailable || !service) {
        console.log(getSkipMessage());
        return;
      }

      const result = await service.getConsumerSecret("non-existent-consumer-xyz");

      expect(result).toBeNull();
    });
  });

  describe("healthCheck with live Kong", () => {
    it("should perform health check on live Kong", async () => {
      if (!kongAvailable || !service) {
        console.log(getSkipMessage());
        return;
      }

      const result = await service.healthCheck();

      expect(result).toBeDefined();
      expect(result.healthy).toBeDefined();
      expect(typeof result.healthy).toBe("boolean");
      expect(typeof result.responseTime).toBe("number");
    });

    it("should report healthy when Kong is available", async () => {
      if (!kongAvailable || !service) {
        console.log(getSkipMessage());
        return;
      }

      const result = await service.healthCheck();

      expect(result.healthy).toBe(true);
      expect(result.responseTime).toBeGreaterThan(0);
    });
  });

  describe("getCacheStats with live Kong", () => {
    it("should retrieve cache statistics", async () => {
      if (!kongAvailable || !service) {
        console.log(getSkipMessage());
        return;
      }

      const stats = await service.getCacheStats();

      expect(stats).toBeDefined();
      // Stats structure varies based on implementation
      expect(stats).toBeTypeOf("object");
    });
  });

  describe("getCircuitBreakerStats with live Kong", () => {
    it("should retrieve circuit breaker statistics", async () => {
      if (!kongAvailable || !service) {
        console.log(getSkipMessage());
        return;
      }

      const stats = await service.getCircuitBreakerStats();

      expect(stats).toBeDefined();
      expect(typeof stats).toBe("object");
    });
  });

  describe("clearCache with live Kong", () => {
    it("should clear cache successfully", async () => {
      if (!kongAvailable || !service) {
        console.log(getSkipMessage());
        return;
      }

      // Should not throw
      await expect(service.clearCache()).resolves.toBeUndefined();
    });
  });
});
