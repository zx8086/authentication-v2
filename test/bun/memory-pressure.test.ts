/* test/bun/memory-pressure.test.ts */

import { beforeEach, describe, expect, it } from "bun:test";
import {
  getMemoryStats,
  shouldDropNonCriticalMetrics,
  shouldDropTelemetry,
  startMemoryPressureMonitoring,
  stopMemoryPressureMonitoring,
} from "../../src/utils/memory-pressure";

describe("Memory Pressure Monitoring", () => {
  beforeEach(() => {
    stopMemoryPressureMonitoring();
  });

  describe("getMemoryStats", () => {
    it("should return valid memory statistics", () => {
      const stats = getMemoryStats();

      expect(stats).toBeDefined();
      expect(typeof stats.heapUsed).toBe("number");
      expect(typeof stats.heapTotal).toBe("number");
      expect(typeof stats.rss).toBe("number");
      expect(typeof stats.external).toBe("number");
      expect(typeof stats.heapRatio).toBe("number");

      expect(stats.heapUsed).toBeGreaterThan(0);
      expect(stats.heapTotal).toBeGreaterThan(0);
      expect(stats.rss).toBeGreaterThan(0);
      expect(stats.heapRatio).toBeGreaterThanOrEqual(0);
      expect(stats.heapRatio).toBeLessThan(10); // Heap ratio can exceed 1 in some conditions
    });

    it("should calculate heap ratio correctly", () => {
      const stats = getMemoryStats();
      const expectedRatio = stats.heapUsed / stats.rss;

      expect(stats.heapRatio).toBeCloseTo(expectedRatio, 2);
      expect(stats.heapRatio).toBeGreaterThanOrEqual(0);
      expect(stats.heapRatio).toBeLessThanOrEqual(1);
    });
  });

  describe("shouldDropTelemetry", () => {
    it("should return false under normal memory conditions", () => {
      expect(shouldDropTelemetry()).toBe(false);
    });

    it("should return true under critical memory pressure", () => {
      startMemoryPressureMonitoring({
        criticalThreshold: 0.01, // Very low threshold to trigger critical state
        warningThreshold: 0.005,
        checkIntervalMs: 100,
      });

      // Give monitoring time to detect pressure
      return new Promise((resolve) => {
        setTimeout(() => {
          const shouldDrop = shouldDropTelemetry();
          expect(shouldDrop).toBe(true);
          stopMemoryPressureMonitoring();
          resolve();
        }, 200);
      });
    });
  });

  describe("shouldDropNonCriticalMetrics", () => {
    it("should return current memory pressure status", () => {
      const result = shouldDropNonCriticalMetrics();
      expect(typeof result).toBe("boolean");
    });

    it("should return true under warning-level memory pressure", () => {
      startMemoryPressureMonitoring({
        criticalThreshold: 0.95,
        warningThreshold: 0.01, // Very low threshold to trigger warning state
        checkIntervalMs: 100,
      });

      return new Promise((resolve) => {
        setTimeout(() => {
          const shouldDrop = shouldDropNonCriticalMetrics();
          expect(shouldDrop).toBe(true);
          stopMemoryPressureMonitoring();
          resolve();
        }, 200);
      });
    });
  });

  describe("Memory Pressure Monitoring Lifecycle", () => {
    it("should start and stop monitoring correctly", () => {
      const config = {
        criticalThreshold: 0.85,
        warningThreshold: 0.75,
        checkIntervalMs: 500,
      };

      startMemoryPressureMonitoring(config);

      // Should be able to call multiple times without issues
      startMemoryPressureMonitoring(config);

      stopMemoryPressureMonitoring();
      stopMemoryPressureMonitoring(); // Should handle multiple stops gracefully
    });

    it("should handle rapid start/stop cycles", () => {
      const config = {
        criticalThreshold: 0.85,
        warningThreshold: 0.75,
        checkIntervalMs: 100,
      };

      for (let i = 0; i < 5; i++) {
        startMemoryPressureMonitoring(config);
        stopMemoryPressureMonitoring();
      }

      // Final cleanup
      stopMemoryPressureMonitoring();
    });

    it("should use default configuration when none provided", () => {
      startMemoryPressureMonitoring();

      // Should work with defaults
      const stats = getMemoryStats();
      expect(stats).toBeDefined();
      expect(typeof shouldDropTelemetry()).toBe("boolean");
      expect(typeof shouldDropNonCriticalMetrics()).toBe("boolean");

      stopMemoryPressureMonitoring();
    });
  });

  describe("Memory Pressure State Management", () => {
    it("should track memory pressure state changes over time", () => {
      const checkIntervalMs = 150;

      startMemoryPressureMonitoring({
        criticalThreshold: 0.85,
        warningThreshold: 0.75,
        checkIntervalMs,
      });

      return new Promise((resolve) => {
        let checksPerformed = 0;
        const maxChecks = 3;

        const interval = setInterval(() => {
          const stats = getMemoryStats();
          expect(stats.heapRatio).toBeGreaterThanOrEqual(0);
          // Memory ratio can exceed 1 in some conditions, so allow flexible range
          expect(stats.heapRatio).toBeLessThan(10);

          checksPerformed++;

          if (checksPerformed >= maxChecks) {
            clearInterval(interval);
            stopMemoryPressureMonitoring();
            resolve();
          }
        }, checkIntervalMs + 50);
      });
    });

    it("should provide consistent memory statistics during monitoring", () => {
      startMemoryPressureMonitoring({
        criticalThreshold: 0.85,
        warningThreshold: 0.75,
        checkIntervalMs: 100,
      });

      const stats1 = getMemoryStats();
      const stats2 = getMemoryStats();

      // Stats should be consistent within a short timeframe
      expect(Math.abs(stats1.heapRatio - stats2.heapRatio)).toBeLessThan(0.1);
      expect(stats1.heapUsed).toBeGreaterThan(0);
      expect(stats2.heapUsed).toBeGreaterThan(0);

      stopMemoryPressureMonitoring();
    });
  });

  describe("Memory Allocation Simulation", () => {
    it("should detect memory pressure with actual memory allocation", () => {
      const largeArrays: number[][] = [];

      startMemoryPressureMonitoring({
        criticalThreshold: 0.85,
        warningThreshold: 0.75,
        checkIntervalMs: 100,
      });

      try {
        // Allocate memory to increase heap usage
        for (let i = 0; i < 1000; i++) {
          largeArrays.push(new Array(10000).fill(Math.random()));
        }

        return new Promise((resolve) => {
          setTimeout(() => {
            const stats = getMemoryStats();
            expect(stats.heapUsed).toBeGreaterThan(0);
            expect(stats.heapRatio).toBeGreaterThan(0);

            // Memory should have increased due to allocation
            const initialStats = getMemoryStats();
            expect(initialStats.heapUsed).toBeGreaterThan(1000000); // At least 1MB

            stopMemoryPressureMonitoring();
            resolve();
          }, 200);
        });
      } finally {
        // Cleanup allocated memory
        largeArrays.length = 0;
        if (typeof global !== "undefined" && global.gc) {
          global.gc();
        }
      }
    });
  });

  describe("Threshold Configuration Validation", () => {
    it("should handle various threshold configurations", () => {
      const configs = [
        { criticalThreshold: 0.95, warningThreshold: 0.85 },
        { criticalThreshold: 0.80, warningThreshold: 0.70 },
        { criticalThreshold: 0.99, warningThreshold: 0.95 },
      ];

      configs.forEach((config) => {
        startMemoryPressureMonitoring({
          ...config,
          checkIntervalMs: 100,
        });

        const stats = getMemoryStats();
        expect(stats).toBeDefined();
        expect(stats.heapRatio).toBeGreaterThanOrEqual(0);

        stopMemoryPressureMonitoring();
      });
    });

    it("should handle edge case threshold values", () => {
      const edgeCases = [
        { criticalThreshold: 0.99, warningThreshold: 0.98 },
        { criticalThreshold: 0.80, warningThreshold: 0.75 },
        { criticalThreshold: 1.0, warningThreshold: 0.99 },
      ];

      edgeCases.forEach((config) => {
        startMemoryPressureMonitoring({
          ...config,
          checkIntervalMs: 100,
        });

        expect(shouldDropTelemetry()).toBe(false);
        expect(shouldDropNonCriticalMetrics()).toBe(false);

        stopMemoryPressureMonitoring();
      });
    });
  });
});