// test/playwright/consolidated-business.e2e.ts

import { expect, test } from "@playwright/test";

const TEST_CONSUMER = {
  id: "f48534e1-4caf-4106-9103-edf38eae7ebc",
  username: "test-consumer-001",
  custom_id: "test-consumer-001",
  description: "Primary test consumer for basic authentication tests",
};

const ANONYMOUS_CONSUMER = {
  id: "56456a01-65ec-4415-aec8-49fec6403c9c",
  username: "anonymous",
  custom_id: "anonymous",
  description: "Anonymous consumer for testing rejection scenarios",
};

const BASIC_TEST_CONSUMERS = [
  {
    id: "f48534e1-4caf-4106-9103-edf38eae7ebc",
    username: "test-consumer-001",
    custom_id: "test-consumer-001",
    description: "Primary test consumer for basic authentication tests",
  },
  {
    id: "1ff7d425-917a-4858-9e99-c2a911ba1b05",
    username: "test-consumer-002",
    custom_id: "test-consumer-002",
    description: "Secondary test consumer for multi-user scenarios",
  },
  {
    id: "73881280-13b4-40b3-aecf-84d981d6ac35",
    username: "test-consumer-003",
    custom_id: "test-consumer-003",
    description: "Third test consumer for multi-user scenarios",
  },
];

test.describe("Authentication Service - Complete Business Requirements", () => {
  test.describe("Service Health & Dependencies", () => {
    test("Health endpoint reports service and Kong status", async ({ request }) => {
      const response = await request.get("/health");
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.status).toBe("healthy");
      expect(data).toHaveProperty("version");
      expect(data).toHaveProperty("uptime");

      expect(data.dependencies).toHaveProperty("kong");
      expect(data.dependencies.kong).toHaveProperty("status");
      expect(["healthy", "unhealthy"]).toContain(data.dependencies.kong.status);
      expect(data.dependencies.kong).toHaveProperty("responseTime");
    });

    test("Metrics endpoint provides monitoring data", async ({ request }) => {
      const response = await request.get("/metrics");
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty("memory");
      expect(data).toHaveProperty("uptime");
      expect(data).toHaveProperty("telemetry");
    });

    test("OpenAPI documentation is available", async ({ request }) => {
      const response = await request.get("/");
      expect(response.status()).toBe(200);

      const spec = await response.json();
      expect(spec.openapi).toBeDefined();
      expect(spec.paths["/tokens"]).toBeDefined();
      expect(spec.paths["/health"]).toBeDefined();
      expect(spec.paths["/metrics"]).toBeDefined();
    });
  });

  test.describe("JWT Token Generation Core Flow", () => {
    test("Generates valid JWT token for authenticated consumer", async ({ request }) => {
      const consumer = TEST_CONSUMER;
      const response = await request.get("/tokens", {
        headers: {
          "X-Consumer-Id": consumer.id,
          "X-Consumer-Username": consumer.username,
        },
      });
      expect(response.status()).toBe(200);

      const data = await response.json();

      expect(data.access_token).toBeTruthy();
      expect(data.expires_in).toBe(900); // 15 minutes

      const parts = data.access_token.split(".");
      expect(parts).toHaveLength(3);

      const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
      expect(payload.sub).toBe(consumer.username);
      expect(payload.iss).toBeTruthy();
      expect(payload.aud).toBeTruthy();
      expect(payload.key).toBeTruthy();
      expect(payload.exp - payload.iat).toBe(900);
    });

    test("Same consumer gets consistent tokens (same secret)", async ({ request }) => {
      const consumer = TEST_CONSUMER;
      const headers = {
        "X-Consumer-Id": consumer.id,
        "X-Consumer-Username": consumer.username,
      };

      const response1 = await request.get("/tokens", { headers });
      const response2 = await request.get("/tokens", { headers });

      expect(response1.status()).toBe(200);
      expect(response2.status()).toBe(200);

      const token1 = (await response1.json()).access_token;
      const token2 = (await response2.json()).access_token;

      const payload1 = JSON.parse(Buffer.from(token1.split(".")[1], "base64url").toString());
      const payload2 = JSON.parse(Buffer.from(token2.split(".")[1], "base64url").toString());

      expect(payload1.key).toBe(payload2.key);
      expect(payload1.sub).toBe(payload2.sub);
      expect(payload1.iss).toBe(payload2.iss);
      expect(payload1.aud).toBe(payload2.aud);
    });

    test("Different consumers get different tokens", async ({ request }) => {
      const consumers = BASIC_TEST_CONSUMERS.slice(0, 3);
      const tokens = new Set();

      for (const consumer of consumers) {
        const response = await request.get("/tokens", {
          headers: {
            "X-Consumer-Id": consumer.id,
            "X-Consumer-Username": consumer.username,
          },
        });
        expect(response.status()).toBe(200);

        const data = await response.json();
        tokens.add(data.access_token);
      }

      expect(tokens.size).toBe(3);

      const tokenArray = Array.from(tokens) as string[];
      const payload1 = JSON.parse(Buffer.from(tokenArray[0].split(".")[1], "base64url").toString());
      const payload2 = JSON.parse(Buffer.from(tokenArray[1].split(".")[1], "base64url").toString());

      expect(payload1.sub).not.toBe(payload2.sub);
      expect(payload1.key).not.toBe(payload2.key);
    });
  });

  test.describe("Security Enforcement", () => {
    test("Rejects anonymous consumers", async ({ request }) => {
      const response = await request.get("/tokens", {
        headers: {
          "X-Consumer-Id": ANONYMOUS_CONSUMER.id,
          "X-Consumer-Username": ANONYMOUS_CONSUMER.username,
          "X-Anonymous-Consumer": "true",
        },
      });
      expect(response.status()).toBe(401);

      const data = await response.json();
      // RFC 7807 Problem Details format
      expect(data.code).toBe("AUTH_009");
      expect(data.detail).toContain("Anonymous consumers");
    });

    test("Requires both consumer headers", async ({ request }) => {
      let response = await request.get("/tokens");
      expect(response.status()).toBe(401);

      response = await request.get("/tokens", {
        headers: { "X-Consumer-Id": "test-id" },
      });
      expect(response.status()).toBe(401);

      response = await request.get("/tokens", {
        headers: { "X-Consumer-Username": "test-user" },
      });
      expect(response.status()).toBe(401);
    });

    test("Handles non-existent consumers", async ({ request }) => {
      const response = await request.get("/tokens", {
        headers: {
          "X-Consumer-Id": `non-existent-${Date.now()}`,
          "X-Consumer-Username": `ghost-user-${Date.now()}`,
        },
      });

      // In CI/CD environments, Kong behavior may vary due to circuit breaker patterns
      // Accept both 401 (consumer not found) and 503 (service temporarily unavailable)
      expect([401, 503]).toContain(response.status());

      const data = await response.json();

      if (response.status() === 401) {
        // RFC 7807 - Standard unauthorized response - AUTH_002 for consumer not found
        expect(data.code).toBe("AUTH_002");
        expect(data).toHaveProperty("requestId");
      } else if (response.status() === 503) {
        // RFC 7807 - Circuit breaker or Kong connectivity response - AUTH_004
        expect(data.code).toBe("AUTH_004");
        expect(data).toHaveProperty("timestamp");
      }
    });
  });

  test.describe("Service Performance & Reliability", () => {
    test("Handles multiple requests efficiently", async ({ request }) => {
      const consumer = TEST_CONSUMER;
      const headers = {
        "X-Consumer-Id": consumer.id,
        "X-Consumer-Username": consumer.username,
      };

      const startTime = Date.now();
      for (let i = 0; i < 5; i++) {
        const response = await request.get("/tokens", { headers });
        expect(response.status()).toBe(200);

        const data = await response.json();
        expect(data.access_token).toBeTruthy();
        expect(data.expires_in).toBe(900);
      }
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(10000);
    });

    test("Different consumers can request tokens concurrently", async ({ request }) => {
      const consumers = BASIC_TEST_CONSUMERS.slice(0, 3);

      const requests = consumers.map((consumer) =>
        request.get("/tokens", {
          headers: {
            "X-Consumer-Id": consumer.id,
            "X-Consumer-Username": consumer.username,
          },
        })
      );

      const responses = await Promise.all(requests);

      for (const response of responses) {
        expect(response.status()).toBe(200);
      }

      const tokens = new Set();
      for (const response of responses) {
        const data = await response.json();
        tokens.add(data.access_token);
      }
      expect(tokens.size).toBe(consumers.length);
    });
  });

  test.describe("Telemetry & Observability", () => {
    test("Health telemetry endpoint provides telemetry status", async ({ request }) => {
      const response = await request.get("/health/telemetry");
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty("telemetry");
      expect(data.telemetry).toHaveProperty("mode");
      expect(data.telemetry).toHaveProperty("status");
    });

    test("Unified metrics endpoint provides infrastructure view", async ({ request }) => {
      const response = await request.get("/metrics?view=infrastructure");
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty("infrastructure");
      expect(data.infrastructure).toHaveProperty("metrics");
      expect(data.infrastructure.metrics).toHaveProperty("status");
    });

    test("Debug metrics test endpoint records test metrics", async ({ request }) => {
      const response = await request.post("/debug/metrics/test");
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toContain("Test metrics recorded");
      expect(data).toHaveProperty("metricsRecorded");
    });
  });

  test.describe("Error Handling & Resilience", () => {
    test("404 for unknown endpoints", async ({ request }) => {
      const response = await request.get("/unknown-endpoint");
      expect(response.status()).toBe(404);

      const data = await response.json();
      // RFC 7807 Problem Details format
      expect(data.title).toBe("Not Found");
      expect(data).toHaveProperty("detail");
      expect(data).toHaveProperty("status");
      expect(data.status).toBe(404);
    });

    test("Consistent error response structure", async ({ request }) => {
      const errors = [
        { path: "/tokens", expectedStatus: 401 },
        { path: "/unknown", expectedStatus: 404 },
      ];

      for (const { path, expectedStatus } of errors) {
        const response = await request.get(path);
        expect(response.status()).toBe(expectedStatus);

        const data = await response.json();

        // RFC 7807 Problem Details format for all errors
        expect(data).toHaveProperty("type");
        expect(data).toHaveProperty("title");
        expect(data).toHaveProperty("status");
        expect(data).toHaveProperty("detail");
        expect(data).toHaveProperty("timestamp");

        if (expectedStatus === 401) {
          expect(data).toHaveProperty("code");
          expect(data).toHaveProperty("requestId");
        } else if (expectedStatus === 404) {
          expect(data).toHaveProperty("instance");
          expect(data).toHaveProperty("extensions");
        }
      }
    });

    test("CORS support for browser applications", async ({ request }) => {
      const response = await request.fetch("/tokens", {
        method: "OPTIONS",
        headers: {
          Origin: "https://example.com",
          "Access-Control-Request-Method": "GET",
          "Access-Control-Request-Headers": "X-Consumer-Id,X-Consumer-Username",
        },
      });

      expect(response.status()).toBe(204);
      expect(response.headers()["access-control-allow-origin"]).toBeDefined();
      expect(response.headers()["access-control-allow-methods"]).toContain("GET");
    });
  });
});
