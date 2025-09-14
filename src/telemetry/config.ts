/* src/telemetry/config.ts */

// Telemetry configuration following the established config pattern

import { z } from "zod";

const TelemetryConfigSchema = z.object({
  telemetryMode: z.enum(["console", "otlp", "both"]),
  serviceName: z.string().min(1),
  serviceVersion: z.string().min(1),
  deploymentEnvironment: z.enum(["development", "staging", "production"]),

  tracesEndpoint: z.url(),
  metricsEndpoint: z.url(),
  logsEndpoint: z.url(),

  exportTimeoutMs: z.number().min(1000).max(60000),
  batchSize: z.number().min(1).max(5000),
  maxQueueSize: z.number().min(1).max(50000),
});

export type TelemetryConfig = z.infer<typeof TelemetryConfigSchema> & {
  enableOpenTelemetry: boolean;
};

// Default telemetry configuration
const defaultTelemetryConfig = {
  telemetryMode: "both" as const,
  serviceName: "authentication-service",
  serviceVersion: "1.0.0",
  deploymentEnvironment: "development" as const,
  tracesEndpoint: "http://localhost:4318/v1/traces",
  metricsEndpoint: "http://localhost:4318/v1/metrics",
  logsEndpoint: "http://localhost:4318/v1/logs",
  exportTimeoutMs: 30000,
  batchSize: 2048,
  maxQueueSize: 10000,
};

// Environment variable mapping using OpenTelemetry standard variables
const envVarMapping = {
  telemetryMode: "TELEMETRY_MODE", // Custom - no standard equivalent
  serviceName: "OTEL_SERVICE_NAME",
  serviceVersion: "OTEL_SERVICE_VERSION",
  deploymentEnvironment: "NODE_ENV", // Standard Node.js convention
  tracesEndpoint: "OTEL_EXPORTER_OTLP_TRACES_ENDPOINT",
  metricsEndpoint: "OTEL_EXPORTER_OTLP_METRICS_ENDPOINT",
  logsEndpoint: "OTEL_EXPORTER_OTLP_LOGS_ENDPOINT",
  exportTimeoutMs: "OTEL_EXPORTER_OTLP_TIMEOUT",
  batchSize: "OTEL_BSP_MAX_EXPORT_BATCH_SIZE", // Batch Span Processor
  maxQueueSize: "OTEL_BSP_MAX_QUEUE_SIZE", // Batch Span Processor
} as const;

function parseEnvVar(
  value: string | undefined,
  type: "string" | "number" | "boolean",
): unknown {
  if (value === undefined) return undefined;
  if (type === "number") return Number(value);
  if (type === "boolean") return value.toLowerCase() === "true";
  return value;
}

function loadTelemetryConfigFromEnv() {
  // Parse environment variables with proper typing
  const telemetryMode = parseEnvVar(
    Bun.env[envVarMapping.telemetryMode],
    "string",
  ) as "console" | "otlp" | "both" | undefined;
  const serviceName = parseEnvVar(
    Bun.env[envVarMapping.serviceName],
    "string",
  ) as string | undefined;
  const serviceVersion = parseEnvVar(
    Bun.env[envVarMapping.serviceVersion],
    "string",
  ) as string | undefined;
  const deploymentEnvironment = parseEnvVar(
    Bun.env[envVarMapping.deploymentEnvironment],
    "string",
  ) as "development" | "staging" | "production" | undefined;
  const tracesEndpoint = parseEnvVar(
    Bun.env[envVarMapping.tracesEndpoint],
    "string",
  ) as string | undefined;
  const metricsEndpoint = parseEnvVar(
    Bun.env[envVarMapping.metricsEndpoint],
    "string",
  ) as string | undefined;
  const logsEndpoint = parseEnvVar(
    Bun.env[envVarMapping.logsEndpoint],
    "string",
  ) as string | undefined;
  const exportTimeoutMs = parseEnvVar(
    Bun.env[envVarMapping.exportTimeoutMs],
    "number",
  ) as number | undefined;
  const batchSize = parseEnvVar(
    Bun.env[envVarMapping.batchSize],
    "number",
  ) as number | undefined;
  const maxQueueSize = parseEnvVar(
    Bun.env[envVarMapping.maxQueueSize],
    "number",
  ) as number | undefined;

  return {
    telemetryMode: telemetryMode || defaultTelemetryConfig.telemetryMode,
    serviceName: serviceName || defaultTelemetryConfig.serviceName,
    serviceVersion: serviceVersion || defaultTelemetryConfig.serviceVersion,
    deploymentEnvironment:
      deploymentEnvironment || defaultTelemetryConfig.deploymentEnvironment,
    tracesEndpoint: tracesEndpoint || defaultTelemetryConfig.tracesEndpoint,
    metricsEndpoint: metricsEndpoint || defaultTelemetryConfig.metricsEndpoint,
    logsEndpoint: logsEndpoint || defaultTelemetryConfig.logsEndpoint,
    exportTimeoutMs: exportTimeoutMs || defaultTelemetryConfig.exportTimeoutMs,
    batchSize: batchSize || defaultTelemetryConfig.batchSize,
    maxQueueSize: maxQueueSize || defaultTelemetryConfig.maxQueueSize,
  };
}

let telemetryConfig: TelemetryConfig;

try {
  // Load configuration from environment
  const envConfig = loadTelemetryConfigFromEnv();

  // Merge with defaults
  const mergedConfig = {
    ...defaultTelemetryConfig,
    ...envConfig,
  };

  // Validate with Zod schema
  const validatedConfig = TelemetryConfigSchema.parse(mergedConfig);

  // Add computed property
  telemetryConfig = {
    ...validatedConfig,
    enableOpenTelemetry: validatedConfig.telemetryMode !== "console",
  };
} catch (error) {
  if (error instanceof z.ZodError) {
    const issues = error.issues
      .map((issue) => {
        const path = issue.path.join(".");
        return `  - telemetry.${path}: ${issue.message}`;
      })
      .join("\n");

    throw new Error(`Telemetry configuration validation failed:\n${issues}`);
  }

  throw error;
}

export function getTelemetryConfig(): TelemetryConfig {
  return telemetryConfig;
}

// Legacy export for backward compatibility
export { telemetryConfig };
