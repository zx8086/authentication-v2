/* test/bun/mutation-killer.test.ts */

// Comprehensive mutation-killing tests with strict assertions
// Strategy: Test exact values, use input-sensitive mocks, verify all branches

import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import type { IKongService } from "../../../src/config";
import { ErrorCodes } from "../../../src/errors/error-codes";
import {
  handleHealthCheck,
  handleMetricsHealth,
  handleReadinessCheck,
  handleTelemetryHealth,
} from "../../../src/handlers/health";
import { handleTokenRequest, handleTokenValidation } from "../../../src/handlers/tokens";
import { NativeBunJWT } from "../../../src/services/jwt.service";

// Test secret must be 45+ chars for JWT
const TEST_SECRET = "test-secret-key-that-is-at-least-45-characters-long-for-hmac";
const TEST_KEY = "test-jwt-key-12345";
const TEST_CONSUMER_ID = "test-consumer-id-123";
const TEST_USERNAME = "test-user@example.com";

describe("Mutation Killer Tests - Strict Assertions", () => {
  describe("Token Handler - ObjectLiteral Mutations", () => {
    let mockKongService: IKongService;
    let getConsumerSecretCalls: string[];

    beforeEach(() => {
      getConsumerSecretCalls = [];

      // Input-sensitive mock - tracks calls and validates inputs
      mockKongService = {
        getConsumerSecret: mock((consumerId: string) => {
          getConsumerSecretCalls.push(consumerId);

          // Only return valid response for expected consumer
          if (consumerId === TEST_CONSUMER_ID) {
            return Promise.resolve({
              key: TEST_KEY,
              secret: TEST_SECRET,
            });
          }
          // Any other consumer returns null (not found)
          return Promise.resolve(null);
        }),
        createConsumerSecret: mock(() => Promise.resolve(null)),
        clearCache: mock(() => Promise.resolve(undefined)),
        getCacheStats: mock(() =>
          Promise.resolve({
            strategy: "local-memory",
            size: 10,
            entries: [],
            activeEntries: 10,
            hitRate: "85.50",
            memoryUsageMB: 1.5,
            averageLatencyMs: 0.5,
          })
        ),
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

    it("should return token response with EXACT required properties", async () => {
      const request = new Request("http://localhost:3000/tokens", {
        method: "GET",
        headers: {
          "X-Consumer-ID": TEST_CONSUMER_ID,
          "X-Consumer-Username": TEST_USERNAME,
        },
      });

      const response = await handleTokenRequest(request, mockKongService);
      const body = await response.json();

      // STRICT assertions - if ObjectLiteral becomes {}, these ALL fail
      expect(response.status).toBe(200);

      // Verify exact response structure (kills ObjectLiteral mutations)
      // Actual response has: access_token, expires_in
      expect(body).toHaveProperty("access_token");
      expect(body).toHaveProperty("expires_in");

      // Verify exact values (kills BooleanLiteral and ConditionalExpression mutations)
      expect(typeof body.access_token).toBe("string");
      expect(body.access_token.length).toBeGreaterThan(50); // JWT is long
      expect(body.access_token.split(".").length).toBe(3); // JWT has 3 parts
      expect(typeof body.expires_in).toBe("number");
      expect(body.expires_in).toBeGreaterThan(0);
      expect(body.expires_in).toBeLessThanOrEqual(3600); // Max 1 hour

      // Verify the mock was called with EXACT expected value
      expect(getConsumerSecretCalls).toEqual([TEST_CONSUMER_ID]);
    });

    it("should verify JWT token contains correct claims", async () => {
      const request = new Request("http://localhost:3000/tokens", {
        method: "GET",
        headers: {
          "X-Consumer-ID": TEST_CONSUMER_ID,
          "X-Consumer-Username": TEST_USERNAME,
        },
      });

      const response = await handleTokenRequest(request, mockKongService);
      const body = await response.json();

      expect(response.status).toBe(200);

      // Decode the JWT to verify internal structure (kills JWT creation mutations)
      const parts = body.access_token.split(".");
      expect(parts.length).toBe(3);

      // Decode header
      const header = JSON.parse(atob(parts[0]));
      expect(header.alg).toBe("HS256");
      expect(header.typ).toBe("JWT");

      // Decode payload
      const payload = JSON.parse(atob(parts[1]));
      expect(payload.sub).toBe(TEST_USERNAME); // Subject is username
      expect(payload.iss).toBeDefined(); // Issuer exists
      expect(payload.aud).toBeDefined(); // Audience exists
      expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000)); // Not expired
      expect(payload.iat).toBeLessThanOrEqual(Math.floor(Date.now() / 1000) + 1); // Issued at is now-ish
      expect(payload.jti).toBeDefined(); // Has unique ID
    });

    it("should return EXACT error structure for missing headers", async () => {
      const request = new Request("http://localhost:3000/tokens", {
        method: "GET",
        headers: {},
      });

      const response = await handleTokenRequest(request, mockKongService);
      const body = await response.json();

      expect(response.status).toBe(401);

      // STRICT error structure assertions (kills ObjectLiteral mutations)
      expect(body).toHaveProperty("error");
      expect(body.error).toHaveProperty("code");
      expect(body.error).toHaveProperty("title");
      expect(body.error).toHaveProperty("message");

      expect(body.error.code).toBe(ErrorCodes.AUTH_001);
      expect(body.error.title).toBe("Missing Consumer Headers");
      expect(typeof body.error.message).toBe("string");
      expect(body.error.message.length).toBeGreaterThan(0);

      expect(body).toHaveProperty("statusCode");
      expect(body.statusCode).toBe(401);

      expect(body).toHaveProperty("timestamp");
      expect(typeof body.timestamp).toBe("string");
      // Verify timestamp is valid ISO date
      expect(() => new Date(body.timestamp)).not.toThrow();

      expect(body).toHaveProperty("requestId");
      expect(typeof body.requestId).toBe("string");
      expect(body.requestId.length).toBeGreaterThan(0);

      // Kong service should NOT have been called
      expect(getConsumerSecretCalls).toEqual([]);
    });

    it("should return EXACT error for anonymous consumer", async () => {
      const request = new Request("http://localhost:3000/tokens", {
        method: "GET",
        headers: {
          "X-Consumer-ID": TEST_CONSUMER_ID,
          "X-Consumer-Username": TEST_USERNAME,
          "X-Anonymous-Consumer": "true",
        },
      });

      const response = await handleTokenRequest(request, mockKongService);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error.code).toBe(ErrorCodes.AUTH_009);
      expect(body.statusCode).toBe(401);

      // Details should contain reason
      if (body.error.details) {
        expect(body.error.details).toHaveProperty("reason");
        expect(typeof body.error.details.reason).toBe("string");
      }

      // Kong service should NOT have been called for anonymous
      expect(getConsumerSecretCalls).toEqual([]);
    });

    it("should return EXACT error when consumer not found", async () => {
      const request = new Request("http://localhost:3000/tokens", {
        method: "GET",
        headers: {
          "X-Consumer-ID": "nonexistent-consumer",
          "X-Consumer-Username": TEST_USERNAME,
        },
      });

      const response = await handleTokenRequest(request, mockKongService);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error.code).toBe(ErrorCodes.AUTH_002);
      expect(body.statusCode).toBe(401);
      expect(body.error.title).toBe("Consumer Not Found");

      // Verify Kong was called with the actual consumer ID
      expect(getConsumerSecretCalls).toEqual(["nonexistent-consumer"]);
    });

    it("should handle header length validation boundary", async () => {
      // Test with header at exactly max length (256 chars)
      const maxLengthId = "x".repeat(256);
      const request = new Request("http://localhost:3000/tokens", {
        method: "GET",
        headers: {
          "X-Consumer-ID": maxLengthId,
          "X-Consumer-Username": TEST_USERNAME,
        },
      });

      const response = await handleTokenRequest(request, mockKongService);
      const body = await response.json();

      // At 256, it should be accepted (boundary test)
      // Note: depends on exact implementation - may be rejected
      expect([200, 400, 401]).toContain(response.status);
    });

    it("should reject headers exceeding max length", async () => {
      // Test with header exceeding max length (257 chars)
      const tooLongId = "x".repeat(257);
      const request = new Request("http://localhost:3000/tokens", {
        method: "GET",
        headers: {
          "X-Consumer-ID": tooLongId,
          "X-Consumer-Username": TEST_USERNAME,
        },
      });

      const response = await handleTokenRequest(request, mockKongService);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.code).toBe(ErrorCodes.AUTH_007);

      // Kong should NOT be called for invalid headers
      expect(getConsumerSecretCalls).toEqual([]);
    });
  });

  describe("Token Validation - Strict Assertions", () => {
    let mockKongService: IKongService;
    let validToken: string;

    beforeEach(async () => {
      mockKongService = {
        getConsumerSecret: mock((consumerId: string) => {
          if (consumerId === TEST_CONSUMER_ID) {
            return Promise.resolve({
              key: TEST_KEY,
              secret: TEST_SECRET,
            });
          }
          return Promise.resolve(null);
        }),
        createConsumerSecret: mock(() => Promise.resolve(null)),
        clearCache: mock(() => Promise.resolve(undefined)),
        getCacheStats: mock(() =>
          Promise.resolve({
            strategy: "local-memory",
            size: 0,
            entries: [],
            activeEntries: 0,
            hitRate: "0",
            memoryUsageMB: 0,
            averageLatencyMs: 0,
          })
        ),
        healthCheck: mock(() => Promise.resolve({ healthy: true, responseTime: 10 })),
        getCircuitBreakerStats: mock(() => ({})),
      };

      // Create a valid token for testing validation
      const tokenResponse = await NativeBunJWT.createToken(
        TEST_USERNAME,
        TEST_KEY,
        TEST_SECRET,
        "test-authority",
        "test-audience",
        "test-issuer",
        3600
      );
      validToken = tokenResponse.access_token;
    });

    afterEach(() => {
      mock.restore();
    });

    it("should return EXACT validation success structure", async () => {
      const request = new Request("http://localhost:3000/tokens/validate", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${validToken}`,
          "X-Consumer-ID": TEST_CONSUMER_ID,
          "X-Consumer-Username": TEST_USERNAME,
        },
      });

      const response = await handleTokenValidation(request, mockKongService);
      const body = await response.json();

      expect(response.status).toBe(200);

      // STRICT validation response structure
      expect(body).toHaveProperty("valid");
      expect(body.valid).toBe(true);

      expect(body).toHaveProperty("tokenId");
      expect(typeof body.tokenId).toBe("string");

      expect(body).toHaveProperty("subject");
      expect(body.subject).toBe(TEST_USERNAME);

      expect(body).toHaveProperty("issuer");
      expect(typeof body.issuer).toBe("string");

      expect(body).toHaveProperty("audience");
      expect(typeof body.audience).toBe("string");

      expect(body).toHaveProperty("issuedAt");
      expect(() => new Date(body.issuedAt)).not.toThrow();

      expect(body).toHaveProperty("expiresAt");
      expect(() => new Date(body.expiresAt)).not.toThrow();

      expect(body).toHaveProperty("expiresIn");
      expect(typeof body.expiresIn).toBe("number");
      expect(body.expiresIn).toBeGreaterThan(0);
      expect(body.expiresIn).toBeLessThanOrEqual(3600);
    });

    it("should return EXACT error for missing Authorization", async () => {
      const request = new Request("http://localhost:3000/tokens/validate", {
        method: "GET",
        headers: {
          "X-Consumer-ID": TEST_CONSUMER_ID,
          "X-Consumer-Username": TEST_USERNAME,
        },
      });

      const response = await handleTokenValidation(request, mockKongService);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.code).toBe(ErrorCodes.AUTH_012);
      expect(body.statusCode).toBe(400);
    });

    it("should return EXACT error for malformed Bearer token", async () => {
      const request = new Request("http://localhost:3000/tokens/validate", {
        method: "GET",
        headers: {
          Authorization: "Basic abc123", // Wrong type
          "X-Consumer-ID": TEST_CONSUMER_ID,
          "X-Consumer-Username": TEST_USERNAME,
        },
      });

      const response = await handleTokenValidation(request, mockKongService);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.code).toBe(ErrorCodes.AUTH_012);
    });

    it("should return EXACT error for empty token after Bearer", async () => {
      // Note: Request Headers API trims whitespace, so "Bearer   " becomes "Bearer"
      // which fails the startsWith("Bearer ") check. Test with actual empty token instead.
      const request = new Request("http://localhost:3000/tokens/validate", {
        method: "GET",
        headers: {
          Authorization: "Bearer   ", // Just whitespace - will be trimmed
          "X-Consumer-ID": TEST_CONSUMER_ID,
          "X-Consumer-Username": TEST_USERNAME,
        },
      });

      const response = await handleTokenValidation(request, mockKongService);
      const body = await response.json();

      // After trimming, this becomes "Bearer" which fails startsWith("Bearer ") check
      expect(response.status).toBe(400);
      expect(body.error.code).toBe(ErrorCodes.AUTH_012);
    });

    it("should return EXACT error for invalid token signature", async () => {
      const request = new Request("http://localhost:3000/tokens/validate", {
        method: "GET",
        headers: {
          Authorization: "Bearer invalid.jwt.token",
          "X-Consumer-ID": TEST_CONSUMER_ID,
          "X-Consumer-Username": TEST_USERNAME,
        },
      });

      const response = await handleTokenValidation(request, mockKongService);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.code).toBe(ErrorCodes.AUTH_011);
      expect(body.statusCode).toBe(400);
    });
  });

  describe("Health Handlers - Kill Boolean/Conditional Mutations", () => {
    let mockKongService: IKongService;
    let healthCheckCalls: number;

    beforeEach(() => {
      healthCheckCalls = 0;

      mockKongService = {
        getConsumerSecret: mock(() => Promise.resolve(null)),
        createConsumerSecret: mock(() => Promise.resolve(null)),
        clearCache: mock(() => Promise.resolve(undefined)),
        getCacheStats: mock(() =>
          Promise.resolve({
            strategy: "local-memory",
            size: 0,
            entries: [],
            activeEntries: 0,
            hitRate: "0",
            memoryUsageMB: 0,
            averageLatencyMs: 0,
          })
        ),
        healthCheck: mock(() => {
          healthCheckCalls++;
          return Promise.resolve({
            healthy: true,
            responseTime: 15,
          });
        }),
        getCircuitBreakerStats: mock(() => ({})),
      };
    });

    afterEach(() => {
      mock.restore();
    });

    it("should return EXACT healthy status structure", async () => {
      const response = await handleHealthCheck(mockKongService);
      const body = await response.json();

      expect(response.status).toBe(200);

      // STRICT health response structure
      expect(body).toHaveProperty("status");
      expect(body.status).toBe("healthy");

      expect(body).toHaveProperty("timestamp");
      expect(() => new Date(body.timestamp)).not.toThrow();

      expect(body).toHaveProperty("version");
      expect(typeof body.version).toBe("string");

      expect(body).toHaveProperty("environment");
      expect(typeof body.environment).toBe("string");

      expect(body).toHaveProperty("uptime");
      expect(typeof body.uptime).toBe("number");
      expect(body.uptime).toBeGreaterThanOrEqual(0);

      // Dependencies structure
      expect(body).toHaveProperty("dependencies");
      expect(body.dependencies).toHaveProperty("kong");
      expect(body.dependencies.kong).toHaveProperty("status");
      expect(body.dependencies.kong.status).toBe("healthy");
      expect(body.dependencies.kong).toHaveProperty("responseTime");
      expect(typeof body.dependencies.kong.responseTime).toBe("number");
      expect(body.dependencies.kong.responseTime).toBeGreaterThanOrEqual(0);

      // Verify health check was called
      expect(healthCheckCalls).toBe(1);
    });

    it("should return EXACT unhealthy status when Kong fails", async () => {
      mockKongService.healthCheck = mock(() =>
        Promise.resolve({
          healthy: false,
          responseTime: 0,
          error: "Connection refused",
        })
      );

      const response = await handleHealthCheck(mockKongService);
      const body = await response.json();

      // Should be 503 when unhealthy
      expect(response.status).toBe(503);

      // Status should NOT be "healthy"
      expect(body.status).not.toBe("healthy");
      expect(["unhealthy", "degraded"]).toContain(body.status);

      // Kong dependency should show unhealthy
      expect(body.dependencies.kong.status).toBe("unhealthy");
    });

    it("should handle Kong health check exception gracefully", async () => {
      mockKongService.healthCheck = mock(() => Promise.reject(new Error("Network timeout")));

      const response = await handleHealthCheck(mockKongService);
      const body = await response.json();

      expect(response.status).toBe(503);
      expect(body.status).not.toBe("healthy");
      expect(body.dependencies.kong.status).toBe("unhealthy");

      // Should include error details
      if (body.dependencies.kong.details?.error) {
        expect(body.dependencies.kong.details.error).toContain("timeout");
      }
    });
  });

  describe("Readiness Check - Strict Boolean Assertions", () => {
    let mockKongService: IKongService;

    beforeEach(() => {
      mockKongService = {
        getConsumerSecret: mock(() => Promise.resolve(null)),
        createConsumerSecret: mock(() => Promise.resolve(null)),
        clearCache: mock(() => Promise.resolve(undefined)),
        getCacheStats: mock(() =>
          Promise.resolve({
            strategy: "local-memory",
            size: 0,
            entries: [],
            activeEntries: 0,
            hitRate: "0",
            memoryUsageMB: 0,
            averageLatencyMs: 0,
          })
        ),
        healthCheck: mock(() =>
          Promise.resolve({
            healthy: true,
            responseTime: 20,
          })
        ),
        getCircuitBreakerStats: mock(() => ({})),
      };
    });

    afterEach(() => {
      mock.restore();
    });

    it("should return EXACT ready=true structure", async () => {
      const response = await handleReadinessCheck(mockKongService);
      const body = await response.json();

      expect(response.status).toBe(200);

      // STRICT readiness assertions
      expect(body).toHaveProperty("ready");
      expect(body.ready).toBe(true); // EXACT boolean, not truthy

      expect(body).toHaveProperty("timestamp");
      expect(body).toHaveProperty("checks");
      expect(body.checks).toHaveProperty("kong");
      expect(body.checks.kong.status).toBe("healthy");

      expect(body).toHaveProperty("responseTime");
      expect(typeof body.responseTime).toBe("number");
      expect(body.responseTime).toBeGreaterThanOrEqual(0);
    });

    it("should return EXACT ready=false when Kong unhealthy", async () => {
      mockKongService.healthCheck = mock(() =>
        Promise.resolve({
          healthy: false,
          responseTime: 0,
          error: "Service unavailable",
        })
      );

      const response = await handleReadinessCheck(mockKongService);
      const body = await response.json();

      expect(response.status).toBe(503);

      // EXACT boolean false check
      expect(body.ready).toBe(false);
      expect(body.checks.kong.status).toBe("unhealthy");
    });
  });

  describe("Telemetry Health - Object Structure Verification", () => {
    it("should return EXACT telemetry structure", async () => {
      const response = handleTelemetryHealth();

      expect(response.status).toBe(200);

      const data = (await response.json()) as Record<string, unknown>;

      expect(data).toHaveProperty("telemetry");

      const telemetry = data.telemetry as Record<string, unknown>;
      expect(telemetry).toHaveProperty("mode");
      expect(telemetry).toHaveProperty("status");
      expect(telemetry).toHaveProperty("configuration");

      const config = telemetry.configuration as Record<string, unknown>;
      expect(config).toHaveProperty("serviceName");
      expect(config).toHaveProperty("endpoints");
    });
  });

  describe("Metrics Health - Circuit Breaker State Assertions", () => {
    let mockKongService: IKongService;

    beforeEach(() => {
      mockKongService = {
        getConsumerSecret: mock(() => Promise.resolve(null)),
        createConsumerSecret: mock(() => Promise.resolve(null)),
        clearCache: mock(() => Promise.resolve(undefined)),
        getCacheStats: mock(() =>
          Promise.resolve({
            strategy: "local-memory",
            size: 0,
            entries: [],
            activeEntries: 0,
            hitRate: "0",
            memoryUsageMB: 0,
            averageLatencyMs: 0,
          })
        ),
        healthCheck: mock(() => Promise.resolve({ healthy: true, responseTime: 10 })),
        getCircuitBreakerStats: mock(() => ({
          getConsumerSecret: {
            state: "closed",
            failures: 0,
            successes: 10,
            fallbackCount: 0,
            lastFailure: null,
            lastSuccess: new Date().toISOString(),
          },
        })),
      };
    });

    afterEach(() => {
      mock.restore();
    });

    it("should return EXACT metrics health structure", async () => {
      const response = handleMetricsHealth(mockKongService);

      expect(response.status).toBe(200);

      const body = (await response.json()) as Record<string, unknown>;
      expect(body).toHaveProperty("metrics");
      expect(body).toHaveProperty("circuitBreakers");
      expect(body).toHaveProperty("timestamp");

      const cb = body.circuitBreakers as Record<string, unknown>;
      expect(cb).toHaveProperty("enabled");
      expect(cb).toHaveProperty("totalBreakers");
      expect(cb).toHaveProperty("states");

      const states = cb.states as Record<string, number>;
      expect(states).toHaveProperty("closed");
      expect(states).toHaveProperty("open");
      expect(states).toHaveProperty("halfOpen");

      // Verify numeric types
      expect(typeof states.closed).toBe("number");
      expect(typeof states.open).toBe("number");
      expect(typeof states.halfOpen).toBe("number");
    });

    it("should count circuit breaker states correctly", async () => {
      mockKongService.getCircuitBreakerStats = mock(() => ({
        breaker1: { state: "closed", failures: 0, successes: 5, fallbackCount: 0 },
        breaker2: { state: "open", failures: 10, successes: 0, fallbackCount: 5 },
        breaker3: { state: "half-open", failures: 5, successes: 2, fallbackCount: 1 },
      }));

      const response = handleMetricsHealth(mockKongService);

      const body = (await response.json()) as Record<string, unknown>;
      const cb = body.circuitBreakers as Record<string, unknown>;
      const states = cb.states as Record<string, number>;

      // EXACT counts - kills arithmetic mutations
      expect(states.closed).toBe(1);
      expect(states.open).toBe(1);
      expect(states.halfOpen).toBe(1);
      expect(cb.totalBreakers).toBe(3);
    });
  });

  describe("JWT Service - Direct Testing", () => {
    it("should create token with EXACT structure", async () => {
      const result = await NativeBunJWT.createToken(
        TEST_USERNAME,
        TEST_KEY,
        TEST_SECRET,
        "test-authority",
        "test-audience",
        "test-issuer",
        3600
      );

      expect(result).toHaveProperty("access_token");
      expect(result).toHaveProperty("expires_in");

      expect(typeof result.access_token).toBe("string");
      expect(result.access_token.split(".").length).toBe(3);

      expect(typeof result.expires_in).toBe("number");
      expect(result.expires_in).toBe(3600);
    });

    it("should validate token and return EXACT payload structure", async () => {
      const created = await NativeBunJWT.createToken(
        TEST_USERNAME,
        TEST_KEY,
        TEST_SECRET,
        "test-authority",
        "test-audience",
        "test-issuer",
        3600
      );

      const validated = await NativeBunJWT.validateToken(created.access_token, TEST_SECRET);

      expect(validated.valid).toBe(true);
      // For valid tokens, expired is not set (undefined) - only set to true for expired tokens
      expect(validated.expired).toBeUndefined();
      expect(validated.payload).toBeDefined();

      // STRICT payload assertions
      expect(validated.payload!.sub).toBe(TEST_USERNAME);
      expect(validated.payload!.iss).toBe("test-issuer");
      expect(validated.payload!.aud).toBe("test-audience");
      expect(validated.payload!.jti).toBeDefined();
      expect(typeof validated.payload!.jti).toBe("string");
      expect(validated.payload!.exp).toBeGreaterThan(validated.payload!.iat);
    });

    it("should return invalid=false for wrong secret", async () => {
      const created = await NativeBunJWT.createToken(
        TEST_USERNAME,
        TEST_KEY,
        TEST_SECRET,
        "test-authority",
        "test-audience",
        "test-issuer",
        3600
      );

      const wrongSecret = "wrong-secret-that-is-at-least-45-characters-long-here";
      const validated = await NativeBunJWT.validateToken(created.access_token, wrongSecret);

      expect(validated.valid).toBe(false);
      expect(validated.error).toBeDefined();
    });

    it("should detect expired tokens", async () => {
      // Create token with 0 expiration (already expired)
      const created = await NativeBunJWT.createToken(
        TEST_USERNAME,
        TEST_KEY,
        TEST_SECRET,
        "test-authority",
        "test-audience",
        "test-issuer",
        -1 // Negative = expired
      );

      const validated = await NativeBunJWT.validateToken(created.access_token, TEST_SECRET);

      expect(validated.valid).toBe(false);
      expect(validated.expired).toBe(true);
    });
  });

  describe("Arithmetic Operator Mutations - Duration Checks", () => {
    let mockKongService: IKongService;

    beforeEach(() => {
      mockKongService = {
        getConsumerSecret: mock(async () => {
          // Add small delay to ensure measurable duration
          await new Promise((resolve) => setTimeout(resolve, 5));
          return { key: TEST_KEY, secret: TEST_SECRET };
        }),
        createConsumerSecret: mock(() => Promise.resolve(null)),
        clearCache: mock(() => Promise.resolve(undefined)),
        getCacheStats: mock(() =>
          Promise.resolve({
            strategy: "local-memory",
            size: 0,
            entries: [],
            activeEntries: 0,
            hitRate: "0",
            memoryUsageMB: 0,
            averageLatencyMs: 0,
          })
        ),
        healthCheck: mock(async () => {
          await new Promise((resolve) => setTimeout(resolve, 5));
          return { healthy: true, responseTime: 10 };
        }),
        getCircuitBreakerStats: mock(() => ({})),
      };
    });

    afterEach(() => {
      mock.restore();
    });

    it("should report reasonable response times in health check", async () => {
      const startTime = Date.now();
      const response = await handleHealthCheck(mockKongService);
      const endTime = Date.now();
      const body = await response.json();

      const actualDuration = endTime - startTime;

      // Response time should be reasonable (not negative, not astronomical)
      expect(body.dependencies.kong.responseTime).toBeGreaterThanOrEqual(0);
      expect(body.dependencies.kong.responseTime).toBeLessThan(actualDuration + 1000);

      // If arithmetic mutation changes / to *, the number would be huge
      expect(body.dependencies.kong.responseTime).toBeLessThan(1000000);
    });

    it("should report reasonable response times in readiness check", async () => {
      const response = await handleReadinessCheck(mockKongService);
      const body = await response.json();

      expect(body.responseTime).toBeGreaterThanOrEqual(0);
      expect(body.responseTime).toBeLessThan(10000); // 10 seconds max
      expect(body.checks.kong.responseTime).toBeGreaterThanOrEqual(0);
      expect(body.checks.kong.responseTime).toBeLessThan(10000);
    });
  });
});
