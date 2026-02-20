// test/bun/services/cache/cache-health-monitor.test.ts

import { afterEach, beforeEach, describe, expect, it, jest } from "bun:test";
import {
  CacheHealthMonitor,
  DEFAULT_HEALTH_MONITOR_CONFIG,
} from "../../../../src/services/cache/cache-health-monitor";

describe("Cache Health Monitor", () => {
  describe("DEFAULT_HEALTH_MONITOR_CONFIG", () => {
    it("should have correct default values", () => {
      expect(DEFAULT_HEALTH_MONITOR_CONFIG.enabled).toBe(true);
      expect(DEFAULT_HEALTH_MONITOR_CONFIG.intervalMs).toBe(10000);
      expect(DEFAULT_HEALTH_MONITOR_CONFIG.unhealthyThreshold).toBe(3);
      expect(DEFAULT_HEALTH_MONITOR_CONFIG.healthyThreshold).toBe(2);
      expect(DEFAULT_HEALTH_MONITOR_CONFIG.pingTimeoutMs).toBe(500);
    });
  });

  describe("CacheHealthMonitor", () => {
    let monitor: CacheHealthMonitor;
    let mockPingFn: jest.Mock;
    let mockOnUnhealthy: jest.Mock;
    let mockOnHealthy: jest.Mock;

    beforeEach(() => {
      mockPingFn = jest.fn().mockResolvedValue(undefined);
      mockOnUnhealthy = jest.fn();
      mockOnHealthy = jest.fn();
    });

    afterEach(() => {
      if (monitor) {
        monitor.stop();
      }
    });

    describe("initial state", () => {
      it("should start as unknown health", () => {
        monitor = new CacheHealthMonitor(mockPingFn);

        const state = monitor.getState();
        expect(state.status).toBe("unknown");
        expect(state.isMonitoring).toBe(false);
        expect(state.consecutiveFailures).toBe(0);
        expect(state.consecutiveSuccesses).toBe(0);
      });
    });

    describe("start and stop", () => {
      it("should start monitoring", () => {
        monitor = new CacheHealthMonitor(mockPingFn);

        monitor.start();
        expect(monitor.getState().isMonitoring).toBe(true);
      });

      it("should stop monitoring", () => {
        monitor = new CacheHealthMonitor(mockPingFn);

        monitor.start();
        monitor.stop();
        expect(monitor.getState().isMonitoring).toBe(false);
      });

      it("should not start if already running", () => {
        monitor = new CacheHealthMonitor(mockPingFn, null, {
          enabled: true,
          intervalMs: 100,
          unhealthyThreshold: 3,
          healthyThreshold: 2,
          pingTimeoutMs: 500,
        });

        monitor.start();
        const result = monitor.start();
        expect(result).toBe(false);
        expect(monitor.getState().isMonitoring).toBe(true);
      });

      it("should be idempotent to stop", () => {
        monitor = new CacheHealthMonitor(mockPingFn);

        monitor.start();
        monitor.stop();
        monitor.stop();
        expect(monitor.getState().isMonitoring).toBe(false);
      });
    });

    describe("health checks", () => {
      it("should perform health check on start", async () => {
        monitor = new CacheHealthMonitor(mockPingFn, null, {
          enabled: true,
          intervalMs: 10000,
          unhealthyThreshold: 3,
          healthyThreshold: 2,
          pingTimeoutMs: 500,
        });

        monitor.start();
        await new Promise((resolve) => setTimeout(resolve, 50));

        expect(mockPingFn).toHaveBeenCalled();
      });

      it("should detect healthy state after successful pings", async () => {
        monitor = new CacheHealthMonitor(mockPingFn, null, {
          enabled: true,
          intervalMs: 10,
          unhealthyThreshold: 3,
          healthyThreshold: 2,
          pingTimeoutMs: 500,
        });

        monitor.start();
        await new Promise((resolve) => setTimeout(resolve, 50));

        expect(monitor.getState().status).toBe("healthy");
      });

      it("should detect unhealthy state after failed pings", async () => {
        mockPingFn.mockRejectedValue(new Error("Connection failed"));

        monitor = new CacheHealthMonitor(mockPingFn, null, {
          enabled: true,
          intervalMs: 10,
          unhealthyThreshold: 2,
          healthyThreshold: 2,
          pingTimeoutMs: 500,
        });

        monitor.start();
        await new Promise((resolve) => setTimeout(resolve, 50));

        expect(monitor.getState().status).toBe("unhealthy");
      });

      it("should handle ping timeout", async () => {
        mockPingFn.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 1000)));

        monitor = new CacheHealthMonitor(mockPingFn, null, {
          enabled: true,
          intervalMs: 10,
          unhealthyThreshold: 2,
          healthyThreshold: 2,
          pingTimeoutMs: 5,
        });

        monitor.start();
        await new Promise((resolve) => setTimeout(resolve, 100));

        expect(monitor.getState().consecutiveFailures).toBeGreaterThan(0);
      });
    });

    describe("threshold counting", () => {
      it("should reset consecutive successes on failure", async () => {
        let callCount = 0;
        mockPingFn.mockImplementation(async () => {
          callCount++;
          if (callCount > 3) {
            throw new Error("Connection failed");
          }
        });

        monitor = new CacheHealthMonitor(mockPingFn, null, {
          enabled: true,
          intervalMs: 10,
          unhealthyThreshold: 3,
          healthyThreshold: 2,
          pingTimeoutMs: 500,
        });

        monitor.start();
        await new Promise((resolve) => setTimeout(resolve, 80));

        const state = monitor.getState();
        expect(state.consecutiveSuccesses).toBe(0);
        expect(state.consecutiveFailures).toBeGreaterThan(0);
      });

      it("should reset consecutive failures on success", async () => {
        let callCount = 0;
        mockPingFn.mockImplementation(async () => {
          callCount++;
          if (callCount <= 2) {
            throw new Error("Connection failed");
          }
        });

        monitor = new CacheHealthMonitor(mockPingFn, null, {
          enabled: true,
          intervalMs: 10,
          unhealthyThreshold: 5,
          healthyThreshold: 2,
          pingTimeoutMs: 500,
        });

        monitor.start();
        await new Promise((resolve) => setTimeout(resolve, 80));

        const state = monitor.getState();
        expect(state.consecutiveFailures).toBe(0);
        expect(state.consecutiveSuccesses).toBeGreaterThan(0);
      });
    });

    describe("performHealthCheck", () => {
      it("should return success for healthy ping", async () => {
        monitor = new CacheHealthMonitor(mockPingFn);

        const result = await monitor.performHealthCheck();
        expect(result.success).toBe(true);
        expect(result.responseTimeMs).toBeGreaterThanOrEqual(0);
      });

      it("should return failure for failed ping", async () => {
        mockPingFn.mockRejectedValue(new Error("Connection failed"));

        monitor = new CacheHealthMonitor(mockPingFn);

        const result = await monitor.performHealthCheck();
        expect(result.success).toBe(false);
        expect(result.error).toBe("Connection failed");
      });

      it("should return timeout error for slow ping", async () => {
        mockPingFn.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

        monitor = new CacheHealthMonitor(mockPingFn, null, {
          enabled: true,
          intervalMs: 10000,
          unhealthyThreshold: 3,
          healthyThreshold: 2,
          pingTimeoutMs: 10,
        });

        const result = await monitor.performHealthCheck();
        expect(result.success).toBe(false);
        expect(result.error).toContain("timed out");
      });
    });

    describe("disabled monitor", () => {
      it("should not start when disabled", () => {
        monitor = new CacheHealthMonitor(mockPingFn, null, {
          enabled: false,
          intervalMs: 10000,
          unhealthyThreshold: 3,
          healthyThreshold: 2,
          pingTimeoutMs: 500,
        });

        const result = monitor.start();
        expect(result).toBe(false);
        expect(monitor.getState().isMonitoring).toBe(false);
      });

      it("should still allow manual health checks when disabled", async () => {
        monitor = new CacheHealthMonitor(mockPingFn, null, {
          enabled: false,
          intervalMs: 10000,
          unhealthyThreshold: 3,
          healthyThreshold: 2,
          pingTimeoutMs: 500,
        });

        const result = await monitor.performHealthCheck();
        expect(result.success).toBe(true);
      });
    });

    describe("getState", () => {
      it("should return comprehensive state", async () => {
        monitor = new CacheHealthMonitor(mockPingFn, null, {
          enabled: true,
          intervalMs: 10,
          unhealthyThreshold: 3,
          healthyThreshold: 1,
          pingTimeoutMs: 500,
        });

        monitor.start();
        await new Promise((resolve) => setTimeout(resolve, 50));

        const state = monitor.getState();
        expect(state).toHaveProperty("status");
        expect(state).toHaveProperty("isMonitoring");
        expect(state).toHaveProperty("consecutiveFailures");
        expect(state).toHaveProperty("consecutiveSuccesses");
        expect(state).toHaveProperty("lastCheck");
        expect(state).toHaveProperty("avgResponseTimeMs");
      });

      it("should track last check time", async () => {
        monitor = new CacheHealthMonitor(mockPingFn, null, {
          enabled: true,
          intervalMs: 10,
          unhealthyThreshold: 3,
          healthyThreshold: 2,
          pingTimeoutMs: 500,
        });

        const beforeTime = Date.now();
        monitor.start();
        await new Promise((resolve) => setTimeout(resolve, 30));

        const state = monitor.getState();
        expect(state.lastCheck).not.toBeNull();
        expect(state.lastCheck!.timestamp).toBeGreaterThanOrEqual(beforeTime);
      });
    });

    describe("edge cases", () => {
      it("should handle ping function that returns slow response", async () => {
        mockPingFn.mockImplementation(async () => {
          await new Promise((resolve) => setTimeout(resolve, 20));
        });

        monitor = new CacheHealthMonitor(mockPingFn, null, {
          enabled: true,
          intervalMs: 10,
          unhealthyThreshold: 3,
          healthyThreshold: 1,
          pingTimeoutMs: 50,
        });

        monitor.start();
        await new Promise((resolve) => setTimeout(resolve, 100));

        const state = monitor.getState();
        expect(state.avgResponseTimeMs).toBeGreaterThanOrEqual(15);
      });

      it("should track consecutive failures over multiple checks", async () => {
        mockPingFn.mockRejectedValue(new Error("fail"));

        monitor = new CacheHealthMonitor(mockPingFn, null, {
          enabled: true,
          intervalMs: 10,
          unhealthyThreshold: 3,
          healthyThreshold: 2,
          pingTimeoutMs: 500,
        });

        monitor.start();
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Should have transitioned to unhealthy after threshold
        expect(monitor.getState().status).toBe("unhealthy");
      });
    });
  });
});
