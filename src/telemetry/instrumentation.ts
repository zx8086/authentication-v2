/* src/telemetry/instrumentation.ts */

import { metrics } from "@opentelemetry/api";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { type ExportResult, ExportResultCode } from "@opentelemetry/core";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { HostMetrics } from "@opentelemetry/host-metrics";
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
let hostMetrics: HostMetrics | undefined;
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

    "process.runtime.name": "node",
    "service.runtime.name": "node",
    "telemetry.sdk.elastic": "opentelemetry",

    ...(process.env.KUBERNETES_SERVICE_HOST && {
      "k8s.pod.name": process.env.HOSTNAME,
      "k8s.namespace.name": process.env.NAMESPACE,
    }),
    ...(process.env.ECS_CONTAINER_METADATA_URI_V4 && {
      "cloud.provider": "aws",
      "cloud.platform": "aws_ecs",
    }),
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

  const instrumentations = getNodeAutoInstrumentations({
    "@opentelemetry/instrumentation-http": {
      enabled: true,
      requestHook: (span: any, request: any) => {
        span.setAttributes({
          "http.request.body.size": request.headers["content-length"] || 0,
          "http.user_agent": request.headers["user-agent"] || "",
        });
      },
      responseHook: (span: any, response: any) => {
        span.setAttributes({
          "http.response.body.size": response.headers["content-length"] || 0,
        });
      },
    },
    "@opentelemetry/instrumentation-dns": {
      enabled: true,
    },
    "@opentelemetry/instrumentation-net": {
      enabled: true,
    },
    "@opentelemetry/instrumentation-fs": {
      enabled: false,
    },
    "@opentelemetry/instrumentation-grpc": {
      enabled: false,
    },
  });

  sdk = new NodeSDK({
    resource,
    spanProcessors: [traceProcessor],
    metricReaders: [metricReader],
    logRecordProcessors: [logProcessor],
    instrumentations: [instrumentations],
  });

  await sdk.start();

  hostMetrics = new HostMetrics({
    collectInterval: 30000,
  });
  hostMetrics.start();

  initializeElasticCompatibleMetrics();
  initializeMetrics();
}

export async function shutdownTelemetry(): Promise<void> {
  if (hostMetrics) {
    hostMetrics = undefined;
  }

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
function initializeElasticCompatibleMetrics(): void {
  const meter = metrics.getMeter("authentication-service", telemetryConfig.serviceVersion);

  const eventLoopDelayHistogram = meter.createHistogram("nodejs.eventloop.delay", {
    description: "Node.js event loop delay in milliseconds",
    unit: "ms",
  });

  const memoryGauge = meter.createGauge("process.memory.usage", {
    description: "Process memory usage",
    unit: "By",
  });

  const cpuGauge = meter.createGauge("process.cpu.usage", {
    description: "Process CPU usage",
    unit: "percent",
  });

  const activeHandlesGauge = meter.createGauge("nodejs.active_handles", {
    description: "Active handles in Node.js",
    unit: "1",
  });

  const activeRequestsGauge = meter.createGauge("nodejs.active_requests", {
    description: "Active requests in Node.js",
    unit: "1",
  });

  let previousCpuUsage = process.cpuUsage();
  let previousTime = Date.now();

  setInterval(() => {
    const memUsage = process.memoryUsage();
    memoryGauge.record(memUsage.heapUsed, { type: "heap_used" });
    memoryGauge.record(memUsage.heapTotal, { type: "heap_total" });
    memoryGauge.record(memUsage.rss, { type: "rss" });
    memoryGauge.record(memUsage.external, { type: "external" });

    const currentCpuUsage = process.cpuUsage(previousCpuUsage);
    const currentTime = Date.now();
    const timeDiff = currentTime - previousTime;
    const cpuPercent = ((currentCpuUsage.user + currentCpuUsage.system) / 1000 / timeDiff) * 100;
    cpuGauge.record(cpuPercent);
    previousCpuUsage = process.cpuUsage();
    previousTime = currentTime;

    const activeHandles = (process as any)._getActiveHandles()?.length || 0;
    const activeRequests = (process as any)._getActiveRequests()?.length || 0;
    activeHandlesGauge.record(activeHandles);
    activeRequestsGauge.record(activeRequests);
  }, 10000);

  if (performance?.eventLoopUtilization) {
    setInterval(() => {
      const elu = performance.eventLoopUtilization();
      eventLoopDelayHistogram.record(elu.utilization * 100);
    }, 10000);
  }
}

export const shutdownSimpleTelemetry = shutdownTelemetry;
