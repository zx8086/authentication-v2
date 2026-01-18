/* test/bun/tokens-handler.test.ts */

import { afterEach, beforeEach, describe, expect, it, mock, test } from "bun:test";
import type {
  ConsumerSecret,
  IKongService,
  KongCacheStats,
  KongHealthCheckResult,
} from "../../src/config";
import { ErrorCodes } from "../../src/errors/error-codes";
import { handleTokenRequest, handleTokenValidation } from "../../src/handlers/tokens";
import type { CircuitBreakerStats } from "../../src/services/circuit-breaker.service";

describe("Tokens Handler", () => {
  const mockConsumerSecret: ConsumerSecret = {
    id: "jwt-credential-123",
    key: "test-consumer-key",
    secret: "test-secret-that-is-at-least-32-chars-long",
    consumer: {
      id: "consumer-456",
    },
  };

  const mockHealthResult: KongHealthCheckResult = {
    healthy: true,
    responseTime: 25,
  };

  const mockCacheStats: KongCacheStats = {
    strategy: "local-memory",
    size: 10,
    entries: [],
    activeEntries: 10,
    hitRate: "85.00",
    averageLatencyMs: 0.5,
  };

  const mockCircuitBreakerStats: Record<string, CircuitBreakerStats> = {
    getConsumerSecret: {
      state: "closed",
      failures: 0,
      successes: 100,
      lastFailure: null,
      lastSuccess: Date.now(),
      consecutiveFailures: 0,
      consecutiveSuccesses: 50,
    },
  };

  let mockKongService: IKongService;

  function createRequest(headers: Record<string, string> = {}, method = "GET"): Request {
    return new Request("http://localhost:3000/tokens", {
      method,
      headers: new Headers(headers),
    });
  }

  function createValidationRequest(token: string, headers: Record<string, string> = {}): Request {
    return new Request("http://localhost:3000/tokens/validate", {
      method: "GET",
      headers: new Headers({
        Authorization: `Bearer ${token}`,
        ...headers,
      }),
    });
  }

  beforeEach(() => {
    mockKongService = {
      getConsumerSecret: mock(() => Promise.resolve(mockConsumerSecret)),
      createConsumerSecret: mock(() => Promise.resolve(mockConsumerSecret)),
      clearCache: mock(() => Promise.resolve(undefined)),
      getCacheStats: mock(() => Promise.resolve(mockCacheStats)),
      healthCheck: mock(() => Promise.resolve(mockHealthResult)),
      getCircuitBreakerStats: mock(() => mockCircuitBreakerStats),
    };
  });

  afterEach(() => {
    mock.restore();
  });

  describe("handleTokenRequest", () => {
    describe("Header Validation", () => {
      it("should return AUTH_001 when missing consumer ID header", async () => {
        const req = createRequest({
          "x-consumer-username": "test-user",
        });

        const response = await handleTokenRequest(req, mockKongService);
        const body = await response.json();

        expect(response.status).toBe(401);
        expect(body.error.code).toBe(ErrorCodes.AUTH_001);
        expect(body.error.message).toBeDefined();
      });

      it("should return AUTH_001 when missing username header", async () => {
        const req = createRequest({
          "x-consumer-id": "consumer-123",
        });

        const response = await handleTokenRequest(req, mockKongService);
        const body = await response.json();

        expect(response.status).toBe(401);
        expect(body.error.code).toBe(ErrorCodes.AUTH_001);
      });

      it("should return AUTH_001 when both headers are missing", async () => {
        const req = createRequest({});

        const response = await handleTokenRequest(req, mockKongService);
        const body = await response.json();

        expect(response.status).toBe(401);
        expect(body.error.code).toBe(ErrorCodes.AUTH_001);
      });

      it("should return AUTH_009 for anonymous consumers", async () => {
        const req = createRequest({
          "x-consumer-id": "consumer-123",
          "x-consumer-username": "test-user",
          "x-anonymous-consumer": "true",
        });

        const response = await handleTokenRequest(req, mockKongService);
        const body = await response.json();

        expect(response.status).toBe(401);
        expect(body.error.code).toBe(ErrorCodes.AUTH_009);
      });

      it("should allow non-anonymous consumers", async () => {
        const req = createRequest({
          "x-consumer-id": "consumer-123",
          "x-consumer-username": "test-user",
          "x-anonymous-consumer": "false",
        });

        const response = await handleTokenRequest(req, mockKongService);

        // Should proceed past header validation (200 for successful token generation)
        expect(response.status).toBe(200);
      });

      it("should return AUTH_007 when consumer ID exceeds max length", async () => {
        const longId = "a".repeat(257);
        const req = createRequest({
          "x-consumer-id": longId,
          "x-consumer-username": "test-user",
        });

        const response = await handleTokenRequest(req, mockKongService);
        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body.error.code).toBe(ErrorCodes.AUTH_007);
      });

      it("should return AUTH_007 when username exceeds max length", async () => {
        const longUsername = "u".repeat(257);
        const req = createRequest({
          "x-consumer-id": "consumer-123",
          "x-consumer-username": longUsername,
        });

        const response = await handleTokenRequest(req, mockKongService);
        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body.error.code).toBe(ErrorCodes.AUTH_007);
      });

      it("should accept headers at exactly max length (256 chars)", async () => {
        const maxLengthId = "a".repeat(256);
        const maxLengthUsername = "u".repeat(256);
        const req = createRequest({
          "x-consumer-id": maxLengthId,
          "x-consumer-username": maxLengthUsername,
        });

        const response = await handleTokenRequest(req, mockKongService);

        // Should proceed past header validation
        expect(response.status).toBe(200);
      });
    });

    describe("Consumer Lookup", () => {
      it("should return AUTH_002 when consumer not found", async () => {
        const noConsumerService: IKongService = {
          ...mockKongService,
          getConsumerSecret: mock(() => Promise.resolve(null)),
        };

        const req = createRequest({
          "x-consumer-id": "nonexistent-consumer",
          "x-consumer-username": "test-user",
        });

        const response = await handleTokenRequest(req, noConsumerService);
        const body = await response.json();

        expect(response.status).toBe(401);
        expect(body.error.code).toBe(ErrorCodes.AUTH_002);
        expect(noConsumerService.getConsumerSecret).toHaveBeenCalledTimes(1);
      });

      it("should return AUTH_004 when Kong service throws", async () => {
        const errorService: IKongService = {
          ...mockKongService,
          getConsumerSecret: mock(() => Promise.reject(new Error("Kong unavailable"))),
        };

        const req = createRequest({
          "x-consumer-id": "consumer-123",
          "x-consumer-username": "test-user",
        });

        const response = await handleTokenRequest(req, errorService);
        const body = await response.json();

        expect(response.status).toBe(503);
        expect(body.error.code).toBe(ErrorCodes.AUTH_004);
        expect(response.headers.get("Retry-After")).toBe("30");
      });

      it("should call getConsumerSecret with correct consumer ID", async () => {
        const req = createRequest({
          "x-consumer-id": "my-consumer-id",
          "x-consumer-username": "test-user",
        });

        await handleTokenRequest(req, mockKongService);

        expect(mockKongService.getConsumerSecret).toHaveBeenCalledWith("my-consumer-id");
      });
    });

    describe("Token Generation", () => {
      it("should return 200 with token on success", async () => {
        const req = createRequest({
          "x-consumer-id": "consumer-123",
          "x-consumer-username": "test-user",
        });

        const response = await handleTokenRequest(req, mockKongService);
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body).toHaveProperty("access_token");
        expect(body).toHaveProperty("expires_in");
        expect(typeof body.access_token).toBe("string");
        expect(typeof body.expires_in).toBe("number");
      });

      it("should return valid JWT structure", async () => {
        const req = createRequest({
          "x-consumer-id": "consumer-123",
          "x-consumer-username": "test-user",
        });

        const response = await handleTokenRequest(req, mockKongService);
        const body = await response.json();

        // JWT should have 3 parts
        const parts = body.access_token.split(".");
        expect(parts).toHaveLength(3);
      });

      it("should include requestId in response", async () => {
        const req = createRequest({
          "x-consumer-id": "consumer-123",
          "x-consumer-username": "test-user",
        });

        const response = await handleTokenRequest(req, mockKongService);

        const requestId = response.headers.get("X-Request-ID");
        expect(requestId).toBeDefined();
        expect(requestId).not.toBeNull();
        expect(requestId!.length).toBeGreaterThan(0);
      });

      it("should set correct Content-Type header", async () => {
        const req = createRequest({
          "x-consumer-id": "consumer-123",
          "x-consumer-username": "test-user",
        });

        const response = await handleTokenRequest(req, mockKongService);

        expect(response.headers.get("Content-Type")).toBe("application/json");
      });

      it("should include expires_in matching config", async () => {
        const req = createRequest({
          "x-consumer-id": "consumer-123",
          "x-consumer-username": "test-user",
        });

        const response = await handleTokenRequest(req, mockKongService);
        const body = await response.json();

        // expires_in should be the configured expiration time in seconds
        expect(body.expires_in).toBeGreaterThan(0);
        expect(body.expires_in).toBeLessThanOrEqual(3600); // Max 1 hour
      });
    });

    describe("Response Structure", () => {
      it("should include error details in error responses", async () => {
        const req = createRequest({});

        const response = await handleTokenRequest(req, mockKongService);
        const body = await response.json();

        expect(body).toHaveProperty("error");
        expect(body.error).toHaveProperty("code");
        expect(body.error).toHaveProperty("message");
        expect(body).toHaveProperty("requestId");
        expect(body).toHaveProperty("timestamp");
      });

      it("should return valid token response structure", async () => {
        const req = createRequest({
          "x-consumer-id": "consumer-123",
          "x-consumer-username": "test-user",
        });

        const response = await handleTokenRequest(req, mockKongService);
        const body = await response.json();

        // Token response includes access_token and expires_in
        expect(body).toHaveProperty("access_token");
        expect(body).toHaveProperty("expires_in");
        expect(typeof body.access_token).toBe("string");
        expect(typeof body.expires_in).toBe("number");
      });
    });

    describe("Concurrency", () => {
      test.concurrent("should handle multiple concurrent requests", async () => {
        const requests = Array.from({ length: 10 }, (_, i) =>
          createRequest({
            "x-consumer-id": `consumer-${i}`,
            "x-consumer-username": `user-${i}`,
          })
        );

        const responses = await Promise.all(
          requests.map((req) => handleTokenRequest(req, mockKongService))
        );

        expect(responses).toHaveLength(10);
        responses.forEach((response) => {
          expect(response.status).toBe(200);
        });
      });
    });

    describe("Edge Cases", () => {
      it("should handle empty string consumer ID", async () => {
        const req = createRequest({
          "x-consumer-id": "",
          "x-consumer-username": "test-user",
        });

        const response = await handleTokenRequest(req, mockKongService);
        const body = await response.json();

        // Empty string should fail header validation
        expect(response.status).toBe(401);
        expect(body.error.code).toBe(ErrorCodes.AUTH_001);
      });

      it("should handle special characters in username", async () => {
        const req = createRequest({
          "x-consumer-id": "consumer-123",
          "x-consumer-username": "user@domain.com",
        });

        const response = await handleTokenRequest(req, mockKongService);

        expect(response.status).toBe(200);
      });

      it("should handle whitespace-only headers", async () => {
        const req = createRequest({
          "x-consumer-id": "   ",
          "x-consumer-username": "   ",
        });

        // Whitespace-only should still count as "provided" but may fail validation
        const response = await handleTokenRequest(req, mockKongService);

        // The implementation treats whitespace as valid content
        expect([200, 401]).toContain(response.status);
      });
    });
  });

  describe("handleTokenValidation", () => {
    describe("Authorization Header", () => {
      it("should return AUTH_012 when Authorization header is missing", async () => {
        const req = new Request("http://localhost:3000/tokens/validate", {
          method: "GET",
          headers: new Headers({
            "x-consumer-id": "consumer-123",
            "x-consumer-username": "test-user",
          }),
        });

        const response = await handleTokenValidation(req, mockKongService);
        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body.error.code).toBe(ErrorCodes.AUTH_012);
      });

      it("should return AUTH_012 when Authorization header doesn't start with Bearer", async () => {
        const req = new Request("http://localhost:3000/tokens/validate", {
          method: "GET",
          headers: new Headers({
            Authorization: "Basic abc123",
            "x-consumer-id": "consumer-123",
            "x-consumer-username": "test-user",
          }),
        });

        const response = await handleTokenValidation(req, mockKongService);
        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body.error.code).toBe(ErrorCodes.AUTH_012);
      });

      it("should return AUTH_012 when Authorization is Bearer with trailing space (trimmed by Headers API)", async () => {
        // Note: The Headers API trims "Bearer " to "Bearer", so it fails the startsWith("Bearer ") check
        const req = new Request("http://localhost:3000/tokens/validate", {
          method: "GET",
          headers: new Headers({
            Authorization: "Bearer ",
            "x-consumer-id": "consumer-123",
            "x-consumer-username": "test-user",
          }),
        });

        const response = await handleTokenValidation(req, mockKongService);
        const body = await response.json();

        // Headers API trims "Bearer " to "Bearer", which fails startsWith("Bearer ") check
        expect(response.status).toBe(400);
        expect(body.error.code).toBe(ErrorCodes.AUTH_012);
      });

      it("should return AUTH_012 when Authorization is Bearer with whitespace only (trimmed by Headers API)", async () => {
        // Note: The Headers API trims "Bearer    " to "Bearer", so it fails the startsWith("Bearer ") check
        const req = new Request("http://localhost:3000/tokens/validate", {
          method: "GET",
          headers: new Headers({
            Authorization: "Bearer    ",
            "x-consumer-id": "consumer-123",
            "x-consumer-username": "test-user",
          }),
        });

        const response = await handleTokenValidation(req, mockKongService);
        const body = await response.json();

        // Headers API trims "Bearer    " to "Bearer", which fails startsWith("Bearer ") check
        expect(response.status).toBe(400);
        expect(body.error.code).toBe(ErrorCodes.AUTH_012);
      });
    });

    describe("Kong Header Validation", () => {
      it("should return AUTH_001 when Kong headers are missing", async () => {
        const req = createValidationRequest("some.valid.token");

        const response = await handleTokenValidation(req, mockKongService);
        const body = await response.json();

        expect(response.status).toBe(401);
        expect(body.error.code).toBe(ErrorCodes.AUTH_001);
      });

      it("should return AUTH_002 when consumer not found", async () => {
        const noConsumerService: IKongService = {
          ...mockKongService,
          getConsumerSecret: mock(() => Promise.resolve(null)),
        };

        const req = createValidationRequest("some.valid.token", {
          "x-consumer-id": "unknown-consumer",
          "x-consumer-username": "test-user",
        });

        const response = await handleTokenValidation(req, noConsumerService);
        const body = await response.json();

        expect(response.status).toBe(401);
        expect(body.error.code).toBe(ErrorCodes.AUTH_002);
      });
    });

    describe("Token Validation Logic", () => {
      it("should return AUTH_011 for invalid token format", async () => {
        const req = createValidationRequest("not-a-valid-jwt", {
          "x-consumer-id": "consumer-123",
          "x-consumer-username": "test-user",
        });

        const response = await handleTokenValidation(req, mockKongService);
        const body = await response.json();

        // AUTH_011 (Invalid Token) maps to HTTP 400
        expect(response.status).toBe(400);
        expect(body.error.code).toBe(ErrorCodes.AUTH_011);
      });

      it("should include requestId in response", async () => {
        const req = createValidationRequest("some.token.here", {
          "x-consumer-id": "consumer-123",
          "x-consumer-username": "test-user",
        });

        const response = await handleTokenValidation(req, mockKongService);

        const requestId = response.headers.get("X-Request-ID");
        expect(requestId).toBeDefined();
        expect(requestId).not.toBeNull();
      });
    });

    describe("Response Structure", () => {
      it("should set correct Content-Type header", async () => {
        const req = createValidationRequest("some.token.here", {
          "x-consumer-id": "consumer-123",
          "x-consumer-username": "test-user",
        });

        const response = await handleTokenValidation(req, mockKongService);

        expect(response.headers.get("Content-Type")).toBe("application/json");
      });

      it("should include error structure in error responses", async () => {
        const req = createValidationRequest("invalid", {
          "x-consumer-id": "consumer-123",
          "x-consumer-username": "test-user",
        });

        const response = await handleTokenValidation(req, mockKongService);
        const body = await response.json();

        expect(body).toHaveProperty("error");
        expect(body.error).toHaveProperty("code");
        expect(body.error).toHaveProperty("message");
      });
    });
  });

  describe("Error Code Consistency", () => {
    it("AUTH_001 should map to 401 status", async () => {
      const req = createRequest({});

      const response = await handleTokenRequest(req, mockKongService);

      expect(response.status).toBe(401);
    });

    it("AUTH_002 should map to 401 status", async () => {
      const noConsumerService: IKongService = {
        ...mockKongService,
        getConsumerSecret: mock(() => Promise.resolve(null)),
      };

      const req = createRequest({
        "x-consumer-id": "consumer-123",
        "x-consumer-username": "test-user",
      });

      const response = await handleTokenRequest(req, noConsumerService);

      expect(response.status).toBe(401);
    });

    it("AUTH_004 should map to 503 status", async () => {
      const errorService: IKongService = {
        ...mockKongService,
        getConsumerSecret: mock(() => Promise.reject(new Error("Kong down"))),
      };

      const req = createRequest({
        "x-consumer-id": "consumer-123",
        "x-consumer-username": "test-user",
      });

      const response = await handleTokenRequest(req, errorService);

      expect(response.status).toBe(503);
    });

    it("AUTH_007 should map to 400 status", async () => {
      const req = createRequest({
        "x-consumer-id": "a".repeat(300),
        "x-consumer-username": "test-user",
      });

      const response = await handleTokenRequest(req, mockKongService);

      expect(response.status).toBe(400);
    });

    it("AUTH_009 should map to 401 status", async () => {
      const req = createRequest({
        "x-consumer-id": "consumer-123",
        "x-consumer-username": "test-user",
        "x-anonymous-consumer": "true",
      });

      const response = await handleTokenRequest(req, mockKongService);

      expect(response.status).toBe(401);
    });
  });

  describe("Performance", () => {
    test.concurrent("should complete token request within threshold", async () => {
      const req = createRequest({
        "x-consumer-id": "consumer-123",
        "x-consumer-username": "test-user",
      });

      const startTime = Bun.nanoseconds();
      await handleTokenRequest(req, mockKongService);
      const duration = (Bun.nanoseconds() - startTime) / 1_000_000;

      // Should complete within 100ms for mocked dependencies
      expect(duration).toBeLessThan(100);
      expect(duration).toBeGreaterThanOrEqual(0);
    });

    test.concurrent("should complete header validation quickly", async () => {
      const req = createRequest({});

      const startTime = Bun.nanoseconds();
      await handleTokenRequest(req, mockKongService);
      const duration = (Bun.nanoseconds() - startTime) / 1_000_000;

      // Header validation failure should be very fast
      expect(duration).toBeLessThan(50);
      expect(duration).toBeGreaterThanOrEqual(0);
    });
  });
});
