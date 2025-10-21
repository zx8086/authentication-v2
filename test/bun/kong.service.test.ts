/* test/bun/kong.service.test.ts */

// Tests for Kong service integration using factory pattern
import { afterEach, beforeEach, describe, expect, it, mock, test } from "bun:test";
import type { IKongService } from "../../src/config";
import { KongServiceFactory } from "../../src/services/kong.service";
import { getTestConsumer } from "../shared/test-consumers";

// Mock fetch for testing
const originalFetch = global.fetch;

describe("Kong Service Factory Integration", () => {
  const testConsumer = getTestConsumer(0);
  const testConsumerId = testConsumer.id;

  describe.concurrent("API Gateway Mode", () => {
    let kongService: IKongService;
    const mockAdminUrl = "http://test-kong:8001";
    const mockAdminToken = "test-admin-token";

    beforeEach(() => {
      kongService = KongServiceFactory.create("API_GATEWAY", mockAdminUrl, mockAdminToken);
    });

    afterEach(async () => {
      // Clear Redis cache between tests to prevent pollution
      if (kongService?.clearCache) {
        await kongService.clearCache();
      }
      global.fetch = originalFetch;
    });

    describe.concurrent("constructor", () => {
      it("should initialize API Gateway service with correct configuration", () => {
        expect(kongService).toBeDefined();
        expect(typeof kongService.getConsumerSecret).toBe("function");
        expect(typeof kongService.createConsumerSecret).toBe("function");
        expect(typeof kongService.healthCheck).toBe("function");
      });

      it("should handle URL with trailing slash", () => {
        const serviceWithSlash = KongServiceFactory.create(
          "API_GATEWAY",
          "http://kong:8001/",
          mockAdminToken
        );
        expect(serviceWithSlash).toBeDefined();
      });
    });

    describe.concurrent("getConsumerSecret", () => {
      test.concurrent("should return consumer secret when found", async () => {
        const mockSecret = {
          id: "secret-id-123",
          key: "consumer-key-123",
          secret: "consumer-secret-456",
          consumer: { id: "test-consumer-id" },
        };

        const mockResponse = {
          data: [mockSecret],
          total: 1,
        };

        // Mock API Gateway endpoints (not Konnect)
        global.fetch = mock(async (url, options) => {
          const urlStr = url.toString();

          // Mock Kong API Gateway JWT credentials fetch
          if (urlStr.includes(`/consumers/${testConsumerId}/jwt`)) {
            return {
              ok: true,
              status: 200,
              json: async () => mockResponse,
            };
          }

          return { ok: false, status: 404 };
        }) as any;

        const result = await kongService.getConsumerSecret(testConsumerId);

        expect(result).toEqual(mockSecret);
        expect(global.fetch).toHaveBeenCalledTimes(1); // Only JWT fetch for API Gateway
      });

      test.concurrent("should return null when consumer not found", async () => {
        // Mock 404 response for API Gateway
        global.fetch = mock(async (url) => {
          const urlStr = url.toString();

          // Mock consumer not found in API Gateway
          if (urlStr.includes(`/consumers/${testConsumerId}/jwt`)) {
            return {
              ok: false,
              status: 404,
              statusText: "Not Found",
            };
          }

          return { ok: false, status: 404 };
        }) as any;

        const result = await kongService.getConsumerSecret(testConsumerId);

        expect(result).toBeNull();
      });

      test.concurrent("should return null when no JWT credentials exist", async () => {
        const mockResponse = {
          data: [],
          total: 0,
        };

        // Mock empty JWT credentials for API Gateway
        global.fetch = mock(async (url) => {
          const urlStr = url.toString();

          // Mock empty JWT credentials in API Gateway
          if (urlStr.includes(`/consumers/${testConsumerId}/jwt`)) {
            return {
              ok: true,
              status: 200,
              json: async () => mockResponse,
            };
          }

          return { ok: false, status: 404 };
        }) as any;

        const result = await kongService.getConsumerSecret(testConsumerId);

        expect(result).toBeNull();
      });

      test.concurrent("should handle Kong API errors gracefully", async () => {
        // Mock server error for API Gateway
        global.fetch = mock(async () => ({
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
          text: async () => "Kong server error",
        })) as any;

        // With circuit breaker disabled, errors are thrown directly
        await expect(async () => {
          await kongService.getConsumerSecret(testConsumerId);
        }).toThrow("Kong internal server error - check Kong service health");
      });

      it("should handle network errors gracefully", async () => {
        // Mock network error
        global.fetch = mock(async () => {
          throw new Error("Network error");
        }) as any;

        // With circuit breaker disabled, errors are thrown directly
        await expect(async () => {
          await kongService.getConsumerSecret(testConsumerId);
        }).toThrow("Network error");
      });
    });

    describe.concurrent("createConsumerSecret", () => {
      it("should create a new consumer secret when consumer exists", async () => {
        const mockCreatedSecret = {
          id: "new-secret-id-123",
          key: "new-consumer-key-123",
          secret: "new-consumer-secret-456",
          consumer: { id: "test-consumer-id" },
        };

        // Mock successful creation for API Gateway
        global.fetch = mock(async (url, options) => {
          const urlStr = url.toString();

          // Mock JWT credentials creation in API Gateway
          if (urlStr.includes(`/consumers/${testConsumerId}/jwt`) && options?.method === "POST") {
            // Verify the request body contains key and secret
            const body = JSON.parse(options.body);
            expect(body).toHaveProperty("key");
            expect(body).toHaveProperty("secret");
            expect(typeof body.key).toBe("string");
            expect(typeof body.secret).toBe("string");

            return {
              ok: true,
              status: 201,
              json: async () => mockCreatedSecret,
            };
          }

          return { ok: false, status: 404 };
        }) as any;

        const result = await kongService.createConsumerSecret(testConsumerId);

        expect(result).toEqual(mockCreatedSecret);
        expect(global.fetch).toHaveBeenCalledTimes(1); // Only JWT creation for API Gateway
      });

      it("should return null when consumer does not exist", async () => {
        // Mock consumer not found in API Gateway
        global.fetch = mock(async (url) => {
          const urlStr = url.toString();

          // Mock consumer not found in API Gateway
          if (urlStr.includes(`/consumers/${testConsumerId}/jwt`)) {
            return {
              ok: false,
              status: 404,
              statusText: "Not Found",
              text: async () => "Consumer not found",
            };
          }

          return { ok: false, status: 404, text: async () => "Not found" };
        }) as any;

        const result = await kongService.createConsumerSecret(testConsumerId);

        expect(result).toBeNull();
      });

      it("should handle creation errors gracefully", async () => {
        // Mock server error for API Gateway
        global.fetch = mock(async () => ({
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
          text: async () => "Creation failed",
        })) as any;

        // With circuit breaker disabled, errors are thrown directly
        await expect(async () => {
          await kongService.createConsumerSecret(testConsumerId);
        }).toThrow("Kong internal server error - check Kong service health");
      });
    });

    describe.concurrent("healthCheck", () => {
      it("should return healthy status when Kong is accessible", async () => {
        // Mock successful health check for API Gateway
        global.fetch = mock(async (url) => {
          const urlStr = url.toString();
          if (urlStr.includes("/status")) {
            return {
              ok: true,
              status: 200,
            };
          }
          return { ok: false, status: 404 };
        }) as any;

        const result = await kongService.healthCheck();

        expect(result.healthy).toBe(true);
        expect(typeof result.responseTime).toBe("number");
        expect(result.responseTime).toBeGreaterThan(0);
        expect(result.error).toBeUndefined();
      });

      it("should return unhealthy status when Kong returns error", async () => {
        // Mock error response for API Gateway
        global.fetch = mock(async () => ({
          ok: false,
          status: 503,
          statusText: "Service Unavailable",
          text: async () => "Service unavailable",
        })) as any;

        // Health check should return unhealthy status
        const result = await kongService.healthCheck();
        expect(result.healthy).toBe(false);
        expect(result.error).toContain("Kong service unavailable");
      });

      it("should return unhealthy status when Kong is unreachable", async () => {
        // Mock network error
        global.fetch = mock(async () => {
          throw new Error("Connection refused");
        }) as any;

        // Health check should return unhealthy status
        const result = await kongService.healthCheck();
        expect(result.healthy).toBe(false);
        // Error message can vary between local and CI environments due to timeout behavior
        expect(result.error).toMatch(/Connection refused|This operation was aborted/);
      });

      it("should complete health check within reasonable time", async () => {
        global.fetch = mock(async () => ({
          ok: true,
          status: 200,
        })) as any;

        const start = Bun.nanoseconds();
        await kongService.healthCheck();
        const duration = (Bun.nanoseconds() - start) / 1_000_000;

        expect(duration).toBeLessThan(100); // Should complete within 100ms
      });
    });

    describe("error handling and resilience", () => {
      it("should handle timeout gracefully", async () => {
        // Mock AbortSignal timeout behavior
        global.fetch = mock(async (url, options) => {
          // Simulate timeout by throwing AbortError
          const error = new Error("This operation was aborted");
          error.name = "AbortError";
          throw error;
        }) as any;

        // With circuit breaker disabled, errors are thrown directly
        await expect(async () => {
          await kongService.getConsumerSecret(testConsumerId);
        }).toThrow("This operation was aborted");
      });
    });
  });

  describe("Konnect Mode", () => {
    let kongService: IKongService;
    const mockKonnectUrl =
      "https://us.api.konghq.com/v2/control-planes/12345678-1234-1234-1234-123456789012";
    const mockAdminToken = "test-konnect-token";

    beforeEach(() => {
      kongService = KongServiceFactory.create("KONNECT", mockKonnectUrl, mockAdminToken);
    });

    afterEach(async () => {
      if (kongService?.clearCache) {
        await kongService.clearCache();
      }
      global.fetch = originalFetch;
    });

    it("should create Konnect service correctly", () => {
      expect(kongService).toBeDefined();
      expect(typeof kongService.getConsumerSecret).toBe("function");
    });

    it("should handle Konnect-specific API calls", async () => {
      const mockSecret = {
        id: "konnect-secret-id",
        key: "konnect-key",
        secret: "konnect-secret",
        consumer: { id: "consumer-uuid" },
      };

      global.fetch = mock(async (url) => {
        const urlStr = url.toString();

        // Mock realm check
        if (urlStr.includes("/v1/realms/auth-realm-12345678")) {
          return { ok: true, status: 200 };
        }

        // Mock consumer check
        if (
          urlStr.includes(
            "/v2/control-planes/12345678-1234-1234-1234-123456789012/core-entities/consumers/"
          ) &&
          !urlStr.includes("/jwt")
        ) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ id: "consumer-uuid", username: testConsumerId }),
          };
        }

        // Mock JWT fetch
        if (urlStr.includes("/jwt")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ data: [mockSecret], total: 1 }),
          };
        }

        return { ok: false, status: 404 };
      }) as any;

      const result = await kongService.getConsumerSecret(testConsumerId);
      expect(result).toEqual(mockSecret);
    });
  });
});
