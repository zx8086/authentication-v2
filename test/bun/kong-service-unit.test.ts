/* test/bun/kong-service-unit.test.ts */

// Unit tests for Kong service using mocks (no external dependencies)

import { beforeEach, describe, expect, it, test } from "bun:test";
import type { IKongService } from "../../src/config";
import { MockKongService, TestEnvironment } from "../shared/mock-services";
import { getTestConsumer } from "../shared/test-consumers";

describe("Kong Service Unit Tests", () => {
  const testConsumer = getTestConsumer(0);
  const testConsumerId = testConsumer.id;

  describe("Mock Kong Service", () => {
    let kongService: IKongService;

    beforeEach(() => {
      kongService = TestEnvironment.createMockKongService();
    });

    describe("constructor", () => {
      it("should initialize Kong service with correct interface", () => {
        expect(kongService).toBeDefined();
        expect(typeof kongService.getConsumerSecret).toBe("function");
        expect(typeof kongService.createConsumerSecret).toBe("function");
        expect(typeof kongService.healthCheck).toBe("function");
      });

      it("should handle healthy and unhealthy states", () => {
        const healthyService = TestEnvironment.createMockKongService(true);
        const unhealthyService = TestEnvironment.createMockKongService(false);

        expect(healthyService).toBeDefined();
        expect(unhealthyService).toBeDefined();
      });
    });

    describe("getConsumerSecret", () => {
      test.concurrent("should return consumer secret when found", async () => {
        const result = await kongService.getConsumerSecret(testConsumerId);

        expect(result).toBeDefined();
        expect(result).toHaveProperty("id");
        expect(result).toHaveProperty("key");
        expect(result).toHaveProperty("secret");
        expect(result).toHaveProperty("consumer");
        expect(result.consumer).toHaveProperty("id");
        expect(result.consumer.id).toBe(testConsumerId);
      });

      test.concurrent("should return null when consumer not found", async () => {
        const nonExistentConsumerId = "non-existent-consumer-999";
        const result = await kongService.getConsumerSecret(nonExistentConsumerId);

        expect(result).toBeNull();
      });

      test.concurrent("should handle multiple concurrent requests", async () => {
        const testConsumers = [
          getTestConsumer(0),
          getTestConsumer(1),
          getTestConsumer(2),
        ];

        const promises = testConsumers.map(consumer =>
          kongService.getConsumerSecret(consumer.id)
        );

        const results = await Promise.all(promises);

        expect(results).toHaveLength(3);
        results.forEach((result, index) => {
          expect(result).toBeDefined();
          expect(result.consumer.id).toBe(testConsumers[index].id);
        });
      });

      test.concurrent("should simulate realistic response times", async () => {
        const start = Bun.nanoseconds();
        await kongService.getConsumerSecret(testConsumerId);
        const duration = (Bun.nanoseconds() - start) / 1_000_000;

        // Mock service should simulate realistic network delay (0-10ms)
        expect(duration).toBeGreaterThanOrEqual(0);
        expect(duration).toBeLessThan(50);
      });
    });

    describe("createConsumerSecret", () => {
      test.concurrent("should create a new consumer secret when consumer exists", async () => {
        const result = await kongService.createConsumerSecret(testConsumerId);

        expect(result).toBeDefined();
        expect(result).toHaveProperty("id");
        expect(result).toHaveProperty("key");
        expect(result).toHaveProperty("secret");
        expect(result).toHaveProperty("consumer");
        expect(result.consumer).toHaveProperty("id");
        expect(result.consumer.id).toBe(testConsumerId);

        // New secret should be different from original
        const originalSecret = await kongService.getConsumerSecret(testConsumerId);
        expect(result.id).not.toBe(originalSecret.id);
        expect(result.key).not.toBe(originalSecret.key);
      });

      test.concurrent("should return null when consumer not found", async () => {
        const nonExistentConsumerId = "non-existent-consumer-999";
        const result = await kongService.createConsumerSecret(nonExistentConsumerId);

        expect(result).toBeNull();
      });

      test.concurrent("should update existing consumer secret", async () => {
        // Get original secret
        const original = await kongService.getConsumerSecret(testConsumerId);
        expect(original).toBeDefined();

        // Create new secret
        const newSecret = await kongService.createConsumerSecret(testConsumerId);
        expect(newSecret).toBeDefined();

        // Verify the secret was updated
        const updated = await kongService.getConsumerSecret(testConsumerId);
        expect(updated.id).toBe(newSecret.id);
        expect(updated.key).toBe(newSecret.key);
        expect(updated.id).not.toBe(original.id);
      });

      test.concurrent("should simulate realistic creation times", async () => {
        const start = Bun.nanoseconds();
        await kongService.createConsumerSecret(testConsumerId);
        const duration = (Bun.nanoseconds() - start) / 1_000_000;

        // Mock service should simulate realistic network delay for creation (0-20ms)
        expect(duration).toBeGreaterThanOrEqual(0);
        expect(duration).toBeLessThan(100);
      });
    });

    describe("healthCheck", () => {
      test.concurrent("should return healthy status when Kong is accessible", async () => {
        const result = await kongService.healthCheck();

        expect(result).toHaveProperty("healthy");
        expect(result).toHaveProperty("responseTime");
        expect(typeof result.healthy).toBe("boolean");
        expect(typeof result.responseTime).toBe("number");
        expect(result.responseTime).toBeGreaterThan(0);

        // With mock service, it should be healthy by default
        expect(result.healthy).toBe(true);
      });

      test.concurrent("should return unhealthy status when configured", async () => {
        const unhealthyService = TestEnvironment.createMockKongService(false);
        const result = await unhealthyService.healthCheck();

        expect(result.healthy).toBe(false);
        expect(result.responseTime).toBeGreaterThan(0);
      });

      test.concurrent("should simulate realistic health check times", async () => {
        const start = Bun.nanoseconds();
        await kongService.healthCheck();
        const duration = (Bun.nanoseconds() - start) / 1_000_000;

        // Health checks should be fast (0-5ms simulation + 0-50ms mock response time)
        expect(duration).toBeLessThan(100);
      });

      test.concurrent("should handle multiple concurrent health checks", async () => {
        const promises = Array.from({ length: 10 }, () => kongService.healthCheck());
        const results = await Promise.all(promises);

        expect(results).toHaveLength(10);
        results.forEach(result => {
          expect(result.healthy).toBe(true);
          expect(result.responseTime).toBeGreaterThan(0);
        });
      });
    });

    describe("clearCache", () => {
      test.concurrent("should handle clearCache if available", async () => {
        if (kongService.clearCache) {
          await expect(kongService.clearCache()).resolves.toBeUndefined();
        }
      });
    });
  });

  describe("Mock Service Control", () => {
    it("should allow dynamic health status changes", async () => {
      const mockService = TestEnvironment.createMockKongService(true) as MockKongService;

      // Initially healthy
      let health = await mockService.healthCheck();
      expect(health.healthy).toBe(true);

      // Change to unhealthy
      mockService.setHealthyStatus(false);
      health = await mockService.healthCheck();
      expect(health.healthy).toBe(false);

      // Change back to healthy
      mockService.setHealthyStatus(true);
      health = await mockService.healthCheck();
      expect(health.healthy).toBe(true);
    });

    it("should allow adding custom mock secrets", async () => {
      const mockService = TestEnvironment.createMockKongService() as MockKongService;
      const customConsumerId = "custom-test-consumer";
      const customSecret = {
        id: "custom-jwt-credential",
        key: "custom-key",
        secret: "custom-secret",
        consumer: { id: customConsumerId }
      };

      // Add custom secret
      mockService.addMockSecret(customConsumerId, customSecret);

      // Retrieve it
      const retrieved = await mockService.getConsumerSecret(customConsumerId);
      expect(retrieved).toEqual(customSecret);
    });

    it("should allow removing mock secrets", async () => {
      const mockService = TestEnvironment.createMockKongService() as MockKongService;
      const consumerId = testConsumer.id;

      // Verify secret exists
      let secret = await mockService.getConsumerSecret(consumerId);
      expect(secret).toBeDefined();

      // Remove it
      mockService.removeMockSecret(consumerId);

      // Verify it's gone
      secret = await mockService.getConsumerSecret(consumerId);
      expect(secret).toBeNull();
    });

    it("should allow clearing all mock secrets", async () => {
      const mockService = TestEnvironment.createMockKongService() as MockKongService;

      // Verify secrets exist
      let secret1 = await mockService.getConsumerSecret(getTestConsumer(0).id);
      let secret2 = await mockService.getConsumerSecret(getTestConsumer(1).id);
      expect(secret1).toBeDefined();
      expect(secret2).toBeDefined();

      // Clear all
      mockService.clearMockSecrets();

      // Verify default secrets are restored
      secret1 = await mockService.getConsumerSecret(getTestConsumer(0).id);
      secret2 = await mockService.getConsumerSecret(getTestConsumer(1).id);
      expect(secret1).toBeDefined();
      expect(secret2).toBeDefined();
    });
  });

  describe("Performance Testing", () => {
    it("should handle high-volume operations efficiently", async () => {
      const mockService = TestEnvironment.createMockKongService();
      const numOperations = 100;

      const start = Bun.nanoseconds();

      // Mix of different operations
      const promises: Promise<any>[] = [];
      for (let i = 0; i < numOperations; i++) {
        const consumer = getTestConsumer(i % 5); // Cycle through test consumers

        if (i % 3 === 0) {
          promises.push(mockService.getConsumerSecret(consumer.id));
        } else if (i % 3 === 1) {
          promises.push(mockService.createConsumerSecret(consumer.id));
        } else {
          promises.push(mockService.healthCheck());
        }
      }

      const results = await Promise.all(promises);
      const duration = (Bun.nanoseconds() - start) / 1_000_000;

      expect(results).toHaveLength(numOperations);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second

      // Verify mix of results
      const secretResults = results.filter(r => r && (r.key || r.healthy !== undefined));
      expect(secretResults.length).toBeGreaterThan(0);
    });

    it("should maintain consistent performance under load", async () => {
      const mockService = TestEnvironment.createMockKongService();
      const iterations = 50;
      const durations: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = Bun.nanoseconds();
        await mockService.getConsumerSecret(testConsumer.id);
        const duration = (Bun.nanoseconds() - start) / 1_000_000;
        durations.push(duration);
      }

      // Calculate average and check for consistency
      const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      const maxDuration = Math.max(...durations);

      expect(avgDuration).toBeLessThan(20); // Average should be fast
      expect(maxDuration).toBeLessThan(100); // No outliers should be too slow
    });
  });
});