// src/handlers/health-status.ts

export interface HealthStatusDeps {
  kong: { healthy: boolean };
  cache: { status: "healthy" | "unhealthy" | "degraded"; staleCacheAvailable: boolean };
  telemetry: {
    traces: { healthy: boolean };
    metrics: { healthy: boolean };
    logs: { healthy: boolean };
  };
}

export interface HealthStatusResult {
  httpStatus: 200 | 503;
  healthStatus: "healthy" | "degraded" | "unhealthy";
}

export function determineHealthStatus(deps: HealthStatusDeps): HealthStatusResult {
  const cacheCritical = deps.cache.status === "unhealthy" && !deps.cache.staleCacheAvailable;

  if (cacheCritical) {
    return { httpStatus: 503, healthStatus: "unhealthy" };
  }

  const telemetryHealthy =
    deps.telemetry.traces.healthy && deps.telemetry.metrics.healthy && deps.telemetry.logs.healthy;

  const cacheFullyHealthy = deps.cache.status === "healthy";
  const allHealthy = deps.kong.healthy && cacheFullyHealthy && telemetryHealthy;

  return {
    httpStatus: 200,
    healthStatus: allHealthy ? "healthy" : "degraded",
  };
}
