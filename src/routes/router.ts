/* src/routes/router.ts */

import { handleHealthCheck, handleMetricsHealth, handleTelemetryHealth } from "../handlers/health";
import {
  handleDebugMetricsExport,
  handleDebugMetricsTest,
  handleMetricsUnified,
} from "../handlers/metrics";
import { handleOpenAPISpec } from "../handlers/openapi";
import {
  handleProfilingCleanup,
  handleProfilingReport,
  handleProfilingReports,
  handleProfilingStart,
  handleProfilingStatus,
  handleProfilingStop,
} from "../handlers/profiling";
import { handleTokenRequest } from "../handlers/tokens";
import { handleOptionsRequest } from "../middleware/cors";
import { handleNotFound } from "../middleware/error-handler";
import type { IKongService } from "../services/kong.service";
import { telemetryTracer } from "../telemetry/tracer";

// Bun Routes API implementation
export function createRoutes(kongService: IKongService) {
  const routes = {
    "/": {
      GET: async (req: Request) =>
        await telemetryTracer.createHttpSpan(req.method, "/", 200, () =>
          handleOpenAPISpec(req.headers.get("Accept") || undefined)
        ),
    },

    "/health": {
      GET: async (req: Request) =>
        await telemetryTracer.createHttpSpan(req.method, "/health", 200, () =>
          handleHealthCheck(kongService)
        ),
    },

    "/health/telemetry": {
      GET: async (req: Request) =>
        await telemetryTracer.createHttpSpan(req.method, "/health/telemetry", 200, () =>
          handleTelemetryHealth()
        ),
    },

    "/health/metrics": {
      GET: async (req: Request) =>
        await telemetryTracer.createHttpSpan(req.method, "/health/metrics", 200, () =>
          handleMetricsHealth(kongService)
        ),
    },

    "/metrics": {
      GET: async (req: Request) => {
        const url = new URL(req.url);
        return await telemetryTracer.createHttpSpan(
          req.method,
          "/metrics",
          200,
          async () => await handleMetricsUnified(kongService, url)
        );
      },
    },

    "/tokens": {
      GET: (req: Request) => handleTokenRequest(req, kongService),
    },

    "/debug/metrics/test": {
      POST: async (req: Request) =>
        await telemetryTracer.createHttpSpan(req.method, "/debug/metrics/test", 200, () =>
          handleDebugMetricsTest()
        ),
    },

    "/debug/metrics/export": {
      POST: async (req: Request) =>
        await telemetryTracer.createHttpSpan(req.method, "/debug/metrics/export", 200, () =>
          handleDebugMetricsExport()
        ),
    },

    "/debug/profiling/start": {
      POST: async (req: Request) =>
        await telemetryTracer.createHttpSpan(req.method, "/debug/profiling/start", 200, () =>
          handleProfilingStart(req)
        ),
    },

    "/debug/profiling/stop": {
      POST: async (req: Request) =>
        await telemetryTracer.createHttpSpan(req.method, "/debug/profiling/stop", 200, () =>
          handleProfilingStop(req)
        ),
    },

    "/debug/profiling/status": {
      GET: async (req: Request) =>
        await telemetryTracer.createHttpSpan(req.method, "/debug/profiling/status", 200, () =>
          handleProfilingStatus(req)
        ),
    },

    "/debug/profiling/reports": {
      GET: async (req: Request) =>
        await telemetryTracer.createHttpSpan(req.method, "/debug/profiling/reports", 200, () =>
          handleProfilingReports(req)
        ),
    },

    "/debug/profiling/cleanup": {
      POST: async (req: Request) =>
        await telemetryTracer.createHttpSpan(req.method, "/debug/profiling/cleanup", 200, () =>
          handleProfilingCleanup(req)
        ),
    },

    "/debug/profiling/report": {
      GET: async (req: Request) =>
        await telemetryTracer.createHttpSpan(req.method, "/debug/profiling/report", 200, () =>
          handleProfilingReport(req)
        ),
    },
  };

  const fallbackFetch = async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") {
      return handleOptionsRequest();
    }

    const url = new URL(req.url);
    return handleNotFound(url);
  };

  return { routes, fallbackFetch };
}
