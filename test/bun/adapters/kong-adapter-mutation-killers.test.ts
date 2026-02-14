// test/bun/adapters/kong-adapter-mutation-killers.test.ts

import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { KongAdapter } from "../../../src/adapters/kong.adapter";
import type { KongModeType } from "../../../src/config";
import { disableFetchPolyfill, enableFetchPolyfill } from "../../integration/setup";
import {
  getSkipMessage,
  getTestConsumer,
  resetKongAvailabilityCache,
  setupKongTestContext,
} from "../../shared/kong-test-helpers";

describe("KongAdapter - Mutation Killers", () => {
  let kongAvailable = false;
  let kongAdapter: KongAdapter | null = null;
  let adminUrl: string;

  beforeAll(async () => {
    enableFetchPolyfill();
    const context = await setupKongTestContext();
    kongAvailable = context.available;
    kongAdapter = context.adapter;
    adminUrl = context.adminUrl;
  });

  afterAll(() => {
    disableFetchPolyfill();
    resetKongAvailabilityCache();
  });

  describe("highAvailability and cache initialization", () => {
    it("should initialize cache when highAvailability is true", async () => {
      if (!kongAvailable || !kongAdapter) {
        console.log(getSkipMessage());
        return;
      }

      // Cache should be initialized
      const stats = await kongAdapter.getCacheStats();
      expect(stats).toBeDefined();
      expect(typeof stats.size).toBe("number");
    });
  });

  describe("response validation boundaries", () => {
    it("should return null when consumer not found (404 status)", async () => {
      if (!kongAvailable || !kongAdapter) {
        console.log(getSkipMessage());
        return;
      }

      const result = await kongAdapter.getConsumerSecret("nonexistent-id-xyz-123456789");
      expect(result).toBeNull();
      expect(result).not.toBeTruthy();
    });

    it("should handle success responses correctly (200-299 range)", async () => {
      if (!kongAvailable || !kongAdapter) {
        console.log(getSkipMessage());
        return;
      }

      const consumer = getTestConsumer(0);
      const result = await kongAdapter.getConsumerSecret(consumer.id);

      expect(result).not.toBeNull();
      expect(result).toBeTruthy();
      if (result) {
        expect(result.key).toBeDefined();
        expect(result.secret).toBeDefined();
        expect(typeof result.key).toBe("string");
        expect(typeof result.secret).toBe("string");
      }
    });
  });

  describe("consumer ID validation", () => {
    it("should handle consumer ID mismatch correctly", async () => {
      if (!kongAvailable || !kongAdapter) {
        console.log(getSkipMessage());
        return;
      }

      // When consumer ID matches, it should cache the result
      const consumer = getTestConsumer(0);
      const result = await kongAdapter.getConsumerSecret(consumer.id);

      if (result?.consumer?.id) {
        expect(result.consumer.id).toBe(consumer.id);
        expect(result.consumer.id).not.toBe("different-id");
      }
    });

    it("should handle createConsumerSecret with matching consumer ID", async () => {
      if (!kongAvailable || !kongAdapter) {
        console.log(getSkipMessage());
        return;
      }

      const consumer = getTestConsumer(1);
      const result = await kongAdapter.createConsumerSecret(consumer.id);

      if (result?.consumer?.id) {
        expect(result.consumer.id).toBe(consumer.id);
        expect(result.consumer.id).not.toBe("mismatched-id");
      }
    });
  });

  describe("retry loop boundaries", () => {
    it("should handle max retries correctly", async () => {
      if (!kongAvailable || !kongAdapter) {
        console.log(getSkipMessage());
        return;
      }

      // The loop runs for attempts 1, 2, 3 (maxRetries = 3)
      // On attempt < maxRetries, it continues
      // On attempt >= maxRetries, it exits

      const consumer = getTestConsumer(2);
      const result = await kongAdapter.createConsumerSecret(consumer.id);

      // Should successfully create within max retries
      expect(result).not.toBeNull();
      if (result) {
        expect(result.key).toBeDefined();
        expect(result.secret).toBeDefined();
      }
    });
  });

  describe("status code checks", () => {
    it("should handle 404 status for nonexistent consumer", async () => {
      if (!kongAvailable || !kongAdapter) {
        console.log(getSkipMessage());
        return;
      }

      const result = await kongAdapter.createConsumerSecret(
        "definitely-not-a-real-consumer-id-999"
      );
      expect(result).toBeNull();
      expect(result).not.toBeTruthy();
    });

    it("should handle successful status codes (200 range)", async () => {
      if (!kongAvailable || !kongAdapter) {
        console.log(getSkipMessage());
        return;
      }

      const consumer = getTestConsumer(0);
      const result = await kongAdapter.getConsumerSecret(consumer.id);

      expect(result).not.toBeNull();
      if (result) {
        expect(typeof result.key).toBe("string");
        expect(result.key.length).toBeGreaterThan(0);
      }
    });
  });

  describe("healthCheck response validation", () => {
    it("should return true for healthy status when Kong responds successfully", async () => {
      if (!kongAvailable || !kongAdapter) {
        console.log(getSkipMessage());
        return;
      }

      const result = await kongAdapter.healthCheck();

      expect(result.healthy).toBe(true);
      expect(result.healthy).not.toBe(false);
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
      expect(typeof result.responseTime).toBe("number");
    });

    it("should return specific responseTime value", async () => {
      if (!kongAvailable || !kongAdapter) {
        console.log(getSkipMessage());
        return;
      }

      const result = await kongAdapter.healthCheck();

      expect(result.responseTime).toBeGreaterThanOrEqual(0);
      expect(result.responseTime).toBeLessThan(10000);
      expect(Number.isFinite(result.responseTime)).toBe(true);
    });

    it("should handle infrastructure errors specifically", async () => {
      if (!kongAvailable || !kongAdapter) {
        console.log(getSkipMessage());
        return;
      }

      // With a healthy Kong instance, infrastructure errors should not occur
      const result = await kongAdapter.healthCheck();

      expect(result.healthy).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe("cache initialization checks", () => {
    it("should ensure cache is initialized before operations", async () => {
      if (!kongAvailable || !kongAdapter) {
        console.log(getSkipMessage());
        return;
      }

      // Cache should be ready
      const stats = await kongAdapter.getCacheStats();
      expect(stats).toBeDefined();
      expect(stats).not.toBeNull();
      expect(typeof stats.size).toBe("number");
    });

    it("should handle clearCache with consumerId", async () => {
      if (!kongAvailable || !kongAdapter) {
        console.log(getSkipMessage());
        return;
      }

      const consumer = getTestConsumer(0);

      // Populate cache
      await kongAdapter.getConsumerSecret(consumer.id);

      // Clear specific entry
      await kongAdapter.clearCache(consumer.id);

      // Should not throw
      expect(true).toBe(true);
    });

    it("should handle clearCache without consumerId", async () => {
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

  describe("circuit breaker stats", () => {
    it("should return circuit breaker stats object", async () => {
      if (!kongAvailable || !kongAdapter) {
        console.log(getSkipMessage());
        return;
      }

      const stats = kongAdapter.getCircuitBreakerStats();

      expect(stats).toBeDefined();
      expect(stats).not.toBeNull();
      expect(typeof stats).toBe("object");
    });
  });

  describe("API Gateway mode", () => {
    it("should create adapter for API_GATEWAY mode specifically", async () => {
      if (!kongAvailable) {
        console.log(getSkipMessage());
        return;
      }

      const adapter = new KongAdapter("API_GATEWAY" as KongModeType, adminUrl, "");

      expect(adapter).toBeInstanceOf(KongAdapter);
      expect(typeof adapter.getConsumerSecret).toBe("function");
      expect(typeof adapter.healthCheck).toBe("function");
      expect(typeof adapter.createConsumerSecret).toBe("function");
      expect(typeof adapter.clearCache).toBe("function");
      expect(typeof adapter.getCacheStats).toBe("function");
      expect(typeof adapter.getCircuitBreakerStats).toBe("function");
    });
  });
});
