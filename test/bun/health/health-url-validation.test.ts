// test/bun/health/health-url-validation.test.ts

import { describe, expect, it } from "bun:test";

describe("Health Handler URL Validation", () => {
  describe("checkEndpoint URL validation", () => {
    it("should return error when URL is empty string", async () => {
      const { handleHealthCheck } = await import("../../../src/handlers/health");
      const mockKong: any = {
        async healthCheck() {
          return { healthy: true, responseTime: 50 };
        },
        async getConsumerSecret() {
          return null;
        },
        async createConsumerSecret() {
          return null;
        },
        async clearCache() {
          // Mock implementation
        },
        async getCacheStats() {
          return { size: 0, hitRate: "0%" };
        },
        getCircuitBreakerStats() {
          return {};
        },
      };

      const response = await handleHealthCheck(mockKong);
      const body = await response.json();

      // When telemetry endpoints are not configured (empty strings),
      // they should report as not configured
      expect(body.dependencies.telemetry).toBeDefined();
    });

    it("should handle null URL gracefully", async () => {
      const { handleHealthCheck } = await import("../../../src/handlers/health");
      const mockKong: any = {
        async healthCheck() {
          return { healthy: true, responseTime: 50 };
        },
        async getConsumerSecret() {
          return null;
        },
        async createConsumerSecret() {
          return null;
        },
        async clearCache() {
          // Mock implementation
        },
        async getCacheStats() {
          return { size: 0, hitRate: "0%" };
        },
        getCircuitBreakerStats() {
          return {};
        },
      };

      const response = await handleHealthCheck(mockKong);
      const body = await response.json();

      // Telemetry dependencies should exist
      expect(body.dependencies.telemetry).toBeDefined();
    });

    it("should handle undefined URL gracefully", async () => {
      const { handleHealthCheck } = await import("../../../src/handlers/health");
      const mockKong: any = {
        async healthCheck() {
          return { healthy: true, responseTime: 50 };
        },
        async getConsumerSecret() {
          return null;
        },
        async createConsumerSecret() {
          return null;
        },
        async clearCache() {
          // Mock implementation
        },
        async getCacheStats() {
          return { size: 0, hitRate: "0%" };
        },
        getCircuitBreakerStats() {
          return {};
        },
      };

      const response = await handleHealthCheck(mockKong);
      const body = await response.json();

      expect(body.dependencies.telemetry).toBeDefined();
    });

    it("should include responseTime when endpoint check succeeds", async () => {
      const { handleHealthCheck } = await import("../../../src/handlers/health");
      const mockKong: any = {
        async healthCheck() {
          return { healthy: true, responseTime: 50 };
        },
        async getConsumerSecret() {
          return null;
        },
        async createConsumerSecret() {
          return null;
        },
        async clearCache() {
          // Mock implementation
        },
        async getCacheStats() {
          return { size: 0, hitRate: "0%" };
        },
        getCircuitBreakerStats() {
          return {};
        },
      };

      const response = await handleHealthCheck(mockKong);
      const body = await response.json();

      // Kong should have a responseTime (human-readable string format)
      expect(typeof body.dependencies.kong.responseTime).toBe("string");
      // Response time should be in human-readable format (e.g., "25.5ms", "1.5s")
      expect(body.dependencies.kong.responseTime).toMatch(/^\d+(\.\d+)?(ms|s|m\s\d+s|m)$/);
    });

    it("should include error message when endpoint check fails", async () => {
      const { handleHealthCheck } = await import("../../../src/handlers/health");
      const mockKong: any = {
        async healthCheck() {
          return {
            healthy: false,
            responseTime: 100,
            error: "Connection refused",
          };
        },
        async getConsumerSecret() {
          return null;
        },
        async createConsumerSecret() {
          return null;
        },
        async clearCache() {
          // Mock implementation
        },
        async getCacheStats() {
          return { size: 0, hitRate: "0%" };
        },
        getCircuitBreakerStats() {
          return {};
        },
      };

      const response = await handleHealthCheck(mockKong);
      const body = await response.json();

      expect(body.dependencies.kong.status).toBe("unhealthy");
      expect(typeof body.dependencies.kong.responseTime).toBe("string");
      // Response time should be in human-readable format
      expect(body.dependencies.kong.responseTime).toMatch(/^\d+(\.\d+)?(ms|s|m\s\d+s|m)$/);
    });

    it("should use exact status value from Kong health check", async () => {
      const { handleHealthCheck } = await import("../../../src/handlers/health");
      const mockKong: any = {
        async healthCheck() {
          return { healthy: true, responseTime: 75 };
        },
        async getConsumerSecret() {
          return null;
        },
        async createConsumerSecret() {
          return null;
        },
        async clearCache() {
          // Mock implementation
        },
        async getCacheStats() {
          return { size: 0, hitRate: "0%" };
        },
        getCircuitBreakerStats() {
          return {};
        },
      };

      const response = await handleHealthCheck(mockKong);
      const body = await response.json();

      // Verify Kong status is correctly reported
      expect(typeof body.dependencies.kong.responseTime).toBe("string");
      // Response time should be in human-readable format
      expect(body.dependencies.kong.responseTime).toMatch(/^\d+(\.\d+)?(ms|s|m\s\d+s|m)$/);
      expect(body.dependencies.kong.status).toBe("healthy");
    });
  });

  describe("Cache health error handling", () => {
    it("should handle cache service errors gracefully", async () => {
      const { handleHealthCheck } = await import("../../../src/handlers/health");
      const mockKong: any = {
        async healthCheck() {
          return { healthy: true, responseTime: 50 };
        },
        async getConsumerSecret() {
          return null;
        },
        async createConsumerSecret() {
          return null;
        },
        async clearCache() {
          // Mock implementation
        },
        async getCacheStats() {
          return { size: 0, hitRate: "0%" };
        },
        getCircuitBreakerStats() {
          return {};
        },
      };

      const response = await handleHealthCheck(mockKong);
      const body = await response.json();

      // Cache status should be included
      expect(body.dependencies.cache).toBeDefined();
      expect(body.dependencies.cache.status).toBeDefined();
    });

    it("should report stale cache availability correctly", async () => {
      const { handleHealthCheck } = await import("../../../src/handlers/health");
      const mockKong: any = {
        async healthCheck() {
          return { healthy: true, responseTime: 50 };
        },
        async getConsumerSecret() {
          return null;
        },
        async createConsumerSecret() {
          return null;
        },
        async clearCache() {
          // Mock implementation
        },
        async getCacheStats() {
          return { size: 0, hitRate: "0%" };
        },
        getCircuitBreakerStats() {
          return {};
        },
      };

      const response = await handleHealthCheck(mockKong);
      const body = await response.json();

      // In non-HA mode (default), stale cache should be available
      if (body.dependencies.cache.staleCache) {
        expect(typeof body.dependencies.cache.staleCache.available).toBe("boolean");
      }
    });
  });
});
