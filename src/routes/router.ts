/* src/routes/router.ts */

import {
  handleProfilingCleanup,
  handleProfilingReport,
  handleProfilingReports,
  handleProfilingStart,
  handleProfilingStatus,
  handleProfilingStop,
} from "../handlers/profiling";
import * as v1Handlers from "../handlers/v1";
import { handleV2HealthCheck } from "../handlers/v2/health";
import { handleV2TokenRequest } from "../handlers/v2/tokens";
import {
  getVersionContextForTelemetry,
  getVersioningMiddleware,
} from "../middleware/api-versioning";
import { handleOptionsRequest } from "../middleware/cors";
import { handleNotFound } from "../middleware/error-handler";
import type { IKongService } from "../services/kong.service";
import { recordApiVersionRoutingDuration } from "../telemetry/metrics";
import { telemetryTracer } from "../telemetry/tracer";

// Version-aware route handler
async function createVersionedHandler<T extends unknown[]>(
  req: Request,
  method: string,
  _path: string,
  handlerMap: Record<string, (...args: T) => Promise<Response> | Response>,
  ...args: T
): Promise<Response> {
  const routingStartTime = Bun.nanoseconds();
  const versioningMiddleware = getVersioningMiddleware();
  const versionRequest = versioningMiddleware.createVersionRequest(req);
  const url = new URL(req.url);
  const endpoint = url.pathname;

  // Check for unsupported version
  if (!versionRequest.versionInfo.isSupported) {
    return versioningMiddleware.createUnsupportedVersionResponse(
      versionRequest.versionInfo.version,
      versionRequest.versionInfo.error || "header",
      endpoint,
      method
    );
  }

  const version = versionRequest.apiVersion;
  const handler = handlerMap[version];
  const hasVersionHandler = !!handler;

  if (!handler) {
    // Fallback to v1 (should not happen with current setup)
    const fallbackHandler = handlerMap.v1;
    if (!fallbackHandler) {
      throw new Error(`No handler found for version ${version} or fallback v1`);
    }

    // Record routing duration for fallback
    const routingDurationMs = (Bun.nanoseconds() - routingStartTime) / 1_000_000;
    recordApiVersionRoutingDuration(routingDurationMs, version, endpoint, false);

    return versioningMiddleware.addVersionHeaders(await fallbackHandler(...args), "v1");
  }

  // Record routing duration for successful version routing
  const routingDurationMs = (Bun.nanoseconds() - routingStartTime) / 1_000_000;
  recordApiVersionRoutingDuration(routingDurationMs, version, endpoint, hasVersionHandler);

  const response = await handler(...args);
  return versioningMiddleware.addVersionHeaders(response, version);
}

// Bun Routes API implementation
export function createRoutes(kongService: IKongService) {
  const routes = {
    "/": {
      GET: async (req: Request) => {
        const versionContext = getVersionContextForTelemetry(req);
        return await telemetryTracer.createHttpSpan(
          req.method,
          "/",
          200,
          async () => {
            return await createVersionedHandler(
              req,
              "GET",
              "/",
              {
                v1: (acceptHeader?: string) => v1Handlers.handleOpenAPISpec(acceptHeader),
              },
              req.headers.get("Accept") || undefined
            );
          },
          versionContext
        );
      },
    },

    "/health": {
      GET: async (req: Request) => {
        const versionContext = getVersionContextForTelemetry(req);
        return await telemetryTracer.createHttpSpan(
          req.method,
          "/health",
          200,
          async () => {
            return await createVersionedHandler(
              req,
              "GET",
              "/health",
              {
                v1: (_req: Request, service: IKongService) => v1Handlers.handleHealthCheck(service),
                v2: (req: Request, service: IKongService) => handleV2HealthCheck(req, service),
              },
              req,
              kongService
            );
          },
          versionContext
        );
      },
    },

    "/health/telemetry": {
      GET: async (req: Request) => {
        const versionContext = getVersionContextForTelemetry(req);
        return await telemetryTracer.createHttpSpan(
          req.method,
          "/health/telemetry",
          200,
          async () => {
            return await createVersionedHandler(req, "GET", "/health/telemetry", {
              v1: () => v1Handlers.handleTelemetryHealth(),
            });
          },
          versionContext
        );
      },
    },

    "/health/metrics": {
      GET: async (req: Request) => {
        const versionContext = getVersionContextForTelemetry(req);
        return await telemetryTracer.createHttpSpan(
          req.method,
          "/health/metrics",
          200,
          async () => {
            return await createVersionedHandler(
              req,
              "GET",
              "/health/metrics",
              {
                v1: (service: IKongService) => v1Handlers.handleMetricsHealth(service),
              },
              kongService
            );
          },
          versionContext
        );
      },
    },

    "/metrics": {
      GET: async (req: Request) => {
        const url = new URL(req.url);
        const versionContext = getVersionContextForTelemetry(req);
        return await telemetryTracer.createHttpSpan(
          req.method,
          "/metrics",
          200,
          async () => {
            return await createVersionedHandler(
              req,
              "GET",
              "/metrics",
              {
                v1: (service: IKongService, url: URL) =>
                  v1Handlers.handleMetricsUnified(service, url),
              },
              kongService,
              url
            );
          },
          versionContext
        );
      },
    },

    "/tokens": {
      GET: async (req: Request) => {
        const versionContext = getVersionContextForTelemetry(req);
        return await telemetryTracer.createHttpSpan(
          req.method,
          "/tokens",
          200,
          async () => {
            return await createVersionedHandler(
              req,
              "GET",
              "/tokens",
              {
                v1: (req: Request, service: IKongService) =>
                  v1Handlers.handleTokenRequest(req, service),
                v2: (req: Request, service: IKongService) => handleV2TokenRequest(req, service),
              },
              req,
              kongService
            );
          },
          versionContext
        );
      },
    },

    "/debug/metrics/test": {
      POST: async (req: Request) => {
        const versionContext = getVersionContextForTelemetry(req);
        return await telemetryTracer.createHttpSpan(
          req.method,
          "/debug/metrics/test",
          200,
          async () => {
            return await createVersionedHandler(req, "POST", "/debug/metrics/test", {
              v1: () => v1Handlers.handleDebugMetricsTest(),
            });
          },
          versionContext
        );
      },
    },

    "/debug/metrics/export": {
      POST: async (req: Request) => {
        const versionContext = getVersionContextForTelemetry(req);
        return await telemetryTracer.createHttpSpan(
          req.method,
          "/debug/metrics/export",
          200,
          async () => {
            return await createVersionedHandler(req, "POST", "/debug/metrics/export", {
              v1: () => v1Handlers.handleDebugMetricsExport(),
            });
          },
          versionContext
        );
      },
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
      const optionsResponse = handleOptionsRequest();
      // Add version headers to OPTIONS responses
      const versioningMiddleware = getVersioningMiddleware();
      return versioningMiddleware.addVersionHeaders(optionsResponse, "v1");
    }

    const url = new URL(req.url);
    return handleNotFound(url);
  };

  return { routes, fallbackFetch };
}
