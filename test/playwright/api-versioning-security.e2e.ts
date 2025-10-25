/* test/playwright/api-versioning-security.e2e.ts */

import { expect, test } from "@playwright/test";

const TEST_CONSUMER = {
  id: "test-consumer-001",
  username: "test-consumer-001",
};

test.describe("API Versioning Security Validation", () => {
  test.describe("V1 API Security", () => {
    test("V1 health endpoint returns standard headers only", async ({ request }) => {
      const response = await request.get("/health", {
        headers: { "Accept-Version": "v1" },
      });

      expect(response.status()).toBe(200);

      const headers = response.headers();

      // V1 should NOT have security headers
      expect(headers["strict-transport-security"]).toBeUndefined();
      expect(headers["content-security-policy"]).toBeUndefined();
      expect(headers["x-frame-options"]).toBeUndefined();
      expect(headers["x-content-type-options"]).toBeUndefined();
      expect(headers["referrer-policy"]).toBeUndefined();
      expect(headers["permissions-policy"]).toBeUndefined();
    });

    test("V1 tokens endpoint has standard security only", async ({ request }) => {
      const response = await request.get("/tokens", {
        headers: {
          "Accept-Version": "v1",
          "X-Consumer-Id": TEST_CONSUMER.id,
          "X-Consumer-Username": TEST_CONSUMER.username,
        },
      });

      expect(response.status()).toBe(200);

      const headers = response.headers();

      // Standard headers should be present
      expect(headers["content-type"]).toContain("application/json");

      // Enhanced security headers should NOT be present in V1
      expect(headers["strict-transport-security"]).toBeUndefined();
      expect(headers["x-frame-options"]).toBeUndefined();
    });
  });

  test.describe("V2 API Enhanced Security", () => {
    test("V2 health endpoint includes OWASP security headers", async ({ request }) => {
      const response = await request.get("/health", {
        headers: { "Accept-Version": "v2" },
      });

      expect(response.status()).toBe(200);

      const headers = response.headers();

      // OWASP security headers validation
      expect(headers["strict-transport-security"]).toBeDefined();
      expect(headers["strict-transport-security"]).toContain("max-age=");
      expect(headers["strict-transport-security"]).toContain("includeSubDomains");

      expect(headers["content-security-policy"]).toBeDefined();
      expect(headers["content-security-policy"]).toContain("default-src");

      expect(headers["x-frame-options"]).toBe("DENY");
      expect(headers["x-content-type-options"]).toBe("nosniff");
      expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");

      expect(headers["permissions-policy"]).toBeDefined();
      expect(headers["permissions-policy"]).toContain("camera=()");
      expect(headers["permissions-policy"]).toContain("microphone=()");
    });

    test("V2 tokens endpoint has comprehensive security headers", async ({ request }) => {
      const response = await request.get("/tokens", {
        headers: {
          "Accept-Version": "v2",
          "X-Consumer-Id": TEST_CONSUMER.id,
          "X-Consumer-Username": TEST_CONSUMER.username,
        },
      });

      expect(response.status()).toBe(200);

      const headers = response.headers();

      // All OWASP Top 10 security headers
      const requiredSecurityHeaders = [
        "strict-transport-security",
        "content-security-policy",
        "x-frame-options",
        "x-content-type-options",
        "referrer-policy",
        "permissions-policy",
      ];

      for (const header of requiredSecurityHeaders) {
        expect(headers[header]).toBeDefined();
        expect(headers[header]).not.toBe("");
      }

      // CSP should prevent XSS
      expect(headers["content-security-policy"]).toContain("script-src");
      expect(headers["content-security-policy"]).toContain("object-src 'none'");

      // HSTS should be configured for production
      expect(headers["strict-transport-security"]).toMatch(/max-age=\d+/);
    });

    test("V2 error responses maintain security headers", async ({ request }) => {
      const response = await request.get("/tokens", {
        headers: { "Accept-Version": "v2" },
      });

      expect(response.status()).toBe(401);

      const headers = response.headers();

      // Security headers should be present even in error responses
      expect(headers["x-frame-options"]).toBe("DENY");
      expect(headers["x-content-type-options"]).toBe("nosniff");
      expect(headers["strict-transport-security"]).toBeDefined();
    });
  });

  test.describe("Version Header Validation", () => {
    test("Invalid version defaults to V1 behavior", async ({ request }) => {
      const response = await request.get("/health", {
        headers: { "Accept-Version": "v99" },
      });

      expect(response.status()).toBe(200);

      const headers = response.headers();

      // Should default to V1 (no enhanced security headers)
      expect(headers["strict-transport-security"]).toBeUndefined();
      expect(headers["x-frame-options"]).toBeUndefined();
    });

    test("Missing version header defaults to V1", async ({ request }) => {
      const response = await request.get("/health");

      expect(response.status()).toBe(200);

      const headers = response.headers();

      // Should default to V1 behavior
      expect(headers["strict-transport-security"]).toBeUndefined();
    });

    test("Case-insensitive version parsing", async ({ request }) => {
      const versions = ["V2", "v2", "V2.0", "v2.0"];

      for (const version of versions) {
        const response = await request.get("/health", {
          headers: { "Accept-Version": version },
        });

        expect(response.status()).toBe(200);

        const headers = response.headers();

        // All should trigger V2 security headers
        expect(headers["x-frame-options"]).toBe("DENY");
      }
    });
  });

  test.describe("Security Header Content Validation", () => {
    test("CSP header prevents common attacks", async ({ request }) => {
      const response = await request.get("/health", {
        headers: { "Accept-Version": "v2" },
      });

      const csp = response.headers()["content-security-policy"];

      // Prevent inline scripts and unsafe eval
      expect(csp).toContain("script-src");
      expect(csp).not.toContain("'unsafe-inline'");
      expect(csp).not.toContain("'unsafe-eval'");

      // Prevent object/embed attacks
      expect(csp).toContain("object-src 'none'");

      // Prevent base-uri injection
      expect(csp).toContain("base-uri");
    });

    test("HSTS header configuration for production", async ({ request }) => {
      const response = await request.get("/health", {
        headers: { "Accept-Version": "v2" },
      });

      const hsts = response.headers()["strict-transport-security"];

      // Minimum 1 year max-age
      const maxAgeMatch = hsts.match(/max-age=(\d+)/);
      expect(maxAgeMatch).toBeTruthy();

      const maxAge = parseInt(maxAgeMatch[1]);
      expect(maxAge).toBeGreaterThanOrEqual(31536000); // 1 year in seconds

      // Include subdomains
      expect(hsts).toContain("includeSubDomains");
    });

    test("Permissions Policy restricts dangerous features", async ({ request }) => {
      const response = await request.get("/health", {
        headers: { "Accept-Version": "v2" },
      });

      const permissionsPolicy = response.headers()["permissions-policy"];

      // Dangerous features should be disabled
      const dangerousFeatures = [
        "camera=()",
        "microphone=()",
        "geolocation=()",
        "payment=()",
      ];

      for (const feature of dangerousFeatures) {
        expect(permissionsPolicy).toContain(feature);
      }
    });
  });

  test.describe("Cross-Browser Security Header Consistency", () => {
    test("Security headers are consistent across browsers", async ({ request, browserName }) => {
      const response = await request.get("/health", {
        headers: { "Accept-Version": "v2" },
      });

      const headers = response.headers();

      // Critical security headers must be present regardless of browser
      const criticalHeaders = [
        "x-frame-options",
        "x-content-type-options",
        "strict-transport-security",
      ];

      for (const header of criticalHeaders) {
        expect(headers[header]).toBeDefined();
      }

      // Log browser-specific validation
      console.log(`[${browserName}] Security headers validated`);
    });
  });
});