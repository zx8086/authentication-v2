/* src/telemetry/instrumentation.ts */

import { type ExportResult, ExportResultCode } from "@opentelemetry/core";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { BatchLogRecordProcessor } from "@opentelemetry/sdk-logs";
import {
  type MeterProvider,
  PeriodicExportingMetricReader,
  type PushMetricExporter,
  type ResourceMetrics,
} from "@opentelemetry/sdk-metrics";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
  SEMRESATTRS_TELEMETRY_SDK_LANGUAGE,
  SEMRESATTRS_TELEMETRY_SDK_NAME,
  SEMRESATTRS_TELEMETRY_SDK_VERSION,
} from "@opentelemetry/semantic-conventions";
import { telemetryConfig } from "./config";
import { initializeMetrics } from "./metrics";

let sdk: NodeSDK | undefined;
let debugMetricExporter: DebugMetricExporter | undefined;
let metricReader: PeriodicExportingMetricReader | undefined;
let _meterProvider: MeterProvider | undefined;

class DebugMetricExporter implements PushMetricExporter {
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
      await new Promise<void>((resolve, _reject) => {
        this.baseExporter.export(metrics, (result: ExportResult) => {
          const _exportDuration = Date.now() - this.lastExportTime;

          if (result.code === ExportResultCode.SUCCESS) {
            this.successCount++;
          } else {
            this.failureCount++;
            const errorMsg = result.error?.message || "Unknown export error";
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
    await this.baseExporter.forceFlush();
  }

  async shutdown(): Promise<void> {
    await this.baseExporter.shutdown();
  }

  getExportStats() {
    return {
      totalExports: this.exportCount,
      successCount: this.successCount,
      failureCount: this.failureCount,
      successRate: this.exportCount > 0 ? (this.successCount / this.exportCount) * 100 : 0,
      lastExportTime: this.lastExportTime ? new Date(this.lastExportTime).toISOString() : null,
      recentErrors: this.exportErrors.slice(-5),
    };
  }
}

export async function initializeTelemetry(): Promise<void> {
  if (!telemetryConfig.enableOpenTelemetry) {
    // Even in console mode, we still need metrics for internal monitoring
    initializeMetrics();
    return;
  }

  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: telemetryConfig.serviceName,
    [ATTR_SERVICE_VERSION]: telemetryConfig.serviceVersion,
    [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: telemetryConfig.environment,
    [SEMRESATTRS_TELEMETRY_SDK_NAME]: "@opentelemetry/sdk-node",
    [SEMRESATTRS_TELEMETRY_SDK_VERSION]: "1.28.0",
    [SEMRESATTRS_TELEMETRY_SDK_LANGUAGE]: "javascript",
    "process.runtime.name": "bun",
    "process.runtime.version": process.versions.bun || Bun.version,
  });

  const otlpTraceExporter = new OTLPTraceExporter({
    url: telemetryConfig.tracesEndpoint,
    timeoutMillis: telemetryConfig.exportTimeout,
  });

  const baseOtlpMetricExporter = new OTLPMetricExporter({
    url: telemetryConfig.metricsEndpoint,
    timeoutMillis: telemetryConfig.exportTimeout,
  });

  debugMetricExporter = new DebugMetricExporter(baseOtlpMetricExporter);

  const otlpLogExporter = new OTLPLogExporter({
    url: telemetryConfig.logsEndpoint,
    timeoutMillis: telemetryConfig.exportTimeout,
  });

  const traceProcessor = new BatchSpanProcessor(otlpTraceExporter, {
    maxExportBatchSize: 10,
    scheduledDelayMillis: 1000,
  });

  metricReader = new PeriodicExportingMetricReader({
    exporter: debugMetricExporter,
    exportIntervalMillis: 10000,
  });

  const logProcessor = new BatchLogRecordProcessor(otlpLogExporter);

  sdk = new NodeSDK({
    resource,
    spanProcessors: [traceProcessor],
    metricReaders: [metricReader],
    logRecordProcessors: [logProcessor],
    instrumentations: [],
  });

  await sdk.start();

  initializeMetrics();
}

export async function shutdownTelemetry(): Promise<void> {
  if (sdk) {
    try {
      await sdk.shutdown();
    } catch (error) {
      console.warn("⚠️  Error shutting down OpenTelemetry:", error);
    }
  }
}

export function getTelemetryStatus() {
  return {
    initialized: !!sdk,
    config: telemetryConfig,
    metricsExportStats: debugMetricExporter?.getExportStats() || null,
  };
}

export async function forceMetricsFlush(): Promise<void> {
  if (!metricReader) {
    throw new Error("Metrics reader not initialized");
  }
  await metricReader.forceFlush();

  if (debugMetricExporter) {
    await debugMetricExporter.forceFlush();
  }
}

export function getMetricsExportStats() {
  return (
    debugMetricExporter?.getExportStats() || {
      error: "Debug metrics exporter not initialized",
    }
  );
}

export async function triggerImmediateMetricsExport(): Promise<void> {
  if (!metricReader) {
    throw new Error("Metrics reader not initialized");
  }
  if (typeof (metricReader as any).collect === "function") {
    await (metricReader as any).collect();
  } else if (typeof (metricReader as any).forceFlush === "function") {
    await (metricReader as any).forceFlush();
  }
}

export const initializeBunFullTelemetry = initializeTelemetry;
export const initializeSimpleTelemetry = initializeTelemetry;
export const getBunTelemetryStatus = getTelemetryStatus;
export const getSimpleTelemetryStatus = getTelemetryStatus;
export const shutdownSimpleTelemetry = shutdownTelemetry;
