/* test/bun/api-gateway.service.test.ts */

import { afterEach, beforeEach, describe, expect, it, mock, test } from "bun:test";
import type { IAPIGatewayAdapter } from "../../src/adapters/api-gateway-adapter.interface";
import type { ConsumerSecret, KongCacheStats, KongHealthCheckResult } from "../../src/config";
import { APIGatewayService } from "../../src/services/api-gateway.service";
import type { CircuitBreakerStats } from "../../src/services/shared-circuit-breaker.service";

describe("APIGatewayService", () => {
  const mockConsumerSecret: ConsumerSecret = {
    id: "jwt-credential-123",
    key: "test-key-abc",
    secret: "test-secret-xyz",
    consumer: {
      id: "consumer-456",
    },
  };

  const mockHealthResult: KongHealthCheckResult = {
    healthy: true,
    responseTime: 42,
  };

  const mockCacheStats: KongCacheStats = {
    size: 10,
    hits: 100,
    misses: 20,
    hitRate: 0.833,
    memoryUsage: 1024,
    oldestEntry: Date.now() - 60000,
    newestEntry: Date.now(),
  };

  const mockCircuitBreakerStats: Record<string, CircuitBreakerStats> = {
    getConsumerSecret: {
      state: "closed",
      failures: 0,
      successes: 50,
      lastFailure: null,
      lastSuccess: Date.now(),
      consecutiveFailures: 0,
      consecutiveSuccesses: 10,
    },
    healthCheck: {
      state: "closed",
      failures: 1,
      successes: 100,
      lastFailure: Date.now() - 3600000,
      lastSuccess: Date.now(),
      consecutiveFailures: 0,
      consecutiveSuccesses: 25,
    },
  };

  let mockAdapter: IAPIGatewayAdapter;
  let service: APIGatewayService;

  beforeEach(() => {
    mockAdapter = {
      getConsumerSecret: mock(() => Promise.resolve(mockConsumerSecret)),
      createConsumerSecret: mock(() => Promise.resolve(mockConsumerSecret)),
      healthCheck: mock(() => Promise.resolve(mockHealthResult)),
      clearCache: mock(() => Promise.resolve(undefined)),
      getCacheStats: mock(() => Promise.resolve(mockCacheStats)),
      getCircuitBreakerStats: mock(() => mockCircuitBreakerStats),
    };

    service = new APIGatewayService(mockAdapter);
  });

  afterEach(() => {
    mock.restore();
  });

  describe("constructor", () => {
    it("should create instance with adapter", () => {
      expect(service).toBeInstanceOf(APIGatewayService);
    });
  });

  describe("getConsumerSecret", () => {
    test.concurrent("should delegate to adapter and return secret", async () => {
      const result = await service.getConsumerSecret("consumer-456");

      expect(mockAdapter.getConsumerSecret).toHaveBeenCalledTimes(1);
      expect(mockAdapter.getConsumerSecret).toHaveBeenCalledWith("consumer-456");
      expect(result).toEqual(mockConsumerSecret);
    });

    test.concurrent("should return null when adapter returns null", async () => {
      const nullAdapter: IAPIGatewayAdapter = {
        ...mockAdapter,
        getConsumerSecret: mock(() => Promise.resolve(null)),
      };
      const nullService = new APIGatewayService(nullAdapter);

      const result = await nullService.getConsumerSecret("nonexistent-consumer");

      expect(nullAdapter.getConsumerSecret).toHaveBeenCalledWith("nonexistent-consumer");
      expect(result).toBeNull();
    });

    test.concurrent("should propagate errors from adapter", async () => {
      const errorAdapter: IAPIGatewayAdapter = {
        ...mockAdapter,
        getConsumerSecret: mock(() => Promise.reject(new Error("Kong API unavailable"))),
      };
      const errorService = new APIGatewayService(errorAdapter);

      await expect(errorService.getConsumerSecret("consumer-456")).rejects.toThrow(
        "Kong API unavailable"
      );
    });

    it("should handle empty consumer ID", async () => {
      await service.getConsumerSecret("");

      expect(mockAdapter.getConsumerSecret).toHaveBeenCalledWith("");
    });

    it("should handle special characters in consumer ID", async () => {
      const specialId = "user@domain.com";
      await service.getConsumerSecret(specialId);

      expect(mockAdapter.getConsumerSecret).toHaveBeenCalledWith(specialId);
    });
  });

  describe("createConsumerSecret", () => {
    test.concurrent("should delegate to adapter and return created secret", async () => {
      const result = await service.createConsumerSecret("consumer-456");

      expect(mockAdapter.createConsumerSecret).toHaveBeenCalledTimes(1);
      expect(mockAdapter.createConsumerSecret).toHaveBeenCalledWith("consumer-456");
      expect(result).toEqual(mockConsumerSecret);
    });

    test.concurrent("should return null when consumer not found", async () => {
      const nullAdapter: IAPIGatewayAdapter = {
        ...mockAdapter,
        createConsumerSecret: mock(() => Promise.resolve(null)),
      };
      const nullService = new APIGatewayService(nullAdapter);

      const result = await nullService.createConsumerSecret("nonexistent-consumer");

      expect(result).toBeNull();
    });

    test.concurrent("should propagate creation errors", async () => {
      const errorAdapter: IAPIGatewayAdapter = {
        ...mockAdapter,
        createConsumerSecret: mock(() =>
          Promise.reject(new Error("Failed to create JWT credentials"))
        ),
      };
      const errorService = new APIGatewayService(errorAdapter);

      await expect(errorService.createConsumerSecret("consumer-456")).rejects.toThrow(
        "Failed to create JWT credentials"
      );
    });
  });

  describe("healthCheck", () => {
    test.concurrent("should delegate to adapter and return health result", async () => {
      const result = await service.healthCheck();

      expect(mockAdapter.healthCheck).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockHealthResult);
      expect(result.healthy).toBe(true);
      expect(result.responseTime).toBe(42);
    });

    test.concurrent("should return unhealthy result from adapter", async () => {
      const unhealthyResult: KongHealthCheckResult = {
        healthy: false,
        responseTime: 5000,
        error: "Connection timeout",
      };
      const unhealthyAdapter: IAPIGatewayAdapter = {
        ...mockAdapter,
        healthCheck: mock(() => Promise.resolve(unhealthyResult)),
      };
      const unhealthyService = new APIGatewayService(unhealthyAdapter);

      const result = await unhealthyService.healthCheck();

      expect(result.healthy).toBe(false);
      expect(result.error).toBe("Connection timeout");
    });

    test.concurrent("should propagate health check errors", async () => {
      const errorAdapter: IAPIGatewayAdapter = {
        ...mockAdapter,
        healthCheck: mock(() => Promise.reject(new Error("Network unreachable"))),
      };
      const errorService = new APIGatewayService(errorAdapter);

      await expect(errorService.healthCheck()).rejects.toThrow("Network unreachable");
    });
  });

  describe("clearCache", () => {
    it("should delegate clear with consumer ID to adapter", async () => {
      await service.clearCache("consumer-456");

      expect(mockAdapter.clearCache).toHaveBeenCalledTimes(1);
      expect(mockAdapter.clearCache).toHaveBeenCalledWith("consumer-456");
    });

    it("should delegate clear all to adapter when no ID provided", async () => {
      await service.clearCache();

      expect(mockAdapter.clearCache).toHaveBeenCalledTimes(1);
      expect(mockAdapter.clearCache).toHaveBeenCalledWith(undefined);
    });

    it("should propagate cache clear errors", async () => {
      const errorAdapter: IAPIGatewayAdapter = {
        ...mockAdapter,
        clearCache: mock(() => Promise.reject(new Error("Cache clear failed"))),
      };
      const errorService = new APIGatewayService(errorAdapter);

      await expect(errorService.clearCache()).rejects.toThrow("Cache clear failed");
    });
  });

  describe("getCacheStats", () => {
    test.concurrent("should delegate to adapter and return stats", async () => {
      const result = await service.getCacheStats();

      expect(mockAdapter.getCacheStats).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockCacheStats);
      expect(result.size).toBe(10);
      expect(result.hitRate).toBe(0.833);
    });

    test.concurrent("should propagate stats retrieval errors", async () => {
      const errorAdapter: IAPIGatewayAdapter = {
        ...mockAdapter,
        getCacheStats: mock(() => Promise.reject(new Error("Cache not initialized"))),
      };
      const errorService = new APIGatewayService(errorAdapter);

      await expect(errorService.getCacheStats()).rejects.toThrow("Cache not initialized");
    });
  });

  describe("getCircuitBreakerStats", () => {
    it("should delegate to adapter and return stats", () => {
      const result = service.getCircuitBreakerStats();

      expect(mockAdapter.getCircuitBreakerStats).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockCircuitBreakerStats);
      expect(result.getConsumerSecret.state).toBe("closed");
      expect(result.healthCheck.successes).toBe(100);
    });

    it("should return empty stats when adapter returns empty object", () => {
      const emptyAdapter: IAPIGatewayAdapter = {
        ...mockAdapter,
        getCircuitBreakerStats: mock(() => ({})),
      };
      const emptyService = new APIGatewayService(emptyAdapter);

      const result = emptyService.getCircuitBreakerStats();

      expect(result).toEqual({});
    });
  });

  describe("interface compliance", () => {
    it("should implement all IKongService methods", () => {
      expect(typeof service.getConsumerSecret).toBe("function");
      expect(typeof service.createConsumerSecret).toBe("function");
      expect(typeof service.healthCheck).toBe("function");
      expect(typeof service.clearCache).toBe("function");
      expect(typeof service.getCacheStats).toBe("function");
      expect(typeof service.getCircuitBreakerStats).toBe("function");
    });

    it("should return correct types and values for all methods", async () => {
      const secret = await service.getConsumerSecret("test");
      expect(secret).toHaveProperty("id");
      expect(secret?.id).toBe("jwt-credential-123"); // Match mockConsumerSecret
      expect(secret).toHaveProperty("key");
      expect(secret?.key).toBe("test-key-abc"); // Match mockConsumerSecret
      expect(secret).toHaveProperty("secret");
      expect(secret?.secret).toBe("test-secret-xyz"); // Match mockConsumerSecret
      expect(secret).toHaveProperty("consumer");
      expect(secret?.consumer.id).toBe("consumer-456"); // Match mockConsumerSecret

      const created = await service.createConsumerSecret("test");
      expect(created).toHaveProperty("id");
      expect(created?.id).toBe("jwt-credential-123"); // Match mockConsumerSecret

      const health = await service.healthCheck();
      expect(health).toHaveProperty("healthy");
      expect(health.healthy).toBe(true); // Match mockHealthResult
      expect(health).toHaveProperty("responseTime");
      expect(health.responseTime).toBe(42); // Match mockHealthResult

      const cacheStats = await service.getCacheStats();
      expect(cacheStats).toHaveProperty("size");
      expect(cacheStats.size).toBe(10); // Match mockCacheStats
      expect(cacheStats).toHaveProperty("hits");
      expect(cacheStats.hits).toBe(100); // Match mockCacheStats
      expect(cacheStats).toHaveProperty("misses");
      expect(cacheStats.misses).toBe(20); // Match mockCacheStats
      expect(cacheStats.hitRate).toBe(0.833); // Match mockCacheStats

      const cbStats = service.getCircuitBreakerStats();
      expect(typeof cbStats).toBe("object");
      expect(cbStats.getConsumerSecret).toBeDefined();
      expect(cbStats.getConsumerSecret?.state).toBe("closed"); // Match mockCircuitBreakerStats
      expect(cbStats.getConsumerSecret?.failures).toBe(0);
      expect(cbStats.getConsumerSecret?.successes).toBe(50);
    });
  });

  describe("adapter delegation pattern", () => {
    it("should pass through all calls without modification", async () => {
      const customSecret: ConsumerSecret = {
        id: "custom-id",
        key: "custom-key",
        secret: "custom-secret",
        consumer: { id: "custom-consumer" },
      };

      const trackingAdapter: IAPIGatewayAdapter = {
        getConsumerSecret: mock((id: string) => {
          expect(id).toBe("tracked-consumer");
          return Promise.resolve(customSecret);
        }),
        createConsumerSecret: mock((id: string) => {
          expect(id).toBe("tracked-consumer");
          return Promise.resolve(customSecret);
        }),
        healthCheck: mock(() => Promise.resolve({ healthy: true, responseTime: 1 })),
        clearCache: mock((id?: string) => {
          expect(id).toBe("tracked-consumer");
          return Promise.resolve(undefined);
        }),
        getCacheStats: mock(() => Promise.resolve(mockCacheStats)),
        getCircuitBreakerStats: mock(() => mockCircuitBreakerStats),
      };

      const trackingService = new APIGatewayService(trackingAdapter);

      await trackingService.getConsumerSecret("tracked-consumer");
      await trackingService.createConsumerSecret("tracked-consumer");
      await trackingService.clearCache("tracked-consumer");

      expect(trackingAdapter.getConsumerSecret).toHaveBeenCalledTimes(1);
      expect(trackingAdapter.createConsumerSecret).toHaveBeenCalledTimes(1);
      expect(trackingAdapter.clearCache).toHaveBeenCalledTimes(1);
    });

    it("should not modify return values from adapter", async () => {
      const originalSecret: ConsumerSecret = {
        id: "original-id",
        key: "original-key",
        secret: "original-secret",
        consumer: { id: "original-consumer" },
      };

      const passThroughAdapter: IAPIGatewayAdapter = {
        ...mockAdapter,
        getConsumerSecret: mock(() => Promise.resolve(originalSecret)),
      };
      const passThroughService = new APIGatewayService(passThroughAdapter);

      const result = await passThroughService.getConsumerSecret("any");

      expect(result).toBe(originalSecret);
    });
  });

  describe("concurrent operations", () => {
    test.concurrent("should handle multiple concurrent getConsumerSecret calls", async () => {
      const concurrentAdapter: IAPIGatewayAdapter = {
        ...mockAdapter,
        getConsumerSecret: mock((id: string) =>
          Promise.resolve({
            ...mockConsumerSecret,
            consumer: { id },
          })
        ),
      };
      const concurrentService = new APIGatewayService(concurrentAdapter);

      const promises = Array.from({ length: 10 }, (_, i) =>
        concurrentService.getConsumerSecret(`consumer-${i}`)
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      expect(concurrentAdapter.getConsumerSecret).toHaveBeenCalledTimes(10);
      results.forEach((result, i) => {
        expect(result?.consumer.id).toBe(`consumer-${i}`);
      });
    });

    test.concurrent("should handle mixed concurrent operations", async () => {
      const mixedService = new APIGatewayService(mockAdapter);

      const [secret, health, stats] = await Promise.all([
        mixedService.getConsumerSecret("test-consumer"),
        mixedService.healthCheck(),
        mixedService.getCacheStats(),
      ]);

      expect(secret).toEqual(mockConsumerSecret);
      expect(health).toEqual(mockHealthResult);
      expect(stats).toEqual(mockCacheStats);
    });
  });

  describe("performance", () => {
    test.concurrent("should complete delegation within performance threshold", async () => {
      const start = Bun.nanoseconds();

      await service.getConsumerSecret("test");
      await service.healthCheck();
      await service.getCacheStats();
      service.getCircuitBreakerStats();

      const duration = (Bun.nanoseconds() - start) / 1_000_000;

      expect(duration).toBeLessThan(50);
    });
  });
});
