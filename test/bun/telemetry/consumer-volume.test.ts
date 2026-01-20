/* test/bun/telemetry/consumer-volume.test.ts */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import {
  getConsumerCountByVolume,
  getConsumerVolumeStats,
  getVolumeBucket,
  incrementConsumerRequest,
  shutdownConsumerVolume,
} from "../../../src/telemetry/consumer-volume";

describe("Consumer Volume Tracking", () => {
  beforeEach(() => {
    // Clean state before each test
    shutdownConsumerVolume();
  });

  afterEach(() => {
    // Clean up after each test
    shutdownConsumerVolume();
  });

  describe("incrementConsumerRequest", () => {
    it("should increment request count for a consumer", () => {
      const consumerId = "test-consumer-1";
      incrementConsumerRequest(consumerId);

      const bucket = getVolumeBucket(consumerId);
      expect(bucket).toBe("low");
    });

    it("should handle multiple increments for same consumer", () => {
      const consumerId = "test-consumer-2";

      for (let i = 0; i < 50; i++) {
        incrementConsumerRequest(consumerId);
      }

      const bucket = getVolumeBucket(consumerId);
      expect(bucket).toBe("low");
    });

    it("should not increment when consumerId is empty string", () => {
      const statsBefore = getConsumerVolumeStats();

      incrementConsumerRequest("");

      const statsAfter = getConsumerVolumeStats();
      expect(statsAfter.total).toBe(statsBefore.total);
    });

    it("should track multiple different consumers", () => {
      incrementConsumerRequest("consumer-a");
      incrementConsumerRequest("consumer-b");
      incrementConsumerRequest("consumer-c");

      const stats = getConsumerVolumeStats();
      expect(stats.total).toBe(3);
    });
  });

  describe("getVolumeBucket", () => {
    it("should return 'low' for consumers with < 100 requests per hour", () => {
      const consumerId = "low-volume-consumer";

      for (let i = 0; i < 99; i++) {
        incrementConsumerRequest(consumerId);
      }

      expect(getVolumeBucket(consumerId)).toBe("low");
    });

    it("should return 'medium' for consumers with 100-5000 requests per hour", () => {
      const consumerId = "medium-volume-consumer";

      for (let i = 0; i < 150; i++) {
        incrementConsumerRequest(consumerId);
      }

      expect(getVolumeBucket(consumerId)).toBe("medium");
    });

    it("should return 'medium' for exactly 101 requests", () => {
      const consumerId = "medium-boundary-consumer";

      for (let i = 0; i < 101; i++) {
        incrementConsumerRequest(consumerId);
      }

      expect(getVolumeBucket(consumerId)).toBe("medium");
    });

    it("should return 'high' for consumers with > 5000 requests per hour", () => {
      const consumerId = "high-volume-consumer";

      for (let i = 0; i < 5001; i++) {
        incrementConsumerRequest(consumerId);
      }

      expect(getVolumeBucket(consumerId)).toBe("high");
    });

    it("should return 'high' for exactly 5001 requests", () => {
      const consumerId = "high-boundary-consumer";

      for (let i = 0; i < 5001; i++) {
        incrementConsumerRequest(consumerId);
      }

      expect(getVolumeBucket(consumerId)).toBe("high");
    });

    it("should return 'low' for empty consumerId", () => {
      expect(getVolumeBucket("")).toBe("low");
    });

    it("should return 'low' for unknown consumer", () => {
      expect(getVolumeBucket("unknown-consumer-id")).toBe("low");
    });
  });

  describe("getConsumerCountByVolume", () => {
    it("should count low volume consumers correctly", () => {
      incrementConsumerRequest("low-1");
      incrementConsumerRequest("low-1");
      incrementConsumerRequest("low-2");
      incrementConsumerRequest("low-2");

      const lowCount = getConsumerCountByVolume("low");
      expect(lowCount).toBe(2);
    });

    it("should count medium volume consumers correctly", () => {
      const medium1 = "medium-consumer-1";
      const medium2 = "medium-consumer-2";

      for (let i = 0; i < 200; i++) {
        incrementConsumerRequest(medium1);
      }
      for (let i = 0; i < 300; i++) {
        incrementConsumerRequest(medium2);
      }

      const mediumCount = getConsumerCountByVolume("medium");
      expect(mediumCount).toBe(2);
    });

    it("should count high volume consumers correctly", () => {
      const high1 = "high-consumer-1";

      for (let i = 0; i < 6000; i++) {
        incrementConsumerRequest(high1);
      }

      const highCount = getConsumerCountByVolume("high");
      expect(highCount).toBe(1);
    });

    it("should return 0 when no consumers in that bucket", () => {
      incrementConsumerRequest("low-only");

      expect(getConsumerCountByVolume("medium")).toBe(0);
      expect(getConsumerCountByVolume("high")).toBe(0);
    });

    it("should classify consumers into different buckets", () => {
      // Low volume
      for (let i = 0; i < 50; i++) {
        incrementConsumerRequest("low-consumer");
      }

      // Medium volume
      for (let i = 0; i < 500; i++) {
        incrementConsumerRequest("medium-consumer");
      }

      // High volume
      for (let i = 0; i < 6000; i++) {
        incrementConsumerRequest("high-consumer");
      }

      expect(getConsumerCountByVolume("low")).toBe(1);
      expect(getConsumerCountByVolume("medium")).toBe(1);
      expect(getConsumerCountByVolume("high")).toBe(1);
    });
  });

  describe("getConsumerVolumeStats", () => {
    it("should return stats with all volume buckets", () => {
      const stats = getConsumerVolumeStats();

      expect(stats).toHaveProperty("high");
      expect(stats).toHaveProperty("medium");
      expect(stats).toHaveProperty("low");
      expect(stats).toHaveProperty("total");
      expect(typeof stats.high).toBe("number");
      expect(typeof stats.medium).toBe("number");
      expect(typeof stats.low).toBe("number");
      expect(typeof stats.total).toBe("number");
    });

    it("should return zero stats when no consumers", () => {
      const stats = getConsumerVolumeStats();

      expect(stats.high).toBeGreaterThanOrEqual(0);
      expect(stats.medium).toBeGreaterThanOrEqual(0);
      expect(stats.low).toBeGreaterThanOrEqual(0);
      expect(stats.total).toBeGreaterThanOrEqual(0);
    });

    it("should return correct stats with mixed volume consumers", () => {
      // 2 low volume
      incrementConsumerRequest("low-1");
      incrementConsumerRequest("low-2");

      // 1 medium volume
      for (let i = 0; i < 200; i++) {
        incrementConsumerRequest("medium-1");
      }

      // 1 high volume
      for (let i = 0; i < 6000; i++) {
        incrementConsumerRequest("high-1");
      }

      const stats = getConsumerVolumeStats();
      expect(stats.low).toBe(2);
      expect(stats.medium).toBe(1);
      expect(stats.high).toBe(1);
      expect(stats.total).toBe(4);
    });

    it("should have total equal to sum of buckets", () => {
      incrementConsumerRequest("consumer-1");
      incrementConsumerRequest("consumer-2");

      const stats = getConsumerVolumeStats();
      expect(stats.total).toBe(stats.low + stats.medium + stats.high);
    });
  });

  describe("shutdownConsumerVolume", () => {
    it("should clear all consumer request counts", () => {
      incrementConsumerRequest("test-1");
      incrementConsumerRequest("test-2");
      incrementConsumerRequest("test-3");

      const statsBefore = getConsumerVolumeStats();
      expect(statsBefore.total).toBeGreaterThan(0);

      shutdownConsumerVolume();

      const statsAfter = getConsumerVolumeStats();
      expect(statsAfter.total).toBe(0);
      expect(statsAfter.low).toBe(0);
      expect(statsAfter.medium).toBe(0);
      expect(statsAfter.high).toBe(0);
    });

    it("should not throw when called multiple times", () => {
      incrementConsumerRequest("test");

      expect(() => shutdownConsumerVolume()).not.toThrow();
      expect(() => shutdownConsumerVolume()).not.toThrow();
      expect(() => shutdownConsumerVolume()).not.toThrow();
    });

    it("should be safe to call before any tracking", () => {
      expect(() => shutdownConsumerVolume()).not.toThrow();
    });
  });

  describe("Edge Cases", () => {
    it("should handle boundary at exactly 100 requests (medium threshold)", () => {
      const consumerId = "boundary-100";

      for (let i = 0; i < 100; i++) {
        incrementConsumerRequest(consumerId);
      }

      expect(getVolumeBucket(consumerId)).toBe("low");

      incrementConsumerRequest(consumerId);
      expect(getVolumeBucket(consumerId)).toBe("medium");
    });

    it("should handle boundary at exactly 5000 requests (high threshold)", () => {
      const consumerId = "boundary-5000";

      for (let i = 0; i < 5000; i++) {
        incrementConsumerRequest(consumerId);
      }

      expect(getVolumeBucket(consumerId)).toBe("medium");

      incrementConsumerRequest(consumerId);
      expect(getVolumeBucket(consumerId)).toBe("high");
    });

    it("should handle very high request counts", () => {
      const consumerId = "very-high-volume";

      for (let i = 0; i < 100000; i++) {
        incrementConsumerRequest(consumerId);
      }

      expect(getVolumeBucket(consumerId)).toBe("high");

      const stats = getConsumerVolumeStats();
      expect(stats.high).toBe(1);
    });

    it("should handle consumers with same ID tracked multiple times", () => {
      const consumerId = "repeated-consumer";

      incrementConsumerRequest(consumerId);
      incrementConsumerRequest(consumerId);
      incrementConsumerRequest(consumerId);

      const stats = getConsumerVolumeStats();
      expect(stats.total).toBe(1);
    });
  });

  describe("Volume Classification Accuracy", () => {
    it("should classify at 99 requests as low", () => {
      const consumerId = "test-99";
      for (let i = 0; i < 99; i++) {
        incrementConsumerRequest(consumerId);
      }
      expect(getVolumeBucket(consumerId)).toBe("low");
    });

    it("should classify at 4999 requests as medium", () => {
      const consumerId = "test-4999";
      for (let i = 0; i < 4999; i++) {
        incrementConsumerRequest(consumerId);
      }
      expect(getVolumeBucket(consumerId)).toBe("medium");
    });

    it("should classify at 5000 requests as medium", () => {
      const consumerId = "test-5000";
      for (let i = 0; i < 5000; i++) {
        incrementConsumerRequest(consumerId);
      }
      expect(getVolumeBucket(consumerId)).toBe("medium");
    });
  });
});
