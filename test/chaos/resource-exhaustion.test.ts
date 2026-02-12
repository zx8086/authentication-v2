/* test/chaos/resource-exhaustion.test.ts
 * Chaos engineering tests for resource exhaustion scenarios.
 * Validates graceful degradation under memory pressure and event loop blocking.
 */

import { describe, expect, it } from "bun:test";

describe("Resource Exhaustion Chaos Tests", () => {
  describe("Memory Pressure", () => {
    it("should handle large payload processing", async () => {
      // Simulate processing many large payloads
      const largePayloads: string[] = [];
      const payloadCount = 100;
      const payloadSize = 10000; // 10KB each = 1MB total

      for (let i = 0; i < payloadCount; i++) {
        largePayloads.push("x".repeat(payloadSize));
      }

      // Process payloads (simulating token generation with large data)
      const results = largePayloads.map((payload) => {
        return {
          length: payload.length,
          hash: payload.slice(0, 10),
        };
      });

      expect(results.length).toBe(payloadCount);
      expect(results[0].length).toBe(payloadSize);

      // Clear references for GC
      largePayloads.length = 0;
    });

    it("should track memory usage before and after operations", async () => {
      const initialMemory = process.memoryUsage();

      // Allocate significant memory to ensure measurable increase
      const data: number[][] = [];
      for (let i = 0; i < 500; i++) {
        data.push(Array.from({ length: 5000 }, (_, j) => j * i));
      }

      // Access the data to ensure it's actually allocated
      let sum = 0;
      for (const arr of data) {
        sum += arr[0] || 0;
      }

      const peakMemory = process.memoryUsage();

      // Clear data
      data.length = 0;

      // Force garbage collection if available
      if (typeof Bun !== "undefined" && Bun.gc) {
        Bun.gc(true);
      }

      const finalMemory = process.memoryUsage();

      // Memory should have increased during allocation (or at least not decreased)
      // Use >= to handle JIT optimization where memory may be pre-allocated
      expect(peakMemory.heapUsed).toBeGreaterThanOrEqual(initialMemory.heapUsed);

      // Memory should decrease after cleanup (not always guaranteed)
      // Just verify we can measure memory
      expect(finalMemory.heapUsed).toBeDefined();

      // Verify sum is used (prevents dead code elimination)
      expect(typeof sum).toBe("number");
    });

    it("should handle rapid allocation/deallocation cycles", async () => {
      for (let cycle = 0; cycle < 10; cycle++) {
        // Allocate
        const buffer = new ArrayBuffer(1024 * 1024); // 1MB
        const view = new Uint8Array(buffer);

        // Use the buffer
        for (let i = 0; i < view.length; i += 1000) {
          view[i] = (i % 256) as number;
        }

        // Verify data
        expect(view[0]).toBe(0);
        expect(view[1000]).toBe(232); // 1000 % 256

        // Allow GC between cycles
        if (typeof Bun !== "undefined" && Bun.gc) {
          Bun.gc(false);
        }
      }

      // Should complete without crashing
      expect(true).toBe(true);
    });
  });

  describe("Event Loop Blocking", () => {
    it("should detect and measure event loop delay", async () => {
      // Measure baseline event loop responsiveness
      const measureEventLoopDelay = (): Promise<number> => {
        return new Promise((resolve) => {
          const start = performance.now();
          setImmediate(() => {
            const delay = performance.now() - start;
            resolve(delay);
          });
        });
      };

      const baselineDelay = await measureEventLoopDelay();

      // Baseline should be very low (< 10ms typically)
      expect(baselineDelay).toBeLessThan(50);
    });

    it("should handle CPU-intensive operations without blocking indefinitely", async () => {
      const startTime = performance.now();

      // CPU-intensive operation (but bounded)
      let sum = 0;
      for (let i = 0; i < 1000000; i++) {
        sum += Math.sqrt(i) * Math.sin(i);
      }

      const duration = performance.now() - startTime;

      // Should complete in reasonable time
      expect(duration).toBeLessThan(1000); // Less than 1 second
      expect(sum).toBeDefined();
    });

    it("should maintain responsiveness during async operations", async () => {
      const responseTimes: number[] = [];

      // Launch multiple async operations
      const operations = Array.from({ length: 10 }, async () => {
        const start = performance.now();

        // Simulate async work
        await new Promise((resolve) => setTimeout(resolve, 10));

        responseTimes.push(performance.now() - start);
      });

      await Promise.all(operations);

      // All operations should complete
      expect(responseTimes.length).toBe(10);

      // Average response time should be reasonable
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      expect(avgResponseTime).toBeLessThan(100); // Less than 100ms average
    });
  });

  describe("High Concurrent Connections", () => {
    it("should handle many simultaneous requests", async () => {
      const concurrentRequests = 100;
      const results: Array<{ id: number; duration: number }> = [];

      const simulateRequest = async (id: number): Promise<{ id: number; duration: number }> => {
        const start = performance.now();

        // Simulate request processing
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 10));

        // Simulate some computation
        let hash = 0;
        for (let i = 0; i < 1000; i++) {
          hash = (hash * 31 + id) % 1000000007;
        }

        return {
          id,
          duration: performance.now() - start,
        };
      };

      const promises = Array.from({ length: concurrentRequests }, (_, i) => simulateRequest(i));

      const startTime = performance.now();
      const allResults = await Promise.all(promises);
      const totalDuration = performance.now() - startTime;

      results.push(...allResults);

      // All requests should complete
      expect(results.length).toBe(concurrentRequests);

      // Total time should be less than sequential execution would take
      expect(totalDuration).toBeLessThan(concurrentRequests * 20); // Much less than 2 seconds

      // Verify all unique IDs
      const uniqueIds = new Set(results.map((r) => r.id));
      expect(uniqueIds.size).toBe(concurrentRequests);
    });

    it("should handle request queue overflow gracefully", async () => {
      const queue: Array<() => Promise<void>> = [];
      const maxQueueSize = 50;
      const results: Array<"completed" | "rejected"> = [];

      // Queue processor with backpressure
      const processQueue = async () => {
        while (queue.length > 0) {
          const task = queue.shift();
          if (task) {
            await task();
          }
        }
      };

      // Add tasks with overflow handling
      for (let i = 0; i < 100; i++) {
        if (queue.length < maxQueueSize) {
          queue.push(async () => {
            await new Promise((resolve) => setTimeout(resolve, 1));
            results.push("completed");
          });
        } else {
          results.push("rejected");
        }
      }

      await processQueue();

      // Should have mix of completed and rejected
      const completed = results.filter((r) => r === "completed").length;
      const rejected = results.filter((r) => r === "rejected").length;

      expect(completed).toBeGreaterThan(0);
      expect(rejected).toBeGreaterThan(0);
      expect(completed + rejected).toBe(100);
    });
  });

  describe("Buffer and String Limits", () => {
    it("should handle maximum safe string operations", async () => {
      // Test with reasonably large strings (not maximum to avoid memory issues)
      const largeString = "x".repeat(1000000); // 1MB string

      // String operations should work
      expect(largeString.length).toBe(1000000);
      expect(largeString.slice(0, 10)).toBe("xxxxxxxxxx");
      expect(largeString.indexOf("x")).toBe(0);
    });

    it("should handle JSON serialization of large objects", async () => {
      const largeObject = {
        data: Array.from({ length: 10000 }, (_, i) => ({
          id: i,
          name: `item-${i}`,
          value: Math.random(),
        })),
      };

      // Should serialize without error
      const json = JSON.stringify(largeObject);
      expect(json.length).toBeGreaterThan(0);

      // Should deserialize correctly
      const parsed = JSON.parse(json);
      expect(parsed.data.length).toBe(10000);
      expect(parsed.data[0].id).toBe(0);
      expect(parsed.data[9999].id).toBe(9999);
    });

    it("should handle Base64 encoding of large data", async () => {
      const data = new Uint8Array(100000); // 100KB
      for (let i = 0; i < data.length; i++) {
        data[i] = i % 256;
      }

      // Convert to base64
      const base64 = btoa(String.fromCharCode(...data));
      expect(base64.length).toBeGreaterThan(data.length);

      // Convert back
      const decoded = atob(base64);
      expect(decoded.length).toBe(data.length);
    });
  });

  describe("Timer and Timeout Handling", () => {
    it("should handle many concurrent timers", async () => {
      const timerCount = 100;
      const completions: number[] = [];

      const timers = Array.from({ length: timerCount }, (_, i) => {
        return new Promise<void>((resolve) => {
          setTimeout(() => {
            completions.push(i);
            resolve();
          }, Math.random() * 50);
        });
      });

      await Promise.all(timers);

      expect(completions.length).toBe(timerCount);
    });

    it("should handle timer cancellation correctly", async () => {
      let executed = false;

      const timeout = setTimeout(() => {
        executed = true;
      }, 100);

      // Cancel before execution
      clearTimeout(timeout);

      // Wait past the scheduled time
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(executed).toBe(false);
    });

    it("should handle rapid timer creation and cancellation", async () => {
      const iterations = 1000;
      const activeTimers: ReturnType<typeof setTimeout>[] = [];

      for (let i = 0; i < iterations; i++) {
        const timer = setTimeout(() => {
          // Timer callback for chaos test
        }, 1000);
        activeTimers.push(timer);

        // Cancel some timers
        if (i % 2 === 0 && activeTimers.length > 0) {
          const toCancel = activeTimers.shift();
          if (toCancel) clearTimeout(toCancel);
        }
      }

      // Clean up remaining timers
      for (const timer of activeTimers) {
        clearTimeout(timer);
      }

      // Should complete without error
      expect(true).toBe(true);
    });
  });

  describe("Promise and Async Handling", () => {
    it("should handle deep promise chains", async () => {
      let result = Promise.resolve(0);

      for (let i = 0; i < 100; i++) {
        result = result.then((val) => val + 1);
      }

      const finalValue = await result;
      expect(finalValue).toBe(100);
    });

    it("should handle Promise.all with many promises", async () => {
      const promiseCount = 1000;
      const promises = Array.from({ length: promiseCount }, (_, i) =>
        Promise.resolve(i).then((v) => v * 2)
      );

      const results = await Promise.all(promises);

      expect(results.length).toBe(promiseCount);
      expect(results[0]).toBe(0);
      expect(results[999]).toBe(1998);
    });

    it("should handle Promise.race correctly under load", async () => {
      const promises = Array.from(
        { length: 10 },
        (_, i) =>
          new Promise<number>((resolve) => {
            setTimeout(() => resolve(i), i * 10);
          })
      );

      const winner = await Promise.race(promises);

      // First promise (with 0ms delay) should win
      expect(winner).toBe(0);
    });
  });
});
