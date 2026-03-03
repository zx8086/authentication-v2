/* test/bun/lifecycle/lifecycle-coordinator.test.ts */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import {
  type ComponentHealthStatus,
  type LifecycleAwareComponent,
  LifecycleCoordinator,
} from "../../../src/lifecycle/lifecycle-coordinator";
import { LifecycleStateMachine } from "../../../src/lifecycle/lifecycle-state-machine";

describe("LifecycleCoordinator", () => {
  let coordinator: LifecycleCoordinator;
  let stateMachine: LifecycleStateMachine;

  beforeEach(() => {
    // Create fresh instances for isolation
    stateMachine = new LifecycleStateMachine();
    coordinator = new LifecycleCoordinator();
  });

  afterEach(() => {
    coordinator.reset();
    stateMachine.reset();
  });

  // Helper to create mock components
  function createMockComponent(
    name: string,
    priority: number,
    options?: {
      prepareDelay?: number;
      shutdownDelay?: number;
      prepareThrow?: boolean;
      shutdownThrow?: boolean;
      healthy?: boolean;
    }
  ): LifecycleAwareComponent & { prepareCount: number; shutdownCount: number } {
    const component = {
      name,
      priority,
      prepareCount: 0,
      shutdownCount: 0,
      prepareForShutdown: async () => {
        component.prepareCount++;
        if (options?.prepareDelay) {
          await new Promise((resolve) => setTimeout(resolve, options.prepareDelay));
        }
        if (options?.prepareThrow) {
          throw new Error(`Prepare failed: ${name}`);
        }
      },
      shutdown: async () => {
        component.shutdownCount++;
        if (options?.shutdownDelay) {
          await new Promise((resolve) => setTimeout(resolve, options.shutdownDelay));
        }
        if (options?.shutdownThrow) {
          throw new Error(`Shutdown failed: ${name}`);
        }
      },
      getHealthStatus: (): ComponentHealthStatus => ({
        name,
        healthy: options?.healthy !== false,
        details: { priority },
      }),
    };
    return component;
  }

  describe("Component Registration", () => {
    it("should register a component", () => {
      const component = createMockComponent("test", 50);
      coordinator.register(component);

      const components = coordinator.getComponents();
      expect(components.length).toBe(1);
      expect(components[0].name).toBe("test");
      expect(components[0].priority).toBe(50);
    });

    it("should register multiple components", () => {
      coordinator.register(createMockComponent("comp1", 50));
      coordinator.register(createMockComponent("comp2", 60));
      coordinator.register(createMockComponent("comp3", 40));

      const components = coordinator.getComponents();
      expect(components.length).toBe(3);
    });

    it("should sort components by priority (descending)", () => {
      coordinator.register(createMockComponent("low", 10));
      coordinator.register(createMockComponent("high", 100));
      coordinator.register(createMockComponent("medium", 50));

      const components = coordinator.getComponents();
      expect(components[0].name).toBe("high");
      expect(components[1].name).toBe("medium");
      expect(components[2].name).toBe("low");
    });

    it("should prevent duplicate registration", () => {
      coordinator.register(createMockComponent("duplicate", 50));
      coordinator.register(createMockComponent("duplicate", 60));

      const components = coordinator.getComponents();
      expect(components.length).toBe(1);
      expect(components[0].priority).toBe(50); // First registration kept
    });

    it("should unregister a component", () => {
      coordinator.register(createMockComponent("comp1", 50));
      coordinator.register(createMockComponent("comp2", 60));

      const result = coordinator.unregister("comp1");
      expect(result).toBe(true);

      const components = coordinator.getComponents();
      expect(components.length).toBe(1);
      expect(components[0].name).toBe("comp2");
    });

    it("should return false when unregistering non-existent component", () => {
      const result = coordinator.unregister("non-existent");
      expect(result).toBe(false);
    });
  });

  describe("Prepare All Components", () => {
    it("should prepare all components in priority order", async () => {
      const callOrder: string[] = [];

      const high = createMockComponent("high", 100);
      const med = createMockComponent("medium", 50);
      const low = createMockComponent("low", 10);

      // Track call order
      high.prepareForShutdown = async () => {
        callOrder.push("high");
      };
      med.prepareForShutdown = async () => {
        callOrder.push("medium");
      };
      low.prepareForShutdown = async () => {
        callOrder.push("low");
      };

      coordinator.register(low);
      coordinator.register(high);
      coordinator.register(med);

      await coordinator.prepareAll();

      expect(callOrder).toEqual(["high", "medium", "low"]);
    });

    it("should only prepare once", async () => {
      const component = createMockComponent("test", 50);
      coordinator.register(component);

      await coordinator.prepareAll();
      await coordinator.prepareAll();

      expect(component.prepareCount).toBe(1);
    });

    it("should continue preparing other components on error", async () => {
      const failing = createMockComponent("failing", 100, { prepareThrow: true });
      const working = createMockComponent("working", 50);

      coordinator.register(failing);
      coordinator.register(working);

      await coordinator.prepareAll();

      expect(failing.prepareCount).toBe(1);
      expect(working.prepareCount).toBe(1);
    });
  });

  describe("Shutdown All Components", () => {
    it("should shutdown all components", async () => {
      const comp1 = createMockComponent("comp1", 50);
      const comp2 = createMockComponent("comp2", 60);

      coordinator.register(comp1);
      coordinator.register(comp2);

      const result = await coordinator.shutdownAll();

      expect(result.success).toBe(true);
      expect(result.components.length).toBe(2);
      expect(comp1.shutdownCount).toBe(1);
      expect(comp2.shutdownCount).toBe(1);
    });

    it("should shutdown in priority order", async () => {
      const callOrder: string[] = [];

      const high = createMockComponent("high", 100);
      const low = createMockComponent("low", 10);

      high.shutdown = async () => {
        callOrder.push("high");
      };
      low.shutdown = async () => {
        callOrder.push("low");
      };

      coordinator.register(low);
      coordinator.register(high);

      await coordinator.shutdownAll();

      expect(callOrder).toEqual(["high", "low"]);
    });

    it("should report component shutdown results", async () => {
      coordinator.register(createMockComponent("comp1", 50));
      coordinator.register(createMockComponent("comp2", 60));

      const result = await coordinator.shutdownAll();

      expect(result.components.length).toBe(2);
      expect(result.components[0].name).toBe("comp2"); // Higher priority first
      expect(result.components[0].success).toBe(true);
      expect(result.components[0].durationMs).toBeGreaterThanOrEqual(0);
    });

    it("should handle component shutdown failures", async () => {
      coordinator.register(createMockComponent("failing", 100, { shutdownThrow: true }));
      coordinator.register(createMockComponent("working", 50));

      const result = await coordinator.shutdownAll();

      expect(result.success).toBe(false);
      expect(result.failedComponents).toContain("failing");
      expect(result.components.find((c) => c.name === "failing")?.success).toBe(false);
      expect(result.components.find((c) => c.name === "failing")?.error).toBeDefined();
    });

    it("should continue on error by default", async () => {
      const failing = createMockComponent("failing", 100, { shutdownThrow: true });
      const working = createMockComponent("working", 50);

      coordinator.register(failing);
      coordinator.register(working);

      const result = await coordinator.shutdownAll();

      expect(working.shutdownCount).toBe(1);
      expect(result.components.find((c) => c.name === "working")?.success).toBe(true);
    });

    it("should stop on error when configured", async () => {
      const failing = createMockComponent("failing", 100, { shutdownThrow: true });
      const working = createMockComponent("working", 50);

      coordinator.register(failing);
      coordinator.register(working);

      const result = await coordinator.shutdownAll({ continueOnError: false });

      expect(working.shutdownCount).toBe(0);
      expect(result.components.length).toBe(1);
    });

    it("should timeout slow components", async () => {
      const slow = createMockComponent("slow", 50, { shutdownDelay: 5000 });
      coordinator.register(slow);

      const result = await coordinator.shutdownAll({ componentTimeoutMs: 100 });

      expect(result.success).toBe(false);
      expect(result.failedComponents).toContain("slow");
      expect(result.components[0].error).toContain("timeout");
    });

    it("should prevent multiple shutdown calls", async () => {
      const component = createMockComponent("test", 50);
      coordinator.register(component);

      // Start first shutdown
      const promise1 = coordinator.shutdownAll();
      // Immediately start second shutdown
      const result2 = await coordinator.shutdownAll();

      await promise1;

      expect(result2.success).toBe(false);
      expect(result2.failedComponents).toContain("Shutdown already in progress");
    });

    it("should track total shutdown duration", async () => {
      coordinator.register(createMockComponent("comp1", 50, { shutdownDelay: 50 }));
      coordinator.register(createMockComponent("comp2", 60, { shutdownDelay: 50 }));

      const result = await coordinator.shutdownAll();

      expect(result.totalDurationMs).toBeGreaterThanOrEqual(100);
    });
  });

  describe("Health Aggregation", () => {
    it("should aggregate health from all components", () => {
      coordinator.register(createMockComponent("healthy1", 50, { healthy: true }));
      coordinator.register(createMockComponent("healthy2", 60, { healthy: true }));

      const health = coordinator.getAggregatedHealth();

      expect(health.healthy).toBe(true);
      expect(health.components.length).toBe(2);
    });

    it("should report unhealthy when any component is unhealthy", () => {
      coordinator.register(createMockComponent("healthy", 50, { healthy: true }));
      coordinator.register(createMockComponent("unhealthy", 60, { healthy: false }));

      const health = coordinator.getAggregatedHealth();

      expect(health.healthy).toBe(false);
    });

    it("should handle components without health check", () => {
      const noHealthCheck: LifecycleAwareComponent = {
        name: "noHealthCheck",
        priority: 50,
        prepareForShutdown: async () => {},
        shutdown: async () => {},
      };

      coordinator.register(noHealthCheck);

      const health = coordinator.getAggregatedHealth();

      expect(health.healthy).toBe(true);
      expect(health.components[0].details?.status).toBe("no_health_check");
    });

    it("should include component details in health report", () => {
      coordinator.register(createMockComponent("test", 75, { healthy: true }));

      const health = coordinator.getAggregatedHealth();

      expect(health.components[0].details?.priority).toBe(75);
    });
  });

  describe("reset", () => {
    it("should clear all registered components", () => {
      coordinator.register(createMockComponent("comp1", 50));
      coordinator.register(createMockComponent("comp2", 60));

      coordinator.reset();

      const components = coordinator.getComponents();
      expect(components.length).toBe(0);
    });

    it("should allow re-preparation after reset", async () => {
      const component = createMockComponent("test", 50);
      coordinator.register(component);

      await coordinator.prepareAll();
      coordinator.reset();

      // Re-register and prepare again
      coordinator.register(component);
      await coordinator.prepareAll();

      expect(component.prepareCount).toBe(2);
    });

    it("should allow re-shutdown after reset", async () => {
      const component = createMockComponent("test", 50);
      coordinator.register(component);

      await coordinator.shutdownAll();
      coordinator.reset();

      // Re-register and shutdown again
      coordinator.register(component);
      await coordinator.shutdownAll();

      expect(component.shutdownCount).toBe(2);
    });
  });

  describe("Priority Ordering", () => {
    it("should handle components with same priority", () => {
      coordinator.register(createMockComponent("first", 50));
      coordinator.register(createMockComponent("second", 50));
      coordinator.register(createMockComponent("third", 50));

      const components = coordinator.getComponents();
      expect(components.length).toBe(3);
      // All have same priority - order depends on sort stability
    });

    it("should handle extreme priority values", () => {
      coordinator.register(createMockComponent("zero", 0));
      coordinator.register(createMockComponent("max", Number.MAX_SAFE_INTEGER));
      coordinator.register(createMockComponent("negative", -1));

      const components = coordinator.getComponents();
      expect(components[0].name).toBe("max");
      expect(components[2].name).toBe("negative");
    });

    it("should follow recommended priority guidelines", async () => {
      const callOrder: string[] = [];

      // Use recommended priorities from interface docs
      const httpServer = createMockComponent("http_server", 100);
      const kong = createMockComponent("kong", 80);
      const cache = createMockComponent("cache", 60);
      const telemetry = createMockComponent("telemetry", 40);
      const logging = createMockComponent("logging", 10);

      [httpServer, kong, cache, telemetry, logging].forEach((c) => {
        c.shutdown = async () => {
          callOrder.push(c.name);
        };
        coordinator.register(c);
      });

      await coordinator.shutdownAll();

      expect(callOrder).toEqual(["http_server", "kong", "cache", "telemetry", "logging"]);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty component list", async () => {
      const _prepareResult = await coordinator.prepareAll();
      const shutdownResult = await coordinator.shutdownAll();

      expect(shutdownResult.success).toBe(true);
      expect(shutdownResult.components.length).toBe(0);
    });

    it("should handle component with empty name", () => {
      coordinator.register(createMockComponent("", 50));

      const components = coordinator.getComponents();
      expect(components[0].name).toBe("");
    });

    it("should handle rapid registration and unregistration", () => {
      for (let i = 0; i < 100; i++) {
        coordinator.register(createMockComponent(`comp-${i}`, i));
      }

      for (let i = 0; i < 50; i++) {
        coordinator.unregister(`comp-${i}`);
      }

      const components = coordinator.getComponents();
      expect(components.length).toBe(50);
    });
  });
});
