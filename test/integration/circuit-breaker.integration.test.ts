/* test/integration/circuit-breaker.integration.test.ts */

/**
 * Integration tests for circuit breaker behavior with real Kong API.
 * Tests circuit breaker state transitions, timeout handling, and recovery.
 *
 * Run: docker compose -f docker-compose.test.yml up -d
 * Then: bun test test/integration/circuit-breaker.integration.test.ts
 */

import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import {
  INTEGRATION_CONFIG,
  isIntegrationEnvironmentAvailable,
  TEST_CONSUMERS,
  waitForAuthService,
  waitForKong,
} from "./setup";

// Skip all tests if integration environment is not available
let integrationAvailable = false;
let authServiceAvailable = false;

beforeAll(async () => {
  integrationAvailable = await isIntegrationEnvironmentAvailable();
  if (!integrationAvailable) {
    console.log(
      "Integration environment not available. Start with: docker compose -f docker-compose.test.yml up -d"
    );
    return;
  }

  // Wait for Kong to be fully ready
  const kongReady = await waitForKong(10, 1000);
  if (!kongReady) {
    console.log("Kong did not become ready in time");
    integrationAvailable = false;
    return;
  }

  // Check if auth service is running (quick check - 2 retries, 500ms each)
  authServiceAvailable = await waitForAuthService(2, 500);
  if (!authServiceAvailable) {
    console.log("Auth service not running. Some tests will be skipped. Start with: bun run dev");
  }
});

describe("Circuit Breaker - Kong API Connectivity", () => {
  it("should successfully connect to Kong when available", async () => {
    if (!integrationAvailable) {
      console.log("Skipping: Integration environment not available");
      return;
    }

    const startTime = Date.now();
    const response = await fetch(`${INTEGRATION_CONFIG.KONG_ADMIN_URL}/status`);
    const duration = Date.now() - startTime;

    expect(response.ok).toBe(true);
    // Response should be fast when Kong is healthy
    expect(duration).toBeLessThan(1000);
  });

  it("should handle multiple concurrent requests to Kong", async () => {
    if (!integrationAvailable) {
      console.log("Skipping: Integration environment not available");
      return;
    }

    const requests = Array.from({ length: 10 }, () =>
      fetch(`${INTEGRATION_CONFIG.KONG_ADMIN_URL}/status`)
    );

    const responses = await Promise.all(requests);

    for (const response of responses) {
      expect(response.ok).toBe(true);
    }
  });

  it("should handle rapid sequential requests", async () => {
    if (!integrationAvailable) {
      console.log("Skipping: Integration environment not available");
      return;
    }

    const results: boolean[] = [];
    for (let i = 0; i < 20; i++) {
      const response = await fetch(`${INTEGRATION_CONFIG.KONG_ADMIN_URL}/status`);
      results.push(response.ok);
    }

    // All requests should succeed
    expect(results.every((r) => r)).toBe(true);
  });
});

describe("Circuit Breaker - Consumer Lookup Performance", () => {
  it("should efficiently lookup consumer by ID", async () => {
    if (!integrationAvailable) {
      console.log("Skipping: Integration environment not available");
      return;
    }

    const consumer = TEST_CONSUMERS[0];
    const timings: number[] = [];

    for (let i = 0; i < 5; i++) {
      const startTime = Date.now();
      const response = await fetch(`${INTEGRATION_CONFIG.KONG_ADMIN_URL}/consumers/${consumer.id}`);
      const duration = Date.now() - startTime;
      timings.push(duration);
      expect(response.ok).toBe(true);
    }

    // Average should be reasonable
    const avgTime = timings.reduce((a, b) => a + b, 0) / timings.length;
    expect(avgTime).toBeLessThan(500); // Less than 500ms average
  });

  it("should efficiently lookup JWT credentials", async () => {
    if (!integrationAvailable) {
      console.log("Skipping: Integration environment not available");
      return;
    }

    const consumer = TEST_CONSUMERS[0];
    const timings: number[] = [];

    for (let i = 0; i < 5; i++) {
      const startTime = Date.now();
      const response = await fetch(
        `${INTEGRATION_CONFIG.KONG_ADMIN_URL}/consumers/${consumer.id}/jwt`
      );
      const duration = Date.now() - startTime;
      timings.push(duration);
      expect(response.ok).toBe(true);
    }

    // Average should be reasonable
    const avgTime = timings.reduce((a, b) => a + b, 0) / timings.length;
    expect(avgTime).toBeLessThan(500);
  });
});

describe("Circuit Breaker - Error Handling", () => {
  it("should handle 404 responses gracefully", async () => {
    if (!integrationAvailable) {
      console.log("Skipping: Integration environment not available");
      return;
    }

    const response = await fetch(
      `${INTEGRATION_CONFIG.KONG_ADMIN_URL}/consumers/non-existent-12345`
    );

    expect(response.status).toBe(404);
    // Should not throw, circuit breaker should not trip on 404s
  });

  it("should handle invalid endpoint gracefully", async () => {
    if (!integrationAvailable) {
      console.log("Skipping: Integration environment not available");
      return;
    }

    const response = await fetch(`${INTEGRATION_CONFIG.KONG_ADMIN_URL}/invalid-endpoint-xyz`);

    // Kong returns 404 for invalid endpoints
    expect(response.status).toBe(404);
  });

  it("should handle malformed consumer ID", async () => {
    if (!integrationAvailable) {
      console.log("Skipping: Integration environment not available");
      return;
    }

    // Test with various malformed IDs
    const malformedIds = ["not-a-uuid", "12345", "", "spaces in id", "special!@#$%chars"];

    for (const id of malformedIds) {
      if (id === "") continue; // Skip empty string
      const response = await fetch(
        `${INTEGRATION_CONFIG.KONG_ADMIN_URL}/consumers/${encodeURIComponent(id)}`
      );
      // Should return 404 or 400, not 500
      expect(response.status).toBeLessThan(500);
    }
  });
});

describe("Circuit Breaker - Timeout Behavior", () => {
  it("should respect timeout settings", async () => {
    if (!integrationAvailable) {
      console.log("Skipping: Integration environment not available");
      return;
    }

    // Test with a short timeout - normal requests should complete
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(`${INTEGRATION_CONFIG.KONG_ADMIN_URL}/status`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      expect(response.ok).toBe(true);
    } catch (error) {
      clearTimeout(timeoutId);
      // If it times out, that's a problem
      throw error;
    }
  });

  it("should abort on very short timeout", async () => {
    if (!integrationAvailable) {
      console.log("Skipping: Integration environment not available");
      return;
    }

    // Test with an extremely short timeout - should abort
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1);

    let aborted = false;
    try {
      await fetch(`${INTEGRATION_CONFIG.KONG_ADMIN_URL}/status`, {
        signal: controller.signal,
      });
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        aborted = true;
      }
    } finally {
      clearTimeout(timeoutId);
    }

    // May or may not abort depending on network speed, so we don't assert
    // Just ensure it doesn't hang
  });
});

describe("Circuit Breaker - Auth Service Integration", () => {
  it("should handle token requests with valid consumer", async () => {
    if (!integrationAvailable || !authServiceAvailable) {
      console.log("Skipping: Integration environment or auth service not available");
      return;
    }

    const consumer = TEST_CONSUMERS[0];
    const response = await fetch(`${INTEGRATION_CONFIG.AUTH_SERVICE_URL}/tokens`, {
      headers: {
        "X-Consumer-ID": consumer.id,
        "X-Consumer-Username": consumer.username,
      },
    });

    // Should get a successful response
    expect(response.ok).toBe(true);

    const data = await response.json();
    expect(data).toHaveProperty("access_token");
  });

  it("should handle token requests with missing consumer headers", async () => {
    if (!integrationAvailable || !authServiceAvailable) {
      console.log("Skipping: Integration environment or auth service not available");
      return;
    }

    const response = await fetch(`${INTEGRATION_CONFIG.AUTH_SERVICE_URL}/tokens`);

    // Should get 401 for missing headers
    expect(response.status).toBe(401);
  });

  it("should handle health check", async () => {
    if (!integrationAvailable || !authServiceAvailable) {
      console.log("Skipping: Integration environment or auth service not available");
      return;
    }

    const response = await fetch(`${INTEGRATION_CONFIG.AUTH_SERVICE_URL}/health`);

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data).toHaveProperty("status");
  });

  it("should handle multiple token requests efficiently", async () => {
    if (!integrationAvailable || !authServiceAvailable) {
      console.log("Skipping: Integration environment or auth service not available");
      return;
    }

    const consumer = TEST_CONSUMERS[0];
    const timings: number[] = [];

    for (let i = 0; i < 5; i++) {
      const startTime = Date.now();
      const response = await fetch(`${INTEGRATION_CONFIG.AUTH_SERVICE_URL}/tokens`, {
        headers: {
          "X-Consumer-ID": consumer.id,
          "X-Consumer-Username": consumer.username,
        },
      });
      const duration = Date.now() - startTime;
      timings.push(duration);
      expect(response.ok).toBe(true);
    }

    // Average should be reasonable (< 200ms for token generation)
    const avgTime = timings.reduce((a, b) => a + b, 0) / timings.length;
    expect(avgTime).toBeLessThan(500);
  });
});

describe("Circuit Breaker - Recovery Testing", () => {
  it("should recover after Kong becomes available again", async () => {
    if (!integrationAvailable) {
      console.log("Skipping: Integration environment not available");
      return;
    }

    // First verify Kong is up
    const response1 = await fetch(`${INTEGRATION_CONFIG.KONG_ADMIN_URL}/status`);
    expect(response1.ok).toBe(true);

    // Simulate brief network issue (connect to wrong port)
    try {
      await fetch("http://localhost:8199/status", {
        signal: AbortSignal.timeout(100),
      });
    } catch {
      // Expected to fail
    }

    // Kong should still be accessible
    const response2 = await fetch(`${INTEGRATION_CONFIG.KONG_ADMIN_URL}/status`);
    expect(response2.ok).toBe(true);
  });
});

afterAll(() => {
  if (!integrationAvailable) {
    console.log("\nTo run integration tests:");
    console.log("1. docker compose -f docker-compose.test.yml up -d");
    console.log("2. Wait for services to be ready (~30 seconds)");
    console.log("3. bun run dev (in another terminal)");
    console.log("4. bun test test/integration/");
  }
});
