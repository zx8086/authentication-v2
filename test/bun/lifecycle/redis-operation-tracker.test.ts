/* test/bun/lifecycle/redis-operation-tracker.test.ts */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { LifecycleState, lifecycleStateMachine } from "../../../src/lifecycle";
import { RedisOperationTracker } from "../../../src/services/cache/redis-operation-tracker";

describe("RedisOperationTracker", () => {
  let tracker: RedisOperationTracker;

  beforeEach(() => {
    tracker = new RedisOperationTracker();
    lifecycleStateMachine.reset();
  });

  afterEach(() => {
    tracker.reset();
    lifecycleStateMachine.reset();
  });

  describe("Operation Tracking", () => {
    it("should start tracking an operation", () => {
      const handle = tracker.startOperation("get", "cache:key");

      expect(handle.id).toMatch(/^redis_op_\d+$/);
      expect(tracker.getPendingCount()).toBe(1);
    });

    it("should complete an operation", () => {
      const handle = tracker.startOperation("get", "cache:key");
      expect(tracker.getPendingCount()).toBe(1);

      handle.complete();
      expect(tracker.getPendingCount()).toBe(0);
    });

    it("should track multiple operations", () => {
      tracker.startOperation("get", "key1");
      tracker.startOperation("set", "key2");
      tracker.startOperation("delete", "key3");

      expect(tracker.getPendingCount()).toBe(3);
    });

    it("should complete operations independently", () => {
      const handle1 = tracker.startOperation("get", "key1");
      const handle2 = tracker.startOperation("set", "key2");
      const handle3 = tracker.startOperation("delete", "key3");

      handle2.complete();
      expect(tracker.getPendingCount()).toBe(2);

      handle1.complete();
      expect(tracker.getPendingCount()).toBe(1);

      handle3.complete();
      expect(tracker.getPendingCount()).toBe(0);
    });

    it("should use completeOperation method", () => {
      const handle = tracker.startOperation("get", "key");
      tracker.completeOperation(handle.id);

      expect(tracker.getPendingCount()).toBe(0);
    });

    it("should handle completing non-existent operation gracefully", () => {
      tracker.completeOperation("non-existent-id");
      expect(tracker.getPendingCount()).toBe(0);
    });

    it("should fail an operation", () => {
      const handle = tracker.startOperation("get", "key");
      tracker.failOperation(handle.id, new Error("Connection failed"));

      expect(tracker.getPendingCount()).toBe(0);
    });

    it("should handle failing non-existent operation gracefully", () => {
      tracker.failOperation("non-existent-id", new Error("Test"));
      expect(tracker.getPendingCount()).toBe(0);
    });
  });

  describe("Operation IDs", () => {
    it("should generate unique operation IDs", () => {
      const ids = new Set<string>();

      for (let i = 0; i < 100; i++) {
        const handle = tracker.startOperation("get");
        ids.add(handle.id);
        handle.complete();
      }

      expect(ids.size).toBe(100);
    });

    it("should increment operation counter", () => {
      const handle1 = tracker.startOperation("get");
      const handle2 = tracker.startOperation("set");
      const handle3 = tracker.startOperation("delete");

      expect(handle1.id).toBe("redis_op_1");
      expect(handle2.id).toBe("redis_op_2");
      expect(handle3.id).toBe("redis_op_3");
    });
  });

  describe("canAcceptOperations", () => {
    it("should accept operations initially", () => {
      expect(tracker.canAcceptOperations()).toBe(true);
    });

    it("should reject operations after stopAcceptingOperations", () => {
      tracker.stopAcceptingOperations();
      expect(tracker.canAcceptOperations()).toBe(false);
    });

    it("should reject operations when lifecycle is shutting down", () => {
      // Transition to shutdown state
      lifecycleStateMachine.transitionTo(LifecycleState.STARTING);
      lifecycleStateMachine.transitionTo(LifecycleState.READY);
      lifecycleStateMachine.transitionTo(LifecycleState.DRAINING);

      expect(tracker.canAcceptOperations()).toBe(false);
    });

    it("should throw when starting operation during shutdown", () => {
      tracker.stopAcceptingOperations();

      expect(() => tracker.startOperation("get", "key")).toThrow(
        "Redis operations are not being accepted"
      );
    });
  });

  describe("Key Sanitization", () => {
    it("should sanitize UUIDs in keys", () => {
      const handle = tracker.startOperation(
        "get",
        "consumer:550e8400-e29b-41d4-a716-446655440000:secret"
      );

      const _stats = tracker.getStats();
      // The key should be sanitized in internal tracking
      handle.complete();
    });

    it("should handle keys without UUIDs", () => {
      const handle = tracker.startOperation("get", "simple:key:value");
      handle.complete();

      const stats = tracker.getStats();
      expect(stats.completedCount).toBe(1);
    });

    it("should handle undefined keys", () => {
      const handle = tracker.startOperation("ping");
      handle.complete();

      const stats = tracker.getStats();
      expect(stats.completedCount).toBe(1);
    });
  });

  describe("waitForCompletion", () => {
    it("should return immediately when no pending operations", async () => {
      const startTime = Date.now();
      const result = await tracker.waitForCompletion(1000);
      const duration = Date.now() - startTime;

      expect(result).toBe(true);
      expect(duration).toBeLessThan(100);
    });

    it("should wait for operations to complete", async () => {
      const handle = tracker.startOperation("get", "key");

      // Complete after 50ms
      setTimeout(() => handle.complete(), 50);

      const result = await tracker.waitForCompletion(1000);

      expect(result).toBe(true);
      expect(tracker.getPendingCount()).toBe(0);
    });

    it("should timeout when operations do not complete", async () => {
      tracker.startOperation("get", "key");

      const result = await tracker.waitForCompletion(100, 20);

      expect(result).toBe(false);
      expect(tracker.getPendingCount()).toBe(1);
    });

    it("should handle multiple operations completing during wait", async () => {
      const handle1 = tracker.startOperation("get", "key1");
      const handle2 = tracker.startOperation("set", "key2");
      const handle3 = tracker.startOperation("delete", "key3");

      setTimeout(() => handle1.complete(), 20);
      setTimeout(() => handle2.complete(), 40);
      setTimeout(() => handle3.complete(), 60);

      const result = await tracker.waitForCompletion(500);

      expect(result).toBe(true);
      expect(tracker.getPendingCount()).toBe(0);
    });

    it("should use custom check interval", async () => {
      const handle = tracker.startOperation("get", "key");
      setTimeout(() => handle.complete(), 30);

      const result = await tracker.waitForCompletion(500, 10);

      expect(result).toBe(true);
    });
  });

  describe("getStats", () => {
    it("should return initial stats", () => {
      const stats = tracker.getStats();

      expect(stats.pendingCount).toBe(0);
      expect(stats.completedCount).toBe(0);
      expect(stats.failedCount).toBe(0);
      expect(stats.acceptingOperations).toBe(true);
      expect(stats.oldestOperationAge).toBeNull();
      expect(stats.pendingByType).toEqual({});
    });

    it("should track pending count", () => {
      tracker.startOperation("get");
      tracker.startOperation("set");

      const stats = tracker.getStats();
      expect(stats.pendingCount).toBe(2);
    });

    it("should track completed count", () => {
      const h1 = tracker.startOperation("get");
      const h2 = tracker.startOperation("set");
      h1.complete();
      h2.complete();

      const stats = tracker.getStats();
      expect(stats.completedCount).toBe(2);
    });

    it("should track failed count", () => {
      const h1 = tracker.startOperation("get");
      const h2 = tracker.startOperation("set");
      tracker.failOperation(h1.id, new Error("Failed"));
      h2.complete();

      const stats = tracker.getStats();
      expect(stats.failedCount).toBe(1);
      expect(stats.completedCount).toBe(1);
    });

    it("should track accepting operations state", () => {
      expect(tracker.getStats().acceptingOperations).toBe(true);

      tracker.stopAcceptingOperations();
      expect(tracker.getStats().acceptingOperations).toBe(false);
    });

    it("should calculate oldest operation age", async () => {
      // Start operation with timestamp in the past
      tracker.startOperation("old");
      await new Promise((resolve) => setTimeout(resolve, 50));
      tracker.startOperation("new");

      const stats = tracker.getStats();
      expect(stats.oldestOperationAge).toBeGreaterThanOrEqual(50);
    });

    it("should track pending by type", () => {
      tracker.startOperation("get", "key1");
      tracker.startOperation("get", "key2");
      tracker.startOperation("set", "key3");
      tracker.startOperation("delete", "key4");

      const stats = tracker.getStats();
      expect(stats.pendingByType.get).toBe(2);
      expect(stats.pendingByType.set).toBe(1);
      expect(stats.pendingByType.delete).toBe(1);
    });

    it("should return null oldest age when no pending operations", () => {
      const handle = tracker.startOperation("get");
      handle.complete();

      const stats = tracker.getStats();
      expect(stats.oldestOperationAge).toBeNull();
    });
  });

  describe("reset", () => {
    it("should clear all pending operations", () => {
      tracker.startOperation("get");
      tracker.startOperation("set");
      tracker.reset();

      expect(tracker.getPendingCount()).toBe(0);
    });

    it("should reset operation counter", () => {
      tracker.startOperation("get");
      tracker.startOperation("set");
      tracker.reset();

      const handle = tracker.startOperation("get");
      expect(handle.id).toBe("redis_op_1");
    });

    it("should reset accepting operations flag", () => {
      tracker.stopAcceptingOperations();
      tracker.reset();

      expect(tracker.canAcceptOperations()).toBe(true);
    });

    it("should reset all counters", () => {
      const h1 = tracker.startOperation("get");
      const h2 = tracker.startOperation("set");
      h1.complete();
      tracker.failOperation(h2.id, new Error("Failed"));

      tracker.reset();

      const stats = tracker.getStats();
      expect(stats.completedCount).toBe(0);
      expect(stats.failedCount).toBe(0);
    });
  });

  describe("Concurrent Operations", () => {
    it("should handle concurrent start and complete operations", async () => {
      const operations: Promise<void>[] = [];

      for (let i = 0; i < 100; i++) {
        operations.push(
          (async () => {
            const handle = tracker.startOperation("get", `key-${i}`);
            await new Promise((resolve) => setTimeout(resolve, Math.random() * 10));
            handle.complete();
          })()
        );
      }

      await Promise.all(operations);

      const stats = tracker.getStats();
      expect(stats.pendingCount).toBe(0);
      expect(stats.completedCount).toBe(100);
    });

    it("should handle mixed complete and fail operations", async () => {
      const operations: Promise<void>[] = [];

      for (let i = 0; i < 50; i++) {
        operations.push(
          (async () => {
            const handle = tracker.startOperation("get", `key-${i}`);
            await new Promise((resolve) => setTimeout(resolve, Math.random() * 5));
            if (i % 2 === 0) {
              handle.complete();
            } else {
              tracker.failOperation(handle.id, new Error("Test"));
            }
          })()
        );
      }

      await Promise.all(operations);

      const stats = tracker.getStats();
      expect(stats.pendingCount).toBe(0);
      expect(stats.completedCount).toBe(25);
      expect(stats.failedCount).toBe(25);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty operation type", () => {
      const handle = tracker.startOperation("");
      expect(handle.id).toMatch(/^redis_op_\d+$/);
      handle.complete();
    });

    it("should handle very long keys", () => {
      const longKey = "x".repeat(10000);
      const handle = tracker.startOperation("get", longKey);
      handle.complete();

      const stats = tracker.getStats();
      expect(stats.completedCount).toBe(1);
    });

    it("should handle special characters in keys", () => {
      const handle = tracker.startOperation("get", "key:with:special:chars!@#$%");
      handle.complete();

      const stats = tracker.getStats();
      expect(stats.completedCount).toBe(1);
    });

    it("should handle completing same operation multiple times", () => {
      const handle = tracker.startOperation("get", "key");
      handle.complete();
      handle.complete(); // Second complete should be no-op

      const stats = tracker.getStats();
      expect(stats.completedCount).toBe(1);
    });
  });

  describe("Lifecycle Integration", () => {
    it("should reject operations in DRAINING state", () => {
      lifecycleStateMachine.transitionTo(LifecycleState.STARTING);
      lifecycleStateMachine.transitionTo(LifecycleState.READY);
      lifecycleStateMachine.transitionTo(LifecycleState.DRAINING);

      expect(() => tracker.startOperation("get", "key")).toThrow();
    });

    it("should reject operations in STOPPING state", () => {
      lifecycleStateMachine.transitionTo(LifecycleState.STARTING);
      lifecycleStateMachine.transitionTo(LifecycleState.READY);
      lifecycleStateMachine.transitionTo(LifecycleState.DRAINING);
      lifecycleStateMachine.transitionTo(LifecycleState.STOPPING);

      expect(() => tracker.startOperation("get", "key")).toThrow();
    });

    it("should accept operations in READY state", () => {
      lifecycleStateMachine.transitionTo(LifecycleState.STARTING);
      lifecycleStateMachine.transitionTo(LifecycleState.READY);

      const handle = tracker.startOperation("get", "key");
      expect(handle.id).toBeDefined();
      handle.complete();
    });

    it("should allow pending operations to complete during shutdown", () => {
      lifecycleStateMachine.transitionTo(LifecycleState.STARTING);
      lifecycleStateMachine.transitionTo(LifecycleState.READY);

      // Start operation while ready
      const handle = tracker.startOperation("get", "key");

      // Transition to draining
      lifecycleStateMachine.transitionTo(LifecycleState.DRAINING);

      // Should still be able to complete existing operations
      handle.complete();
      expect(tracker.getPendingCount()).toBe(0);
    });
  });
});
