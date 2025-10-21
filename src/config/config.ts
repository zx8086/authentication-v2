/* src/config/config.ts */

import { z } from "zod";
import pkg from "../../package.json" with { type: "json" };
import { deriveOtlpEndpoint, toBool } from "./helpers";
import type {
  ApiInfoConfig,
  AppConfig,
  CachingConfig,
  JwtConfig,
  KongConfig,
  ProfilingConfig,
  ServerConfig,
  TelemetryConfig,
} from "./schemas";
import {
  AppConfigSchema,
  addProductionSecurityValidation,
  EmailAddress,
  EnvironmentType,
  HttpsUrl,
  KongMode,
  NonEmptyString,
  SchemaRegistry,
  TelemetryMode,
} from "./schemas";

// Comprehensive Environment Variable Schema
const envSchema = z
  .object({
    // Server Configuration
    PORT: z.coerce.number().int().min(1024).max(65535).optional(),
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
    KONG_ADMIN_TOKEN: NonEmptyString,

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

    // API Versioning Configuration
    API_VERSIONING_SUPPORTED_VERSIONS: z.string().optional(),
    API_VERSIONING_DEFAULT_VERSION: NonEmptyString.optional(),
    API_VERSIONING_LATEST_VERSION: NonEmptyString.optional(),
    API_VERSIONING_STRATEGY: z.enum(["header", "url", "content-type"]).optional(),
    API_VERSIONING_DEPRECATION_ENABLED: z.string().optional(),
    API_VERSIONING_DEPRECATION_WARNING_HEADER: z.string().optional(),
    API_VERSIONING_DEPRECATION_GRACE_PERIOD_DAYS: z.coerce
      .number()
      .int()
      .min(30)
      .max(365)
      .optional(),

    // API v2 Security Headers Configuration
    API_V2_SECURITY_HEADERS_ENABLED: z.string().optional(),
    API_V2_SECURITY_HSTS_MAX_AGE: z.coerce.number().int().min(86400).max(63072000).optional(),
    API_V2_SECURITY_HSTS_INCLUDE_SUBDOMAINS: z.string().optional(),
    API_V2_SECURITY_HSTS_PRELOAD: z.string().optional(),
    API_V2_SECURITY_CSP_POLICY: z.string().optional(),
    API_V2_SECURITY_FRAME_OPTIONS: z.enum(["DENY", "SAMEORIGIN"]).optional(),
    API_V2_SECURITY_CONTENT_TYPE_OPTIONS: z.string().optional(),
    API_V2_SECURITY_XSS_PROTECTION: z.string().optional(),
    API_V2_SECURITY_REFERRER_POLICY: z
      .enum([
        "no-referrer",
        "no-referrer-when-downgrade",
        "origin",
        "origin-when-cross-origin",
        "same-origin",
        "strict-origin",
        "strict-origin-when-cross-origin",
        "unsafe-url",
      ])
      .optional(),
    API_V2_SECURITY_PERMISSIONS_POLICY: z.string().optional(),

    // API v2 Audit Logging Configuration
    API_V2_AUDIT_LOGGING_ENABLED: z.string().optional(),
    API_V2_AUDIT_LEVEL: z.enum(["basic", "detailed", "comprehensive"]).optional(),
    API_V2_AUDIT_RETENTION_DAYS: z.coerce.number().int().min(30).max(2555).optional(),
    API_V2_AUDIT_INCLUDE_CLIENT_INFO: z.string().optional(),
    API_V2_AUDIT_ANONYMIZE_IP: z.string().optional(),
    API_V2_AUDIT_INCLUDE_PII: z.string().optional(),
    API_V2_AUDIT_CORRELATION_ID_HEADER: z.string().optional(),
    API_V2_AUDIT_AUTH_FAILURE_THRESHOLD: z.coerce.number().int().min(1).optional(),
    API_V2_AUDIT_ANOMALY_DETECTION: z.string().optional(),
    API_V2_AUDIT_SUSPICIOUS_PATTERNS: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    addProductionSecurityValidation({ nodeEnv: data.NODE_ENV }, ctx, {
      serviceName: data.OTEL_SERVICE_NAME || pkg.name || "authentication-service",
      serviceVersion: data.OTEL_SERVICE_VERSION || pkg.version || "1.0.0",
      adminUrl: data.KONG_ADMIN_URL,
      adminToken: data.KONG_ADMIN_TOKEN,
      endpoints: [
        {
          path: ["OTEL_EXPORTER_OTLP_LOGS_ENDPOINT"],
          value: data.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT,
        },
        {
          path: ["OTEL_EXPORTER_OTLP_TRACES_ENDPOINT"],
          value: data.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
        },
        {
          path: ["OTEL_EXPORTER_OTLP_METRICS_ENDPOINT"],
          value: data.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT,
        },
      ],
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

// Pillar 2: Environment Variable Mapping
const envVarMapping = {
  server: {
    port: "PORT",
    nodeEnv: "NODE_ENV",
  },
  jwt: {
    authority: "KONG_JWT_AUTHORITY",
    audience: "KONG_JWT_AUDIENCE",
    issuer: "KONG_JWT_ISSUER",
    keyClaimName: "KONG_JWT_KEY_CLAIM_NAME",
    expirationMinutes: "JWT_EXPIRATION_MINUTES",
  },
  kong: {
    mode: "KONG_MODE",
    adminUrl: "KONG_ADMIN_URL",
    adminToken: "KONG_ADMIN_TOKEN",
    highAvailability: "HIGH_AVAILABILITY",
    circuitBreakerEnabled: "CIRCUIT_BREAKER_ENABLED",
    circuitBreakerTimeout: "CIRCUIT_BREAKER_TIMEOUT",
    circuitBreakerErrorThreshold: "CIRCUIT_BREAKER_ERROR_THRESHOLD",
    circuitBreakerResetTimeout: "CIRCUIT_BREAKER_RESET_TIMEOUT",
    circuitBreakerVolumeThreshold: "CIRCUIT_BREAKER_VOLUME_THRESHOLD",
    circuitBreakerRollingCountTimeout: "CIRCUIT_BREAKER_ROLLING_COUNT_TIMEOUT",
    circuitBreakerRollingCountBuckets: "CIRCUIT_BREAKER_ROLLING_COUNT_BUCKETS",
  },
  caching: {
    highAvailability: "HIGH_AVAILABILITY",
    redisUrl: "REDIS_URL",
    redisPassword: "REDIS_PASSWORD",
    redisDb: "REDIS_DB",
    staleDataToleranceMinutes: "STALE_DATA_TOLERANCE_MINUTES",
  },
  telemetry: {
    serviceName: "OTEL_SERVICE_NAME",
    serviceVersion: "OTEL_SERVICE_VERSION",
    environment: "NODE_ENV",
    mode: "TELEMETRY_MODE",
    logLevel: "LOG_LEVEL",
    endpoint: "OTEL_EXPORTER_OTLP_ENDPOINT",
    logsEndpoint: "OTEL_EXPORTER_OTLP_LOGS_ENDPOINT",
    tracesEndpoint: "OTEL_EXPORTER_OTLP_TRACES_ENDPOINT",
    metricsEndpoint: "OTEL_EXPORTER_OTLP_METRICS_ENDPOINT",
    exportTimeout: "OTEL_EXPORTER_OTLP_TIMEOUT",
    batchSize: "OTEL_BSP_MAX_EXPORT_BATCH_SIZE",
    maxQueueSize: "OTEL_BSP_MAX_QUEUE_SIZE",
  },
  profiling: {
    enabled: "PROFILING_ENABLED",
  },
  apiInfo: {
    title: "API_TITLE",
    description: "API_DESCRIPTION",
    version: "API_VERSION",
    contactName: "API_CONTACT_NAME",
    contactEmail: "API_CONTACT_EMAIL",
    licenseName: "API_LICENSE_NAME",
    licenseIdentifier: "API_LICENSE_IDENTIFIER",
    cors: "API_CORS",
  },
} as const;

// Pillar 1: Default Configuration Object
const defaultConfig: AppConfig = {
  server: {
    port: 3000,
    nodeEnv: "development",
  },
  jwt: {
    authority: "https://api.example.com",
    audience: "example-api",
    issuer: "https://api.example.com",
    keyClaimName: "key",
    expirationMinutes: 15,
  },
  kong: {
    mode: "API_GATEWAY",
    adminUrl: "http://localhost:8001",
    adminToken: "example-token",
    consumerIdHeader: "x-consumer-id",
    consumerUsernameHeader: "x-consumer-username",
    anonymousHeader: "x-anonymous-consumer",
    circuitBreaker: {
      enabled: true,
      timeout: 5000,
      errorThresholdPercentage: 50,
      resetTimeout: 60000,
      rollingCountTimeout: 10000,
      rollingCountBuckets: 10,
      volumeThreshold: 3,
    },
  },
  caching: {
    highAvailability: false,
    redisUrl: "",
    redisPassword: "",
    redisDb: 0,
    ttlSeconds: 300,
    staleDataToleranceMinutes: 30,
  },
  telemetry: {
    serviceName: pkg.name || "authentication-service",
    serviceVersion: pkg.version || "1.0.0",
    environment: "development",
    mode: "both",
    logLevel: "info",
    logsEndpoint: "",
    tracesEndpoint: "",
    metricsEndpoint: "",
    exportTimeout: 30000,
    batchSize: 2048,
    maxQueueSize: 10000,
    enableOpenTelemetry: true,
    enabled: true,
    infrastructure: {
      isKubernetes: false,
      isEcs: false,
      podName: undefined,
      namespace: undefined,
    },
  },
  profiling: {
    enabled: false,
  },
  apiInfo: {
    title: pkg.name || "Authentication Service API",
    description:
      pkg.description ||
      "High-performance authentication service with Kong integration, OpenTelemetry observability, and comprehensive health monitoring",
    version: pkg.version || "1.0.0",
    contactName: pkg.author || "Simon Owusu",
    contactEmail: "simonowusu@pvh.com",
    licenseName: "Proprietary",
    licenseIdentifier: pkg.license || "UNLICENSED",
    cors: "*",
  },
  apiVersioning: {
    supportedVersions: ["v1", "v2"],
    defaultVersion: "v1",
    latestVersion: "v2",
    deprecationPolicy: {
      enabled: false,
      warningHeader: true,
      gracePeriodDays: 90,
    },
    strategy: "header" as const,
    headers: {
      versionHeader: "Accept-Version",
      responseHeader: "API-Version",
      supportedHeader: "Supported-Versions",
    },
  },

  // API v2 Configuration (always enabled - v2 IS the enhanced version)
  apiV2: {
    securityHeaders: {
      enabled: true,
      hstsMaxAge: 31536000, // 1 year
      hstsIncludeSubdomains: true,
      hstsPreload: true,
      cspPolicy: "default-src 'self'; script-src 'none'; object-src 'none'",
      frameOptions: "DENY" as const,
      contentTypeOptions: true,
      xssProtection: true,
      referrerPolicy: "strict-origin-when-cross-origin" as const,
      permissionsPolicy: "geolocation=(), microphone=(), camera=(), payment=(), usb=()",
    },
    auditLogging: {
      enabled: true,
      level: "detailed" as const,
      retentionDays: 90,
      includeClientInfo: true,
      anonymizeIp: true,
      includePii: false,
      correlationIdHeader: "X-Audit-ID",
      securityEventThresholds: {
        authFailureCount: 5,
        anomalyDetection: true,
        suspiciousPatterns: true,
      },
    },
  },
};

// Infrastructure Detection Helper (4-Pillar Compliant)
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

// Pillar 3: Type-Safe Environment Configuration Loading
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

// Pillar 4: Configuration Initialization with Default Merging
function initializeConfig(): AppConfig {
  const envConfig = loadConfigFromEnv();

  // Convert environment config to structured format for merging (simplified with proper filtering)
  const structuredEnvConfig = {
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
    apiVersioning: Object.fromEntries(
      Object.entries({
        supportedVersions: envConfig.API_VERSIONING_SUPPORTED_VERSIONS
          ? envConfig.API_VERSIONING_SUPPORTED_VERSIONS.split(",").map((v) => v.trim())
          : undefined,
        defaultVersion: envConfig.API_VERSIONING_DEFAULT_VERSION,
        latestVersion: envConfig.API_VERSIONING_LATEST_VERSION,
        strategy: envConfig.API_VERSIONING_STRATEGY,
        deprecationPolicy: envConfig.API_VERSIONING_DEPRECATION_ENABLED
          ? {
              enabled: toBool(envConfig.API_VERSIONING_DEPRECATION_ENABLED, false),
              warningHeader: toBool(envConfig.API_VERSIONING_DEPRECATION_WARNING_HEADER, true),
              gracePeriodDays: envConfig.API_VERSIONING_DEPRECATION_GRACE_PERIOD_DAYS,
            }
          : undefined,
      }).filter(([, value]) => value !== undefined)
    ),

    // API v2 Configuration from Environment Variables
    apiV2: Object.fromEntries(
      Object.entries({
        securityHeaders: Object.fromEntries(
          Object.entries({
            enabled: envConfig.API_V2_SECURITY_HEADERS_ENABLED
              ? toBool(envConfig.API_V2_SECURITY_HEADERS_ENABLED, false)
              : undefined,
            hstsMaxAge: envConfig.API_V2_SECURITY_HSTS_MAX_AGE,
            hstsIncludeSubdomains: envConfig.API_V2_SECURITY_HSTS_INCLUDE_SUBDOMAINS
              ? toBool(envConfig.API_V2_SECURITY_HSTS_INCLUDE_SUBDOMAINS, true)
              : undefined,
            hstsPreload: envConfig.API_V2_SECURITY_HSTS_PRELOAD
              ? toBool(envConfig.API_V2_SECURITY_HSTS_PRELOAD, true)
              : undefined,
            cspPolicy: envConfig.API_V2_SECURITY_CSP_POLICY,
            frameOptions: envConfig.API_V2_SECURITY_FRAME_OPTIONS,
            contentTypeOptions: envConfig.API_V2_SECURITY_CONTENT_TYPE_OPTIONS
              ? toBool(envConfig.API_V2_SECURITY_CONTENT_TYPE_OPTIONS, true)
              : undefined,
            xssProtection: envConfig.API_V2_SECURITY_XSS_PROTECTION
              ? toBool(envConfig.API_V2_SECURITY_XSS_PROTECTION, true)
              : undefined,
            referrerPolicy: envConfig.API_V2_SECURITY_REFERRER_POLICY,
            permissionsPolicy: envConfig.API_V2_SECURITY_PERMISSIONS_POLICY,
          }).filter(([, value]) => value !== undefined)
        ),
        auditLogging: Object.fromEntries(
          Object.entries({
            enabled: envConfig.API_V2_AUDIT_LOGGING_ENABLED
              ? toBool(envConfig.API_V2_AUDIT_LOGGING_ENABLED, false)
              : undefined,
            level: envConfig.API_V2_AUDIT_LEVEL,
            retentionDays: envConfig.API_V2_AUDIT_RETENTION_DAYS,
            includeClientInfo: envConfig.API_V2_AUDIT_INCLUDE_CLIENT_INFO
              ? toBool(envConfig.API_V2_AUDIT_INCLUDE_CLIENT_INFO, true)
              : undefined,
            anonymizeIp: envConfig.API_V2_AUDIT_ANONYMIZE_IP
              ? toBool(envConfig.API_V2_AUDIT_ANONYMIZE_IP, true)
              : undefined,
            includePii: envConfig.API_V2_AUDIT_INCLUDE_PII
              ? toBool(envConfig.API_V2_AUDIT_INCLUDE_PII, false)
              : undefined,
            correlationIdHeader: envConfig.API_V2_AUDIT_CORRELATION_ID_HEADER,
            securityEventThresholds: Object.fromEntries(
              Object.entries({
                authFailureCount: envConfig.API_V2_AUDIT_AUTH_FAILURE_THRESHOLD,
                anomalyDetection: envConfig.API_V2_AUDIT_ANOMALY_DETECTION
                  ? toBool(envConfig.API_V2_AUDIT_ANOMALY_DETECTION, true)
                  : undefined,
                suspiciousPatterns: envConfig.API_V2_AUDIT_SUSPICIOUS_PATTERNS
                  ? toBool(envConfig.API_V2_AUDIT_SUSPICIOUS_PATTERNS, true)
                  : undefined,
              }).filter(([, value]) => value !== undefined)
            ),
          }).filter(([, value]) => value !== undefined)
        ),
      }).filter(([, value]) => value !== undefined && Object.keys(value).length > 0)
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
        ...("circuitBreaker" in structuredEnvConfig.kong
          ? structuredEnvConfig.kong.circuitBreaker
          : {}),
      },
    },
    caching: { ...defaultConfig.caching, ...structuredEnvConfig.caching },
    telemetry: {
      ...defaultConfig.telemetry,
      ...structuredEnvConfig.telemetry,
      // Handle derived OTLP endpoints
      logsEndpoint: deriveOtlpEndpoint(
        "endpoint" in structuredEnvConfig.telemetry
          ? (structuredEnvConfig.telemetry.endpoint as string | undefined)
          : undefined,
        envConfig.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT,
        "/v1/logs"
      ),
      tracesEndpoint: deriveOtlpEndpoint(
        "endpoint" in structuredEnvConfig.telemetry
          ? (structuredEnvConfig.telemetry.endpoint as string | undefined)
          : undefined,
        envConfig.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
        "/v1/traces"
      ),
      metricsEndpoint: deriveOtlpEndpoint(
        "endpoint" in structuredEnvConfig.telemetry
          ? (structuredEnvConfig.telemetry.endpoint as string | undefined)
          : undefined,
        envConfig.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT,
        "/v1/metrics"
      ),
      // Handle computed properties - ensure boolean values
      enabled:
        (("mode" in structuredEnvConfig.telemetry
          ? structuredEnvConfig.telemetry.mode
          : defaultConfig.telemetry.mode) as string) !== "console",
      enableOpenTelemetry:
        (("mode" in structuredEnvConfig.telemetry
          ? structuredEnvConfig.telemetry.mode
          : defaultConfig.telemetry.mode) as string) !== "console",
    },
    profiling: { ...defaultConfig.profiling, ...structuredEnvConfig.profiling },
    apiInfo: { ...defaultConfig.apiInfo, ...structuredEnvConfig.apiInfo },
    apiVersioning: { ...defaultConfig.apiVersioning, ...structuredEnvConfig.apiVersioning },
    apiV2: {
      securityHeaders: {
        enabled: true,
        hstsMaxAge: 31536000,
        hstsIncludeSubdomains: true,
        hstsPreload: true,
        cspPolicy: "default-src 'self'; script-src 'none'; object-src 'none'",
        frameOptions: "DENY" as const,
        contentTypeOptions: true,
        xssProtection: true,
        referrerPolicy: "strict-origin-when-cross-origin" as const,
        permissionsPolicy: "geolocation=(), microphone=(), camera=(), payment=(), usb=()",
      },
      auditLogging: {
        enabled: true,
        level: "detailed" as const,
        retentionDays: 90,
        includeClientInfo: true,
        anonymizeIp: true,
        includePii: false,
        correlationIdHeader: "X-Request-Security-ID",
        securityEventThresholds: {
          authFailureCount: 5,
          suspiciousPatterns: true,
          anomalyDetection: true,
        },
      },
    },
  };

  // Check validation cache first for performance
  const cached = _validationCache.get(mergedConfig);
  if (cached) {
    return cached;
  }

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
    { key: "KONG_ADMIN_TOKEN", value: mergedConfig.kong.adminToken },
  ];

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

  // Cache the validated configuration for future use
  _validationCache.set(mergedConfig, finalConfig);

  return finalConfig;
}

// Performance optimization caches
let _validationCache = new WeakMap<object, AppConfig>();
let cachedConfig: AppConfig | null = null;

function getConfig(): AppConfig {
  if (!cachedConfig) {
    cachedConfig = initializeConfig();
  }
  return cachedConfig;
}

// Reset cache for testing purposes
export function resetConfigCache(): void {
  cachedConfig = null;
  _config = null;
  _validationCache = new WeakMap();
}

// Export config - lazy initialization to support testing
let _config: AppConfig | null = null;
export const config = new Proxy({} as AppConfig, {
  get(_target, prop) {
    if (!_config) {
      _config = getConfig();
    }
    return _config[prop as keyof AppConfig];
  },
});

// Runtime Configuration Health Validation
export function validateConfigurationHealth(): {
  status: "healthy" | "degraded" | "critical";
  issues: {
    path: string;
    message: string;
    severity: "critical" | "warning" | "info";
  }[];
  recommendations: string[];
} {
  const health = {
    status: "healthy" as "healthy" | "degraded" | "critical",
    issues: [] as {
      path: string;
      message: string;
      severity: "critical" | "warning" | "info";
    }[],
    recommendations: [] as string[],
  };

  // Runtime-specific health checks (not covered by schema validation)
  if (config.telemetry.batchSize > 3000) {
    health.recommendations.push("Consider reducing telemetry batch size for better memory usage");
  }

  if (config.telemetry.exportTimeout > 45000) {
    health.recommendations.push(
      "Export timeout is very high, consider reducing for better responsiveness"
    );
  }

  // Performance recommendations
  if (config.telemetry.maxQueueSize > 30000) {
    health.recommendations.push("Large telemetry queue size may impact memory usage");
  }

  // Deployment environment checks
  if (config.telemetry.environment === "production" && config.telemetry.mode === "console") {
    health.issues.push({
      path: "telemetry.mode",
      message: "Console-only telemetry mode in production may impact observability",
      severity: "warning",
    });
    if (health.status === "healthy") health.status = "degraded";
  }

  return health;
}

export function loadConfig(): AppConfig {
  return getConfig();
}

export { SchemaRegistry };
export type {
  AppConfig,
  ServerConfig,
  JwtConfig,
  KongConfig,
  CachingConfig,
  TelemetryConfig,
  ProfilingConfig,
  ApiInfoConfig,
};

// Getter functions for component configurations
export const getServerConfig = () => getConfig().server;
export const getJwtConfig = () => getConfig().jwt;
export const getKongConfig = () => getConfig().kong;
export const getCachingConfig = () => getConfig().caching;
export const getTelemetryConfig = () => getConfig().telemetry;
export const getProfilingConfig = () => getConfig().profiling;
export const getApiInfoConfig = () => getConfig().apiInfo;
export const getApiVersioningConfig = () => getConfig().apiVersioning;
export const getApiV2Config = () => getConfig().apiV2;

// Legacy exports (use getter functions in new code) - Now lazy for testing compatibility
export const serverConfig = new Proxy({} as ServerConfig, {
  get(_target, prop) {
    return getConfig().server[prop as keyof ServerConfig];
  },
});
export const jwtConfig = new Proxy({} as JwtConfig, {
  get(_target, prop) {
    return getConfig().jwt[prop as keyof JwtConfig];
  },
});
export const kongConfig = new Proxy({} as KongConfig, {
  get(_target, prop) {
    return getConfig().kong[prop as keyof KongConfig];
  },
});
export const telemetryConfig = new Proxy({} as TelemetryConfig, {
  get(_target, prop) {
    return getConfig().telemetry[prop as keyof TelemetryConfig];
  },
});
export const cachingConfig = new Proxy({} as CachingConfig, {
  get(_target, prop) {
    return getConfig().caching[prop as keyof CachingConfig];
  },
});
export const profilingConfig = new Proxy({} as ProfilingConfig, {
  get(_target, prop) {
    return getConfig().profiling[prop as keyof ProfilingConfig];
  },
});
export const apiInfoConfig = new Proxy({} as ApiInfoConfig, {
  get(_target, prop) {
    return getConfig().apiInfo[prop as keyof ApiInfoConfig];
  },
});

export const configMetadata = {
  version: "3.1.0",
  get loadedAt() {
    return new Date().toISOString();
  },
  get environment() {
    return getConfig().telemetry.environment;
  },
  get serviceName() {
    return getConfig().telemetry.serviceName;
  },
  get serviceVersion() {
    return getConfig().telemetry.serviceVersion;
  },
  pattern: "4-pillar",
  zodVersion: "v4",
  optimizations: ["type-only-imports", "schema-memoization", "enhanced-errors"],
  performance: {
    cacheEnabled: true,
    lazyInitialization: true,
    proxyPattern: true,
  },
  get envVarMapping() {
    return envVarMapping;
  },
};

export const getConfigJSONSchema = () => AppConfigSchema;
export const validateConfiguration = (data: unknown) => {
  const result = AppConfigSchema.safeParse(data);
  if (!result.success) {
    throw new Error(JSON.stringify(result.error.issues, null, 2));
  }
  return result.data;
};
