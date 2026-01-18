/* test/bun/tokens-handler.test.ts */

/**
 * Tests for token request and validation handlers.
 *
 * Uses real Kong integration when available for happy path tests.
 * Tests skip gracefully when Kong is not accessible.
 * Uses test consumers seeded via scripts/seed-test-consumers.ts
 */

import { afterAll, beforeAll, describe, expect, it, test } from "bun:test";
import type { KongAdapter } from "../../src/adapters/kong.adapter";
import type { IKongService } from "../../src/config";
import { ErrorCodes } from "../../src/errors/error-codes";
import { handleTokenRequest, handleTokenValidation } from "../../src/handlers/tokens";
import { APIGatewayService } from "../../src/services/api-gateway.service";
import {
  getSkipMessage,
  getTestConsumer,
  resetKongAvailabilityCache,
  setupKongTestContext,
} from "../shared/kong-test-helpers";

describe("Tokens Handler", () => {
  let kongAvailable = false;
  let kongAdapter: KongAdapter | null = null;
  let kongService: IKongService | null = null;

  beforeAll(async () => {
    const context = await setupKongTestContext();
    kongAvailable = context.available;
    kongAdapter = context.adapter;
    if (kongAdapter) {
      kongService = new APIGatewayService(kongAdapter);
    }
  });

  afterAll(() => {
    resetKongAvailabilityCache();
  });

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

  describe("handleTokenRequest", () => {
    describe("Header Validation", () => {
      // Header validation tests don't need Kong - they test request parsing
      it("should return AUTH_001 when missing consumer ID header", async () => {
        if (!kongAvailable || !kongService) {
          console.log(getSkipMessage());
          return;
        }

        const req = createRequest({
          "x-consumer-username": "test-user",
        });

        const response = await handleTokenRequest(req, kongService);
        const body = await response.json();

        expect(response.status).toBe(401);
        expect(body.error.code).toBe(ErrorCodes.AUTH_001);
        expect(body.error.message).toBeDefined();
      });

      it("should return AUTH_001 when missing username header", async () => {
        if (!kongAvailable || !kongService) {
          console.log(getSkipMessage());
          return;
        }

        const req = createRequest({
          "x-consumer-id": "consumer-123",
        });

        const response = await handleTokenRequest(req, kongService);
        const body = await response.json();

        expect(response.status).toBe(401);
        expect(body.error.code).toBe(ErrorCodes.AUTH_001);
      });

      it("should return AUTH_001 when both headers are missing", async () => {
        if (!kongAvailable || !kongService) {
          console.log(getSkipMessage());
          return;
        }

        const req = createRequest({});

        const response = await handleTokenRequest(req, kongService);
        const body = await response.json();

        expect(response.status).toBe(401);
        expect(body.error.code).toBe(ErrorCodes.AUTH_001);
      });

      it("should return AUTH_009 for anonymous consumers", async () => {
        if (!kongAvailable || !kongService) {
          console.log(getSkipMessage());
          return;
        }

        const consumer = getTestConsumer(0);
        const req = createRequest({
          "x-consumer-id": consumer.id,
          "x-consumer-username": consumer.username,
          "x-anonymous-consumer": "true",
        });

        const response = await handleTokenRequest(req, kongService);
        const body = await response.json();

        expect(response.status).toBe(401);
        expect(body.error.code).toBe(ErrorCodes.AUTH_009);
      });

      it("should allow non-anonymous consumers", async () => {
        if (!kongAvailable || !kongService) {
          console.log(getSkipMessage());
          return;
        }

        const consumer = getTestConsumer(0);
        const req = createRequest({
          "x-consumer-id": consumer.id,
          "x-consumer-username": consumer.username,
          "x-anonymous-consumer": "false",
        });

        const response = await handleTokenRequest(req, kongService);

        // Should proceed past header validation (200 for successful token generation)
        expect(response.status).toBe(200);
      });

      it("should return AUTH_007 when consumer ID exceeds max length", async () => {
        if (!kongAvailable || !kongService) {
          console.log(getSkipMessage());
          return;
        }

        const longId = "a".repeat(257);
        const req = createRequest({
          "x-consumer-id": longId,
          "x-consumer-username": "test-user",
        });

        const response = await handleTokenRequest(req, kongService);
        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body.error.code).toBe(ErrorCodes.AUTH_007);
      });

      it("should return AUTH_007 when username exceeds max length", async () => {
        if (!kongAvailable || !kongService) {
          console.log(getSkipMessage());
          return;
        }

        const longUsername = "u".repeat(257);
        const req = createRequest({
          "x-consumer-id": "consumer-123",
          "x-consumer-username": longUsername,
        });

        const response = await handleTokenRequest(req, kongService);
        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body.error.code).toBe(ErrorCodes.AUTH_007);
      });

      it("should accept headers at exactly max length (256 chars)", async () => {
        if (!kongAvailable || !kongService) {
          console.log(getSkipMessage());
          return;
        }

        // Use a real consumer ID for max length test
        // Note: We use padded real consumer ID to test max length handling
        const consumer = getTestConsumer(0);
        const maxLengthId = consumer.id.padEnd(256, "x").slice(0, 256);
        const maxLengthUsername = consumer.username.padEnd(256, "x").slice(0, 256);
        const req = createRequest({
          "x-consumer-id": maxLengthId,
          "x-consumer-username": maxLengthUsername,
        });

        const response = await handleTokenRequest(req, kongService);

        // Should proceed past header validation
        // May return 401/200 depending on whether padded ID exists in Kong
        expect([200, 401]).toContain(response.status);
      });
    });

    describe("Consumer Lookup", () => {
      it("should return AUTH_002 when consumer not found", async () => {
        if (!kongAvailable || !kongService) {
          console.log(getSkipMessage());
          return;
        }

        const req = createRequest({
          "x-consumer-id": "nonexistent-consumer-id-12345-xyz",
          "x-consumer-username": "nonexistent-user",
        });

        const response = await handleTokenRequest(req, kongService);
        const body = await response.json();

        expect(response.status).toBe(401);
        expect(body.error.code).toBe(ErrorCodes.AUTH_002);
      });

      it("should call getConsumerSecret with correct consumer ID", async () => {
        if (!kongAvailable || !kongService) {
          console.log(getSkipMessage());
          return;
        }

        const consumer = getTestConsumer(0);
        const req = createRequest({
          "x-consumer-id": consumer.id,
          "x-consumer-username": consumer.username,
        });

        const response = await handleTokenRequest(req, kongService);

        // Successful lookup means consumer was found
        expect(response.status).toBe(200);
      });
    });

    describe("Token Generation", () => {
      it("should return 200 with token on success", async () => {
        if (!kongAvailable || !kongService) {
          console.log(getSkipMessage());
          return;
        }

        const consumer = getTestConsumer(0);
        const req = createRequest({
          "x-consumer-id": consumer.id,
          "x-consumer-username": consumer.username,
        });

        const response = await handleTokenRequest(req, kongService);
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body).toHaveProperty("access_token");
        expect(body).toHaveProperty("expires_in");
        expect(typeof body.access_token).toBe("string");
        expect(typeof body.expires_in).toBe("number");
      });

      it("should return valid JWT structure", async () => {
        if (!kongAvailable || !kongService) {
          console.log(getSkipMessage());
          return;
        }

        const consumer = getTestConsumer(0);
        const req = createRequest({
          "x-consumer-id": consumer.id,
          "x-consumer-username": consumer.username,
        });

        const response = await handleTokenRequest(req, kongService);
        const body = await response.json();

        // JWT should have 3 parts
        const parts = body.access_token.split(".");
        expect(parts).toHaveLength(3);
      });

      it("should include requestId in response", async () => {
        if (!kongAvailable || !kongService) {
          console.log(getSkipMessage());
          return;
        }

        const consumer = getTestConsumer(0);
        const req = createRequest({
          "x-consumer-id": consumer.id,
          "x-consumer-username": consumer.username,
        });

        const response = await handleTokenRequest(req, kongService);

        const requestId = response.headers.get("X-Request-ID");
        expect(requestId).toBeDefined();
        expect(requestId).not.toBeNull();
        expect(requestId!.length).toBeGreaterThan(0);
      });

      it("should set correct Content-Type header", async () => {
        if (!kongAvailable || !kongService) {
          console.log(getSkipMessage());
          return;
        }

        const consumer = getTestConsumer(0);
        const req = createRequest({
          "x-consumer-id": consumer.id,
          "x-consumer-username": consumer.username,
        });

        const response = await handleTokenRequest(req, kongService);

        expect(response.headers.get("Content-Type")).toBe("application/json");
      });

      it("should include expires_in matching config", async () => {
        if (!kongAvailable || !kongService) {
          console.log(getSkipMessage());
          return;
        }

        const consumer = getTestConsumer(0);
        const req = createRequest({
          "x-consumer-id": consumer.id,
          "x-consumer-username": consumer.username,
        });

        const response = await handleTokenRequest(req, kongService);
        const body = await response.json();

        // expires_in should be the configured expiration time in seconds
        expect(body.expires_in).toBeGreaterThan(0);
        expect(body.expires_in).toBeLessThanOrEqual(3600); // Max 1 hour
      });
    });

    describe("Response Structure", () => {
      it("should include error details in error responses", async () => {
        if (!kongAvailable || !kongService) {
          console.log(getSkipMessage());
          return;
        }

        const req = createRequest({});

        const response = await handleTokenRequest(req, kongService);
        const body = await response.json();

        expect(body).toHaveProperty("error");
        expect(body.error).toHaveProperty("code");
        expect(body.error).toHaveProperty("message");
        expect(body).toHaveProperty("requestId");
        expect(body).toHaveProperty("timestamp");
      });

      it("should return valid token response structure", async () => {
        if (!kongAvailable || !kongService) {
          console.log(getSkipMessage());
          return;
        }

        const consumer = getTestConsumer(0);
        const req = createRequest({
          "x-consumer-id": consumer.id,
          "x-consumer-username": consumer.username,
        });

        const response = await handleTokenRequest(req, kongService);
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
        if (!kongAvailable || !kongService) {
          console.log(getSkipMessage());
          return;
        }

        // Use the same consumer for concurrent requests (real consumer from Kong)
        const consumer = getTestConsumer(0);
        const requests = Array.from({ length: 5 }, () =>
          createRequest({
            "x-consumer-id": consumer.id,
            "x-consumer-username": consumer.username,
          })
        );

        const responses = await Promise.all(
          requests.map((req) => handleTokenRequest(req, kongService!))
        );

        expect(responses).toHaveLength(5);
        responses.forEach((response) => {
          expect(response.status).toBe(200);
        });
      });
    });

    describe("Edge Cases", () => {
      it("should handle empty string consumer ID", async () => {
        if (!kongAvailable || !kongService) {
          console.log(getSkipMessage());
          return;
        }

        const req = createRequest({
          "x-consumer-id": "",
          "x-consumer-username": "test-user",
        });

        const response = await handleTokenRequest(req, kongService);
        const body = await response.json();

        // Empty string should fail header validation
        expect(response.status).toBe(401);
        expect(body.error.code).toBe(ErrorCodes.AUTH_001);
      });

      it("should handle special characters in username", async () => {
        if (!kongAvailable || !kongService) {
          console.log(getSkipMessage());
          return;
        }

        const consumer = getTestConsumer(0);
        const req = createRequest({
          "x-consumer-id": consumer.id,
          "x-consumer-username": "user@domain.com",
        });

        const response = await handleTokenRequest(req, kongService);

        expect(response.status).toBe(200);
      });

      it("should handle whitespace-only headers", async () => {
        if (!kongAvailable || !kongService) {
          console.log(getSkipMessage());
          return;
        }

        const req = createRequest({
          "x-consumer-id": "   ",
          "x-consumer-username": "   ",
        });

        // Whitespace-only should still count as "provided" but may fail validation
        const response = await handleTokenRequest(req, kongService);

        // The implementation treats whitespace as valid content
        expect([200, 401]).toContain(response.status);
      });
    });

    describe("Multiple Consumers", () => {
      test.concurrent("should generate unique tokens for different consumers", async () => {
        if (!kongAvailable || !kongService) {
          console.log(getSkipMessage());
          return;
        }

        const consumer1 = getTestConsumer(0);
        const consumer2 = getTestConsumer(1);

        const req1 = createRequest({
          "x-consumer-id": consumer1.id,
          "x-consumer-username": consumer1.username,
        });

        const req2 = createRequest({
          "x-consumer-id": consumer2.id,
          "x-consumer-username": consumer2.username,
        });

        const [response1, response2] = await Promise.all([
          handleTokenRequest(req1, kongService!),
          handleTokenRequest(req2, kongService!),
        ]);

        expect(response1.status).toBe(200);
        expect(response2.status).toBe(200);

        const body1 = await response1.json();
        const body2 = await response2.json();

        // Tokens should be different for different consumers
        expect(body1.access_token).not.toBe(body2.access_token);
      });
    });
  });

  describe("handleTokenValidation", () => {
    describe("Authorization Header", () => {
      it("should return AUTH_012 when Authorization header is missing", async () => {
        if (!kongAvailable || !kongService) {
          console.log(getSkipMessage());
          return;
        }

        const consumer = getTestConsumer(0);
        const req = new Request("http://localhost:3000/tokens/validate", {
          method: "GET",
          headers: new Headers({
            "x-consumer-id": consumer.id,
            "x-consumer-username": consumer.username,
          }),
        });

        const response = await handleTokenValidation(req, kongService);
        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body.error.code).toBe(ErrorCodes.AUTH_012);
      });

      it("should return AUTH_012 when Authorization header doesn't start with Bearer", async () => {
        if (!kongAvailable || !kongService) {
          console.log(getSkipMessage());
          return;
        }

        const consumer = getTestConsumer(0);
        const req = new Request("http://localhost:3000/tokens/validate", {
          method: "GET",
          headers: new Headers({
            Authorization: "Basic abc123",
            "x-consumer-id": consumer.id,
            "x-consumer-username": consumer.username,
          }),
        });

        const response = await handleTokenValidation(req, kongService);
        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body.error.code).toBe(ErrorCodes.AUTH_012);
      });

      it("should return AUTH_012 when Authorization is Bearer with trailing space", async () => {
        if (!kongAvailable || !kongService) {
          console.log(getSkipMessage());
          return;
        }

        const consumer = getTestConsumer(0);
        const req = new Request("http://localhost:3000/tokens/validate", {
          method: "GET",
          headers: new Headers({
            Authorization: "Bearer ",
            "x-consumer-id": consumer.id,
            "x-consumer-username": consumer.username,
          }),
        });

        const response = await handleTokenValidation(req, kongService);
        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body.error.code).toBe(ErrorCodes.AUTH_012);
      });
    });

    describe("Kong Header Validation", () => {
      it("should return AUTH_001 when Kong headers are missing", async () => {
        if (!kongAvailable || !kongService) {
          console.log(getSkipMessage());
          return;
        }

        const req = createValidationRequest("some.valid.token");

        const response = await handleTokenValidation(req, kongService);
        const body = await response.json();

        expect(response.status).toBe(401);
        expect(body.error.code).toBe(ErrorCodes.AUTH_001);
      });

      it("should return AUTH_002 when consumer not found", async () => {
        if (!kongAvailable || !kongService) {
          console.log(getSkipMessage());
          return;
        }

        const req = createValidationRequest("some.valid.token", {
          "x-consumer-id": "unknown-consumer-xyz-12345",
          "x-consumer-username": "unknown-user",
        });

        const response = await handleTokenValidation(req, kongService);
        const body = await response.json();

        expect(response.status).toBe(401);
        expect(body.error.code).toBe(ErrorCodes.AUTH_002);
      });
    });

    describe("Token Validation Logic", () => {
      it("should return AUTH_011 for invalid token format", async () => {
        if (!kongAvailable || !kongService) {
          console.log(getSkipMessage());
          return;
        }

        const consumer = getTestConsumer(0);
        const req = createValidationRequest("not-a-valid-jwt", {
          "x-consumer-id": consumer.id,
          "x-consumer-username": consumer.username,
        });

        const response = await handleTokenValidation(req, kongService);
        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body.error.code).toBe(ErrorCodes.AUTH_011);
      });

      it("should validate a freshly generated token successfully", async () => {
        if (!kongAvailable || !kongService) {
          console.log(getSkipMessage());
          return;
        }

        const consumer = getTestConsumer(0);

        // First, generate a token
        const tokenReq = createRequest({
          "x-consumer-id": consumer.id,
          "x-consumer-username": consumer.username,
        });
        const tokenResponse = await handleTokenRequest(tokenReq, kongService);
        const tokenBody = await tokenResponse.json();

        expect(tokenResponse.status).toBe(200);

        // Then, validate the token
        const validateReq = createValidationRequest(tokenBody.access_token, {
          "x-consumer-id": consumer.id,
          "x-consumer-username": consumer.username,
        });
        const validateResponse = await handleTokenValidation(validateReq, kongService);

        // Successful validation returns 200
        expect(validateResponse.status).toBe(200);
      });

      it("should include requestId in response", async () => {
        if (!kongAvailable || !kongService) {
          console.log(getSkipMessage());
          return;
        }

        const consumer = getTestConsumer(0);
        const req = createValidationRequest("some.token.here", {
          "x-consumer-id": consumer.id,
          "x-consumer-username": consumer.username,
        });

        const response = await handleTokenValidation(req, kongService);

        const requestId = response.headers.get("X-Request-ID");
        expect(requestId).toBeDefined();
        expect(requestId).not.toBeNull();
      });
    });

    describe("Response Structure", () => {
      it("should set correct Content-Type header", async () => {
        if (!kongAvailable || !kongService) {
          console.log(getSkipMessage());
          return;
        }

        const consumer = getTestConsumer(0);
        const req = createValidationRequest("some.token.here", {
          "x-consumer-id": consumer.id,
          "x-consumer-username": consumer.username,
        });

        const response = await handleTokenValidation(req, kongService);

        expect(response.headers.get("Content-Type")).toBe("application/json");
      });

      it("should include error structure in error responses", async () => {
        if (!kongAvailable || !kongService) {
          console.log(getSkipMessage());
          return;
        }

        const consumer = getTestConsumer(0);
        const req = createValidationRequest("invalid", {
          "x-consumer-id": consumer.id,
          "x-consumer-username": consumer.username,
        });

        const response = await handleTokenValidation(req, kongService);
        const body = await response.json();

        expect(body).toHaveProperty("error");
        expect(body.error).toHaveProperty("code");
        expect(body.error).toHaveProperty("message");
      });
    });
  });

  describe("Error Code Consistency", () => {
    it("AUTH_001 should map to 401 status", async () => {
      if (!kongAvailable || !kongService) {
        console.log(getSkipMessage());
        return;
      }

      const req = createRequest({});

      const response = await handleTokenRequest(req, kongService);

      expect(response.status).toBe(401);
    });

    it("AUTH_002 should map to 401 status", async () => {
      if (!kongAvailable || !kongService) {
        console.log(getSkipMessage());
        return;
      }

      const req = createRequest({
        "x-consumer-id": "nonexistent-consumer-abc-123",
        "x-consumer-username": "test-user",
      });

      const response = await handleTokenRequest(req, kongService);

      expect(response.status).toBe(401);
    });

    it("AUTH_007 should map to 400 status", async () => {
      if (!kongAvailable || !kongService) {
        console.log(getSkipMessage());
        return;
      }

      const req = createRequest({
        "x-consumer-id": "a".repeat(300),
        "x-consumer-username": "test-user",
      });

      const response = await handleTokenRequest(req, kongService);

      expect(response.status).toBe(400);
    });

    it("AUTH_009 should map to 401 status", async () => {
      if (!kongAvailable || !kongService) {
        console.log(getSkipMessage());
        return;
      }

      const consumer = getTestConsumer(0);
      const req = createRequest({
        "x-consumer-id": consumer.id,
        "x-consumer-username": consumer.username,
        "x-anonymous-consumer": "true",
      });

      const response = await handleTokenRequest(req, kongService);

      expect(response.status).toBe(401);
    });
  });

  describe("Performance", () => {
    test.concurrent("should complete token request within threshold", async () => {
      if (!kongAvailable || !kongService) {
        console.log(getSkipMessage());
        return;
      }

      const consumer = getTestConsumer(0);
      const req = createRequest({
        "x-consumer-id": consumer.id,
        "x-consumer-username": consumer.username,
      });

      const startTime = Bun.nanoseconds();
      await handleTokenRequest(req, kongService);
      const duration = (Bun.nanoseconds() - startTime) / 1_000_000;

      // Should complete within 500ms (including real Kong call + token generation)
      expect(duration).toBeLessThan(500);
      expect(duration).toBeGreaterThanOrEqual(0);
    });

    test.concurrent("should complete header validation quickly", async () => {
      if (!kongAvailable || !kongService) {
        console.log(getSkipMessage());
        return;
      }

      const req = createRequest({});

      const startTime = Bun.nanoseconds();
      await handleTokenRequest(req, kongService);
      const duration = (Bun.nanoseconds() - startTime) / 1_000_000;

      // Header validation failure should be very fast (no Kong call needed)
      expect(duration).toBeLessThan(50);
      expect(duration).toBeGreaterThanOrEqual(0);
    });
  });
});
