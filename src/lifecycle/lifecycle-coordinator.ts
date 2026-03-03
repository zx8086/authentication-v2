/* src/lifecycle/lifecycle-coordinator.ts */

/**
 * Lifecycle Coordinator for component shutdown orchestration.
 *
 * This module coordinates the shutdown of all lifecycle-aware components
 * in priority order, ensuring dependencies are closed in the correct
 * sequence during graceful shutdown.
 *
 * @see SIO-452: Fix ERR_REDIS_CONNECTION_CLOSED During Container Lifecycle
 */

import { SpanEvents, telemetryEmitter } from "../telemetry/tracer";
import { LifecycleState, lifecycleStateMachine } from "./lifecycle-state-machine";

/**
 * Interface for components that participate in lifecycle management.
 *
 * Components implement this interface to receive lifecycle notifications
 * and participate in coordinated shutdown.
 */
export interface LifecycleAwareComponent {
  /** Component name for logging and identification */
  readonly name: string;

  /**
   * Shutdown priority (higher = shutdown first).
   *
   * Recommended priorities:
   * - 100: HTTP Server (stop accepting connections first)
   * - 80: External services (Kong, Redis operations)
   * - 60: Cache/Database connections
   * - 40: Telemetry/Metrics
   * - 20: Profiling
   * - 10: Logging (shutdown last)
   */
  readonly priority: number;

  /**
   * Prepare the component for shutdown.
   * Called when entering DRAINING state.
   * Components should stop accepting new work.
   */
  prepareForShutdown(): Promise<void>;

  /**
   * Shutdown the component.
   * Called when entering STOPPING state.
   * Components should close connections and clean up resources.
   */
  shutdown(): Promise<void>;

  /**
   * Get the component's health status (optional).
   */
  getHealthStatus?(): ComponentHealthStatus;
}

/**
 * Component health status for reporting.
 */
export interface ComponentHealthStatus {
  name: string;
  healthy: boolean;
  details?: Record<string, unknown>;
}

/**
 * Result of a component shutdown operation.
 */
export interface ComponentShutdownResult {
  name: string;
  priority: number;
  success: boolean;
  durationMs: number;
  error?: string;
}

/**
 * Result of the full shutdown sequence.
 */
export interface ShutdownResult {
  success: boolean;
  totalDurationMs: number;
  components: ComponentShutdownResult[];
  failedComponents: string[];
}

/**
 * Configuration for shutdown behavior.
 */
export interface ShutdownConfig {
  /** Maximum time per component in milliseconds */
  componentTimeoutMs: number;
  /** Whether to continue shutdown if a component fails */
  continueOnError: boolean;
}

const DEFAULT_SHUTDOWN_CONFIG: ShutdownConfig = {
  componentTimeoutMs: 3000,
  continueOnError: true,
};

/**
 * Lifecycle Coordinator
 *
 * Manages lifecycle-aware components and orchestrates their shutdown:
 * - Registers components with priorities
 * - Prepares all components when entering DRAINING
 * - Shuts down components in priority order (high to low)
 * - Provides health aggregation
 */
export class LifecycleCoordinator {
  private components: LifecycleAwareComponent[] = [];
  private prepared = false;
  private shuttingDown = false;

  constructor() {
    // Subscribe to lifecycle state changes
    lifecycleStateMachine.onStateChange(this.handleStateChange.bind(this));
  }

  /**
   * Register a lifecycle-aware component.
   *
   * @param component - The component to register
   */
  register(component: LifecycleAwareComponent): void {
    // Check for duplicate registration
    if (this.components.some((c) => c.name === component.name)) {
      telemetryEmitter.warn(
        SpanEvents.LIFECYCLE_COMPONENT_REGISTERED,
        "Component already registered",
        {
          component: "lifecycle_coordinator",
          operation: "duplicate_registration",
          component_name: component.name,
        }
      );
      return;
    }

    this.components.push(component);

    // Sort by priority (descending - higher priority first)
    this.components.sort((a, b) => b.priority - a.priority);

    telemetryEmitter.info(
      SpanEvents.LIFECYCLE_COMPONENT_REGISTERED,
      `Registered component: ${component.name}`,
      {
        component: "lifecycle_coordinator",
        operation: "component_registered",
        component_name: component.name,
        priority: component.priority,
        total_components: this.components.length,
      }
    );
  }

  /**
   * Unregister a component.
   *
   * @param componentName - Name of the component to remove
   */
  unregister(componentName: string): boolean {
    const index = this.components.findIndex((c) => c.name === componentName);
    if (index !== -1) {
      this.components.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Handle lifecycle state changes.
   */
  private async handleStateChange(from: LifecycleState, to: LifecycleState): Promise<void> {
    if (to === LifecycleState.DRAINING && !this.prepared) {
      await this.prepareAll();
    }
  }

  /**
   * Prepare all components for shutdown.
   * Called automatically when entering DRAINING state.
   */
  async prepareAll(): Promise<void> {
    if (this.prepared) {
      return;
    }

    this.prepared = true;

    telemetryEmitter.info(
      SpanEvents.LIFECYCLE_SHUTDOWN_STARTED,
      "Preparing all components for shutdown",
      {
        component: "lifecycle_coordinator",
        operation: "prepare_all",
        component_count: this.components.length,
      }
    );

    // Prepare in priority order (high to low)
    for (const component of this.components) {
      try {
        await component.prepareForShutdown();
      } catch (error) {
        telemetryEmitter.error(
          SpanEvents.LIFECYCLE_COMPONENT_SHUTDOWN,
          `Failed to prepare component: ${component.name}`,
          {
            component: "lifecycle_coordinator",
            operation: "prepare_failed",
            component_name: component.name,
            error: error instanceof Error ? error.message : String(error),
          }
        );
      }
    }
  }

  /**
   * Shutdown all components in priority order.
   *
   * @param config - Shutdown configuration (optional)
   * @returns ShutdownResult with status of each component
   */
  async shutdownAll(config?: Partial<ShutdownConfig>): Promise<ShutdownResult> {
    if (this.shuttingDown) {
      return {
        success: false,
        totalDurationMs: 0,
        components: [],
        failedComponents: ["Shutdown already in progress"],
      };
    }

    this.shuttingDown = true;
    const shutdownConfig = { ...DEFAULT_SHUTDOWN_CONFIG, ...config };
    const startTime = Date.now();
    const results: ComponentShutdownResult[] = [];
    const failedComponents: string[] = [];

    telemetryEmitter.info(
      SpanEvents.LIFECYCLE_SHUTDOWN_STARTED,
      "Starting component shutdown sequence",
      {
        component: "lifecycle_coordinator",
        operation: "shutdown_all_started",
        component_count: this.components.length,
        component_timeout_ms: shutdownConfig.componentTimeoutMs,
      }
    );

    // Shutdown in priority order (high to low)
    for (const component of this.components) {
      const componentStart = Date.now();
      let success = true;
      let errorMessage: string | undefined;

      try {
        // Create timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(
            () => reject(new Error(`Component shutdown timeout: ${component.name}`)),
            shutdownConfig.componentTimeoutMs
          );
        });

        // Race shutdown against timeout
        await Promise.race([component.shutdown(), timeoutPromise]);
      } catch (error) {
        success = false;
        errorMessage = error instanceof Error ? error.message : String(error);
        failedComponents.push(component.name);

        telemetryEmitter.error(
          SpanEvents.LIFECYCLE_COMPONENT_SHUTDOWN,
          `Component shutdown failed: ${component.name}`,
          {
            component: "lifecycle_coordinator",
            operation: "component_shutdown_failed",
            component_name: component.name,
            priority: component.priority,
            error: error instanceof Error ? error.message : String(error),
          }
        );
      }

      const durationMs = Date.now() - componentStart;

      results.push({
        name: component.name,
        priority: component.priority,
        success,
        durationMs,
        error: errorMessage,
      });

      telemetryEmitter.info(
        SpanEvents.LIFECYCLE_COMPONENT_SHUTDOWN,
        `Component shutdown: ${component.name}`,
        {
          component: "lifecycle_coordinator",
          operation: "component_shutdown",
          component_name: component.name,
          priority: component.priority,
          success,
          duration_ms: durationMs,
        }
      );

      // Break after recording result if not continuing on error
      if (!success && !shutdownConfig.continueOnError) {
        break;
      }
    }

    const totalDurationMs = Date.now() - startTime;
    const success = failedComponents.length === 0;

    telemetryEmitter.info(
      SpanEvents.LIFECYCLE_SHUTDOWN_COMPLETED,
      "Component shutdown sequence completed",
      {
        component: "lifecycle_coordinator",
        operation: "shutdown_all_completed",
        success,
        total_duration_ms: totalDurationMs,
        components_shutdown: results.length,
        failed_count: failedComponents.length,
      }
    );

    return {
      success,
      totalDurationMs,
      components: results,
      failedComponents,
    };
  }

  /**
   * Get the list of registered components.
   */
  getComponents(): Array<{ name: string; priority: number }> {
    return this.components.map((c) => ({
      name: c.name,
      priority: c.priority,
    }));
  }

  /**
   * Get aggregated health status from all components.
   */
  getAggregatedHealth(): {
    healthy: boolean;
    components: ComponentHealthStatus[];
  } {
    const componentHealth: ComponentHealthStatus[] = [];
    let allHealthy = true;

    for (const component of this.components) {
      if (component.getHealthStatus) {
        const status = component.getHealthStatus();
        componentHealth.push(status);
        if (!status.healthy) {
          allHealthy = false;
        }
      } else {
        componentHealth.push({
          name: component.name,
          healthy: true,
          details: { status: "no_health_check" },
        });
      }
    }

    return {
      healthy: allHealthy,
      components: componentHealth,
    };
  }

  /**
   * Reset the coordinator.
   * Only for testing purposes.
   */
  reset(): void {
    this.components = [];
    this.prepared = false;
    this.shuttingDown = false;
  }
}

/**
 * Singleton instance of the lifecycle coordinator.
 */
export const lifecycleCoordinator = new LifecycleCoordinator();
