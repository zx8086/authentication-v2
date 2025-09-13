/* src/telemetry/index.ts */

// Central telemetry exports for the authentication service
export { BunTelemetrySDK } from './bun-instrumentation';
export { telemetryLogger, LogLevel, type StructuredLogData, type LogContext } from './logger';
export { telemetryTracer, createSpan, type SpanContext } from './tracer';
export { telemetryMetrics, type MetricLabels } from './metrics';
export { telemetryHealthMonitor, type TelemetryHealthStatus } from './health';
export {
  initializeTelemetry,
  initializeBunFullTelemetry,
  initializeSimpleTelemetry,
  getBunTelemetryStatus,
  getSimpleTelemetryStatus,
  getTelemetryStatus,
  shutdownTelemetry,
  shutdownSimpleTelemetry
} from './bun-instrumentation';
export type { TelemetryConfig } from './config';
export { telemetryConfig } from './config';
export { SimpleSmartSampler, type SimpleSmartSamplingConfig } from './SimpleSmartSampler';