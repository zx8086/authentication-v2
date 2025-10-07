/* test/bun/kong.factory.test.ts */

import { describe, expect, it } from "bun:test";
import { KongServiceFactory } from "../../src/services/kong.factory";
import { KongApiGatewayService } from "../../src/services/kong-api-gateway.service";
import { KongKonnectService } from "../../src/services/kong-konnect.service";

describe("KongServiceFactory", () => {
  const testAdminUrl = "http://test-kong:8001";
  const testAdminToken = "test-token-123";

  describe("create", () => {
    it("should create KongApiGatewayService for API_GATEWAY mode", () => {
      const service = KongServiceFactory.create("API_GATEWAY", testAdminUrl, testAdminToken);

      expect(service).toBeInstanceOf(KongApiGatewayService);
    });

    it("should create KongKonnectService for KONNECT mode", () => {
      const service = KongServiceFactory.create("KONNECT", testAdminUrl, testAdminToken);

      expect(service).toBeInstanceOf(KongKonnectService);
    });

    it("should throw error for unsupported mode", () => {
      expect(() => {
        KongServiceFactory.create("INVALID_MODE" as any, testAdminUrl, testAdminToken);
      }).toThrow("Unsupported Kong mode: INVALID_MODE");
    });
  });
});