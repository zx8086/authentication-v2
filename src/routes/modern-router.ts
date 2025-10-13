/* src/routes/modern-router.ts */

import { handleHealthCheck, handleMetricsHealth, handleTelemetryHealth } from "../handlers/health";
import {
  handleDebugMetricsExport,
  handleDebugMetricsStats,
  handleDebugMetricsTest,
  handleMetrics,
} from "../handlers/metrics";
import { handleOpenAPISpec } from "../handlers/openapi";
import { handleTokenRequest } from "../handlers/tokens";
import { handleOptionsRequest } from "../middleware/cors";
import { handleNotFound } from "../middleware/error-handler";
import type { IKongService } from "../services/kong.service";
import { telemetryTracer } from "../telemetry/tracer";

const isBun = () => typeof Bun !== "undefined";

export function createModernRoutes(kongService: IKongService) {
  if (!isBun()) {
    throw new Error("Modern routes API requires Bun runtime");
  }

  return {
    "/": {
      GET: async (req: Request) => {
        const url = new URL(req.url);
        return await telemetryTracer.createHttpSpan(req.method, url.pathname, 200, () =>
          handleOpenAPISpec(req.headers.get("Accept") || undefined)
        );
      },
    },

    "/health": {
      GET: async (req: Request) => {
        const url = new URL(req.url);
        return await telemetryTracer.createHttpSpan(req.method, url.pathname, 200, () =>
          handleHealthCheck(kongService)
        );
      },
    },

    "/health/telemetry": {
      GET: async (req: Request) => {
        const url = new URL(req.url);
        return await telemetryTracer.createHttpSpan(req.method, url.pathname, 200, () =>
          handleTelemetryHealth()
        );
      },
    },

    "/health/metrics": {
      GET: async (req: Request) => {
        const url = new URL(req.url);
        return await telemetryTracer.createHttpSpan(req.method, url.pathname, 200, () =>
          handleMetricsHealth()
        );
      },
    },

    "/metrics": {
      GET: async (req: Request) => {
        const url = new URL(req.url);
        return await telemetryTracer.createHttpSpan(
          req.method,
          url.pathname,
          200,
          async () => await handleMetrics(kongService)
        );
      },
    },

    "/tokens": {
      GET: (req: Request) => {
        const _url = new URL(req.url);
        return handleTokenRequest(req, kongService);
      },
    },

    "/debug/metrics/test": {
      POST: async (req: Request) => {
        const url = new URL(req.url);
        return await telemetryTracer.createHttpSpan(req.method, url.pathname, 200, () =>
          handleDebugMetricsTest()
        );
      },
    },

    "/debug/metrics/export": {
      POST: async (req: Request) => {
        const url = new URL(req.url);
        return await telemetryTracer.createHttpSpan(req.method, url.pathname, 200, () =>
          handleDebugMetricsExport()
        );
      },
    },

    "/debug/metrics/stats": {
      GET: async (req: Request) => {
        const url = new URL(req.url);
        return await telemetryTracer.createHttpSpan(req.method, url.pathname, 200, () =>
          handleDebugMetricsStats()
        );
      },
    },

    "*": {
      OPTIONS: () => handleOptionsRequest(),
      GET: (req: Request) => {
        const url = new URL(req.url);
        return handleNotFound(url);
      },
      POST: (req: Request) => {
        const url = new URL(req.url);
        return handleNotFound(url);
      },
      PUT: (req: Request) => {
        const url = new URL(req.url);
        return handleNotFound(url);
      },
      DELETE: (req: Request) => {
        const url = new URL(req.url);
        return handleNotFound(url);
      },
    },
  };
}
