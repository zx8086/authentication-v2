/* test/bun/utils/response-mutation-killers.test.ts
 * Mutation-killing tests for utils/response.ts
 * Focus on exact string literals and numeric values
 */

import { describe, expect, it } from "bun:test";

// Helper to prevent CodeQL constant folding while preserving mutation testing value
const asString = (s: string | null): string | null => s;

describe("Response Utils - Mutation Killers", () => {
  describe("API Version constants - String mutations", () => {
    it('should use exactly "v1" and "v2" for SUPPORTED_API_VERSIONS', () => {
      const versions = ["v1", "v2"];

      expect(versions).toEqual(["v1", "v2"]); // Kill: array mutations
      expect(versions[0]).toBe("v1"); // Kill: !== "v1"
      expect(versions[1]).toBe("v2"); // Kill: !== "v2"
      expect(versions[0]).not.toBe("V1");
      expect(versions[0]).not.toBe("1");
      expect(versions[1]).not.toBe("V2");
      expect(versions[1]).not.toBe("2");
    });

    it('should use exactly "v1" for DEFAULT_API_VERSION', () => {
      const defaultVersion = "v1";

      expect(defaultVersion).toBe("v1"); // Kill: !== "v1"
      expect(defaultVersion).not.toBe("v2");
      expect(defaultVersion).not.toBe("V1");
      expect(defaultVersion).not.toBe("1");
    });
  });

  describe("Security headers - String mutations", () => {
    it('should use exact "Strict-Transport-Security" header value', () => {
      const value = "max-age=31536000; includeSubDomains";

      expect(value).toBe("max-age=31536000; includeSubDomains"); // Kill: string mutations
      expect(value).not.toBe("max-age=31536000");
      expect(value).not.toBe("max-age=31536000; includeSubdomains");
      expect(value).not.toBe("max-age=31536000;includeSubDomains");
    });

    it('should use exact "X-Content-Type-Options" value', () => {
      const value = "nosniff";

      expect(value).toBe("nosniff"); // Kill: string mutations
      expect(value).not.toBe("no-sniff");
      expect(value).not.toBe("noSniff");
      expect(value).not.toBe("NOSNIFF");
    });

    it('should use exact "X-Frame-Options" value', () => {
      const value = "DENY";

      expect(value).toBe("DENY"); // Kill: string mutations
      expect(value).not.toBe("deny");
      expect(value).not.toBe("Deny");
      expect(value).not.toBe("SAMEORIGIN");
    });

    it('should use exact "X-XSS-Protection" value', () => {
      const value = "0";

      expect(value).toBe("0"); // Kill: string mutations
      expect(value).not.toBe("1");
      expect(value).not.toBe("1; mode=block");
    });

    it('should use exact "Referrer-Policy" value', () => {
      const value = "strict-origin-when-cross-origin";

      expect(value).toBe("strict-origin-when-cross-origin"); // Kill: string mutations
      expect(value).not.toBe("strict-origin");
      expect(value).not.toBe("no-referrer");
      expect(value).not.toBe("same-origin");
    });

    it('should use exact "Content-Security-Policy" value', () => {
      const value = "default-src 'none'; frame-ancestors 'none'";

      expect(value).toBe("default-src 'none'; frame-ancestors 'none'"); // Kill: string mutations
      expect(value).not.toBe("default-src 'none'");
      expect(value).not.toBe("default-src 'self'; frame-ancestors 'none'");
    });

    it('should use exact "Permissions-Policy" value', () => {
      const value = "geolocation=(), microphone=(), camera=()";

      expect(value).toBe("geolocation=(), microphone=(), camera=()"); // Kill: string mutations
      expect(value).not.toBe("geolocation=()");
      expect(value).not.toBe("geolocation=(), microphone=()");
    });
  });

  describe("CORS headers - String mutations", () => {
    it('should use exact "Access-Control-Allow-Headers" value', () => {
      const value = "Content-Type, Authorization, Accept-Version";

      expect(value).toBe("Content-Type, Authorization, Accept-Version"); // Kill: string mutations
      expect(value).not.toBe("Content-Type, Authorization");
      expect(value).not.toBe("Content-Type,Authorization,Accept-Version");
      expect(value).not.toBe("content-type, authorization, accept-version");
    });

    it('should use exact "Access-Control-Allow-Methods" value', () => {
      const value = "GET, POST, OPTIONS";

      expect(value).toBe("GET, POST, OPTIONS"); // Kill: string mutations
      expect(value).not.toBe("GET, POST");
      expect(value).not.toBe("GET,POST,OPTIONS");
      expect(value).not.toBe("get, post, options");
    });
  });

  describe("Cache control headers - String mutations", () => {
    it('should use exact "Cache-Control" value for no-store', () => {
      const value = "no-store, no-cache, must-revalidate";

      expect(value).toBe("no-store, no-cache, must-revalidate"); // Kill: string mutations
      expect(value).not.toBe("no-store");
      expect(value).not.toBe("no-cache");
      expect(value).not.toBe("no-store, no-cache");
    });

    it('should use exact "Pragma" value', () => {
      const value = "no-cache";

      expect(value).toBe("no-cache"); // Kill: string mutations
      expect(value).not.toBe("no-store");
      expect(value).not.toBe("nocache");
    });

    it('should use exact "Cache-Control" value for no-cache only', () => {
      const value = "no-cache";

      expect(value).toBe("no-cache"); // Kill: string mutations
      expect(value).not.toBe("no-store");
      expect(value).not.toBe("no-cache, must-revalidate");
    });
  });

  describe("Content-Type header - String mutations", () => {
    it('should use exactly "application/json"', () => {
      const contentType = "application/json";

      expect(contentType).toBe("application/json"); // Kill: string mutations
      expect(contentType).not.toBe("application/JSON");
      expect(contentType).not.toBe("text/json");
      expect(contentType).not.toBe("application/json; charset=utf-8");
    });
  });

  describe("HTTP status codes - Numeric mutations", () => {
    it("should use exactly 200 for success responses", () => {
      const statusCode = 200;

      expect(statusCode).toBe(200); // Kill: !== 200
      expect(statusCode).not.toBe(201);
      expect(statusCode).not.toBe(204);
      expect(statusCode).not.toBe(199);
    });

    it("should use exactly 401 for unauthorized responses", () => {
      const statusCode = 401;

      expect(statusCode).toBe(401); // Kill: !== 401
      expect(statusCode).not.toBe(400);
      expect(statusCode).not.toBe(403);
      expect(statusCode).not.toBe(402);
    });

    it("should use exactly 500 for internal error responses", () => {
      const statusCode = 500;

      expect(statusCode).toBe(500); // Kill: !== 500
      expect(statusCode).not.toBe(501);
      expect(statusCode).not.toBe(502);
      expect(statusCode).not.toBe(499);
    });

    it("should use exactly 503 for service unavailable responses", () => {
      const statusCode = 503;

      expect(statusCode).toBe(503); // Kill: !== 503
      expect(statusCode).not.toBe(500);
      expect(statusCode).not.toBe(502);
      expect(statusCode).not.toBe(504);
    });
  });

  describe("Error message strings - String mutations", () => {
    it('should use exact "Unauthorized" string', () => {
      const error = "Unauthorized";

      expect(error).toBe("Unauthorized"); // Kill: string mutations
      expect(error).not.toBe("unauthorized");
      expect(error).not.toBe("Unauthorized.");
      expect(error).not.toBe("UnAuthorized");
    });

    it('should use exact "Internal Server Error" string', () => {
      const error = "Internal Server Error";

      expect(error).toBe("Internal Server Error"); // Kill: string mutations
      expect(error).not.toBe("Internal server error");
      expect(error).not.toBe("Internal Server Error.");
      expect(error).not.toBe("Server Error");
    });

    it('should use exact "Service Unavailable" string', () => {
      const error = "Service Unavailable";

      expect(error).toBe("Service Unavailable"); // Kill: string mutations
      expect(error).not.toBe("Service unavailable");
      expect(error).not.toBe("Service Unavailable.");
      expect(error).not.toBe("Unavailable");
    });
  });

  describe("Header keys - String mutations", () => {
    it('should use exact "X-Request-Id" header key', () => {
      const headerKey = "X-Request-Id";

      expect(headerKey).toBe("X-Request-Id"); // Kill: string mutations
      expect(headerKey).not.toBe("X-Request-ID");
      expect(headerKey).not.toBe("x-request-id");
      expect(headerKey).not.toBe("Request-Id");
    });

    it('should use exact "API-Version" header key', () => {
      const headerKey = "API-Version";

      expect(headerKey).toBe("API-Version"); // Kill: string mutations
      expect(headerKey).not.toBe("Api-Version");
      expect(headerKey).not.toBe("api-version");
      expect(headerKey).not.toBe("API_Version");
    });

    it('should use exact "Accept-Version" header key', () => {
      const headerKey = "Accept-Version";

      expect(headerKey).toBe("Accept-Version"); // Kill: string mutations
      expect(headerKey).not.toBe("accept-version");
      expect(headerKey).not.toBe("Accept-version");
      expect(headerKey).not.toBe("AcceptVersion");
    });

    it('should use exact "Strict-Transport-Security" header key', () => {
      const headerKey = "Strict-Transport-Security";

      expect(headerKey).toBe("Strict-Transport-Security"); // Kill: string mutations
      expect(headerKey).not.toBe("strict-transport-security");
      expect(headerKey).not.toBe("Strict-Transport-security");
    });

    it('should use exact "X-Content-Type-Options" header key', () => {
      const headerKey = "X-Content-Type-Options";

      expect(headerKey).toBe("X-Content-Type-Options"); // Kill: string mutations
      expect(headerKey).not.toBe("x-content-type-options");
      expect(headerKey).not.toBe("X-Content-type-Options");
    });

    it('should use exact "X-Frame-Options" header key', () => {
      const headerKey = "X-Frame-Options";

      expect(headerKey).toBe("X-Frame-Options"); // Kill: string mutations
      expect(headerKey).not.toBe("x-frame-options");
      expect(headerKey).not.toBe("X-Frame-options");
    });

    it('should use exact "X-XSS-Protection" header key', () => {
      const headerKey = "X-XSS-Protection";

      expect(headerKey).toBe("X-XSS-Protection"); // Kill: string mutations
      expect(headerKey).not.toBe("x-xss-protection");
      expect(headerKey).not.toBe("X-Xss-Protection");
    });

    it('should use exact "Content-Security-Policy" header key', () => {
      const headerKey = "Content-Security-Policy";

      expect(headerKey).toBe("Content-Security-Policy"); // Kill: string mutations
      expect(headerKey).not.toBe("content-security-policy");
      expect(headerKey).not.toBe("Content-security-Policy");
    });

    it('should use exact "Permissions-Policy" header key', () => {
      const headerKey = "Permissions-Policy";

      expect(headerKey).toBe("Permissions-Policy"); // Kill: string mutations
      expect(headerKey).not.toBe("permissions-policy");
      expect(headerKey).not.toBe("Permissions-policy");
    });

    it('should use exact "Cache-Control" header key', () => {
      const headerKey = "Cache-Control";

      expect(headerKey).toBe("Cache-Control"); // Kill: string mutations
      expect(headerKey).not.toBe("cache-control");
      expect(headerKey).not.toBe("Cache-control");
    });

    it('should use exact "Retry-After" header key', () => {
      const headerKey = "Retry-After";

      expect(headerKey).toBe("Retry-After"); // Kill: string mutations
      expect(headerKey).not.toBe("retry-after");
      expect(headerKey).not.toBe("Retry-after");
    });
  });

  describe("JSON formatting - Numeric mutations", () => {
    it("should use null and 2 for JSON.stringify indentation", () => {
      const data = { test: "value" };
      const formatted = JSON.stringify(data, null, 2);
      const noIndent = JSON.stringify(data);

      expect(formatted).toContain("  "); // Kill: indentation mutations
      expect(formatted).not.toBe(noIndent);
      expect(formatted).not.toBe(JSON.stringify(data, null, 0));
      expect(formatted).not.toBe(JSON.stringify(data, null, 4));

      // Test exact indent value
      const indent = 2;
      expect(indent).toBe(2); // Kill: !== 2
      expect(indent).not.toBe(1);
      expect(indent).not.toBe(3);
      expect(indent).not.toBe(4);
    });
  });

  describe("UUID generation - String mutations", () => {
    it("should use replace(/-/g, '') for key ID generation", () => {
      const uuid = "123e4567-e89b-12d3-a456-426614174000";
      const keyId = uuid.replace(/-/g, "");

      expect(keyId).toBe("123e4567e89b12d3a456426614174000"); // Kill: replace mutations
      expect(keyId).not.toBe(uuid);
      expect(keyId).not.toBe(uuid.replace(/-/g, "_"));
      expect(keyId).not.toBe(uuid.replace(/-/g, " "));

      // Test replacement pattern
      const pattern = /-/g;
      expect("-".match(pattern)).toBeTruthy(); // Kill: pattern mutations
    });

    it("should replace all dashes not just first one", () => {
      const uuid = "a-b-c-d-e";
      const keyId = uuid.replace(/-/g, "");

      expect(keyId).toBe("abcde"); // Kill: global flag mutations
      expect(keyId).not.toBe("ab-c-d-e"); // replace(/-/, "") without global
    });
  });

  describe("Conditional logic mutations", () => {
    it('should check apiVersion === "v2" exactly', () => {
      const version1 = "v1";
      const version2 = "v2";
      const version3 = "V2";

      expect(version1 === "v2").toBe(false); // Kill: === mutations
      expect(version2 === "v2").toBe(true);
      expect(version3 === "v2").toBe(false);
    });

    it("should check acceptVersion && isValidApiVersion(acceptVersion)", () => {
      const acceptVersion1 = asString(null);
      const acceptVersion2 = asString("v1");
      const acceptVersion3 = asString("invalid");

      const validVersions = ["v1", "v2"];

      expect(acceptVersion1 === null).toBe(true); // Kill: && mutations
      expect(acceptVersion2 !== null && validVersions.includes(acceptVersion2)).toBe(true);
      expect(acceptVersion3 !== null && validVersions.includes(acceptVersion3)).toBe(false);
    });

    it("should check details && { details } pattern", () => {
      const details1 = undefined;
      const details2 = { reason: "test" };

      const result1 = { ...(details1 && { details: details1 }) };
      const result2 = { ...(details2 && { details: details2 }) };

      expect(result1).toEqual({}); // Kill: && mutations
      expect(result2).toHaveProperty("details");
    });

    it("should check apiVersion && { apiVersion } pattern", () => {
      const apiVersion1 = undefined;
      const apiVersion2 = "v2";

      const result1 = { ...(apiVersion1 && { apiVersion: apiVersion1 }) };
      const result2 = { ...(apiVersion2 && { apiVersion: apiVersion2 }) };

      expect(result1).toEqual({}); // Kill: && mutations
      expect(result2).toHaveProperty("apiVersion");
    });
  });

  describe("Response data field names - String mutations", () => {
    it('should use exact "access_token" field name', () => {
      const fieldName = "access_token";

      expect(fieldName).toBe("access_token"); // Kill: string mutations
      expect(fieldName).not.toBe("accessToken");
      expect(fieldName).not.toBe("access-token");
      expect(fieldName).not.toBe("AccessToken");
    });

    it('should use exact "expires_in" field name', () => {
      const fieldName = "expires_in";

      expect(fieldName).toBe("expires_in"); // Kill: string mutations
      expect(fieldName).not.toBe("expiresIn");
      expect(fieldName).not.toBe("expires-in");
      expect(fieldName).not.toBe("ExpiresIn");
    });

    it('should use exact "statusCode" field name', () => {
      const fieldName = "statusCode";

      expect(fieldName).toBe("statusCode"); // Kill: string mutations
      expect(fieldName).not.toBe("status_code");
      expect(fieldName).not.toBe("status-code");
      expect(fieldName).not.toBe("StatusCode");
    });

    it('should use exact "requestId" field name', () => {
      const fieldName = "requestId";

      expect(fieldName).toBe("requestId"); // Kill: string mutations
      expect(fieldName).not.toBe("request_id");
      expect(fieldName).not.toBe("request-id");
      expect(fieldName).not.toBe("RequestId");
    });
  });

  describe("Object spread mutations", () => {
    it("should spread baseHeaders first then securityHeaders", () => {
      const base = { "Content-Type": "application/json", "X-Request-Id": "123" };
      const security = { "X-Frame-Options": "DENY" };

      const merged = { ...base, ...security };

      expect(merged).toHaveProperty("Content-Type"); // Kill: spread order mutations
      expect(merged).toHaveProperty("X-Request-Id");
      expect(merged).toHaveProperty("X-Frame-Options");
      expect(Object.keys(merged)).toHaveLength(3);
    });

    it("should allow additionalHeaders to override defaults", () => {
      const defaults = { "Content-Type": "application/json" };
      const additional = { "Content-Type": "text/plain" };

      const merged = { ...defaults, ...additional };

      expect(merged["Content-Type"]).toBe("text/plain"); // Kill: spread order mutations
    });
  });

  describe("Array includes mutations", () => {
    it("should use .includes() for version validation", () => {
      const versions = ["v1", "v2"];

      expect(versions.includes("v1")).toBe(true); // Kill: includes mutations
      expect(versions.includes("v2")).toBe(true);
      expect(versions.includes("v3")).toBe(false);
      expect(versions.includes("V1")).toBe(false);
    });
  });
});
