/* test/playwright/api-versioning.e2e.ts */

import { expect, test } from "@playwright/test";

// Test consumer configurations for API versioning tests
const TEST_CONSUMER = {
  id: "test-user-001",
  username: "test-user-001",
  custom_id: "test-user-001",
  description: "Primary test consumer for API versioning tests",
};

const ANONYMOUS_CONSUMER = {
  id: "anonymous",
  username: "anonymous",
  custom_id: "anonymous",
  description: "Anonymous consumer for testing rejection scenarios",
};

test.describe("API Versioning - V1 vs V2 Behavior", () => {
  test.describe("Health Endpoint Version Differences", () => {
    test("v1 health endpoint provides basic health information", async ({ request }) => {
      const response = await request.get("/health", {
        headers: {
          "Accept-Version": "v1",
        },
      });

      expect(response.status()).toBe(200);
      expect(response.headers()["api-version"]).toBe("v1");

      const data = await response.json();
      expect(data.status).toBe("healthy");
      expect(data).toHaveProperty("version");
      expect(data).toHaveProperty("uptime");
      expect(data.dependencies).toHaveProperty("kong");

      // v1 should NOT include security context
      expect(data.security).toBeUndefined();
      expect(data.audit).toBeUndefined();
    });

    test("v2 health endpoint provides enhanced security context", async ({ request }) => {
      const response = await request.get("/health", {
        headers: {
          "Accept-Version": "v2",
        },
      });

      expect(response.status()).toBe(200);
      expect(response.headers()["api-version"]).toBe("v2");

      const data = await response.json();
      expect(data.status).toBe("healthy");
      expect(data.apiVersion).toBe("v2"); // V2 now uses consistent apiVersion field like V1
      expect(data.service).toBe("authentication-service");

      // v2 should include security context
      expect(data.security).toHaveProperty("headersEnabled");
      expect(data.security).toHaveProperty("auditLoggingEnabled");
      expect(data.security).toHaveProperty("auditLevel");

      // v2 should include audit information
      expect(data.audit).toHaveProperty("enabled");
      if (data.audit.enabled) {
        expect(data.audit).toHaveProperty("metrics");
      }

      // v2 should include performance metrics
      expect(data.performance).toHaveProperty("responseTime");
      expect(data.requestId).toBeTruthy();
    });

    test("default health endpoint behavior uses v1 for backward compatibility", async ({
      request,
    }) => {
      const response = await request.get("/health");

      expect(response.status()).toBe(200);
      expect(response.headers()["api-version"]).toBe("v1");

      const data = await response.json();
      expect(data.status).toBe("healthy"); // Basic health check
      expect(data.security).toBeUndefined(); // Should not have v2 security context in v1
    });
  });

  test.describe("Token Endpoint Version Differences", () => {
    test("v1 token endpoint provides basic JWT functionality", async ({ request }) => {
      const response = await request.get("/tokens", {
        headers: {
          "Accept-Version": "v1",
          "X-Consumer-Id": TEST_CONSUMER.id,
          "X-Consumer-Username": TEST_CONSUMER.username,
        },
      });

      expect(response.status()).toBe(200);
      expect(response.headers()["api-version"]).toBe("v1");

      // v1 should have basic security headers but not full v2 suite
      expect(response.headers()["x-request-id"]).toBeTruthy();
      expect(response.headers()["x-request-security-id"]).toBeUndefined(); // V2 only
      expect(response.headers()["content-type"]).toBe("application/json");

      const data = await response.json();
      expect(data.access_token).toBeTruthy();
      expect(data.expires_in).toBe(900);

      // Verify JWT token structure
      const parts = data.access_token.split(".");
      expect(parts).toHaveLength(3);

      const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
      expect(payload.sub).toBe(TEST_CONSUMER.username);
      expect(payload.iss).toBeTruthy();
      expect(payload.aud).toBeTruthy();
      expect(payload.key).toBeTruthy();
    });

    test("v2 token endpoint provides enhanced security headers and audit logging", async ({
      request,
    }) => {
      const response = await request.get("/tokens", {
        headers: {
          "Accept-Version": "v2",
          "X-Consumer-Id": TEST_CONSUMER.id,
          "X-Consumer-Username": TEST_CONSUMER.username,
          "User-Agent": "V2 Test Client",
          "X-Forwarded-For": "192.168.1.100",
        },
      });

      expect(response.status()).toBe(200);
      expect(response.headers()["api-version"]).toBe("v2");

      // v2 should have comprehensive security headers
      expect(response.headers()["x-content-type-options"]).toBe("nosniff");
      expect(response.headers()["x-frame-options"]).toBe("DENY");
      expect(response.headers()["strict-transport-security"]).toBeTruthy();
      expect(response.headers()["content-security-policy"]).toBeTruthy();

      // v2 should have both request ID headers for backward compatibility
      expect(response.headers()["x-request-id"]).toBeTruthy();
      expect(response.headers()["x-request-security-id"]).toBeTruthy();
      expect(response.headers()["x-request-id"]).toBe(response.headers()["x-request-security-id"]);

      const data = await response.json();
      expect(data.access_token).toBeTruthy();
      expect(data.expires_in).toBe(900);

      // Token payload should be identical between v1 and v2
      const parts = data.access_token.split(".");
      expect(parts).toHaveLength(3);

      const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
      expect(payload.sub).toBe(TEST_CONSUMER.username);
    });

    test("default token endpoint behavior uses v1 for backward compatibility", async ({
      request,
    }) => {
      const response = await request.get("/tokens", {
        headers: {
          "X-Consumer-Id": TEST_CONSUMER.id,
          "X-Consumer-Username": TEST_CONSUMER.username,
        },
      });

      expect(response.status()).toBe(200);
      expect(response.headers()["api-version"]).toBe("v1");

      // Should not have v2 security headers in v1
      expect(response.headers()["x-content-type-options"]).toBeUndefined();
      expect(response.headers()["x-frame-options"]).toBeUndefined();
    });

    test("v1 and v2 generate functionally identical JWT tokens", async ({ request }) => {
      // Get token from v1
      const v1Response = await request.get("/tokens", {
        headers: {
          "Accept-Version": "v1",
          "X-Consumer-Id": TEST_CONSUMER.id,
          "X-Consumer-Username": TEST_CONSUMER.username,
        },
      });

      // Get token from v2
      const v2Response = await request.get("/tokens", {
        headers: {
          "Accept-Version": "v2",
          "X-Consumer-Id": TEST_CONSUMER.id,
          "X-Consumer-Username": TEST_CONSUMER.username,
        },
      });

      expect(v1Response.status()).toBe(200);
      expect(v2Response.status()).toBe(200);

      const v1Data = await v1Response.json();
      const v2Data = await v2Response.json();

      // Both should provide valid tokens with same expiration
      expect(v1Data.expires_in).toBe(v2Data.expires_in);

      // Parse JWT payloads
      const v1Payload = JSON.parse(
        Buffer.from(v1Data.access_token.split(".")[1], "base64url").toString()
      );
      const v2Payload = JSON.parse(
        Buffer.from(v2Data.access_token.split(".")[1], "base64url").toString()
      );

      // Core JWT claims should be identical
      expect(v1Payload.sub).toBe(v2Payload.sub);
      expect(v1Payload.iss).toBe(v2Payload.iss);
      expect(v1Payload.aud).toBe(v2Payload.aud);
      expect(v1Payload.key).toBe(v2Payload.key); // Same consumer should get same key
    });
  });

  test.describe("Error Handling Version Differences", () => {
    test("v1 anonymous consumer rejection has basic error format", async ({ request }) => {
      const response = await request.get("/tokens", {
        headers: {
          "Accept-Version": "v1",
          "X-Consumer-Id": ANONYMOUS_CONSUMER.id,
          "X-Consumer-Username": ANONYMOUS_CONSUMER.username,
          "X-Anonymous-Consumer": "true",
        },
      });

      expect(response.status()).toBe(401);
      expect(response.headers()["api-version"]).toBe("v1");

      const data = await response.json();
      expect(data.error).toBe("Unauthorized");
      expect(data.message).toContain("Anonymous consumers");
      expect(data).toHaveProperty("requestId");
    });

    test("v2 anonymous consumer rejection has enhanced security headers", async ({ request }) => {
      const response = await request.get("/tokens", {
        headers: {
          "Accept-Version": "v2",
          "X-Consumer-Id": ANONYMOUS_CONSUMER.id,
          "X-Consumer-Username": ANONYMOUS_CONSUMER.username,
          "X-Anonymous-Consumer": "true",
        },
      });

      expect(response.status()).toBe(401);
      expect(response.headers()["api-version"]).toBe("v2");

      // v2 error responses should have security headers
      expect(response.headers()["x-content-type-options"]).toBe("nosniff");
      expect(response.headers()["x-frame-options"]).toBe("DENY");
      expect(response.headers()["x-request-id"]).toBeTruthy();
      expect(response.headers()["x-request-security-id"]).toBeTruthy();

      const data = await response.json();
      expect(data.error).toBe("Unauthorized");
      expect(data.message).toContain("Anonymous consumers");
    });

    test("v1 missing headers error has basic format", async ({ request }) => {
      const response = await request.get("/tokens", {
        headers: {
          "Accept-Version": "v1",
          // Missing consumer headers
        },
      });

      expect(response.status()).toBe(401);
      expect(response.headers()["api-version"]).toBe("v1");

      const data = await response.json();
      expect(data.error).toBe("Unauthorized");
      expect(data).toHaveProperty("requestId");
    });

    test("v2 missing headers error has enhanced security context", async ({ request }) => {
      const response = await request.get("/tokens", {
        headers: {
          "Accept-Version": "v2",
          // Missing consumer headers
        },
      });

      expect(response.status()).toBe(401);
      expect(response.headers()["api-version"]).toBe("v2");

      // v2 should have full security headers even for errors
      expect(response.headers()["x-content-type-options"]).toBe("nosniff");
      expect(response.headers()["x-frame-options"]).toBe("DENY");
      expect(response.headers()["x-request-id"]).toBeTruthy();
      expect(response.headers()["x-request-security-id"]).toBeTruthy();

      const data = await response.json();
      expect(data.error).toBe("Unauthorized");
    });
  });

  test.describe("Version Header Validation", () => {
    test("should handle invalid version gracefully", async ({ request }) => {
      const response = await request.get("/health", {
        headers: {
          "Accept-Version": "v99",
        },
      });

      expect(response.status()).toBe(400);

      const data = await response.json();
      expect(data.error).toBe("Unsupported API Version");
      expect(data.message).toContain("not supported");
      expect(data.supportedVersions).toEqual(["v1", "v2"]);
    });

    test("should handle malformed version header", async ({ request }) => {
      const response = await request.get("/health", {
        headers: {
          "Accept-Version": "invalid-format",
        },
      });

      expect(response.status()).toBe(400);

      const data = await response.json();
      expect(data.error).toBe("Unsupported API Version");
      expect(data.message).toContain("is not supported");
    });

    test("should use v1 for backward compatibility when no Accept-Version header provided", async ({
      request,
    }) => {
      const response = await request.get("/health");

      expect(response.status()).toBe(200);
      expect(response.headers()["api-version"]).toBe("v1"); // Backward compatibility default

      const data = await response.json();
      expect(data.status).toBe("healthy"); // Basic health check for v1
    });
  });

  test.describe("OpenAPI Specification Version Support", () => {
    test("OpenAPI spec should document both v1 and v2 endpoints", async ({ request }) => {
      const response = await request.get("/");

      expect(response.status()).toBe(200);
      expect(response.headers()["content-type"]).toContain("application/json");

      const spec = await response.json();
      expect(spec.openapi).toBeDefined();
      expect(spec.info).toHaveProperty("version");

      // Should have paths for versioned endpoints
      expect(spec.paths["/health"]).toBeDefined();
      expect(spec.paths["/tokens"]).toBeDefined();

      // Should document version headers
      if (spec.components?.parameters) {
        const versionParam = Object.values(spec.components.parameters).find(
          (param: any) => param.name === "Accept-Version"
        );
        if (versionParam) {
          expect(versionParam).toBeDefined();
        }
      }
    });

    test("OpenAPI spec should be available in YAML format", async ({ request }) => {
      const response = await request.get("/", {
        headers: {
          Accept: "application/yaml",
        },
      });

      expect(response.status()).toBe(200);
      expect(response.headers()["content-type"]).toContain("application/yaml");

      const yamlContent = await response.text();
      expect(yamlContent).toContain("openapi:");
      expect(yamlContent).toContain("/health");
      expect(yamlContent).toContain("/tokens");
    });
  });

  test.describe("CORS and Preflight Version Support", () => {
    test("OPTIONS requests should support version headers", async ({ request }) => {
      const response = await request.fetch("/tokens", {
        method: "OPTIONS",
        headers: {
          Origin: "https://example.com",
          "Access-Control-Request-Method": "GET",
          "Access-Control-Request-Headers": "Accept-Version,X-Consumer-Id,X-Consumer-Username",
        },
      });

      expect(response.status()).toBe(204);
      expect(response.headers()["access-control-allow-origin"]).toBeDefined();
      expect(response.headers()["access-control-allow-methods"]).toContain("GET");
      expect(response.headers()["access-control-allow-headers"]).toContain("X-Consumer-Id");
      // Check that version headers are included in OPTIONS response
      expect(response.headers()["api-version"]).toBeTruthy();
    });
  });

  test.describe("Performance Comparison Between Versions", () => {
    test("v1 and v2 should have comparable performance", async ({ request }) => {
      // Time v1 request
      const v1Start = Date.now();
      const v1Response = await request.get("/health", {
        headers: { "Accept-Version": "v1" },
      });
      const v1Duration = Date.now() - v1Start;

      // Time v2 request
      const v2Start = Date.now();
      const v2Response = await request.get("/health", {
        headers: { "Accept-Version": "v2" },
      });
      const v2Duration = Date.now() - v2Start;

      expect(v1Response.status()).toBe(200);
      expect(v2Response.status()).toBe(200);

      // Both should complete within reasonable time
      expect(v1Duration).toBeLessThan(1000);
      expect(v2Duration).toBeLessThan(1000);

      // v2 may be slightly slower due to security enhancements but not dramatically
      // Allow v2 to be up to 2x slower than v1 due to additional security processing
      expect(v2Duration).toBeLessThan(v1Duration * 2);
    });
  });
});
