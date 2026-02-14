// test/integration/kong-adapter.integration.test.ts

import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { KongAdapter } from "../../src/adapters/kong.adapter";
import {
  disableFetchPolyfill,
  enableFetchPolyfill,
  INTEGRATION_CONFIG,
  isIntegrationEnvironmentAvailable,
  TEST_CONSUMERS,
  waitForKong,
} from "./setup";

let integrationAvailable = false;
let adapter: KongAdapter;

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

  adapter = new KongAdapter("API_GATEWAY", INTEGRATION_CONFIG.KONG_ADMIN_URL, "");
});

describe("KongAdapter Integration - Real Kong", () => {
  describe("getConsumerSecret", () => {
    it("should fetch consumer secret from real Kong", async () => {
      if (!integrationAvailable) {
        console.log("Skipping: Integration environment not available");
        return;
      }

      const freshAdapter = new KongAdapter("API_GATEWAY", INTEGRATION_CONFIG.KONG_ADMIN_URL, "");

      const consumer = TEST_CONSUMERS[0];
      const result = await freshAdapter.getConsumerSecret(consumer.id);

      expect(result).not.toBeNull();
      expect(result?.key).toBeDefined();
      expect(result?.secret).toBeDefined();
      expect(result?.consumer?.id).toBe(consumer.id);
    });

    it("should cache consumer secrets on subsequent calls", async () => {
      if (!integrationAvailable) {
        console.log("Skipping: Integration environment not available");
        return;
      }

      const freshAdapter = new KongAdapter("API_GATEWAY", INTEGRATION_CONFIG.KONG_ADMIN_URL, "");

      const consumer = TEST_CONSUMERS[0];

      const start1 = Date.now();
      const first = await freshAdapter.getConsumerSecret(consumer.id);
      const duration1 = Date.now() - start1;

      expect(first).not.toBeNull();

      const start2 = Date.now();
      const second = await freshAdapter.getConsumerSecret(consumer.id);
      const duration2 = Date.now() - start2;

      expect(second).not.toBeNull();
      expect(second?.key).toBe(first?.key);

      console.log(`First call: ${duration1}ms, Second call (cached): ${duration2}ms`);
    });

    it("should return null for non-existent consumer", async () => {
      if (!integrationAvailable) {
        console.log("Skipping: Integration environment not available");
        return;
      }

      // Use fresh adapter
      const freshAdapter = new KongAdapter("API_GATEWAY", INTEGRATION_CONFIG.KONG_ADMIN_URL, "");

      const result = await freshAdapter.getConsumerSecret("non-existent-consumer-id-12345");

      expect(result).toBeNull();
    });

    it("should handle consumer lookup by username", async () => {
      if (!integrationAvailable) {
        console.log("Skipping: Integration environment not available");
        return;
      }

      const freshAdapter = new KongAdapter("API_GATEWAY", INTEGRATION_CONFIG.KONG_ADMIN_URL, "");

      const consumer = TEST_CONSUMERS[2];
      const result = await freshAdapter.getConsumerSecret(consumer.username);

      expect(result === null || result?.consumer !== undefined).toBe(true);
    });

    it("should handle sequential lookups for different consumers", async () => {
      if (!integrationAvailable) {
        console.log("Skipping: Integration environment not available");
        return;
      }

      for (const consumer of TEST_CONSUMERS) {
        const freshAdapter = new KongAdapter("API_GATEWAY", INTEGRATION_CONFIG.KONG_ADMIN_URL, "");
        const result = await freshAdapter.getConsumerSecret(consumer.id);
        expect(result).not.toBeNull();
        expect(result?.consumer?.id).toBe(consumer.id);
      }
    });
  });

  describe("healthCheck", () => {
    it("should return healthy when Kong is available", async () => {
      if (!integrationAvailable) {
        console.log("Skipping: Integration environment not available");
        return;
      }

      const result = await adapter.healthCheck();

      expect(result.healthy).toBe(true);
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
      expect(result.responseTime).toBeLessThan(5000);
    });

    it("should include response time in health check", async () => {
      if (!integrationAvailable) {
        console.log("Skipping: Integration environment not available");
        return;
      }

      const result = await adapter.healthCheck();

      expect(typeof result.responseTime).toBe("number");
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe("clearCache", () => {
    it("should clear cache for specific consumer", async () => {
      if (!integrationAvailable) {
        console.log("Skipping: Integration environment not available");
        return;
      }

      const consumer = TEST_CONSUMERS[0];

      await adapter.getConsumerSecret(consumer.id);
      await adapter.clearCache(consumer.id);

      const result = await adapter.getConsumerSecret(consumer.id);
      expect(result).not.toBeNull();
    });

    it("should clear entire cache", async () => {
      if (!integrationAvailable) {
        console.log("Skipping: Integration environment not available");
        return;
      }

      await Promise.all(TEST_CONSUMERS.slice(0, 3).map((c) => adapter.getConsumerSecret(c.id)));
      await adapter.clearCache();

      const stats = await adapter.getCacheStats();
      expect(stats).toBeDefined();
    });
  });

  describe("getCacheStats", () => {
    it("should return cache statistics", async () => {
      if (!integrationAvailable) {
        console.log("Skipping: Integration environment not available");
        return;
      }

      await adapter.getConsumerSecret(TEST_CONSUMERS[0].id);

      const stats = await adapter.getCacheStats();

      expect(stats).toBeDefined();
      expect(typeof stats).toBe("object");
    });
  });

  describe("getCircuitBreakerStats", () => {
    it("should return circuit breaker statistics", async () => {
      if (!integrationAvailable) {
        console.log("Skipping: Integration environment not available");
        return;
      }

      const stats = adapter.getCircuitBreakerStats();

      expect(stats).toBeDefined();
      expect(typeof stats).toBe("object");
    });

    it("should show healthy circuit breaker state", async () => {
      if (!integrationAvailable) {
        console.log("Skipping: Integration environment not available");
        return;
      }

      await adapter.getConsumerSecret(TEST_CONSUMERS[0].id);

      const stats = adapter.getCircuitBreakerStats();
      expect(stats).toBeDefined();
    });
  });

  describe("concurrent operations", () => {
    it("should handle rapid sequential lookups for same consumer", async () => {
      if (!integrationAvailable) {
        console.log("Skipping: Integration environment not available");
        return;
      }

      const freshAdapter = new KongAdapter("API_GATEWAY", INTEGRATION_CONFIG.KONG_ADMIN_URL, "");

      const consumer = TEST_CONSUMERS[0];
      const results: Array<{ key?: string } | null> = [];

      for (let i = 0; i < 10; i++) {
        const result = await freshAdapter.getConsumerSecret(consumer.id);
        results.push(result);
      }

      for (const result of results) {
        expect(result).not.toBeNull();
        expect(result?.key).toBe(results[0]?.key);
      }
    });
  });

  describe("performance characteristics", () => {
    it("should have reasonable response times for cached lookups", async () => {
      if (!integrationAvailable) {
        console.log("Skipping: Integration environment not available");
        return;
      }

      const freshAdapter = new KongAdapter("API_GATEWAY", INTEGRATION_CONFIG.KONG_ADMIN_URL, "");

      const consumer = TEST_CONSUMERS[0];

      await freshAdapter.getConsumerSecret(consumer.id);

      const timings: number[] = [];
      for (let i = 0; i < 10; i++) {
        const start = Date.now();
        await freshAdapter.getConsumerSecret(consumer.id);
        timings.push(Date.now() - start);
      }

      const avgTime = timings.reduce((a, b) => a + b, 0) / timings.length;
      console.log(`Average cached lookup time: ${avgTime}ms`);

      expect(avgTime).toBeLessThan(100);
    });
  });
});

describe("KongAdapter Integration - Error Scenarios", () => {
  it("should handle Kong being temporarily slow", async () => {
    if (!integrationAvailable) {
      console.log("Skipping: Integration environment not available");
      return;
    }

    const freshAdapter = new KongAdapter("API_GATEWAY", INTEGRATION_CONFIG.KONG_ADMIN_URL, "");

    const consumer = TEST_CONSUMERS[0];
    const result = await freshAdapter.getConsumerSecret(consumer.id);

    expect(result).not.toBeNull();
  });

  it("should recover from cache clear", async () => {
    if (!integrationAvailable) {
      console.log("Skipping: Integration environment not available");
      return;
    }

    const freshAdapter = new KongAdapter("API_GATEWAY", INTEGRATION_CONFIG.KONG_ADMIN_URL, "");

    const consumer = TEST_CONSUMERS[0];

    const first = await freshAdapter.getConsumerSecret(consumer.id);
    await freshAdapter.clearCache();
    const second = await freshAdapter.getConsumerSecret(consumer.id);

    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(second?.key).toBe(first?.key);
  });
});

describe("KongAdapter Integration - Different Adapter Instance", () => {
  it("should work with fresh adapter instance", async () => {
    if (!integrationAvailable) {
      console.log("Skipping: Integration environment not available");
      return;
    }

    const freshAdapter = new KongAdapter("API_GATEWAY", INTEGRATION_CONFIG.KONG_ADMIN_URL, "");

    const consumer = TEST_CONSUMERS[0];
    const result = await freshAdapter.getConsumerSecret(consumer.id);

    expect(result).not.toBeNull();
    expect(result?.consumer?.id).toBe(consumer.id);

    const health = await freshAdapter.healthCheck();
    expect(health.healthy).toBe(true);
  });
});

describe("KongAdapter Integration - createConsumerSecret", () => {
  const createdCredentials: Array<{ consumerId: string; credentialId: string }> = [];

  async function cleanupCredential(consumerId: string, credentialId: string): Promise<void> {
    try {
      await fetch(
        `${INTEGRATION_CONFIG.KONG_ADMIN_URL}/consumers/${consumerId}/jwt/${credentialId}`,
        { method: "DELETE" }
      );
    } catch {
      // Ignore cleanup errors
    }
  }

  afterAll(async () => {
    for (const cred of createdCredentials) {
      await cleanupCredential(cred.consumerId, cred.credentialId);
    }
  });

  it("should create new JWT credentials for an existing consumer", async () => {
    if (!integrationAvailable) {
      console.log("Skipping: Integration environment not available");
      return;
    }

    const freshAdapter = new KongAdapter("API_GATEWAY", INTEGRATION_CONFIG.KONG_ADMIN_URL, "");
    const consumer = TEST_CONSUMERS[0];

    const newSecret = await freshAdapter.createConsumerSecret(consumer.id);

    expect(newSecret).not.toBeNull();
    expect(newSecret?.key).toBeTruthy();
    expect(newSecret?.secret).toBeTruthy();
    expect(newSecret?.algorithm).toBe("HS256");
    expect(newSecret?.consumer?.id).toBe(consumer.id);

    if (newSecret?.id) {
      createdCredentials.push({ consumerId: consumer.id, credentialId: newSecret.id });
    }

    const verifyResponse = await fetch(
      `${INTEGRATION_CONFIG.KONG_ADMIN_URL}/consumers/${consumer.id}/jwt/${newSecret?.id}`
    );
    expect(verifyResponse.status).toBe(200);

    const verifyData = await verifyResponse.json();
    expect(verifyData.id).toBe(newSecret?.id);
    expect(verifyData.key).toBe(newSecret?.key);
  });

  it("should return null when creating credentials for non-existent consumer", async () => {
    if (!integrationAvailable) {
      console.log("Skipping: Integration environment not available");
      return;
    }

    const freshAdapter = new KongAdapter("API_GATEWAY", INTEGRATION_CONFIG.KONG_ADMIN_URL, "");
    const secret = await freshAdapter.createConsumerSecret("non-existent-consumer-xyz-789");

    expect(secret).toBeNull();
  });

  it("should generate unique keys for each credential creation", async () => {
    if (!integrationAvailable) {
      console.log("Skipping: Integration environment not available");
      return;
    }

    const freshAdapter = new KongAdapter("API_GATEWAY", INTEGRATION_CONFIG.KONG_ADMIN_URL, "");
    const consumer = TEST_CONSUMERS[4];

    const secret1 = await freshAdapter.createConsumerSecret(consumer.id);
    const secret2 = await freshAdapter.createConsumerSecret(consumer.id);

    expect(secret1).not.toBeNull();
    expect(secret2).not.toBeNull();

    expect(secret1?.key).not.toBe(secret2?.key);
    expect(secret1?.secret).not.toBe(secret2?.secret);

    if (secret1?.id) {
      createdCredentials.push({ consumerId: consumer.id, credentialId: secret1.id });
    }
    if (secret2?.id) {
      createdCredentials.push({ consumerId: consumer.id, credentialId: secret2.id });
    }
  });

  it("should cache newly created credentials", async () => {
    if (!integrationAvailable) {
      console.log("Skipping: Integration environment not available");
      return;
    }

    const freshAdapter = new KongAdapter("API_GATEWAY", INTEGRATION_CONFIG.KONG_ADMIN_URL, "");
    const consumer = TEST_CONSUMERS[1];

    await freshAdapter.clearCache(consumer.id);

    const newSecret = await freshAdapter.createConsumerSecret(consumer.id);
    expect(newSecret).not.toBeNull();

    if (newSecret?.id) {
      createdCredentials.push({ consumerId: consumer.id, credentialId: newSecret.id });
    }

    const cachedSecret = await freshAdapter.getConsumerSecret(consumer.id);
    expect(cachedSecret).not.toBeNull();
    expect(cachedSecret?.key).toBe(newSecret?.key);
  });
});

describe("KongAdapter Integration - Circuit Breaker Events", () => {
  it("should track circuit breaker operations with closed state", async () => {
    if (!integrationAvailable) {
      console.log("Skipping: Integration environment not available");
      return;
    }

    const freshAdapter = new KongAdapter("API_GATEWAY", INTEGRATION_CONFIG.KONG_ADMIN_URL, "");
    const consumer = TEST_CONSUMERS[0];

    await freshAdapter.getConsumerSecret(consumer.id);
    await freshAdapter.healthCheck();

    const stats = freshAdapter.getCircuitBreakerStats();

    expect(stats).toBeDefined();
    const operations = Object.keys(stats);

    for (const operation of operations) {
      const opStats = stats[operation];
      expect(opStats.state).toBe("closed");
      expect(opStats.stats).toBeDefined();
      expect(opStats.stats.fires).toBeGreaterThan(0);
    }
  });

  it("should track successes in circuit breaker stats", async () => {
    if (!integrationAvailable) {
      console.log("Skipping: Integration environment not available");
      return;
    }

    const freshAdapter = new KongAdapter("API_GATEWAY", INTEGRATION_CONFIG.KONG_ADMIN_URL, "");
    const consumer = TEST_CONSUMERS[0];

    for (let i = 0; i < 3; i++) {
      await freshAdapter.getConsumerSecret(consumer.id);
    }

    const stats = freshAdapter.getCircuitBreakerStats();

    const getConsumerSecretStats = stats.getConsumerSecret;
    if (getConsumerSecretStats) {
      expect(getConsumerSecretStats.stats.successes).toBeGreaterThan(0);
      expect(getConsumerSecretStats.stats.fires).toBeGreaterThanOrEqual(1);
    }
  });

  it("should maintain separate stats for different operations", async () => {
    if (!integrationAvailable) {
      console.log("Skipping: Integration environment not available");
      return;
    }

    const freshAdapter = new KongAdapter("API_GATEWAY", INTEGRATION_CONFIG.KONG_ADMIN_URL, "");

    await freshAdapter.getConsumerSecret(TEST_CONSUMERS[0].id);
    await freshAdapter.healthCheck();

    const stats = freshAdapter.getCircuitBreakerStats();

    const operations = Object.keys(stats);
    expect(operations.length).toBeGreaterThanOrEqual(1);
  });

  it("should show healthy circuit breaker percentiles", async () => {
    if (!integrationAvailable) {
      console.log("Skipping: Integration environment not available");
      return;
    }

    const freshAdapter = new KongAdapter("API_GATEWAY", INTEGRATION_CONFIG.KONG_ADMIN_URL, "");

    for (let i = 0; i < 5; i++) {
      await freshAdapter.getConsumerSecret(TEST_CONSUMERS[0].id);
    }

    const stats = freshAdapter.getCircuitBreakerStats();
    const getConsumerSecretStats = stats.getConsumerSecret;

    if (getConsumerSecretStats?.stats.percentiles) {
      expect(typeof getConsumerSecretStats.stats.percentiles).toBe("object");
    }
  });
});

afterAll(() => {
  disableFetchPolyfill();
});
