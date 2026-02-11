/* test/bun/kong-mode-strategies.test.ts */

/**
 * Integration tests for Kong mode strategies with live Kong
 */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import type { KongAdapter } from "../../../src/adapters/kong.adapter";
import {
  createKongModeStrategy,
  KongApiGatewayStrategy,
  KongKonnectStrategy,
} from "../../../src/adapters/kong-mode-strategies";
import type { IKongService } from "../../../src/config";
import { APIGatewayService } from "../../../src/services/api-gateway.service";
import {
  getSkipMessage,
  resetKongAvailabilityCache,
  setupKongTestContext,
} from "../../shared/kong-test-helpers";
import { TEST_API_KEY_GATEWAY, TEST_KONG_ADMIN_TOKEN } from "../../shared/test-constants";

describe("KongApiGatewayStrategy - Live Integration", () => {
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

  describe("Basic URL handling", () => {
    it("should strip trailing slash from baseUrl", () => {
      const strategy = new KongApiGatewayStrategy("http://kong:8001/", TEST_API_KEY_GATEWAY);
      expect(strategy.baseUrl).toBe("http://kong:8001");
    });

    it("should preserve baseUrl without trailing slash", () => {
      const strategy = new KongApiGatewayStrategy("http://kong:8001", TEST_API_KEY_GATEWAY);
      expect(strategy.baseUrl).toBe("http://kong:8001");
    });
  });

  describe("Health check with live Kong", () => {
    it("should perform health check via strategy", async () => {
      if (!kongAvailable || !kongService) {
        console.log(getSkipMessage());
        return;
      }

      const result = await kongService.healthCheck();

      expect(result).toBeDefined();
      expect(typeof result.healthy).toBe("boolean");
      expect(typeof result.responseTime).toBe("number");
    });
  });

  describe("Consumer operations with live Kong", () => {
    it("should query consumer via strategy", async () => {
      if (!kongAvailable || !kongService) {
        console.log(getSkipMessage());
        return;
      }

      const result = await kongService.getConsumerSecret("test-consumer-001");

      // May be null if consumer doesn't exist
      if (result) {
        expect(result.key).toBeDefined();
      }
    });
  });
});

describe("createKongModeStrategy factory - Live Integration", () => {
  const originalEnv = { ...Bun.env };

  beforeEach(async () => {
    Object.keys(Bun.env).forEach((key) => {
      if (!["PATH", "HOME", "USER", "SHELL", "TERM"].includes(key)) {
        delete Bun.env[key];
      }
    });
    Bun.env.NODE_ENV = "test";

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

  it("should create API Gateway strategy when mode is API_GATEWAY", () => {
    const strategy = createKongModeStrategy("API_GATEWAY", "http://kong:8001", "test-token");

    expect(strategy).toBeInstanceOf(KongApiGatewayStrategy);
  });

  it("should create Konnect strategy when mode is KONNECT", () => {
    Bun.env.KONG_KONNECT_CONTROL_PLANE_ID = "test-cp-id";

    const strategy = createKongModeStrategy("KONNECT", "http://konnect.api", "test-token");

    expect(strategy).toBeInstanceOf(KongKonnectStrategy);
  });
});
