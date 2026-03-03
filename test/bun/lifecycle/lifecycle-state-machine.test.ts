/* test/bun/lifecycle/lifecycle-state-machine.test.ts */

import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import {
  LifecycleState,
  LifecycleStateMachine,
} from "../../../src/lifecycle/lifecycle-state-machine";

describe("LifecycleStateMachine", () => {
  let stateMachine: LifecycleStateMachine;

  beforeEach(() => {
    stateMachine = new LifecycleStateMachine();
  });

  afterEach(() => {
    stateMachine.reset();
  });

  describe("Initial State", () => {
    it("should start in INITIALIZING state", () => {
      expect(stateMachine.getState()).toBe(LifecycleState.INITIALIZING);
    });

    it("should not accept requests in INITIALIZING state", () => {
      expect(stateMachine.canAcceptRequests()).toBe(false);
    });

    it("should not be shutting down initially", () => {
      expect(stateMachine.isShuttingDown()).toBe(false);
    });

    it("should record INITIALIZING transition timestamp", () => {
      const entryTime = stateMachine.getStateEntryTime(LifecycleState.INITIALIZING);
      expect(entryTime).toBeDefined();
      expect(typeof entryTime).toBe("number");
    });
  });

  describe("Valid State Transitions", () => {
    it("should transition from INITIALIZING to STARTING", () => {
      const result = stateMachine.transitionTo(LifecycleState.STARTING);
      expect(result).toBe(true);
      expect(stateMachine.getState()).toBe(LifecycleState.STARTING);
    });

    it("should transition from STARTING to READY", () => {
      stateMachine.transitionTo(LifecycleState.STARTING);
      const result = stateMachine.transitionTo(LifecycleState.READY);
      expect(result).toBe(true);
      expect(stateMachine.getState()).toBe(LifecycleState.READY);
    });

    it("should transition from READY to DRAINING", () => {
      stateMachine.transitionTo(LifecycleState.STARTING);
      stateMachine.transitionTo(LifecycleState.READY);
      const result = stateMachine.transitionTo(LifecycleState.DRAINING);
      expect(result).toBe(true);
      expect(stateMachine.getState()).toBe(LifecycleState.DRAINING);
    });

    it("should transition from DRAINING to STOPPING", () => {
      stateMachine.transitionTo(LifecycleState.STARTING);
      stateMachine.transitionTo(LifecycleState.READY);
      stateMachine.transitionTo(LifecycleState.DRAINING);
      const result = stateMachine.transitionTo(LifecycleState.STOPPING);
      expect(result).toBe(true);
      expect(stateMachine.getState()).toBe(LifecycleState.STOPPING);
    });

    it("should transition from STOPPING to STOPPED", () => {
      stateMachine.transitionTo(LifecycleState.STARTING);
      stateMachine.transitionTo(LifecycleState.READY);
      stateMachine.transitionTo(LifecycleState.DRAINING);
      stateMachine.transitionTo(LifecycleState.STOPPING);
      const result = stateMachine.transitionTo(LifecycleState.STOPPED);
      expect(result).toBe(true);
      expect(stateMachine.getState()).toBe(LifecycleState.STOPPED);
    });

    it("should handle full lifecycle transition sequence", () => {
      expect(stateMachine.transitionTo(LifecycleState.STARTING)).toBe(true);
      expect(stateMachine.transitionTo(LifecycleState.READY)).toBe(true);
      expect(stateMachine.transitionTo(LifecycleState.DRAINING)).toBe(true);
      expect(stateMachine.transitionTo(LifecycleState.STOPPING)).toBe(true);
      expect(stateMachine.transitionTo(LifecycleState.STOPPED)).toBe(true);
      expect(stateMachine.getState()).toBe(LifecycleState.STOPPED);
    });
  });

  describe("Error State Transitions", () => {
    it("should transition from INITIALIZING to ERROR", () => {
      const result = stateMachine.transitionTo(LifecycleState.ERROR);
      expect(result).toBe(true);
      expect(stateMachine.getState()).toBe(LifecycleState.ERROR);
    });

    it("should transition from STARTING to ERROR", () => {
      stateMachine.transitionTo(LifecycleState.STARTING);
      const result = stateMachine.transitionTo(LifecycleState.ERROR);
      expect(result).toBe(true);
      expect(stateMachine.getState()).toBe(LifecycleState.ERROR);
    });

    it("should transition from READY to ERROR", () => {
      stateMachine.transitionTo(LifecycleState.STARTING);
      stateMachine.transitionTo(LifecycleState.READY);
      const result = stateMachine.transitionTo(LifecycleState.ERROR);
      expect(result).toBe(true);
      expect(stateMachine.getState()).toBe(LifecycleState.ERROR);
    });

    it("should transition from DRAINING to ERROR", () => {
      stateMachine.transitionTo(LifecycleState.STARTING);
      stateMachine.transitionTo(LifecycleState.READY);
      stateMachine.transitionTo(LifecycleState.DRAINING);
      const result = stateMachine.transitionTo(LifecycleState.ERROR);
      expect(result).toBe(true);
      expect(stateMachine.getState()).toBe(LifecycleState.ERROR);
    });

    it("should transition from STOPPING to ERROR", () => {
      stateMachine.transitionTo(LifecycleState.STARTING);
      stateMachine.transitionTo(LifecycleState.READY);
      stateMachine.transitionTo(LifecycleState.DRAINING);
      stateMachine.transitionTo(LifecycleState.STOPPING);
      const result = stateMachine.transitionTo(LifecycleState.ERROR);
      expect(result).toBe(true);
      expect(stateMachine.getState()).toBe(LifecycleState.ERROR);
    });

    it("should transition from ERROR to STOPPED", () => {
      stateMachine.transitionTo(LifecycleState.ERROR);
      const result = stateMachine.transitionTo(LifecycleState.STOPPED);
      expect(result).toBe(true);
      expect(stateMachine.getState()).toBe(LifecycleState.STOPPED);
    });
  });

  describe("Invalid State Transitions", () => {
    it("should reject transition from INITIALIZING to READY (skipping STARTING)", () => {
      const result = stateMachine.transitionTo(LifecycleState.READY);
      expect(result).toBe(false);
      expect(stateMachine.getState()).toBe(LifecycleState.INITIALIZING);
    });

    it("should reject transition from INITIALIZING to DRAINING", () => {
      const result = stateMachine.transitionTo(LifecycleState.DRAINING);
      expect(result).toBe(false);
      expect(stateMachine.getState()).toBe(LifecycleState.INITIALIZING);
    });

    it("should reject transition from INITIALIZING to STOPPING", () => {
      const result = stateMachine.transitionTo(LifecycleState.STOPPING);
      expect(result).toBe(false);
      expect(stateMachine.getState()).toBe(LifecycleState.INITIALIZING);
    });

    it("should reject transition from INITIALIZING to STOPPED", () => {
      const result = stateMachine.transitionTo(LifecycleState.STOPPED);
      expect(result).toBe(false);
      expect(stateMachine.getState()).toBe(LifecycleState.INITIALIZING);
    });

    it("should reject transition from STARTING to DRAINING (skipping READY)", () => {
      stateMachine.transitionTo(LifecycleState.STARTING);
      const result = stateMachine.transitionTo(LifecycleState.DRAINING);
      expect(result).toBe(false);
      expect(stateMachine.getState()).toBe(LifecycleState.STARTING);
    });

    it("should reject transition from READY to STARTING (backward)", () => {
      stateMachine.transitionTo(LifecycleState.STARTING);
      stateMachine.transitionTo(LifecycleState.READY);
      const result = stateMachine.transitionTo(LifecycleState.STARTING);
      expect(result).toBe(false);
      expect(stateMachine.getState()).toBe(LifecycleState.READY);
    });

    it("should reject transition from READY to STOPPING (skipping DRAINING)", () => {
      stateMachine.transitionTo(LifecycleState.STARTING);
      stateMachine.transitionTo(LifecycleState.READY);
      const result = stateMachine.transitionTo(LifecycleState.STOPPING);
      expect(result).toBe(false);
      expect(stateMachine.getState()).toBe(LifecycleState.READY);
    });

    it("should reject transition from STOPPED to any state (terminal)", () => {
      stateMachine.transitionTo(LifecycleState.STARTING);
      stateMachine.transitionTo(LifecycleState.READY);
      stateMachine.transitionTo(LifecycleState.DRAINING);
      stateMachine.transitionTo(LifecycleState.STOPPING);
      stateMachine.transitionTo(LifecycleState.STOPPED);

      expect(stateMachine.transitionTo(LifecycleState.INITIALIZING)).toBe(false);
      expect(stateMachine.transitionTo(LifecycleState.STARTING)).toBe(false);
      expect(stateMachine.transitionTo(LifecycleState.READY)).toBe(false);
      expect(stateMachine.transitionTo(LifecycleState.DRAINING)).toBe(false);
      expect(stateMachine.transitionTo(LifecycleState.STOPPING)).toBe(false);
      expect(stateMachine.transitionTo(LifecycleState.ERROR)).toBe(false);
      expect(stateMachine.getState()).toBe(LifecycleState.STOPPED);
    });

    it("should reject transition from DRAINING to READY", () => {
      stateMachine.transitionTo(LifecycleState.STARTING);
      stateMachine.transitionTo(LifecycleState.READY);
      stateMachine.transitionTo(LifecycleState.DRAINING);
      const result = stateMachine.transitionTo(LifecycleState.READY);
      expect(result).toBe(false);
      expect(stateMachine.getState()).toBe(LifecycleState.DRAINING);
    });

    it("should reject transition from DRAINING to INITIALIZING (backward)", () => {
      stateMachine.transitionTo(LifecycleState.STARTING);
      stateMachine.transitionTo(LifecycleState.READY);
      stateMachine.transitionTo(LifecycleState.DRAINING);
      const result = stateMachine.transitionTo(LifecycleState.INITIALIZING);
      expect(result).toBe(false);
      expect(stateMachine.getState()).toBe(LifecycleState.DRAINING);
    });

    it("should reject transition from ERROR to READY", () => {
      stateMachine.transitionTo(LifecycleState.ERROR);
      const result = stateMachine.transitionTo(LifecycleState.READY);
      expect(result).toBe(false);
      expect(stateMachine.getState()).toBe(LifecycleState.ERROR);
    });

    it("should reject transition from ERROR to STARTING", () => {
      stateMachine.transitionTo(LifecycleState.ERROR);
      const result = stateMachine.transitionTo(LifecycleState.STARTING);
      expect(result).toBe(false);
      expect(stateMachine.getState()).toBe(LifecycleState.ERROR);
    });

    it("should reject transition from ERROR to DRAINING", () => {
      stateMachine.transitionTo(LifecycleState.ERROR);
      const result = stateMachine.transitionTo(LifecycleState.DRAINING);
      expect(result).toBe(false);
      expect(stateMachine.getState()).toBe(LifecycleState.ERROR);
    });

    it("should reject same-state transition (READY to READY)", () => {
      stateMachine.transitionTo(LifecycleState.STARTING);
      stateMachine.transitionTo(LifecycleState.READY);
      const result = stateMachine.transitionTo(LifecycleState.READY);
      expect(result).toBe(false);
      expect(stateMachine.getState()).toBe(LifecycleState.READY);
    });

    it("should reject same-state transition (INITIALIZING to INITIALIZING)", () => {
      const result = stateMachine.transitionTo(LifecycleState.INITIALIZING);
      expect(result).toBe(false);
      expect(stateMachine.getState()).toBe(LifecycleState.INITIALIZING);
    });
  });

  describe("canAcceptRequests", () => {
    it("should return false in INITIALIZING state", () => {
      expect(stateMachine.canAcceptRequests()).toBe(false);
    });

    it("should return false in STARTING state", () => {
      stateMachine.transitionTo(LifecycleState.STARTING);
      expect(stateMachine.canAcceptRequests()).toBe(false);
    });

    it("should return true in READY state", () => {
      stateMachine.transitionTo(LifecycleState.STARTING);
      stateMachine.transitionTo(LifecycleState.READY);
      expect(stateMachine.canAcceptRequests()).toBe(true);
    });

    it("should return false in DRAINING state", () => {
      stateMachine.transitionTo(LifecycleState.STARTING);
      stateMachine.transitionTo(LifecycleState.READY);
      stateMachine.transitionTo(LifecycleState.DRAINING);
      expect(stateMachine.canAcceptRequests()).toBe(false);
    });

    it("should return false in STOPPING state", () => {
      stateMachine.transitionTo(LifecycleState.STARTING);
      stateMachine.transitionTo(LifecycleState.READY);
      stateMachine.transitionTo(LifecycleState.DRAINING);
      stateMachine.transitionTo(LifecycleState.STOPPING);
      expect(stateMachine.canAcceptRequests()).toBe(false);
    });

    it("should return false in STOPPED state", () => {
      stateMachine.transitionTo(LifecycleState.STARTING);
      stateMachine.transitionTo(LifecycleState.READY);
      stateMachine.transitionTo(LifecycleState.DRAINING);
      stateMachine.transitionTo(LifecycleState.STOPPING);
      stateMachine.transitionTo(LifecycleState.STOPPED);
      expect(stateMachine.canAcceptRequests()).toBe(false);
    });

    it("should return false in ERROR state", () => {
      stateMachine.transitionTo(LifecycleState.ERROR);
      expect(stateMachine.canAcceptRequests()).toBe(false);
    });
  });

  describe("isShuttingDown", () => {
    it("should return false in INITIALIZING state", () => {
      expect(stateMachine.isShuttingDown()).toBe(false);
    });

    it("should return false in STARTING state", () => {
      stateMachine.transitionTo(LifecycleState.STARTING);
      expect(stateMachine.isShuttingDown()).toBe(false);
    });

    it("should return false in READY state", () => {
      stateMachine.transitionTo(LifecycleState.STARTING);
      stateMachine.transitionTo(LifecycleState.READY);
      expect(stateMachine.isShuttingDown()).toBe(false);
    });

    it("should return true in DRAINING state", () => {
      stateMachine.transitionTo(LifecycleState.STARTING);
      stateMachine.transitionTo(LifecycleState.READY);
      stateMachine.transitionTo(LifecycleState.DRAINING);
      expect(stateMachine.isShuttingDown()).toBe(true);
    });

    it("should return true in STOPPING state", () => {
      stateMachine.transitionTo(LifecycleState.STARTING);
      stateMachine.transitionTo(LifecycleState.READY);
      stateMachine.transitionTo(LifecycleState.DRAINING);
      stateMachine.transitionTo(LifecycleState.STOPPING);
      expect(stateMachine.isShuttingDown()).toBe(true);
    });

    it("should return true in STOPPED state", () => {
      stateMachine.transitionTo(LifecycleState.STARTING);
      stateMachine.transitionTo(LifecycleState.READY);
      stateMachine.transitionTo(LifecycleState.DRAINING);
      stateMachine.transitionTo(LifecycleState.STOPPING);
      stateMachine.transitionTo(LifecycleState.STOPPED);
      expect(stateMachine.isShuttingDown()).toBe(true);
    });

    it("should return false in ERROR state (not a shutdown state)", () => {
      stateMachine.transitionTo(LifecycleState.ERROR);
      expect(stateMachine.isShuttingDown()).toBe(false);
    });
  });

  describe("State Change Listeners", () => {
    it("should notify listener on state change", () => {
      const listener = mock(() => {});
      stateMachine.onStateChange(listener);

      stateMachine.transitionTo(LifecycleState.STARTING);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(LifecycleState.INITIALIZING, LifecycleState.STARTING);
    });

    it("should notify multiple listeners", () => {
      const listener1 = mock(() => {});
      const listener2 = mock(() => {});
      stateMachine.onStateChange(listener1);
      stateMachine.onStateChange(listener2);

      stateMachine.transitionTo(LifecycleState.STARTING);

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });

    it("should not notify on invalid transitions", () => {
      const listener = mock(() => {});
      stateMachine.onStateChange(listener);

      // Invalid transition - should not trigger listener
      stateMachine.transitionTo(LifecycleState.DRAINING);

      expect(listener).not.toHaveBeenCalled();
    });

    it("should unsubscribe listener correctly", () => {
      const listener = mock(() => {});
      const unsubscribe = stateMachine.onStateChange(listener);

      unsubscribe();
      stateMachine.transitionTo(LifecycleState.STARTING);

      expect(listener).not.toHaveBeenCalled();
    });

    it("should handle listener errors gracefully", () => {
      const errorListener = mock(() => {
        throw new Error("Listener error");
      });
      const successListener = mock(() => {});

      stateMachine.onStateChange(errorListener);
      stateMachine.onStateChange(successListener);

      // Should not throw and should still call other listeners
      const result = stateMachine.transitionTo(LifecycleState.STARTING);

      expect(result).toBe(true);
      expect(errorListener).toHaveBeenCalled();
      expect(successListener).toHaveBeenCalled();
    });

    it("should track listeners through multiple transitions", () => {
      const listener = mock(() => {});
      stateMachine.onStateChange(listener);

      stateMachine.transitionTo(LifecycleState.STARTING);
      stateMachine.transitionTo(LifecycleState.READY);
      stateMachine.transitionTo(LifecycleState.DRAINING);

      expect(listener).toHaveBeenCalledTimes(3);
    });
  });

  describe("Transition Timestamps", () => {
    it("should record timestamp for each state entered", () => {
      const beforeTransition = Date.now();
      stateMachine.transitionTo(LifecycleState.STARTING);
      const afterTransition = Date.now();

      const entryTime = stateMachine.getStateEntryTime(LifecycleState.STARTING);
      expect(entryTime).toBeDefined();
      expect(entryTime).toBeGreaterThanOrEqual(beforeTransition);
      expect(entryTime).toBeLessThanOrEqual(afterTransition);
    });

    it("should return undefined for states never entered", () => {
      const entryTime = stateMachine.getStateEntryTime(LifecycleState.STOPPED);
      expect(entryTime).toBeUndefined();
    });

    it("should preserve timestamps for all visited states", () => {
      stateMachine.transitionTo(LifecycleState.STARTING);
      stateMachine.transitionTo(LifecycleState.READY);
      stateMachine.transitionTo(LifecycleState.DRAINING);

      expect(stateMachine.getStateEntryTime(LifecycleState.INITIALIZING)).toBeDefined();
      expect(stateMachine.getStateEntryTime(LifecycleState.STARTING)).toBeDefined();
      expect(stateMachine.getStateEntryTime(LifecycleState.READY)).toBeDefined();
      expect(stateMachine.getStateEntryTime(LifecycleState.DRAINING)).toBeDefined();
    });
  });

  describe("Uptime Tracking", () => {
    it("should return positive uptime", () => {
      const uptime = stateMachine.getUptime();
      expect(uptime).toBeGreaterThanOrEqual(0);
    });

    it("should increase uptime over time", async () => {
      const uptime1 = stateMachine.getUptime();
      await new Promise((resolve) => setTimeout(resolve, 10));
      const uptime2 = stateMachine.getUptime();
      expect(uptime2).toBeGreaterThan(uptime1);
    });
  });

  describe("getStats", () => {
    it("should return correct stats in initial state", () => {
      const stats = stateMachine.getStats();

      expect(stats.currentState).toBe(LifecycleState.INITIALIZING);
      expect(stats.canAcceptRequests).toBe(false);
      expect(stats.isShuttingDown).toBe(false);
      expect(stats.uptimeMs).toBeGreaterThanOrEqual(0);
      expect(stats.transitionHistory.length).toBe(1);
    });

    it("should track transition history", () => {
      stateMachine.transitionTo(LifecycleState.STARTING);
      stateMachine.transitionTo(LifecycleState.READY);

      const stats = stateMachine.getStats();

      expect(stats.transitionHistory.length).toBe(3);
      expect(stats.transitionHistory[0].state).toBe(LifecycleState.INITIALIZING);
      expect(stats.transitionHistory[1].state).toBe(LifecycleState.STARTING);
      expect(stats.transitionHistory[2].state).toBe(LifecycleState.READY);
    });

    it("should sort transition history by entry time", () => {
      stateMachine.transitionTo(LifecycleState.STARTING);
      stateMachine.transitionTo(LifecycleState.READY);
      stateMachine.transitionTo(LifecycleState.DRAINING);

      const stats = stateMachine.getStats();
      const { transitionHistory } = stats;

      for (let i = 1; i < transitionHistory.length; i++) {
        expect(transitionHistory[i].enteredAt).toBeGreaterThanOrEqual(
          transitionHistory[i - 1].enteredAt
        );
      }
    });
  });

  describe("reset", () => {
    it("should reset state to INITIALIZING", () => {
      stateMachine.transitionTo(LifecycleState.STARTING);
      stateMachine.transitionTo(LifecycleState.READY);
      stateMachine.reset();

      expect(stateMachine.getState()).toBe(LifecycleState.INITIALIZING);
    });

    it("should clear all listeners", () => {
      const listener = mock(() => {});
      stateMachine.onStateChange(listener);
      stateMachine.reset();

      stateMachine.transitionTo(LifecycleState.STARTING);
      expect(listener).not.toHaveBeenCalled();
    });

    it("should clear transition history", () => {
      stateMachine.transitionTo(LifecycleState.STARTING);
      stateMachine.transitionTo(LifecycleState.READY);
      stateMachine.reset();

      // After reset, only INITIALIZING should have a timestamp
      expect(stateMachine.getStateEntryTime(LifecycleState.INITIALIZING)).toBeDefined();
      expect(stateMachine.getStateEntryTime(LifecycleState.STARTING)).toBeUndefined();
      expect(stateMachine.getStateEntryTime(LifecycleState.READY)).toBeUndefined();
    });

    it("should allow normal transitions after reset", () => {
      stateMachine.transitionTo(LifecycleState.STARTING);
      stateMachine.transitionTo(LifecycleState.READY);
      stateMachine.transitionTo(LifecycleState.DRAINING);
      stateMachine.reset();

      // Should be able to transition normally again
      expect(stateMachine.transitionTo(LifecycleState.STARTING)).toBe(true);
      expect(stateMachine.transitionTo(LifecycleState.READY)).toBe(true);
      expect(stateMachine.getState()).toBe(LifecycleState.READY);
    });

    it("should reset from ERROR state", () => {
      stateMachine.transitionTo(LifecycleState.ERROR);
      stateMachine.reset();

      expect(stateMachine.getState()).toBe(LifecycleState.INITIALIZING);
      expect(stateMachine.transitionTo(LifecycleState.STARTING)).toBe(true);
    });

    it("should reset from STOPPED state", () => {
      stateMachine.transitionTo(LifecycleState.STARTING);
      stateMachine.transitionTo(LifecycleState.READY);
      stateMachine.transitionTo(LifecycleState.DRAINING);
      stateMachine.transitionTo(LifecycleState.STOPPING);
      stateMachine.transitionTo(LifecycleState.STOPPED);
      stateMachine.reset();

      expect(stateMachine.getState()).toBe(LifecycleState.INITIALIZING);
      expect(stateMachine.transitionTo(LifecycleState.STARTING)).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should handle rapid sequential transitions", () => {
      const listener = mock(() => {});
      stateMachine.onStateChange(listener);

      // Rapid fire transitions
      stateMachine.transitionTo(LifecycleState.STARTING);
      stateMachine.transitionTo(LifecycleState.READY);
      stateMachine.transitionTo(LifecycleState.DRAINING);
      stateMachine.transitionTo(LifecycleState.STOPPING);
      stateMachine.transitionTo(LifecycleState.STOPPED);

      expect(listener).toHaveBeenCalledTimes(5);
      expect(stateMachine.getState()).toBe(LifecycleState.STOPPED);
    });

    it("should maintain state integrity after multiple invalid transitions", () => {
      stateMachine.transitionTo(LifecycleState.STARTING);
      stateMachine.transitionTo(LifecycleState.READY);

      // Try multiple invalid transitions
      stateMachine.transitionTo(LifecycleState.INITIALIZING);
      stateMachine.transitionTo(LifecycleState.STARTING);
      stateMachine.transitionTo(LifecycleState.STOPPED);
      stateMachine.transitionTo(LifecycleState.READY);

      // State should still be READY
      expect(stateMachine.getState()).toBe(LifecycleState.READY);
      expect(stateMachine.canAcceptRequests()).toBe(true);
    });

    it("should correctly track stats after mixed valid and invalid transitions", () => {
      stateMachine.transitionTo(LifecycleState.STARTING); // valid
      stateMachine.transitionTo(LifecycleState.DRAINING); // invalid
      stateMachine.transitionTo(LifecycleState.READY); // valid
      stateMachine.transitionTo(LifecycleState.STARTING); // invalid
      stateMachine.transitionTo(LifecycleState.DRAINING); // valid

      const stats = stateMachine.getStats();
      expect(stats.transitionHistory.length).toBe(4); // INITIALIZING + 3 valid
      expect(stats.currentState).toBe(LifecycleState.DRAINING);
    });

    it("should handle listener that unsubscribes during notification", () => {
      let unsubscribe: () => void;
      const selfRemovingListener = mock(() => {
        unsubscribe();
      });
      const normalListener = mock(() => {});

      // Register normal listener first, then self-removing
      stateMachine.onStateChange(normalListener);
      unsubscribe = stateMachine.onStateChange(selfRemovingListener);

      stateMachine.transitionTo(LifecycleState.STARTING);
      stateMachine.transitionTo(LifecycleState.READY);

      // Self-removing listener called once, then unsubscribed
      expect(selfRemovingListener).toHaveBeenCalledTimes(1);
      // Normal listener called twice (registered before self-removing)
      expect(normalListener).toHaveBeenCalledTimes(2);
    });

    it("should preserve ERROR timestamp when transitioning to STOPPED", () => {
      stateMachine.transitionTo(LifecycleState.ERROR);
      const errorTime = stateMachine.getStateEntryTime(LifecycleState.ERROR);

      stateMachine.transitionTo(LifecycleState.STOPPED);

      expect(stateMachine.getStateEntryTime(LifecycleState.ERROR)).toBe(errorTime);
      expect(stateMachine.getStateEntryTime(LifecycleState.STOPPED)).toBeDefined();
    });

    it("should handle getStats on freshly created state machine", () => {
      const freshMachine = new LifecycleStateMachine();
      const stats = freshMachine.getStats();

      expect(stats.currentState).toBe(LifecycleState.INITIALIZING);
      expect(stats.canAcceptRequests).toBe(false);
      expect(stats.isShuttingDown).toBe(false);
      expect(stats.transitionHistory.length).toBe(1);
      expect(stats.uptimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Concurrent Operations", () => {
    it("should handle concurrent listener additions", () => {
      const listeners = Array.from({ length: 10 }, () => mock(() => {}));

      // Add all listeners
      for (const listener of listeners) {
        stateMachine.onStateChange(listener);
      }

      stateMachine.transitionTo(LifecycleState.STARTING);

      // All listeners should be called
      listeners.forEach((listener) => {
        expect(listener).toHaveBeenCalledTimes(1);
      });
    });

    it("should handle concurrent unsubscriptions", () => {
      const unsubscribes: (() => void)[] = [];
      const listeners = Array.from({ length: 5 }, () => mock(() => {}));

      listeners.forEach((listener) => {
        unsubscribes.push(stateMachine.onStateChange(listener));
      });

      // Unsubscribe all
      for (const unsub of unsubscribes) {
        unsub();
      }

      stateMachine.transitionTo(LifecycleState.STARTING);

      // No listeners should be called
      listeners.forEach((listener) => {
        expect(listener).not.toHaveBeenCalled();
      });
    });

    it("should handle async listener callbacks", async () => {
      let asyncCompleted = false;
      const asyncListener = mock(async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        asyncCompleted = true;
      });

      stateMachine.onStateChange(asyncListener);
      stateMachine.transitionTo(LifecycleState.STARTING);

      // Listener was called (but may not have completed)
      expect(asyncListener).toHaveBeenCalled();

      // Wait for async completion
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(asyncCompleted).toBe(true);
    });
  });
});
