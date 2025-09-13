// Fixed telemetry instrumentation - exactly like the working simple test
import { NodeSDK } from '@opentelemetry/sdk-node';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { PeriodicExportingMetricReader, MeterProvider } from '@opentelemetry/sdk-metrics';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { MetricExporter, ResourceMetrics } from '@opentelemetry/sdk-metrics';
import { ExportResult, ExportResultCode } from '@opentelemetry/core';
import { metrics as metricsApi } from '@opentelemetry/api';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
  SEMRESATTRS_TELEMETRY_SDK_NAME,
  SEMRESATTRS_TELEMETRY_SDK_VERSION,
  SEMRESATTRS_TELEMETRY_SDK_LANGUAGE,
} from '@opentelemetry/semantic-conventions';
import { telemetryConfig } from './config';
import { initializeMetrics } from './simple-metrics';

let sdk: NodeSDK | undefined;
let debugMetricExporter: DebugMetricExporter | undefined;
let metricReader: PeriodicExportingMetricReader | undefined;
let meterProvider: MeterProvider | undefined;

// Debug wrapper for metric exporter to add visibility
class DebugMetricExporter implements MetricExporter {
  private exportCount = 0;
  private lastExportTime = 0;
  private exportErrors: string[] = [];
  private successCount = 0;
  private failureCount = 0;

  constructor(private baseExporter: OTLPMetricExporter) {}

  async export(
    metrics: ResourceMetrics,
    resultCallback: (result: ExportResult) => void
  ): Promise<void> {
    this.exportCount++;
    this.lastExportTime = Date.now();


    try {
      // Wrap the base exporter's export method
      await new Promise<void>((resolve, reject) => {
        this.baseExporter.export(metrics, (result: ExportResult) => {
          const exportDuration = Date.now() - this.lastExportTime;
          
          if (result.code === ExportResultCode.SUCCESS) {
            this.successCount++;
          } else {
            this.failureCount++;
            const errorMsg = result.error?.message || 'Unknown export error';
            this.exportErrors.push(errorMsg);
            
          }
          
          resultCallback(result);
          resolve();
        });
      });
    } catch (error) {
      this.failureCount++;
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.exportErrors.push(errorMsg);
      
      
      resultCallback({ code: ExportResultCode.FAILED, error: error as Error });
    }
  }

  async forceFlush(): Promise<void> {
    try {
      await this.baseExporter.forceFlush();
    } catch (error) {
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    try {
      await this.baseExporter.shutdown();
    } catch (error) {
      throw error;
    }
  }

  private countMetricsInBatch(resourceMetrics: ResourceMetrics): number {
    let count = 0;
    resourceMetrics.scopeMetrics.forEach(scopeMetric => {
      count += scopeMetric.metrics.length;
    });
    return count;
  }

  getExportStats() {
    return {
      totalExports: this.exportCount,
      successCount: this.successCount,
      failureCount: this.failureCount,
      successRate: this.exportCount > 0 ? (this.successCount / this.exportCount) * 100 : 0,
      lastExportTime: this.lastExportTime ? new Date(this.lastExportTime).toISOString() : null,
      recentErrors: this.exportErrors.slice(-5)
    };
  }
}

export async function initializeTelemetry(): Promise<void> {
  if (!telemetryConfig.ENABLE_OPENTELEMETRY) {
    return;
  }


  // Create resource - exactly like working test
  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: telemetryConfig.SERVICE_NAME,
    [ATTR_SERVICE_VERSION]: telemetryConfig.SERVICE_VERSION,
    [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: telemetryConfig.DEPLOYMENT_ENVIRONMENT,
    [SEMRESATTRS_TELEMETRY_SDK_NAME]: '@opentelemetry/sdk-node',
    [SEMRESATTRS_TELEMETRY_SDK_VERSION]: '1.28.0',
    [SEMRESATTRS_TELEMETRY_SDK_LANGUAGE]: 'javascript',
    'process.runtime.name': 'bun',
    'process.runtime.version': process.versions.bun || Bun.version,
  });

  // Create exporters - exactly like working test
  const otlpTraceExporter = new OTLPTraceExporter({
    url: telemetryConfig.TRACES_ENDPOINT,
    timeoutMillis: telemetryConfig.EXPORT_TIMEOUT_MS,
  });

  // Create base OTLP metric exporter
  const baseOtlpMetricExporter = new OTLPMetricExporter({
    url: telemetryConfig.METRICS_ENDPOINT,
    timeoutMillis: telemetryConfig.EXPORT_TIMEOUT_MS,
  });
  
  // Wrap with debug exporter for visibility
  debugMetricExporter = new DebugMetricExporter(baseOtlpMetricExporter);
  

  const otlpLogExporter = new OTLPLogExporter({
    url: telemetryConfig.LOGS_ENDPOINT,
    timeoutMillis: telemetryConfig.EXPORT_TIMEOUT_MS,
  });

  // Create processors - exactly like working test
  const traceProcessor = new BatchSpanProcessor(otlpTraceExporter, {
    maxExportBatchSize: 10,
    scheduledDelayMillis: 1000, // Quick export like working test
  });

  metricReader = new PeriodicExportingMetricReader({
    exporter: debugMetricExporter,
    exportIntervalMillis: 10000, // Export every 10 seconds
  });


  const logProcessor = new BatchLogRecordProcessor(otlpLogExporter);

  // Create SDK - using new metricReaders array API
  sdk = new NodeSDK({
    resource,
    spanProcessors: [traceProcessor],
    metricReaders: [metricReader], // Updated to use array API
    logRecordProcessors: [logProcessor],
    instrumentations: [], // No auto-instrumentations - we do manual spans
  });


  await sdk.start();
  
  // After SDK start, the global metrics API should point to our meter provider
  
  // Initialize custom metrics - should now use the correct provider
  initializeMetrics();
  
  
}

export async function shutdownTelemetry(): Promise<void> {
  if (sdk) {
    try {
      await sdk.shutdown();
    } catch (error) {
      console.warn('⚠️  Error shutting down OpenTelemetry:', error);
    }
  }
}

export function getTelemetryStatus() {
  return {
    initialized: !!sdk,
    config: telemetryConfig,
    metricsExportStats: debugMetricExporter?.getExportStats() || null
  };
}

// Manual flush function for testing
export async function forceMetricsFlush(): Promise<void> {
  if (!metricReader) {
    throw new Error('Metrics reader not initialized');
  }

  try {
    await metricReader.forceFlush();

    // Also flush the debug exporter
    if (debugMetricExporter) {
      await debugMetricExporter.forceFlush();
    }
  } catch (error) {
    throw error;
  }
}

// Get detailed export statistics
export function getMetricsExportStats() {
  return debugMetricExporter?.getExportStats() || {
    error: 'Debug metrics exporter not initialized'
  };
}

// Trigger immediate export for testing (works around periodic scheduling)
export async function triggerImmediateMetricsExport(): Promise<void> {
  if (!metricReader) {
    throw new Error('Metrics reader not initialized');
  }

  try {
    // Try different methods to trigger collection
    if (typeof (metricReader as any).collect === 'function') {
      await (metricReader as any).collect();
    } else if (typeof (metricReader as any).forceFlush === 'function') {
      await (metricReader as any).forceFlush();
    }
  } catch (error) {
    throw error;
  }
}

// Compatibility exports
export const initializeBunFullTelemetry = initializeTelemetry;
export const initializeSimpleTelemetry = initializeTelemetry;
export const getBunTelemetryStatus = getTelemetryStatus;
export const getSimpleTelemetryStatus = getTelemetryStatus;
export const shutdownSimpleTelemetry = shutdownTelemetry;