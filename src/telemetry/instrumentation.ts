// src/telemetry/instrumentation.ts

import { logs } from "@opentelemetry/api-logs";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import type { ExportResult } from "@opentelemetry/core";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { HostMetrics } from "@opentelemetry/host-metrics";
import { RedisInstrumentation } from "@opentelemetry/instrumentation-redis";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { BatchLogRecordProcessor, LoggerProvider } from "@opentelemetry/sdk-logs";
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
import {
  createExportStatsTracker,
  type ExportStats,
  type ExportStatsTracker,
  wrapLogRecordExporter,
  wrapMetricExporter,
  wrapSpanExporter,
} from "./export-stats-tracker";
import { initializeMetrics } from "./metrics";
import { winstonTelemetryLogger } from "./winston-logger";

interface MetricReaderLike {
  forceFlush(): Promise<void>;
  shutdown(): Promise<void>;
  collect?(): Promise<unknown>;
}

const config = loadConfig();
const telemetryConfig = config.telemetry;

let sdk: NodeSDK | undefined;
let loggerProvider: LoggerProvider | undefined;
let hostMetrics: HostMetrics | undefined;
let metricExporter: PushMetricExporter | undefined;
let metricReader: MetricReaderLike | undefined;
let _meterProvider: MeterProvider | undefined;

const traceExportStats = createExportStatsTracker();
const metricExportStats = createExportStatsTracker();
const logExportStats = createExportStatsTracker();

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

  const baseOtlpTraceExporter = new OTLPTraceExporter({
    url: telemetryConfig.tracesEndpoint,
    timeoutMillis: telemetryConfig.exportTimeout,
  });
  const trackingTraceExporter = wrapSpanExporter(baseOtlpTraceExporter, traceExportStats);

  const baseOtlpMetricExporter = new OTLPMetricExporter({
    url: telemetryConfig.metricsEndpoint,
    timeoutMillis: telemetryConfig.exportTimeout,
  });
  const trackingMetricExporter = wrapMetricExporter(baseOtlpMetricExporter, metricExportStats);
  metricExporter = trackingMetricExporter;

  const baseOtlpLogExporter = new OTLPLogExporter({
    url: telemetryConfig.logsEndpoint,
    timeoutMillis: telemetryConfig.exportTimeout,
  });
  const trackingLogExporter = wrapLogRecordExporter(baseOtlpLogExporter, logExportStats);

  const traceProcessor = new BatchSpanProcessor(trackingTraceExporter, {
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

  const logProcessor = new BatchLogRecordProcessor(trackingLogExporter);

  // OTel SDK 0.212.0 breaking change: LoggerProvider must be explicitly registered
  // as the global provider for OpenTelemetryTransportV3 (Winston) to work.
  // NodeSDK no longer automatically sets the global LoggerProvider.
  // See: https://github.com/open-telemetry/opentelemetry-js/releases (0.212.0)
  loggerProvider = new LoggerProvider({
    resource,
    processors: [logProcessor],
  });
  logs.setGlobalLoggerProvider(loggerProvider);

  const baseInstrumentations = getNodeAutoInstrumentations({
    "@opentelemetry/instrumentation-http": {
      enabled: true,
      // biome-ignore lint/suspicious/noExplicitAny: OpenTelemetry hook types are complex and not fully exposed
      requestHook: (span: any, request: any) => {
        span.setAttributes({
          "http.request.body.size": request.headers["content-length"] || 0,
          "http.user_agent": request.headers["user-agent"] || "",
        });
      },
      // biome-ignore lint/suspicious/noExplicitAny: OpenTelemetry hook types are complex and not fully exposed
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
    // LoggerProvider is managed separately and registered globally above
    // to ensure OpenTelemetryTransportV3 (Winston) can access it
    instrumentations: [instrumentations],
  });

  sdk.start();

  hostMetrics = new HostMetrics({});
  hostMetrics.start();

  // OTel SDK 0.212.0 breaking change fix:
  // Winston logger must be reinitialized AFTER the global LoggerProvider is set.
  // OpenTelemetryTransportV3 captures the global LoggerProvider at construction time,
  // so any transports created before logs.setGlobalLoggerProvider() will not send logs.
  // See: https://github.com/open-telemetry/opentelemetry-js-contrib/blob/main/packages/winston-transport/README.md
  winstonTelemetryLogger.reinitialize();
}

export async function shutdownTelemetry(): Promise<void> {
  if (hostMetrics) {
    // HostMetrics cleanup happens through OTel SDK shutdown (no explicit stop method)
    // Setting to undefined allows garbage collection of internal meter references
    hostMetrics = undefined;
  }

  if (loggerProvider) {
    try {
      await loggerProvider.shutdown();
    } catch (error) {
      console.warn("Error shutting down LoggerProvider:", error);
    }
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
    exportStats: {
      traces: traceExportStats.getStats(),
      metrics: metricExportStats.getStats(),
      logs: logExportStats.getStats(),
    },
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

export function getTraceExportStats(): ExportStats {
  return traceExportStats.getStats();
}

export function getMetricsExportStats(): ExportStatsTracker {
  return metricExportStats;
}

export function getLogExportStats(): ExportStats {
  return logExportStats.getStats();
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
