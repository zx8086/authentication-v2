import { describe, expect, it } from "bun:test";
import {
  CircuitBreakerStateEnum,
  type CircuitBreakerStats,
  isOpossumCircuitBreakerStats,
  isTelemetryCircuitBreakerStats,
  type OpossumCircuitBreakerStats,
  type TelemetryCircuitBreakerStats,
} from "../../../src/types/circuit-breaker.types";

describe("Circuit Breaker Type Guards", () => {
  const opossumStats: OpossumCircuitBreakerStats = {
    state: "closed",
    stats: {
      fires: 100,
      rejections: 5,
      timeouts: 2,
      failures: 3,
      successes: 90,
      fallbacks: 0,
      semaphoreRejections: 0,
      percentiles: { "50": 10, "90": 25, "99": 50 },
    },
  };

  const telemetryStats: TelemetryCircuitBreakerStats = {
    state: CircuitBreakerStateEnum.CLOSED,
    failureCount: 3,
    successCount: 97,
    lastFailureTime: Date.now() - 60000,
    lastSuccessTime: Date.now(),
    totalRequests: 100,
    rejectedRequests: 0,
    lastStateChange: Date.now() - 3600000,
  };

  describe("isOpossumCircuitBreakerStats", () => {
    it("should return true for Opossum stats object", () => {
      expect(isOpossumCircuitBreakerStats(opossumStats)).toBe(true);
    });

    it("should return false for Telemetry stats object", () => {
      expect(isOpossumCircuitBreakerStats(telemetryStats)).toBe(false);
    });

    it("should return true when stats property exists and is an object", () => {
      const statsWithNestedObject: CircuitBreakerStats = {
        state: "open",
        stats: {
          fires: 0,
          rejections: 0,
          timeouts: 0,
          failures: 0,
          successes: 0,
          fallbacks: 0,
          semaphoreRejections: 0,
          percentiles: {},
        },
      };
      expect(isOpossumCircuitBreakerStats(statsWithNestedObject)).toBe(true);
    });

    it("should handle half-open state correctly", () => {
      const halfOpenStats: OpossumCircuitBreakerStats = {
        state: "half-open",
        stats: {
          fires: 50,
          rejections: 10,
          timeouts: 5,
          failures: 15,
          successes: 20,
          fallbacks: 2,
          semaphoreRejections: 1,
          percentiles: { "50": 15 },
        },
      };
      expect(isOpossumCircuitBreakerStats(halfOpenStats)).toBe(true);
    });
  });

  describe("isTelemetryCircuitBreakerStats", () => {
    it("should return true for Telemetry stats object", () => {
      expect(isTelemetryCircuitBreakerStats(telemetryStats)).toBe(true);
    });

    it("should return false for Opossum stats object", () => {
      expect(isTelemetryCircuitBreakerStats(opossumStats)).toBe(false);
    });

    it("should return true when failureCount property exists", () => {
      const minimalTelemetryStats: CircuitBreakerStats = {
        state: CircuitBreakerStateEnum.OPEN,
        failureCount: 10,
        successCount: 0,
        lastFailureTime: Date.now(),
        lastSuccessTime: 0,
        totalRequests: 10,
        rejectedRequests: 5,
        lastStateChange: Date.now(),
      };
      expect(isTelemetryCircuitBreakerStats(minimalTelemetryStats)).toBe(true);
    });

    it("should handle half_open state correctly", () => {
      const halfOpenStats: TelemetryCircuitBreakerStats = {
        state: CircuitBreakerStateEnum.HALF_OPEN,
        failureCount: 5,
        successCount: 2,
        lastFailureTime: Date.now() - 30000,
        lastSuccessTime: Date.now(),
        totalRequests: 7,
        rejectedRequests: 3,
        lastStateChange: Date.now() - 1000,
      };
      expect(isTelemetryCircuitBreakerStats(halfOpenStats)).toBe(true);
    });
  });

  describe("Type Narrowing", () => {
    it("should narrow CircuitBreakerStats to OpossumCircuitBreakerStats", () => {
      const stats: CircuitBreakerStats = opossumStats;

      if (isOpossumCircuitBreakerStats(stats)) {
        expect(stats.stats.fires).toBe(100);
        expect(stats.stats.percentiles["50"]).toBe(10);
      } else {
        throw new Error("Type narrowing failed for Opossum stats");
      }
    });

    it("should narrow CircuitBreakerStats to TelemetryCircuitBreakerStats", () => {
      const stats: CircuitBreakerStats = telemetryStats;

      if (isTelemetryCircuitBreakerStats(stats)) {
        expect(stats.failureCount).toBe(3);
        expect(stats.successCount).toBe(97);
      } else {
        throw new Error("Type narrowing failed for Telemetry stats");
      }
    });

    it("should correctly discriminate between types in conditional", () => {
      const statsArray: CircuitBreakerStats[] = [opossumStats, telemetryStats];
      let opossumCount = 0;
      let telemetryCount = 0;

      for (const stats of statsArray) {
        if (isOpossumCircuitBreakerStats(stats)) {
          opossumCount++;
        } else if (isTelemetryCircuitBreakerStats(stats)) {
          telemetryCount++;
        }
      }

      expect(opossumCount).toBe(1);
      expect(telemetryCount).toBe(1);
    });
  });

  describe("CircuitBreakerStateEnum", () => {
    it("should have correct enum values", () => {
      expect(CircuitBreakerStateEnum.CLOSED).toBe("closed");
      expect(CircuitBreakerStateEnum.OPEN).toBe("open");
      expect(CircuitBreakerStateEnum.HALF_OPEN).toBe("half_open");
    });
  });
});
