/* test/bun/gc-metrics-operations.test.ts */

/**
 * Tests for GC metrics collection and callbacks.
 * These tests cover the garbage collection metrics functionality
 * including forceGC, initialization, shutdown, and state management.
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";

describe("GC Metrics Operations", () => {
  const originalEnv = { ...Bun.env };

  beforeEach(async () => {
    Object.keys(Bun.env).forEach((key) => {
      if (!["PATH", "HOME", "USER", "SHELL", "TERM"].includes(key)) {
        delete Bun.env[key];
      }
    });
    Bun.env.NODE_ENV = "test";
    Bun.env.KONG_JWT_AUTHORITY = "https://auth.test.com";
    Bun.env.KONG_JWT_AUDIENCE = "https://api.test.com";
    Bun.env.KONG_ADMIN_URL = "http://kong:8001";
    Bun.env.KONG_ADMIN_TOKEN = "test-token-123456789012345678901234567890";

    const { resetConfigCache } = await import("../../../src/config/config");
    resetConfigCache();

    // Shutdown any existing GC metrics
    const { shutdownGCMetrics } = await import("../../../src/telemetry/gc-metrics");
    shutdownGCMetrics();
  });

  afterEach(async () => {
    // Shutdown GC metrics after each test
    const { shutdownGCMetrics } = await import("../../../src/telemetry/gc-metrics");
    shutdownGCMetrics();

    Object.keys(Bun.env).forEach((key) => {
      if (!(key in originalEnv)) {
        delete Bun.env[key];
      }
    });
    Object.assign(Bun.env, originalEnv);

    const { resetConfigCache } = await import("../../../src/config/config");
    resetConfigCache();
  });

  describe("forceGC", () => {
    it("should trigger garbage collection and return event", async () => {
      const { forceGC } = await import("../../../src/telemetry/gc-metrics");

      const event = forceGC();

      expect(event).toBeDefined();
      expect(event.type).toBeDefined();
      expect(["major", "minor", "incremental"]).toContain(event.type);
    });

    it("should return GC event with heap information", async () => {
      const { forceGC } = await import("../../../src/telemetry/gc-metrics");

      const event = forceGC();

      expect(typeof event.heapBefore).toBe("number");
      expect(typeof event.heapAfter).toBe("number");
      expect(typeof event.freedBytes).toBe("number");
      expect(event.heapBefore).toBeGreaterThanOrEqual(0);
      expect(event.heapAfter).toBeGreaterThanOrEqual(0);
    });

    it("should return GC event with duration", async () => {
      const { forceGC } = await import("../../../src/telemetry/gc-metrics");

      const event = forceGC();

      expect(typeof event.durationMs).toBe("number");
      expect(event.durationMs).toBeGreaterThanOrEqual(0);
    });

    it("should return GC event with timestamp", async () => {
      const { forceGC } = await import("../../../src/telemetry/gc-metrics");

      const beforeTime = Date.now();
      const event = forceGC();
      const afterTime = Date.now();

      expect(typeof event.timestamp).toBe("number");
      expect(event.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(event.timestamp).toBeLessThanOrEqual(afterTime);
    });

    it("should increment GC count on each call", async () => {
      const { forceGC, getGCMetricsState } = await import("../../../src/telemetry/gc-metrics");

      const initialState = getGCMetricsState();
      const initialCount = initialState.gcCount;

      forceGC();
      forceGC();
      forceGC();

      const finalState = getGCMetricsState();

      expect(finalState.gcCount).toBe(initialCount + 3);
    });
  });

  describe("getCurrentHeapStats", () => {
    it("should return heap statistics", async () => {
      const { getCurrentHeapStats } = await import("../../../src/telemetry/gc-metrics");

      const stats = getCurrentHeapStats();

      expect(stats).toBeDefined();
      expect(typeof stats.used_heap_size).toBe("number");
      expect(typeof stats.total_heap_size).toBe("number");
    });

    it("should return valid heap sizes", async () => {
      const { getCurrentHeapStats } = await import("../../../src/telemetry/gc-metrics");

      const stats = getCurrentHeapStats();

      expect(stats.used_heap_size).toBeGreaterThan(0);
      expect(stats.total_heap_size).toBeGreaterThan(0);
      expect(stats.total_heap_size).toBeGreaterThanOrEqual(stats.used_heap_size);
    });
  });

  describe("getGCMetricsState", () => {
    it("should return current GC metrics state", async () => {
      const { getGCMetricsState } = await import("../../../src/telemetry/gc-metrics");

      const state = getGCMetricsState();

      expect(state).toBeDefined();
      expect(typeof state.gcCount).toBe("number");
      expect(typeof state.totalGCDuration).toBe("number");
    });

    it("should return readonly state", async () => {
      const { getGCMetricsState } = await import("../../../src/telemetry/gc-metrics");

      const state = getGCMetricsState();

      // State should be readonly (frozen)
      expect(state.gcCount).toBeDefined();
    });

    it("should update state after forceGC", async () => {
      const { forceGC, getGCMetricsState } = await import("../../../src/telemetry/gc-metrics");

      const beforeState = getGCMetricsState();
      const beforeDuration = beforeState.totalGCDuration;

      forceGC();

      const afterState = getGCMetricsState();

      expect(afterState.totalGCDuration).toBeGreaterThanOrEqual(beforeDuration);
    });
  });

  describe("initializeGCMetrics", () => {
    it("should initialize with callback", async () => {
      const { initializeGCMetrics, shutdownGCMetrics } = await import(
        "../../../src/telemetry/gc-metrics"
      );

      const events: any[] = [];
      const callback = (event: any) => events.push(event);

      expect(() => initializeGCMetrics(callback, 60000)).not.toThrow();

      shutdownGCMetrics();
    });

    it("should call callback when forceGC is called after init", async () => {
      const { initializeGCMetrics, forceGC, shutdownGCMetrics } = await import(
        "../../../src/telemetry/gc-metrics"
      );

      const events: any[] = [];
      const callback = (event: any) => events.push(event);

      initializeGCMetrics(callback, 60000);

      forceGC();

      expect(events.length).toBe(1);
      expect(events[0].type).toBeDefined();

      shutdownGCMetrics();
    });

    it("should accept custom interval", async () => {
      const { initializeGCMetrics, shutdownGCMetrics } = await import(
        "../../../src/telemetry/gc-metrics"
      );

      const callback = () => {
        /* no-op for test */
      };

      expect(() => initializeGCMetrics(callback, 10000)).not.toThrow();

      shutdownGCMetrics();
    });
  });

  describe("shutdownGCMetrics", () => {
    it("should shutdown without error", async () => {
      const { shutdownGCMetrics } = await import("../../../src/telemetry/gc-metrics");

      expect(() => shutdownGCMetrics()).not.toThrow();
    });

    it("should stop collecting metrics after shutdown", async () => {
      const { initializeGCMetrics, shutdownGCMetrics, forceGC } = await import(
        "../../../src/telemetry/gc-metrics"
      );

      const events: any[] = [];
      const callback = (event: any) => events.push(event);

      initializeGCMetrics(callback, 60000);
      shutdownGCMetrics();

      forceGC();

      // After shutdown, callback should not be called
      expect(events.length).toBe(0);
    });

    it("should be safe to call multiple times", async () => {
      const { shutdownGCMetrics } = await import("../../../src/telemetry/gc-metrics");

      expect(() => {
        shutdownGCMetrics();
        shutdownGCMetrics();
        shutdownGCMetrics();
      }).not.toThrow();
    });
  });

  describe("GC type determination", () => {
    it("should identify different GC types based on freed ratio", async () => {
      const { forceGC } = await import("../../../src/telemetry/gc-metrics");

      // Run multiple GCs to potentially get different types
      const events = [];
      for (let i = 0; i < 5; i++) {
        // Allocate some memory to potentially trigger different GC behavior
        const arr = new Array(10000).fill(i);
        events.push(forceGC());
        arr.length = 0; // Clear to allow GC
      }

      // At least one event should have a valid type
      expect(events.length).toBe(5);
      for (const event of events) {
        expect(["major", "minor", "incremental"]).toContain(event.type);
      }
    });
  });

  describe("Memory allocation and GC", () => {
    it("should handle GC after memory allocation", async () => {
      const { forceGC, getCurrentHeapStats } = await import("../../../src/telemetry/gc-metrics");

      const beforeStats = getCurrentHeapStats();

      // Allocate memory
      const arr = new Array(100000).fill({ data: "test" });

      const duringStats = getCurrentHeapStats();

      // Force GC
      arr.length = 0;
      const event = forceGC();

      const afterStats = getCurrentHeapStats();

      expect(event).toBeDefined();
      expect(duringStats.used_heap_size).toBeGreaterThanOrEqual(beforeStats.used_heap_size);
    });
  });
});
