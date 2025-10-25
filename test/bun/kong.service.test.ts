/* test/bun/kong.service.test.ts */

// Tests for Kong service integration using real Kong endpoints (mode-agnostic)
import { afterEach, beforeEach, describe, expect, it, test } from "bun:test";
import type { IKongService } from "../../src/config";
import { loadConfig } from "../../src/config";
import { KongServiceFactory } from "../../src/services/kong.service";
import { SharedCircuitBreakerService } from "../../src/services/shared-circuit-breaker.service";
import { getTestConsumer } from "../shared/test-consumers";

describe("Kong Service Factory Integration", () => {
  const testConsumer = getTestConsumer(0);
  const testConsumerId = testConsumer.id;

  describe.concurrent("Kong Service (Mode-Agnostic)", () => {
    let kongService: IKongService;
    let config: ReturnType<typeof loadConfig>;

    beforeEach(() => {
      // Reset circuit breaker state to prevent test pollution
      SharedCircuitBreakerService.resetInstance();

      // Load actual configuration from environment
      config = loadConfig();
      kongService = KongServiceFactory.create(
        config.kong.mode,
        config.kong.adminUrl,
        config.kong.adminToken
      );
    });

    afterEach(async () => {
      // Clear Redis cache between tests to prevent pollution
      if (kongService?.clearCache) {
        await kongService.clearCache();
      }
    });

    describe.concurrent("constructor", () => {
      it("should initialize Kong service with correct configuration", () => {
        expect(kongService).toBeDefined();
        expect(typeof kongService.getConsumerSecret).toBe("function");
        expect(typeof kongService.createConsumerSecret).toBe("function");
        expect(typeof kongService.healthCheck).toBe("function");
      });

      it("should handle URL with trailing slash", () => {
        const serviceWithSlash = KongServiceFactory.create(
          config.kong.mode,
          config.kong.adminUrl + "/",
          config.kong.adminToken
        );
        expect(serviceWithSlash).toBeDefined();
      });
    });

    describe.concurrent("getConsumerSecret", () => {
      test.concurrent("should return consumer secret when found", async () => {
        // Test with real Kong service - consumer should exist with JWT credentials
        const result = await kongService.getConsumerSecret(testConsumerId);

        // Should return the actual JWT credentials from Kong (mode-agnostic)
        expect(result).toBeDefined();
        expect(result).toHaveProperty("id");
        expect(result).toHaveProperty("key");
        expect(result).toHaveProperty("secret");
        expect(result).toHaveProperty("consumer");
        expect(result.consumer).toHaveProperty("id");
      });

      test.concurrent("should return null when consumer not found", async () => {
        // Test with non-existent consumer
        const nonExistentConsumerId = "non-existent-consumer-999";
        const result = await kongService.getConsumerSecret(nonExistentConsumerId);

        expect(result).toBeNull();
      });
    });

    describe.concurrent("createConsumerSecret", () => {
      test.concurrent("should create a new consumer secret when consumer exists", async () => {
        // This will create a new JWT credential for the existing consumer
        const result = await kongService.createConsumerSecret(testConsumerId);

        // Should return the newly created JWT credentials from Kong (mode-agnostic)
        expect(result).toBeDefined();
        expect(result).toHaveProperty("id");
        expect(result).toHaveProperty("key");
        expect(result).toHaveProperty("secret");
        expect(result).toHaveProperty("consumer");
        expect(result.consumer).toHaveProperty("id");
      });

      test.concurrent("should return null when consumer not found", async () => {
        // Test with non-existent consumer
        const nonExistentConsumerId = "non-existent-consumer-999";
        const result = await kongService.createConsumerSecret(nonExistentConsumerId);

        expect(result).toBeNull();
      });
    });

    describe.concurrent("healthCheck", () => {
      test.concurrent("should return healthy status when Kong is accessible", async () => {
        const result = await kongService.healthCheck();

        expect(result).toHaveProperty("healthy");
        expect(result).toHaveProperty("responseTime");
        expect(typeof result.healthy).toBe("boolean");
        expect(typeof result.responseTime).toBe("number");
        expect(result.responseTime).toBeGreaterThan(0);

        // With real Kong service running, it should be healthy
        expect(result.healthy).toBe(true);
      });
    });
  });

  // Note: Tests automatically work with both API_GATEWAY and KONNECT modes
  // based on the KONG_MODE environment variable configuration
});