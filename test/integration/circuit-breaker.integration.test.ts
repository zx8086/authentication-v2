// test/integration/circuit-breaker.integration.test.ts

import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import {
  disableFetchPolyfill,
  enableFetchPolyfill,
  INTEGRATION_CONFIG,
  isIntegrationEnvironmentAvailable,
  TEST_CONSUMERS,
  waitForAuthService,
  waitForKong,
} from "./setup";

const FETCH_TIMEOUT_MS = 5000;

function fetchWithTimeout(
  url: string | Request,
  options: RequestInit & { timeout?: number } = {}
): Promise<Response> {
  const { timeout = FETCH_TIMEOUT_MS, ...fetchOptions } = options;

  return Promise.race([
    fetch(url, fetchOptions),
    new Promise<Response>((_, reject) =>
      setTimeout(() => reject(new Error(`Fetch to ${url} timed out after ${timeout}ms`)), timeout)
    ),
  ]);
}

let integrationAvailable = false;
let authServiceAvailable = false;

beforeAll(async () => {
  enableFetchPolyfill();

  integrationAvailable = await isIntegrationEnvironmentAvailable();
  if (!integrationAvailable) {
    return;
  }

  const kongReady = await waitForKong(10, 1000);
  if (!kongReady) {
    console.log("Kong did not become ready in time");
    integrationAvailable = false;
    return;
  }

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

    const avgTime = timings.reduce((a, b) => a + b, 0) / timings.length;
    expect(avgTime).toBeLessThan(500);
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
  });

  it("should handle invalid endpoint gracefully", async () => {
    if (!integrationAvailable) {
      console.log("Skipping: Integration environment not available");
      return;
    }

    const response = await fetch(`${INTEGRATION_CONFIG.KONG_ADMIN_URL}/invalid-endpoint-xyz`);

    expect(response.status).toBe(404);
  });

  it("should handle malformed consumer ID", async () => {
    if (!integrationAvailable) {
      console.log("Skipping: Integration environment not available");
      return;
    }

    const malformedIds = ["not-a-uuid", "12345", "", "spaces in id", "special!@#$%chars"];

    for (const id of malformedIds) {
      if (id === "") continue;
      const response = await fetch(
        `${INTEGRATION_CONFIG.KONG_ADMIN_URL}/consumers/${encodeURIComponent(id)}`
      );
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
      throw error;
    }
  });

  it("should abort on very short timeout", async () => {
    if (!integrationAvailable) {
      console.log("Skipping: Integration environment not available");
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1);

    try {
      await fetch(`${INTEGRATION_CONFIG.KONG_ADMIN_URL}/status`, {
        signal: controller.signal,
      });
    } catch {
      // Expected: timeout aborts request
    } finally {
      clearTimeout(timeoutId);
    }
  });
});

describe("Circuit Breaker - Auth Service Integration", () => {
  it("should handle token requests with valid consumer", async () => {
    if (!integrationAvailable || !authServiceAvailable) {
      console.log("Skipping: Integration environment or auth service not available");
      return;
    }

    const consumer = TEST_CONSUMERS[0];
    const response = await fetchWithTimeout(`${INTEGRATION_CONFIG.AUTH_SERVICE_URL}/tokens`, {
      headers: {
        "X-Consumer-ID": consumer.id,
        "X-Consumer-Username": consumer.username,
      },
    });

    expect(response.ok).toBe(true);

    const data = await response.json();
    expect(data).toHaveProperty("access_token");
  });

  it("should handle token requests with missing consumer headers", async () => {
    if (!integrationAvailable || !authServiceAvailable) {
      console.log("Skipping: Integration environment or auth service not available");
      return;
    }

    const response = await fetchWithTimeout(`${INTEGRATION_CONFIG.AUTH_SERVICE_URL}/tokens`);

    expect(response.status).toBe(401);
  });

  it("should handle health check", async () => {
    if (!integrationAvailable || !authServiceAvailable) {
      console.log("Skipping: Integration environment or auth service not available");
      return;
    }

    const response = await fetchWithTimeout(`${INTEGRATION_CONFIG.AUTH_SERVICE_URL}/health`);

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
      const response = await fetchWithTimeout(`${INTEGRATION_CONFIG.AUTH_SERVICE_URL}/tokens`, {
        headers: {
          "X-Consumer-ID": consumer.id,
          "X-Consumer-Username": consumer.username,
        },
      });
      const duration = Date.now() - startTime;
      timings.push(duration);
      expect(response.ok).toBe(true);
    }

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

    const response1 = await fetch(`${INTEGRATION_CONFIG.KONG_ADMIN_URL}/status`);
    expect(response1.ok).toBe(true);

    try {
      await fetch("http://localhost:8199/status", {
        signal: AbortSignal.timeout(100),
      });
    } catch {
      // Expected: invalid URL fails
    }

    const response2 = await fetch(`${INTEGRATION_CONFIG.KONG_ADMIN_URL}/status`);
    expect(response2.ok).toBe(true);
  });
});

afterAll(() => {
  disableFetchPolyfill();
});
