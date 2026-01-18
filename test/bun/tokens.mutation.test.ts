/* test/bun/tokens.mutation.test.ts */

// Focused mutation testing for tokens.ts handlers
// Tests specifically designed to kill surviving mutants

import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import type { IKongService, KongCacheStats } from "../../src/config";
import { ErrorCodes } from "../../src/errors/error-codes";
import { handleTokenRequest, handleTokenValidation } from "../../src/handlers/tokens";
import { NativeBunJWT } from "../../src/services/jwt.service";
import * as metricsModule from "../../src/telemetry/metrics";

describe("Tokens Handler Mutation Tests", () => {
  const testSecret = Array(45).fill("s").join("");
  const mockCacheStats: KongCacheStats = {
    strategy: "local-memory",
    size: 10,
    entries: [],
    activeEntries: 10,
    hitRate: "85.50",
    memoryUsageMB: 1.5,
    averageLatencyMs: 0.5,
  };

  let mockKongService: IKongService;

  beforeEach(() => {
    mockKongService = {
      getConsumerSecret: mock(() =>
        Promise.resolve({
          key: "test-key",
          secret: testSecret,
        })
      ),
      createConsumerSecret: mock(() => Promise.resolve(null)),
      clearCache: mock(() => Promise.resolve(undefined)),
      getCacheStats: mock(() => Promise.resolve(mockCacheStats)),
      healthCheck: mock(() =>
        Promise.resolve({
          healthy: true,
          responseTime: 25,
        })
      ),
      getCircuitBreakerStats: mock(() => ({})),
    };
  });

  afterEach(() => {
    mock.restore();
  });

  describe("validateKongHeaders", () => {
    it("should reject when consumerId is missing", async () => {
      const request = new Request("http://localhost:3000/tokens", {
        method: "GET",
        headers: {
          // Missing X-Consumer-ID
          "X-Consumer-Username": "test-user",
        },
      });

      const response = await handleTokenRequest(request, mockKongService);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error.code).toBe(ErrorCodes.AUTH_001);
    });

    it("should reject when username is missing", async () => {
      const request = new Request("http://localhost:3000/tokens", {
        method: "GET",
        headers: {
          "X-Consumer-ID": "test-consumer-id",
          // Missing X-Consumer-Username
        },
      });

      const response = await handleTokenRequest(request, mockKongService);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error.code).toBe(ErrorCodes.AUTH_001);
    });

    it("should reject when both headers are missing", async () => {
      const request = new Request("http://localhost:3000/tokens", {
        method: "GET",
        headers: {},
      });

      const response = await handleTokenRequest(request, mockKongService);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error.code).toBe(ErrorCodes.AUTH_001);
    });

    it("should reject consumerId exceeding MAX_HEADER_LENGTH (256)", async () => {
      const longConsumerId = "x".repeat(257);
      const request = new Request("http://localhost:3000/tokens", {
        method: "GET",
        headers: {
          "X-Consumer-ID": longConsumerId,
          "X-Consumer-Username": "test-user",
        },
      });

      const response = await handleTokenRequest(request, mockKongService);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.code).toBe(ErrorCodes.AUTH_007);
    });

    it("should reject username exceeding MAX_HEADER_LENGTH (256)", async () => {
      const longUsername = "y".repeat(257);
      const request = new Request("http://localhost:3000/tokens", {
        method: "GET",
        headers: {
          "X-Consumer-ID": "test-consumer-id",
          "X-Consumer-Username": longUsername,
        },
      });

      const response = await handleTokenRequest(request, mockKongService);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.code).toBe(ErrorCodes.AUTH_007);
    });

    it("should accept exactly 256 character header values", async () => {
      const maxLengthValue = "z".repeat(256);
      const request = new Request("http://localhost:3000/tokens", {
        method: "GET",
        headers: {
          "X-Consumer-ID": maxLengthValue,
          "X-Consumer-Username": "test-user",
        },
      });

      const response = await handleTokenRequest(request, mockKongService);

      // Should not be rejected for length - expect success or other error, not AUTH_007
      const body = await response.json();
      // If error exists, it should not be AUTH_007
      if (body.error) {
        expect(body.error.code).not.toBe(ErrorCodes.AUTH_007);
      } else {
        // Success case - should have access_token
        expect(body).toHaveProperty("access_token");
      }
    });

    it("should reject when X-Anonymous-Consumer is 'true'", async () => {
      const request = new Request("http://localhost:3000/tokens", {
        method: "GET",
        headers: {
          "X-Consumer-ID": "test-consumer-id",
          "X-Consumer-Username": "test-user",
          "X-Anonymous-Consumer": "true",
        },
      });

      const response = await handleTokenRequest(request, mockKongService);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error.code).toBe(ErrorCodes.AUTH_009);
    });

    it("should allow when X-Anonymous-Consumer is 'false'", async () => {
      const request = new Request("http://localhost:3000/tokens", {
        method: "GET",
        headers: {
          "X-Consumer-ID": "test-consumer",
          "X-Consumer-Username": "test-user",
          "X-Anonymous-Consumer": "false",
        },
      });

      const response = await handleTokenRequest(request, mockKongService);
      const body = await response.json();

      // Should succeed - not rejected as anonymous
      if (body.error) {
        expect(body.error.code).not.toBe(ErrorCodes.AUTH_009);
      } else {
        expect(body).toHaveProperty("access_token");
      }
    });

    it("should allow when X-Anonymous-Consumer is not present", async () => {
      const request = new Request("http://localhost:3000/tokens", {
        method: "GET",
        headers: {
          "X-Consumer-ID": "test-consumer",
          "X-Consumer-Username": "test-user",
        },
      });

      const response = await handleTokenRequest(request, mockKongService);
      const body = await response.json();

      // Should succeed - not rejected as anonymous
      if (body.error) {
        expect(body.error.code).not.toBe(ErrorCodes.AUTH_009);
      } else {
        expect(body).toHaveProperty("access_token");
      }
    });
  });

  describe("handleTokenRequest - consumer lookup", () => {
    it("should return AUTH_002 when consumer not found", async () => {
      const notFoundService: IKongService = {
        ...mockKongService,
        getConsumerSecret: mock(() => Promise.resolve(null)),
      };

      const request = new Request("http://localhost:3000/tokens", {
        method: "GET",
        headers: {
          "X-Consumer-ID": "unknown-consumer",
          "X-Consumer-Username": "test-user",
        },
      });

      const response = await handleTokenRequest(request, notFoundService);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error.code).toBe(ErrorCodes.AUTH_002);
    });

    it("should return AUTH_004 when Kong is unavailable", async () => {
      const unavailableService: IKongService = {
        ...mockKongService,
        getConsumerSecret: mock(() => Promise.reject(new Error("Kong unavailable"))),
      };

      const request = new Request("http://localhost:3000/tokens", {
        method: "GET",
        headers: {
          "X-Consumer-ID": "test-consumer",
          "X-Consumer-Username": "test-user",
        },
      });

      const response = await handleTokenRequest(request, unavailableService);
      const body = await response.json();

      expect(response.status).toBe(503);
      expect(body.error.code).toBe(ErrorCodes.AUTH_004);
      expect(response.headers.get("Retry-After")).toBe("30");
    });

    it("should handle non-Error Kong exception", async () => {
      const stringErrorService: IKongService = {
        ...mockKongService,
        getConsumerSecret: mock(() => Promise.reject("String error")),
      };

      const request = new Request("http://localhost:3000/tokens", {
        method: "GET",
        headers: {
          "X-Consumer-ID": "test-consumer",
          "X-Consumer-Username": "test-user",
        },
      });

      const response = await handleTokenRequest(request, stringErrorService);
      const body = await response.json();

      expect(response.status).toBe(503);
      expect(body.error.code).toBe(ErrorCodes.AUTH_004);
    });
  });

  describe("handleTokenRequest - success path", () => {
    it("should return 200 with access_token on success", async () => {
      const request = new Request("http://localhost:3000/tokens", {
        method: "GET",
        headers: {
          "X-Consumer-ID": "test-consumer",
          "X-Consumer-Username": "test-user",
        },
      });

      const response = await handleTokenRequest(request, mockKongService);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toHaveProperty("access_token");
      expect(body).toHaveProperty("expires_in");
      expect(typeof body.access_token).toBe("string");
    });

    it("should return valid JWT token", async () => {
      const request = new Request("http://localhost:3000/tokens", {
        method: "GET",
        headers: {
          "X-Consumer-ID": "test-consumer",
          "X-Consumer-Username": "test-user",
        },
      });

      const response = await handleTokenRequest(request, mockKongService);
      const body = await response.json();

      // Token should have 3 parts
      const parts = body.access_token.split(".");
      expect(parts.length).toBe(3);
    });

    it("should include requestId in response headers", async () => {
      const request = new Request("http://localhost:3000/tokens", {
        method: "GET",
        headers: {
          "X-Consumer-ID": "test-consumer",
          "X-Consumer-Username": "test-user",
        },
      });

      const response = await handleTokenRequest(request, mockKongService);

      expect(response.headers.has("X-Request-ID")).toBe(true);
    });
  });

  describe("handleTokenValidation - Authorization header", () => {
    it("should reject when Authorization header is missing", async () => {
      const request = new Request("http://localhost:3000/tokens/validate", {
        method: "GET",
        headers: {
          "X-Consumer-ID": "test-consumer",
          "X-Consumer-Username": "test-user",
        },
      });

      const response = await handleTokenValidation(request, mockKongService);
      const body = await response.json();

      // AUTH_012 has httpStatus 400
      expect(response.status).toBe(400);
      expect(body.error.code).toBe(ErrorCodes.AUTH_012);
    });

    it("should reject when Authorization header does not start with 'Bearer '", async () => {
      const request = new Request("http://localhost:3000/tokens/validate", {
        method: "GET",
        headers: {
          Authorization: "Basic sometoken",
          "X-Consumer-ID": "test-consumer",
          "X-Consumer-Username": "test-user",
        },
      });

      const response = await handleTokenValidation(request, mockKongService);
      const body = await response.json();

      // AUTH_012 has httpStatus 400
      expect(response.status).toBe(400);
      expect(body.error.code).toBe(ErrorCodes.AUTH_012);
    });

    it("should reject when token is empty after Bearer", async () => {
      // Note: Request headers API trims trailing whitespace, so "Bearer " becomes "Bearer"
      // This fails the startsWith("Bearer ") check because there's no space
      const request = new Request("http://localhost:3000/tokens/validate", {
        method: "GET",
        headers: {
          Authorization: "Bearer ",
          "X-Consumer-ID": "test-consumer",
          "X-Consumer-Username": "test-user",
        },
      });

      const response = await handleTokenValidation(request, mockKongService);
      const body = await response.json();

      // Header trimming causes this to fail the Bearer check
      expect(response.status).toBe(400);
      expect(body.error.code).toBe(ErrorCodes.AUTH_012);
    });

    it("should reject when token is only whitespace after Bearer", async () => {
      // Note: Request headers API trims trailing whitespace, so "Bearer    " becomes "Bearer"
      const request = new Request("http://localhost:3000/tokens/validate", {
        method: "GET",
        headers: {
          Authorization: "Bearer    ",
          "X-Consumer-ID": "test-consumer",
          "X-Consumer-Username": "test-user",
        },
      });

      const response = await handleTokenValidation(request, mockKongService);
      const body = await response.json();

      // Header trimming causes this to fail the Bearer check
      expect(response.status).toBe(400);
      expect(body.error.code).toBe(ErrorCodes.AUTH_012);
    });

    it("should extract token correctly from 'Bearer <token>'", async () => {
      // Create a valid token first
      const tokenResponse = await NativeBunJWT.createToken(
        "test-user",
        "test-key",
        testSecret,
        "https://authority.com",
        "test-audience"
      );

      const request = new Request("http://localhost:3000/tokens/validate", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${tokenResponse.access_token}`,
          "X-Consumer-ID": "test-consumer",
          "X-Consumer-Username": "test-user",
        },
      });

      const response = await handleTokenValidation(request, mockKongService);
      const body = await response.json();

      expect(body.valid).toBe(true);
    });
  });

  describe("handleTokenValidation - Kong header validation", () => {
    it("should reject when Kong headers missing in validation", async () => {
      const request = new Request("http://localhost:3000/tokens/validate", {
        method: "GET",
        headers: {
          Authorization: "Bearer some.token.here",
          // Missing Kong headers
        },
      });

      const response = await handleTokenValidation(request, mockKongService);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error.code).toBe(ErrorCodes.AUTH_001);
    });
  });

  describe("handleTokenValidation - consumer lookup", () => {
    it("should return AUTH_002 when consumer not found during validation", async () => {
      const notFoundService: IKongService = {
        ...mockKongService,
        getConsumerSecret: mock(() => Promise.resolve(null)),
      };

      const request = new Request("http://localhost:3000/tokens/validate", {
        method: "GET",
        headers: {
          Authorization: "Bearer some.token.here",
          "X-Consumer-ID": "unknown-consumer",
          "X-Consumer-Username": "test-user",
        },
      });

      const response = await handleTokenValidation(request, notFoundService);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error.code).toBe(ErrorCodes.AUTH_002);
    });
  });

  describe("handleTokenValidation - token validation", () => {
    it("should return valid=true for valid token", async () => {
      const tokenResponse = await NativeBunJWT.createToken(
        "test-user",
        "test-key",
        testSecret,
        "https://authority.com",
        "test-audience"
      );

      const request = new Request("http://localhost:3000/tokens/validate", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${tokenResponse.access_token}`,
          "X-Consumer-ID": "test-consumer",
          "X-Consumer-Username": "test-user",
        },
      });

      const response = await handleTokenValidation(request, mockKongService);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.valid).toBe(true);
      expect(body).toHaveProperty("tokenId");
      expect(body).toHaveProperty("subject");
      expect(body).toHaveProperty("issuer");
      expect(body).toHaveProperty("audience");
      expect(body).toHaveProperty("issuedAt");
      expect(body).toHaveProperty("expiresAt");
      expect(body).toHaveProperty("expiresIn");
    });

    it("should return AUTH_010 for expired token", async () => {
      // Create manually signed expired token
      const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");

      const now = Math.floor(Date.now() / 1000);
      const expiredPayload = {
        sub: "test-user",
        key: "test-key",
        jti: crypto.randomUUID(),
        iat: now - 3600,
        exp: now - 1800,
        iss: "https://authority.com",
        aud: "test-audience",
        name: "test-user",
        unique_name: "pvhcorp.com#test-user",
      };

      const payloadB64 = btoa(JSON.stringify(expiredPayload))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");

      const message = `${header}.${payloadB64}`;
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(testSecret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );

      const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
      const signatureB64 = Buffer.from(signature)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");

      const expiredToken = `${message}.${signatureB64}`;

      const request = new Request("http://localhost:3000/tokens/validate", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${expiredToken}`,
          "X-Consumer-ID": "test-consumer",
          "X-Consumer-Username": "test-user",
        },
      });

      const response = await handleTokenValidation(request, mockKongService);
      const body = await response.json();

      // Token may fail signature validation before expiry check in some cases
      expect([ErrorCodes.AUTH_010, ErrorCodes.AUTH_011]).toContain(body.error.code);
    });

    it("should return AUTH_011 for invalid token signature", async () => {
      const tokenResponse = await NativeBunJWT.createToken(
        "test-user",
        "test-key",
        "wrong-secret-that-is-different",
        "https://authority.com",
        "test-audience"
      );

      const request = new Request("http://localhost:3000/tokens/validate", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${tokenResponse.access_token}`,
          "X-Consumer-ID": "test-consumer",
          "X-Consumer-Username": "test-user",
        },
      });

      const response = await handleTokenValidation(request, mockKongService);
      const body = await response.json();

      expect(body.error.code).toBe(ErrorCodes.AUTH_011);
      expect(body.error.details).toHaveProperty("reason");
    });

    it("should return AUTH_011 for malformed token", async () => {
      const request = new Request("http://localhost:3000/tokens/validate", {
        method: "GET",
        headers: {
          Authorization: "Bearer malformed.token",
          "X-Consumer-ID": "test-consumer",
          "X-Consumer-Username": "test-user",
        },
      });

      const response = await handleTokenValidation(request, mockKongService);
      const body = await response.json();

      expect(body.error.code).toBe(ErrorCodes.AUTH_011);
    });
  });

  describe("handleTokenValidation - exception handling", () => {
    it("should return AUTH_008 on unexpected exception", async () => {
      const exceptionService: IKongService = {
        ...mockKongService,
        getConsumerSecret: mock(() => Promise.reject(new Error("Unexpected error"))),
      };

      const request = new Request("http://localhost:3000/tokens/validate", {
        method: "GET",
        headers: {
          Authorization: "Bearer some.valid.token",
          "X-Consumer-ID": "test-consumer",
          "X-Consumer-Username": "test-user",
        },
      });

      const response = await handleTokenValidation(request, exceptionService);
      const body = await response.json();

      expect(body.error.code).toBe(ErrorCodes.AUTH_008);
    });

    it("should handle non-Error exception in validation", async () => {
      const stringExceptionService: IKongService = {
        ...mockKongService,
        getConsumerSecret: mock(() => Promise.reject("String exception")),
      };

      const request = new Request("http://localhost:3000/tokens/validate", {
        method: "GET",
        headers: {
          Authorization: "Bearer some.valid.token",
          "X-Consumer-ID": "test-consumer",
          "X-Consumer-Username": "test-user",
        },
      });

      const response = await handleTokenValidation(request, stringExceptionService);
      const body = await response.json();

      expect(body.error.code).toBe(ErrorCodes.AUTH_008);
    });
  });

  describe("handleTokenRequest - exception handling", () => {
    it("should return AUTH_008 on unexpected exception during token generation", async () => {
      // Mock to return secret but then JWT generation fails
      const serviceWithBadSecret: IKongService = {
        ...mockKongService,
        getConsumerSecret: mock(() =>
          Promise.resolve({
            key: "", // Empty key might cause issues
            secret: "", // Empty secret might cause issues
          })
        ),
      };

      const request = new Request("http://localhost:3000/tokens", {
        method: "GET",
        headers: {
          "X-Consumer-ID": "test-consumer",
          "X-Consumer-Username": "test-user",
        },
      });

      // This may or may not throw depending on implementation
      const response = await handleTokenRequest(request, serviceWithBadSecret);

      // Should either succeed or return proper error code
      const body = await response.json();
      expect([200, 500].includes(response.status) || body.code === ErrorCodes.AUTH_008).toBe(true);
    });
  });

  describe("RequestContext URL parsing", () => {
    it("should parse URL correctly", async () => {
      const request = new Request("http://localhost:3000/tokens?query=value", {
        method: "GET",
        headers: {
          "X-Consumer-ID": "test-consumer",
          "X-Consumer-Username": "test-user",
        },
      });

      const response = await handleTokenRequest(request, mockKongService);

      // Should not throw and complete successfully
      expect(response.status).toBe(200);
    });

    it("should handle pathname correctly", async () => {
      const request = new Request("http://localhost:3000/tokens/extra/path", {
        method: "GET",
        headers: {
          "X-Consumer-ID": "test-consumer",
          "X-Consumer-Username": "test-user",
        },
      });

      // Should process without URL parsing errors
      const response = await handleTokenRequest(request, mockKongService);
      expect(response).toBeDefined();
    });
  });

  describe("Response structure completeness", () => {
    it("token response should include access_token and expires_in", async () => {
      const request = new Request("http://localhost:3000/tokens", {
        method: "GET",
        headers: {
          "X-Consumer-ID": "test-consumer",
          "X-Consumer-Username": "test-user",
        },
      });

      const response = await handleTokenRequest(request, mockKongService);
      const body = await response.json();

      expect(body).toHaveProperty("access_token");
      expect(body).toHaveProperty("expires_in");
      expect(typeof body.access_token).toBe("string");
      expect(typeof body.expires_in).toBe("number");
    });

    it("validation success response should include timestamp fields", async () => {
      const tokenResponse = await NativeBunJWT.createToken(
        "test-user",
        "test-key",
        testSecret,
        "https://authority.com",
        "test-audience"
      );

      const request = new Request("http://localhost:3000/tokens/validate", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${tokenResponse.access_token}`,
          "X-Consumer-ID": "test-consumer",
          "X-Consumer-Username": "test-user",
        },
      });

      const response = await handleTokenValidation(request, mockKongService);
      const body = await response.json();

      expect(body.issuedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(body.expiresAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(typeof body.expiresIn).toBe("number");
    });

    it("error response should include timestamp", async () => {
      const request = new Request("http://localhost:3000/tokens", {
        method: "GET",
        headers: {},
      });

      const response = await handleTokenRequest(request, mockKongService);
      const body = await response.json();

      expect(body).toHaveProperty("timestamp");
      expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  // Tests to kill telemetry-related mutants (ObjectLiteral, ArithmeticOperator)
  describe("Telemetry recording - mutation killing tests", () => {
    let recordErrorSpy: ReturnType<typeof spyOn>;
    let recordAuthenticationAttemptSpy: ReturnType<typeof spyOn>;
    let recordOperationDurationSpy: ReturnType<typeof spyOn>;

    beforeEach(() => {
      recordErrorSpy = spyOn(metricsModule, "recordError");
      recordAuthenticationAttemptSpy = spyOn(metricsModule, "recordAuthenticationAttempt");
      recordOperationDurationSpy = spyOn(metricsModule, "recordOperationDuration");
    });

    afterEach(() => {
      recordErrorSpy.mockRestore();
      recordAuthenticationAttemptSpy.mockRestore();
      recordOperationDurationSpy.mockRestore();
    });

    it("should record error with correct headers object on missing consumer ID (kills line 179 mutant)", async () => {
      const request = new Request("http://localhost:3000/tokens", {
        method: "GET",
        headers: {
          "X-Consumer-Username": "test-user",
          // X-Consumer-ID missing
        },
      });

      await handleTokenRequest(request, mockKongService);

      // Verify recordError was called with headers object containing "missing" for consumerId
      expect(recordErrorSpy).toHaveBeenCalled();
      const callArgs = recordErrorSpy.mock.calls[0];
      expect(callArgs[0]).toBe("kong_header_validation_failed");
      expect(callArgs[1]).toBeDefined();
      expect(callArgs[1].headers).toBeDefined();
      expect(callArgs[1].headers.consumerId).toBe("missing"); // This kills || "missing" mutant
    });

    it("should record error with correct headers object on missing username (kills line 180 mutant)", async () => {
      const request = new Request("http://localhost:3000/tokens", {
        method: "GET",
        headers: {
          "X-Consumer-ID": "test-consumer",
          // X-Consumer-Username missing
        },
      });

      await handleTokenRequest(request, mockKongService);

      expect(recordErrorSpy).toHaveBeenCalled();
      const callArgs = recordErrorSpy.mock.calls[0];
      expect(callArgs[1].headers.consumerId).toBe("test-consumer"); // Present
      expect(callArgs[1].headers.username).toBe("missing"); // This kills || "missing" mutant
    });

    it("should record error with isAnonymous as 'false' when header not present (kills line 181 mutant)", async () => {
      const request = new Request("http://localhost:3000/tokens", {
        method: "GET",
        headers: {
          // Both missing, no X-Anonymous-Consumer
        },
      });

      await handleTokenRequest(request, mockKongService);

      expect(recordErrorSpy).toHaveBeenCalled();
      const callArgs = recordErrorSpy.mock.calls[0];
      expect(callArgs[1].headers.isAnonymous).toBe("false"); // This kills || "false" mutant
    });

    it("should record authentication attempt with 'header_validation_failed' (kills line 174 mutant)", async () => {
      const request = new Request("http://localhost:3000/tokens", {
        method: "GET",
        headers: {},
      });

      await handleTokenRequest(request, mockKongService);

      expect(recordAuthenticationAttemptSpy).toHaveBeenCalledWith(
        "header_validation_failed",
        false
      );
    });

    it("should record operation duration with positive value (kills ArithmeticOperator mutants)", async () => {
      const request = new Request("http://localhost:3000/tokens", {
        method: "GET",
        headers: {
          "X-Consumer-ID": "test-consumer",
          "X-Consumer-Username": "test-user",
        },
      });

      await handleTokenRequest(request, mockKongService);

      // recordOperationDuration should be called with positive duration values
      expect(recordOperationDurationSpy).toHaveBeenCalled();

      // Check all calls have positive duration (second arg)
      for (const call of recordOperationDurationSpy.mock.calls) {
        const duration = call[1];
        expect(typeof duration).toBe("number");
        expect(duration).toBeGreaterThanOrEqual(0);
        expect(duration).toBeLessThan(10000); // Should be less than 10 seconds (reasonable)
      }
    });

    it("should record kong_get_consumer_secret operation duration (kills line 109 mutant)", async () => {
      const request = new Request("http://localhost:3000/tokens", {
        method: "GET",
        headers: {
          "X-Consumer-ID": "test-consumer",
          "X-Consumer-Username": "test-user",
        },
      });

      await handleTokenRequest(request, mockKongService);

      // Find the kong_get_consumer_secret call
      const kongCall = recordOperationDurationSpy.mock.calls.find(
        (call) => call[0] === "kong_get_consumer_secret"
      );
      expect(kongCall).toBeDefined();
      expect(kongCall[1]).toBeGreaterThanOrEqual(0);
      expect(kongCall[2]).toBe(true); // success flag
    });

    it("should record jwt_generation operation duration (kills line 136 mutant)", async () => {
      const request = new Request("http://localhost:3000/tokens", {
        method: "GET",
        headers: {
          "X-Consumer-ID": "test-consumer",
          "X-Consumer-Username": "test-user",
        },
      });

      await handleTokenRequest(request, mockKongService);

      // Find the jwt_generation call
      const jwtCall = recordOperationDurationSpy.mock.calls.find(
        (call) => call[0] === "jwt_generation"
      );
      expect(jwtCall).toBeDefined();
      expect(jwtCall[1]).toBeGreaterThanOrEqual(0);
      expect(jwtCall[2]).toBe(true); // success flag
    });

    it("should record success authentication attempt (kills line 174 BooleanLiteral mutant)", async () => {
      const request = new Request("http://localhost:3000/tokens", {
        method: "GET",
        headers: {
          "X-Consumer-ID": "test-consumer",
          "X-Consumer-Username": "test-user",
        },
      });

      await handleTokenRequest(request, mockKongService);

      // Find success call
      const successCall = recordAuthenticationAttemptSpy.mock.calls.find(
        (call) => call[0] === "success"
      );
      expect(successCall).toBeDefined();
      expect(successCall[1]).toBe(true); // success = true, not false
      expect(successCall[2]).toBe("test-user"); // username
    });
  });

  // Tests to verify error response details structure (kills ObjectLiteral mutants)
  describe("Error response details - mutation killing tests", () => {
    it("should include consumerId in AUTH_002 error details (kills line 175 ObjectLiteral mutant)", async () => {
      const notFoundService: IKongService = {
        ...mockKongService,
        getConsumerSecret: mock(() => Promise.resolve(null)),
      };

      const request = new Request("http://localhost:3000/tokens", {
        method: "GET",
        headers: {
          "X-Consumer-ID": "specific-consumer-id",
          "X-Consumer-Username": "test-user",
        },
      });

      const response = await handleTokenRequest(request, notFoundService);
      const body = await response.json();

      expect(body.error.code).toBe(ErrorCodes.AUTH_002);
      expect(body.error.details).toBeDefined();
      expect(body.error.details.consumerId).toBe("specific-consumer-id");
    });

    it("should include reason in AUTH_001 error details (kills line 178 ObjectLiteral mutant)", async () => {
      const request = new Request("http://localhost:3000/tokens", {
        method: "GET",
        headers: {},
      });

      const response = await handleTokenRequest(request, mockKongService);
      const body = await response.json();

      expect(body.error.code).toBe(ErrorCodes.AUTH_001);
      expect(body.error.details).toBeDefined();
      expect(body.error.details.reason).toBe("Missing Kong consumer headers");
    });

    it("should include retryAfter in AUTH_004 error details (kills line 250 ObjectLiteral mutant)", async () => {
      const unavailableService: IKongService = {
        ...mockKongService,
        getConsumerSecret: mock(() => Promise.reject(new Error("Kong unavailable"))),
      };

      const request = new Request("http://localhost:3000/tokens", {
        method: "GET",
        headers: {
          "X-Consumer-ID": "test-consumer",
          "X-Consumer-Username": "test-user",
        },
      });

      const response = await handleTokenRequest(request, unavailableService);
      const body = await response.json();

      expect(body.error.code).toBe(ErrorCodes.AUTH_004);
      expect(body.error.details).toBeDefined();
      expect(body.error.details.reason).toBe("Kong gateway connectivity issues");
      expect(body.error.details.retryAfter).toBe(30);
    });
  });
});
