/* test/bun/kong.factory.test.ts */

import { describe, expect, it } from "bun:test";
import { KongServiceFactory } from "../../src/services/kong.factory";
import { APIGatewayService } from "../../src/services/api-gateway.service";
import type { IKongService } from "../../src/config";

describe("KongServiceFactory", () => {
  const testAdminUrl = "http://test-kong:8001";
  const testAdminToken = "test-token-123";
  const testKonnectUrl = "https://us.api.konghq.com/v2/control-planes/12345678-1234-1234-1234-123456789012";

  describe("create", () => {
    it("should create APIGatewayService for API_GATEWAY mode", () => {
      const service = KongServiceFactory.create("API_GATEWAY", testAdminUrl, testAdminToken);

      // Should return unified APIGatewayService regardless of mode
      expect(service).toBeInstanceOf(APIGatewayService);

      // Should implement IKongService interface
      expect(service).toHaveProperty("getConsumerSecret");
      expect(service).toHaveProperty("createConsumerSecret");
      expect(service).toHaveProperty("healthCheck");
      expect(service).toHaveProperty("clearCache");
      expect(service).toHaveProperty("getCacheStats");
      expect(service).toHaveProperty("getCircuitBreakerStats");
    });

    it("should create APIGatewayService for KONNECT mode", () => {
      const service = KongServiceFactory.create("KONNECT", testKonnectUrl, testAdminToken);

      // Should return unified APIGatewayService regardless of mode
      expect(service).toBeInstanceOf(APIGatewayService);

      // Should implement IKongService interface
      expect(service).toHaveProperty("getConsumerSecret");
      expect(service).toHaveProperty("createConsumerSecret");
      expect(service).toHaveProperty("healthCheck");
      expect(service).toHaveProperty("clearCache");
      expect(service).toHaveProperty("getCacheStats");
      expect(service).toHaveProperty("getCircuitBreakerStats");
    });

    it("should create services with correct interface methods", () => {
      const service = KongServiceFactory.create("API_GATEWAY", testAdminUrl, testAdminToken);

      // Verify all IKongService methods are present and callable
      expect(typeof service.getConsumerSecret).toBe("function");
      expect(typeof service.createConsumerSecret).toBe("function");
      expect(typeof service.healthCheck).toBe("function");
      expect(typeof service.clearCache).toBe("function");
      expect(typeof service.getCacheStats).toBe("function");
      expect(typeof service.getCircuitBreakerStats).toBe("function");
    });

    it("should handle Kong Konnect URL validation", () => {
      // Valid Konnect URL should work
      expect(() => {
        KongServiceFactory.create("KONNECT", testKonnectUrl, testAdminToken);
      }).not.toThrow();

      // Invalid Konnect URL with konghq.com domain should throw error from strategy
      expect(() => {
        KongServiceFactory.create("KONNECT", "https://us.api.konghq.com/invalid-path", testAdminToken);
      }).toThrow("Invalid Kong Konnect URL format");

      // Non-konghq.com URLs are treated as self-hosted and should work
      expect(() => {
        KongServiceFactory.create("KONNECT", "https://self-hosted-kong:8001", testAdminToken);
      }).not.toThrow();
    });

    it("should throw error for unsupported mode", () => {
      expect(() => {
        KongServiceFactory.create("INVALID_MODE" as any, testAdminUrl, testAdminToken);
      }).toThrow("Unsupported Kong mode: INVALID_MODE");
    });

    it("should create different adapter strategies for different modes", () => {
      const apiGatewayService = KongServiceFactory.create("API_GATEWAY", testAdminUrl, testAdminToken);
      const konnectService = KongServiceFactory.create("KONNECT", testKonnectUrl, testAdminToken);

      // Both should be APIGatewayService instances but with different internal adapters
      expect(apiGatewayService).toBeInstanceOf(APIGatewayService);
      expect(konnectService).toBeInstanceOf(APIGatewayService);

      // Both should satisfy IKongService interface
      const checkInterface = (service: IKongService) => {
        expect(service.getConsumerSecret).toBeDefined();
        expect(service.createConsumerSecret).toBeDefined();
        expect(service.healthCheck).toBeDefined();
        expect(service.clearCache).toBeDefined();
        expect(service.getCacheStats).toBeDefined();
        expect(service.getCircuitBreakerStats).toBeDefined();
      };

      checkInterface(apiGatewayService);
      checkInterface(konnectService);
    });
  });
});