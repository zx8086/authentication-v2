/* src/config/loader.ts */

import { z } from "zod";
import pkg from "../../package.json" with { type: "json" };
import { defaultConfig } from "./defaults";
import { deriveOtlpEndpoint, toBool } from "./helpers";
import type { AppConfig } from "./schemas";
import {
  AppConfigSchema,
  addProductionSecurityValidation,
  EmailAddress,
  EnvironmentType,
  HttpsUrl,
  KongMode,
  NonEmptyString,
  TelemetryMode,
} from "./schemas";

const envSchema = z
  .object({
    // Server Configuration
    PORT: z.coerce.number().int().min(1).max(65535).optional(),
    NODE_ENV: EnvironmentType.optional(),

    // JWT Configuration (required fields for security)
    KONG_JWT_AUTHORITY: NonEmptyString,
    KONG_JWT_AUDIENCE: NonEmptyString,
    KONG_JWT_ISSUER: NonEmptyString.optional(),
    KONG_JWT_KEY_CLAIM_NAME: NonEmptyString.optional(),
    JWT_EXPIRATION_MINUTES: z.coerce.number().int().min(1).max(60).optional(),

    // Kong Configuration (required fields for connectivity)
    KONG_MODE: KongMode.optional(),
    KONG_ADMIN_URL: HttpsUrl,
    KONG_ADMIN_TOKEN: z.string(),

    // Circuit Breaker Configuration (optional with sensible defaults)
    CIRCUIT_BREAKER_ENABLED: z.string().optional(),
    CIRCUIT_BREAKER_TIMEOUT: z.coerce.number().int().min(100).max(10000).optional(),
    CIRCUIT_BREAKER_ERROR_THRESHOLD: z.coerce.number().min(1).max(100).optional(),
    CIRCUIT_BREAKER_RESET_TIMEOUT: z.coerce.number().int().min(1000).max(300000).optional(),
    CIRCUIT_BREAKER_VOLUME_THRESHOLD: z.coerce.number().int().min(1).max(100).optional(),
    CIRCUIT_BREAKER_ROLLING_COUNT_TIMEOUT: z.coerce.number().int().min(1000).max(60000).optional(),
    CIRCUIT_BREAKER_ROLLING_COUNT_BUCKETS: z.coerce.number().int().min(1).max(20).optional(),
    STALE_DATA_TOLERANCE_MINUTES: z.coerce.number().int().min(1).max(120).optional(),

    // Telemetry Configuration
    OTEL_SERVICE_NAME: NonEmptyString.optional(),
    OTEL_SERVICE_VERSION: NonEmptyString.optional(),
    TELEMETRY_MODE: TelemetryMode.optional(),
    OTEL_EXPORTER_OTLP_ENDPOINT: HttpsUrl.optional(),
    OTEL_EXPORTER_OTLP_LOGS_ENDPOINT: HttpsUrl.optional(),
    OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: HttpsUrl.optional(),
    OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: HttpsUrl.optional(),
    OTEL_EXPORTER_OTLP_TIMEOUT: z.coerce.number().int().min(1000).max(60000).optional(),
    OTEL_BSP_MAX_EXPORT_BATCH_SIZE: z.coerce.number().int().min(1).max(5000).optional(),
    OTEL_BSP_MAX_QUEUE_SIZE: z.coerce.number().int().min(1).max(50000).optional(),

    // Caching Configuration
    HIGH_AVAILABILITY: z
      .string()
      .optional()
      .transform((val) => val === "true"),
    // Redis URL - accepts redis:// or rediss:// protocols for flexibility
    REDIS_URL: z.url().optional(),
    REDIS_PASSWORD: z.string().optional(),
    REDIS_DB: z.coerce.number().int().min(0).max(15).optional(),

    // Profiling Configuration
    PROFILING_ENABLED: z.string().optional(),

    // API Info Configuration
    API_TITLE: NonEmptyString.optional(),
    API_DESCRIPTION: NonEmptyString.optional(),
    API_VERSION: NonEmptyString.optional(),
    API_CONTACT_NAME: NonEmptyString.optional(),
    API_CONTACT_EMAIL: EmailAddress.optional(),
    API_LICENSE_NAME: NonEmptyString.optional(),
    API_LICENSE_IDENTIFIER: NonEmptyString.optional(),
    API_CORS: NonEmptyString.optional(),
  })
  .superRefine((data, ctx) => {
    addProductionSecurityValidation({ nodeEnv: data.NODE_ENV }, ctx, {
      serviceName: data.OTEL_SERVICE_NAME || pkg.name || "authentication-service",
      serviceVersion: data.OTEL_SERVICE_VERSION || pkg.version || "1.0.0",
      adminUrl: data.KONG_ADMIN_URL,
      adminToken: data.KONG_ADMIN_TOKEN,
    });
  })
  .transform((data) => {
    // Derive OTLP endpoints from base endpoint when not specified
    const baseEndpoint = data.OTEL_EXPORTER_OTLP_ENDPOINT;

    return {
      ...data,
      OTEL_EXPORTER_OTLP_LOGS_ENDPOINT: deriveOtlpEndpoint(
        baseEndpoint,
        data.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT,
        "/v1/logs"
      ),
      OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: deriveOtlpEndpoint(
        baseEndpoint,
        data.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
        "/v1/traces"
      ),
      OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: deriveOtlpEndpoint(
        baseEndpoint,
        data.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT,
        "/v1/metrics"
      ),
    };
  });

function detectInfrastructure() {
  const envSource = typeof Bun !== "undefined" ? Bun.env : process.env;

  const isKubernetes = !!envSource.KUBERNETES_SERVICE_HOST;
  const isEcs = !!envSource.ECS_CONTAINER_METADATA_URI_V4;

  return {
    isKubernetes,
    isEcs,
    podName: isKubernetes ? envSource.HOSTNAME : undefined,
    namespace: isKubernetes ? envSource.NAMESPACE : undefined,
  };
}

function loadConfigFromEnv() {
  const envSource = typeof Bun !== "undefined" ? Bun.env : process.env;

  const result = envSchema.safeParse(envSource);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => {
        const path = issue.path.length > 0 ? issue.path.join(".") : "root";
        return `  - ${path}: ${issue.message}`;
      })
      .join("\n");

    throw new Error(
      `Invalid environment configuration:\n${issues}\n\nHelp: Check .env.example for correct format and ensure all required variables are set.`
    );
  }

  return result.data;
}

export function initializeConfig(): AppConfig {
  const envConfig = loadConfigFromEnv();

  // Define intermediate type for structured environment config with proper literal types
  type KongModeType = "API_GATEWAY" | "KONNECT";
  type EnvironmentTypeValue = "local" | "development" | "staging" | "production" | "test";
  type TelemetryModeValue = "console" | "otlp" | "both";

  interface StructuredEnvConfig {
    server: Partial<{ port: number; nodeEnv: string }>;
    jwt: Partial<{
      authority: string;
      audience: string;
      issuer: string;
      keyClaimName: string;
      expirationMinutes: number;
    }>;
    kong: {
      mode?: KongModeType;
      adminUrl?: string;
      adminToken?: string;
      consumerIdHeader?: string;
      consumerUsernameHeader?: string;
      anonymousHeader?: string;
      highAvailability?: boolean;
      circuitBreaker: Partial<{
        enabled: boolean;
        timeout: number;
        errorThresholdPercentage: number;
        resetTimeout: number;
        volumeThreshold: number;
        rollingCountTimeout: number;
        rollingCountBuckets: number;
      }>;
    };
    caching: Partial<{
      highAvailability: boolean;
      redisUrl: string;
      redisPassword: string;
      redisDb: number;
      staleDataToleranceMinutes: number;
    }>;
    telemetry: {
      serviceName?: string;
      serviceVersion?: string;
      environment?: EnvironmentTypeValue;
      mode?: TelemetryModeValue;
      endpoint?: string;
      exportTimeout?: number;
      batchSize?: number;
      maxQueueSize?: number;
      infrastructure: {
        isKubernetes: boolean;
        isEcs: boolean;
        podName?: string;
        namespace?: string;
      };
    };
    profiling: Partial<{ enabled: boolean }>;
    apiInfo: Partial<{
      title: string;
      description: string;
      version: string;
      contactName: string;
      contactEmail: string;
      licenseName: string;
      licenseIdentifier: string;
      cors: string;
    }>;
  }

  // Convert environment config to structured format for merging (simplified with proper filtering)
  const structuredEnvConfig: StructuredEnvConfig = {
    server: Object.fromEntries(
      Object.entries({
        port: envConfig.PORT,
        nodeEnv: envConfig.NODE_ENV,
      }).filter(([, value]) => value !== undefined)
    ),
    jwt: Object.fromEntries(
      Object.entries({
        authority: envConfig.KONG_JWT_AUTHORITY,
        audience: envConfig.KONG_JWT_AUDIENCE,
        issuer: envConfig.KONG_JWT_ISSUER,
        keyClaimName: envConfig.KONG_JWT_KEY_CLAIM_NAME,
        expirationMinutes: envConfig.JWT_EXPIRATION_MINUTES,
      }).filter(([, value]) => value !== undefined)
    ),
    kong: {
      ...Object.fromEntries(
        Object.entries({
          mode: envConfig.KONG_MODE,
          adminUrl: envConfig.KONG_ADMIN_URL,
          adminToken: envConfig.KONG_ADMIN_TOKEN,
          consumerIdHeader: "x-consumer-id",
          consumerUsernameHeader: "x-consumer-username",
          anonymousHeader: "x-anonymous-consumer",
          highAvailability: toBool(envConfig.HIGH_AVAILABILITY, false),
        }).filter(([, value]) => value !== undefined)
      ),
      circuitBreaker: Object.fromEntries(
        Object.entries({
          enabled: toBool(envConfig.CIRCUIT_BREAKER_ENABLED, true),
          timeout: envConfig.CIRCUIT_BREAKER_TIMEOUT,
          errorThresholdPercentage: envConfig.CIRCUIT_BREAKER_ERROR_THRESHOLD,
          resetTimeout: envConfig.CIRCUIT_BREAKER_RESET_TIMEOUT,
          volumeThreshold: envConfig.CIRCUIT_BREAKER_VOLUME_THRESHOLD,
          rollingCountTimeout: envConfig.CIRCUIT_BREAKER_ROLLING_COUNT_TIMEOUT,
          rollingCountBuckets: envConfig.CIRCUIT_BREAKER_ROLLING_COUNT_BUCKETS,
        }).filter(([, value]) => value !== undefined)
      ),
    },
    caching: Object.fromEntries(
      Object.entries({
        highAvailability: envConfig.HIGH_AVAILABILITY,
        redisUrl: envConfig.REDIS_URL,
        redisPassword: envConfig.REDIS_PASSWORD,
        redisDb: envConfig.REDIS_DB,
        staleDataToleranceMinutes: envConfig.STALE_DATA_TOLERANCE_MINUTES,
      }).filter(([, value]) => value !== undefined)
    ),
    telemetry: {
      ...Object.fromEntries(
        Object.entries({
          serviceName: envConfig.OTEL_SERVICE_NAME,
          serviceVersion: envConfig.OTEL_SERVICE_VERSION,
          environment: envConfig.NODE_ENV,
          mode: envConfig.TELEMETRY_MODE,
          endpoint: envConfig.OTEL_EXPORTER_OTLP_ENDPOINT,
          exportTimeout: envConfig.OTEL_EXPORTER_OTLP_TIMEOUT,
          batchSize: envConfig.OTEL_BSP_MAX_EXPORT_BATCH_SIZE,
          maxQueueSize: envConfig.OTEL_BSP_MAX_QUEUE_SIZE,
        }).filter(([, value]) => value !== undefined)
      ),
      infrastructure: detectInfrastructure(),
    },
    profiling: Object.fromEntries(
      Object.entries({
        enabled: toBool(envConfig.PROFILING_ENABLED, false),
      }).filter(([, value]) => value !== undefined)
    ),
    apiInfo: Object.fromEntries(
      Object.entries({
        title: envConfig.API_TITLE,
        description: envConfig.API_DESCRIPTION,
        version: envConfig.API_VERSION,
        contactName: envConfig.API_CONTACT_NAME,
        contactEmail: envConfig.API_CONTACT_EMAIL,
        licenseName: envConfig.API_LICENSE_NAME,
        licenseIdentifier: envConfig.API_LICENSE_IDENTIFIER,
        cors: envConfig.API_CORS,
      }).filter(([, value]) => value !== undefined)
    ),
  };

  // Merge environment variables with defaults using object spreading (original 4-pillar pattern)
  const mergedConfig: AppConfig = {
    server: { ...defaultConfig.server, ...structuredEnvConfig.server },
    jwt: {
      ...defaultConfig.jwt,
      ...structuredEnvConfig.jwt,
      // Special handling for issuer fallback to authority
      issuer:
        (structuredEnvConfig.jwt.issuer as string) ||
        (structuredEnvConfig.jwt.authority as string) ||
        defaultConfig.jwt.issuer,
    },
    kong: {
      ...defaultConfig.kong,
      ...structuredEnvConfig.kong,
      circuitBreaker: {
        ...defaultConfig.kong.circuitBreaker,
        ...structuredEnvConfig.kong.circuitBreaker,
      },
    },
    caching: { ...defaultConfig.caching, ...structuredEnvConfig.caching },
    telemetry: {
      ...defaultConfig.telemetry,
      ...structuredEnvConfig.telemetry,
      // Handle derived OTLP endpoints
      logsEndpoint: deriveOtlpEndpoint(
        structuredEnvConfig.telemetry.endpoint,
        envConfig.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT,
        "/v1/logs"
      ),
      tracesEndpoint: deriveOtlpEndpoint(
        structuredEnvConfig.telemetry.endpoint,
        envConfig.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
        "/v1/traces"
      ),
      metricsEndpoint: deriveOtlpEndpoint(
        structuredEnvConfig.telemetry.endpoint,
        envConfig.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT,
        "/v1/metrics"
      ),
      // Handle computed properties - ensure boolean values
      enabled:
        ((structuredEnvConfig.telemetry.mode ?? defaultConfig.telemetry.mode) as string) !==
        "console",
      enableOpenTelemetry:
        ((structuredEnvConfig.telemetry.mode ?? defaultConfig.telemetry.mode) as string) !==
        "console",
    },
    profiling: { ...defaultConfig.profiling, ...structuredEnvConfig.profiling },
    apiInfo: { ...defaultConfig.apiInfo, ...structuredEnvConfig.apiInfo },
  };

  // Final validation of the merged configuration
  const result = AppConfigSchema.safeParse(mergedConfig);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => {
        const path = issue.path.length > 0 ? issue.path.join(".") : "root";
        return `  - ${path}: ${issue.message}`;
      })
      .join("\n");

    throw new Error(
      `Invalid configuration after merging:\n${issues}\n\nHelp: Configuration validation failed. Check .env.example for reference and ensure environment-specific values are correct.`
    );
  }

  // Final validation of critical configuration
  const requiredVars = [
    { key: "KONG_JWT_AUTHORITY", value: mergedConfig.jwt.authority },
    { key: "KONG_JWT_AUDIENCE", value: mergedConfig.jwt.audience },
    { key: "KONG_ADMIN_URL", value: mergedConfig.kong.adminUrl },
  ];

  // KONG_ADMIN_TOKEN is only required for KONNECT mode, not API_GATEWAY mode
  if (mergedConfig.kong.mode === "KONNECT") {
    requiredVars.push({ key: "KONG_ADMIN_TOKEN", value: mergedConfig.kong.adminToken });
  }

  const missingVars = requiredVars.filter(({ value }) => !value || value.trim() === "");

  if (missingVars.length > 0) {
    const missing = missingVars.map(({ key }) => key).join(", ");
    throw new Error(
      `Missing required environment variables: ${missing}\n\nHelp: These variables are required for service operation. Check .env.example and ensure all critical configuration is set.`
    );
  }

  // Ensure telemetry computed properties are properly set
  const finalConfig: AppConfig = {
    ...result.data,
    telemetry: {
      ...result.data.telemetry,
      enabled: result.data.telemetry.enabled ?? false,
      enableOpenTelemetry: result.data.telemetry.enableOpenTelemetry ?? false,
    },
  };

  return finalConfig;
}
