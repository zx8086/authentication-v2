/* src/handlers/health.ts */

import pkg from "../../package.json" with { type: "json" };
import { loadConfig } from "../config/index";
import { CacheFactory } from "../services/cache/cache-factory";
import { CacheHealthService } from "../services/cache-health.service";
import type { IKongService } from "../services/kong.service";
import {
  getMetricsExportStats,
  getSimpleTelemetryStatus,
  getTelemetryStatus,
} from "../telemetry/instrumentation";
import { getMetricsStatus } from "../telemetry/metrics";
import { log } from "../utils/logger";
import { createHealthResponse } from "../utils/response";

const config = loadConfig();

async function checkOtlpEndpointHealth(url: string): Promise<{
  healthy: boolean;
  responseTime: number;
  error?: string;
}> {
  if (!url) {
    return { healthy: false, responseTime: 0, error: "URL not configured" };
  }

  const startTime = Bun.nanoseconds();
  try {
    const response = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(5000),
    });
    const responseTime = (Bun.nanoseconds() - startTime) / 1_000_000;

    return {
      healthy: response.status < 500,
      responseTime: Math.round(responseTime),
      error: response.status >= 500 ? `HTTP ${response.status}` : undefined,
    };
  } catch (error) {
    const responseTime = (Bun.nanoseconds() - startTime) / 1_000_000;
    return {
      healthy: false,
      responseTime: Math.round(responseTime),
      error: error instanceof Error ? error.message : "Connection failed",
    };
  }
}

export async function handleHealthCheck(kongService: IKongService): Promise<Response> {
  log("Processing health check request", {
    component: "health",
    operation: "handle_health_check",
    endpoint: "/health",
  });

  const requestId = crypto.randomUUID();
  const startTime = Bun.nanoseconds();

  try {
    // Perform Kong health check with error handling
    const kongHealthStartTime = Bun.nanoseconds();
    let kongHealth: Awaited<ReturnType<IKongService["healthCheck"]>>;
    try {
      kongHealth = await kongService.healthCheck();
    } catch (kongError) {
      log("Kong health check failed with exception during health endpoint check", {
        component: "health",
        operation: "kong_health_check",
        error: kongError instanceof Error ? kongError.message : "Unknown error",
      });
      kongHealth = {
        healthy: false,
        responseTime: 0,
        error: kongError instanceof Error ? kongError.message : "Connection failed",
      };
    }
    const kongHealthDuration = (Bun.nanoseconds() - kongHealthStartTime) / 1_000_000;

    // Perform cache health check
    const cacheHealthService = CacheHealthService.getInstance();
    const cacheService = await CacheFactory.createKongCache();
    let cacheHealth: {
      status: "healthy" | "unhealthy" | "degraded";
      type: "redis" | "memory";
      responseTime: number;
      staleCache?: {
        available: boolean;
        responseTime?: number;
        error?: string;
      };
    };

    try {
      const basicCacheHealth = await cacheHealthService.checkCacheHealth(cacheService);
      cacheHealth = { ...basicCacheHealth };

      // Check stale cache availability in HA mode
      if (config.caching.highAvailability && cacheService.getStale) {
        const staleCacheStartTime = Bun.nanoseconds();
        try {
          // Test stale cache access with a non-existent key to verify connectivity
          await cacheService.getStale("health_check_stale_test");
          const staleCacheResponseTime = (Bun.nanoseconds() - staleCacheStartTime) / 1_000_000;
          cacheHealth.staleCache = {
            available: true,
            responseTime: Math.round(staleCacheResponseTime),
          };
        } catch (staleCacheError) {
          const staleCacheResponseTime = (Bun.nanoseconds() - staleCacheStartTime) / 1_000_000;
          cacheHealth.staleCache = {
            available: false,
            responseTime: Math.round(staleCacheResponseTime),
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
        component: "health",
        operation: "cache_health_check",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      cacheHealth = {
        status: "unhealthy" as const,
        type: config.caching.highAvailability ? ("redis" as const) : ("memory" as const),
        responseTime: 0,
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
        : { healthy: true, responseTime: 0 },
      telemetryConfig.metricsEndpoint
        ? checkOtlpEndpointHealth(telemetryConfig.metricsEndpoint)
        : { healthy: true, responseTime: 0 },
      telemetryConfig.logsEndpoint
        ? checkOtlpEndpointHealth(telemetryConfig.logsEndpoint)
        : { healthy: true, responseTime: 0 },
    ]);

    const [tracesHealth, metricsHealth, logsHealth] = otlpChecks;

    const cacheHealthy = cacheHealth.status === "healthy";
    const allHealthy =
      kongHealth.healthy &&
      tracesHealth.healthy &&
      metricsHealth.healthy &&
      logsHealth.healthy &&
      cacheHealthy;

    const telemetryHealthy = tracesHealth.healthy && metricsHealth.healthy && logsHealth.healthy;

    const statusCode = allHealthy ? 200 : 503;
    const duration = (Bun.nanoseconds() - startTime) / 1_000_000;

    let healthStatus: string;
    if (allHealthy) {
      healthStatus = "healthy";
    } else if (
      cacheHealth.status === "degraded" ||
      (!kongHealth.healthy && telemetryHealthy && cacheHealthy)
    ) {
      healthStatus = "degraded";
    } else {
      healthStatus = "unhealthy";
    }

    const healthData = {
      status: healthStatus,
      timestamp: new Date().toISOString(),
      version: pkg.version || "1.0.0",
      environment: config.server.nodeEnv,
      uptime: Math.floor(process.uptime()),
      highAvailability: config.caching.highAvailability,
      dependencies: {
        kong: {
          status: kongHealth.healthy ? "healthy" : "unhealthy",
          responseTime: Math.round(kongHealthDuration),
          details: {
            adminUrl: config.kong.adminUrl,
            mode: config.kong.mode,
            ...(kongHealth.error && { error: kongHealth.error }),
          },
        },
        cache: {
          status: cacheHealth.status,
          type: cacheHealth.type,
          responseTime: cacheHealth.responseTime,
          ...(cacheHealth.staleCache && {
            staleCache: cacheHealth.staleCache,
          }),
        },
        telemetry: {
          traces: {
            status: tracesHealth.healthy ? "healthy" : "unhealthy",
            endpoint: telemetryConfig.tracesEndpoint || "not configured",
            responseTime: tracesHealth.responseTime,
            ...("error" in tracesHealth && tracesHealth.error && { error: tracesHealth.error }),
          },
          metrics: {
            status: metricsHealth.healthy ? "healthy" : "unhealthy",
            endpoint: telemetryConfig.metricsEndpoint || "not configured",
            responseTime: metricsHealth.responseTime,
            ...("error" in metricsHealth && metricsHealth.error && { error: metricsHealth.error }),
          },
          logs: {
            status: logsHealth.healthy ? "healthy" : "unhealthy",
            endpoint: telemetryConfig.logsEndpoint || "not configured",
            responseTime: logsHealth.responseTime,
            ...("error" in logsHealth && logsHealth.error && { error: logsHealth.error }),
          },
        },
      },
      requestId,
    };

    log("Health check completed", {
      component: "health",
      duration,
      status: healthStatus,
      kongHealthy: kongHealth.healthy,
      cacheHealthy: cacheHealthy,
      cacheType: cacheHealth.type,
      telemetryHealthy: telemetryHealthy,
      requestId,
    });

    log("HTTP request processed", {
      method: "GET",
      url: "/health",
      statusCode,
      duration,
      requestId,
    });

    return createHealthResponse(healthData, statusCode, requestId);
  } catch (error) {
    const duration = (Bun.nanoseconds() - startTime) / 1_000_000;

    log("Health check failed", {
      component: "health",
      duration,
      error: error instanceof Error ? error.message : "Unknown error",
      requestId,
    });

    log("HTTP request processed", {
      method: "GET",
      url: "/health",
      statusCode: 500,
      duration,
      requestId,
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

    return createHealthResponse(responseData, 200, crypto.randomUUID());
  } catch (error) {
    return createHealthResponse(
      {
        error: "Failed to get telemetry status",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      500,
      crypto.randomUUID()
    );
  }
}

export function handleMetricsHealth(kongService: IKongService): Response {
  try {
    const metricsStatus = getMetricsStatus();
    const exportStats = getMetricsExportStats();

    let circuitBreakerStats: Record<
      string,
      import("../services/circuit-breaker.service").CircuitBreakerStats
    >;
    try {
      circuitBreakerStats = kongService.getCircuitBreakerStats();
    } catch (error) {
      log("Failed to get circuit breaker stats during metrics health check", {
        component: "health",
        operation: "circuit_breaker_stats",
        error: error instanceof Error ? error.message : "Unknown error",
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
        exports: exportStats,
        configuration: {
          exportInterval: 10000,
          batchTimeout: config.telemetry.exportTimeout,
          endpoint: config.telemetry.metricsEndpoint || "not configured",
        },
      },
      circuitBreakers: circuitBreakerSummary,
      timestamp: new Date().toISOString(),
    };

    return createHealthResponse(responseData, 200, crypto.randomUUID());
  } catch (error) {
    return createHealthResponse(
      {
        error: "Failed to get metrics status",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      500,
      crypto.randomUUID()
    );
  }
}
