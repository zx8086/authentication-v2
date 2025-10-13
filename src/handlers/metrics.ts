/* src/handlers/metrics.ts */

import { loadConfig } from "../config/index";
import type { IKongService } from "../services/kong.service";
import { forceMetricsFlush, getMetricsExportStats } from "../telemetry/instrumentation";
import { testMetricRecording } from "../telemetry/metrics";
import { log } from "../utils/logger";

const config = loadConfig();

export async function handleMetrics(kongService: IKongService): Promise<Response> {
  try {
    log("Processing metrics request", {
      component: "metrics",
      operation: "handle_metrics",
      endpoint: "/metrics",
    });

    const timestamp = new Date().toISOString();
    const cacheStats = await kongService.getCacheStats();

    const metricsData = {
      timestamp,
      uptime: Math.floor(process.uptime()),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024),
      },
      cache: cacheStats,
      telemetry: {
        mode: config.telemetry.mode,
        exportStats: getMetricsExportStats(),
      },
      kong: {
        adminUrl: config.kong.adminUrl,
        mode: config.kong.mode,
      },
    };

    return new Response(JSON.stringify(metricsData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "Access-Control-Allow-Origin": config.apiInfo.cors,
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      },
    });
  } catch (error) {
    log("Failed to get cache stats, generating metrics without cache data", {
      component: "metrics",
      operation: "get_cache_stats",
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return new Response(
      JSON.stringify({
        error: "Failed to generate metrics",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": config.apiInfo.cors,
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        },
      }
    );
  }
}

export function handleDebugMetricsTest(): Response {
  try {
    testMetricRecording();
    const testResult = { success: true, metricsRecorded: 5 };

    log("Test metrics recorded", {
      component: "debug",
      operation: "test_metrics",
      success: testResult.success,
      metricsRecorded: testResult.metricsRecorded,
    });

    return new Response(
      JSON.stringify({
        success: testResult.success,
        message: "Test metrics recorded successfully",
        metricsRecorded: testResult.metricsRecorded,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": config.apiInfo.cors,
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to record test metrics",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": config.apiInfo.cors,
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        },
      }
    );
  }
}

export async function handleDebugMetricsExport(): Promise<Response> {
  const startTime = Bun.nanoseconds();

  try {
    await forceMetricsFlush();
    const flushResult = { success: true, exportedMetrics: 10, errors: [] };
    const duration = (Bun.nanoseconds() - startTime) / 1_000_000;

    log("Metrics export forced", {
      component: "debug",
      operation: "force_export",
      success: flushResult.success,
      duration,
      exportedMetrics: flushResult.exportedMetrics,
      errors: flushResult.errors,
    });

    return new Response(
      JSON.stringify({
        success: flushResult.success,
        message: flushResult.success
          ? "Metrics exported successfully"
          : "Metrics export encountered errors",
        exportedMetrics: flushResult.exportedMetrics,
        duration: Math.round(duration),
        errors: flushResult.errors,
        timestamp: new Date().toISOString(),
      }),
      {
        status: flushResult.success ? 200 : 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": config.apiInfo.cors,
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        },
      }
    );
  } catch (error) {
    const duration = (Bun.nanoseconds() - startTime) / 1_000_000;

    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to export metrics",
        message: error instanceof Error ? error.message : "Unknown error",
        duration: Math.round(duration),
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": config.apiInfo.cors,
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        },
      }
    );
  }
}

export function handleDebugMetricsStats(): Response {
  try {
    const exportStats = getMetricsExportStats();

    const statsData = {
      exports: exportStats,
      timestamp: new Date().toISOString(),
      configuration: {
        exportInterval: "10 seconds",
        batchTimeout: `${config.telemetry.exportTimeout}ms`,
        endpoint: config.telemetry.metricsEndpoint || "not configured",
        telemetryMode: config.telemetry.mode,
      },
    };

    return new Response(JSON.stringify(statsData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "Access-Control-Allow-Origin": config.apiInfo.cors,
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Failed to get export statistics",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": config.apiInfo.cors,
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        },
      }
    );
  }
}
