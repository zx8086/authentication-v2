/* src/telemetry/bun-instrumentation.ts */

// Simple telemetry instrumentation following the OpenTelemetry guide EXACTLY
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { BatchSpanProcessor, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { BatchLogRecordProcessor, SimpleLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { ConsoleTraceExporter } from './exporters/ConsoleTraceExporter';
import { ConsoleMetricExporter } from './exporters/ConsoleMetricExporter';
import { ConsoleLogExporter } from './exporters/ConsoleLogExporter';
import { LoggerProvider } from '@opentelemetry/sdk-logs';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
} from '@opentelemetry/semantic-conventions';
import { telemetryConfig, type TelemetryConfig } from './config';
import { initializeMetrics } from './simple-metrics';

let sdk: NodeSDK | undefined;
let loggerProvider: LoggerProvider | undefined;

export async function initializeTelemetry(): Promise<void> {
  if (!telemetryConfig.ENABLE_OPENTELEMETRY) {
    return;
  }

  // Create resource
  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: telemetryConfig.SERVICE_NAME,
    [ATTR_SERVICE_VERSION]: telemetryConfig.SERVICE_VERSION,
    [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: telemetryConfig.DEPLOYMENT_ENVIRONMENT,
  });

  // ============= LOGGING SETUP - Following the guide exactly =============
  const logProcessors = [];
  
  if (telemetryConfig.TELEMETRY_MODE === 'console' || telemetryConfig.TELEMETRY_MODE === 'both') {
    const consoleLogExporter = new ConsoleLogExporter();
    logProcessors.push(new SimpleLogRecordProcessor(consoleLogExporter));
  }

  if (telemetryConfig.TELEMETRY_MODE === 'otlp' || telemetryConfig.TELEMETRY_MODE === 'both') {
    // Create custom Bun-optimized OTLP log exporter to work around SDK issues
    const customOTLPExporter = {
      async export(logs, resultCallback) {
        console.debug(`[CUSTOM-OTLP] Exporting ${logs.length} logs to ${telemetryConfig.LOGS_ENDPOINT}`);
        
        try {
          // Convert logs to OTLP format
          const otlpPayload = {
            resourceLogs: [{
              resource: {
                attributes: Object.entries(logs[0]?.resource?.attributes || {}).map(([key, value]) => ({
                  key,
                  value: { stringValue: String(value) }
                }))
              },
              scopeLogs: [{
                scope: { name: 'pvh-authentication-service', version: '1.0.0' },
                logRecords: logs.map(log => ({
                  timeUnixNano: String(log.hrTime[0] * 1_000_000_000 + log.hrTime[1]),
                  severityNumber: log.severityNumber,
                  severityText: log.severityText,
                  body: { stringValue: String(log.body) },
                  attributes: Object.entries(log.attributes || {}).map(([key, value]) => ({
                    key,
                    value: { stringValue: String(value) }
                  }))
                }))
              }]
            }]
          };
          
          const response = await fetch(telemetryConfig.LOGS_ENDPOINT, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(otlpPayload),
          });
          
          if (response.ok) {
            console.debug(`[CUSTOM-OTLP] ✅ Successfully exported ${logs.length} logs`);
            resultCallback({ code: 0 });
          } else {
            const errorText = await response.text();
            console.error(`[CUSTOM-OTLP] ❌ HTTP ${response.status}: ${errorText}`);
            resultCallback({ code: 1, error: new Error(`HTTP ${response.status}: ${errorText}`) });
          }
        } catch (error) {
          console.error(`[CUSTOM-OTLP] ❌ Export error:`, error);
          resultCallback({ code: 1, error });
        }
      },
      async shutdown() {},
      async forceFlush() {}
    };
    
    // Use SimpleLogRecordProcessor with custom exporter
    logProcessors.push(new SimpleLogRecordProcessor(customOTLPExporter));
  }

  // Create LoggerProvider with processors - exactly like working test
  if (logProcessors.length > 0) {
    loggerProvider = new LoggerProvider({
      resource,
      logRecordProcessors: logProcessors
    });
  }

  // ============= TRACES AND METRICS SETUP =============
  const processors = [];
  let metricReader;

  // Create exporters based on TELEMETRY_MODE
  if (telemetryConfig.TELEMETRY_MODE === 'console' || telemetryConfig.TELEMETRY_MODE === 'both') {
    // Console exporters
    const consoleTraceExporter = new ConsoleTraceExporter();
    const consoleMetricExporter = new ConsoleMetricExporter();
    
    processors.push(new BatchSpanProcessor(consoleTraceExporter, {
      maxExportBatchSize: 10,
      scheduledDelayMillis: 5000,
    }));
    
    if (!metricReader) {
      metricReader = new PeriodicExportingMetricReader({
        exporter: consoleMetricExporter,
        exportIntervalMillis: 5000,
      });
    }
  }

  if (telemetryConfig.TELEMETRY_MODE === 'otlp' || telemetryConfig.TELEMETRY_MODE === 'both') {
    // Use standard OTLP exporters - no custom complexity
    const otlpTraceExporter = new OTLPTraceExporter({
      url: telemetryConfig.TRACES_ENDPOINT,
      timeoutMillis: telemetryConfig.EXPORT_TIMEOUT_MS,
    });
    
    const otlpMetricExporter = new OTLPMetricExporter({
      url: telemetryConfig.METRICS_ENDPOINT,
      timeoutMillis: telemetryConfig.EXPORT_TIMEOUT_MS,
    });
    
    processors.push(new BatchSpanProcessor(otlpTraceExporter, {
      maxExportBatchSize: 10,
      scheduledDelayMillis: 5000,
    }));
    
    if (!metricReader || telemetryConfig.TELEMETRY_MODE === 'otlp') {
      metricReader = new PeriodicExportingMetricReader({
        exporter: otlpMetricExporter,
        exportIntervalMillis: 5000,
      });
    }
  }

  // Initialize SDK for traces and metrics only - NO log processors
  sdk = new NodeSDK({
    resource,
    spanProcessors: processors,
    metricReader,
    instrumentations: [
      // Note: Bun.serve is not auto-instrumented by Node.js instrumentations
      // HTTP spans are manually created in server.ts for proper Bun support
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-http': {
          enabled: false, // Disable since we're using Bun.serve, not Node.js http
        },
        '@opentelemetry/instrumentation-https': {
          enabled: false, // Disable since we're using Bun.serve
        },
      }),
    ],
  });

  await sdk.start();
  
  // Initialize custom metrics
  initializeMetrics();
  
  // Initialize the logger to use our direct LoggerProvider - NOT the SDK
  // We'll export the loggerProvider so it can be used by the logger when it imports this module
  global.telemetryLoggerProvider = loggerProvider;
  
  // Signal that the logger should reinitialize now that the provider is ready
  const loggerReadyEvent = new CustomEvent('telemetryLoggerReady');
  globalThis.dispatchEvent(loggerReadyEvent);

  // Setup graceful shutdown
  process.on('SIGTERM', async () => {
    await shutdownTelemetry();
  });
}

export async function shutdownTelemetry(): Promise<void> {
  // Shutdown the separate LoggerProvider first
  if (loggerProvider) {
    try {
      await loggerProvider.shutdown();
    } catch (error) {
      console.warn('Error shutting down LoggerProvider:', error);
    }
  }

  // Then shutdown SDK for traces/metrics
  if (sdk) {
    try {
      await sdk.shutdown();
    } catch (error) {
      // Ignore forceFlush errors in Bun runtime - exporters don't implement it properly
      if (error instanceof Error && error.message.includes('forceFlush')) {
        return;
      }
      throw error;
    }
  }
}

export function getTelemetryStatus() {
  return {
    initialized: !!sdk && !!loggerProvider,
    config: telemetryConfig
  };
}

// DO NOT initialize on module load - wait for explicit call from server.ts

// Compatibility exports for server.ts
export const initializeBunFullTelemetry = initializeTelemetry;
export const initializeSimpleTelemetry = initializeTelemetry;
export const getBunTelemetryStatus = getTelemetryStatus;
export const getSimpleTelemetryStatus = getTelemetryStatus;
export const shutdownSimpleTelemetry = shutdownTelemetry;

// Export class for backward compatibility
export class BunTelemetrySDK {
  async initialize() {
    return initializeTelemetry();
  }

  async shutdown() {
    return shutdownTelemetry();
  }

  getStatus() {
    return getTelemetryStatus();
  }
}