// test/bun/utils/response.mutation.test.ts

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { resetConfigCache } from "../../../src/config/config";
import {
  createErrorResponse,
  createHealthResponse,
  createInternalErrorResponse,
  createServiceUnavailableResponse,
  createStructuredErrorResponse,
  createStructuredErrorWithMessage,
  createSuccessResponse,
  createTokenResponse,
  createUnauthorizedResponse,
  DEFAULT_API_VERSION,
  generateKeyId,
  generateRequestId,
  getApiVersion,
  getCacheHeaders,
  getDefaultHeaders,
  getNoCacheHeaders,
  getSecurityHeaders,
  isValidApiVersion,
  SUPPORTED_API_VERSIONS,
} from "../../../src/utils/response";

describe("Response Utilities Mutation Tests", () => {
  const testRequestId = "test-request-id-12345";

  beforeEach(() => {
    resetConfigCache();
  });

  afterEach(() => {
    resetConfigCache();
  });

  describe("createSuccessResponse", () => {
    it("should return Response with status 200 (kills status mutation)", () => {
      const data = { message: "success" };
      const response = createSuccessResponse(data, testRequestId);

      // Kill status mutations - must be exactly 200
      expect(response.status).toBe(200);
      expect(response.status).not.toBe(0);
      expect(response.status).not.toBe(201);
      expect(response.status).not.toBe(400);
      expect(response.status).not.toBe(500);
    });

    it("should include headers object (kills headers mutation)", () => {
      const data = { test: "value" };
      const response = createSuccessResponse(data, testRequestId);

      // Kill headers ObjectLiteral mutations
      expect(response.headers).toBeDefined();
      expect(response.headers).not.toBeNull();
      expect(response.headers.get("Content-Type")).toBe("application/json");
      expect(response.headers.get("X-Request-Id")).toBe(testRequestId);
    });

    it("should include CORS headers (kills spread operator mutations)", () => {
      const response = createSuccessResponse({ ok: true }, testRequestId);

      // Kill mutations that remove CORS headers
      expect(response.headers.get("Access-Control-Allow-Origin")).not.toBeNull();
      expect(response.headers.get("Access-Control-Allow-Headers")).toContain("Content-Type");
      expect(response.headers.get("Access-Control-Allow-Methods")).toContain("GET");
    });

    it("should include additional headers when provided (kills spread mutations)", () => {
      const additionalHeaders = { "X-Custom-Header": "custom-value" };
      const response = createSuccessResponse({ ok: true }, testRequestId, additionalHeaders);

      expect(response.headers.get("X-Custom-Header")).toBe("custom-value");
      // Base headers should still exist
      expect(response.headers.get("Content-Type")).toBe("application/json");
    });

    it("should have valid JSON body (kills JSON.stringify mutations)", async () => {
      const data = { key: "value", nested: { inner: true } };
      const response = createSuccessResponse(data, testRequestId);

      const body = await response.json();
      expect(body).toEqual(data);
      expect(body.key).toBe("value");
      expect(body.nested.inner).toBe(true);
    });
  });

  describe("createErrorResponse", () => {
    it("should return Response with specified status code (kills status mutation)", () => {
      const response = createErrorResponse(400, "Bad Request", "Invalid input", testRequestId);

      // Kill status mutations
      expect(response.status).toBe(400);
      expect(response.status).not.toBe(0);
      expect(response.status).not.toBe(200);
      expect(response.status).not.toBe(500);
    });

    it("should include headers object (kills headers mutation)", () => {
      const response = createErrorResponse(401, "Unauthorized", "No token", testRequestId);

      expect(response.headers).toBeDefined();
      // RFC 7807 uses application/problem+json for error responses
      expect(response.headers.get("Content-Type")).toBe("application/problem+json");
      expect(response.headers.get("X-Request-Id")).toBe(testRequestId);
    });

    it("should include error data in body (kills JSON.stringify mutations)", async () => {
      const response = createErrorResponse(500, "Error", "Something went wrong", testRequestId);
      const body = await response.json();

      // RFC 7807 Problem Details format
      expect(body.title).toBe("Error");
      expect(body.detail).toBe("Something went wrong");
      expect(body.status).toBe(500);
      expect(body.requestId).toBe(testRequestId);
      expect(body.timestamp).toBeDefined();
      expect(typeof body.timestamp).toBe("string");
    });

    it("should include all required fields in error body", async () => {
      const response = createErrorResponse(403, "Forbidden", "Access denied", testRequestId);
      const body = await response.json();

      // RFC 7807 required fields: type, title, status, detail, instance, code, requestId, timestamp
      expect(Object.keys(body)).toContain("type");
      expect(Object.keys(body)).toContain("title");
      expect(Object.keys(body)).toContain("status");
      expect(Object.keys(body)).toContain("detail");
      expect(Object.keys(body)).toContain("timestamp");
      expect(Object.keys(body)).toContain("requestId");
      expect(Object.keys(body)).toContain("instance");
      expect(Object.keys(body)).toContain("code");
      expect(Object.keys(body).length).toBe(8);
    });
  });

  describe("createStructuredErrorResponse", () => {
    it("should return Response with correct HTTP status from error code (kills status mutation)", () => {
      const response = createStructuredErrorResponse("AUTH_001", testRequestId);

      // AUTH_001 should return 401
      expect(response.status).toBe(401);
      expect(response.status).not.toBe(0);
      expect(response.status).not.toBe(200);
    });

    it("should include structured error in body (kills body structure mutations)", async () => {
      const response = createStructuredErrorResponse("AUTH_001", testRequestId);
      const body = await response.json();

      // RFC 7807 Problem Details format
      expect(body.type).toBeDefined();
      expect(body.code).toBe("AUTH_001");
      expect(body.title).toBeDefined();
      expect(body.detail).toBeDefined();
      expect(body.status).toBeDefined();
    });

    it("should include details when provided (kills optional field mutations)", async () => {
      const details = { field: "username", reason: "invalid" };
      const response = createStructuredErrorResponse("AUTH_007", testRequestId, details);
      const body = await response.json();

      // RFC 7807 uses extensions field for additional details
      expect(body.extensions).toBeDefined();
      expect(body.extensions).toEqual(details);
    });

    it("should include headers (kills headers mutation)", () => {
      const response = createStructuredErrorResponse("AUTH_002", testRequestId);

      // RFC 7807 uses application/problem+json content type
      expect(response.headers.get("Content-Type")).toBe("application/problem+json");
      expect(response.headers.get("X-Request-Id")).toBe(testRequestId);
    });
  });

  describe("createStructuredErrorWithMessage", () => {
    it("should use custom message (kills message mutation)", async () => {
      const customMessage = "Custom error message for testing";
      const response = createStructuredErrorWithMessage("AUTH_001", customMessage, testRequestId);
      const body = await response.json();

      // RFC 7807 uses detail for the message
      expect(body.detail).toBe(customMessage);
      expect(body.detail).not.toBe(""); // Not empty
    });

    it("should still use error code from definition (kills code mutation)", async () => {
      const response = createStructuredErrorWithMessage("AUTH_003", "JWT failed", testRequestId);
      const body = await response.json();

      expect(body.code).toBe("AUTH_003");
    });

    it("should return correct HTTP status (kills status mutation)", () => {
      // AUTH_003 is 500 Internal Server Error
      const response = createStructuredErrorWithMessage("AUTH_003", "Error", testRequestId);

      expect(response.status).toBe(500);
      expect(response.status).not.toBe(0);
      expect(response.status).not.toBe(200);
    });
  });

  describe("createHealthResponse", () => {
    it("should return Response with specified status code (kills status mutation)", () => {
      const response = createHealthResponse({ status: "healthy" }, 200, testRequestId);

      expect(response.status).toBe(200);
      expect(response.status).not.toBe(0);
    });

    it("should return 503 for unhealthy (kills status value mutation)", () => {
      const response = createHealthResponse({ status: "unhealthy" }, 503, testRequestId);

      expect(response.status).toBe(503);
      expect(response.status).not.toBe(200);
      expect(response.status).not.toBe(0);
    });

    it("should include no-cache headers (kills header spread mutations)", () => {
      const response = createHealthResponse({ status: "ok" }, 200, testRequestId);

      expect(response.headers.get("Cache-Control")).toBe("no-cache");
    });

    it("should include default headers (kills getDefaultHeaders mutation)", () => {
      const response = createHealthResponse({ status: "ok" }, 200, testRequestId);

      expect(response.headers.get("Content-Type")).toBe("application/json");
      expect(response.headers.get("X-Request-Id")).toBe(testRequestId);
    });

    it("should have pretty-printed JSON body (kills null, 2 mutations)", async () => {
      const data = { status: "healthy", uptime: 1000 };
      const response = createHealthResponse(data, 200, testRequestId);
      const text = await response.text();

      // Pretty-printed JSON has newlines and indentation
      expect(text).toContain("\n");
      expect(text).toContain("  "); // 2-space indentation
    });
  });

  describe("createTokenResponse", () => {
    it("should return 200 status (kills status mutation)", () => {
      const response = createTokenResponse("token123", 3600, testRequestId);

      expect(response.status).toBe(200);
      expect(response.status).not.toBe(0);
      expect(response.status).not.toBe(201);
    });

    it("should include cache control headers (kills getCacheHeaders mutation)", () => {
      const response = createTokenResponse("token", 1800, testRequestId);

      expect(response.headers.get("Cache-Control")).toContain("no-store");
      expect(response.headers.get("Cache-Control")).toContain("no-cache");
      expect(response.headers.get("Pragma")).toBe("no-cache");
    });

    it("should include token data in body (kills body mutation)", async () => {
      const token = "jwt-token-xyz";
      const expiresIn = 7200;
      const response = createTokenResponse(token, expiresIn, testRequestId);
      const body = await response.json();

      expect(body.access_token).toBe(token);
      expect(body.access_token).not.toBe("");
      expect(body.expires_in).toBe(expiresIn);
      expect(body.expires_in).not.toBe(0);
    });

    it("should include API version when provided (kills conditional mutation)", async () => {
      const response = createTokenResponse("token", 3600, testRequestId, "v2");
      const body = await response.json();

      expect(body.apiVersion).toBe("v2");
      expect(response.headers.get("API-Version")).toBe("v2");
    });

    it("should not include API version when not provided (kills optional field mutation)", async () => {
      const response = createTokenResponse("token", 3600, testRequestId);
      const body = await response.json();

      expect(body.apiVersion).toBeUndefined();
    });
  });

  describe("createUnauthorizedResponse", () => {
    it("should return 401 status (kills status mutation)", () => {
      const response = createUnauthorizedResponse("Access denied", testRequestId);

      expect(response.status).toBe(401);
      expect(response.status).not.toBe(0);
      expect(response.status).not.toBe(403);
      expect(response.status).not.toBe(500);
    });

    it("should include Unauthorized error type (kills error string mutation)", async () => {
      const response = createUnauthorizedResponse("Invalid credentials", testRequestId);
      const body = await response.json();

      // RFC 7807 format uses title instead of error
      expect(body.title).toBe("Unauthorized");
      expect(body.title).not.toBe("");
    });
  });

  describe("createInternalErrorResponse", () => {
    it("should return 500 status (kills status mutation)", () => {
      const response = createInternalErrorResponse("Server error", testRequestId);

      expect(response.status).toBe(500);
      expect(response.status).not.toBe(0);
      expect(response.status).not.toBe(200);
      expect(response.status).not.toBe(503);
    });

    it("should include Internal Server Error type (kills error string mutation)", async () => {
      const response = createInternalErrorResponse("Something broke", testRequestId);
      const body = await response.json();

      // RFC 7807 format uses title instead of error
      expect(body.title).toBe("Internal Server Error");
      expect(body.title).not.toBe("");
    });
  });

  describe("createServiceUnavailableResponse", () => {
    it("should return 503 status (kills status mutation)", () => {
      const response = createServiceUnavailableResponse("Service down", testRequestId);

      expect(response.status).toBe(503);
      expect(response.status).not.toBe(0);
      expect(response.status).not.toBe(500);
      expect(response.status).not.toBe(200);
    });

    it("should include Service Unavailable error type (kills error string mutation)", async () => {
      const response = createServiceUnavailableResponse("Maintenance", testRequestId);
      const body = await response.json();

      // RFC 7807 format uses title instead of error
      expect(body.title).toBe("Service Unavailable");
      expect(body.title).not.toBe("");
    });
  });

  describe("getSecurityHeaders", () => {
    it("should return object with HSTS header (kills ObjectLiteral mutation)", () => {
      const headers = getSecurityHeaders();

      expect(headers["Strict-Transport-Security"]).toBe("max-age=31536000; includeSubDomains");
      expect(headers["Strict-Transport-Security"]).not.toBe("");
    });

    it("should return object with X-Content-Type-Options (kills property mutation)", () => {
      const headers = getSecurityHeaders();

      expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    });

    it("should return object with X-Frame-Options (kills property mutation)", () => {
      const headers = getSecurityHeaders();

      expect(headers["X-Frame-Options"]).toBe("DENY");
    });

    it("should return object with X-XSS-Protection (kills property mutation)", () => {
      const headers = getSecurityHeaders();

      expect(headers["X-XSS-Protection"]).toBe("0");
    });

    it("should return object with CSP (kills property mutation)", () => {
      const headers = getSecurityHeaders();

      expect(headers["Content-Security-Policy"]).toContain("default-src 'none'");
    });

    it("should return object with correct number of headers (kills field removal mutations)", () => {
      const headers = getSecurityHeaders();

      expect(Object.keys(headers).length).toBe(7);
    });
  });

  describe("getDefaultHeaders", () => {
    it("should include Content-Type header (kills ObjectLiteral mutation)", () => {
      const headers = getDefaultHeaders(testRequestId);

      expect(headers["Content-Type"]).toBe("application/json");
      expect(headers["Content-Type"]).not.toBe("");
    });

    it("should include X-Request-Id header (kills property mutation)", () => {
      const headers = getDefaultHeaders(testRequestId);

      expect(headers["X-Request-Id"]).toBe(testRequestId);
    });

    it("should include CORS headers (kills CORS mutations)", () => {
      const headers = getDefaultHeaders(testRequestId);

      expect(headers["Access-Control-Allow-Origin"]).toBeDefined();
      expect(headers["Access-Control-Allow-Headers"]).toContain("Content-Type");
      expect(headers["Access-Control-Allow-Methods"]).toContain("GET");
    });

    it("should have 6 headers for v1 (kills spread mutations)", () => {
      const headers = getDefaultHeaders(testRequestId);

      // 6 headers: Content-Type, X-Request-Id, CORS origin/headers/methods, Vary
      expect(Object.keys(headers).length).toBe(6);
    });

    it("should include security headers for v2 (kills conditional spread mutation)", () => {
      const headers = getDefaultHeaders(testRequestId, "v2");

      // V2 has base headers + security headers + API-Version
      expect(headers["Strict-Transport-Security"]).toBeDefined();
      expect(headers["X-Content-Type-Options"]).toBe("nosniff");
      expect(headers["API-Version"]).toBe("v2");
      expect(Object.keys(headers).length).toBeGreaterThan(5);
    });

    it("should not include security headers for v1 (kills version check mutation)", () => {
      const headers = getDefaultHeaders(testRequestId, "v1");

      expect(headers["Strict-Transport-Security"]).toBeUndefined();
      expect(headers["API-Version"]).toBeUndefined();
    });
  });

  describe("getCacheHeaders", () => {
    it("should return Cache-Control with no-store (kills ObjectLiteral mutation)", () => {
      const headers = getCacheHeaders();

      expect(headers["Cache-Control"]).toContain("no-store");
      expect(headers["Cache-Control"]).toContain("no-cache");
      expect(headers["Cache-Control"]).toContain("must-revalidate");
    });

    it("should return Pragma header (kills property mutation)", () => {
      const headers = getCacheHeaders();

      expect(headers.Pragma).toBe("no-cache");
    });

    it("should have exactly 2 headers (kills field removal mutations)", () => {
      const headers = getCacheHeaders();

      expect(Object.keys(headers).length).toBe(2);
    });
  });

  describe("getNoCacheHeaders", () => {
    it("should return Cache-Control with no-cache (kills ObjectLiteral mutation)", () => {
      const headers = getNoCacheHeaders();

      expect(headers["Cache-Control"]).toBe("no-cache");
      expect(headers["Cache-Control"]).not.toBe("");
    });

    it("should have exactly 1 header (kills field addition mutations)", () => {
      const headers = getNoCacheHeaders();

      expect(Object.keys(headers).length).toBe(1);
    });
  });

  describe("generateRequestId", () => {
    it("should return a valid UUID format (kills UUID mutations)", () => {
      const id = generateRequestId();

      // UUID v4 format: 8-4-4-4-12
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it("should return different values on each call (kills constant mutations)", () => {
      const id1 = generateRequestId();
      const id2 = generateRequestId();

      expect(id1).not.toBe(id2);
    });

    it("should return non-empty string (kills empty return mutation)", () => {
      const id = generateRequestId();

      expect(id.length).toBeGreaterThan(0);
      expect(id.length).toBe(36); // UUID length
    });
  });

  describe("generateKeyId", () => {
    it("should return UUID without dashes (kills replace mutation)", () => {
      const keyId = generateKeyId();

      expect(keyId).not.toContain("-");
      expect(keyId.length).toBe(32); // 36 - 4 dashes
    });

    it("should return different values on each call (kills constant mutations)", () => {
      const id1 = generateKeyId();
      const id2 = generateKeyId();

      expect(id1).not.toBe(id2);
    });

    it("should only contain hex characters (kills regex mutation)", () => {
      const keyId = generateKeyId();

      expect(keyId).toMatch(/^[0-9a-f]{32}$/i);
    });
  });

  describe("isValidApiVersion", () => {
    it("should return true for v1 (kills comparison mutation)", () => {
      expect(isValidApiVersion("v1")).toBe(true);
      expect(isValidApiVersion("v1")).not.toBe(false);
    });

    it("should return true for v2 (kills comparison mutation)", () => {
      expect(isValidApiVersion("v2")).toBe(true);
      expect(isValidApiVersion("v2")).not.toBe(false);
    });

    it("should return false for v3 (kills boundary mutation)", () => {
      expect(isValidApiVersion("v3")).toBe(false);
      expect(isValidApiVersion("v3")).not.toBe(true);
    });

    it("should return false for empty string (kills empty check mutation)", () => {
      expect(isValidApiVersion("")).toBe(false);
    });

    it("should return false for invalid versions (kills includes mutation)", () => {
      expect(isValidApiVersion("v0")).toBe(false);
      expect(isValidApiVersion("version1")).toBe(false);
      expect(isValidApiVersion("1")).toBe(false);
    });
  });

  describe("getApiVersion", () => {
    it("should return version from Accept-Version header (kills header extraction mutation)", () => {
      const request = new Request("http://localhost", {
        headers: { "Accept-Version": "v2" },
      });

      const version = getApiVersion(request);
      expect(version).toBe("v2");
      expect(version).not.toBe("v1");
    });

    it("should return default for missing header (kills null check mutation)", () => {
      const request = new Request("http://localhost");

      const version = getApiVersion(request);
      expect(version).toBe(DEFAULT_API_VERSION);
      expect(version).toBe("v1");
    });

    it("should return default for invalid version (kills validation mutation)", () => {
      const request = new Request("http://localhost", {
        headers: { "Accept-Version": "v99" },
      });

      const version = getApiVersion(request);
      expect(version).toBe(DEFAULT_API_VERSION);
    });

    it("should return v1 for Accept-Version: v1 (kills version extraction mutation)", () => {
      const request = new Request("http://localhost", {
        headers: { "Accept-Version": "v1" },
      });

      const version = getApiVersion(request);
      expect(version).toBe("v1");
    });
  });

  describe("API Version Constants", () => {
    it("should have v1 as default version (kills constant mutation)", () => {
      expect(DEFAULT_API_VERSION).toBe("v1");
      expect(DEFAULT_API_VERSION).not.toBe("v2");
      expect(DEFAULT_API_VERSION).not.toBe("");
    });

    it("should support v1 and v2 (kills array mutation)", () => {
      expect(SUPPORTED_API_VERSIONS).toContain("v1");
      expect(SUPPORTED_API_VERSIONS).toContain("v2");
      expect(SUPPORTED_API_VERSIONS.length).toBe(2);
    });

    it("should not support v3 (kills boundary mutation)", () => {
      expect(SUPPORTED_API_VERSIONS).not.toContain("v3");
    });
  });

  /**
   * LogicalOperator mutation killers
   * These tests target the `...(details && { details })` patterns
   * Mutation changes && to ||, which would include undefined details
   */
  describe("LogicalOperator mutation killers - optional spreading", () => {
    // Kill mutation: line 178/210 - details && { details } -> details || { details }
    it("should NOT include extensions property when details is undefined (kills && to || mutation)", async () => {
      // createStructuredErrorWithMessage without details parameter
      const response = createStructuredErrorWithMessage("AUTH_001", "Test message", testRequestId);
      const body = await response.json();

      // The extensions property should NOT exist at all when not provided
      // If mutated to ||, it would be `...({ extensions: undefined })` which includes the key
      // RFC 7807 uses extensions for additional details
      expect(body.type).toBeDefined();
      expect("extensions" in body).toBe(false);
      expect(body.extensions).toBeUndefined();
      expect(Object.keys(body)).not.toContain("extensions");
    });

    it("should include extensions property when details IS provided", async () => {
      const details = { field: "username", reason: "required" };
      const response = createStructuredErrorWithMessage(
        "AUTH_001",
        "Test message",
        testRequestId,
        details
      );
      const body = await response.json();

      // When details is provided, it SHOULD be in the response as extensions (RFC 7807)
      expect(body.extensions).toBeDefined();
      expect(body.extensions).toEqual(details);
      expect("extensions" in body).toBe(true);
    });

    it("should NOT include extensions in createStructuredErrorResponse when not provided (kills line 178)", async () => {
      const response = createStructuredErrorResponse("AUTH_002", testRequestId);
      const body = await response.json();

      // extensions should not be present in RFC 7807 format
      expect("extensions" in body).toBe(false);
      // RFC 7807 required fields: type, title, status, detail, instance, code, requestId, timestamp
      expect(Object.keys(body).length).toBe(8);
    });

    it("should include extensions in createStructuredErrorResponse when provided", async () => {
      const details = { consumerId: "test-123" };
      const response = createStructuredErrorResponse("AUTH_002", testRequestId, details);
      const body = await response.json();

      // extensions should be present in RFC 7807 format
      expect("extensions" in body).toBe(true);
      expect(body.extensions).toEqual(details);
      expect(Object.keys(body).length).toBe(9); // 8 required fields + extensions
    });

    it("should verify exact object structure without details (strict check)", async () => {
      const response = createStructuredErrorWithMessage("AUTH_003", "JWT failed", testRequestId);
      const body = await response.json();

      // Verify the exact structure for RFC 7807 format
      const bodyKeys = Object.keys(body).sort();
      // RFC 7807 required fields: type, title, status, detail, instance, code, requestId, timestamp
      expect(bodyKeys).toEqual([
        "code",
        "detail",
        "instance",
        "requestId",
        "status",
        "timestamp",
        "title",
        "type",
      ]);

      // This would fail if && was mutated to || because extensions key would exist
      expect(bodyKeys).not.toContain("extensions");
    });

    it("should have different object key count with and without details", async () => {
      const withoutDetails = createStructuredErrorWithMessage(
        "AUTH_001",
        "No details",
        testRequestId
      );
      const withDetails = createStructuredErrorWithMessage(
        "AUTH_001",
        "With details",
        testRequestId,
        { extra: "info" }
      );

      const bodyWithout = await withoutDetails.json();
      const bodyWith = await withDetails.json();

      // RFC 7807: Without extensions: 8 keys (type, title, status, detail, instance, code, requestId, timestamp)
      // With extensions: 9 keys (+ extensions)
      expect(Object.keys(bodyWithout).length).toBe(8);
      expect(Object.keys(bodyWith).length).toBe(9);

      // This proves the && operator correctly omits the extensions key
      expect(Object.keys(bodyWith).length - Object.keys(bodyWithout).length).toBe(1);
    });
  });
});
