/* test/bun/shared/test-consumer-secrets.test.ts */

import { describe, expect, it } from "bun:test";
import { TestConsumerSecretFactory, TestScenarios } from "../../shared/test-consumer-secrets";

describe("TestConsumerSecretFactory", () => {
  describe("create", () => {
    it("should create ConsumerSecret with default prefixes", () => {
      const secret = TestConsumerSecretFactory.create();

      expect(secret.consumerId).toContain("test-consumer-");
      expect(secret.consumerUsername).toContain("test-user-");
      expect(secret.jwtKey).toContain("test-key-");
      expect(secret.jwtSecret).toContain("test-secret-");
      expect(secret.algorithm).toBe("HS256");
    });

    it("should create ConsumerSecret with custom prefixes", () => {
      const secret = TestConsumerSecretFactory.create({
        consumerIdPrefix: "custom-consumer",
        usernamePrefix: "custom-user",
        keyPrefix: "custom-key",
        secretPrefix: "custom-secret",
      });

      expect(secret.consumerId).toContain("custom-consumer-");
      expect(secret.consumerUsername).toContain("custom-user-");
      expect(secret.jwtKey).toContain("custom-key-");
      expect(secret.jwtSecret).toContain("custom-secret-");
    });

    it("should create ConsumerSecret with HS384 algorithm", () => {
      const secret = TestConsumerSecretFactory.create({ algorithm: "HS384" });
      expect(secret.algorithm).toBe("HS384");
    });

    it("should create ConsumerSecret with HS512 algorithm", () => {
      const secret = TestConsumerSecretFactory.create({ algorithm: "HS512" });
      expect(secret.algorithm).toBe("HS512");
    });

    it("should create unique ConsumerSecrets on multiple calls", () => {
      const secret1 = TestConsumerSecretFactory.create();
      const secret2 = TestConsumerSecretFactory.create();

      expect(secret1.consumerId).not.toBe(secret2.consumerId);
      expect(secret1.jwtKey).not.toBe(secret2.jwtKey);
      expect(secret1.jwtSecret).not.toBe(secret2.jwtSecret);
    });
  });

  describe("createWithId", () => {
    it("should create ConsumerSecret with deterministic suffix", () => {
      const baseId = "test-123";
      const secret1 = TestConsumerSecretFactory.createWithId(baseId);
      const secret2 = TestConsumerSecretFactory.createWithId(baseId);

      expect(secret1.consumerId).toBe(secret2.consumerId);
      expect(secret1.jwtKey).toBe(secret2.jwtKey);
      expect(secret1.jwtSecret).toBe(secret2.jwtSecret);
    });

    it("should create different values for different baseIds", () => {
      const secret1 = TestConsumerSecretFactory.createWithId("test-1");
      const secret2 = TestConsumerSecretFactory.createWithId("test-2");

      expect(secret1.consumerId).not.toBe(secret2.consumerId);
      expect(secret1.jwtKey).not.toBe(secret2.jwtKey);
    });

    it("should include baseId in all fields", () => {
      const baseId = "my-test";
      const secret = TestConsumerSecretFactory.createWithId(baseId);

      expect(secret.consumerId).toContain(baseId);
      expect(secret.consumerUsername).toContain(baseId);
      expect(secret.jwtKey).toContain(baseId);
      expect(secret.jwtSecret).toContain(baseId);
    });

    it("should support custom algorithm", () => {
      const secret = TestConsumerSecretFactory.createWithId("test", { algorithm: "HS512" });
      expect(secret.algorithm).toBe("HS512");
    });

    it("should handle empty baseId", () => {
      const secret = TestConsumerSecretFactory.createWithId("");
      expect(secret.consumerId).toBeTruthy();
      expect(secret.jwtKey).toBeTruthy();
    });

    it("should handle baseId with special characters", () => {
      const secret = TestConsumerSecretFactory.createWithId("test-@#$-special");
      expect(secret.consumerId).toContain("test-@#$-special");
    });
  });

  describe("createBatch", () => {
    it("should create specified number of ConsumerSecrets", () => {
      const secrets = TestConsumerSecretFactory.createBatch(5);
      expect(secrets).toHaveLength(5);
    });

    it("should create zero ConsumerSecrets for count 0", () => {
      const secrets = TestConsumerSecretFactory.createBatch(0);
      expect(secrets).toHaveLength(0);
    });

    it("should create ConsumerSecrets with unique identifiers", () => {
      const secrets = TestConsumerSecretFactory.createBatch(3);
      const ids = secrets.map((s) => s.consumerId);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(3);
    });

    it("should use basePrefix in all ConsumerSecrets", () => {
      const secrets = TestConsumerSecretFactory.createBatch(3, { basePrefix: "custom-batch" });
      secrets.forEach((secret) => {
        expect(secret.consumerId).toContain("custom-batch");
      });
    });

    it("should use specified algorithm in all ConsumerSecrets", () => {
      const secrets = TestConsumerSecretFactory.createBatch(3, { algorithm: "HS384" });
      secrets.forEach((secret) => {
        expect(secret.algorithm).toBe("HS384");
      });
    });

    it("should create deterministic values for same basePrefix", () => {
      const batch1 = TestConsumerSecretFactory.createBatch(3, { basePrefix: "test-batch" });
      const batch2 = TestConsumerSecretFactory.createBatch(3, { basePrefix: "test-batch" });

      batch1.forEach((secret, index) => {
        expect(secret.consumerId).toBe(batch2[index].consumerId);
        expect(secret.jwtKey).toBe(batch2[index].jwtKey);
      });
    });

    it("should create large batches efficiently", () => {
      const secrets = TestConsumerSecretFactory.createBatch(100);
      expect(secrets).toHaveLength(100);
      expect(new Set(secrets.map((s) => s.consumerId)).size).toBe(100);
    });
  });

  describe("createForTTL", () => {
    it("should create ConsumerSecret with TTL prefix", () => {
      const secret = TestConsumerSecretFactory.createForTTL("test-case");
      expect(secret.consumerId).toContain("ttl-test-case");
      expect(secret.jwtKey).toContain("ttl-test-case");
    });

    it("should create deterministic values for same testName", () => {
      const secret1 = TestConsumerSecretFactory.createForTTL("cache-expire");
      const secret2 = TestConsumerSecretFactory.createForTTL("cache-expire");
      expect(secret1.consumerId).toBe(secret2.consumerId);
    });

    it("should support custom algorithm", () => {
      const secret = TestConsumerSecretFactory.createForTTL("test", { algorithm: "HS512" });
      expect(secret.algorithm).toBe("HS512");
    });
  });

  describe("createForPerformance", () => {
    it("should create ConsumerSecret with performance prefix", () => {
      const secret = TestConsumerSecretFactory.createForPerformance(1);
      expect(secret.consumerId).toContain("perf-1");
      expect(secret.jwtKey).toContain("perf-1");
    });

    it("should create different secrets for different indices", () => {
      const secret1 = TestConsumerSecretFactory.createForPerformance(1);
      const secret2 = TestConsumerSecretFactory.createForPerformance(2);
      expect(secret1.consumerId).not.toBe(secret2.consumerId);
    });

    it("should create deterministic values for same index", () => {
      const secret1 = TestConsumerSecretFactory.createForPerformance(5);
      const secret2 = TestConsumerSecretFactory.createForPerformance(5);
      expect(secret1.consumerId).toBe(secret2.consumerId);
    });
  });

  describe("createForConcurrency", () => {
    it("should create ConsumerSecret with concurrent prefix", () => {
      const secret = TestConsumerSecretFactory.createForConcurrency(1);
      expect(secret.consumerId).toContain("concurrent-1");
      expect(secret.jwtKey).toContain("concurrent-1");
    });

    it("should create different secrets for different indices", () => {
      const secret1 = TestConsumerSecretFactory.createForConcurrency(1);
      const secret2 = TestConsumerSecretFactory.createForConcurrency(2);
      expect(secret1.consumerId).not.toBe(secret2.consumerId);
    });
  });

  describe("createForCache", () => {
    it("should create ConsumerSecret with cache prefix", () => {
      const secret = TestConsumerSecretFactory.createForCache("hit");
      expect(secret.consumerId).toContain("cache-hit");
      expect(secret.jwtKey).toContain("cache-hit");
    });

    it("should create deterministic values for same scenario", () => {
      const secret1 = TestConsumerSecretFactory.createForCache("miss");
      const secret2 = TestConsumerSecretFactory.createForCache("miss");
      expect(secret1.consumerId).toBe(secret2.consumerId);
    });

    it("should support custom algorithm", () => {
      const secret = TestConsumerSecretFactory.createForCache("test", { algorithm: "HS384" });
      expect(secret.algorithm).toBe("HS384");
    });
  });

  describe("createNew", () => {
    it("should create ConsumerSecret with new format (id, key, secret, consumer.id)", () => {
      const secret = TestConsumerSecretFactory.createNew();

      expect(secret).toHaveProperty("id");
      expect(secret).toHaveProperty("key");
      expect(secret).toHaveProperty("secret");
      expect(secret).toHaveProperty("consumer");
      expect(secret.consumer).toHaveProperty("id");
    });

    it("should create unique secrets by default", () => {
      const secret1 = TestConsumerSecretFactory.createNew();
      const secret2 = TestConsumerSecretFactory.createNew();

      expect(secret1.id).not.toBe(secret2.id);
      expect(secret1.key).not.toBe(secret2.key);
    });

    it("should create deterministic values when deterministic=true", () => {
      const secret1 = TestConsumerSecretFactory.createNew({
        idPrefix: "jwt-cred",
        consumerIdPrefix: "consumer",
        deterministic: true,
      });
      const secret2 = TestConsumerSecretFactory.createNew({
        idPrefix: "jwt-cred",
        consumerIdPrefix: "consumer",
        deterministic: true,
      });

      expect(secret1.id).toBe(secret2.id);
      expect(secret1.key).toBe(secret2.key);
      expect(secret1.secret).toBe(secret2.secret);
      expect(secret1.consumer.id).toBe(secret2.consumer.id);
    });

    it("should use custom prefixes", () => {
      const secret = TestConsumerSecretFactory.createNew({
        idPrefix: "custom-jwt",
        keyPrefix: "custom-key",
        secretPrefix: "custom-secret",
        consumerIdPrefix: "custom-consumer",
      });

      expect(secret.id).toContain("custom-jwt-");
      expect(secret.key).toContain("custom-key-");
      expect(secret.secret).toContain("custom-secret-");
      expect(secret.consumer.id).toContain("custom-consumer-");
    });

    it("should create non-deterministic values when deterministic=false", () => {
      const secret1 = TestConsumerSecretFactory.createNew({ deterministic: false });
      const secret2 = TestConsumerSecretFactory.createNew({ deterministic: false });

      expect(secret1.id).not.toBe(secret2.id);
    });
  });

  describe("TestScenarios", () => {
    it("should have BASIC_CACHE scenario", () => {
      const secret = TestScenarios.BASIC_CACHE();
      expect(secret.consumerId).toContain("cache-basic");
    });

    it("should have CUSTOM_TTL scenario", () => {
      const secret = TestScenarios.CUSTOM_TTL();
      expect(secret.consumerId).toContain("ttl-custom");
    });

    it("should have EXPIRE_TEST scenario", () => {
      const secret = TestScenarios.EXPIRE_TEST();
      expect(secret.consumerId).toContain("ttl-expire");
    });

    it("should have DELETE_TEST scenario", () => {
      const secret = TestScenarios.DELETE_TEST();
      expect(secret.consumerId).toContain("cache-delete");
    });

    it("should have STATS_TEST scenario", () => {
      const secret = TestScenarios.STATS_TEST();
      expect(secret.consumerId).toContain("cache-stats");
    });

    it("should have LATENCY_TEST scenario", () => {
      const secret = TestScenarios.LATENCY_TEST();
      expect(secret.consumerId).toContain("cache-latency");
    });

    it("should have SPECIAL_CHARS scenario", () => {
      const secret = TestScenarios.SPECIAL_CHARS();
      expect(secret.consumerId).toContain("cache-special-chars");
    });

    it("should have ZERO_TTL scenario", () => {
      const secret = TestScenarios.ZERO_TTL();
      expect(secret.consumerId).toContain("ttl-zero");
    });

    it("should have NEGATIVE_TTL scenario", () => {
      const secret = TestScenarios.NEGATIVE_TTL();
      expect(secret.consumerId).toContain("ttl-negative");
    });

    it("should have PERFORMANCE scenario with index", () => {
      const secret = TestScenarios.PERFORMANCE(42);
      expect(secret.consumerId).toContain("perf-42");
    });

    it("should have CONCURRENCY scenario with index", () => {
      const secret = TestScenarios.CONCURRENCY(10);
      expect(secret.consumerId).toContain("concurrent-10");
    });

    it("should create deterministic values for scenarios", () => {
      const secret1 = TestScenarios.BASIC_CACHE();
      const secret2 = TestScenarios.BASIC_CACHE();
      expect(secret1.consumerId).toBe(secret2.consumerId);
    });
  });
});
