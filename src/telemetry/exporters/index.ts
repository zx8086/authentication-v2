/* src/telemetry/exporters/index.ts */

// Export all Bun-optimized OTLP exporters for easy importing
export { BunTraceExporter, type BunTraceExporterConfig } from './BunTraceExporter';
export { BunMetricExporter, type BunMetricExporterConfig } from './BunMetricExporter';
export { BunLogExporter, type BunLogExporterConfig } from './BunLogExporter';

// Utility function to create exporters based on runtime detection
export function createBunExporters(config: {
  tracesEndpoint?: string;
  metricsEndpoint?: string;
  logsEndpoint?: string;
  timeoutMillis?: number;
  concurrencyLimit?: number;
  headers?: Record<string, string>;
  retryConfig?: {
    maxRetries: number;
    initialDelayMs: number;
    maxDelayMs: number;
    backoffMultiplier: number;
  };
  circuitBreakerConfig?: {
    threshold: number;
    timeout: number;
  };
}) {
  const commonConfig = {
    timeoutMillis: config.timeoutMillis || 10000,
    concurrencyLimit: config.concurrencyLimit || 10,
    headers: config.headers || {},
    retryConfig: config.retryConfig || {
      maxRetries: 3,
      initialDelayMs: 1000,
      maxDelayMs: 10000,
      backoffMultiplier: 2,
    },
    circuitBreakerConfig: config.circuitBreakerConfig || {
      threshold: 5,
      timeout: 60000,
    },
  };

  return {
    traceExporter: config.tracesEndpoint 
      ? new BunTraceExporter({
          url: config.tracesEndpoint,
          ...commonConfig,
        })
      : undefined,
    
    metricExporter: config.metricsEndpoint 
      ? new BunMetricExporter({
          url: config.metricsEndpoint,
          ...commonConfig,
        })
      : undefined,
    
    logExporter: config.logsEndpoint 
      ? new BunLogExporter({
          url: config.logsEndpoint,
          ...commonConfig,
        })
      : undefined,
  };
}

// Runtime detection utility
export function shouldUseBunExporters(): boolean {
  return typeof Bun !== 'undefined';
}

// Helper to get appropriate exporter based on runtime
export function getOptimalExporter<T>(bunExporter: T, standardExporter: T): T {
  return shouldUseBunExporters() ? bunExporter : standardExporter;
}