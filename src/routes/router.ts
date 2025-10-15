/* src/routes/router.ts */

import { handleHealthCheck, handleMetricsHealth, handleTelemetryHealth } from "../handlers/health";
import {
  handleDebugMetricsExport,
  handleDebugMetricsTest,
  handleMetricsUnified,
} from "../handlers/metrics";
import { handleOpenAPISpec } from "../handlers/openapi";
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
