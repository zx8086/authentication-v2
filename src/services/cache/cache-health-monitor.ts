// src/services/cache/cache-health-monitor.ts

import { winstonTelemetryLogger } from "../../telemetry/winston-logger";
import type { CacheCircuitBreaker, CacheCircuitBreakerStats } from "./cache-circuit-breaker";
import { withOperationTimeout } from "./cache-operation-timeout";

/**
 * Health status of the cache connection.
 */
export type CacheHealthStatus = "healthy" | "degraded" | "unhealthy" | "unknown";

/**
 * Configuration for the cache health monitor.
 */
export interface CacheHealthMonitorConfig {
  /** Enable/disable health monitoring (default: true) */
  enabled: boolean;
  /** Interval between health checks in milliseconds (default: 10000) */
  intervalMs: number;
  /** Number of consecutive failures before marking unhealthy (default: 3) */
  unhealthyThreshold: number;
  /** Number of consecutive successes before marking healthy (default: 2) */
  healthyThreshold: number;
  /** Timeout for PING command in milliseconds (default: 500) */
  pingTimeoutMs: number;
}

/**
 * Health check result.
 */
export interface CacheHealthCheckResult {
  /** Whether the health check succeeded */
  success: boolean;
  /** Response time in milliseconds (undefined if failed) */
  responseTimeMs?: number;
  /** Error message if health check failed */
  error?: string;
  /** Timestamp of the health check */
  timestamp: number;
}

/**
 * Current health state.
 */
export interface CacheHealthState {
  /** Current health status */
  status: CacheHealthStatus;
  /** Number of consecutive successes */
  consecutiveSuccesses: number;
  /** Number of consecutive failures */
  consecutiveFailures: number;
  /** Last health check result */
  lastCheck: CacheHealthCheckResult | null;
  /** Last status change timestamp */
  lastStatusChange: number;
  /** Average response time over recent checks (ms) */
  avgResponseTimeMs: number;
  /** Whether monitoring is currently active */
  isMonitoring: boolean;
}

/**
 * Default configuration (balanced settings).
 */
export const DEFAULT_HEALTH_MONITOR_CONFIG: CacheHealthMonitorConfig = {
  enabled: true,
  intervalMs: 10000,
  unhealthyThreshold: 3,
  healthyThreshold: 2,
  pingTimeoutMs: 500,
};

/**
 * Background health monitor for cache connections.
 *
 * Performs periodic PING checks to detect connection issues early.
 * Integrates with circuit breaker to trip when health degrades.
 *
 * State machine:
 * - healthy: All checks passing, normal operation
 * - degraded: Some checks failing, still operational
 * - unhealthy: Multiple consecutive failures, likely disconnected
 * - unknown: No checks performed yet
 *
 * @example
 * ```typescript
 * const monitor = new CacheHealthMonitor(
 *   () => redisClient.ping(),
 *   circuitBreaker,
 *   { intervalMs: 10000, unhealthyThreshold: 3 }
 * );
 *
 * await monitor.start();
 *
 * // Check current status
 * const state = monitor.getState();
 * if (state.status === 'unhealthy') {
 *   logger.error('Cache is unhealthy', { failures: state.consecutiveFailures });
 * }
 *
 * // Stop when shutting down
 * monitor.stop();
 * ```
 */
export class CacheHealthMonitor {
  private status: CacheHealthStatus = "unknown";
  private consecutiveSuccesses = 0;
  private consecutiveFailures = 0;
  private lastCheck: CacheHealthCheckResult | null = null;
  private lastStatusChange = Date.now();
  private recentResponseTimes: number[] = [];
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;

  private static readonly MAX_RESPONSE_TIME_SAMPLES = 10;

  constructor(
    private readonly pingFn: () => Promise<string | void>,
    private readonly circuitBreaker: CacheCircuitBreaker | null = null,
    private readonly config: CacheHealthMonitorConfig = DEFAULT_HEALTH_MONITOR_CONFIG
  ) {
    winstonTelemetryLogger.debug("Cache health monitor initialized", {
      component: "cache_health_monitor",
      operation: "init",
      config: {
        enabled: config.enabled,
        intervalMs: config.intervalMs,
        unhealthyThreshold: config.unhealthyThreshold,
        healthyThreshold: config.healthyThreshold,
      },
    });
  }

  /**
   * Start background health monitoring.
   *
   * @returns true if monitoring started, false if already running or disabled
   */
  start(): boolean {
    if (!this.config.enabled) {
      winstonTelemetryLogger.debug("Health monitoring disabled", {
        component: "cache_health_monitor",
        operation: "start_skipped",
      });
      return false;
    }

    if (this.isRunning) {
      winstonTelemetryLogger.debug("Health monitoring already running", {
        component: "cache_health_monitor",
        operation: "start_skipped",
      });
      return false;
    }

    this.isRunning = true;

    // Perform initial check immediately
    this.performHealthCheck().catch((error) => {
      winstonTelemetryLogger.warn("Initial health check failed", {
        component: "cache_health_monitor",
        operation: "initial_check",
        error: error instanceof Error ? error.message : String(error),
      });
    });

    // Schedule periodic checks
    this.intervalId = setInterval(() => {
      this.performHealthCheck().catch((error) => {
        winstonTelemetryLogger.warn("Periodic health check failed", {
          component: "cache_health_monitor",
          operation: "periodic_check",
          error: error instanceof Error ? error.message : String(error),
        });
      });
    }, this.config.intervalMs);

    // Ensure interval doesn't prevent process exit (Bun/Node compatible)
    if (this.intervalId && typeof this.intervalId === "object" && "unref" in this.intervalId) {
      (this.intervalId as { unref: () => void }).unref();
    }

    winstonTelemetryLogger.info("Cache health monitoring started", {
      component: "cache_health_monitor",
      operation: "start",
      intervalMs: this.config.intervalMs,
    });

    return true;
  }

  /**
   * Stop background health monitoring.
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;

    winstonTelemetryLogger.info("Cache health monitoring stopped", {
      component: "cache_health_monitor",
      operation: "stop",
      lastStatus: this.status,
    });
  }

  /**
   * Perform a single health check.
   *
   * @returns The health check result
   */
  async performHealthCheck(): Promise<CacheHealthCheckResult> {
    const startTime = Date.now();

    try {
      // Use timeout wrapper for the PING operation
      await withOperationTimeout("PING", this.config.pingTimeoutMs, this.pingFn());

      const responseTimeMs = Date.now() - startTime;

      const result: CacheHealthCheckResult = {
        success: true,
        responseTimeMs,
        timestamp: startTime,
      };

      this.recordSuccess(result);
      return result;
    } catch (error) {
      const result: CacheHealthCheckResult = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: startTime,
      };

      this.recordFailure(result, error);
      return result;
    }
  }

  /**
   * Record a successful health check.
   */
  private recordSuccess(result: CacheHealthCheckResult): void {
    this.consecutiveSuccesses++;
    this.consecutiveFailures = 0;
    this.lastCheck = result;

    // Track response time
    if (result.responseTimeMs !== undefined) {
      this.recentResponseTimes.push(result.responseTimeMs);
      if (this.recentResponseTimes.length > CacheHealthMonitor.MAX_RESPONSE_TIME_SAMPLES) {
        this.recentResponseTimes.shift();
      }
    }

    // Update status
    const previousStatus = this.status;
    if (this.consecutiveSuccesses >= this.config.healthyThreshold) {
      this.status = "healthy";
    } else if (this.status === "unhealthy") {
      this.status = "degraded";
    }

    if (previousStatus !== this.status) {
      this.lastStatusChange = Date.now();
      this.logStatusTransition(previousStatus, this.status);
    }

    // Notify circuit breaker of success
    if (this.circuitBreaker) {
      this.circuitBreaker.recordSuccess();
    }

    winstonTelemetryLogger.debug("Health check succeeded", {
      component: "cache_health_monitor",
      operation: "health_check_success",
      responseTimeMs: result.responseTimeMs,
      consecutiveSuccesses: this.consecutiveSuccesses,
      status: this.status,
    });
  }

  /**
   * Record a failed health check.
   */
  private recordFailure(result: CacheHealthCheckResult, error: unknown): void {
    this.consecutiveFailures++;
    this.consecutiveSuccesses = 0;
    this.lastCheck = result;

    // Update status
    const previousStatus = this.status;
    if (this.consecutiveFailures >= this.config.unhealthyThreshold) {
      this.status = "unhealthy";
    } else if (this.status === "healthy") {
      this.status = "degraded";
    }

    if (previousStatus !== this.status) {
      this.lastStatusChange = Date.now();
      this.logStatusTransition(previousStatus, this.status);
    }

    // Notify circuit breaker of failure
    if (this.circuitBreaker && error instanceof Error) {
      this.circuitBreaker.recordFailure(error);
    }

    winstonTelemetryLogger.warn("Health check failed", {
      component: "cache_health_monitor",
      operation: "health_check_failed",
      error: result.error,
      consecutiveFailures: this.consecutiveFailures,
      unhealthyThreshold: this.config.unhealthyThreshold,
      status: this.status,
    });
  }

  /**
   * Log status transitions.
   */
  private logStatusTransition(from: CacheHealthStatus, to: CacheHealthStatus): void {
    const logMethod = to === "unhealthy" ? "error" : to === "degraded" ? "warn" : "info";

    winstonTelemetryLogger[logMethod]("Cache health status changed", {
      component: "cache_health_monitor",
      operation: "status_transition",
      fromStatus: from,
      toStatus: to,
      consecutiveSuccesses: this.consecutiveSuccesses,
      consecutiveFailures: this.consecutiveFailures,
    });
  }

  /**
   * Get current health state.
   */
  getState(): CacheHealthState {
    const avgResponseTimeMs =
      this.recentResponseTimes.length > 0
        ? this.recentResponseTimes.reduce((a, b) => a + b, 0) / this.recentResponseTimes.length
        : 0;

    return {
      status: this.status,
      consecutiveSuccesses: this.consecutiveSuccesses,
      consecutiveFailures: this.consecutiveFailures,
      lastCheck: this.lastCheck,
      lastStatusChange: this.lastStatusChange,
      avgResponseTimeMs: Math.round(avgResponseTimeMs * 100) / 100,
      isMonitoring: this.isRunning,
    };
  }

  /**
   * Get current status.
   */
  getStatus(): CacheHealthStatus {
    return this.status;
  }

  /**
   * Check if cache is considered healthy.
   */
  isHealthy(): boolean {
    return this.status === "healthy";
  }

  /**
   * Check if cache is considered unhealthy.
   */
  isUnhealthy(): boolean {
    return this.status === "unhealthy";
  }

  /**
   * Check if monitoring is currently active.
   */
  isMonitoringActive(): boolean {
    return this.isRunning;
  }

  /**
   * Force a health check now (outside of scheduled interval).
   *
   * @returns The health check result
   */
  async checkNow(): Promise<CacheHealthCheckResult> {
    return this.performHealthCheck();
  }

  /**
   * Reset the monitor state.
   * Useful when connection is re-established.
   */
  reset(): void {
    this.status = "unknown";
    this.consecutiveSuccesses = 0;
    this.consecutiveFailures = 0;
    this.lastCheck = null;
    this.lastStatusChange = Date.now();
    this.recentResponseTimes = [];

    winstonTelemetryLogger.debug("Health monitor reset", {
      component: "cache_health_monitor",
      operation: "reset",
    });
  }

  /**
   * Mark as healthy without performing a check.
   * Useful when connection is known to be good (e.g., after successful operation).
   */
  markHealthy(): void {
    const previousStatus = this.status;
    this.status = "healthy";
    this.consecutiveSuccesses = this.config.healthyThreshold;
    this.consecutiveFailures = 0;

    if (previousStatus !== "healthy") {
      this.lastStatusChange = Date.now();
      this.logStatusTransition(previousStatus, "healthy");
    }
  }

  /**
   * Get circuit breaker stats if available.
   */
  getCircuitBreakerStats(): CacheCircuitBreakerStats | null {
    return this.circuitBreaker?.getStats() ?? null;
  }
}
