/* test/integration/kong-service.integration.test.ts */

/**
 * Integration tests for Kong API Gateway service.
 * These tests run against a real Kong instance in the Docker test environment.
 *
 * Run: docker compose -f docker-compose.test.yml up -d
 * Then: bun test test/integration/kong-service.integration.test.ts
 */

import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import {
  API_KEYS,
  INTEGRATION_CONFIG,
  isIntegrationEnvironmentAvailable,
  TEST_CONSUMERS,
  waitForKong,
} from "./setup";

// Skip all tests if integration environment is not available
let integrationAvailable = false;

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
  }
});

describe("Kong Admin API Integration", () => {
  it("should connect to Kong Admin API", async () => {
    if (!integrationAvailable) {
      console.log("Skipping: Integration environment not available");
      return;
    }

    const response = await fetch(`${INTEGRATION_CONFIG.KONG_ADMIN_URL}/status`);
    expect(response.ok).toBe(true);

    const status = await response.json();
    expect(status).toHaveProperty("database");
    expect(status.database.reachable).toBe(true);
  });

  it("should list all consumers", async () => {
    if (!integrationAvailable) {
      console.log("Skipping: Integration environment not available");
      return;
    }

    const response = await fetch(`${INTEGRATION_CONFIG.KONG_ADMIN_URL}/consumers`);
    expect(response.ok).toBe(true);

    const data = await response.json();
    expect(data).toHaveProperty("data");
    expect(Array.isArray(data.data)).toBe(true);
  });

  it("should find test consumer by ID", async () => {
    if (!integrationAvailable) {
      console.log("Skipping: Integration environment not available");
      return;
    }

    const consumer = TEST_CONSUMERS[0];
    const response = await fetch(`${INTEGRATION_CONFIG.KONG_ADMIN_URL}/consumers/${consumer.id}`);
    expect(response.ok).toBe(true);

    const data = await response.json();
    expect(data.id).toBe(consumer.id);
    expect(data.username).toBe(consumer.username);
  });

  it("should find test consumer by username", async () => {
    if (!integrationAvailable) {
      console.log("Skipping: Integration environment not available");
      return;
    }

    const consumer = TEST_CONSUMERS[0];
    const response = await fetch(
      `${INTEGRATION_CONFIG.KONG_ADMIN_URL}/consumers/${consumer.username}`
    );
    expect(response.ok).toBe(true);

    const data = await response.json();
    expect(data.id).toBe(consumer.id);
    expect(data.username).toBe(consumer.username);
  });

  it("should return 404 for non-existent consumer", async () => {
    if (!integrationAvailable) {
      console.log("Skipping: Integration environment not available");
      return;
    }

    const response = await fetch(
      `${INTEGRATION_CONFIG.KONG_ADMIN_URL}/consumers/non-existent-consumer-12345`
    );
    expect(response.status).toBe(404);
  });
});

describe("Kong JWT Credentials Integration", () => {
  it("should retrieve JWT credentials for consumer", async () => {
    if (!integrationAvailable) {
      console.log("Skipping: Integration environment not available");
      return;
    }

    const consumer = TEST_CONSUMERS[0];
    const response = await fetch(
      `${INTEGRATION_CONFIG.KONG_ADMIN_URL}/consumers/${consumer.id}/jwt`
    );
    expect(response.ok).toBe(true);

    const data = await response.json();
    expect(data).toHaveProperty("data");
    expect(Array.isArray(data.data)).toBe(true);

    // Should have at least one JWT credential
    if (data.data.length > 0) {
      const cred = data.data[0];
      expect(cred).toHaveProperty("key");
      expect(cred).toHaveProperty("secret");
      expect(cred).toHaveProperty("algorithm");
    }
  });

  it("should have JWT credentials for test consumer", async () => {
    if (!integrationAvailable) {
      console.log("Skipping: Integration environment not available");
      return;
    }

    const consumer = TEST_CONSUMERS[0];

    const response = await fetch(
      `${INTEGRATION_CONFIG.KONG_ADMIN_URL}/consumers/${consumer.id}/jwt`
    );
    expect(response.ok).toBe(true);

    const data = await response.json();
    expect(data.data.length).toBeGreaterThan(0);

    // Verify the JWT credential has the expected structure
    const cred = data.data[0];
    expect(cred).toHaveProperty("key");
    expect(cred).toHaveProperty("secret");
    expect(cred.algorithm).toBe("HS256");
    expect(cred.consumer.id).toBe(consumer.id);
  });

  it("should list all JWT credentials in Kong", async () => {
    if (!integrationAvailable) {
      console.log("Skipping: Integration environment not available");
      return;
    }

    const response = await fetch(`${INTEGRATION_CONFIG.KONG_ADMIN_URL}/jwts`);
    expect(response.ok).toBe(true);

    const data = await response.json();
    expect(data).toHaveProperty("data");
    expect(Array.isArray(data.data)).toBe(true);

    // Should have credentials for all test consumers
    expect(data.data.length).toBeGreaterThanOrEqual(TEST_CONSUMERS.length);
  });
});

describe("Kong Key-Auth Integration", () => {
  it("should verify API key exists for consumer", async () => {
    if (!integrationAvailable) {
      console.log("Skipping: Integration environment not available");
      return;
    }

    const consumer = TEST_CONSUMERS[0];
    const response = await fetch(
      `${INTEGRATION_CONFIG.KONG_ADMIN_URL}/consumers/${consumer.id}/key-auth`
    );
    expect(response.ok).toBe(true);

    const data = await response.json();
    expect(data).toHaveProperty("data");
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.data.length).toBeGreaterThan(0);
  });

  it("should find consumer by API key", async () => {
    if (!integrationAvailable) {
      console.log("Skipping: Integration environment not available");
      return;
    }

    // First get the key-auth ID
    const consumer = TEST_CONSUMERS[0];
    const keysResponse = await fetch(
      `${INTEGRATION_CONFIG.KONG_ADMIN_URL}/consumers/${consumer.id}/key-auth`
    );
    expect(keysResponse.ok).toBe(true);

    const keysData = await keysResponse.json();
    if (keysData.data.length > 0) {
      const keyAuth = keysData.data[0];
      expect(keyAuth.key).toBe(API_KEYS.CONSUMER_001);
    }
  });
});

describe("Kong Plugins Integration", () => {
  it("should have key-auth plugin enabled", async () => {
    if (!integrationAvailable) {
      console.log("Skipping: Integration environment not available");
      return;
    }

    const response = await fetch(`${INTEGRATION_CONFIG.KONG_ADMIN_URL}/plugins`);
    expect(response.ok).toBe(true);

    const data = await response.json();
    const keyAuthPlugin = data.data.find((p: { name: string }) => p.name === "key-auth");
    expect(keyAuthPlugin).toBeDefined();
  });

  it("should have jwt plugin enabled", async () => {
    if (!integrationAvailable) {
      console.log("Skipping: Integration environment not available");
      return;
    }

    const response = await fetch(`${INTEGRATION_CONFIG.KONG_ADMIN_URL}/plugins`);
    expect(response.ok).toBe(true);

    const data = await response.json();
    const jwtPlugin = data.data.find((p: { name: string }) => p.name === "jwt");
    expect(jwtPlugin).toBeDefined();
  });
});

describe("Kong Health and Status Integration", () => {
  it("should return Kong version info", async () => {
    if (!integrationAvailable) {
      console.log("Skipping: Integration environment not available");
      return;
    }

    const response = await fetch(`${INTEGRATION_CONFIG.KONG_ADMIN_URL}/`);
    expect(response.ok).toBe(true);

    const data = await response.json();
    expect(data).toHaveProperty("version");
    expect(data.version).toMatch(/^3\.\d+/); // Kong 3.x
  });

  it("should have healthy database connection", async () => {
    if (!integrationAvailable) {
      console.log("Skipping: Integration environment not available");
      return;
    }

    const response = await fetch(`${INTEGRATION_CONFIG.KONG_ADMIN_URL}/status`);
    expect(response.ok).toBe(true);

    const data = await response.json();
    expect(data.database.reachable).toBe(true);
  });
});

describe("Consumer Data Consistency", () => {
  it("should have all 5 test consumers", async () => {
    if (!integrationAvailable) {
      console.log("Skipping: Integration environment not available");
      return;
    }

    for (const consumer of TEST_CONSUMERS) {
      const response = await fetch(`${INTEGRATION_CONFIG.KONG_ADMIN_URL}/consumers/${consumer.id}`);
      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data.id).toBe(consumer.id);
      expect(data.username).toBe(consumer.username);
    }
  });

  it("should have JWT credentials for all consumers", async () => {
    if (!integrationAvailable) {
      console.log("Skipping: Integration environment not available");
      return;
    }

    for (const consumer of TEST_CONSUMERS) {
      const response = await fetch(
        `${INTEGRATION_CONFIG.KONG_ADMIN_URL}/consumers/${consumer.id}/jwt`
      );
      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data.data.length).toBeGreaterThan(0);
    }
  });

  it("should have API keys for all consumers", async () => {
    if (!integrationAvailable) {
      console.log("Skipping: Integration environment not available");
      return;
    }

    for (const consumer of TEST_CONSUMERS) {
      const response = await fetch(
        `${INTEGRATION_CONFIG.KONG_ADMIN_URL}/consumers/${consumer.id}/key-auth`
      );
      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data.data.length).toBeGreaterThan(0);
    }
  });
});

afterAll(() => {
  if (!integrationAvailable) {
    console.log("\nTo run integration tests:");
    console.log("1. docker compose -f docker-compose.test.yml up -d");
    console.log("2. Wait for services to be ready (~30 seconds)");
    console.log("3. bun test test/integration/");
  }
});
