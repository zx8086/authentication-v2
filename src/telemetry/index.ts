/* src/telemetry/index.ts */

// Telemetry module exports for OpenTelemetry instrumentation and metrics

export type { TelemetryConfig } from "./config";
export { telemetryConfig } from "./config";
export {
  forceMetricsFlush,
  getMetricsExportStats,
  getTelemetryStatus,
  initializeTelemetry,
  shutdownTelemetry,
  triggerImmediateMetricsExport,
} from "./instrumentation";
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
