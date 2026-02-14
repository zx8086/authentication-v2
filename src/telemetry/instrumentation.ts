// src/telemetry/instrumentation.ts

import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import type { ExportResult } from "@opentelemetry/core";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { HostMetrics } from "@opentelemetry/host-metrics";
import { RedisInstrumentation } from "@opentelemetry/instrumentation-redis";
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
  ATTR_TELEMETRY_SDK_LANGUAGE,
  ATTR_TELEMETRY_SDK_NAME,
  ATTR_TELEMETRY_SDK_VERSION,
} from "@opentelemetry/semantic-conventions";
import { ATTR_DEPLOYMENT_ENVIRONMENT_NAME } from "@opentelemetry/semantic-conventions/incubating";
import { loadConfig } from "../config/index";
import { initializeMetrics } from "./metrics";

interface MetricReaderLike {
  forceFlush(): Promise<void>;
  shutdown(): Promise<void>;
  collect?(): Promise<unknown>;
}

const config = loadConfig();
const telemetryConfig = config.telemetry;

let sdk: NodeSDK | undefined;
let hostMetrics: HostMetrics | undefined;
let metricExporter: PushMetricExporter | undefined;
let metricReader: MetricReaderLike | undefined;
let _meterProvider: MeterProvider | undefined;

const metricExportStats = {
  totalExports: 0,
  successCount: 0,
  failureCount: 0,
  get successRate() {
    return this.totalExports > 0 ? Math.round((this.successCount / this.totalExports) * 100) : 0;
  },
  lastExportTime: null as string | null,
  lastSuccessTime: null as string | null,
  lastFailureTime: null as string | null,
  recentErrors: [] as string[],

  recordExportAttempt() {
    this.totalExports++;
  },

  recordExportSuccess() {
    this.successCount++;
    this.lastExportTime = new Date().toISOString();
    this.lastSuccessTime = this.lastExportTime;
  },

  recordExportFailure(error: string) {
    this.failureCount++;
    this.lastExportTime = new Date().toISOString();
    this.lastFailureTime = this.lastExportTime;
    this.recentErrors.push(`${this.lastExportTime}: ${error}`);
    if (this.recentErrors.length > 10) {
      this.recentErrors.shift();
    }
  },
};

export async function initializeTelemetry(): Promise<void> {
  initializeMetrics();

  if (!telemetryConfig.enableOpenTelemetry || telemetryConfig.mode === "console") {
    const noOpExporter: PushMetricExporter = {
      export: (_metrics: ResourceMetrics, resultCallback: (result: ExportResult) => void): void => {
        metricExportStats.recordExportAttempt();
        metricExportStats.recordExportSuccess();
        resultCallback({ code: 0 });
      },
      forceFlush: (): Promise<void> => Promise.resolve(),
      shutdown: (): Promise<void> => Promise.resolve(),
      selectAggregationTemporality: () => 1,
    };
    metricExporter = noOpExporter;

    const noOpReader: MetricReaderLike = {
      forceFlush: (): Promise<void> => Promise.resolve(),
      shutdown: (): Promise<void> => Promise.resolve(),
    };
    metricReader = noOpReader;
    return;
  }

  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: telemetryConfig.serviceName,
    [ATTR_SERVICE_VERSION]: telemetryConfig.serviceVersion,
    [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: telemetryConfig.environment,
    [ATTR_TELEMETRY_SDK_NAME]: "opentelemetry/nodejs",
    [ATTR_TELEMETRY_SDK_VERSION]: "1.26.0",
    [ATTR_TELEMETRY_SDK_LANGUAGE]: "nodejs",

    ...(telemetryConfig.infrastructure.isKubernetes && {
      "k8s.pod.name": telemetryConfig.infrastructure.podName,
      "k8s.namespace.name": telemetryConfig.infrastructure.namespace,
    }),
    ...(telemetryConfig.infrastructure.isEcs && {
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

  const trackingMetricExporter: PushMetricExporter = {
    export: (metrics: ResourceMetrics, resultCallback: (result: ExportResult) => void): void => {
      metricExportStats.recordExportAttempt();
      baseOtlpMetricExporter.export(metrics, (result: ExportResult) => {
        if (result.code === 0) {
          metricExportStats.recordExportSuccess();
        } else {
          const errorMessage =
            result.error instanceof Error ? result.error.message : "Export failed";
          metricExportStats.recordExportFailure(errorMessage);
        }
        resultCallback(result);
      });
    },
    forceFlush: (): Promise<void> => baseOtlpMetricExporter.forceFlush(),
    shutdown: (): Promise<void> => baseOtlpMetricExporter.shutdown(),
    selectAggregationTemporality: (instrumentType) =>
      baseOtlpMetricExporter.selectAggregationTemporality(instrumentType),
  };

  metricExporter = trackingMetricExporter;

  const otlpLogExporter = new OTLPLogExporter({
    url: telemetryConfig.logsEndpoint,
    timeoutMillis: telemetryConfig.exportTimeout,
  });

  const traceProcessor = new BatchSpanProcessor(otlpTraceExporter, {
    maxExportBatchSize: 10,
    scheduledDelayMillis: 1000,
  });

  if (!metricExporter) {
    throw new Error(
      "metricExporter must be initialized before creating PeriodicExportingMetricReader"
    );
  }

  const periodicReader = new PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 10000,
  });
  metricReader = periodicReader;

  const logProcessor = new BatchLogRecordProcessor(otlpLogExporter);

  const baseInstrumentations = getNodeAutoInstrumentations({
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

  const redisInstrumentation = new RedisInstrumentation({
    enabled: true,
    dbStatementSerializer: (cmdName: string, cmdArgs: (string | Buffer)[]) => {
      const sanitizedArgs = cmdArgs.map((arg, index) => {
        const argStr = arg instanceof Buffer ? arg.toString() : arg;
        if (cmdName.toUpperCase() === "SET" && index === 1) {
          return "***";
        }
        if (cmdName.toUpperCase() === "GET" && argStr.includes("consumer_secret")) {
          return "consumer_secret:***";
        }
        return argStr;
      });
      return [cmdName, ...sanitizedArgs].join(" ");
    },
  });

  const instrumentations = [...baseInstrumentations, redisInstrumentation];

  sdk = new NodeSDK({
    resource,
    spanProcessors: [traceProcessor],
    metricReaders: [periodicReader],
    logRecordProcessors: [logProcessor],
    instrumentations: [instrumentations],
  });

  sdk.start();

  hostMetrics = new HostMetrics({});
  hostMetrics.start();
}

export async function shutdownTelemetry(): Promise<void> {
  if (hostMetrics) {
    hostMetrics = undefined;
  }

  if (sdk) {
    try {
      await sdk.shutdown();
    } catch (error) {
      console.warn("Error shutting down OpenTelemetry:", error);
    }
  }
}

export function getTelemetryStatus() {
  return {
    initialized: !!sdk,
    config: telemetryConfig,
    metricsExportStats: metricExportStats,
  };
}

export async function forceMetricsFlush(): Promise<void> {
  if (!metricReader) {
    throw new Error("Metrics reader not initialized");
  }
  await metricReader.forceFlush();

  if (metricExporter) {
    if (telemetryConfig.mode === "console") {
      const emptyMetrics: ResourceMetrics = {
        resource: resourceFromAttributes({}),
        scopeMetrics: [],
      };
      metricExporter.export(emptyMetrics, () => {
        // No-op callback required by API
      });
    } else {
      await metricExporter.forceFlush();
    }
  }
}

export function getMetricsExportStats() {
  return metricExportStats;
}

export async function triggerImmediateMetricsExport(): Promise<void> {
  if (!metricReader) {
    throw new Error("Metrics reader not initialized");
  }
  if (typeof metricReader.collect === "function") {
    await metricReader.collect();
  } else {
    await metricReader.forceFlush();
  }
}

export const initializeBunFullTelemetry = initializeTelemetry;
export const initializeSimpleTelemetry = initializeTelemetry;
export const getBunTelemetryStatus = getTelemetryStatus;
export const getSimpleTelemetryStatus = getTelemetryStatus;

export const shutdownSimpleTelemetry = shutdownTelemetry;
