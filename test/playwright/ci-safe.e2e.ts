/* test/playwright/ci-safe.e2e.ts */

/**
 * CI-Safe E2E Tests
 *
 * These tests are designed to run in CI environments where external dependencies
 * (Kong, Redis, telemetry collectors) may not be available. The service will report
 * as "degraded" (503) when dependencies are unavailable, which is expected behavior.
 *
 * Tests validate:
 * - Service is running and responding
 * - API contracts are correct
 * - Error handling works properly
 */

import { expect, test } from "@playwright/test";

test.describe("Authentication Service - CI-Safe Tests", () => {
  test.describe("Service Health & Dependencies (Kong-Independent)", () => {
    test("Health endpoint reports service status", async ({ request }) => {
      const response = await request.get("/health");
      // In CI, Kong/Redis may not be available, so service reports degraded (503)
      // Both 200 (healthy) and 503 (degraded/unhealthy) are valid responses
      expect([200, 503]).toContain(response.status());

      const data = await response.json();
      // Status can be healthy, degraded, or unhealthy depending on dependencies
      expect(["healthy", "degraded", "unhealthy"]).toContain(data.status);
      expect(data).toHaveProperty("version");
      expect(data).toHaveProperty("uptime");
      expect(data).toHaveProperty("timestamp");
    });

    test("Metrics endpoint provides monitoring data", async ({ request }) => {
      const response = await request.get("/metrics");
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty("timestamp");
      expect(data).toHaveProperty("uptime");
      expect(data).toHaveProperty("memory");
      expect(data.memory.rss).toBeGreaterThan(0);
      // Additional properties that may be present
      expect(data).toHaveProperty("cache");
      expect(data).toHaveProperty("kong");
    });

    test("OpenAPI documentation is available", async ({ request }) => {
      const response = await request.get("/");
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.openapi).toBe("3.1.1");
      expect(data).toHaveProperty("info");
      expect(data).toHaveProperty("paths");
      expect(data.info.title).toBe("Authentication Service API");
    });

    test("404 for unknown endpoints", async ({ request }) => {
      const response = await request.get("/unknown-endpoint");
      expect(response.status()).toBe(404);
    });

    test("CORS support for browser applications", async ({ request }) => {
      const response = await request.fetch("/health", {
        method: "OPTIONS",
      });
      expect(response.status()).toBe(204);
      expect(response.headers()["access-control-allow-origin"]).toBeTruthy();
      expect(response.headers()["access-control-allow-methods"]).toBeTruthy();
    });
  });

  test.describe("Error Handling (Kong-Independent)", () => {
    test("Tokens endpoint returns 401 without Kong headers", async ({ request }) => {
      const response = await request.get("/tokens");
      expect(response.status()).toBe(401);

      const data = await response.json();
      // RFC 7807 Problem Details format
      expect(data).toHaveProperty("type");
      expect(data).toHaveProperty("detail");
      expect(data.code).toBe("AUTH_001");
    });

    test("Consistent error response structure", async ({ request }) => {
      const response = await request.get("/tokens");
      expect(response.status()).toBe(401);

      const data = await response.json();
      // RFC 7807 Problem Details format
      expect(data).toHaveProperty("type");
      expect(data).toHaveProperty("title");
      expect(data).toHaveProperty("status");
      expect(data).toHaveProperty("detail");
      expect(data).toHaveProperty("code");
      expect(data).toHaveProperty("timestamp");
      expect(data).toHaveProperty("requestId");
      expect(data).toHaveProperty("instance");
      expect(data.status).toBe(401);
    });
  });
});
