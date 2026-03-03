/* src/lifecycle/index.ts */

/**
 * Lifecycle Management Module
 *
 * This module provides centralized lifecycle management for graceful
 * shutdown and request draining during container lifecycle events.
 *
 * Components:
 * - LifecycleStateMachine: Manages service state transitions
 * - InflightRequestTracker: Tracks active requests for draining
 * - LifecycleCoordinator: Orchestrates component shutdown
 *
 * @see SIO-452: Fix ERR_REDIS_CONNECTION_CLOSED During Container Lifecycle
 */

// Request tracking
export {
  type DrainConfig,
  type DrainResult,
  InflightRequestTracker,
  inflightTracker,
  type RequestMetadata,
} from "./inflight-request-tracker";
// Component coordination
export {
  type ComponentHealthStatus,
  type ComponentShutdownResult,
  type LifecycleAwareComponent,
  LifecycleCoordinator,
  lifecycleCoordinator,
  type ShutdownConfig,
  type ShutdownResult,
} from "./lifecycle-coordinator";
// State machine
export {
  type LifecycleListener,
  LifecycleState,
  LifecycleStateMachine,
  lifecycleStateMachine,
} from "./lifecycle-state-machine";
