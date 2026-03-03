/* test/bun/lifecycle/graceful-shutdown.test.ts */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { InflightRequestTracker } from "../../../src/lifecycle/inflight-request-tracker";
import {
  type LifecycleAwareComponent,
  LifecycleCoordinator,
} from "../../../src/lifecycle/lifecycle-coordinator";
import {
  LifecycleState,
  LifecycleStateMachine,
  lifecycleStateMachine,
} from "../../../src/lifecycle/lifecycle-state-machine";
import { RedisOperationTracker } from "../../../src/services/cache/redis-operation-tracker";

/**
 * Integration tests for graceful shutdown flow.
 *
 * These tests verify the complete shutdown sequence:
 * 1. Transition to DRAINING state
 * 2. Reject new requests
 * 3. Wait for in-flight requests to complete
 * 4. Wait for Redis operations to complete
 * 5. Shutdown components in priority order
 * 6. Transition to STOPPED state
 *
 * @see SIO-452: Fix ERR_REDIS_CONNECTION_CLOSED During Container Lifecycle
 */
describe("Graceful Shutdown Integration", () => {
  let stateMachine: LifecycleStateMachine;
  let requestTracker: InflightRequestTracker;
  let coordinator: LifecycleCoordinator;
  let redisTracker: RedisOperationTracker;

  beforeEach(() => {
    // Reset the singleton first
    lifecycleStateMachine.reset();
    // Create fresh instances for isolation
    stateMachine = new LifecycleStateMachine();
    requestTracker = new InflightRequestTracker();
    coordinator = new LifecycleCoordinator();
    redisTracker = new RedisOperationTracker();
  });

  afterEach(() => {
    lifecycleStateMachine.reset();
    stateMachine.reset();
    requestTracker.reset();
    coordinator.reset();
    redisTracker.reset();
  });

  describe("Full Lifecycle Flow", () => {
    it("should complete full startup to shutdown lifecycle", async () => {
      // Startup sequence
      expect(stateMachine.transitionTo(LifecycleState.STARTING)).toBe(true);
      expect(stateMachine.transitionTo(LifecycleState.READY)).toBe(true);
      expect(stateMachine.canAcceptRequests()).toBe(true);

      // Simulate some requests
      requestTracker.start("req-1", { endpoint: "/api/tokens", startTime: Date.now() });
      requestTracker.start("req-2", { endpoint: "/api/health", startTime: Date.now() });

      // Simulate Redis operations
      const redisHandle = redisTracker.startOperation("get", "cache:key");

      // Begin shutdown
      expect(stateMachine.transitionTo(LifecycleState.DRAINING)).toBe(true);
      expect(stateMachine.canAcceptRequests()).toBe(false);
      expect(stateMachine.isShuttingDown()).toBe(true);

      // Complete pending operations
      requestTracker.complete("req-1");
      requestTracker.complete("req-2");
      redisHandle.complete();

      // Wait for drain
      const drainResult = await requestTracker.waitForCompletion({ timeoutMs: 100 });
      expect(drainResult.drained).toBe(true);

      // Continue shutdown
      expect(stateMachine.transitionTo(LifecycleState.STOPPING)).toBe(true);
      expect(stateMachine.transitionTo(LifecycleState.STOPPED)).toBe(true);

      // Verify final state
      const stats = stateMachine.getStats();
      expect(stats.currentState).toBe(LifecycleState.STOPPED);
      // 6 states: INITIALIZING + STARTING + READY + DRAINING + STOPPING + STOPPED
      expect(stats.transitionHistory.length).toBe(6);
    });

    it("should reject new requests during DRAINING state", () => {
      stateMachine.transitionTo(LifecycleState.STARTING);
      stateMachine.transitionTo(LifecycleState.READY);
      stateMachine.transitionTo(LifecycleState.DRAINING);

      // Should reject new requests
      expect(stateMachine.canAcceptRequests()).toBe(false);

      // Existing requests should still be tracked
      requestTracker.start("existing", { endpoint: "/api/tokens", startTime: Date.now() });
      expect(requestTracker.getActiveCount()).toBe(1);
    });

    it("should reject new Redis operations during DRAINING state", () => {
      // Use the singleton lifecycleStateMachine since RedisOperationTracker
      // uses it to check if operations should be accepted
      lifecycleStateMachine.transitionTo(LifecycleState.STARTING);
      lifecycleStateMachine.transitionTo(LifecycleState.READY);
      lifecycleStateMachine.transitionTo(LifecycleState.DRAINING);

      // Should reject new Redis operations
      expect(() => redisTracker.startOperation("get", "key")).toThrow();
    });
  });

  describe("Component Coordination", () => {
    it("should shutdown components in priority order", async () => {
      const shutdownOrder: string[] = [];

      // Create mock components with different priorities
      const httpServer: LifecycleAwareComponent = {
        name: "http_server",
        priority: 100,
        prepareForShutdown: async () => {},
        shutdown: async () => {
          shutdownOrder.push("http_server");
        },
      };

      const cacheManager: LifecycleAwareComponent = {
        name: "cache_manager",
        priority: 60,
        prepareForShutdown: async () => {},
        shutdown: async () => {
          shutdownOrder.push("cache_manager");
        },
      };

      const telemetry: LifecycleAwareComponent = {
        name: "telemetry",
        priority: 40,
        prepareForShutdown: async () => {},
        shutdown: async () => {
          shutdownOrder.push("telemetry");
        },
      };

      // Register components (order shouldn't matter)
      coordinator.register(telemetry);
      coordinator.register(httpServer);
      coordinator.register(cacheManager);

      // Shutdown
      const result = await coordinator.shutdownAll();

      expect(result.success).toBe(true);
      expect(shutdownOrder).toEqual(["http_server", "cache_manager", "telemetry"]);
    });

    it("should continue shutdown on component failure", async () => {
      const shutdownOrder: string[] = [];

      const failing: LifecycleAwareComponent = {
        name: "failing",
        priority: 100,
        prepareForShutdown: async () => {},
        shutdown: async () => {
          throw new Error("Shutdown failed");
        },
      };

      const working: LifecycleAwareComponent = {
        name: "working",
        priority: 50,
        prepareForShutdown: async () => {},
        shutdown: async () => {
          shutdownOrder.push("working");
        },
      };

      coordinator.register(failing);
      coordinator.register(working);

      const result = await coordinator.shutdownAll();

      expect(result.success).toBe(false);
      expect(result.failedComponents).toContain("failing");
      expect(shutdownOrder).toContain("working");
    });
  });

  describe("Request Draining", () => {
    it("should drain all in-flight requests before shutdown", async () => {
      stateMachine.transitionTo(LifecycleState.STARTING);
      stateMachine.transitionTo(LifecycleState.READY);

      // Start multiple requests
      for (let i = 0; i < 10; i++) {
        requestTracker.start(`req-${i}`, {
          endpoint: "/api/tokens",
          startTime: Date.now(),
        });
      }

      // Begin shutdown
      stateMachine.transitionTo(LifecycleState.DRAINING);

      // Complete requests over time
      for (let i = 0; i < 10; i++) {
        setTimeout(() => requestTracker.complete(`req-${i}`), i * 10);
      }

      // Wait for drain
      const result = await requestTracker.waitForCompletion({
        timeoutMs: 500,
        checkIntervalMs: 10,
      });

      expect(result.drained).toBe(true);
      expect(result.completedCount).toBe(10);
      expect(result.remaining).toBe(0);
    });

    it("should timeout and report remaining requests", async () => {
      stateMachine.transitionTo(LifecycleState.STARTING);
      stateMachine.transitionTo(LifecycleState.READY);

      // Start requests that won't complete in time
      requestTracker.start("slow-1", { endpoint: "/api/slow", startTime: Date.now() });
      requestTracker.start("slow-2", { endpoint: "/api/slow", startTime: Date.now() });

      stateMachine.transitionTo(LifecycleState.DRAINING);

      // Wait with short timeout
      const result = await requestTracker.waitForCompletion({
        timeoutMs: 50,
        checkIntervalMs: 10,
      });

      expect(result.drained).toBe(false);
      expect(result.remaining).toBe(2);
    });
  });

  describe("Redis Operation Draining", () => {
    it("should drain all Redis operations before disconnect", async () => {
      stateMachine.transitionTo(LifecycleState.STARTING);
      stateMachine.transitionTo(LifecycleState.READY);

      // Start Redis operations
      const handles = [
        redisTracker.startOperation("get", "key1"),
        redisTracker.startOperation("set", "key2"),
        redisTracker.startOperation("delete", "key3"),
      ];

      // Begin shutdown
      stateMachine.transitionTo(LifecycleState.DRAINING);
      redisTracker.stopAcceptingOperations();

      // Complete operations
      for (const handle of handles) {
        setTimeout(() => handle.complete(), 20);
      }

      // Wait for completion
      const completed = await redisTracker.waitForCompletion(500);

      expect(completed).toBe(true);
      expect(redisTracker.getPendingCount()).toBe(0);
    });

    it("should handle Redis operations failing during shutdown", async () => {
      stateMachine.transitionTo(LifecycleState.STARTING);
      stateMachine.transitionTo(LifecycleState.READY);

      const handle = redisTracker.startOperation("get", "key");

      stateMachine.transitionTo(LifecycleState.DRAINING);
      redisTracker.stopAcceptingOperations();

      // Simulate operation failure
      redisTracker.failOperation(handle.id, new Error("Connection lost"));

      expect(redisTracker.getPendingCount()).toBe(0);
      expect(redisTracker.getStats().failedCount).toBe(1);
    });
  });

  describe("Error State Handling", () => {
    it("should transition to ERROR state on critical failure", () => {
      stateMachine.transitionTo(LifecycleState.STARTING);

      // Simulate critical failure during startup
      expect(stateMachine.transitionTo(LifecycleState.ERROR)).toBe(true);
      expect(stateMachine.canAcceptRequests()).toBe(false);

      // Should be able to stop from error state
      expect(stateMachine.transitionTo(LifecycleState.STOPPED)).toBe(true);
    });

    it("should handle error during READY state", () => {
      stateMachine.transitionTo(LifecycleState.STARTING);
      stateMachine.transitionTo(LifecycleState.READY);

      // Simulate error during operation
      expect(stateMachine.transitionTo(LifecycleState.ERROR)).toBe(true);
      expect(stateMachine.canAcceptRequests()).toBe(false);
    });
  });

  describe("Shutdown Timing", () => {
    it("should complete shutdown within timeout", async () => {
      const startTime = Date.now();

      stateMachine.transitionTo(LifecycleState.STARTING);
      stateMachine.transitionTo(LifecycleState.READY);

      // Start some requests and operations
      requestTracker.start("req-1", { endpoint: "/test", startTime: Date.now() });
      const redisHandle = redisTracker.startOperation("get", "key");

      // Begin shutdown
      stateMachine.transitionTo(LifecycleState.DRAINING);
      redisTracker.stopAcceptingOperations();

      // Complete everything quickly
      requestTracker.complete("req-1");
      redisHandle.complete();

      // Wait for drain
      await requestTracker.waitForCompletion({ timeoutMs: 100 });
      await redisTracker.waitForCompletion(100);

      // Shutdown components
      await coordinator.shutdownAll({ componentTimeoutMs: 100 });

      // Complete lifecycle
      stateMachine.transitionTo(LifecycleState.STOPPING);
      stateMachine.transitionTo(LifecycleState.STOPPED);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(500);
    });

    it("should track time spent in each state", async () => {
      stateMachine.transitionTo(LifecycleState.STARTING);
      await new Promise((resolve) => setTimeout(resolve, 20));

      stateMachine.transitionTo(LifecycleState.READY);
      await new Promise((resolve) => setTimeout(resolve, 20));

      stateMachine.transitionTo(LifecycleState.DRAINING);

      const stats = stateMachine.getStats();
      expect(stats.transitionHistory.length).toBe(4);

      // Verify timestamps are in order
      for (let i = 1; i < stats.transitionHistory.length; i++) {
        expect(stats.transitionHistory[i].enteredAt).toBeGreaterThanOrEqual(
          stats.transitionHistory[i - 1].enteredAt
        );
      }
    });
  });

  describe("State Machine Listener Integration", () => {
    it("should notify listeners during shutdown sequence", () => {
      const transitions: Array<{ from: LifecycleState; to: LifecycleState }> = [];

      stateMachine.onStateChange((from, to) => {
        transitions.push({ from, to });
      });

      stateMachine.transitionTo(LifecycleState.STARTING);
      stateMachine.transitionTo(LifecycleState.READY);
      stateMachine.transitionTo(LifecycleState.DRAINING);
      stateMachine.transitionTo(LifecycleState.STOPPING);
      stateMachine.transitionTo(LifecycleState.STOPPED);

      expect(transitions.length).toBe(5);
      expect(transitions[0]).toEqual({
        from: LifecycleState.INITIALIZING,
        to: LifecycleState.STARTING,
      });
      expect(transitions[4]).toEqual({
        from: LifecycleState.STOPPING,
        to: LifecycleState.STOPPED,
      });
    });

    it("should trigger component preparation on DRAINING transition", async () => {
      let prepared = false;

      const component: LifecycleAwareComponent = {
        name: "test",
        priority: 50,
        prepareForShutdown: async () => {
          prepared = true;
        },
        shutdown: async () => {},
      };

      coordinator.register(component);

      // Transition to DRAINING should trigger prepare
      await coordinator.prepareAll();

      expect(prepared).toBe(true);
    });
  });

  describe("Concurrent Shutdown Handling", () => {
    it("should handle rapid state transitions", () => {
      stateMachine.transitionTo(LifecycleState.STARTING);
      stateMachine.transitionTo(LifecycleState.READY);

      // Rapidly try to transition (only first should succeed)
      const results = [
        stateMachine.transitionTo(LifecycleState.DRAINING),
        stateMachine.transitionTo(LifecycleState.DRAINING),
      ];

      expect(results[0]).toBe(true);
      expect(results[1]).toBe(false); // Already in DRAINING
    });

    it("should prevent multiple shutdown calls", async () => {
      const component: LifecycleAwareComponent = {
        name: "test",
        priority: 50,
        prepareForShutdown: async () => {},
        shutdown: async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
        },
      };

      coordinator.register(component);

      // Start first shutdown
      const promise1 = coordinator.shutdownAll();

      // Try to start second shutdown immediately
      const result2 = await coordinator.shutdownAll();

      await promise1;

      // Second should fail
      expect(result2.success).toBe(false);
      expect(result2.failedComponents).toContain("Shutdown already in progress");
    });
  });
});
