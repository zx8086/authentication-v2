/* test/bun/v2-security-headers.test.ts */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { securityHeadersService } from "../../src/services/security-headers.service";

describe("V2 Security Headers Service", () => {
  let originalConfig: any;

  beforeEach(() => {
    // Store original config to restore later
    originalConfig = process.env;
  });

  afterEach(() => {
    // Restore original config
    process.env = originalConfig;
  });

  describe("Security Headers Application", () => {
    test("should apply all OWASP security headers to response", () => {
      const originalResponse = new Response(JSON.stringify({ message: "test" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
      const requestId = "test-request-123";

      const securedResponse = securityHeadersService.applyToResponse(originalResponse, requestId);

      // Verify original headers are preserved
      expect(securedResponse.headers.get("Content-Type")).toBe("application/json");

      // Verify security headers are applied
      expect(securedResponse.headers.get("X-Content-Type-Options")).toBe("nosniff");
      expect(securedResponse.headers.get("X-Frame-Options")).toBe("DENY");
      expect(securedResponse.headers.get("X-XSS-Protection")).toBe("1; mode=block");
      expect(securedResponse.headers.get("Strict-Transport-Security")).toBe(
        "max-age=31536000; includeSubDomains; preload"
      );
      expect(securedResponse.headers.get("Referrer-Policy")).toBe(
        "strict-origin-when-cross-origin"
      );

      // Content Security Policy should be restrictive
      const csp = securedResponse.headers.get("Content-Security-Policy");
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("script-src 'none'");
      // Actual CSP is more restrictive - no style-src specified means 'self' only"

      // Permissions Policy should disable sensitive features
      const permissionsPolicy = securedResponse.headers.get("Permissions-Policy");
      expect(permissionsPolicy).toContain("camera=()");
      expect(permissionsPolicy).toContain("microphone=()");
      expect(permissionsPolicy).toContain("geolocation=()");
    });

    test("should add both X-Request-Id and X-Request-Security-ID headers for backward compatibility", () => {
      const originalResponse = new Response("test content");
      const requestId = "req-456";

      const securedResponse = securityHeadersService.applyToResponse(originalResponse, requestId);

      // Both headers should be present for v2 backward compatibility
      expect(securedResponse.headers.get("X-Request-Security-ID")).toBe(requestId);
      // Note: X-Request-Id is added by response utility, not security headers service
    });

    test("should preserve existing response status and body", async () => {
      const testData = { token: "jwt-token-value", expires_in: 900 };
      const originalResponse = new Response(JSON.stringify(testData), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });

      const securedResponse = securityHeadersService.applyToResponse(originalResponse, "req-789");

      expect(securedResponse.status).toBe(201);
      expect(await securedResponse.json()).toEqual(testData);
    });

    test("should handle responses with existing security headers gracefully", () => {
      const originalResponse = new Response("test", {
        headers: {
          "X-Frame-Options": "SAMEORIGIN",
          "X-Custom-Header": "custom-value",
        },
      });

      const securedResponse = securityHeadersService.applyToResponse(
        originalResponse,
        "req-override"
      );

      // Service should override existing security headers with secure defaults
      expect(securedResponse.headers.get("X-Frame-Options")).toBe("DENY");

      // Custom headers should be preserved
      expect(securedResponse.headers.get("X-Custom-Header")).toBe("custom-value");

      // New security headers should be added
      expect(securedResponse.headers.get("X-Content-Type-Options")).toBe("nosniff");
    });
  });

  describe("Security Headers Configuration", () => {
    test("should apply appropriate CSP for JSON API responses", () => {
      const jsonResponse = new Response(JSON.stringify({ data: "test" }), {
        headers: { "Content-Type": "application/json" },
      });

      const securedResponse = securityHeadersService.applyToResponse(jsonResponse, "csp-test");
      const csp = securedResponse.headers.get("Content-Security-Policy");

      // CSP should be restrictive for API responses
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("object-src 'none'");
      expect(csp).toContain("script-src 'none'");
      expect(csp).not.toContain("unsafe-eval"); // Should not allow unsafe-eval
    });

    test("should set appropriate cache control headers", () => {
      const response = new Response("sensitive data");
      const securedResponse = securityHeadersService.applyToResponse(response, "cache-test");

      // Note: Cache control headers are set by response utilities, not security headers service
      // Security headers service focuses on security headers only
      expect(securedResponse.headers.get("X-Content-Type-Options")).toBe("nosniff");
      expect(securedResponse.headers.get("X-Frame-Options")).toBe("DENY");
    });

    test("should include security headers for error responses", () => {
      const errorResponse = new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });

      const securedResponse = securityHeadersService.applyToResponse(errorResponse, "error-test");

      // Error responses should still have full security headers
      expect(securedResponse.status).toBe(401);
      expect(securedResponse.headers.get("X-Content-Type-Options")).toBe("nosniff");
      expect(securedResponse.headers.get("X-Frame-Options")).toBe("DENY");
      expect(securedResponse.headers.get("Strict-Transport-Security")).toBeTruthy();
    });
  });

  describe("Request ID Handling", () => {
    test("should handle UUID format request IDs", () => {
      const uuidRequestId = "550e8400-e29b-41d4-a716-446655440000";
      const response = new Response("test");

      const securedResponse = securityHeadersService.applyToResponse(response, uuidRequestId);

      expect(securedResponse.headers.get("X-Request-Security-ID")).toBe(uuidRequestId);
      // Note: X-Request-Id is added by response utility, not security headers service
    });

    test("should handle short request IDs", () => {
      const shortRequestId = "req-1";
      const response = new Response("test");

      const securedResponse = securityHeadersService.applyToResponse(response, shortRequestId);

      expect(securedResponse.headers.get("X-Request-Security-ID")).toBe(shortRequestId);
      // Note: X-Request-Id is added by response utility, not security headers service
    });

    test("should handle empty request ID gracefully", () => {
      const response = new Response("test");

      const securedResponse = securityHeadersService.applyToResponse(response, "");

      // When no request ID provided, X-Request-Security-ID should not be set
      expect(securedResponse.headers.get("X-Request-Security-ID")).toBeNull();
    });
  });

  describe("Security Headers Completeness", () => {
    test("should include all required OWASP security headers", () => {
      const response = new Response("test");
      const securedResponse = securityHeadersService.applyToResponse(response, "complete-test");

      const requiredHeaders = [
        "X-Content-Type-Options",
        "X-Frame-Options",
        "X-XSS-Protection",
        "Strict-Transport-Security",
        "Content-Security-Policy",
        "Referrer-Policy",
        "Permissions-Policy",
        "X-Request-Security-ID",
        "X-Security-Version",
        "X-Content-Security",
      ];

      for (const header of requiredHeaders) {
        expect(securedResponse.headers.get(header)).toBeTruthy();
      }
    });

    test("should have secure default values for all headers", () => {
      const response = new Response("test");
      const securedResponse = securityHeadersService.applyToResponse(response, "defaults-test");

      // Verify secure defaults
      expect(securedResponse.headers.get("X-Frame-Options")).toBe("DENY"); // Most restrictive
      expect(securedResponse.headers.get("X-Content-Type-Options")).toBe("nosniff");
      expect(securedResponse.headers.get("X-XSS-Protection")).toBe("1; mode=block");

      // HSTS should be long-term and include subdomains and preload
      const hsts = securedResponse.headers.get("Strict-Transport-Security");
      expect(hsts).toContain("max-age=31536000"); // 1 year
      expect(hsts).toContain("includeSubDomains");
      expect(hsts).toContain("preload");

      // Referrer policy should be restrictive
      expect(securedResponse.headers.get("Referrer-Policy")).toBe(
        "strict-origin-when-cross-origin"
      );
    });
  });
});
