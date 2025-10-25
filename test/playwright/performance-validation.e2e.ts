/* test/playwright/performance-validation.e2e.ts */

import { expect, test } from "@playwright/test";
import { PerformanceHelper } from "./utils/test-helpers";

const TEST_CONSUMER = {
  id: "test-consumer-001",
  username: "test-consumer-001",
};

test.describe("Performance SLA Validation", () => {
  test.describe("Response Time SLAs", () => {
    test("JWT generation meets sub-10ms p99 SLA", async ({ request }) => {
      const headers = {
        "X-Consumer-Id": TEST_CONSUMER.id,
        "X-Consumer-Username": TEST_CONSUMER.username,
      };

      const performance = await PerformanceHelper.measureMultipleRequests(
        request,
        "/tokens",
        headers,
        50 // Increased sample size for accurate percentiles
      );

      // Sub-10ms p99 for JWT generation (service requirement)
      expect(performance.p99).toBeLessThan(10);
      expect(performance.p95).toBeLessThan(5);

      console.log(`JWT Generation Performance: P95=${performance.p95.toFixed(2)}ms, P99=${performance.p99.toFixed(2)}ms`);
    });

    test("Health endpoint responds within 5ms p95", async ({ request }) => {
      const performance = await PerformanceHelper.measureMultipleRequests(
        request,
        "/health",
        {},
        30
      );

      // Health checks should be extremely fast
      expect(performance.p95).toBeLessThan(5);
      expect(performance.p99).toBeLessThan(10);

      console.log(`Health Check Performance: P95=${performance.p95.toFixed(2)}ms, P99=${performance.p99.toFixed(2)}ms`);
    });

    test("Metrics endpoint performance under load", async ({ request }) => {
      const performance = await PerformanceHelper.measureMultipleRequests(
        request,
        "/metrics",
        {},
        20
      );

      // Metrics should be cached and fast
      expect(performance.p95).toBeLessThan(15);
      expect(performance.p99).toBeLessThan(25);

      console.log(`Metrics Performance: P95=${performance.p95.toFixed(2)}ms, P99=${performance.p99.toFixed(2)}ms`);
    });
  });

  test.describe("Cold Start Performance", () => {
    test("Service cold start under 100ms", async ({ request }) => {
      // This test assumes the service is started fresh
      const startTime = performance.now();

      try {
        const response = await request.get("/health", {
          timeout: 5000, // 5 second timeout for cold start
        });

        const responseTime = performance.now() - startTime;

        expect(response.status()).toBe(200);
        // Cold start should be under 100ms (service requirement)
        expect(responseTime).toBeLessThan(100);

        console.log(`Cold start time: ${responseTime.toFixed(2)}ms`);
      } catch (error) {
        // If timeout occurs, cold start took too long
        throw new Error(`Cold start exceeded 100ms SLA: ${error.message}`);
      }
    });
  });

  test.describe("Concurrent Request Performance", () => {
    test("Maintains performance under concurrent load", async ({ request }) => {
      const headers = {
        "X-Consumer-Id": TEST_CONSUMER.id,
        "X-Consumer-Username": TEST_CONSUMER.username,
      };

      // Execute 20 concurrent requests
      const concurrentRequests = Array.from({ length: 20 }, () =>
        PerformanceHelper.measureResponseTime(() =>
          request.get("/tokens", { headers })
        )
      );

      const responseTimes = await Promise.all(concurrentRequests);

      // Calculate percentiles for concurrent execution
      const p95 = PerformanceHelper.calculatePercentile(responseTimes, 95);
      const p99 = PerformanceHelper.calculatePercentile(responseTimes, 99);

      // Performance should not degrade significantly under concurrency
      expect(p95).toBeLessThan(15); // Allow slight degradation under load
      expect(p99).toBeLessThan(25);

      console.log(`Concurrent Performance: P95=${p95.toFixed(2)}ms, P99=${p99.toFixed(2)}ms`);
    });

    test("Different consumers concurrent performance", async ({ request }) => {
      const consumers = [
        { id: "test-consumer-001", username: "test-consumer-001" },
        { id: "test-consumer-002", username: "test-consumer-002" },
        { id: "test-consumer-003", username: "test-consumer-003" },
      ];

      // Test concurrent requests from different consumers
      const concurrentRequests = consumers.flatMap((consumer) =>
        Array.from({ length: 5 }, () =>
          PerformanceHelper.measureResponseTime(() =>
            request.get("/tokens", {
              headers: {
                "X-Consumer-Id": consumer.id,
                "X-Consumer-Username": consumer.username,
              },
            })
          )
        )
      );

      const responseTimes = await Promise.all(concurrentRequests);
      const p95 = PerformanceHelper.calculatePercentile(responseTimes, 95);

      // Multi-consumer performance should remain consistent
      expect(p95).toBeLessThan(20);

      console.log(`Multi-consumer P95: ${p95.toFixed(2)}ms`);
    });
  });

  test.describe("Memory Efficiency Validation", () => {
    test("Memory usage remains stable during load", async ({ request }) => {
      // Get initial memory baseline
      const initialMetrics = await request.get("/metrics");
      const initialData = await initialMetrics.json();
      const initialMemory = initialData.memory.used;

      // Execute sustained load (100 requests)
      const headers = {
        "X-Consumer-Id": TEST_CONSUMER.id,
        "X-Consumer-Username": TEST_CONSUMER.username,
      };

      const loadRequests = Array.from({ length: 100 }, () =>
        request.get("/tokens", { headers })
      );

      await Promise.all(loadRequests);

      // Check memory after load
      const finalMetrics = await request.get("/metrics");
      const finalData = await finalMetrics.json();
      const finalMemory = finalData.memory.used;

      // Memory growth should be minimal (less than 10MB increase)
      const memoryGrowth = finalMemory - initialMemory;
      expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024); // 10MB

      console.log(`Memory growth under load: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB`);
    });
  });

  test.describe("Network Performance", () => {
    test("Response payload size optimization", async ({ request }) => {
      const response = await request.get("/tokens", {
        headers: {
          "X-Consumer-Id": TEST_CONSUMER.id,
          "X-Consumer-Username": TEST_CONSUMER.username,
        },
      });

      const data = await response.json();
      const responseSize = JSON.stringify(data).length;

      // JWT response should be minimal and efficient
      expect(responseSize).toBeLessThan(1000); // 1KB max
      expect(data.access_token).toBeTruthy();
      expect(data.expires_in).toBe(900);

      console.log(`JWT response size: ${responseSize} bytes`);
    });

    test("Health check payload efficiency", async ({ request }) => {
      const response = await request.get("/health");
      const data = await response.json();
      const responseSize = JSON.stringify(data).length;

      // Health response should be concise
      expect(responseSize).toBeLessThan(500); // 500 bytes max

      console.log(`Health response size: ${responseSize} bytes`);
    });
  });

  test.describe("Error Response Performance", () => {
    test("Error responses are fast", async ({ request }) => {
      const errorTime = await PerformanceHelper.measureResponseTime(() =>
        request.get("/tokens") // Missing headers, should error quickly
      );

      // Error responses should be even faster than success
      expect(errorTime).toBeLessThan(5);

      console.log(`Error response time: ${errorTime.toFixed(2)}ms`);
    });

    test("Invalid consumer error performance", async ({ request }) => {
      const errorTime = await PerformanceHelper.measureResponseTime(() =>
        request.get("/tokens", {
          headers: {
            "X-Consumer-Id": "invalid-consumer",
            "X-Consumer-Username": "invalid-user",
          },
        })
      );

      // Invalid consumer checks should be fast
      expect(errorTime).toBeLessThan(100); // Allow for Kong round-trip

      console.log(`Invalid consumer error time: ${errorTime.toFixed(2)}ms`);
    });
  });
});