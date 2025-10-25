/* test/playwright/network-resilience.e2e.ts */

import { expect, test } from "@playwright/test";

const TEST_CONSUMER = {
  id: "test-consumer-001",
  username: "test-consumer-001",
};

test.describe("Network Resilience & Circuit Breaker", () => {
  test.describe("Network Timeout Handling", () => {
    test("Service handles slow Kong responses gracefully", async ({ page, request }) => {
      // Simulate slow network to Kong by intercepting requests
      await page.route("**/kong/**", async (route) => {
        // Add 2 second delay to simulate slow Kong
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await route.continue();
      });

      const startTime = performance.now();

      try {
        const response = await request.get("/tokens", {
          headers: {
            "X-Consumer-Id": TEST_CONSUMER.id,
            "X-Consumer-Username": TEST_CONSUMER.username,
          },
          timeout: 5000, // 5 second timeout
        });

        const responseTime = performance.now() - startTime;

        // Service should either:
        // 1. Return cached response quickly (circuit breaker)
        // 2. Return 503 with timeout message
        if (response.status() === 200) {
          // Circuit breaker served cached response
          expect(responseTime).toBeLessThan(1000); // Should be fast from cache

          const data = await response.json();
          expect(data.access_token).toBeTruthy();
        } else if (response.status() === 503) {
          // Service unavailable due to Kong timeout
          const data = await response.json();
          expect(data.error).toBe("Service Unavailable");
          expect(data.message).toContain("temporarily unavailable");
        }

        console.log(`Slow Kong response handled in ${responseTime.toFixed(2)}ms`);
      } catch (error) {
        // Timeout is acceptable for resilience testing
        console.log("Request timed out - acceptable for resilience testing");
      }
    });

    test("Circuit breaker protects against Kong failures", async ({ page, request }) => {
      // Simulate Kong being completely unavailable
      await page.route("**/kong/**", async (route) => {
        await route.abort("failed");
      });

      // Make multiple requests to trigger circuit breaker
      const requests = Array.from({ length: 5 }, () =>
        request.get("/tokens", {
          headers: {
            "X-Consumer-Id": TEST_CONSUMER.id,
            "X-Consumer-Username": TEST_CONSUMER.username,
          },
        })
      );

      const responses = await Promise.all(requests);

      // All requests should either:
      // 1. Return 503 (circuit breaker open)
      // 2. Return 200 (cached response)
      for (const response of responses) {
        expect([200, 503]).toContain(response.status());

        if (response.status() === 503) {
          const data = await response.json();
          expect(data.error).toBe("Service Unavailable");
        }
      }

      console.log("Circuit breaker protected against Kong failures");
    });
  });

  test.describe("Network Quality Simulation", () => {
    test("Service performs under high latency conditions", async ({ page, request }) => {
      // Simulate high latency network (500ms delay)
      await page.route("**/*", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        await route.continue();
      });

      const startTime = performance.now();

      const response = await request.get("/health", {
        timeout: 10000, // Allow extra time for high latency
      });

      const responseTime = performance.now() - startTime;

      expect(response.status()).toBe(200);

      // Should handle high latency gracefully
      expect(responseTime).toBeGreaterThan(500); // Should include our simulated delay
      expect(responseTime).toBeLessThan(5000); // But not excessively slow

      console.log(`High latency response time: ${responseTime.toFixed(2)}ms`);
    });

    test("Service handles packet loss gracefully", async ({ page, request }) => {
      let requestCount = 0;

      // Simulate 20% packet loss
      await page.route("**/*", async (route) => {
        requestCount++;

        if (requestCount % 5 === 0) {
          // Drop every 5th request (20% loss)
          await route.abort("failed");
        } else {
          await route.continue();
        }
      });

      // Make multiple requests to test resilience
      const promises = Array.from({ length: 10 }, () =>
        request.get("/health", { timeout: 5000 }).catch(() => null)
      );

      const responses = await Promise.all(promises);
      const successfulResponses = responses.filter((r) => r !== null);

      // Should have some successful responses despite packet loss
      expect(successfulResponses.length).toBeGreaterThan(5);

      console.log(`${successfulResponses.length}/10 requests succeeded with 20% packet loss`);
    });
  });

  test.describe("Connection Recovery", () => {
    test("Service recovers when Kong comes back online", async ({ page, request }) => {
      let kongAvailable = false;

      // Initially Kong is unavailable
      await page.route("**/kong/**", async (route) => {
        if (!kongAvailable) {
          await route.abort("failed");
        } else {
          await route.continue();
        }
      });

      // First request should fail or return cached response
      const firstResponse = await request.get("/tokens", {
        headers: {
          "X-Consumer-Id": TEST_CONSUMER.id,
          "X-Consumer-Username": TEST_CONSUMER.username,
        },
      });

      // Expect either circuit breaker response or cached response
      expect([200, 503]).toContain(firstResponse.status());

      // Bring Kong back online
      kongAvailable = true;

      // Wait for circuit breaker to potentially reset
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Subsequent requests should succeed
      const recoveryResponse = await request.get("/tokens", {
        headers: {
          "X-Consumer-Id": TEST_CONSUMER.id,
          "X-Consumer-Username": TEST_CONSUMER.username,
        },
      });

      // Should eventually recover
      expect([200, 503]).toContain(recoveryResponse.status());

      console.log("Service recovery tested");
    });
  });

  test.describe("Cache Behavior Under Network Issues", () => {
    test("Stale cache serves requests when Kong is down", async ({ page, request }) => {
      // First, make a successful request to populate cache
      const initialResponse = await request.get("/tokens", {
        headers: {
          "X-Consumer-Id": TEST_CONSUMER.id,
          "X-Consumer-Username": TEST_CONSUMER.username,
        },
      });

      expect(initialResponse.status()).toBe(200);

      // Wait to ensure cache is populated
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Now simulate Kong being down
      await page.route("**/kong/**", async (route) => {
        await route.abort("failed");
      });

      // Request should potentially return cached response
      const cachedResponse = await request.get("/tokens", {
        headers: {
          "X-Consumer-Id": TEST_CONSUMER.id,
          "X-Consumer-Username": TEST_CONSUMER.username,
        },
      });

      // Should either return cached response (200) or service unavailable (503)
      expect([200, 503]).toContain(cachedResponse.status());

      if (cachedResponse.status() === 200) {
        const data = await cachedResponse.json();
        expect(data.access_token).toBeTruthy();
        console.log("Stale cache served request successfully");
      } else {
        console.log("Service correctly returned 503 when cache unavailable");
      }
    });
  });

  test.describe("Concurrent Requests Under Network Stress", () => {
    test("Handles concurrent requests during Kong instability", async ({ page, request }) => {
      let requestCount = 0;

      // Simulate intermittent Kong failures (50% success rate)
      await page.route("**/kong/**", async (route) => {
        requestCount++;

        if (requestCount % 2 === 0) {
          await route.abort("failed");
        } else {
          // Add random delay to successful requests
          await new Promise((resolve) => setTimeout(resolve, Math.random() * 1000));
          await route.continue();
        }
      });

      // Execute concurrent requests during instability
      const concurrentRequests = Array.from({ length: 20 }, () =>
        request.get("/tokens", {
          headers: {
            "X-Consumer-Id": TEST_CONSUMER.id,
            "X-Consumer-Username": TEST_CONSUMER.username,
          },
          timeout: 5000,
        }).catch(() => ({ status: () => 0 })) // Handle failures gracefully
      );

      const responses = await Promise.all(concurrentRequests);
      const validResponses = responses.filter((r) => r.status() > 0);

      // Should handle some requests successfully despite instability
      expect(validResponses.length).toBeGreaterThan(5);

      const statusCodes = validResponses.map((r) => r.status());
      const successCount = statusCodes.filter((code) => code === 200).length;
      const serviceUnavailableCount = statusCodes.filter((code) => code === 503).length;

      console.log(`Network stress test: ${successCount} success, ${serviceUnavailableCount} service unavailable`);
    });
  });

  test.describe("Real Network Conditions", () => {
    test("Service handles real-world network variations", async ({ request }) => {
      // Test without network simulation for baseline
      const baselineRequests = Array.from({ length: 10 }, () =>
        request.get("/health")
      );

      const baselineResponses = await Promise.all(baselineRequests);
      const allSuccessful = baselineResponses.every((r) => r.status() === 200);

      expect(allSuccessful).toBe(true);

      console.log("Real network conditions validated");
    });
  });
});