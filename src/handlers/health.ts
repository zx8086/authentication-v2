/* src/handlers/health.ts */

import pkg from "../../package.json" with { type: "json" };
import { loadConfig } from "../config/index";
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
    const kongHealthStartTime = Bun.nanoseconds();
    const kongHealth = await kongService.healthCheck();
    const kongHealthDuration = (Bun.nanoseconds() - kongHealthStartTime) / 1_000_000;

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

    const allHealthy =
      kongHealth.healthy && tracesHealth.healthy && metricsHealth.healthy && logsHealth.healthy;

    const telemetryHealthy = tracesHealth.healthy && metricsHealth.healthy && logsHealth.healthy;

    const statusCode = allHealthy ? 200 : 503;
    const duration = (Bun.nanoseconds() - startTime) / 1_000_000;

    let healthStatus: string;
    if (allHealthy) {
      healthStatus = "healthy";
    } else if (!kongHealth.healthy && telemetryHealthy) {
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

export function handleMetricsHealth(): Response {
  try {
    const metricsStatus = getMetricsStatus();
    const exportStats = getMetricsExportStats();

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
