/* src/telemetry/index.ts */

export type { TelemetryConfig } from "./config";
export { telemetryConfig } from "./config";
// MetricLabels type export removed - not defined in metrics.ts
export {
  forceMetricsFlush,
  getMetricsExportStats,
  getTelemetryStatus,
  initializeTelemetry,
  shutdownTelemetry,
  triggerImmediateMetricsExport,
} from "./instrumentation";
// Central telemetry exports for the authentication service
export { createSpan, type SpanContext, telemetryTracer } from "./tracer";
export {
  debug,
  error,
  info,
  logAuthenticationEvent,
  logHttpRequest,
  logKongOperation,
  warn,
  winstonTelemetryLogger,
} from "./winston-logger";
// SimpleSmartSampler removed - using 100% sampling, letting collector handle sampling
