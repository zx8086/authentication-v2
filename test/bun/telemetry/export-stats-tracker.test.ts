// test/bun/telemetry/export-stats-tracker.test.ts

import { describe, expect, it } from "bun:test";
import { createExportStatsTracker } from "../../../src/telemetry/export-stats-tracker";

describe("ExportStatsTracker", () => {
  describe("createExportStatsTracker", () => {
    it("should create tracker with initial zero values", () => {
      const tracker = createExportStatsTracker();
      expect(tracker.totalExports).toBe(0);
      expect(tracker.successCount).toBe(0);
      expect(tracker.failureCount).toBe(0);
      expect(tracker.lastExportTime).toBeNull();
      expect(tracker.lastSuccessTime).toBeNull();
      expect(tracker.lastFailureTime).toBeNull();
      expect(tracker.recentErrors).toEqual([]);
    });

    it("should return successRate as 0% when no exports", () => {
      const tracker = createExportStatsTracker();
      const stats = tracker.getStats();
      expect(stats.successRate).toBe("0%");
    });

    it("should return successRate as percentage string with % symbol", () => {
      const tracker = createExportStatsTracker();
      tracker.recordExportAttempt();
      tracker.recordExportSuccess();
      const stats = tracker.getStats();
      expect(stats.successRate).toBe("100%");
    });

    it("should track export attempts correctly", () => {
      const tracker = createExportStatsTracker();
      tracker.recordExportAttempt();
      tracker.recordExportAttempt();
      tracker.recordExportAttempt();
      expect(tracker.totalExports).toBe(3);
    });

    it("should track export successes correctly", () => {
      const tracker = createExportStatsTracker();
      tracker.recordExportAttempt();
      tracker.recordExportSuccess();
      expect(tracker.successCount).toBe(1);
      expect(tracker.lastSuccessTime).not.toBeNull();
      expect(tracker.lastExportTime).toBe(tracker.lastSuccessTime);
    });

    it("should track export failures correctly", () => {
      const tracker = createExportStatsTracker();
      tracker.recordExportAttempt();
      tracker.recordExportFailure("Connection timeout");
      expect(tracker.failureCount).toBe(1);
      expect(tracker.lastFailureTime).not.toBeNull();
      expect(tracker.lastExportTime).toBe(tracker.lastFailureTime);
      expect(tracker.recentErrors).toHaveLength(1);
      expect(tracker.recentErrors[0]).toContain("Connection timeout");
    });

    it("should calculate mixed success rate correctly", () => {
      const tracker = createExportStatsTracker();
      for (let i = 0; i < 10; i++) {
        tracker.recordExportAttempt();
        if (i < 7) {
          tracker.recordExportSuccess();
        } else {
          tracker.recordExportFailure("Error");
        }
      }
      const stats = tracker.getStats();
      expect(stats.successRate).toBe("70%");
    });

    it("should limit recent errors to 10", () => {
      const tracker = createExportStatsTracker();
      for (let i = 0; i < 15; i++) {
        tracker.recordExportAttempt();
        tracker.recordExportFailure(`Error ${i}`);
      }
      expect(tracker.recentErrors).toHaveLength(10);
      expect(tracker.recentErrors[0]).toContain("Error 5");
      expect(tracker.recentErrors[9]).toContain("Error 14");
    });

    it("should return immutable snapshot via getStats()", () => {
      const tracker = createExportStatsTracker();
      tracker.recordExportAttempt();
      tracker.recordExportSuccess();

      const snapshot = tracker.getStats();
      tracker.recordExportAttempt();
      tracker.recordExportFailure("New error");

      expect(snapshot.total).toBe(1);
      expect(snapshot.successRate).toBe("100%");
      expect(tracker.totalExports).toBe(2);
      expect(tracker.getStats().successRate).toBe("50%");
    });

    it("should return immutable recentErrors array", () => {
      const tracker = createExportStatsTracker();
      tracker.recordExportAttempt();
      tracker.recordExportFailure("Error 1");

      const errors = tracker.recentErrors;
      errors.push("Injected error");

      expect(tracker.recentErrors).toHaveLength(1);
      expect(tracker.recentErrors[0]).toContain("Error 1");
    });
  });

  describe("getStats()", () => {
    it("should return ExportStats with correct structure", () => {
      const tracker = createExportStatsTracker();
      tracker.recordExportAttempt();
      tracker.recordExportSuccess();

      const stats = tracker.getStats();
      expect(stats).toHaveProperty("successRate");
      expect(stats).toHaveProperty("total");
      expect(stats).toHaveProperty("failures");
      expect(stats).toHaveProperty("lastExportTime");
      expect(stats).toHaveProperty("lastFailureTime");
      expect(stats).toHaveProperty("recentErrors");
    });

    it("should return lastFailureTime as null when no failures", () => {
      const tracker = createExportStatsTracker();
      tracker.recordExportAttempt();
      tracker.recordExportSuccess();

      const stats = tracker.getStats();
      expect(stats.lastFailureTime).toBeNull();
    });

    it("should return lastFailureTime when there are failures", () => {
      const tracker = createExportStatsTracker();
      tracker.recordExportAttempt();
      tracker.recordExportFailure("Connection error");

      const stats = tracker.getStats();
      expect(stats.lastFailureTime).not.toBeNull();
      expect(typeof stats.lastFailureTime).toBe("string");
    });

    it("should return empty recentErrors array when no failures", () => {
      const tracker = createExportStatsTracker();
      tracker.recordExportAttempt();
      tracker.recordExportSuccess();

      const stats = tracker.getStats();
      expect(stats.recentErrors).toEqual([]);
    });

    it("should return recentErrors with error messages when failures occur", () => {
      const tracker = createExportStatsTracker();
      tracker.recordExportAttempt();
      tracker.recordExportFailure("Connection timeout");
      tracker.recordExportAttempt();
      tracker.recordExportFailure("Server unavailable");

      const stats = tracker.getStats();
      expect(stats.recentErrors).toHaveLength(2);
      expect(stats.recentErrors[0]).toContain("Connection timeout");
      expect(stats.recentErrors[1]).toContain("Server unavailable");
    });

    it("should return immutable recentErrors in getStats()", () => {
      const tracker = createExportStatsTracker();
      tracker.recordExportAttempt();
      tracker.recordExportFailure("Error 1");

      const stats = tracker.getStats();
      const originalLength = stats.recentErrors.length;

      // Try to mutate the array (will fail due to readonly, but test immutability)
      tracker.recordExportAttempt();
      tracker.recordExportFailure("Error 2");

      // Original stats should be unchanged
      expect(stats.recentErrors).toHaveLength(originalLength);
    });

    it("should return total exports as total field", () => {
      const tracker = createExportStatsTracker();
      tracker.recordExportAttempt();
      tracker.recordExportAttempt();
      tracker.recordExportSuccess();
      tracker.recordExportSuccess();

      const stats = tracker.getStats();
      expect(stats.total).toBe(2);
    });

    it("should return failure count as failures field", () => {
      const tracker = createExportStatsTracker();
      tracker.recordExportAttempt();
      tracker.recordExportFailure("Error");
      tracker.recordExportAttempt();
      tracker.recordExportFailure("Another error");

      const stats = tracker.getStats();
      expect(stats.failures).toBe(2);
    });

    it("should return lastExportTime from most recent operation", () => {
      const tracker = createExportStatsTracker();
      tracker.recordExportAttempt();
      tracker.recordExportSuccess();

      const stats = tracker.getStats();
      expect(stats.lastExportTime).not.toBeNull();
      expect(typeof stats.lastExportTime).toBe("string");
    });
  });

  describe("successRate edge cases", () => {
    it("should round to nearest integer percentage", () => {
      const tracker = createExportStatsTracker();
      for (let i = 0; i < 3; i++) {
        tracker.recordExportAttempt();
      }
      tracker.recordExportSuccess();
      tracker.recordExportSuccess();
      tracker.recordExportFailure("Error");

      const stats = tracker.getStats();
      expect(stats.successRate).toBe("67%");
    });

    it("should handle 0% success rate", () => {
      const tracker = createExportStatsTracker();
      tracker.recordExportAttempt();
      tracker.recordExportFailure("Error");

      const stats = tracker.getStats();
      expect(stats.successRate).toBe("0%");
    });

    it("should handle 100% success rate", () => {
      const tracker = createExportStatsTracker();
      for (let i = 0; i < 100; i++) {
        tracker.recordExportAttempt();
        tracker.recordExportSuccess();
      }

      const stats = tracker.getStats();
      expect(stats.successRate).toBe("100%");
    });
  });
});
