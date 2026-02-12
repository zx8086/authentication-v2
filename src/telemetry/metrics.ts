/* src/telemetry/metrics.ts */

/**
 * OpenTelemetry Metrics Module - Re-export from modular structure
 *
 * This file maintains backward compatibility by re-exporting all metrics
 * functions and types from the new modular structure in src/telemetry/metrics/
 *
 * The metrics have been split into focused modules for better maintainability:
 * - types.ts: Type definitions
 * - instruments.ts: Metric instrument declarations
 * - http-metrics.ts: HTTP metrics
 * - auth-metrics.ts: Authentication metrics
 * - kong-metrics.ts: Kong metrics
 * - redis-metrics.ts: Redis metrics
 * - circuit-breaker-metrics.ts: Circuit breaker metrics
 * - cache-metrics.ts: Cache metrics
 * - api-version-metrics.ts: API versioning metrics
 * - security-metrics.ts: Security metrics
 * - consumer-metrics.ts: Consumer metrics
 * - telemetry-metrics.ts: Telemetry export metrics
 * - process-metrics.ts: Process and GC metrics
 * - error-metrics.ts: Error metrics
 */

export * from "./metrics/index";
