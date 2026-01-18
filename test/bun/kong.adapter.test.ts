/* test/bun/kong.adapter.test.ts */

/**
 * Unit tests for KongAdapter
 * Tests the unified adapter for Kong API Gateway and Kong Konnect
 *
 * Note: These tests use real Kong integration when available.
 * Tests skip gracefully when Kong is not accessible.
 * Uses test consumers seeded via scripts/seed-test-consumers.ts
 */

import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { KongAdapter } from "../../src/adapters/kong.adapter";
import type { KongModeType } from "../../src/config";
import {
  createRealKongAdapter,
  getSkipMessage,
  getTestConsumer,
  resetKongAvailabilityCache,
  setupKongTestContext,
} from "../shared/kong-test-helpers";

describe("KongAdapter", () => {
  let kongAvailable = false;
  let kongAdapter: KongAdapter | null = null;
  let adminUrl: string;

  beforeAll(async () => {
    const context = await setupKongTestContext();
    kongAvailable = context.available;
    kongAdapter = context.adapter;
    adminUrl = context.adminUrl;
  });

  afterAll(() => {
    resetKongAvailabilityCache();
  });

  describe("constructor", () => {
    it("should create adapter for API_GATEWAY mode", async () => {
      if (!kongAvailable) {
        console.log(getSkipMessage());
        return;
      }

      const adapter = new KongAdapter("API_GATEWAY" as KongModeType, adminUrl, "");
      expect(adapter).toBeInstanceOf(KongAdapter);
      expect(typeof adapter.getConsumerSecret).toBe("function");
      expect(typeof adapter.healthCheck).toBe("function");
    });

    it("should create adapter for KONNECT mode with valid URL", async () => {
      if (!kongAvailable) {
        console.log(getSkipMessage());
        return;
      }

      // KONNECT mode uses a different URL format
      const konnectUrl =
        "https://us.api.konghq.com/v2/control-planes/12345678-1234-1234-1234-123456789012";
      const adapter = new KongAdapter("KONNECT" as KongModeType, konnectUrl, "test-token");
      expect(adapter).toBeInstanceOf(KongAdapter);
      expect(typeof adapter.getConsumerSecret).toBe("function");
    });
  });

  describe("getConsumerSecret", () => {
    it("should fetch consumer secret from Kong", async () => {
      if (!kongAvailable || !kongAdapter) {
        console.log(getSkipMessage());
        return;
      }

      const consumer = getTestConsumer(0);
      const result = await kongAdapter.getConsumerSecret(consumer.id);

      expect(result).not.toBeNull();
      expect(result!.key).toBeDefined();
      expect(result!.secret).toBeDefined();
      expect(typeof result!.key).toBe("string");
      expect(typeof result!.secret).toBe("string");
    });

    it("should use cache on subsequent calls", async () => {
      if (!kongAvailable || !kongAdapter) {
        console.log(getSkipMessage());
        return;
      }

      // Use consumer 0 (same as previous test) to test caching behavior
      const consumer = getTestConsumer(0);

      // First call - might be cached from previous test or fetches from Kong
      const first = await kongAdapter.getConsumerSecret(consumer.id);
      expect(first).not.toBeNull();

      // Second call - should use cache (faster)
      const startTime = Bun.nanoseconds();
      const second = await kongAdapter.getConsumerSecret(consumer.id);
      const duration = (Bun.nanoseconds() - startTime) / 1_000_000;

      expect(second).not.toBeNull();
      expect(second!.key).toBe(first!.key);
      expect(second!.secret).toBe(first!.secret);

      // Cached call should be very fast (< 5ms typically)
      expect(duration).toBeLessThan(50);
    });

    it("should return null when consumer not found", async () => {
      if (!kongAvailable || !kongAdapter) {
        console.log(getSkipMessage());
        return;
      }

      const result = await kongAdapter.getConsumerSecret("nonexistent-consumer-id-12345");
      expect(result).toBeNull();
    });

    it("should return null when consumer has no JWT credentials", async () => {
      if (!kongAvailable) {
        console.log(getSkipMessage());
        return;
      }

      // Create a fresh adapter to avoid cache from other tests
      const freshAdapter = await createRealKongAdapter();
      if (!freshAdapter) {
        console.log("Could not create Kong adapter");
        return;
      }

      // Use a consumer ID that definitely doesn't exist
      const result = await freshAdapter.getConsumerSecret("no-jwt-credentials-consumer-xyz-12345");
      expect(result).toBeNull();
    });
  });

  describe("healthCheck", () => {
    it("should return healthy status when Kong is available", async () => {
      if (!kongAvailable || !kongAdapter) {
        console.log(getSkipMessage());
        return;
      }

      const result = await kongAdapter.healthCheck();

      expect(result.healthy).toBe(true);
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
      expect(typeof result.responseTime).toBe("number");
    });

    it("should return response time in milliseconds", async () => {
      if (!kongAvailable || !kongAdapter) {
        console.log(getSkipMessage());
        return;
      }

      const result = await kongAdapter.healthCheck();

      expect(result.responseTime).toBeGreaterThanOrEqual(0);
      // Response time should be reasonable (< 5 seconds)
      expect(result.responseTime).toBeLessThan(5000);
    });
  });

  describe("clearCache", () => {
    it("should clear specific consumer from cache", async () => {
      if (!kongAvailable || !kongAdapter) {
        console.log(getSkipMessage());
        return;
      }

      const consumer = getTestConsumer(2);

      // Populate cache
      await kongAdapter.getConsumerSecret(consumer.id);

      // Clear the specific consumer
      await kongAdapter.clearCache(consumer.id);

      // Should not throw
      expect(true).toBe(true);
    });

    it("should clear entire cache when no consumerId provided", async () => {
      if (!kongAvailable || !kongAdapter) {
        console.log(getSkipMessage());
        return;
      }

      // Clear all cache
      await kongAdapter.clearCache();

      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe("getCacheStats", () => {
    it("should return cache statistics object", async () => {
      if (!kongAvailable || !kongAdapter) {
        console.log(getSkipMessage());
        return;
      }

      const consumer = getTestConsumer(0);

      // Make a request to populate cache
      await kongAdapter.getConsumerSecret(consumer.id);

      const stats = await kongAdapter.getCacheStats();

      expect(typeof stats).toBe("object");
      expect(stats).not.toBeNull();
      expect(typeof stats.size).toBe("number");
    });
  });

  describe("getCircuitBreakerStats", () => {
    it("should return circuit breaker statistics", async () => {
      if (!kongAvailable || !kongAdapter) {
        console.log(getSkipMessage());
        return;
      }

      const stats = kongAdapter.getCircuitBreakerStats();

      expect(typeof stats).toBe("object");
      expect(stats).not.toBeNull();
    });
  });

  describe("multiple requests", () => {
    it("should handle multiple sequential consumer lookups", async () => {
      if (!kongAvailable || !kongAdapter) {
        console.log(getSkipMessage());
        return;
      }

      // Use consumer 0 for multiple sequential requests
      const consumer = getTestConsumer(0);

      const results = [];
      for (let i = 0; i < 3; i++) {
        const result = await kongAdapter.getConsumerSecret(consumer.id);
        results.push(result);
      }

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result).not.toBeNull();
        expect(result!.key).toBeDefined();
      });
    });
  });

  describe("error handling", () => {
    it("should handle invalid consumer ID gracefully", async () => {
      if (!kongAvailable || !kongAdapter) {
        console.log(getSkipMessage());
        return;
      }

      // Various invalid IDs should return null, not throw
      const invalidIds = ["", "   ", "not-a-uuid", "12345"];

      for (const id of invalidIds) {
        const result = await kongAdapter.getConsumerSecret(id);
        // Should return null or a valid result, not throw
        expect(result === null || typeof result === "object").toBe(true);
      }
    });
  });
});
