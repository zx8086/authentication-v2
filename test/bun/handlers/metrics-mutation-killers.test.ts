import { beforeEach, describe, expect, it, mock } from "bun:test";
import {
  handleDebugMetricsExport,
  handleDebugMetricsTest,
  handleMetricsUnified,
} from "../../../src/handlers/metrics";

// Mock dependencies
const mockKongService = {
  getCacheStats: mock(async () => ({
    strategy: "local-memory" as const,
    size: 42,
    entries: [],
    activeEntries: 5,
    hitRate: "0.75",
    averageLatencyMs: 1.5,
  })),
  getCircuitBreakerStats: mock(() => ({
    kong: {
      state: "closed" as const,
      failureCount: 0,
      successCount: 100,
      lastFailureTime: null,
    },
  })),
};

describe("metrics mutation killers", () => {
  beforeEach(() => {
    mockKongService.getCacheStats.mockClear();
    mockKongService.getCircuitBreakerStats.mockClear();
  });

  describe("handleDebugMetricsTest", () => {
    it("returns exact status code 200 on success", async () => {
      const response = handleDebugMetricsTest();
      expect(response.status).toBe(200);
    });

    it("returns exact Content-Type header", async () => {
      const response = handleDebugMetricsTest();
      expect(response.headers.get("Content-Type")).toBe("application/json");
    });

    it("returns exact success value true", async () => {
      const response = handleDebugMetricsTest();
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it("returns exact metricsRecorded value of 5", async () => {
      const response = handleDebugMetricsTest();
      const data = await response.json();
      expect(data.metricsRecorded).toBe(5);
    });

    it("returns exact message text", async () => {
      const response = handleDebugMetricsTest();
      const data = await response.json();
      expect(data.message).toBe("Test metrics recorded successfully");
    });

    it("includes timestamp in ISO format", async () => {
      const response = handleDebugMetricsTest();
      const data = await response.json();
      expect(data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it("includes all expected Access-Control headers", async () => {
      const response = handleDebugMetricsTest();
      expect(response.headers.get("Access-Control-Allow-Headers")).toBe(
        "Content-Type, Authorization, Accept-Version"
      );
      expect(response.headers.get("Access-Control-Allow-Methods")).toBe("GET, POST, OPTIONS");
    });
  });

  describe("handleDebugMetricsExport", () => {
    it("returns exact status code 200 regardless of telemetry initialization", async () => {
      const response = await handleDebugMetricsExport();
      expect(response.status).toBe(200);
    });

    it("returns exact Content-Type header", async () => {
      const response = await handleDebugMetricsExport();
      expect(response.headers.get("Content-Type")).toBe("application/json");
    });

    it("returns exact success value true on success", async () => {
      const response = await handleDebugMetricsExport();
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it("returns exact success message", async () => {
      const response = await handleDebugMetricsExport();
      const data = await response.json();
      expect(data.message).toBe("Metrics exported successfully");
    });

    it("returns exportedMetrics value (0 if telemetry not initialized, 10 if initialized)", async () => {
      const response = await handleDebugMetricsExport();
      const data = await response.json();
      // When telemetry is not initialized, returns 0; when initialized, returns 10
      expect([0, 10]).toContain(data.exportedMetrics);
    });

    it("returns empty errors array", async () => {
      const response = await handleDebugMetricsExport();
      const data = await response.json();
      expect(data.errors).toEqual([]);
    });

    it("returns duration as rounded integer", async () => {
      const response = await handleDebugMetricsExport();
      const data = await response.json();
      expect(typeof data.duration).toBe("number");
      expect(Number.isInteger(data.duration)).toBe(true);
      expect(data.duration).toBeGreaterThanOrEqual(0);
    });

    it("includes timestamp in ISO format", async () => {
      const response = await handleDebugMetricsExport();
      const data = await response.json();
      expect(data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it("includes all CORS headers", async () => {
      const response = await handleDebugMetricsExport();
      expect(response.headers.get("Access-Control-Allow-Headers")).toBe(
        "Content-Type, Authorization, Accept-Version"
      );
      expect(response.headers.get("Access-Control-Allow-Methods")).toBe("GET, POST, OPTIONS");
    });
  });

  describe("handleMetricsUnified - operational view", () => {
    it("returns exact status code 200", async () => {
      const url = new URL("http://localhost:3000/metrics?view=operational");
      const response = await handleMetricsUnified(mockKongService as any, url);
      expect(response.status).toBe(200);
    });

    it("returns exact Content-Type header", async () => {
      const url = new URL("http://localhost:3000/metrics?view=operational");
      const response = await handleMetricsUnified(mockKongService as any, url);
      expect(response.headers.get("Content-Type")).toBe("application/json");
    });

    it("returns Cache-Control no-cache header", async () => {
      const url = new URL("http://localhost:3000/metrics?view=operational");
      const response = await handleMetricsUnified(mockKongService as any, url);
      expect(response.headers.get("Cache-Control")).toBe("no-cache");
    });

    it("includes memory stats with exact keys", async () => {
      const url = new URL("http://localhost:3000/metrics?view=operational");
      const response = await handleMetricsUnified(mockKongService as any, url);
      const data = await response.json();
      expect(data.memory).toBeDefined();
      expect(data.memory.used).toBeGreaterThanOrEqual(0);
      expect(data.memory.total).toBeGreaterThanOrEqual(0);
      expect(data.memory.rss).toBeGreaterThanOrEqual(0);
      expect(data.memory.external).toBeGreaterThanOrEqual(0);
    });

    it("includes cache stats from kong service", async () => {
      const url = new URL("http://localhost:3000/metrics?view=operational");
      const response = await handleMetricsUnified(mockKongService as any, url);
      const data = await response.json();
      expect(data.cache).toBeDefined();
      expect(data.cache.strategy).toBe("local-memory");
      expect(data.cache.size).toBe(42);
      expect(data.cache.activeEntries).toBe(5);
      expect(data.cache.hitRate).toBe("0.75");
      expect(data.cache.averageLatencyMs).toBe(1.5);
    });

    it("includes circuit breaker stats", async () => {
      const url = new URL("http://localhost:3000/metrics?view=operational");
      const response = await handleMetricsUnified(mockKongService as any, url);
      const data = await response.json();
      expect(data.circuitBreakers).toBeDefined();
      expect(data.circuitBreakers.kong).toBeDefined();
      expect(data.circuitBreakers.kong.state).toBe("closed");
      expect(data.circuitBreakers.kong.failureCount).toBe(0);
      expect(data.circuitBreakers.kong.successCount).toBe(100);
    });

    it("includes consumer volume stats", async () => {
      const url = new URL("http://localhost:3000/metrics?view=operational");
      const response = await handleMetricsUnified(mockKongService as any, url);
      const data = await response.json();
      expect(data.consumers).toBeDefined();
      expect(data.consumers.volume).toBeDefined();
      expect(typeof data.consumers.volume.high).toBe("number");
      expect(typeof data.consumers.volume.medium).toBe("number");
      expect(typeof data.consumers.volume.low).toBe("number");
      expect(typeof data.consumers.volume.total).toBe("number");
    });
  });

  describe("handleMetricsUnified - infrastructure view", () => {
    it("returns infrastructure data structure", async () => {
      const url = new URL("http://localhost:3000/metrics?view=infrastructure");
      const response = await handleMetricsUnified(mockKongService as any, url);
      const data = await response.json();
      expect(data.infrastructure).toBeDefined();
      expect(data.infrastructure.metrics).toBeDefined();
      expect(data.infrastructure.metrics.status).toBeDefined();
    });
  });

  describe("handleMetricsUnified - telemetry view", () => {
    it("returns telemetry data structure", async () => {
      const url = new URL("http://localhost:3000/metrics?view=telemetry");
      const response = await handleMetricsUnified(mockKongService as any, url);
      const data = await response.json();
      expect(data.telemetry).toBeDefined();
      expect(typeof data.telemetry.initialized).toBe("boolean");
    });
  });

  describe("handleMetricsUnified - exports view", () => {
    it("returns exports data structure", async () => {
      const url = new URL("http://localhost:3000/metrics?view=exports");
      const response = await handleMetricsUnified(mockKongService as any, url);
      const data = await response.json();
      expect(data.exports).toBeDefined();
      expect(data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe("handleMetricsUnified - config view", () => {
    it("returns configuration data structure", async () => {
      const url = new URL("http://localhost:3000/metrics?view=config");
      const response = await handleMetricsUnified(mockKongService as any, url);
      const data = await response.json();
      expect(data.configuration).toBeDefined();
      expect(data.configuration.kong).toBeDefined();
      expect(data.configuration.telemetry).toBeDefined();
    });
  });

  describe("handleMetricsUnified - full view", () => {
    it("returns all data combined", async () => {
      const url = new URL("http://localhost:3000/metrics?view=full");
      const response = await handleMetricsUnified(mockKongService as any, url);
      const data = await response.json();
      expect(data.memory).toBeDefined();
      expect(data.cache).toBeDefined();
      expect(data.infrastructure).toBeDefined();
      expect(data.exports).toBeDefined();
      expect(data.configuration).toBeDefined();
    });
  });

  describe("handleMetricsUnified - invalid view", () => {
    it("returns exact status code 400 for invalid view", async () => {
      const url = new URL("http://localhost:3000/metrics?view=invalid");
      const response = await handleMetricsUnified(mockKongService as any, url);
      expect(response.status).toBe(400);
    });

    it("returns exact error message for invalid view", async () => {
      const url = new URL("http://localhost:3000/metrics?view=invalid");
      const response = await handleMetricsUnified(mockKongService as any, url);
      const data = await response.json();
      expect(data.error).toBe("Invalid view parameter");
      expect(data.message).toBe(
        "Valid views: operational, infrastructure, telemetry, exports, config, full"
      );
    });
  });

  describe("error handling with cache stats failure", () => {
    it("uses default cache stats when getCacheStats throws", async () => {
      const failingKongService = {
        ...mockKongService,
        getCacheStats: mock(async () => {
          throw new Error("Cache stats failed");
        }),
      };

      const url = new URL("http://localhost:3000/metrics?view=operational");
      const response = await handleMetricsUnified(failingKongService as any, url);
      const data = await response.json();

      expect(data.cache).toBeDefined();
      expect(data.cache.strategy).toBe("local-memory");
      expect(data.cache.size).toBe(0);
      expect(data.cache.activeEntries).toBe(0);
      expect(data.cache.hitRate).toBe("0.00");
      expect(data.cache.averageLatencyMs).toBe(0);
    });
  });

  describe("error handling with circuit breaker stats failure", () => {
    it("uses empty object when getCircuitBreakerStats throws", async () => {
      const failingKongService = {
        ...mockKongService,
        getCircuitBreakerStats: mock(() => {
          throw new Error("Circuit breaker stats failed");
        }),
      };

      const url = new URL("http://localhost:3000/metrics?view=operational");
      const response = await handleMetricsUnified(failingKongService as any, url);
      const data = await response.json();

      expect(data.circuitBreakers).toEqual({});
    });
  });

  describe("default view parameter", () => {
    it("uses operational view when no view parameter provided", async () => {
      const url = new URL("http://localhost:3000/metrics");
      const response = await handleMetricsUnified(mockKongService as any, url);
      const data = await response.json();

      expect(data.memory).toBeDefined();
      expect(data.cache).toBeDefined();
      expect(data.circuitBreakers).toBeDefined();
    });
  });
});
