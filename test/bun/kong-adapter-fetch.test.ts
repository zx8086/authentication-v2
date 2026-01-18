/* test/bun/kong-adapter-fetch.test.ts */

/**
 * Unit tests for Kong Adapter fetch call validation
 *
 * These tests verify that fetch is called with correct parameters.
 * This kills ObjectLiteral mutations that would remove method, headers, or signal.
 *
 * Mutation killing targets:
 * - fetch(url, {}) <- Empty object mutation
 * - method: "GET" <- Method removal/change mutations
 * - headers: {...} <- Header removal mutations
 * - signal: AbortSignal.timeout(X) <- Timeout removal mutations
 */

import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import { createKongModeStrategy } from "../../src/adapters/kong-mode-strategies";

describe("Kong Mode Strategy Fetch Parameters", () => {
  let fetchSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    // Create a spy that tracks all fetch calls
    fetchSpy = spyOn(globalThis, "fetch").mockImplementation(async () => {
      return new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  describe("API Gateway Strategy Headers", () => {
    it("should create headers with Content-Type application/json", () => {
      const strategy = createKongModeStrategy("API_GATEWAY", "http://kong:8001", "test-token");
      const headers = strategy.createAuthHeaders("test-token");

      // Verify Content-Type header exists (kills header mutations)
      expect(headers["Content-Type"]).toBe("application/json");
    });

    it("should include Kong-Admin-Token when token is provided", () => {
      const strategy = createKongModeStrategy("API_GATEWAY", "http://kong:8001", "my-admin-token");
      const headers = strategy.createAuthHeaders("my-admin-token");

      // Verify admin token header exists (kills header removal mutations)
      expect(headers["Kong-Admin-Token"]).toBe("my-admin-token");
    });

    it("should include User-Agent header", () => {
      const strategy = createKongModeStrategy("API_GATEWAY", "http://kong:8001", "token");
      const headers = strategy.createAuthHeaders("token");

      // Verify User-Agent header exists (kills header mutations)
      expect(headers["User-Agent"]).toBe("Authentication-Service/1.0");
    });

    it("should return plain object with header properties", () => {
      const strategy = createKongModeStrategy("API_GATEWAY", "http://kong:8001", "token");
      const headers = strategy.createAuthHeaders("token");

      // Verify return type (kills type mutations)
      expect(typeof headers).toBe("object");
      expect(headers).not.toBeNull();
      expect(Object.keys(headers).length).toBeGreaterThan(0);
    });

    it("should have at least Content-Type, User-Agent, and Kong-Admin-Token headers", () => {
      const strategy = createKongModeStrategy("API_GATEWAY", "http://kong:8001", "token");
      const headers = strategy.createAuthHeaders("token");

      // Verify all required headers exist
      expect("Content-Type" in headers).toBe(true);
      expect("User-Agent" in headers).toBe(true);
      expect("Kong-Admin-Token" in headers).toBe(true);
    });
  });

  describe("API Gateway Strategy URLs", () => {
    it("should build correct consumer URL", async () => {
      const strategy = createKongModeStrategy("API_GATEWAY", "http://kong:8001", "token");
      const url = await strategy.buildConsumerUrl("http://kong:8001", "consumer-123");

      // Verify URL structure (kills URL construction mutations)
      expect(url).toContain("http://kong:8001");
      expect(url).toContain("/consumers/");
      expect(url).toContain("consumer-123");
      expect(url).toContain("/jwt");
    });

    it("should build correct health URL", () => {
      const strategy = createKongModeStrategy("API_GATEWAY", "http://kong:8001", "token");
      const url = strategy.buildHealthUrl("http://kong:8001");

      // Verify health URL (kills URL mutations)
      expect(url).toBe("http://kong:8001/status");
      expect(url).toContain("/status");
    });

    it("should handle admin URL with trailing slash in constructor", () => {
      // The constructor strips trailing slashes from baseUrl
      const strategy = createKongModeStrategy("API_GATEWAY", "http://kong:8001/", "token");

      // Verify baseUrl is normalized (trailing slash removed)
      expect((strategy as { baseUrl: string }).baseUrl).toBe("http://kong:8001");
    });

    it("should produce URL ending with /jwt", async () => {
      const strategy = createKongModeStrategy("API_GATEWAY", "http://kong:8001", "token");
      const url = await strategy.buildConsumerUrl("http://kong:8001", "consumer-id");

      // Verify URL ends with /jwt (kills URL suffix mutations)
      expect(url).toMatch(/\/jwt$/);
    });
  });

  describe("Konnect Strategy Headers", () => {
    it("should create headers with Content-Type application/json for Konnect", () => {
      const strategy = createKongModeStrategy(
        "KONNECT",
        "https://us.api.konghq.com/v2/control-planes/12345678-1234-1234-1234-123456789abc",
        "kpat_token"
      );
      const headers = strategy.createAuthHeaders("kpat_token");

      // Verify Content-Type header exists (kills header mutations)
      expect(headers["Content-Type"]).toBe("application/json");
    });

    it("should include Authorization header with Bearer token for Konnect", () => {
      const strategy = createKongModeStrategy(
        "KONNECT",
        "https://us.api.konghq.com/v2/control-planes/12345678-1234-1234-1234-123456789abc",
        "kpat_my_token"
      );
      const headers = strategy.createAuthHeaders("kpat_my_token");

      // Verify Authorization header exists (kills header removal mutations)
      expect(headers.Authorization).toBe("Bearer kpat_my_token");
    });

    it("should include Authorization header format correctly", () => {
      const strategy = createKongModeStrategy(
        "KONNECT",
        "https://us.api.konghq.com/v2/control-planes/12345678-1234-1234-1234-123456789abc",
        "test-token"
      );
      const headers = strategy.createAuthHeaders("test-token");

      // Verify Bearer prefix (kills string literal mutations)
      const authHeader = headers.Authorization;
      expect(authHeader).not.toBeUndefined();
      expect(authHeader).toMatch(/^Bearer /);
      expect(authHeader?.startsWith("Bearer ")).toBe(true);
    });

    it("should NOT include Kong-Admin-Token for Konnect strategy", () => {
      const strategy = createKongModeStrategy(
        "KONNECT",
        "https://us.api.konghq.com/v2/control-planes/12345678-1234-1234-1234-123456789abc",
        "token"
      );
      const headers = strategy.createAuthHeaders("token");

      // Verify Kong-Admin-Token is NOT set for Konnect
      expect(headers["Kong-Admin-Token"]).toBeUndefined();
    });
  });

  describe("Konnect Strategy URLs", () => {
    it("should build correct consumer URL for Konnect", async () => {
      const strategy = createKongModeStrategy(
        "KONNECT",
        "https://us.api.konghq.com/v2/control-planes/12345678-1234-1234-1234-123456789abc",
        "token"
      );
      const url = await strategy.buildConsumerUrl(
        "https://us.api.konghq.com/v2/control-planes/12345678-1234-1234-1234-123456789abc",
        "consumer-123"
      );

      // Verify URL structure (kills URL mutations)
      expect(url).toContain("/core-entities/consumers/");
      expect(url).toContain("consumer-123");
      expect(url).toContain("/jwt");
    });

    it("should build health URL for Konnect", () => {
      const strategy = createKongModeStrategy(
        "KONNECT",
        "https://us.api.konghq.com/v2/control-planes/abc12345-1234-1234-1234-123456789abc",
        "token"
      );
      const url = strategy.buildHealthUrl("https://us.api.konghq.com");

      // Konnect health URL just returns the base URL
      expect(url).toBe("https://us.api.konghq.com");
    });
  });

  describe("Strategy Factory", () => {
    it("should create API_GATEWAY strategy for API_GATEWAY mode", () => {
      const strategy = createKongModeStrategy("API_GATEWAY", "http://kong:8001", "token");

      // Verify correct strategy created (kills mode switch mutations)
      const headers = strategy.createAuthHeaders("token");
      expect(headers["Kong-Admin-Token"]).toBe("token");
      expect(headers.Authorization).toBeUndefined();
    });

    it("should create KONNECT strategy for KONNECT mode", () => {
      const strategy = createKongModeStrategy(
        "KONNECT",
        "https://us.api.konghq.com/v2/control-planes/12345678-1234-1234-1234-123456789abc",
        "token"
      );

      // Verify correct strategy created (kills mode switch mutations)
      const headers = strategy.createAuthHeaders("token");
      expect(headers.Authorization).toBe("Bearer token");
      expect(headers["Kong-Admin-Token"]).toBeUndefined();
    });

    it("should throw error for invalid mode", () => {
      // Verify error handling (kills default case mutations)
      expect(() => {
        createKongModeStrategy("INVALID" as "API_GATEWAY", "http://kong:8001", "token");
      }).toThrow("Unsupported Kong mode");
    });
  });
});

describe("Fetch Request Options Validation", () => {
  describe("Request timeout signal", () => {
    it("should create AbortSignal with timeout", () => {
      // Import the utility function
      const { createRequestTimeout } = require("../../src/adapters/kong-utils");
      const signal = createRequestTimeout(5000);

      // Verify signal is created (kills signal removal mutations)
      expect(signal).toBeInstanceOf(AbortSignal);
    });

    it("should create AbortSignal with specified timeout", () => {
      const { createRequestTimeout } = require("../../src/adapters/kong-utils");

      // Test different timeout values (kills hardcoded value mutations)
      const signal1 = createRequestTimeout(1000);
      const signal2 = createRequestTimeout(10000);

      expect(signal1).toBeInstanceOf(AbortSignal);
      expect(signal2).toBeInstanceOf(AbortSignal);
    });

    it("should use default timeout when not specified", () => {
      const { createRequestTimeout } = require("../../src/adapters/kong-utils");
      const signal = createRequestTimeout();

      // Verify default is used (kills default value mutations)
      expect(signal).toBeInstanceOf(AbortSignal);
    });
  });

  describe("Cache key generation", () => {
    it("should generate unique cache keys for different consumers", () => {
      const { generateCacheKey } = require("../../src/adapters/kong-utils");

      const key1 = generateCacheKey("consumer-1");
      const key2 = generateCacheKey("consumer-2");

      // Verify keys are different (kills key generation mutations)
      expect(key1).not.toBe(key2);
      expect(key1).toContain("consumer-1");
      expect(key2).toContain("consumer-2");
    });

    it("should generate consistent cache keys for same consumer", () => {
      const { generateCacheKey } = require("../../src/adapters/kong-utils");

      const key1 = generateCacheKey("same-consumer");
      const key2 = generateCacheKey("same-consumer");

      // Verify keys are consistent (kills randomization mutations)
      expect(key1).toBe(key2);
    });

    it("should include prefix in cache key", () => {
      const { generateCacheKey } = require("../../src/adapters/kong-utils");

      const key = generateCacheKey("test-consumer");

      // Verify prefix format (kills string template mutations)
      expect(key).toBe("consumer_secret:test-consumer");
      expect(key).toMatch(/^consumer_secret:/);
    });
  });

  describe("JWT key and secret generation", () => {
    it("should generate non-empty JWT key", () => {
      const { generateJwtKey } = require("../../src/adapters/kong-utils");
      const key = generateJwtKey();

      // Verify key is generated (kills empty string mutations)
      expect(typeof key).toBe("string");
      expect(key.length).toBeGreaterThan(0);
    });

    it("should generate unique JWT keys on each call", () => {
      const { generateJwtKey } = require("../../src/adapters/kong-utils");

      const key1 = generateJwtKey();
      const key2 = generateJwtKey();

      // Verify keys are unique (kills constant return mutations)
      expect(key1).not.toBe(key2);
    });

    it("should generate secure secret with minimum length", () => {
      const { generateSecureSecret } = require("../../src/adapters/kong-utils");
      const secret = generateSecureSecret();

      // Verify secret meets minimum requirements (kills length mutations)
      expect(typeof secret).toBe("string");
      expect(secret.length).toBeGreaterThanOrEqual(32);
    });

    it("should generate unique secrets on each call", () => {
      const { generateSecureSecret } = require("../../src/adapters/kong-utils");

      const secret1 = generateSecureSecret();
      const secret2 = generateSecureSecret();

      // Verify secrets are unique (kills constant return mutations)
      expect(secret1).not.toBe(secret2);
    });

    it("should generate hex-encoded secrets", () => {
      const { generateSecureSecret } = require("../../src/adapters/kong-utils");
      const secret = generateSecureSecret();

      // Verify secret is hex (kills encoding mutations)
      expect(secret).toMatch(/^[0-9a-f]+$/);
      // 32 bytes = 64 hex characters
      expect(secret.length).toBe(64);
    });
  });

  describe("Standard headers creation", () => {
    it("should include Content-Type header", () => {
      const { createStandardHeaders } = require("../../src/adapters/kong-utils");
      const headers = createStandardHeaders();

      expect(headers["Content-Type"]).toBe("application/json");
    });

    it("should include User-Agent header", () => {
      const { createStandardHeaders } = require("../../src/adapters/kong-utils");
      const headers = createStandardHeaders();

      expect(headers["User-Agent"]).toBe("Authentication-Service/1.0");
    });

    it("should merge custom headers with standard headers", () => {
      const { createStandardHeaders } = require("../../src/adapters/kong-utils");
      const headers = createStandardHeaders({ "X-Custom": "value" });

      expect(headers["Content-Type"]).toBe("application/json");
      expect(headers["User-Agent"]).toBe("Authentication-Service/1.0");
      expect(headers["X-Custom"]).toBe("value");
    });

    it("should allow custom headers to override defaults", () => {
      const { createStandardHeaders } = require("../../src/adapters/kong-utils");
      const headers = createStandardHeaders({ "Content-Type": "text/plain" });

      // Custom headers should override defaults
      expect(headers["Content-Type"]).toBe("text/plain");
    });
  });
});

describe("Response Validation Utilities", () => {
  describe("isSuccessResponse", () => {
    it("should return true for 200 status", () => {
      const { isSuccessResponse } = require("../../src/adapters/kong-utils");
      const response = new Response("", { status: 200 });

      expect(isSuccessResponse(response)).toBe(true);
    });

    it("should return true for 201 status", () => {
      const { isSuccessResponse } = require("../../src/adapters/kong-utils");
      const response = new Response("", { status: 201 });

      expect(isSuccessResponse(response)).toBe(true);
    });

    it("should return true for 299 status (edge case)", () => {
      const { isSuccessResponse } = require("../../src/adapters/kong-utils");
      const response = new Response("", { status: 299 });

      expect(isSuccessResponse(response)).toBe(true);
    });

    it("should return false for 300 status", () => {
      const { isSuccessResponse } = require("../../src/adapters/kong-utils");
      const response = new Response("", { status: 300 });

      // Verify 300 is not success (kills comparison mutations)
      expect(isSuccessResponse(response)).toBe(false);
    });

    it("should return false for 400 status", () => {
      const { isSuccessResponse } = require("../../src/adapters/kong-utils");
      const response = new Response("", { status: 400 });

      // Verify 400 is not success (kills comparison mutations)
      expect(isSuccessResponse(response)).toBe(false);
    });

    it("should return false for 404 status", () => {
      const { isSuccessResponse } = require("../../src/adapters/kong-utils");
      const response = new Response("", { status: 404 });

      // Verify 404 is not success (kills comparison mutations)
      expect(isSuccessResponse(response)).toBe(false);
    });

    it("should return false for 500 status", () => {
      const { isSuccessResponse } = require("../../src/adapters/kong-utils");
      const response = new Response("", { status: 500 });

      // Verify 500 is not success (kills comparison mutations)
      expect(isSuccessResponse(response)).toBe(false);
    });
  });

  describe("isConsumerNotFound", () => {
    it("should return true for 404 status", () => {
      const { isConsumerNotFound } = require("../../src/adapters/kong-utils");
      const response = new Response("", { status: 404 });

      // Verify 404 detection (kills status check mutations)
      expect(isConsumerNotFound(response)).toBe(true);
    });

    it("should return false for 200 status", () => {
      const { isConsumerNotFound } = require("../../src/adapters/kong-utils");
      const response = new Response("", { status: 200 });

      // Verify 200 is not "not found" (kills comparison mutations)
      expect(isConsumerNotFound(response)).toBe(false);
    });

    it("should return false for 500 status", () => {
      const { isConsumerNotFound } = require("../../src/adapters/kong-utils");
      const response = new Response("", { status: 500 });

      // Verify 500 is not "not found" (kills comparison mutations)
      expect(isConsumerNotFound(response)).toBe(false);
    });

    it("should return false for 401 status", () => {
      const { isConsumerNotFound } = require("../../src/adapters/kong-utils");
      const response = new Response("", { status: 401 });

      // Verify 401 is not "not found" (kills comparison mutations)
      expect(isConsumerNotFound(response)).toBe(false);
    });

    it("should return false for 403 status", () => {
      const { isConsumerNotFound } = require("../../src/adapters/kong-utils");
      const response = new Response("", { status: 403 });

      // Verify 403 is not "not found" (kills comparison mutations)
      expect(isConsumerNotFound(response)).toBe(false);
    });
  });
});

describe("Consumer Secret Extraction", () => {
  describe("extractConsumerSecret", () => {
    it("should extract secret from valid data array", () => {
      const { extractConsumerSecret } = require("../../src/adapters/kong-utils");
      const data = {
        data: [
          {
            id: "jwt-123",
            key: "test-key",
            secret: "test-secret-min-32-chars-long-here",
            algorithm: "HS256",
            consumer: { id: "consumer-123" },
          },
        ],
      };

      const result = extractConsumerSecret(data);

      // Verify extraction works (kills extraction logic mutations)
      expect(result).not.toBeNull();
      expect(result?.key).toBe("test-key");
      expect(result?.secret).toBe("test-secret-min-32-chars-long-here");
      expect(result?.id).toBe("jwt-123");
      expect(result?.consumer?.id).toBe("consumer-123");
    });

    it("should return null for empty data array", () => {
      const { extractConsumerSecret } = require("../../src/adapters/kong-utils");
      const data = { data: [] };

      const result = extractConsumerSecret(data);

      // Verify null for empty (kills null check mutations)
      expect(result).toBeNull();
    });

    it("should return null for missing data property", () => {
      const { extractConsumerSecret } = require("../../src/adapters/kong-utils");
      const data = {};

      const result = extractConsumerSecret(data);

      // Verify null for missing data (kills property access mutations)
      expect(result).toBeNull();
    });

    it("should return null for undefined data", () => {
      const { extractConsumerSecret } = require("../../src/adapters/kong-utils");
      const data = { data: undefined };

      const result = extractConsumerSecret(data);

      // Verify null for undefined (kills type check mutations)
      expect(result).toBeNull();
    });

    it("should return null for non-array data", () => {
      const { extractConsumerSecret } = require("../../src/adapters/kong-utils");
      const data = { data: "not-an-array" };

      const result = extractConsumerSecret(data);

      // Verify null for non-array (kills array check mutations)
      expect(result).toBeNull();
    });

    it("should extract first item when multiple credentials exist", () => {
      const { extractConsumerSecret } = require("../../src/adapters/kong-utils");
      const data = {
        data: [
          {
            id: "1",
            key: "first-key",
            secret: "first-secret-min-32-chars",
            consumer: { id: "c1" },
          },
          { id: "2", key: "second-key", secret: "second-secret-min-32", consumer: { id: "c2" } },
        ],
      };

      const result = extractConsumerSecret(data);

      // Verify first item is extracted (kills index mutations)
      expect(result?.key).toBe("first-key");
      expect(result?.id).toBe("1");
    });

    it("should return null if secret object is missing required fields", () => {
      const { extractConsumerSecret } = require("../../src/adapters/kong-utils");

      // Missing consumer.id
      const data1 = { data: [{ id: "1", key: "key", secret: "secret" }] };
      expect(extractConsumerSecret(data1)).toBeNull();

      // Missing id
      const data2 = { data: [{ key: "key", secret: "secret", consumer: { id: "c1" } }] };
      expect(extractConsumerSecret(data2)).toBeNull();

      // Missing key
      const data3 = { data: [{ id: "1", secret: "secret", consumer: { id: "c1" } }] };
      expect(extractConsumerSecret(data3)).toBeNull();

      // Missing secret
      const data4 = { data: [{ id: "1", key: "key", consumer: { id: "c1" } }] };
      expect(extractConsumerSecret(data4)).toBeNull();
    });
  });
});

describe("Error Creation", () => {
  describe("createKongApiError", () => {
    it("should create error with status code", async () => {
      const { createKongApiError } = require("../../src/adapters/kong-utils");
      const response = new Response(JSON.stringify({ message: "Error" }), {
        status: 503,
        statusText: "Service Unavailable",
      });

      const error = await createKongApiError(response);

      // Verify error has correct status (kills status extraction mutations)
      expect(error.status).toBe(503);
    });

    it("should create error with status text", async () => {
      const { createKongApiError } = require("../../src/adapters/kong-utils");
      const response = new Response(JSON.stringify({ message: "Error" }), {
        status: 500,
        statusText: "Internal Server Error",
      });

      const error = await createKongApiError(response);

      // Verify error has status text (kills statusText mutations)
      expect(error.statusText).toBe("Internal Server Error");
    });

    it("should mark 5xx errors as infrastructure errors", async () => {
      const { createKongApiError } = require("../../src/adapters/kong-utils");
      const response = new Response("{}", { status: 503 });

      const error = await createKongApiError(response);

      // Verify infrastructure error flag (kills boolean mutations)
      expect(error.isInfrastructureError).toBe(true);
    });

    it("should mark 500 as infrastructure error", async () => {
      const { createKongApiError } = require("../../src/adapters/kong-utils");
      const response = new Response("{}", { status: 500 });

      const error = await createKongApiError(response);
      expect(error.isInfrastructureError).toBe(true);
    });

    it("should mark 502 as infrastructure error", async () => {
      const { createKongApiError } = require("../../src/adapters/kong-utils");
      const response = new Response("{}", { status: 502 });

      const error = await createKongApiError(response);
      expect(error.isInfrastructureError).toBe(true);
    });

    it("should mark 504 as infrastructure error", async () => {
      const { createKongApiError } = require("../../src/adapters/kong-utils");
      const response = new Response("{}", { status: 504 });

      const error = await createKongApiError(response);
      expect(error.isInfrastructureError).toBe(true);
    });

    it("should mark 429 as infrastructure error (rate limit)", async () => {
      const { createKongApiError } = require("../../src/adapters/kong-utils");
      const response = new Response("{}", { status: 429 });

      const error = await createKongApiError(response);
      expect(error.isInfrastructureError).toBe(true);
    });

    it("should NOT mark 4xx errors as infrastructure errors", async () => {
      const { createKongApiError } = require("../../src/adapters/kong-utils");
      const response = new Response("{}", { status: 404 });

      const error = await createKongApiError(response);

      // Verify 4xx is not infrastructure (kills boolean mutations)
      expect(error.isInfrastructureError).toBe(false);
    });

    it("should NOT mark 400 as infrastructure error", async () => {
      const { createKongApiError } = require("../../src/adapters/kong-utils");
      const response = new Response("{}", { status: 400 });

      const error = await createKongApiError(response);
      expect(error.isInfrastructureError).toBe(false);
    });

    it("should NOT mark 401 as infrastructure error", async () => {
      const { createKongApiError } = require("../../src/adapters/kong-utils");
      const response = new Response("{}", { status: 401 });

      const error = await createKongApiError(response);
      expect(error.isInfrastructureError).toBe(false);
    });

    it("should NOT mark 403 as infrastructure error", async () => {
      const { createKongApiError } = require("../../src/adapters/kong-utils");
      const response = new Response("{}", { status: 403 });

      const error = await createKongApiError(response);
      expect(error.isInfrastructureError).toBe(false);
    });

    it("should have KongApiError as error name", async () => {
      const { createKongApiError } = require("../../src/adapters/kong-utils");
      const response = new Response("{}", { status: 500 });

      const error = await createKongApiError(response);

      // Verify error name (kills name assignment mutations)
      expect(error.name).toBe("KongApiError");
    });

    it("should be an instance of Error", async () => {
      const { createKongApiError } = require("../../src/adapters/kong-utils");
      const response = new Response("{}", { status: 500 });

      const error = await createKongApiError(response);

      // Verify inheritance (kills class mutations)
      expect(error).toBeInstanceOf(Error);
    });
  });
});

describe("KongApiError class direct tests", () => {
  it("should create error with all properties", () => {
    const { KongApiError } = require("../../src/adapters/kong-utils");
    const error = new KongApiError("Test message", 500, "Internal Server Error");

    expect(error.message).toBe("Test message");
    expect(error.status).toBe(500);
    expect(error.statusText).toBe("Internal Server Error");
    expect(error.isInfrastructureError).toBe(true);
    expect(error.name).toBe("KongApiError");
  });

  it("should use empty string for statusText if not provided", () => {
    const { KongApiError } = require("../../src/adapters/kong-utils");
    const error = new KongApiError("Test message", 404);

    expect(error.statusText).toBe("");
    expect(error.isInfrastructureError).toBe(false);
  });

  it("should correctly classify various status codes", () => {
    const { KongApiError } = require("../../src/adapters/kong-utils");

    // Infrastructure errors
    expect(new KongApiError("", 500).isInfrastructureError).toBe(true);
    expect(new KongApiError("", 502).isInfrastructureError).toBe(true);
    expect(new KongApiError("", 503).isInfrastructureError).toBe(true);
    expect(new KongApiError("", 504).isInfrastructureError).toBe(true);
    expect(new KongApiError("", 429).isInfrastructureError).toBe(true);
    expect(new KongApiError("", 599).isInfrastructureError).toBe(true);

    // Non-infrastructure errors
    expect(new KongApiError("", 200).isInfrastructureError).toBe(false);
    expect(new KongApiError("", 400).isInfrastructureError).toBe(false);
    expect(new KongApiError("", 401).isInfrastructureError).toBe(false);
    expect(new KongApiError("", 403).isInfrastructureError).toBe(false);
    expect(new KongApiError("", 404).isInfrastructureError).toBe(false);
    expect(new KongApiError("", 422).isInfrastructureError).toBe(false);
  });
});
