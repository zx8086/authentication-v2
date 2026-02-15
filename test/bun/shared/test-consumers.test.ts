/* test/bun/shared/test-consumers.test.ts */

import { describe, expect, it } from "bun:test";
import {
  ANONYMOUS_CONSUMER,
  generateJobSpecificAnonymousConsumer,
  generateJobSpecificConsumers,
  getAllTestConsumers,
  getJobSpecificConsumers,
  getTestConsumer,
  JOB_PREFIXES,
  TEST_CONSUMERS,
} from "../../shared/test-consumers";

describe("Test Consumers", () => {
  describe("TEST_CONSUMERS constant", () => {
    it("should have 5 test consumers", () => {
      expect(TEST_CONSUMERS).toHaveLength(5);
    });

    it("should have unique IDs for each consumer", () => {
      const ids = TEST_CONSUMERS.map((c) => c.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(TEST_CONSUMERS.length);
    });

    it("should have unique usernames for each consumer", () => {
      const usernames = TEST_CONSUMERS.map((c) => c.username);
      const uniqueUsernames = new Set(usernames);
      expect(uniqueUsernames.size).toBe(TEST_CONSUMERS.length);
    });

    it("should have all required properties", () => {
      TEST_CONSUMERS.forEach((consumer) => {
        expect(consumer).toHaveProperty("id");
        expect(consumer).toHaveProperty("username");
        expect(consumer).toHaveProperty("custom_id");
        expect(consumer).toHaveProperty("description");
        expect(typeof consumer.id).toBe("string");
        expect(typeof consumer.username).toBe("string");
        expect(typeof consumer.description).toBe("string");
      });
    });
  });

  describe("ANONYMOUS_CONSUMER constant", () => {
    it("should have anonymous username", () => {
      expect(ANONYMOUS_CONSUMER.username).toBe("anonymous");
    });

    it("should have all required properties", () => {
      expect(ANONYMOUS_CONSUMER).toHaveProperty("id");
      expect(ANONYMOUS_CONSUMER).toHaveProperty("username");
      expect(ANONYMOUS_CONSUMER).toHaveProperty("custom_id");
      expect(ANONYMOUS_CONSUMER).toHaveProperty("description");
    });

    it("should have consistent custom_id with username", () => {
      expect(ANONYMOUS_CONSUMER.custom_id).toBe("anonymous");
    });
  });

  describe("getTestConsumer", () => {
    it("should return first consumer when index is 0", () => {
      const consumer = getTestConsumer(0);
      expect(consumer).toEqual(TEST_CONSUMERS[0]);
    });

    it("should return last consumer when index is 4", () => {
      const consumer = getTestConsumer(4);
      expect(consumer).toEqual(TEST_CONSUMERS[4]);
    });

    it("should return middle consumer when index is 2", () => {
      const consumer = getTestConsumer(2);
      expect(consumer).toEqual(TEST_CONSUMERS[2]);
    });

    it("should throw error for negative index", () => {
      expect(() => getTestConsumer(-1)).toThrow("Invalid test consumer index: -1");
    });

    it("should throw error for index >= length", () => {
      expect(() => getTestConsumer(5)).toThrow("Invalid test consumer index: 5");
    });

    it("should throw error for large index", () => {
      expect(() => getTestConsumer(100)).toThrow("Invalid test consumer index: 100");
    });

    it("should add job prefix to all fields when jobPrefix provided", () => {
      const consumer = getTestConsumer(0, "test-job");
      expect(consumer.id).toContain("test-job-");
      expect(consumer.username).toContain("test-job-");
      expect(consumer.custom_id).toContain("test-job-");
      expect(consumer.description).toContain("(test-job job)");
    });

    it("should not modify original consumer when jobPrefix used", () => {
      const originalConsumer = { ...TEST_CONSUMERS[0] };
      getTestConsumer(0, "prefix");
      expect(TEST_CONSUMERS[0]).toEqual(originalConsumer);
    });

    it("should return base consumer when jobPrefix is empty string", () => {
      const consumer = getTestConsumer(0, "");
      expect(consumer).toEqual(TEST_CONSUMERS[0]);
    });
  });

  describe("getAllTestConsumers", () => {
    it("should return all 5 test consumers", () => {
      const consumers = getAllTestConsumers();
      expect(consumers).toHaveLength(5);
    });

    it("should return a copy, not the original array", () => {
      const consumers = getAllTestConsumers();
      expect(consumers).not.toBe(TEST_CONSUMERS);
    });

    it("should contain all consumers from TEST_CONSUMERS", () => {
      const consumers = getAllTestConsumers();
      expect(consumers).toEqual(TEST_CONSUMERS);
    });

    it("should not affect original array when modified", () => {
      const consumers = getAllTestConsumers();
      consumers.push({
        id: "new-id",
        username: "new-username",
        description: "new description",
      });
      expect(TEST_CONSUMERS).toHaveLength(5);
    });
  });

  describe("generateJobSpecificConsumers", () => {
    it("should generate 5 job-specific consumers", () => {
      const consumers = generateJobSpecificConsumers("job-1");
      expect(consumers).toHaveLength(5);
    });

    it("should prefix all IDs with job prefix", () => {
      const consumers = generateJobSpecificConsumers("job-1");
      consumers.forEach((consumer) => {
        expect(consumer.id).toContain("job-1-");
      });
    });

    it("should prefix all usernames with job prefix", () => {
      const consumers = generateJobSpecificConsumers("job-1");
      consumers.forEach((consumer) => {
        expect(consumer.username).toContain("job-1-");
      });
    });

    it("should prefix all custom_ids with job prefix", () => {
      const consumers = generateJobSpecificConsumers("job-1");
      consumers.forEach((consumer) => {
        expect(consumer.custom_id).toContain("job-1-");
      });
    });

    it("should add job suffix to descriptions", () => {
      const consumers = generateJobSpecificConsumers("job-1");
      consumers.forEach((consumer) => {
        expect(consumer.description).toContain("(job-1 job)");
      });
    });

    it("should not modify original TEST_CONSUMERS", () => {
      const originalConsumers = JSON.parse(JSON.stringify(TEST_CONSUMERS));
      generateJobSpecificConsumers("job-1");
      expect(TEST_CONSUMERS).toEqual(originalConsumers);
    });
  });

  describe("generateJobSpecificAnonymousConsumer", () => {
    it("should prefix ID with job prefix", () => {
      const consumer = generateJobSpecificAnonymousConsumer("job-1");
      expect(consumer.id).toContain("job-1-");
    });

    it("should prefix username with job prefix", () => {
      const consumer = generateJobSpecificAnonymousConsumer("job-1");
      expect(consumer.username).toContain("job-1-");
    });

    it("should prefix custom_id with job prefix", () => {
      const consumer = generateJobSpecificAnonymousConsumer("job-1");
      expect(consumer.custom_id).toContain("job-1-");
    });

    it("should add job suffix to description", () => {
      const consumer = generateJobSpecificAnonymousConsumer("job-1");
      expect(consumer.description).toContain("(job-1 job)");
    });

    it("should include original anonymous consumer ID", () => {
      const consumer = generateJobSpecificAnonymousConsumer("job-1");
      expect(consumer.id).toContain(ANONYMOUS_CONSUMER.id);
    });

    it("should not modify original ANONYMOUS_CONSUMER", () => {
      const originalAnonymous = { ...ANONYMOUS_CONSUMER };
      generateJobSpecificAnonymousConsumer("job-1");
      expect(ANONYMOUS_CONSUMER).toEqual(originalAnonymous);
    });
  });

  describe("getJobSpecificConsumers", () => {
    it("should return object with consumers and anonymous properties", () => {
      const result = getJobSpecificConsumers("job-1");
      expect(result).toHaveProperty("consumers");
      expect(result).toHaveProperty("anonymous");
    });

    it("should return 5 job-specific consumers", () => {
      const result = getJobSpecificConsumers("job-1");
      expect(result.consumers).toHaveLength(5);
    });

    it("should return job-specific anonymous consumer", () => {
      const result = getJobSpecificConsumers("job-1");
      expect(result.anonymous.username).toContain("job-1-");
    });

    it("should prefix all consumer IDs", () => {
      const result = getJobSpecificConsumers("job-1");
      result.consumers.forEach((consumer) => {
        expect(consumer.id).toContain("job-1-");
      });
    });

    it("should prefix anonymous consumer ID", () => {
      const result = getJobSpecificConsumers("job-1");
      expect(result.anonymous.id).toContain("job-1-");
    });
  });

  describe("JOB_PREFIXES constant", () => {
    it("should have UNIT_TESTS prefix", () => {
      expect(JOB_PREFIXES.UNIT_TESTS).toBe("unit");
    });

    it("should have E2E_TESTS prefix", () => {
      expect(JOB_PREFIXES.E2E_TESTS).toBe("e2e");
    });

    it("should have PERFORMANCE_TESTS prefix", () => {
      expect(JOB_PREFIXES.PERFORMANCE_TESTS).toBe("perf");
    });

    it("should have LOCAL_DEV prefix", () => {
      expect(JOB_PREFIXES.LOCAL_DEV).toBe("local");
    });

    it("should have exactly 4 prefixes", () => {
      const keys = Object.keys(JOB_PREFIXES);
      expect(keys).toHaveLength(4);
    });
  });

  describe("Integration scenarios", () => {
    it("should generate unique consumers for different jobs", () => {
      const job1 = generateJobSpecificConsumers("job-1");
      const job2 = generateJobSpecificConsumers("job-2");

      job1.forEach((consumer1, index) => {
        const consumer2 = job2[index];
        expect(consumer1.id).not.toBe(consumer2.id);
        expect(consumer1.username).not.toBe(consumer2.username);
      });
    });

    it("should support all JOB_PREFIXES values", () => {
      Object.values(JOB_PREFIXES).forEach((prefix) => {
        const consumers = generateJobSpecificConsumers(prefix);
        expect(consumers).toHaveLength(5);
        consumers.forEach((consumer) => {
          expect(consumer.id).toContain(`${prefix}-`);
        });
      });
    });
  });
});
