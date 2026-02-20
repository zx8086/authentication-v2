// src/services/cache/cache-connection-state.ts

import { winstonTelemetryLogger } from "../../telemetry/winston-logger";
import type { CircuitBreakerStateEnum } from "../../types/circuit-breaker.types";
import {
  CacheReconnectManager,
  type ReconnectManagerConfig,
  type ReconnectResult,
} from "../../utils/cache-reconnect-manager";
import { CacheCircuitBreaker, type CacheCircuitBreakerConfig } from "./cache-circuit-breaker";
import {
  CacheHealthMonitor,
  type CacheHealthMonitorConfig,
  type CacheHealthStatus,
} from "./cache-health-monitor";
import { type CacheOperationTimeouts, DEFAULT_OPERATION_TIMEOUTS } from "./cache-operation-timeout";

/**
 * Connection states for the cache.
 */
export type CacheConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error";

/**
 * Configuration for the connection state manager.
 */
export interface CacheConnectionStateConfig {
  /** Enable state management (default: true) */
  enabled: boolean;
  /** Circuit breaker configuration */
  circuitBreaker: CacheCircuitBreakerConfig;
  /** Reconnect manager configuration */
  reconnect: ReconnectManagerConfig;
  /** Health monitor configuration */
  healthMonitor: CacheHealthMonitorConfig;
  /** Operation timeouts */
  operationTimeouts: CacheOperationTimeouts;
}

/**
 * Comprehensive state snapshot.
 */
export interface CacheConnectionStateSnapshot {
  /** Current connection status */
  connectionStatus: CacheConnectionStatus;
  /** Health status from health monitor */
  healthStatus: CacheHealthStatus;
  /** Circuit breaker state */
  circuitBreakerState: CircuitBreakerStateEnum;
  /** Whether operations can proceed */
  canExecute: boolean;
  /** Whether reconnection is in progress */
  isReconnecting: boolean;
  /** Last error message if any */
  lastError: string | null;
  /** Timestamp of last successful operation */
  lastSuccessTime: number;
  /** Timestamp of last error */
  lastErrorTime: number;
  /** Uptime percentage (0-100) */
  uptimePercent: number;
  /** Time since last state change (ms) */
  timeSinceStateChange: number;
}

/**
 * Statistics for monitoring and metrics.
 */
export interface CacheConnectionStats {
  /** Total operations attempted */
  totalOperations: number;
  /** Successful operations */
  successfulOperations: number;
  /** Failed operations */
  failedOperations: number;
  /** Operations rejected by circuit breaker */
  rejectedOperations: number;
  /** Reconnection attempts */
  reconnectionAttempts: number;
  /** Successful reconnections */
  successfulReconnections: number;
  /** Connection uptime (0-100) */
  uptimePercent: number;
  /** Average operation latency (ms) */
  avgLatencyMs: number;
  /** Current state */
  currentState: CacheConnectionStatus;
}

/**
 * Centralized connection state manager for cache operations.
 *
 * Coordinates circuit breaker, health monitor, and reconnection logic
 * to provide a unified view of connection health and manage state transitions.
 *
 * @example
 * ```typescript
 * const stateManager = new CacheConnectionStateManager(config);
 *
 * // Connect with state management
 * stateManager.setConnectFunction(async () => {
 *   await client.connect();
 *   await client.ping();
 * });
 *
 * stateManager.setPingFunction(async () => {
 *   return await client.ping();
 * });
 *
 * // Before any operation
 * if (!stateManager.canExecute()) {
 *   throw new Error('Cache unavailable');
 * }
 *
 * try {
 *   const result = await operation();
 *   stateManager.recordSuccess();
 *   return result;
 * } catch (error) {
 *   stateManager.recordFailure(error);
 *   throw error;
 * }
 * ```
 */
export class CacheConnectionStateManager {
  private status: CacheConnectionStatus = "disconnected";
  private lastError: string | null = null;
  private lastSuccessTime = 0;
  private lastErrorTime = 0;
  private lastStateChange = Date.now();

  private totalOperations = 0;
  private successfulOperations = 0;
  private failedOperations = 0;
  private rejectedOperations = 0;
  private reconnectionAttempts = 0;
  private successfulReconnections = 0;
  private totalLatencyMs = 0;

  private readonly circuitBreaker: CacheCircuitBreaker;
  private readonly reconnectManager: CacheReconnectManager;
  private healthMonitor: CacheHealthMonitor | null = null;

  private connectFn: (() => Promise<void>) | null = null;
  private pingFn: (() => Promise<string | void>) | null = null;

  constructor(private readonly config: CacheConnectionStateConfig) {
    this.circuitBreaker = new CacheCircuitBreaker(config.circuitBreaker);
    this.reconnectManager = new CacheReconnectManager(config.reconnect);

    winstonTelemetryLogger.debug("Cache connection state manager initialized", {
      component: "cache_connection_state",
      operation: "init",
      config: {
        enabled: config.enabled,
        circuitBreakerEnabled: config.circuitBreaker.enabled,
        healthMonitorEnabled: config.healthMonitor.enabled,
      },
    });
  }

  /**
   * Set the connect function for reconnection.
   */
  setConnectFunction(fn: () => Promise<void>): void {
    this.connectFn = fn;
  }

  /**
   * Set the ping function for health checks.
   * Also initializes the health monitor if not already done.
   */
  setPingFunction(fn: () => Promise<string | void>): void {
    this.pingFn = fn;

    // Initialize health monitor with ping function
    if (!this.healthMonitor && this.config.healthMonitor.enabled) {
      this.healthMonitor = new CacheHealthMonitor(
        fn,
        this.circuitBreaker,
        this.config.healthMonitor
      );
    }
  }

  /**
   * Mark connection as established and start monitoring.
   */
  markConnected(): void {
    const previousStatus = this.status;
    this.status = "connected";
    this.lastSuccessTime = Date.now();
    this.lastError = null;

    if (previousStatus !== "connected") {
      this.lastStateChange = Date.now();
      this.logStateTransition(previousStatus, "connected");
    }

    // Reset circuit breaker on successful connection
    this.circuitBreaker.reset();
    this.reconnectManager.reset();

    // Start health monitoring
    if (this.healthMonitor) {
      this.healthMonitor.start();
    }
  }

  /**
   * Mark connection as disconnected and stop monitoring.
   */
  markDisconnected(): void {
    const previousStatus = this.status;
    this.status = "disconnected";

    if (previousStatus !== "disconnected") {
      this.lastStateChange = Date.now();
      this.logStateTransition(previousStatus, "disconnected");
    }

    // Stop health monitoring
    if (this.healthMonitor) {
      this.healthMonitor.stop();
    }
  }

  /**
   * Mark connection as broken (error state).
   *
   * @param error - The error that caused the disconnection
   */
  markError(error: Error | string): void {
    const previousStatus = this.status;
    this.status = "error";
    this.lastError = error instanceof Error ? error.message : error;
    this.lastErrorTime = Date.now();

    if (previousStatus !== "error") {
      this.lastStateChange = Date.now();
      this.logStateTransition(previousStatus, "error");
    }

    winstonTelemetryLogger.error("Cache connection error", {
      component: "cache_connection_state",
      operation: "connection_error",
      error: this.lastError,
      previousStatus,
    });
  }

  /**
   * Check if operations can be executed.
   * Considers circuit breaker state and connection status.
   *
   * @returns true if operations should proceed
   */
  canExecute(): boolean {
    if (!this.config.enabled) {
      return true;
    }

    // Check connection status first
    if (this.status === "disconnected" || this.status === "error") {
      return false;
    }

    // Check circuit breaker
    const canExecute = this.circuitBreaker.canExecute();
    if (!canExecute) {
      this.rejectedOperations++;
    }

    return canExecute;
  }

  /**
   * Record a successful operation.
   *
   * @param latencyMs - Operation latency in milliseconds
   */
  recordSuccess(latencyMs?: number): void {
    this.totalOperations++;
    this.successfulOperations++;
    this.lastSuccessTime = Date.now();

    if (latencyMs !== undefined) {
      this.totalLatencyMs += latencyMs;
    }

    // Update status if recovering
    if (this.status === "error" || this.status === "reconnecting") {
      this.status = "connected";
      this.lastStateChange = Date.now();
    }

    this.circuitBreaker.recordSuccess();

    // Mark health monitor as healthy
    if (this.healthMonitor) {
      this.healthMonitor.markHealthy();
    }
  }

  /**
   * Record a failed operation.
   *
   * @param error - The error that occurred
   */
  recordFailure(error: Error | string): void {
    this.totalOperations++;
    this.failedOperations++;
    this.lastError = error instanceof Error ? error.message : error;
    this.lastErrorTime = Date.now();

    // Record in circuit breaker (it filters connection errors internally)
    this.circuitBreaker.recordFailure(error instanceof Error ? error : new Error(error));
  }

  /**
   * Attempt to reconnect to the cache.
   *
   * @returns Result of the reconnection attempt
   */
  async reconnect(): Promise<ReconnectResult> {
    if (!this.connectFn) {
      return {
        success: false,
        error: new Error("No connect function configured"),
        attempts: 0,
        durationMs: 0,
      };
    }

    // Update status
    const previousStatus = this.status;
    this.status = "reconnecting";

    if (previousStatus !== "reconnecting") {
      this.lastStateChange = Date.now();
      this.logStateTransition(previousStatus, "reconnecting");
    }

    this.reconnectionAttempts++;

    const result = await this.reconnectManager.executeReconnect(this.connectFn);

    if (result.success) {
      this.successfulReconnections++;
      this.markConnected();
    } else {
      this.markError(result.error || new Error("Reconnection failed"));
    }

    return result;
  }

  /**
   * Get current state snapshot.
   */
  getSnapshot(): CacheConnectionStateSnapshot {
    const now = Date.now();
    const uptimePercent = this.calculateUptime();

    return {
      connectionStatus: this.status,
      healthStatus: this.healthMonitor?.getStatus() ?? "unknown",
      circuitBreakerState: this.circuitBreaker.getState(),
      canExecute: this.canExecute(),
      isReconnecting: this.reconnectManager.isReconnecting(),
      lastError: this.lastError,
      lastSuccessTime: this.lastSuccessTime,
      lastErrorTime: this.lastErrorTime,
      uptimePercent,
      timeSinceStateChange: now - this.lastStateChange,
    };
  }

  /**
   * Get connection statistics for metrics.
   */
  getStats(): CacheConnectionStats {
    return {
      totalOperations: this.totalOperations,
      successfulOperations: this.successfulOperations,
      failedOperations: this.failedOperations,
      rejectedOperations: this.rejectedOperations,
      reconnectionAttempts: this.reconnectionAttempts,
      successfulReconnections: this.successfulReconnections,
      uptimePercent: this.calculateUptime(),
      avgLatencyMs: this.totalOperations > 0 ? this.totalLatencyMs / this.totalOperations : 0,
      currentState: this.status,
    };
  }

  /**
   * Calculate uptime percentage based on success/failure ratio.
   */
  private calculateUptime(): number {
    if (this.totalOperations === 0) {
      return this.status === "connected" ? 100 : 0;
    }
    return Math.round((this.successfulOperations / this.totalOperations) * 10000) / 100;
  }

  /**
   * Log state transitions.
   */
  private logStateTransition(from: CacheConnectionStatus, to: CacheConnectionStatus): void {
    const logMethod = to === "error" ? "error" : to === "reconnecting" ? "warn" : "info";

    winstonTelemetryLogger[logMethod]("Cache connection state transition", {
      component: "cache_connection_state",
      operation: "state_transition",
      fromState: from,
      toState: to,
      circuitBreakerState: this.circuitBreaker.getState(),
      lastError: this.lastError,
    });
  }

  /**
   * Get the circuit breaker instance.
   */
  getCircuitBreaker(): CacheCircuitBreaker {
    return this.circuitBreaker;
  }

  /**
   * Get the reconnect manager instance.
   */
  getReconnectManager(): CacheReconnectManager {
    return this.reconnectManager;
  }

  /**
   * Get the health monitor instance (if initialized).
   */
  getHealthMonitor(): CacheHealthMonitor | null {
    return this.healthMonitor;
  }

  /**
   * Get current connection status.
   */
  getStatus(): CacheConnectionStatus {
    return this.status;
  }

  /**
   * Check if currently connected.
   */
  isConnected(): boolean {
    return this.status === "connected";
  }

  /**
   * Check if reconnection is in progress.
   */
  isReconnecting(): boolean {
    return this.status === "reconnecting";
  }

  /**
   * Reset all state (useful for testing or manual recovery).
   */
  reset(): void {
    this.status = "disconnected";
    this.lastError = null;
    this.lastSuccessTime = 0;
    this.lastErrorTime = 0;
    this.lastStateChange = Date.now();
    this.totalOperations = 0;
    this.successfulOperations = 0;
    this.failedOperations = 0;
    this.rejectedOperations = 0;
    this.reconnectionAttempts = 0;
    this.successfulReconnections = 0;
    this.totalLatencyMs = 0;

    this.circuitBreaker.reset();
    this.reconnectManager.reset();
    this.healthMonitor?.reset();

    winstonTelemetryLogger.info("Cache connection state manager reset", {
      component: "cache_connection_state",
      operation: "reset",
    });
  }

  /**
   * Shutdown the manager and stop monitoring.
   */
  shutdown(): void {
    this.healthMonitor?.stop();
    this.markDisconnected();

    winstonTelemetryLogger.info("Cache connection state manager shutdown", {
      component: "cache_connection_state",
      operation: "shutdown",
      stats: this.getStats(),
    });
  }

  /**
   * Get operation timeouts configuration.
   */
  getOperationTimeouts(): CacheOperationTimeouts {
    return this.config.operationTimeouts;
  }
}

/**
 * Create default configuration for the connection state manager.
 */
export function createDefaultConnectionStateConfig(
  overrides?: Partial<CacheConnectionStateConfig>
): CacheConnectionStateConfig {
  return {
    enabled: true,
    circuitBreaker: {
      enabled: true,
      failureThreshold: 5,
      resetTimeout: 30000,
      successThreshold: 2,
    },
    reconnect: {
      maxAttempts: 5,
      baseDelayMs: 100,
      maxDelayMs: 5000,
      cooldownMs: 60000,
    },
    healthMonitor: {
      enabled: true,
      intervalMs: 10000,
      unhealthyThreshold: 3,
      healthyThreshold: 2,
      pingTimeoutMs: 500,
    },
    operationTimeouts: { ...DEFAULT_OPERATION_TIMEOUTS },
    ...overrides,
  };
}
