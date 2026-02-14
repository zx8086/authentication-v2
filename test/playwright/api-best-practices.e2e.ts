// test/playwright/api-best-practices.e2e.ts

import { expect, test } from "@playwright/test";

test.describe("API Best Practices - RFC Compliance", () => {
  test.describe("HTTP Method Validation (RFC 9110)", () => {
    test("Returns 405 Method Not Allowed for POST to /tokens", async ({ request }) => {
      const response = await request.post("/tokens");

      expect(response.status()).toBe(405);
      expect(response.headers()["content-type"]).toContain("application/problem+json");
      expect(response.headers().allow).toBe("GET, OPTIONS");

      const data = await response.json();
      // RFC 7807 Problem Details format
      expect(data).toHaveProperty("type");
      expect(data).toHaveProperty("title");
      expect(data.title).toBe("Method Not Allowed");
      expect(data.status).toBe(405);
      expect(data).toHaveProperty("detail");
      expect(data.detail).toContain("GET, OPTIONS");
      expect(data).toHaveProperty("extensions");
      expect(data.extensions.allowedMethods).toEqual(["GET", "OPTIONS"]);
    });

    test("Returns 405 Method Not Allowed for DELETE to /tokens", async ({ request }) => {
      const response = await request.delete("/tokens");

      expect(response.status()).toBe(405);
      expect(response.headers().allow).toBe("GET, OPTIONS");

      const data = await response.json();
      expect(data.extensions.allowedMethods).toEqual(["GET", "OPTIONS"]);
    });

    test("Returns 405 Method Not Allowed for PUT to /health", async ({ request }) => {
      const response = await request.put("/health");

      expect(response.status()).toBe(405);
      expect(response.headers().allow).toBe("GET, OPTIONS");

      const data = await response.json();
      expect(data.status).toBe(405);
      expect(data.extensions.allowedMethods).toEqual(["GET", "OPTIONS"]);
    });

    test("Returns 405 Method Not Allowed for PATCH to /metrics", async ({ request }) => {
      const response = await request.patch("/metrics");

      expect(response.status()).toBe(405);
      expect(response.headers().allow).toBe("GET, OPTIONS");
    });

    test("Returns 405 Method Not Allowed for DELETE to OpenAPI endpoint", async ({ request }) => {
      const response = await request.delete("/");

      expect(response.status()).toBe(405);
      expect(response.headers().allow).toBe("GET, OPTIONS");
    });

    test("OPTIONS requests are allowed on all endpoints", async ({ request }) => {
      const endpoints = ["/", "/tokens", "/health", "/metrics"];

      for (const endpoint of endpoints) {
        const response = await request.fetch(endpoint, { method: "OPTIONS" });
        expect(response.status()).toBe(204);
        expect(response.headers()["access-control-allow-methods"]).toBeTruthy();
      }
    });

    test("405 response includes X-Request-Id header", async ({ request }) => {
      const response = await request.post("/tokens");

      expect(response.status()).toBe(405);
      expect(response.headers()["x-request-id"]).toBeTruthy();
      // UUID format validation
      expect(response.headers()["x-request-id"]).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });
  });

  test.describe("ETag and Conditional Requests (RFC 7232)", () => {
    test("OpenAPI spec includes ETag header", async ({ request }) => {
      const response = await request.get("/");

      expect(response.status()).toBe(200);
      expect(response.headers().etag).toBeTruthy();
      // ETag format: quoted string
      expect(response.headers().etag).toMatch(/^"[a-f0-9]+"$/);
    });

    test("Returns 304 Not Modified when If-None-Match matches ETag", async ({ request }) => {
      // First request to get the ETag
      const firstResponse = await request.get("/");
      expect(firstResponse.status()).toBe(200);

      const etag = firstResponse.headers().etag;
      expect(etag).toBeTruthy();

      // Second request with matching If-None-Match
      const secondResponse = await request.get("/", {
        headers: {
          "If-None-Match": etag,
        },
      });

      expect(secondResponse.status()).toBe(304);
      expect(secondResponse.headers().etag).toBe(etag);
    });

    test("Returns 200 when If-None-Match does not match ETag", async ({ request }) => {
      const response = await request.get("/", {
        headers: {
          "If-None-Match": '"non-matching-etag"',
        },
      });

      expect(response.status()).toBe(200);
      expect(response.headers().etag).toBeTruthy();
    });

    test("304 response includes Cache-Control header", async ({ request }) => {
      // First request to get the ETag
      const firstResponse = await request.get("/");
      const etag = firstResponse.headers().etag;

      // Second request with matching If-None-Match
      const secondResponse = await request.get("/", {
        headers: {
          "If-None-Match": etag,
        },
      });

      expect(secondResponse.status()).toBe(304);
      expect(secondResponse.headers()["cache-control"]).toBe("public, max-age=300");
    });

    test("304 response includes CORS headers", async ({ request }) => {
      // First request to get the ETag
      const firstResponse = await request.get("/");
      const etag = firstResponse.headers().etag;

      // Second request with matching If-None-Match
      const secondResponse = await request.get("/", {
        headers: {
          "If-None-Match": etag,
        },
      });

      expect(secondResponse.status()).toBe(304);
      expect(secondResponse.headers()["access-control-allow-origin"]).toBeTruthy();
    });

    test("JSON and YAML formats have different ETags", async ({ request }) => {
      const jsonResponse = await request.get("/", {
        headers: { Accept: "application/json" },
      });
      const yamlResponse = await request.get("/", {
        headers: { Accept: "application/yaml" },
      });

      expect(jsonResponse.status()).toBe(200);
      expect(yamlResponse.status()).toBe(200);

      const jsonEtag = jsonResponse.headers().etag;
      const yamlEtag = yamlResponse.headers().etag;

      expect(jsonEtag).toBeTruthy();
      expect(yamlEtag).toBeTruthy();
      expect(jsonEtag).not.toBe(yamlEtag);
    });

    test("OpenAPI spec includes Last-Modified header", async ({ request }) => {
      const response = await request.get("/");

      expect(response.status()).toBe(200);
      expect(response.headers()["last-modified"]).toBeTruthy();
      // Should be a valid date string
      const lastModified = new Date(response.headers()["last-modified"]);
      expect(lastModified.getTime()).not.toBeNaN();
    });
  });

  test.describe("Content-Type Validation", () => {
    // Note: Content-Type validation applies to requests that go through fallbackFetch
    // (i.e., undefined routes or methods). Defined routes like /debug/metrics/test
    // bypass this validation by design.

    test("Accepts POST with application/json Content-Type on defined routes", async ({
      request,
    }) => {
      const response = await request.post("/debug/metrics/test", {
        headers: {
          "Content-Type": "application/json",
        },
        data: {},
      });

      // Should succeed (200) - defined route handlers process directly
      expect(response.status()).toBe(200);
    });

    test("Accepts POST with application/x-www-form-urlencoded Content-Type", async ({
      request,
    }) => {
      const response = await request.post("/debug/metrics/test", {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        data: "test=value",
      });

      // Should succeed (200) - defined route
      expect(response.status()).toBe(200);
    });

    test("Accepts POST with JSON charset parameter", async ({ request }) => {
      const response = await request.post("/debug/metrics/test", {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
        data: {},
      });

      expect(response.status()).toBe(200);
    });

    test("GET requests do not require Content-Type", async ({ request }) => {
      const response = await request.get("/tokens", {
        headers: {
          "X-Consumer-Id": "test-id",
          "X-Consumer-Username": "test-user",
        },
      });

      // May be 401 (no consumer) or 503 (Kong unavailable) but NOT 400 for content type
      expect([401, 503]).toContain(response.status());
    });

    test("POST to undefined route with invalid Content-Type is rejected with 400", async ({
      request,
    }) => {
      // This tests the fallback path where Content-Type validation occurs
      // Content-Type validation happens before 404 handling
      const response = await request.post("/undefined-endpoint", {
        headers: {
          "Content-Type": "text/plain",
        },
        data: "plain text body",
      });

      // Content-Type validation rejects before route matching
      expect(response.status()).toBe(400);

      const data = await response.json();
      expect(data.code).toBe("AUTH_007");
      expect(data.extensions).toHaveProperty("reason");
      expect(data.extensions.reason).toContain("Content-Type");
    });

    test("POST to undefined route with valid Content-Type returns 404", async ({ request }) => {
      const response = await request.post("/undefined-endpoint", {
        headers: {
          "Content-Type": "application/json",
        },
        data: {},
      });

      // Valid content-type passes validation, then route not found
      expect(response.status()).toBe(404);
    });
  });

  test.describe("Response Headers", () => {
    test("405 responses include X-Request-Id header", async ({ request }) => {
      const response = await request.post("/tokens");

      expect(response.status()).toBe(405);
      expect(response.headers()["x-request-id"]).toBeTruthy();
    });

    test("OpenAPI spec response includes X-Request-Id header", async ({ request }) => {
      const response = await request.get("/");

      expect(response.status()).toBe(200);
      expect(response.headers()["x-request-id"]).toBeTruthy();
    });

    test("Error responses include timestamp in body", async ({ request }) => {
      const response = await request.post("/tokens");

      expect(response.status()).toBe(405);
      const data = await response.json();
      expect(data).toHaveProperty("timestamp");

      // ISO 8601 format validation
      const timestamp = new Date(data.timestamp);
      expect(timestamp.getTime()).not.toBeNaN();
    });

    test("Error responses include instance path", async ({ request }) => {
      const response = await request.post("/tokens");

      expect(response.status()).toBe(405);
      const data = await response.json();
      expect(data).toHaveProperty("instance");
      expect(data.instance).toBe("/tokens");
    });
  });

  test.describe("Caching Headers", () => {
    test("OpenAPI spec has Cache-Control header", async ({ request }) => {
      const response = await request.get("/");

      expect(response.status()).toBe(200);
      expect(response.headers()["cache-control"]).toBe("public, max-age=300");
    });

    test("OpenAPI spec is publicly cacheable for 5 minutes", async ({ request }) => {
      const response = await request.get("/");

      expect(response.status()).toBe(200);

      const cacheControl = response.headers()["cache-control"];
      expect(cacheControl).toContain("public");
      expect(cacheControl).toContain("max-age=300");
    });
  });
});
