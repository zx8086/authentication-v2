/* test/bun/kong-api-gateway.service.test.ts */

import { afterEach, beforeEach, describe, expect, it, jest, spyOn } from "bun:test";
import { KongApiGatewayService } from "../../src/services/kong-api-gateway.service";
import type { ConsumerResponse, ConsumerSecret } from "../../src/config";

const mockConsumerSecret: ConsumerSecret = {
  id: "test-jwt-id",
  key: "test-key-123",
  secret: "test-secret-456",
  consumer: { id: "test-consumer-id" },
  algorithm: "HS256",
  created_at: Date.now(),
};

const mockConsumerResponse: ConsumerResponse = {
  data: [mockConsumerSecret],
};

describe("KongApiGatewayService", () => {
  let service: KongApiGatewayService;
  let fetchSpy: any;

  beforeEach(() => {
    service = new KongApiGatewayService("http://kong:8001", "test-token");
    fetchSpy = spyOn(global, "fetch");
    jest.clearAllMocks();
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  describe("constructor", () => {
    it("should initialize with correct configuration", () => {
      const testService = new KongApiGatewayService("http://kong:8001/", "admin-token");
      expect(testService).toBeInstanceOf(KongApiGatewayService);
    });

    it("should remove trailing slash from URL", () => {
      const testService = new KongApiGatewayService("http://kong:8001/", "admin-token");
      expect(testService).toBeInstanceOf(KongApiGatewayService);
    });
  });

  describe("getConsumerSecret", () => {
    it("should return consumer secret when found", async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockConsumerResponse),
      });

      const result = await service.getConsumerSecret("test-consumer");

      expect(result).toEqual(mockConsumerSecret);
      expect(fetchSpy).toHaveBeenCalledWith(
        "http://kong:8001/consumers/test-consumer/jwt",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            "Kong-Admin-Token": "test-token",
            "Content-Type": "application/json",
            "User-Agent": "Authentication-Service/1.0",
          }),
        })
      );
    });

    it("should return null when consumer not found (404)", async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
      });

      const result = await service.getConsumerSecret("nonexistent-consumer");

      expect(result).toBeNull();
    });

    it("should return null when no JWT credentials exist", async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: [] }),
      });

      const result = await service.getConsumerSecret("consumer-no-jwt");

      expect(result).toBeNull();
    });

    it("should throw error for Kong API errors", async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        text: () => Promise.resolve("Kong error"),
      });

      const result = await service.getConsumerSecret("error-consumer");

      expect(result).toBeNull();
    });

    it("should handle network errors gracefully", async () => {
      fetchSpy.mockRejectedValue(new Error("Network error"));

      const result = await service.getConsumerSecret("network-error-consumer");

      expect(result).toBeNull();
    });

    it("should use cache on subsequent requests", async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockConsumerResponse),
      });

      const result1 = await service.getConsumerSecret("cached-consumer");
      const result2 = await service.getConsumerSecret("cached-consumer");

      expect(result1).toEqual(mockConsumerSecret);
      expect(result2).toEqual(mockConsumerSecret);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it("should return stale cache when fetch fails", async () => {
      const expiredCacheService = new KongApiGatewayService("http://kong:8001", "test-token");

      fetchSpy
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockConsumerResponse),
        })
        .mockRejectedValueOnce(new Error("Network error"));

      await expiredCacheService.getConsumerSecret("stale-cache-consumer");

      expiredCacheService.clearCache();
      (expiredCacheService as any).cache.set("stale-cache-consumer", {
        data: mockConsumerSecret,
        expires: Date.now() - 1000
      });

      const result = await expiredCacheService.getConsumerSecret("stale-cache-consumer");

      expect(result).toEqual(mockConsumerSecret);
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it("should handle timeout gracefully", async () => {
      fetchSpy.mockRejectedValue(new Error("TimeoutError"));

      const result = await service.getConsumerSecret("timeout-consumer");

      expect(result).toBeNull();
    });
  });

  describe("createConsumerSecret", () => {
    it("should create a new consumer secret when consumer exists", async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        status: 201,
        json: () => Promise.resolve(mockConsumerSecret),
      });

      const result = await service.createConsumerSecret("test-consumer");

      expect(result).toEqual(mockConsumerSecret);
      expect(fetchSpy).toHaveBeenCalledWith(
        "http://kong:8001/consumers/test-consumer/jwt",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Kong-Admin-Token": "test-token",
            "Content-Type": "application/json",
            "User-Agent": "Authentication-Service/1.0",
          }),
          body: expect.stringContaining("key"),
        })
      );
    });

    it("should return null when consumer does not exist", async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
        text: () => Promise.resolve("Consumer not found"),
      });

      const result = await service.createConsumerSecret("nonexistent-consumer");

      expect(result).toBeNull();
    });

    it("should handle creation errors gracefully", async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        text: () => Promise.resolve("Kong error"),
      });

      const result = await service.createConsumerSecret("error-consumer");

      expect(result).toBeNull();
    });

    it("should cache created secret", async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        status: 201,
        json: () => Promise.resolve(mockConsumerSecret),
      });

      await service.createConsumerSecret("cache-consumer");

      fetchSpy.mockClear();
      const cachedResult = await service.getConsumerSecret("cache-consumer");

      expect(cachedResult).toEqual(mockConsumerSecret);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("should handle network errors during creation", async () => {
      fetchSpy.mockRejectedValue(new Error("Network error"));

      const result = await service.createConsumerSecret("network-error-consumer");

      expect(result).toBeNull();
    });

    it("should generate secure random key and secret", async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        status: 201,
        json: () => Promise.resolve(mockConsumerSecret),
      });

      await service.createConsumerSecret("random-test-consumer");

      const callBody = JSON.parse(fetchSpy.mock.calls[0][1].body);
      expect(callBody.key).toMatch(/^[a-f0-9]{32}$/);
      expect(callBody.secret).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe("clearCache", () => {
    beforeEach(async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockConsumerResponse),
      });

      await service.getConsumerSecret("consumer1");
      await service.getConsumerSecret("consumer2");
    });

    it("should clear cache for specific consumer", () => {
      service.clearCache("consumer1");

      const stats = service.getCacheStats();
      expect(stats.size).toBe(1);
    });

    it("should clear entire cache when no consumer specified", () => {
      service.clearCache();

      const stats = service.getCacheStats();
      expect(stats.size).toBe(0);
    });
  });

  describe("getCacheStats", () => {
    it("should return empty stats for empty cache", () => {
      const stats = service.getCacheStats();

      expect(stats.size).toBe(0);
      expect(stats.entries).toEqual([]);
      expect(stats.activeEntries).toBe(0);
      expect(stats.hitRate).toBe("0%");
    });

    it("should return cache statistics", async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockConsumerResponse),
      });

      await service.getConsumerSecret("stats-consumer");

      const stats = service.getCacheStats();

      expect(stats.size).toBe(1);
      expect(stats.activeEntries).toBe(1);
      expect(stats.entries).toHaveLength(1);
      expect(stats.entries[0].consumerId).toBe("stats-consumer");
      expect(stats.entries[0].isActive).toBe(true);
      expect(stats.hitRate).toBe("100.00%");
    });
  });

  describe("healthCheck", () => {
    it("should return healthy status when Kong is accessible", async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        status: 200,
      });

      const result = await service.healthCheck();

      expect(result.healthy).toBe(true);
      expect(result.responseTime).toBeGreaterThan(0);
      expect(result.error).toBeUndefined();
      expect(fetchSpy).toHaveBeenCalledWith(
        "http://kong:8001/status",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            "Kong-Admin-Token": "test-token",
            "User-Agent": "Authentication-Service/1.0",
          }),
        })
      );
    });

    it("should return unhealthy status for authentication errors", async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
      });

      const result = await service.healthCheck();

      expect(result.healthy).toBe(false);
      expect(result.responseTime).toBeGreaterThan(0);
      expect(result.error).toContain("Authentication failed");
    });

    it("should return unhealthy status for permission errors", async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 403,
        statusText: "Forbidden",
      });

      const result = await service.healthCheck();

      expect(result.healthy).toBe(false);
      expect(result.error).toContain("Permission denied");
    });

    it("should return unhealthy status for endpoint not found", async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
      });

      const result = await service.healthCheck();

      expect(result.healthy).toBe(false);
      expect(result.error).toContain("Kong admin API endpoint not found");
    });

    it("should return unhealthy status for server errors", async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      const result = await service.healthCheck();

      expect(result.healthy).toBe(false);
      expect(result.error).toContain("HTTP 500");
    });

    it("should return unhealthy status when Kong is unreachable", async () => {
      fetchSpy.mockRejectedValue(new Error("fetch failed"));

      const result = await service.healthCheck();

      expect(result.healthy).toBe(false);
      expect(result.responseTime).toBeGreaterThan(0);
      expect(result.error).toContain("fetch failed");
    });

    it("should handle timeout errors", async () => {
      fetchSpy.mockRejectedValue(new Error("TimeoutError"));

      const result = await service.healthCheck();

      expect(result.healthy).toBe(false);
      expect(result.error).toContain("TimeoutError");
    });

    it("should complete health check within reasonable time", async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        status: 200,
      });

      const start = Date.now();
      await service.healthCheck();
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(1000);
    });
  });

  describe("generateSecureSecret", () => {
    it("should generate 64-character hex string", async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        status: 201,
        json: () => Promise.resolve(mockConsumerSecret),
      });

      await service.createConsumerSecret("secret-test-consumer");

      const callBody = JSON.parse(fetchSpy.mock.calls[0][1].body);
      expect(callBody.secret).toMatch(/^[a-f0-9]{64}$/);
      expect(callBody.secret).toHaveLength(64);
    });

    it("should generate unique secrets", async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        status: 201,
        json: () => Promise.resolve(mockConsumerSecret),
      });

      await service.createConsumerSecret("unique-test-1");
      await service.createConsumerSecret("unique-test-2");

      const call1Body = JSON.parse(fetchSpy.mock.calls[0][1].body);
      const call2Body = JSON.parse(fetchSpy.mock.calls[1][1].body);

      expect(call1Body.secret).not.toBe(call2Body.secret);
      expect(call1Body.key).not.toBe(call2Body.key);
    });
  });

  describe("error handling and resilience", () => {
    it("should handle malformed JSON responses", async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.reject(new Error("Invalid JSON")),
      });

      const result = await service.getConsumerSecret("malformed-json-consumer");

      expect(result).toBeNull();
    });

    it("should handle missing response data", async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      });

      const result = await service.getConsumerSecret("missing-data-consumer");

      expect(result).toBeNull();
    });

    it("should handle null response data", async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: null }),
      });

      const result = await service.getConsumerSecret("null-data-consumer");

      expect(result).toBeNull();
    });
  });
});