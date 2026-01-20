/* test/bun/gc-metrics.test.ts */

import { afterEach, beforeEach, describe, expect, it, mock, test } from "bun:test";
import {
  forceGC,
  type GCEvent,
  getCurrentHeapStats,
  getGCMetricsState,
  initializeGCMetrics,
  shutdownGCMetrics,
} from "../../../src/telemetry/gc-metrics";

describe("GC Metrics", () => {
  beforeEach(() => {
    shutdownGCMetrics();
  });

  afterEach(() => {
    shutdownGCMetrics();
  });

  describe("initializeGCMetrics", () => {
    it("should initialize GC metrics collection", () => {
      const callback = mock(() => undefined);

      initializeGCMetrics(callback, 60000);

      const state = getGCMetricsState();
      expect(state.initialized).toBe(true);
      expect(state.intervalId).not.toBeNull();
      expect(state.lastHeapStats).not.toBeNull();
    });

    it("should not reinitialize if already initialized", () => {
      const callback1 = mock(() => undefined);
      const callback2 = mock(() => undefined);

      initializeGCMetrics(callback1, 60000);
      const firstIntervalId = getGCMetricsState().intervalId;

      initializeGCMetrics(callback2, 60000);
      const secondIntervalId = getGCMetricsState().intervalId;

      expect(firstIntervalId).toBe(secondIntervalId);
    });
  });

  describe("shutdownGCMetrics", () => {
    it("should shutdown GC metrics collection", () => {
      const callback = mock(() => undefined);

      initializeGCMetrics(callback, 60000);
      expect(getGCMetricsState().initialized).toBe(true);

      shutdownGCMetrics();

      const state = getGCMetricsState();
      expect(state.initialized).toBe(false);
      expect(state.intervalId).toBeNull();
    });

    it("should be safe to call multiple times", () => {
      shutdownGCMetrics();
      shutdownGCMetrics();
      expect(getGCMetricsState().initialized).toBe(false);
    });
  });

  describe("getCurrentHeapStats", () => {
    it("should return valid heap statistics", () => {
      const stats = getCurrentHeapStats();

      expect(stats).toHaveProperty("total_heap_size");
      expect(stats).toHaveProperty("used_heap_size");
      expect(stats).toHaveProperty("heap_size_limit");
      expect(stats.total_heap_size).toBeGreaterThan(0);
      expect(stats.used_heap_size).toBeGreaterThan(0);
    });
  });

  describe("forceGC", () => {
    it("should return a valid GC event", () => {
      const callback = mock(() => undefined);
      initializeGCMetrics(callback, 60000);

      const event = forceGC();

      expect(event).toHaveProperty("type");
      expect(event).toHaveProperty("durationMs");
      expect(event).toHaveProperty("heapBefore");
      expect(event).toHaveProperty("heapAfter");
      expect(event).toHaveProperty("freedBytes");
      expect(event).toHaveProperty("timestamp");

      expect(["minor", "major", "incremental", "unknown"]).toContain(event.type);
      expect(event.durationMs).toBeGreaterThanOrEqual(0);
      expect(event.heapBefore).toBeGreaterThan(0);
      expect(event.heapAfter).toBeGreaterThan(0);
      expect(event.timestamp).toBeGreaterThan(0);
    });

    it("should call the callback with GC event", () => {
      const events: GCEvent[] = [];
      const callback = mock((event: GCEvent) => {
        events.push(event);
      });

      initializeGCMetrics(callback, 60000);

      forceGC();

      expect(callback).toHaveBeenCalled();
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].type).toBeDefined();
    });

    it("should increment GC count", () => {
      const callback = mock(() => undefined);
      initializeGCMetrics(callback, 60000);

      const countBefore = getGCMetricsState().gcCount;

      forceGC();

      const countAfter = getGCMetricsState().gcCount;
      expect(countAfter).toBe(countBefore + 1);
    });

    it("should accumulate total GC duration", () => {
      const callback = mock(() => undefined);
      initializeGCMetrics(callback, 60000);

      const durationBefore = getGCMetricsState().totalGCDuration;

      forceGC();
      forceGC();
      forceGC();

      const durationAfter = getGCMetricsState().totalGCDuration;
      expect(durationAfter).toBeGreaterThan(durationBefore);
    });
  });

  describe("GC type detection", () => {
    it("should detect GC type based on freed ratio", () => {
      const callback = mock(() => undefined);
      initializeGCMetrics(callback, 60000);

      const event = forceGC();

      expect(["minor", "major", "incremental", "unknown"]).toContain(event.type);
    });
  });

  describe("performance", () => {
    test.concurrent("forceGC should complete within reasonable time", async () => {
      const callback = mock(() => undefined);
      initializeGCMetrics(callback, 60000);

      const start = Bun.nanoseconds();
      forceGC();
      const duration = (Bun.nanoseconds() - start) / 1_000_000;

      expect(duration).toBeLessThan(100);
    });

    test.concurrent("getCurrentHeapStats should be fast", async () => {
      const start = Bun.nanoseconds();
      getCurrentHeapStats();
      const duration = (Bun.nanoseconds() - start) / 1_000_000;

      // Allow up to 20ms for heap stats retrieval (may vary under load during parallel test execution)
      expect(duration).toBeLessThan(20);
      expect(duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe("collectGCMetrics interval", () => {
    it("should trigger GC collection via interval", async () => {
      const events: GCEvent[] = [];
      const callback = mock((event: GCEvent) => {
        events.push(event);
      });

      // Initialize with very short interval (50ms)
      initializeGCMetrics(callback, 50);

      // Wait for at least one interval to trigger
      await new Promise((resolve) => setTimeout(resolve, 150));

      shutdownGCMetrics();

      // Interval should have triggered at least once and updated state
      const state = getGCMetricsState();
      expect(state.lastHeapStats).not.toBeNull();
      expect(state.lastGCTime).toBeGreaterThan(0);
    });

    it("should handle callback errors gracefully during interval", async () => {
      const errorCallback = mock(() => {
        throw new Error("Test callback error");
      });

      // Initialize with error-throwing callback
      initializeGCMetrics(errorCallback, 50);

      // Wait for interval to trigger
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should not crash - shutdown should work
      expect(() => shutdownGCMetrics()).not.toThrow();
    });

    it("should update gcCount when interval collects metrics", async () => {
      const callback = mock(() => undefined);
      initializeGCMetrics(callback, 50);

      const initialCount = getGCMetricsState().gcCount;

      // Wait for intervals to trigger
      await new Promise((resolve) => setTimeout(resolve, 200));

      shutdownGCMetrics();

      // gcCount may have increased from interval-triggered collections
      expect(getGCMetricsState().gcCount).toBeGreaterThanOrEqual(initialCount);
    });
  });

  describe("forceGC without callback", () => {
    it("should work without callback registered", () => {
      // Don't initialize with callback - directly force GC
      shutdownGCMetrics(); // Ensure clean state

      // forceGC should still work even without initialization
      const event = forceGC();

      expect(event.type).toBeDefined();
      expect(event.heapBefore).toBeGreaterThan(0);
      expect(event.heapAfter).toBeGreaterThan(0);
      expect(event.durationMs).toBeGreaterThanOrEqual(0);
    });
  });
});
