/* src/handlers/health.ts */

import { dns } from "bun";
import pkg from "../../package.json" with { type: "json" };
import { loadConfig } from "../config/index";
import { lifecycleStateMachine } from "../lifecycle";
import { CacheFactory } from "../services/cache/cache-factory";
import { CacheHealthService } from "../services/cache-health.service";
import type { IKongService } from "../services/kong.service";
import {
  getLogExportStats,
  getMetricsExportStats,
  getSimpleTelemetryStatus,
  getTelemetryStatus,
  getTraceExportStats,
} from "../telemetry/instrumentation";
import { getMetricsStatus } from "../telemetry/metrics";
import { getSlaMonitor } from "../telemetry/sla-monitor";
import { fetchWithFallback } from "../utils/bun-fetch-fallback";
import { log } from "../utils/logger";
import {
  calculateDuration,
  formatResponseTime,
  formatUptime,
  getHighResTime,
} from "../utils/performance";
import { createHealthResponse, generateRequestId } from "../utils/response";
import { determineHealthStatus } from "./health-status";

const config = loadConfig();

/**
 * Check OTLP endpoint health using fetchWithFallback to handle Bun networking issues.
 * Uses HEAD request with curl fallback for IP addresses that Bun's fetch cannot reach.
 */
async function checkOtlpEndpointHealth(url: string): Promise<{
  healthy: boolean;
  responseTime: string;
  error?: string;
}> {
  if (!url) {
    return { healthy: false, responseTime: "0ms", error: "URL not configured" };
  }

  const startTime = getHighResTime();
  try {
    // Use fetchWithFallback to handle Bun networking issues with certain IP addresses
    const response = await fetchWithFallback(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(5000),
    });
    const responseTime = calculateDuration(startTime);

    return {
      healthy: response.status < 500,
      responseTime: formatResponseTime(responseTime),
      error: response.status >= 500 ? `HTTP ${response.status}` : undefined,
    };
  } catch (error) {
    const responseTime = calculateDuration(startTime);
    return {
      healthy: false,
      responseTime: formatResponseTime(responseTime),
      error: error instanceof Error ? error.message : "Connection failed",
    };
  }
}

export async function handleHealthCheck(kongService: IKongService): Promise<Response> {
  log("Processing health check request", {
    event_name: "health.check.initiated",
    component: "health",
    operation: "handle_health_check",
    endpoint: "/health",
  });

  const requestId = generateRequestId();
  const startTime = getHighResTime();

  try {
    // Perform Kong health check with error handling
    const kongHealthStartTime = getHighResTime();
    let kongHealth: Awaited<ReturnType<IKongService["healthCheck"]>>;
    try {
      kongHealth = await kongService.healthCheck();
    } catch (kongError) {
      log("Kong health check failed with exception during health endpoint check", {
        event_name: "kong.health_check.failed",
        component: "health",
        operation: "kong_health_check",
        error: kongError instanceof Error ? kongError.message : "Unknown error",
        request_id: requestId,
      });
      kongHealth = {
        healthy: false,
        responseTime: 0,
        error: kongError instanceof Error ? kongError.message : "Connection failed",
      };
    }
    const kongHealthDuration = calculateDuration(kongHealthStartTime);

    // Perform cache health check
    const cacheHealthService = CacheHealthService.getInstance();
    const cacheService = await CacheFactory.createKongCache();
    let cacheHealth: {
      status: "healthy" | "unhealthy" | "degraded";
      type: "redis" | "memory";
      serverType?: "redis" | "valkey";
      responseTime: string;
      staleCache?: {
        available: boolean;
        responseTime?: string;
        error?: string;
      };
    };

    let cacheStats: Awaited<ReturnType<typeof cacheService.getStats>> | null = null;

    // Declare healthMonitorState outside try block so it's accessible in healthData
    let healthMonitorState: {
      status: string;
      isMonitoring: boolean;
      consecutiveSuccesses: number;
      consecutiveFailures: number;
      lastStatusChange: string;
      lastCheck?: {
        success: boolean;
        timestamp: string;
        responseTimeMs?: number;
        error?: string;
      };
    } | null = null;

    try {
      const basicCacheHealth = await cacheHealthService.checkCacheHealth(cacheService);
      cacheHealth = { ...basicCacheHealth };

      // Get cache statistics (entries, hit rate, etc.)
      try {
        cacheStats = await cacheService.getStats();
      } catch (statsError) {
        log("Failed to get cache stats during health check", {
          event_name: "cache.stats.failed",
          component: "health",
          operation: "cache_stats",
          error: statsError instanceof Error ? statsError.message : "Unknown error",
          request_id: requestId,
        });
      }

      // Get cache health monitor state for resilience diagnostics
      try {
        const resilienceStats = (
          cacheService as import("../cache/cache-manager").UnifiedCacheManager
        ).getResilienceStats?.();
        if (resilienceStats?.health) {
          const h = resilienceStats.health;
          healthMonitorState = {
            status: h.status,
            isMonitoring: h.isMonitoring,
            consecutiveSuccesses: h.consecutiveSuccesses,
            consecutiveFailures: h.consecutiveFailures,
            lastStatusChange: new Date(h.lastStatusChange).toISOString(),
            ...(h.lastCheck && {
              lastCheck: {
                success: h.lastCheck.success,
                timestamp: new Date(h.lastCheck.timestamp).toISOString(),
                ...(h.lastCheck.responseTimeMs !== undefined && {
                  responseTimeMs: Math.round(h.lastCheck.responseTimeMs * 100) / 100,
                }),
                ...(h.lastCheck.error && { error: h.lastCheck.error }),
              },
            }),
          };
        }
      } catch (resilienceError) {
        log("Failed to get cache resilience stats during health check", {
          event_name: "cache.resilience_stats.failed",
          component: "health",
          operation: "cache_resilience_stats",
          error: resilienceError instanceof Error ? resilienceError.message : "Unknown error",
          request_id: requestId,
        });
      }

      // Check stale cache availability in HA mode
      if (config.caching.highAvailability && cacheService.getStale) {
        const staleCacheStartTime = getHighResTime();
        try {
          // Test stale cache access with a non-existent key to verify connectivity
          await cacheService.getStale("health_check_stale_test");
          const staleCacheResponseTime = calculateDuration(staleCacheStartTime);
          cacheHealth.staleCache = {
            available: true,
            responseTime: formatResponseTime(staleCacheResponseTime),
          };
        } catch (staleCacheError) {
          const staleCacheResponseTime = calculateDuration(staleCacheStartTime);
          cacheHealth.staleCache = {
            available: false,
            responseTime: formatResponseTime(staleCacheResponseTime),
            error: staleCacheError instanceof Error ? staleCacheError.message : "Unknown error",
          };
        }
      } else if (!config.caching.highAvailability) {
        // In non-HA mode, stale cache is always available via in-memory circuit breaker cache
        cacheHealth.staleCache = {
          available: true,
        };
      }
    } catch (error) {
      log("Cache health check failed", {
        event_name: "cache.health_check.failed",
        component: "health",
        operation: "cache_health_check",
        error: error instanceof Error ? error.message : "Unknown error",
        request_id: requestId,
      });
      cacheHealth = {
        status: "unhealthy" as const,
        type: config.caching.highAvailability ? ("redis" as const) : ("memory" as const),
        responseTime: "0ms",
        staleCache: {
          available: false,
          error: "Cache service unavailable",
        },
      };
    }

    // Perform telemetry health checks
    const telemetryConfig = config.telemetry;
    const otlpChecks = await Promise.all([
      telemetryConfig.tracesEndpoint
        ? checkOtlpEndpointHealth(telemetryConfig.tracesEndpoint)
        : { healthy: true, responseTime: "0ms" },
      telemetryConfig.metricsEndpoint
        ? checkOtlpEndpointHealth(telemetryConfig.metricsEndpoint)
        : { healthy: true, responseTime: "0ms" },
      telemetryConfig.logsEndpoint
        ? checkOtlpEndpointHealth(telemetryConfig.logsEndpoint)
        : { healthy: true, responseTime: "0ms" },
    ]);

    const [tracesHealth, metricsHealth, logsHealth] = otlpChecks;

    // Get telemetry export stats for each type
    const traceExportStats = getTraceExportStats();
    const metricsExportStats = getMetricsExportStats();
    const logExportStats = getLogExportStats();

    // Get circuit breaker stats for telemetry health summary
    let circuitBreakerStats: Record<
      string,
      import("../types/circuit-breaker.types").OpossumCircuitBreakerStats
    > = {};
    try {
      circuitBreakerStats = kongService.getCircuitBreakerStats();
    } catch (error) {
      log("Circuit breaker stats retrieval failed (non-critical)", {
        event_name: "circuit_breaker.stats.failed",
        component: "health",
        operation: "circuit_breaker_stats",
        error: error instanceof Error ? error.message : "Unknown error",
        request_id: requestId,
      });
    }

    // Calculate circuit breaker summary for telemetry export health
    let circuitBreakerState: "closed" | "open" | "half-open" = "closed";
    for (const breakerStat of Object.values(circuitBreakerStats)) {
      if (breakerStat.state === "open") {
        circuitBreakerState = "open";
        break;
      } else if (breakerStat.state === "half-open") {
        circuitBreakerState = "half-open";
      }
    }

    const { httpStatus: statusCode, healthStatus } = determineHealthStatus({
      kong: { healthy: kongHealth.healthy },
      cache: {
        status: cacheHealth.status,
        staleCacheAvailable: cacheHealth.staleCache?.available ?? false,
      },
      telemetry: {
        traces: { healthy: tracesHealth.healthy },
        metrics: { healthy: metricsHealth.healthy },
        logs: { healthy: logsHealth.healthy },
      },
    });

    const duration = calculateDuration(startTime);

    // Get DNS cache stats for observability
    const dnsStats = dns.getCacheStats();
    const dnsCacheHitRate =
      dnsStats.totalCount > 0
        ? Math.round(
            ((dnsStats.cacheHitsCompleted + dnsStats.cacheHitsInflight) / dnsStats.totalCount) *
              10000
          ) / 100
        : 0;

    const healthData = {
      status: healthStatus,
      timestamp: new Date().toISOString(),
      version: pkg.version || "1.0.0",
      environment: config.server.nodeEnv,
      uptime: formatUptime(Math.floor(process.uptime())),
      highAvailability: config.caching.highAvailability,
      circuitBreakerState: circuitBreakerState,
      dns: {
        cacheSize: dnsStats.size,
        hitRate: `${dnsCacheHitRate}%`,
        hits: dnsStats.cacheHitsCompleted + dnsStats.cacheHitsInflight,
        misses: dnsStats.cacheMisses,
        errors: dnsStats.errors,
        totalLookups: dnsStats.totalCount,
      },
      dependencies: {
        kong: {
          status: kongHealth.healthy ? "healthy" : "unhealthy",
          responseTime: formatResponseTime(kongHealthDuration),
          details: {
            adminUrl: config.kong.adminUrl,
            mode: config.kong.mode,
            ...(kongHealth.error && { error: kongHealth.error }),
          },
        },
        cache: {
          type: cacheHealth.serverType || cacheHealth.type,
          connection: {
            connected: cacheStats?.redisConnected ?? true,
            responseTime: cacheHealth.responseTime,
          },
          entries: {
            primary: cacheStats?.primary.entries ?? 0,
            primaryActive: cacheStats?.primary.activeEntries ?? 0,
            stale: cacheStats?.stale.entries ?? 0,
            staleCacheAvailable: cacheHealth.staleCache?.available ?? false,
          },
          performance: {
            hitRate: cacheStats ? `${cacheStats.hitRate}%` : "0%",
            avgLatencyMs: cacheStats ? Math.round(cacheStats.averageLatencyMs * 100) / 100 : 0,
          },
          healthMonitor: healthMonitorState,
        },
        telemetry: {
          traces: {
            status: tracesHealth.healthy ? "healthy" : "unhealthy",
            endpoint: telemetryConfig.tracesEndpoint || "not configured",
            responseTime: tracesHealth.responseTime,
            exports: traceExportStats,
            ...("error" in tracesHealth && tracesHealth.error && { error: tracesHealth.error }),
          },
          metrics: {
            status: metricsHealth.healthy ? "healthy" : "unhealthy",
            endpoint: telemetryConfig.metricsEndpoint || "not configured",
            responseTime: metricsHealth.responseTime,
            exports: metricsExportStats.getStats(),
            ...("error" in metricsHealth && metricsHealth.error && { error: metricsHealth.error }),
          },
          logs: {
            status: logsHealth.healthy ? "healthy" : "unhealthy",
            endpoint: telemetryConfig.logsEndpoint || "not configured",
            responseTime: logsHealth.responseTime,
            exports: logExportStats,
            ...("error" in logsHealth && logsHealth.error && { error: logsHealth.error }),
          },
        },
      },
      requestId,
    };

    log("Health check completed", {
      event_name: "health.check.success",
      component: "health",
      duration_ms: duration,
      status: healthStatus,
      kong_healthy: kongHealth.healthy,
      cache_healthy: cacheHealth.status === "healthy",
      cache_type: cacheHealth.type,
      telemetry_healthy: tracesHealth.healthy && metricsHealth.healthy && logsHealth.healthy,
      request_id: requestId,
    });

    // Record latency for SLA monitoring
    const slaMonitor = getSlaMonitor();
    await slaMonitor.recordLatency("/health", duration);

    log("HTTP request processed", {
      event_name: "http.request.completed",
      method: "GET",
      path: "/health",
      status_code: statusCode,
      duration_ms: duration,
      request_id: requestId,
    });

    return createHealthResponse(healthData, statusCode, requestId);
  } catch (error) {
    const duration = calculateDuration(startTime);

    log("Health check failed", {
      event_name: "health.check.failed",
      component: "health",
      duration_ms: duration,
      error: error instanceof Error ? error.message : "Unknown error",
      request_id: requestId,
    });

    log("HTTP request processed", {
      event_name: "http.request.completed",
      method: "GET",
      path: "/health",
      status_code: 500,
      duration_ms: duration,
      request_id: requestId,
    });

    return createHealthResponse(
      {
        status: "unhealthy",
        error: "Health check failed",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
        requestId,
      },
      500,
      requestId
    );
  }
}

export function handleTelemetryHealth(): Response {
  const requestId = generateRequestId();
  const startTime = getHighResTime();

  log("Processing telemetry health request", {
    event_name: "health.telemetry.initiated",
    component: "health",
    operation: "handle_telemetry_health",
    endpoint: "/health/telemetry",
    request_id: requestId,
  });

  try {
    const telemetryStatus = getTelemetryStatus();
    const simpleTelemetryStatus = getSimpleTelemetryStatus();

    const responseData = {
      telemetry: {
        mode: config.telemetry.mode,
        status: telemetryStatus,
        simple: simpleTelemetryStatus,
        configuration: {
          serviceName: config.telemetry.serviceName,
          serviceVersion: config.telemetry.serviceVersion,
          environment: config.telemetry.environment,
          endpoints: {
            traces: config.telemetry.tracesEndpoint || "not configured",
            metrics: config.telemetry.metricsEndpoint || "not configured",
            logs: config.telemetry.logsEndpoint || "not configured",
          },
          timeout: config.telemetry.exportTimeout,
          batchSize: config.telemetry.batchSize,
          queueSize: config.telemetry.maxQueueSize,
        },
      },
      timestamp: new Date().toISOString(),
    };

    const duration = calculateDuration(startTime);
    log("HTTP request processed", {
      event_name: "http.request.completed",
      method: "GET",
      path: "/health/telemetry",
      status_code: 200,
      duration_ms: duration,
      request_id: requestId,
    });

    return createHealthResponse(responseData, 200, requestId);
  } catch (error) {
    const duration = calculateDuration(startTime);
    log("HTTP request processed", {
      event_name: "http.request.completed",
      method: "GET",
      path: "/health/telemetry",
      status_code: 500,
      duration_ms: duration,
      request_id: requestId,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return createHealthResponse(
      {
        error: "Failed to get telemetry status",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      500,
      requestId
    );
  }
}

/**
 * Readiness check handler.
 *
 * Checks:
 * - Lifecycle state (must be READY to accept requests)
 * - Kong connectivity
 * - Redis/cache health (if high availability enabled)
 *
 * @see SIO-452: Added lifecycle and Redis checks
 */
export async function handleReadinessCheck(kongService: IKongService): Promise<Response> {
  const requestId = generateRequestId();
  const startTime = getHighResTime();

  log("Processing readiness check request", {
    event_name: "health.readiness.initiated",
    component: "health",
    operation: "handle_readiness_check",
    endpoint: "/health/ready",
    request_id: requestId,
  });

  try {
    // SIO-452: Check lifecycle state first - must be READY to accept requests
    const lifecycleState = lifecycleStateMachine.getState();
    if (!lifecycleStateMachine.canAcceptRequests()) {
      log("Readiness check failed - service not accepting requests", {
        event_name: "health.readiness.failed",
        component: "health",
        operation: "readiness_lifecycle_check",
        lifecycle_state: lifecycleState,
        request_id: requestId,
        duration_ms: calculateDuration(startTime),
      });

      return createHealthResponse(
        {
          ready: false,
          timestamp: new Date().toISOString(),
          reason: `Service is ${lifecycleState}`,
          checks: {
            lifecycle: {
              status: "not_ready",
              state: lifecycleState,
            },
          },
          requestId,
        },
        503,
        requestId
      );
    }

    // Readiness probe specifically checks Kong connectivity
    // Service is "ready" when it can perform authentication operations
    const kongHealthStartTime = getHighResTime();
    let kongHealth: Awaited<ReturnType<IKongService["healthCheck"]>>;

    try {
      kongHealth = await kongService.healthCheck();
    } catch (kongError) {
      log("Kong health check failed during readiness probe", {
        event_name: "kong.health_check.failed",
        component: "health",
        operation: "readiness_kong_check",
        error: kongError instanceof Error ? kongError.message : "Unknown error",
        request_id: requestId,
        duration_ms: calculateDuration(startTime),
      });
      kongHealth = {
        healthy: false,
        responseTime: 0,
        error: kongError instanceof Error ? kongError.message : "Connection failed",
      };
    }

    const kongHealthDuration = calculateDuration(kongHealthStartTime);

    // SIO-452: Check Redis/cache health if high availability is enabled
    let cacheHealthy = true;
    let cacheStatus = "healthy";
    let cacheError: string | undefined;

    if (config.caching.highAvailability) {
      try {
        const cacheService = await CacheFactory.createKongCache();
        cacheHealthy = await cacheService.isHealthy();
        cacheStatus = cacheHealthy ? "healthy" : "unhealthy";
      } catch (cacheErr) {
        cacheHealthy = false;
        cacheStatus = "unhealthy";
        cacheError = cacheErr instanceof Error ? cacheErr.message : "Cache check failed";
        log("Cache health check failed during readiness probe", {
          event_name: "cache.health_check.failed",
          component: "health",
          operation: "readiness_cache_check",
          error: cacheError,
          request_id: requestId,
          duration_ms: calculateDuration(startTime),
        });
      }
    }

    const totalDuration = calculateDuration(startTime);

    // SIO-452: Service is ready when lifecycle is READY AND Kong is healthy AND cache is healthy
    const isReady = kongHealth.healthy && cacheHealthy;
    const statusCode = isReady ? 200 : 503;

    const readinessData = {
      ready: isReady,
      timestamp: new Date().toISOString(),
      checks: {
        lifecycle: {
          status: "ready",
          state: lifecycleState,
        },
        kong: {
          status: kongHealth.healthy ? "healthy" : "unhealthy",
          responseTime: formatResponseTime(kongHealthDuration),
          details: {
            adminUrl: config.kong.adminUrl,
            mode: config.kong.mode,
            ...(kongHealth.error && { error: kongHealth.error }),
          },
        },
        ...(config.caching.highAvailability && {
          cache: {
            status: cacheStatus,
            type: "redis",
            ...(cacheError && { error: cacheError }),
          },
        }),
      },
      responseTime: formatResponseTime(totalDuration),
      requestId,
    };

    log("Readiness check completed", {
      event_name: "health.readiness.success",
      component: "health",
      operation: "readiness_check_complete",
      ready: isReady,
      kong_healthy: kongHealth.healthy,
      cache_healthy: cacheHealthy,
      lifecycle_state: lifecycleState,
      duration_ms: totalDuration,
      request_id: requestId,
    });

    log("HTTP request processed", {
      event_name: "http.request.completed",
      method: "GET",
      path: "/health/ready",
      status_code: statusCode,
      duration_ms: totalDuration,
      request_id: requestId,
    });

    return createHealthResponse(readinessData, statusCode, requestId);
  } catch (error) {
    const duration = calculateDuration(startTime);

    log("Readiness check failed", {
      event_name: "health.readiness.failed",
      component: "health",
      operation: "readiness_check_error",
      error: error instanceof Error ? error.message : "Unknown error",
      duration_ms: duration,
      request_id: requestId,
    });

    return createHealthResponse(
      {
        ready: false,
        error: "Readiness check failed",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
        requestId,
      },
      503,
      requestId
    );
  }
}

export function handleMetricsHealth(kongService: IKongService): Response {
  const requestId = generateRequestId();
  const startTime = getHighResTime();

  log("Processing metrics health request", {
    event_name: "health.metrics.initiated",
    component: "health",
    operation: "handle_metrics_health",
    endpoint: "/health/metrics",
    request_id: requestId,
  });

  try {
    const metricsStatus = getMetricsStatus();
    const exportStats = getMetricsExportStats();

    let circuitBreakerStats: Record<
      string,
      import("../types/circuit-breaker.types").OpossumCircuitBreakerStats
    >;
    try {
      circuitBreakerStats = kongService.getCircuitBreakerStats();
    } catch (error) {
      log("Failed to get circuit breaker stats during metrics health check", {
        event_name: "circuit_breaker.stats.failed",
        component: "health",
        operation: "circuit_breaker_stats",
        error: error instanceof Error ? error.message : "Unknown error",
        request_id: requestId,
      });
      circuitBreakerStats = {};
    }

    // Calculate circuit breaker summary
    const circuitBreakerSummary = {
      enabled: config.kong.circuitBreaker.enabled,
      totalBreakers: Object.keys(circuitBreakerStats).length,
      states: {
        closed: 0,
        open: 0,
        halfOpen: 0,
      },
    };

    for (const breakerName in circuitBreakerStats) {
      const breakerStat = circuitBreakerStats[breakerName];
      if (!breakerStat) continue;
      switch (breakerStat.state) {
        case "closed":
          circuitBreakerSummary.states.closed++;
          break;
        case "open":
          circuitBreakerSummary.states.open++;
          break;
        case "half-open":
          circuitBreakerSummary.states.halfOpen++;
          break;
      }
    }

    const responseData = {
      metrics: {
        status: metricsStatus,
        exports: exportStats.getStats(),
        configuration: {
          exportInterval: 10000,
          batchTimeout: config.telemetry.exportTimeout,
          endpoint: config.telemetry.metricsEndpoint || "not configured",
        },
      },
      circuitBreakers: circuitBreakerSummary,
      timestamp: new Date().toISOString(),
    };

    const duration = calculateDuration(startTime);
    log("HTTP request processed", {
      event_name: "http.request.completed",
      method: "GET",
      path: "/health/metrics",
      status_code: 200,
      duration_ms: duration,
      request_id: requestId,
    });

    return createHealthResponse(responseData, 200, requestId);
  } catch (error) {
    const duration = calculateDuration(startTime);
    log("HTTP request processed", {
      event_name: "http.request.completed",
      method: "GET",
      path: "/health/metrics",
      status_code: 500,
      duration_ms: duration,
      request_id: requestId,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return createHealthResponse(
      {
        error: "Failed to get metrics status",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      500,
      requestId
    );
  }
}
