/* src/middleware/lifecycle-middleware.ts */

/**
 * Lifecycle Middleware for request tracking and shutdown handling.
 *
 * This middleware:
 * - Rejects requests when the service is not in READY state
 * - Tracks in-flight requests for graceful shutdown draining
 * - Returns RFC 7807 Problem Details responses during shutdown
 *
 * @see SIO-452: Fix ERR_REDIS_CONNECTION_CLOSED During Container Lifecycle
 */

import { inflightTracker, LifecycleState, lifecycleStateMachine } from "../lifecycle";
import { SpanEvents, telemetryEmitter } from "../telemetry/tracer";

/**
 * Generate a unique request ID.
 */
function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `req_${timestamp}_${random}`;
}

/**
 * Paths that should bypass lifecycle checks.
 * Health endpoints must remain accessible during shutdown.
 */
const BYPASS_PATHS = new Set([
  "/health",
  "/health/ready",
  "/health/live",
  "/health/telemetry",
  "/health/metrics",
  "/metrics",
]);

/**
 * Create RFC 7807 Problem Details response.
 */
function createProblemResponse(
  status: number,
  title: string,
  detail: string,
  path: string,
  retryAfter?: number
): Response {
  const headers: Record<string, string> = {
    "Content-Type": "application/problem+json",
  };

  if (retryAfter) {
    headers["Retry-After"] = retryAfter.toString();
  }

  return new Response(
    JSON.stringify({
      type: "about:blank",
      title,
      status,
      detail,
      instance: path,
    }),
    { status, headers }
  );
}

/**
 * Lifecycle middleware function for Elysia.
 *
 * Usage:
 * ```typescript
 * app.derive(lifecycleMiddleware);
 * ```
 */
export function lifecycleMiddleware({
  request,
  set,
}: {
  request: Request;
  set: { status?: number };
}) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // Bypass lifecycle checks for health endpoints
  if (BYPASS_PATHS.has(path)) {
    return {};
  }

  const state = lifecycleStateMachine.getState();

  // Check if service can accept requests
  if (!lifecycleStateMachine.canAcceptRequests()) {
    const retryAfter = state === LifecycleState.DRAINING ? 5 : 10;

    telemetryEmitter.warn(
      state === LifecycleState.DRAINING
        ? SpanEvents.REQUEST_REJECTED_DRAINING
        : SpanEvents.REQUEST_REJECTED_NOT_READY,
      `Request rejected - service is ${state}`,
      {
        component: "lifecycle_middleware",
        operation: "request_rejected",
        path,
        method,
        state,
      }
    );

    // Return 503 with retry hint
    return createProblemResponse(
      503,
      "Service Unavailable",
      `Service is ${state}. Please retry after ${retryAfter} seconds.`,
      path,
      retryAfter
    );
  }

  // Generate request ID and track the request
  const requestId = generateRequestId();
  inflightTracker.start(requestId, {
    endpoint: path,
    startTime: Date.now(),
    method,
    requestId,
  });

  // Store request ID in context for completion tracking
  return {
    lifecycleRequestId: requestId,
    onAfterResponse: () => {
      inflightTracker.complete(requestId);
    },
  };
}

/**
 * Lifecycle response hook for Elysia.
 * Completes request tracking after response is sent.
 *
 * Usage:
 * ```typescript
 * app.onAfterResponse(lifecycleOnAfterResponse);
 * ```
 */
export function lifecycleOnAfterResponse({ store }: { store: Record<string, unknown> }) {
  const requestId = store.lifecycleRequestId as string | undefined;
  if (requestId) {
    inflightTracker.complete(requestId);
  }
}

/**
 * Elysia plugin for lifecycle management.
 *
 * Usage:
 * ```typescript
 * import { Elysia } from "elysia";
 * import { lifecyclePlugin } from "./middleware/lifecycle-middleware";
 *
 * const app = new Elysia()
 *   .use(lifecyclePlugin)
 *   .get("/", () => "Hello");
 * ```
 */
export const lifecyclePlugin = (app: {
  derive: (fn: typeof lifecycleMiddleware) => typeof app;
  onAfterResponse: (fn: typeof lifecycleOnAfterResponse) => typeof app;
}) => {
  return app.derive(lifecycleMiddleware).onAfterResponse(lifecycleOnAfterResponse);
};
