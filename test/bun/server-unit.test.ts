/* test/bun/server-unit.test.ts */

// Pure unit tests for server endpoints using mock services

import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { MockHTTPServer, TestEnvironment } from "../shared/mock-services";
import { getTestConsumer, type JobPrefix } from "../shared/test-consumers";

describe("Authentication Server Unit Tests", () => {
  let mockServer: MockHTTPServer;
  const serverUrl = "http://localhost:3001";

  // Use job-specific consumers when running in CI environment
  const jobPrefix = Bun.env.CI_JOB_PREFIX as JobPrefix | undefined;
  const testConsumer = getTestConsumer(0, jobPrefix);
  const testConsumer2 = getTestConsumer(1, jobPrefix);

  beforeAll(async () => {
    mockServer = await TestEnvironment.setupMockServer(3001);
    await TestEnvironment.waitForServer(serverUrl + "/health");
  });

  afterAll(async () => {
    if (mockServer) {
      await mockServer.stop();
    }
  });

  describe("Health Check Endpoint", () => {
    it("should return health status", async () => {
      const response = await fetch(`${serverUrl}/health`);
      expect(response.status).toBe(200);

      const health = await response.json();
      expect(health).toHaveProperty("status");
      expect(health).toHaveProperty("timestamp");
      expect(health).toHaveProperty("version");
      expect(health).toHaveProperty("uptime");
      expect(health).toHaveProperty("dependencies");
      expect(health.dependencies).toHaveProperty("kong");

      // With mock service, it should be healthy
      expect(health.status).toBe("healthy");
      expect(health.dependencies.kong).toHaveProperty("status");
    });

    it("should include Kong connectivity information", async () => {
      const response = await fetch(`${serverUrl}/health`);
      expect(response.status).toBe(200);

      const health = await response.json();
      expect(health.dependencies.kong).toHaveProperty("responseTime");
      expect(typeof health.dependencies.kong.responseTime).toBe("number");
      expect(health.dependencies.kong.responseTime).toBeGreaterThan(0);
    });

    it("should include v2 security headers when requested", async () => {
      const response = await fetch(`${serverUrl}/health`, {
        headers: { "Accept-Version": "v2" }
      });

      expect(response.status).toBe(200);
      expect(response.headers.get("Strict-Transport-Security")).toBeTruthy();
      expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
      expect(response.headers.get("X-Frame-Options")).toBe("DENY");
      expect(response.headers.get("X-XSS-Protection")).toBeTruthy();
    });
  });

  describe("Metrics Endpoint", () => {
    it("should return performance metrics", async () => {
      const response = await fetch(`${serverUrl}/metrics`);
      expect(response.status).toBe(200);

      const metrics = await response.json();
      expect(metrics).toHaveProperty("timestamp");
      expect(metrics).toHaveProperty("uptime");
      expect(metrics).toHaveProperty("memory");
      expect(metrics).toHaveProperty("telemetry");

      expect(typeof metrics.memory.used).toBe("number");
      expect(typeof metrics.memory.total).toBe("number");
      expect(typeof metrics.memory.rss).toBe("number");
    });

    it("should include circuit breaker information in operational metrics", async () => {
      const response = await fetch(`${serverUrl}/metrics`);
      expect(response.status).toBe(200);

      const metrics = await response.json();
      expect(metrics).toHaveProperty("circuitBreakers");
      expect(typeof metrics.circuitBreakers).toBe("object");
    });

    it("should return metrics with various view parameters", async () => {
      const views = ["operational", "infrastructure", "telemetry", "exports", "config", "full"];

      for (const view of views) {
        const response = await fetch(`${serverUrl}/metrics?view=${view}`);
        expect(response.status).toBe(200);

        const metrics = await response.json();
        expect(metrics).toHaveProperty("timestamp");

        if (view === "operational" || view === "full") {
          expect(metrics).toHaveProperty("circuitBreakers");
        }
      }
    });
  });

  describe("Health Metrics Endpoint", () => {
    it("should return metrics health information", async () => {
      const response = await fetch(`${serverUrl}/health/metrics`);
      expect(response.status).toBe(200);

      const metricsHealth = await response.json();
      expect(metricsHealth).toHaveProperty("timestamp");
      expect(metricsHealth).toHaveProperty("metrics");
      expect(metricsHealth).toHaveProperty("circuitBreakers");
      expect(metricsHealth.metrics).toHaveProperty("exports");
    });

    it("should include circuit breaker summary in metrics health", async () => {
      const response = await fetch(`${serverUrl}/health/metrics`);
      expect(response.status).toBe(200);

      const metricsHealth = await response.json();
      expect(metricsHealth).toHaveProperty("circuitBreakers");

      const circuitBreakers = metricsHealth.circuitBreakers;
      expect(circuitBreakers).toHaveProperty("enabled");
      expect(circuitBreakers).toHaveProperty("totalBreakers");
      expect(circuitBreakers).toHaveProperty("states");

      expect(typeof circuitBreakers.enabled).toBe("boolean");
      expect(typeof circuitBreakers.totalBreakers).toBe("number");
      expect(circuitBreakers.states).toHaveProperty("closed");
      expect(circuitBreakers.states).toHaveProperty("open");
      expect(circuitBreakers.states).toHaveProperty("halfOpen");

      expect(typeof circuitBreakers.states.closed).toBe("number");
      expect(typeof circuitBreakers.states.open).toBe("number");
      expect(typeof circuitBreakers.states.halfOpen).toBe("number");
    });

    it("should respond quickly for metrics health checks", async () => {
      const start = Bun.nanoseconds();
      const response = await fetch(`${serverUrl}/health/metrics`);
      const duration = (Bun.nanoseconds() - start) / 1_000_000;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(100); // Should respond within 100ms
    });
  });

  describe("Token Endpoint", () => {
    it("should reject requests without Kong headers", async () => {
      const response = await fetch(`${serverUrl}/tokens`);

      expect(response.status).toBe(401);

      const error = await response.json();
      expect(error).toHaveProperty("error", "Unauthorized");
      expect(error).toHaveProperty("message");
    });

    it("should reject anonymous consumers", async () => {
      const response = await fetch(`${serverUrl}/tokens`, {
        headers: {
          "X-Consumer-Id": testConsumer.id,
          "X-Consumer-Username": testConsumer.username,
          "X-Anonymous-Consumer": "true",
        },
      });

      expect(response.status).toBe(401);

      const error = await response.json();
      expect(error).toHaveProperty("error", "Unauthorized");
      expect(error.message).toContain("Anonymous consumers");
    });

    it("should issue token for valid consumer", async () => {
      const response = await fetch(`${serverUrl}/tokens`, {
        headers: {
          "X-Consumer-Id": testConsumer.id,
          "X-Consumer-Username": testConsumer.username,
          "X-Anonymous-Consumer": "false",
        },
      });

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("application/json");
      expect(response.headers.get("X-Request-Id")).toBeTruthy();

      const tokenResponse = await response.json();
      expect(tokenResponse).toHaveProperty("access_token");
      expect(tokenResponse).toHaveProperty("expires_in", 900);

      // Validate JWT structure
      const tokenParts = tokenResponse.access_token.split(".");
      expect(tokenParts).toHaveLength(3);

      // Validate JWT payload
      const payload = JSON.parse(atob(tokenParts[1].replace(/-/g, "+").replace(/_/g, "/")));
      expect(payload.sub).toBe(testConsumer.username);
      expect(payload.iss).toBe("https://api.pvhcorp.com");
      expect(payload.aud).toBe("pvh-api");
    });

    it("should handle missing consumer ID header", async () => {
      const response = await fetch(`${serverUrl}/tokens`, {
        headers: {
          "X-Consumer-Username": testConsumer.username,
        },
      });

      expect(response.status).toBe(401);
    });

    it("should handle missing consumer username header", async () => {
      const response = await fetch(`${serverUrl}/tokens`, {
        headers: {
          "X-Consumer-Id": testConsumer.id,
        },
      });

      expect(response.status).toBe(401);
    });

    it("should handle token generation for different consumers", async () => {
      const response = await fetch(`${serverUrl}/tokens`, {
        headers: {
          "X-Consumer-Id": testConsumer2.id,
          "X-Consumer-Username": testConsumer2.username,
          "X-Anonymous-Consumer": "false",
        },
      });

      // Should work with mock service
      expect(response.status).toBe(200);

      const tokenResponse = await response.json();
      expect(tokenResponse).toHaveProperty("access_token");
      expect(tokenResponse).toHaveProperty("expires_in", 900);

      // Validate JWT structure for second consumer
      const tokenParts = tokenResponse.access_token.split(".");
      expect(tokenParts).toHaveLength(3);

      const payload = JSON.parse(atob(tokenParts[1].replace(/-/g, "+").replace(/_/g, "/")));
      expect(payload.sub).toBe(testConsumer2.username);
    });
  });

  describe("Error Handling", () => {
    it("should return 404 for unknown paths", async () => {
      const response = await fetch(`${serverUrl}/unknown-path`);
      expect(response.status).toBe(404);

      const error = await response.json();
      expect(error).toHaveProperty("error", "Not Found");
    });

    it("should return 401 for unsupported methods on /tokens", async () => {
      const response = await fetch(`${serverUrl}/tokens`, {
        method: "POST",
      });
      expect(response.status).toBe(401);

      const error = await response.json();
      expect(error).toHaveProperty("error", "Unauthorized");
    });

    it("should include request ID in error responses", async () => {
      const response = await fetch(`${serverUrl}/unknown-path`);
      expect(response.headers.get("X-Request-Id")).toBeTruthy();

      const error = await response.json();
      expect(error).not.toHaveProperty("requestId"); // Not exposed in body for security
    });
  });

  describe("Performance", () => {
    it("should handle concurrent requests efficiently", async () => {
      const concurrentRequests = 10;

      const start = Bun.nanoseconds();
      const requests = Array.from(
        { length: concurrentRequests },
        () => fetch(`${serverUrl}/health`)
      );

      const responses = await Promise.all(requests);
      const duration = (Bun.nanoseconds() - start) / 1_000_000;

      // All health check requests should succeed with mock service
      const successCount = responses.filter((r) => r.status === 200).length;
      expect(successCount).toBe(concurrentRequests);

      // Should handle concurrent requests efficiently
      expect(duration).toBeLessThan(1000); // Within 1 second for mock service
    });

    it("should respond to health checks quickly", async () => {
      const start = Bun.nanoseconds();
      const response = await fetch(`${serverUrl}/health`);
      const duration = (Bun.nanoseconds() - start) / 1_000_000;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(100); // Fast response from mock service
    });
  });
});