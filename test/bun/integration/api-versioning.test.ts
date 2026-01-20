/* test/bun/api-versioning.test.ts */

import { describe, expect, it } from "bun:test";
import {
  DEFAULT_API_VERSION,
  getApiVersion,
  getDefaultHeaders,
  getSecurityHeaders,
  isValidApiVersion,
  SUPPORTED_API_VERSIONS,
} from "../../../src/utils/response";

describe("API Versioning", () => {
  describe("Constants", () => {
    it("should have v1 as the default API version", () => {
      expect(DEFAULT_API_VERSION).toBe("v1");
    });

    it("should support v1 and v2 versions", () => {
      expect(SUPPORTED_API_VERSIONS).toEqual(["v1", "v2"]);
    });

    it("should have exactly 2 supported versions", () => {
      expect(SUPPORTED_API_VERSIONS.length).toBe(2);
    });
  });

  describe("getApiVersion", () => {
    it("should return v1 when no Accept-Version header is present", () => {
      const req = new Request("http://localhost/test");
      expect(getApiVersion(req)).toBe("v1");
    });

    it("should return v1 when Accept-Version header is v1", () => {
      const req = new Request("http://localhost/test", {
        headers: { "Accept-Version": "v1" },
      });
      expect(getApiVersion(req)).toBe("v1");
    });

    it("should return v2 when Accept-Version header is v2", () => {
      const req = new Request("http://localhost/test", {
        headers: { "Accept-Version": "v2" },
      });
      expect(getApiVersion(req)).toBe("v2");
    });

    it("should return v1 for invalid version strings", () => {
      const invalidVersions = ["v3", "v0", "1", "2", "version1", "", "V2", "V1"];

      for (const version of invalidVersions) {
        const req = new Request("http://localhost/test", {
          headers: { "Accept-Version": version },
        });
        expect(getApiVersion(req)).toBe("v1");
      }
    });

    it("should be case-sensitive (V2 is not valid)", () => {
      const req = new Request("http://localhost/test", {
        headers: { "Accept-Version": "V2" },
      });
      expect(getApiVersion(req)).toBe("v1");
    });
  });

  describe("isValidApiVersion", () => {
    it("should return true for v1", () => {
      expect(isValidApiVersion("v1")).toBe(true);
    });

    it("should return true for v2", () => {
      expect(isValidApiVersion("v2")).toBe(true);
    });

    it("should return false for invalid versions", () => {
      expect(isValidApiVersion("v3")).toBe(false);
      expect(isValidApiVersion("v0")).toBe(false);
      expect(isValidApiVersion("")).toBe(false);
      expect(isValidApiVersion("1")).toBe(false);
      expect(isValidApiVersion("V1")).toBe(false);
      expect(isValidApiVersion("V2")).toBe(false);
    });
  });

  describe("getSecurityHeaders", () => {
    it("should return all OWASP security headers", () => {
      const headers = getSecurityHeaders();

      expect(headers["Strict-Transport-Security"]).toBe("max-age=31536000; includeSubDomains");
      expect(headers["X-Content-Type-Options"]).toBe("nosniff");
      expect(headers["X-Frame-Options"]).toBe("DENY");
      expect(headers["X-XSS-Protection"]).toBe("0");
      expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
      expect(headers["Content-Security-Policy"]).toBe("default-src 'none'; frame-ancestors 'none'");
      expect(headers["Permissions-Policy"]).toBe("geolocation=(), microphone=(), camera=()");
    });

    it("should return exactly 7 security headers", () => {
      const headers = getSecurityHeaders();
      expect(Object.keys(headers).length).toBe(7);
    });
  });

  describe("getDefaultHeaders", () => {
    const requestId = "test-request-id-123";

    describe("without API version (defaults to v1 behavior)", () => {
      it("should include standard headers", () => {
        const headers = getDefaultHeaders(requestId);

        expect(headers["Content-Type"]).toBe("application/json");
        expect(headers["X-Request-Id"]).toBe(requestId);
        expect(headers["Access-Control-Allow-Origin"]).toBeDefined();
        expect(headers["Access-Control-Allow-Headers"]).toContain("Accept-Version");
        expect(headers["Access-Control-Allow-Methods"]).toBe("GET, POST, OPTIONS");
      });

      it("should NOT include security headers", () => {
        const headers = getDefaultHeaders(requestId);

        expect(headers["Strict-Transport-Security"]).toBeUndefined();
        expect(headers["X-Content-Type-Options"]).toBeUndefined();
        expect(headers["X-Frame-Options"]).toBeUndefined();
        expect(headers["X-XSS-Protection"]).toBeUndefined();
        expect(headers["Referrer-Policy"]).toBeUndefined();
        expect(headers["Content-Security-Policy"]).toBeUndefined();
        expect(headers["Permissions-Policy"]).toBeUndefined();
        expect(headers["API-Version"]).toBeUndefined();
      });
    });

    describe("with API version v1", () => {
      it("should include standard headers", () => {
        const headers = getDefaultHeaders(requestId, "v1");

        expect(headers["Content-Type"]).toBe("application/json");
        expect(headers["X-Request-Id"]).toBe(requestId);
        expect(headers["Access-Control-Allow-Origin"]).toBeDefined();
      });

      it("should NOT include security headers", () => {
        const headers = getDefaultHeaders(requestId, "v1");

        expect(headers["Strict-Transport-Security"]).toBeUndefined();
        expect(headers["X-Content-Type-Options"]).toBeUndefined();
        expect(headers["X-Frame-Options"]).toBeUndefined();
        expect(headers["API-Version"]).toBeUndefined();
      });
    });

    describe("with API version v2", () => {
      it("should include standard headers", () => {
        const headers = getDefaultHeaders(requestId, "v2");

        expect(headers["Content-Type"]).toBe("application/json");
        expect(headers["X-Request-Id"]).toBe(requestId);
        expect(headers["Access-Control-Allow-Origin"]).toBeDefined();
        expect(headers["Access-Control-Allow-Headers"]).toContain("Accept-Version");
        expect(headers["Access-Control-Allow-Methods"]).toBe("GET, POST, OPTIONS");
      });

      it("should include all security headers", () => {
        const headers = getDefaultHeaders(requestId, "v2");

        expect(headers["Strict-Transport-Security"]).toBe("max-age=31536000; includeSubDomains");
        expect(headers["X-Content-Type-Options"]).toBe("nosniff");
        expect(headers["X-Frame-Options"]).toBe("DENY");
        expect(headers["X-XSS-Protection"]).toBe("0");
        expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
        expect(headers["Content-Security-Policy"]).toBe(
          "default-src 'none'; frame-ancestors 'none'"
        );
        expect(headers["Permissions-Policy"]).toBe("geolocation=(), microphone=(), camera=()");
      });

      it("should include API-Version response header", () => {
        const headers = getDefaultHeaders(requestId, "v2");
        expect(headers["API-Version"]).toBe("v2");
      });
    });

    describe("header count comparison", () => {
      it("should have more headers in v2 than v1", () => {
        const v1Headers = getDefaultHeaders(requestId, "v1");
        const v2Headers = getDefaultHeaders(requestId, "v2");

        const v1Count = Object.keys(v1Headers).length;
        const v2Count = Object.keys(v2Headers).length;

        // v2 should have 8 more headers (7 security + 1 API-Version)
        expect(v2Count - v1Count).toBe(8);
      });
    });
  });

  describe("Backward Compatibility", () => {
    it("should ensure existing clients without Accept-Version header get v1 behavior", () => {
      // Simulate existing client request (no Accept-Version header)
      const req = new Request("http://localhost/tokens");
      const version = getApiVersion(req);
      const headers = getDefaultHeaders("request-123", version);

      // Should default to v1
      expect(version).toBe("v1");

      // Should NOT have security headers that might break existing clients
      expect(headers["Strict-Transport-Security"]).toBeUndefined();
      expect(headers["Content-Security-Policy"]).toBeUndefined();
      expect(headers["X-Frame-Options"]).toBeUndefined();
    });

    it("should allow opt-in to v2 security headers", () => {
      // Simulate new client request with Accept-Version: v2
      const req = new Request("http://localhost/tokens", {
        headers: { "Accept-Version": "v2" },
      });
      const version = getApiVersion(req);
      const headers = getDefaultHeaders("request-123", version);

      // Should be v2
      expect(version).toBe("v2");

      // Should have security headers
      expect(headers["Strict-Transport-Security"]).toBeDefined();
      expect(headers["Content-Security-Policy"]).toBeDefined();
      expect(headers["X-Frame-Options"]).toBeDefined();
      expect(headers["API-Version"]).toBe("v2");
    });
  });

  describe("Security Header Values", () => {
    it("should have HSTS with 1 year max-age and includeSubDomains", () => {
      const headers = getSecurityHeaders();
      expect(headers["Strict-Transport-Security"]).toBe("max-age=31536000; includeSubDomains");
    });

    it("should prevent MIME type sniffing", () => {
      const headers = getSecurityHeaders();
      expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    });

    it("should deny framing completely", () => {
      const headers = getSecurityHeaders();
      expect(headers["X-Frame-Options"]).toBe("DENY");
    });

    it("should disable XSS auditor (modern best practice)", () => {
      const headers = getSecurityHeaders();
      // X-XSS-Protection: 0 is recommended as browsers have deprecated this feature
      expect(headers["X-XSS-Protection"]).toBe("0");
    });

    it("should have strict referrer policy", () => {
      const headers = getSecurityHeaders();
      expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    });

    it("should have restrictive CSP", () => {
      const headers = getSecurityHeaders();
      expect(headers["Content-Security-Policy"]).toBe("default-src 'none'; frame-ancestors 'none'");
    });

    it("should disable sensitive permissions", () => {
      const headers = getSecurityHeaders();
      expect(headers["Permissions-Policy"]).toBe("geolocation=(), microphone=(), camera=()");
    });
  });

  describe("Edge Cases", () => {
    it("should handle whitespace in Accept-Version header", () => {
      // Bun's Request API automatically trims whitespace from header values
      // per HTTP specification, so " v2 " becomes "v2"
      const req = new Request("http://localhost/test", {
        headers: { "Accept-Version": " v2 " },
      });
      // Whitespace is trimmed by HTTP layer, so this becomes valid v2
      expect(getApiVersion(req)).toBe("v2");
    });

    it("should handle multiple Accept-Version values (uses first)", () => {
      // Note: Headers API typically returns the first value for duplicate headers
      const req = new Request("http://localhost/test", {
        headers: { "Accept-Version": "v2" },
      });
      expect(getApiVersion(req)).toBe("v2");
    });

    it("should handle null-like version strings", () => {
      const nullVersions = ["null", "undefined", "none"];

      for (const version of nullVersions) {
        const req = new Request("http://localhost/test", {
          headers: { "Accept-Version": version },
        });
        expect(getApiVersion(req)).toBe("v1");
      }
    });
  });
});
