/* test/bun/kong.adapter.test.ts */

import { describe, expect, it, beforeEach, afterEach, jest } from "bun:test";
import { KongAdapter } from "../../src/adapters/kong.adapter";
import type { ConsumerResponse, ConsumerSecret } from "../../src/config";

// Mock fetch globally
const originalFetch = global.fetch;
let mockFetch: jest.Mock;

beforeEach(() => {
  mockFetch = jest.fn();
  global.fetch = mockFetch;
});

afterEach(() => {
  global.fetch = originalFetch;
  jest.clearAllMocks();
});

describe("KongAdapter", () => {
  const testAdminUrl = "http://test-kong:8001";
  const testAdminToken = "test-token-123";
  const testKonnectUrl = "https://us.api.konghq.com/v2/control-planes/12345678-1234-1234-1234-123456789012";
  const testConsumerId = "test-consumer";

  const mockConsumerSecret: ConsumerSecret = {
    id: "jwt-credential-id",
    key: "test-key-123",
    secret: "test-secret-456",
    consumer: {
      id: "consumer-uuid-123",
    },
  };

  const mockConsumerResponse: ConsumerResponse = {
    data: [mockConsumerSecret],
    total: 1,
  };

  describe("API Gateway Mode", () => {
    let adapter: KongAdapter;

    beforeEach(() => {
      adapter = new KongAdapter("API_GATEWAY", testAdminUrl, testAdminToken);
    });

    describe("getConsumerSecret", () => {
      it("should retrieve consumer secret successfully", async () => {
        // Mock successful response
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockConsumerResponse),
        });

        const result = await adapter.getConsumerSecret(testConsumerId);

        expect(result).toEqual(mockConsumerSecret);
        expect(mockFetch).toHaveBeenCalledWith(
          `${testAdminUrl}/consumers/${testConsumerId}/jwt`,
          expect.objectContaining({
            method: "GET",
            headers: expect.objectContaining({
              "Kong-Admin-Token": testAdminToken,
              "Content-Type": "application/json",
              "User-Agent": "Authentication-Service/1.0",
            }),
          })
        );
      });

      it("should return null for consumer not found", async () => {
        // Mock 404 response
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: "Not Found",
        });

        const result = await adapter.getConsumerSecret(testConsumerId);

        expect(result).toBeNull();
      });

      it("should throw error for API failures", async () => {
        // Mock 500 response
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
          text: () => Promise.resolve("Kong internal error"),
        });

        await expect(adapter.getConsumerSecret(testConsumerId)).rejects.toThrow();
      });
    });

    describe("createConsumerSecret", () => {
      it("should create consumer secret successfully", async () => {
        // Mock successful response
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 201,
          json: () => Promise.resolve(mockConsumerSecret),
        });

        const result = await adapter.createConsumerSecret(testConsumerId);

        expect(result).toEqual(mockConsumerSecret);
        expect(mockFetch).toHaveBeenCalledWith(
          `${testAdminUrl}/consumers/${testConsumerId}/jwt`,
          expect.objectContaining({
            method: "POST",
            headers: expect.objectContaining({
              "Kong-Admin-Token": testAdminToken,
            }),
            body: expect.stringContaining("key"),
          })
        );
      });

      it("should return null for consumer not found", async () => {
        // Mock 404 response
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: "Not Found",
        });

        const result = await adapter.createConsumerSecret(testConsumerId);

        expect(result).toBeNull();
      });
    });

    describe("healthCheck", () => {
      it("should perform health check successfully", async () => {
        // Mock successful response
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
        });

        const result = await adapter.healthCheck();

        expect(result.healthy).toBe(true);
        expect(result.responseTime).toBeGreaterThan(0);
        expect(mockFetch).toHaveBeenCalledWith(
          `${testAdminUrl}/status`,
          expect.objectContaining({
            method: "GET",
            headers: expect.objectContaining({
              "Kong-Admin-Token": testAdminToken,
            }),
          })
        );
      });

      it("should handle health check failures", async () => {
        // Mock failed response
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 503,
          statusText: "Service Unavailable",
          text: () => Promise.resolve("Kong service unavailable"),
        });

        const result = await adapter.healthCheck();

        expect(result.healthy).toBe(false);
        expect(result.error).toContain("Kong service unavailable");
      });
    });
  });

  describe("Konnect Mode", () => {
    let adapter: KongAdapter;

    beforeEach(() => {
      adapter = new KongAdapter("KONNECT", testKonnectUrl, testAdminToken);
    });

    describe("getConsumerSecret", () => {
      it("should handle Konnect prerequisites and consumer resolution", async () => {
        // Mock realm check (exists)
        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
          })
          // Mock consumer ID resolution
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ id: "consumer-uuid-123" }),
          })
          // Mock consumer secret retrieval
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: () => Promise.resolve(mockConsumerResponse),
          });

        const result = await adapter.getConsumerSecret(testConsumerId);

        expect(result).toEqual(mockConsumerSecret);

        // Should call realm check
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("/realms/"),
          expect.objectContaining({
            method: "GET",
            headers: expect.objectContaining({
              Authorization: `Bearer ${testAdminToken}`,
            }),
          })
        );

        // Should call consumer resolution
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining(`/core-entities/consumers/${testConsumerId}`),
          expect.objectContaining({
            method: "GET",
          })
        );

        // Should call JWT retrieval with resolved UUID
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("/core-entities/consumers/consumer-uuid-123/jwt"),
          expect.objectContaining({
            method: "GET",
          })
        );
      });

      it("should create realm if it doesn't exist", async () => {
        // Mock realm check (doesn't exist)
        mockFetch
          .mockResolvedValueOnce({
            ok: false,
            status: 404,
          })
          // Mock realm creation
          .mockResolvedValueOnce({
            ok: true,
            status: 201,
          })
          // Mock consumer ID resolution
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ id: "consumer-uuid-123" }),
          })
          // Mock consumer secret retrieval
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: () => Promise.resolve(mockConsumerResponse),
          });

        const result = await adapter.getConsumerSecret(testConsumerId);

        expect(result).toEqual(mockConsumerSecret);

        // Should call realm creation
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("/realms"),
          expect.objectContaining({
            method: "POST",
            body: expect.stringContaining("auth-realm-"),
          })
        );
      });

      it("should return null when consumer doesn't exist", async () => {
        // Mock realm check (exists)
        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
          })
          // Mock consumer ID resolution (not found)
          .mockResolvedValueOnce({
            ok: false,
            status: 404,
          });

        const result = await adapter.getConsumerSecret(testConsumerId);

        expect(result).toBeNull();
      });
    });

    describe("healthCheck", () => {
      it("should perform health check against Konnect endpoint", async () => {
        // Mock successful response
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
        });

        const result = await adapter.healthCheck();

        expect(result.healthy).toBe(true);
        expect(mockFetch).toHaveBeenCalledWith(
          testKonnectUrl, // Konnect uses root endpoint for health
          expect.objectContaining({
            method: "GET",
            headers: expect.objectContaining({
              Authorization: `Bearer ${testAdminToken}`,
            }),
          })
        );
      });
    });
  });

  describe("Cache Operations", () => {
    let adapter: KongAdapter;

    beforeEach(() => {
      adapter = new KongAdapter("API_GATEWAY", testAdminUrl, testAdminToken);
    });

    it("should have cache clear method", async () => {
      // Cache operations don't make HTTP calls, so no mocking needed
      await expect(adapter.clearCache()).resolves.not.toThrow();
      await expect(adapter.clearCache(testConsumerId)).resolves.not.toThrow();
    });

    it("should have cache stats method", async () => {
      const stats = await adapter.getCacheStats();
      expect(stats).toBeDefined();
      expect(typeof stats).toBe("object");
    });
  });

  describe("Circuit Breaker Operations", () => {
    let adapter: KongAdapter;

    beforeEach(() => {
      adapter = new KongAdapter("API_GATEWAY", testAdminUrl, testAdminToken);
    });

    it("should have circuit breaker stats method", () => {
      const stats = adapter.getCircuitBreakerStats();
      expect(stats).toBeDefined();
      expect(typeof stats).toBe("object");
    });
  });

  describe("Error Handling", () => {
    let adapter: KongAdapter;

    beforeEach(() => {
      adapter = new KongAdapter("API_GATEWAY", testAdminUrl, testAdminToken);
    });

    it("should handle network timeouts", async () => {
      // Mock timeout error
      mockFetch.mockRejectedValueOnce(new Error("Request timeout"));

      await expect(adapter.getConsumerSecret(testConsumerId)).rejects.toThrow();
    });

    it("should handle malformed responses", async () => {
      // Mock malformed JSON response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.reject(new Error("Invalid JSON")),
      });

      await expect(adapter.getConsumerSecret(testConsumerId)).rejects.toThrow();
    });
  });
});