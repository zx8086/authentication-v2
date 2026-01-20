/* test/bun/redis-instrumentation-utils.test.ts */

import { describe, expect, it } from "bun:test";
import {
  createRedisSpan,
  recordRedisCacheMetrics,
  recordRedisError,
  recordRedisSuccess,
} from "../../../src/telemetry/redis-instrumentation";

describe("Redis Instrumentation Utility Functions", () => {
  describe("createRedisSpan", () => {
    it("should create a span for redis GET operation", () => {
      const span = createRedisSpan({
        operation: "GET",
        key: "test:key:123",
      });

      expect(span).toBeDefined();
    });

    it("should create a span for redis SET operation", () => {
      const span = createRedisSpan({
        operation: "SET",
        key: "cache:user:456",
      });

      expect(span).toBeDefined();
    });

    it("should create a span for redis DEL operation", () => {
      const span = createRedisSpan({
        operation: "DEL",
        key: "session:789",
      });

      expect(span).toBeDefined();
    });
  });

  describe("recordRedisSuccess", () => {
    it("should record success for a redis operation with result", () => {
      const span = createRedisSpan({
        operation: "GET",
        key: "success:key",
      });

      const result = { value: "cached data", ttl: 300 };
      recordRedisSuccess(span, result);
    });

    it("should record success for a redis operation without result", () => {
      const span = createRedisSpan({
        operation: "SET",
        key: "set:key",
      });

      recordRedisSuccess(span);
    });

    it("should record success for multiple operations", () => {
      const span1 = createRedisSpan({ operation: "HGET", key: "hash:1" });
      const span2 = createRedisSpan({ operation: "LPUSH", key: "list:1" });

      recordRedisSuccess(span1, "hash_value");
      recordRedisSuccess(span2, 5);
    });
  });

  describe("recordRedisError", () => {
    it("should record error for a failed redis operation", () => {
      const span = createRedisSpan({
        operation: "GET",
        key: "error:key",
      });

      const error = new Error("Connection timeout");
      recordRedisError(span, error);
    });

    it("should record error with specific error types", () => {
      const span = createRedisSpan({
        operation: "SET",
        key: "fail:key",
      });

      const error = new Error("READONLY You can't write against a read only replica");
      recordRedisError(span, error);
    });

    it("should record multiple errors", () => {
      const span1 = createRedisSpan({ operation: "DEL", key: "key1" });
      const span2 = createRedisSpan({ operation: "EXPIRE", key: "key2" });

      recordRedisError(span1, new Error("Network error"));
      recordRedisError(span2, new Error("Invalid key format"));
    });
  });

  describe("recordRedisCacheMetrics", () => {
    it("should record cache hit metrics with low latency", () => {
      const span = createRedisSpan({
        operation: "GET",
        key: "cache:hit:key",
      });

      recordRedisCacheMetrics(span, true, 1.5);
    });

    it("should record cache miss metrics with higher latency", () => {
      const span = createRedisSpan({
        operation: "GET",
        key: "cache:miss:key",
      });

      recordRedisCacheMetrics(span, false, 45.7);
    });

    it("should record metrics for various latencies", () => {
      const span1 = createRedisSpan({ operation: "GET", key: "fast" });
      const span2 = createRedisSpan({ operation: "GET", key: "medium" });
      const span3 = createRedisSpan({ operation: "GET", key: "slow" });

      recordRedisCacheMetrics(span1, true, 0.5);
      recordRedisCacheMetrics(span2, true, 25.3);
      recordRedisCacheMetrics(span3, false, 234.8);
    });

    it("should handle both cache hits and misses", () => {
      for (let i = 0; i < 5; i++) {
        const span = createRedisSpan({
          operation: "GET",
          key: `metric:key:${i}`,
        });

        const isHit = i % 2 === 0;
        const latency = 5 + i * 10;
        recordRedisCacheMetrics(span, isHit, latency);
      }
    });
  });

  describe("Combined Operations", () => {
    it("should handle complete successful operation flow", () => {
      const span = createRedisSpan({
        operation: "GET",
        key: "combined:success",
      });

      const result = { data: "value" };
      recordRedisSuccess(span, result);
      recordRedisCacheMetrics(span, true, 12.5);
    });

    it("should handle complete failed operation flow", () => {
      const span = createRedisSpan({
        operation: "SET",
        key: "combined:failure",
      });

      const error = new Error("Operation failed");
      recordRedisError(span, error);
      recordRedisCacheMetrics(span, false, 567.8);
    });

    it("should handle multiple operations in sequence", () => {
      const operations = [
        { op: "GET", key: "seq:1", success: true, latency: 5.2 },
        { op: "SET", key: "seq:2", success: true, latency: 8.7 },
        { op: "DEL", key: "seq:3", success: false, latency: 234.1 },
        { op: "HGET", key: "seq:4", success: true, latency: 12.3 },
      ];

      for (const { op, key, success, latency } of operations) {
        const span = createRedisSpan({ operation: op, key });

        if (success) {
          recordRedisSuccess(span, `result for ${key}`);
        } else {
          recordRedisError(span, new Error(`Failed ${op}`));
        }

        recordRedisCacheMetrics(span, success, latency);
      }
    });
  });
});
