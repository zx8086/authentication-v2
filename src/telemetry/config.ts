/* src/telemetry/config.ts */

// Simple telemetry configuration using TELEMETRY_MODE and OTEL_EXPORTER_OTLP_ENDPOINT
import { z } from 'zod';

const TelemetryConfigSchema = z.object({
  TELEMETRY_MODE: z.enum(['console', 'otlp', 'both']).default('both'),
  ENABLE_OPENTELEMETRY: z.boolean().default(true),
  SERVICE_NAME: z.string().min(1),
  SERVICE_VERSION: z.string().min(1),
  DEPLOYMENT_ENVIRONMENT: z.enum(["development", "staging", "production"]),

  TRACES_ENDPOINT: z.string().url(),
  METRICS_ENDPOINT: z.string().url(), 
  LOGS_ENDPOINT: z.string().url(),

  EXPORT_TIMEOUT_MS: z.number().min(1000).max(60000).default(30000),
  BATCH_SIZE: z.number().min(1).max(5000).default(2048),
  MAX_QUEUE_SIZE: z.number().min(1).max(50000).default(10000),
});

export type TelemetryConfig = z.infer<typeof TelemetryConfigSchema>;

// Load configuration from environment using standard OTEL variables
const rawConfig = {
  TELEMETRY_MODE: (process.env.TELEMETRY_MODE || 'both') as 'console' | 'otlp' | 'both',
  ENABLE_OPENTELEMETRY: process.env.ENABLE_OPENTELEMETRY !== 'false' && process.env.TELEMETRY_MODE !== 'console',
  SERVICE_NAME: process.env.SERVICE_NAME || 'pvh-authentication-service',
  SERVICE_VERSION: process.env.SERVICE_VERSION || '1.0.0',
  DEPLOYMENT_ENVIRONMENT: (process.env.NODE_ENV || 'development') as 'development' | 'staging' | 'production',

  // Use standard OTEL_EXPORTER_OTLP_ENDPOINT with fallbacks to specific endpoint variables
  TRACES_ENDPOINT: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT || 
    (process.env.OTEL_EXPORTER_OTLP_ENDPOINT ? `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces` : 'http://localhost:4318/v1/traces'),
  METRICS_ENDPOINT: process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT || 
    (process.env.OTEL_EXPORTER_OTLP_ENDPOINT ? `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/metrics` : 'http://localhost:4318/v1/metrics'),
  LOGS_ENDPOINT: process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT || 
    (process.env.OTEL_EXPORTER_OTLP_ENDPOINT ? `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/logs` : 'http://localhost:4318/v1/logs'),

  EXPORT_TIMEOUT_MS: parseInt(process.env.EXPORT_TIMEOUT_MS || '30000'),
  BATCH_SIZE: parseInt(process.env.BATCH_SIZE || '2048'),
  MAX_QUEUE_SIZE: parseInt(process.env.MAX_QUEUE_SIZE || '10000'),
};

export const telemetryConfig = TelemetryConfigSchema.parse(rawConfig);