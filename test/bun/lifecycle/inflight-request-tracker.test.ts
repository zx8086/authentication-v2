/* test/bun/lifecycle/inflight-request-tracker.test.ts */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import {
  InflightRequestTracker,
  type RequestMetadata,
} from "../../../src/lifecycle/inflight-request-tracker";

describe("InflightRequestTracker", () => {
  let tracker: InflightRequestTracker;

  beforeEach(() => {
    tracker = new InflightRequestTracker();
  });

  afterEach(() => {
    tracker.reset();
  });

  describe("Request Tracking", () => {
    it("should track a started request", () => {
      const metadata: RequestMetadata = {
        endpoint: "/api/tokens",
        startTime: Date.now(),
        method: "POST",
        requestId: "req-123",
      };

      tracker.start("req-123", metadata);

      expect(tracker.getActiveCount()).toBe(1);
    });

    it("should track multiple requests", () => {
      tracker.start("req-1", { endpoint: "/api/tokens", startTime: Date.now() });
      tracker.start("req-2", { endpoint: "/api/health", startTime: Date.now() });
      tracker.start("req-3", { endpoint: "/api/metrics", startTime: Date.now() });

      expect(tracker.getActiveCount()).toBe(3);
    });

    it("should complete a tracked request", () => {
      tracker.start("req-123", { endpoint: "/api/tokens", startTime: Date.now() });
      expect(tracker.getActiveCount()).toBe(1);

      tracker.complete("req-123");
      expect(tracker.getActiveCount()).toBe(0);
    });

    it("should handle completing non-existent request gracefully", () => {
      tracker.complete("non-existent");
      expect(tracker.getActiveCount()).toBe(0);
    });

    it("should fail a tracked request", () => {
      tracker.start("req-123", { endpoint: "/api/tokens", startTime: Date.now() });
      expect(tracker.getActiveCount()).toBe(1);

      tracker.fail("req-123", new Error("Request failed"));
      expect(tracker.getActiveCount()).toBe(0);
    });

    it("should handle failing non-existent request gracefully", () => {
      tracker.fail("non-existent", new Error("Test error"));
      expect(tracker.getActiveCount()).toBe(0);
    });
  });

  describe("getActiveRequests", () => {
    it("should return empty map when no requests", () => {
      const active = tracker.getActiveRequests();
      expect(active.size).toBe(0);
    });

    it("should return copy of active requests", () => {
      tracker.start("req-1", { endpoint: "/api/tokens", startTime: Date.now() });
      tracker.start("req-2", { endpoint: "/api/health", startTime: Date.now() });

      const active = tracker.getActiveRequests();
      expect(active.size).toBe(2);
      expect(active.has("req-1")).toBe(true);
      expect(active.has("req-2")).toBe(true);
    });

    it("should return independent copy (not reference)", () => {
      tracker.start("req-1", { endpoint: "/api/tokens", startTime: Date.now() });

      const active = tracker.getActiveRequests();
      active.delete("req-1");

      // Original tracker should still have the request
      expect(tracker.getActiveCount()).toBe(1);
    });
  });

  describe("getStats", () => {
    it("should return correct initial stats", () => {
      const stats = tracker.getStats();

      expect(stats.activeCount).toBe(0);
      expect(stats.totalCount).toBe(0);
      expect(stats.completedCount).toBe(0);
      expect(stats.failedCount).toBe(0);
      expect(stats.oldestRequestAge).toBeNull();
    });

    it("should track total request count", () => {
      tracker.start("req-1", { endpoint: "/test", startTime: Date.now() });
      tracker.start("req-2", { endpoint: "/test", startTime: Date.now() });
      tracker.complete("req-1");

      const stats = tracker.getStats();
      expect(stats.totalCount).toBe(2);
      expect(stats.activeCount).toBe(1);
    });

    it("should track completed count", () => {
      tracker.start("req-1", { endpoint: "/test", startTime: Date.now() });
      tracker.start("req-2", { endpoint: "/test", startTime: Date.now() });
      tracker.complete("req-1");
      tracker.complete("req-2");

      const stats = tracker.getStats();
      expect(stats.completedCount).toBe(2);
    });

    it("should track failed count", () => {
      tracker.start("req-1", { endpoint: "/test", startTime: Date.now() });
      tracker.start("req-2", { endpoint: "/test", startTime: Date.now() });
      tracker.fail("req-1", new Error("Failed"));
      tracker.complete("req-2");

      const stats = tracker.getStats();
      expect(stats.failedCount).toBe(1);
      expect(stats.completedCount).toBe(1);
    });

    it("should calculate oldest request age", async () => {
      tracker.start("req-1", { endpoint: "/test", startTime: Date.now() - 100 });
      tracker.start("req-2", { endpoint: "/test", startTime: Date.now() - 50 });

      const stats = tracker.getStats();
      expect(stats.oldestRequestAge).toBeGreaterThanOrEqual(100);
    });

    it("should return null for oldest age when no active requests", () => {
      tracker.start("req-1", { endpoint: "/test", startTime: Date.now() });
      tracker.complete("req-1");

      const stats = tracker.getStats();
      expect(stats.oldestRequestAge).toBeNull();
    });
  });

  describe("waitForCompletion", () => {
    it("should return immediately when no active requests", async () => {
      const startTime = Date.now();
      const result = await tracker.waitForCompletion({ timeoutMs: 1000 });
      const duration = Date.now() - startTime;

      expect(result.drained).toBe(true);
      expect(result.completedCount).toBe(0);
      expect(result.remaining).toBe(0);
      expect(result.durationMs).toBe(0);
      expect(duration).toBeLessThan(100); // Should be nearly instant
    });

    it("should wait for requests to complete", async () => {
      tracker.start("req-1", { endpoint: "/test", startTime: Date.now() });

      // Complete request after 50ms
      setTimeout(() => tracker.complete("req-1"), 50);

      const result = await tracker.waitForCompletion({ timeoutMs: 1000 });

      expect(result.drained).toBe(true);
      expect(result.completedCount).toBe(1);
      expect(result.remaining).toBe(0);
      expect(result.durationMs).toBeGreaterThanOrEqual(50);
    });

    it("should timeout when requests do not complete", async () => {
      tracker.start("req-1", { endpoint: "/test", startTime: Date.now() });

      const result = await tracker.waitForCompletion({
        timeoutMs: 100,
        checkIntervalMs: 10,
      });

      expect(result.drained).toBe(false);
      expect(result.remaining).toBe(1);
      expect(result.durationMs).toBeGreaterThanOrEqual(100);
    });

    it("should use default config when none provided", async () => {
      tracker.start("req-1", { endpoint: "/test", startTime: Date.now() });

      // Complete request after short delay
      setTimeout(() => tracker.complete("req-1"), 20);

      const result = await tracker.waitForCompletion();

      expect(result.drained).toBe(true);
    });

    it("should handle multiple requests completing during drain", async () => {
      tracker.start("req-1", { endpoint: "/test", startTime: Date.now() });
      tracker.start("req-2", { endpoint: "/test", startTime: Date.now() });
      tracker.start("req-3", { endpoint: "/test", startTime: Date.now() });

      // Complete requests at different times
      setTimeout(() => tracker.complete("req-1"), 20);
      setTimeout(() => tracker.complete("req-2"), 40);
      setTimeout(() => tracker.complete("req-3"), 60);

      const result = await tracker.waitForCompletion({ timeoutMs: 500 });

      expect(result.drained).toBe(true);
      expect(result.completedCount).toBe(3);
      expect(result.remaining).toBe(0);
    });

    it("should report partial completion on timeout", async () => {
      tracker.start("req-1", { endpoint: "/test", startTime: Date.now() });
      tracker.start("req-2", { endpoint: "/test", startTime: Date.now() });

      // Only complete one request
      setTimeout(() => tracker.complete("req-1"), 20);

      const result = await tracker.waitForCompletion({
        timeoutMs: 100,
        checkIntervalMs: 10,
      });

      expect(result.drained).toBe(false);
      expect(result.completedCount).toBe(1);
      expect(result.remaining).toBe(1);
    });
  });

  describe("Concurrent Operations", () => {
    it("should handle concurrent start and complete operations", async () => {
      const operations: Promise<void>[] = [];

      for (let i = 0; i < 100; i++) {
        const requestId = `req-${i}`;
        operations.push(
          (async () => {
            tracker.start(requestId, { endpoint: "/test", startTime: Date.now() });
            await new Promise((resolve) => setTimeout(resolve, Math.random() * 10));
            tracker.complete(requestId);
          })()
        );
      }

      await Promise.all(operations);

      const stats = tracker.getStats();
      expect(stats.activeCount).toBe(0);
      expect(stats.totalCount).toBe(100);
      expect(stats.completedCount).toBe(100);
    });

    it("should handle concurrent failed operations", async () => {
      const operations: Promise<void>[] = [];

      for (let i = 0; i < 50; i++) {
        const requestId = `req-${i}`;
        operations.push(
          (async () => {
            tracker.start(requestId, { endpoint: "/test", startTime: Date.now() });
            await new Promise((resolve) => setTimeout(resolve, Math.random() * 5));
            if (i % 2 === 0) {
              tracker.complete(requestId);
            } else {
              tracker.fail(requestId, new Error("Test failure"));
            }
          })()
        );
      }

      await Promise.all(operations);

      const stats = tracker.getStats();
      expect(stats.activeCount).toBe(0);
      expect(stats.totalCount).toBe(50);
      expect(stats.completedCount).toBe(25);
      expect(stats.failedCount).toBe(25);
    });
  });

  describe("Metadata Handling", () => {
    it("should store request ID in metadata", () => {
      tracker.start("req-123", {
        endpoint: "/api/tokens",
        startTime: Date.now(),
        method: "POST",
      });

      const active = tracker.getActiveRequests();
      const metadata = active.get("req-123");

      expect(metadata?.requestId).toBe("req-123");
    });

    it("should preserve all metadata fields", () => {
      const originalMetadata: RequestMetadata = {
        endpoint: "/api/tokens",
        startTime: Date.now(),
        method: "POST",
        requestId: "original-id",
      };

      tracker.start("req-123", originalMetadata);

      const active = tracker.getActiveRequests();
      const storedMetadata = active.get("req-123");

      expect(storedMetadata?.endpoint).toBe("/api/tokens");
      expect(storedMetadata?.method).toBe("POST");
      expect(storedMetadata?.startTime).toBe(originalMetadata.startTime);
      expect(storedMetadata?.requestId).toBe("req-123"); // Overwritten with the key
    });
  });

  describe("reset", () => {
    it("should clear all active requests", () => {
      tracker.start("req-1", { endpoint: "/test", startTime: Date.now() });
      tracker.start("req-2", { endpoint: "/test", startTime: Date.now() });

      tracker.reset();

      expect(tracker.getActiveCount()).toBe(0);
    });

    it("should reset all counters", () => {
      tracker.start("req-1", { endpoint: "/test", startTime: Date.now() });
      tracker.complete("req-1");
      tracker.start("req-2", { endpoint: "/test", startTime: Date.now() });
      tracker.fail("req-2", new Error("Failed"));

      tracker.reset();

      const stats = tracker.getStats();
      expect(stats.totalCount).toBe(0);
      expect(stats.completedCount).toBe(0);
      expect(stats.failedCount).toBe(0);
    });
  });

  describe("Edge Cases", () => {
    it("should handle duplicate request IDs", () => {
      tracker.start("req-1", { endpoint: "/first", startTime: Date.now() });
      tracker.start("req-1", { endpoint: "/second", startTime: Date.now() });

      // Second start should overwrite the first
      const active = tracker.getActiveRequests();
      expect(active.get("req-1")?.endpoint).toBe("/second");
      expect(tracker.getActiveCount()).toBe(1);
    });

    it("should handle very long-running requests", () => {
      const oldStartTime = Date.now() - 60000; // 60 seconds ago
      tracker.start("req-old", { endpoint: "/slow", startTime: oldStartTime });

      const stats = tracker.getStats();
      expect(stats.oldestRequestAge).toBeGreaterThanOrEqual(60000);
    });

    it("should handle empty endpoint", () => {
      tracker.start("req-1", { endpoint: "", startTime: Date.now() });

      const active = tracker.getActiveRequests();
      expect(active.get("req-1")?.endpoint).toBe("");
    });

    it("should handle undefined method", () => {
      tracker.start("req-1", { endpoint: "/test", startTime: Date.now() });

      const active = tracker.getActiveRequests();
      expect(active.get("req-1")?.method).toBeUndefined();
    });
  });
});
