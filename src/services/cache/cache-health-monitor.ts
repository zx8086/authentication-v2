// src/services/cache/cache-health-monitor.ts

import { winstonTelemetryLogger } from "../../telemetry/winston-logger";
import type { CacheCircuitBreaker, CacheCircuitBreakerStats } from "./cache-circuit-breaker";
import { withOperationTimeout } from "./cache-operation-timeout";

export type CacheHealthStatus = "healthy" | "degraded" | "unhealthy" | "unknown";

export interface CacheHealthMonitorConfig {
  enabled: boolean;
  intervalMs: number;
  unhealthyThreshold: number;
  healthyThreshold: number;
  pingTimeoutMs: number;
}

export interface CacheHealthCheckResult {
  success: boolean;
  responseTimeMs?: number;
  error?: string;
  timestamp: number;
}

export interface CacheHealthState {
  status: CacheHealthStatus;
  consecutiveSuccesses: number;
  consecutiveFailures: number;
  lastCheck: CacheHealthCheckResult | null;
  lastStatusChange: number;
  avgResponseTimeMs: number;
  isMonitoring: boolean;
}

export const DEFAULT_HEALTH_MONITOR_CONFIG: CacheHealthMonitorConfig = {
  enabled: true,
  intervalMs: 10000,
  unhealthyThreshold: 3,
  healthyThreshold: 2,
  pingTimeoutMs: 500,
};

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
    private readonly pingFn: () => Promise<void>,
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

    this.performHealthCheck().catch((error) => {
      winstonTelemetryLogger.warn("Initial health check failed", {
        component: "cache_health_monitor",
        operation: "initial_check",
        error: error instanceof Error ? error.message : String(error),
      });
    });

    this.intervalId = setInterval(() => {
      this.performHealthCheck().catch((error) => {
        winstonTelemetryLogger.warn("Periodic health check failed", {
          component: "cache_health_monitor",
          operation: "periodic_check",
          error: error instanceof Error ? error.message : String(error),
        });
      });
    }, this.config.intervalMs);

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

  async performHealthCheck(): Promise<CacheHealthCheckResult> {
    const startTime = Date.now();

    try {
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

  private recordSuccess(result: CacheHealthCheckResult): void {
    this.consecutiveSuccesses++;
    this.consecutiveFailures = 0;
    this.lastCheck = result;

    if (result.responseTimeMs !== undefined) {
      this.recentResponseTimes.push(result.responseTimeMs);
      if (this.recentResponseTimes.length > CacheHealthMonitor.MAX_RESPONSE_TIME_SAMPLES) {
        this.recentResponseTimes.shift();
      }
    }

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

  private recordFailure(result: CacheHealthCheckResult, error: unknown): void {
    this.consecutiveFailures++;
    this.consecutiveSuccesses = 0;
    this.lastCheck = result;

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

  getStatus(): CacheHealthStatus {
    return this.status;
  }

  isHealthy(): boolean {
    return this.status === "healthy";
  }

  isUnhealthy(): boolean {
    return this.status === "unhealthy";
  }

  isMonitoringActive(): boolean {
    return this.isRunning;
  }

  async checkNow(): Promise<CacheHealthCheckResult> {
    return this.performHealthCheck();
  }

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

  getCircuitBreakerStats(): CacheCircuitBreakerStats | null {
    return this.circuitBreaker?.getStats() ?? null;
  }
}
