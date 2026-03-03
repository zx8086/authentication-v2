/* src/lifecycle/lifecycle-state-machine.ts */

/**
 * Lifecycle State Machine for graceful shutdown and request draining.
 *
 * This module provides a centralized state machine that coordinates
 * service lifecycle transitions, preventing race conditions during
 * container startup, shutdown, and rolling deployments.
 *
 * @see SIO-452: Fix ERR_REDIS_CONNECTION_CLOSED During Container Lifecycle
 */

import { SpanEvents, telemetryEmitter } from "../telemetry/tracer";

/**
 * Lifecycle states for the service.
 *
 * State flow:
 * INITIALIZING -> STARTING -> READY -> DRAINING -> STOPPING -> STOPPED
 *                               |          |           |
 *                               +-- ERROR <+-----------+
 */
export enum LifecycleState {
  /** Dependencies connecting, not ready for requests */
  INITIALIZING = "initializing",
  /** Server starting, not accepting requests yet */
  STARTING = "starting",
  /** Fully operational, accepting requests */
  READY = "ready",
  /** Completing in-flight requests, rejecting new ones */
  DRAINING = "draining",
  /** Connections closing, cleanup in progress */
  STOPPING = "stopping",
  /** Service terminated */
  STOPPED = "stopped",
  /** Unrecoverable error state */
  ERROR = "error",
}

/**
 * Valid state transitions matrix.
 * Each state maps to an array of states it can transition to.
 */
const VALID_TRANSITIONS: Record<LifecycleState, LifecycleState[]> = {
  [LifecycleState.INITIALIZING]: [LifecycleState.STARTING, LifecycleState.ERROR],
  [LifecycleState.STARTING]: [LifecycleState.READY, LifecycleState.ERROR],
  [LifecycleState.READY]: [LifecycleState.DRAINING, LifecycleState.ERROR],
  [LifecycleState.DRAINING]: [LifecycleState.STOPPING, LifecycleState.ERROR],
  [LifecycleState.STOPPING]: [LifecycleState.STOPPED, LifecycleState.ERROR],
  [LifecycleState.STOPPED]: [], // Terminal state
  [LifecycleState.ERROR]: [LifecycleState.STOPPED], // Can only stop from error
};

/**
 * States that accept new requests.
 */
const ACCEPTING_STATES: Set<LifecycleState> = new Set([LifecycleState.READY]);

/**
 * States that indicate shutdown is in progress.
 */
const SHUTDOWN_STATES: Set<LifecycleState> = new Set([
  LifecycleState.DRAINING,
  LifecycleState.STOPPING,
  LifecycleState.STOPPED,
]);

export type LifecycleListener = (from: LifecycleState, to: LifecycleState) => void;

/**
 * Lifecycle State Machine
 *
 * Provides centralized lifecycle management with:
 * - Type-safe state transitions
 * - Listener support for component coordination
 * - Observability via telemetry events
 */
export class LifecycleStateMachine {
  private state: LifecycleState = LifecycleState.INITIALIZING;
  private listeners: LifecycleListener[] = [];
  private transitionTimestamps: Map<LifecycleState, number> = new Map();
  private readonly startTime: number;

  constructor() {
    this.startTime = Date.now();
    this.transitionTimestamps.set(LifecycleState.INITIALIZING, this.startTime);
  }

  /**
   * Get the current lifecycle state.
   */
  getState(): LifecycleState {
    return this.state;
  }

  /**
   * Check if the service can accept new requests.
   * Only returns true when in READY state.
   */
  canAcceptRequests(): boolean {
    return ACCEPTING_STATES.has(this.state);
  }

  /**
   * Check if the service is in a shutdown state.
   * Returns true for DRAINING, STOPPING, or STOPPED.
   */
  isShuttingDown(): boolean {
    return SHUTDOWN_STATES.has(this.state);
  }

  /**
   * Attempt to transition to a new state.
   *
   * @param newState - The target state
   * @returns true if transition was successful, false if invalid
   */
  transitionTo(newState: LifecycleState): boolean {
    const validTargets = VALID_TRANSITIONS[this.state];

    if (!validTargets.includes(newState)) {
      telemetryEmitter.warn(
        SpanEvents.LIFECYCLE_STATE_CHANGED,
        "Invalid state transition attempted",
        {
          component: "lifecycle",
          operation: "transition_rejected",
          from_state: this.state,
          to_state: newState,
          valid_targets: validTargets.join(","),
        }
      );
      return false;
    }

    const previousState = this.state;
    const transitionTime = Date.now();
    const previousTimestamp = this.transitionTimestamps.get(previousState);
    const timeInPreviousState =
      previousTimestamp !== undefined ? transitionTime - previousTimestamp : 0;

    this.state = newState;
    this.transitionTimestamps.set(newState, transitionTime);

    // Emit telemetry event
    telemetryEmitter.info(
      SpanEvents.LIFECYCLE_STATE_CHANGED,
      `Lifecycle state: ${previousState} -> ${newState}`,
      {
        component: "lifecycle",
        operation: "state_transition",
        from_state: previousState,
        to_state: newState,
        time_in_previous_state_ms: timeInPreviousState,
        uptime_ms: transitionTime - this.startTime,
      }
    );

    // Notify listeners
    for (const listener of this.listeners) {
      try {
        listener(previousState, newState);
      } catch (error) {
        telemetryEmitter.error(
          SpanEvents.LIFECYCLE_STATE_CHANGED,
          "Lifecycle listener threw error",
          {
            component: "lifecycle",
            operation: "listener_error",
            from_state: previousState,
            to_state: newState,
            error: error instanceof Error ? error.message : String(error),
          }
        );
      }
    }

    return true;
  }

  /**
   * Register a listener for state changes.
   *
   * @param listener - Callback invoked on state transitions
   * @returns Unsubscribe function
   */
  onStateChange(listener: LifecycleListener): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index !== -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Get the timestamp when a state was entered.
   *
   * @param state - The state to query
   * @returns Timestamp in milliseconds, or undefined if never entered
   */
  getStateEntryTime(state: LifecycleState): number | undefined {
    return this.transitionTimestamps.get(state);
  }

  /**
   * Get service uptime in milliseconds.
   */
  getUptime(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Get a summary of lifecycle statistics.
   */
  getStats(): {
    currentState: LifecycleState;
    uptimeMs: number;
    canAcceptRequests: boolean;
    isShuttingDown: boolean;
    transitionHistory: Array<{ state: LifecycleState; enteredAt: number }>;
  } {
    const transitionHistory = Array.from(this.transitionTimestamps.entries())
      .map(([state, enteredAt]) => ({ state, enteredAt }))
      .sort((a, b) => a.enteredAt - b.enteredAt);

    return {
      currentState: this.state,
      uptimeMs: this.getUptime(),
      canAcceptRequests: this.canAcceptRequests(),
      isShuttingDown: this.isShuttingDown(),
      transitionHistory,
    };
  }

  /**
   * Reset the state machine to INITIALIZING.
   * Only for testing purposes.
   */
  reset(): void {
    this.state = LifecycleState.INITIALIZING;
    this.listeners = [];
    this.transitionTimestamps.clear();
    this.transitionTimestamps.set(LifecycleState.INITIALIZING, Date.now());
  }
}

/**
 * Singleton instance of the lifecycle state machine.
 * Use this throughout the application for consistent state management.
 */
export const lifecycleStateMachine = new LifecycleStateMachine();
