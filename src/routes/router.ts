/* src/routes/router.ts */

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

export function createRoutes(kongService: IKongService) {
  const routes = {
    "GET /": async (req: Request, url: URL) =>
      await telemetryTracer.createHttpSpan(req.method, url.pathname, 200, () =>
        handleOpenAPISpec(req.headers.get("Accept") || undefined)
      ),

    "GET /health": async (req: Request, url: URL) =>
      await telemetryTracer.createHttpSpan(req.method, url.pathname, 200, () =>
        handleHealthCheck(kongService)
      ),

    "GET /health/telemetry": async (req: Request, url: URL) =>
      await telemetryTracer.createHttpSpan(req.method, url.pathname, 200, () =>
        handleTelemetryHealth()
      ),

    "GET /health/metrics": async (req: Request, url: URL) =>
      await telemetryTracer.createHttpSpan(req.method, url.pathname, 200, () =>
        handleMetricsHealth()
      ),

    "GET /metrics": async (req: Request, url: URL) =>
      await telemetryTracer.createHttpSpan(req.method, url.pathname, 200, () =>
        handleMetrics(kongService)
      ),

    "GET /tokens": (req: Request, _url: URL) => handleTokenRequest(req, kongService),

    "POST /debug/metrics/test": async (req: Request, url: URL) =>
      await telemetryTracer.createHttpSpan(req.method, url.pathname, 200, () =>
        handleDebugMetricsTest()
      ),

    "POST /debug/metrics/export": async (req: Request, url: URL) =>
      await telemetryTracer.createHttpSpan(req.method, url.pathname, 200, () =>
        handleDebugMetricsExport()
      ),

    "GET /debug/metrics/stats": async (req: Request, url: URL) =>
      await telemetryTracer.createHttpSpan(req.method, url.pathname, 200, () =>
        handleDebugMetricsStats()
      ),
  } as const;

  return routes;
}

export async function handleRoute(
  req: Request,
  url: URL,
  routes: ReturnType<typeof createRoutes>
): Promise<Response> {
  if (req.method === "OPTIONS") {
    return handleOptionsRequest();
  }

  const routeKey = `${req.method} ${url.pathname}` as keyof typeof routes;
  const handler = routes[routeKey];

  if (handler) {
    return await handler(req, url);
  }

  return handleNotFound(url);
}
