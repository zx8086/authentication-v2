/* src/config/config.ts */

import { z } from "zod";
import pkg from "../../package.json" with { type: "json" };
import { deriveOtlpEndpoint } from "./helpers";
import {
  type ApiInfoConfig,
  type AppConfig,
  AppConfigSchema,
  addProductionSecurityValidation,
  EmailAddress,
  EnvironmentType,
  HttpsUrl,
  type JwtConfig,
  type KongConfig,
  KongMode,
  NonEmptyString,
  PositiveInt,
  SchemaRegistry,
  type ServerConfig,
  type TelemetryConfig,
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
  },
  telemetry: {
    serviceName: "OTEL_SERVICE_NAME",
    serviceVersion: "OTEL_SERVICE_VERSION",
    environment: "NODE_ENV",
    mode: "TELEMETRY_MODE",
    endpoint: "OTEL_EXPORTER_OTLP_ENDPOINT",
    logsEndpoint: "OTEL_EXPORTER_OTLP_LOGS_ENDPOINT",
    tracesEndpoint: "OTEL_EXPORTER_OTLP_TRACES_ENDPOINT",
    metricsEndpoint: "OTEL_EXPORTER_OTLP_METRICS_ENDPOINT",
    exportTimeout: "OTEL_EXPORTER_OTLP_TIMEOUT",
    batchSize: "OTEL_BSP_MAX_EXPORT_BATCH_SIZE",
    maxQueueSize: "OTEL_BSP_MAX_QUEUE_SIZE",
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
    authority: "",
    audience: "",
    issuer: "",
    keyClaimName: "key",
    expirationMinutes: 15,
  },
  kong: {
    mode: "API_GATEWAY",
    adminUrl: "",
    adminToken: "",
    consumerIdHeader: "x-consumer-id",
    consumerUsernameHeader: "x-consumer-username",
    anonymousHeader: "x-anonymous-consumer",
  },
  telemetry: {
    serviceName: pkg.name || "authentication-service",
    serviceVersion: pkg.version || "1.0.0",
    environment: "development",
    mode: "both",
    logsEndpoint: "",
    tracesEndpoint: "",
    metricsEndpoint: "",
    exportTimeout: 30000,
    batchSize: 2048,
    maxQueueSize: 10000,
    enableOpenTelemetry: true,
    enabled: true,
  } as any,
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
};

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
      `Invalid environment configuration:\n${issues}\n\nPlease check your environment variables.`
    );
  }

  return result.data;
}

// Pillar 4: Configuration Initialization with Default Merging
function initializeConfig(): AppConfig {
  const envConfig = loadConfigFromEnv();

  // Convert environment config to structured format for merging
  const structuredEnvConfig = {
    server: {
      ...(envConfig.PORT !== undefined && { port: envConfig.PORT }),
      ...(envConfig.NODE_ENV !== undefined && { nodeEnv: envConfig.NODE_ENV }),
    },
    jwt: {
      ...(envConfig.KONG_JWT_AUTHORITY !== undefined && {
        authority: envConfig.KONG_JWT_AUTHORITY,
      }),
      ...(envConfig.KONG_JWT_AUDIENCE !== undefined && { audience: envConfig.KONG_JWT_AUDIENCE }),
      ...(envConfig.KONG_JWT_ISSUER !== undefined && { issuer: envConfig.KONG_JWT_ISSUER }),
      ...(envConfig.KONG_JWT_KEY_CLAIM_NAME !== undefined && {
        keyClaimName: envConfig.KONG_JWT_KEY_CLAIM_NAME,
      }),
      ...(envConfig.JWT_EXPIRATION_MINUTES !== undefined && {
        expirationMinutes: envConfig.JWT_EXPIRATION_MINUTES,
      }),
    },
    kong: {
      ...(envConfig.KONG_MODE !== undefined && { mode: envConfig.KONG_MODE }),
      ...(envConfig.KONG_ADMIN_URL !== undefined && { adminUrl: envConfig.KONG_ADMIN_URL }),
      ...(envConfig.KONG_ADMIN_TOKEN !== undefined && { adminToken: envConfig.KONG_ADMIN_TOKEN }),
    },
    telemetry: {
      ...(envConfig.OTEL_SERVICE_NAME !== undefined && {
        serviceName: envConfig.OTEL_SERVICE_NAME,
      }),
      ...(envConfig.OTEL_SERVICE_VERSION !== undefined && {
        serviceVersion: envConfig.OTEL_SERVICE_VERSION,
      }),
      ...(envConfig.NODE_ENV !== undefined && { environment: envConfig.NODE_ENV }),
      ...(envConfig.TELEMETRY_MODE !== undefined && { mode: envConfig.TELEMETRY_MODE }),
      ...(envConfig.OTEL_EXPORTER_OTLP_ENDPOINT !== undefined && {
        endpoint: envConfig.OTEL_EXPORTER_OTLP_ENDPOINT,
      }),
      ...(envConfig.OTEL_EXPORTER_OTLP_TIMEOUT !== undefined && {
        exportTimeout: envConfig.OTEL_EXPORTER_OTLP_TIMEOUT,
      }),
      ...(envConfig.OTEL_BSP_MAX_EXPORT_BATCH_SIZE !== undefined && {
        batchSize: envConfig.OTEL_BSP_MAX_EXPORT_BATCH_SIZE,
      }),
      ...(envConfig.OTEL_BSP_MAX_QUEUE_SIZE !== undefined && {
        maxQueueSize: envConfig.OTEL_BSP_MAX_QUEUE_SIZE,
      }),
    },
    apiInfo: {
      ...(envConfig.API_TITLE !== undefined && { title: envConfig.API_TITLE }),
      ...(envConfig.API_DESCRIPTION !== undefined && { description: envConfig.API_DESCRIPTION }),
      ...(envConfig.API_VERSION !== undefined && { version: envConfig.API_VERSION }),
      ...(envConfig.API_CONTACT_NAME !== undefined && {
        contactName: envConfig.API_CONTACT_NAME,
      }),
      ...(envConfig.API_CONTACT_EMAIL !== undefined && {
        contactEmail: envConfig.API_CONTACT_EMAIL,
      }),
      ...(envConfig.API_LICENSE_NAME !== undefined && {
        licenseName: envConfig.API_LICENSE_NAME,
      }),
      ...(envConfig.API_LICENSE_IDENTIFIER !== undefined && {
        licenseIdentifier: envConfig.API_LICENSE_IDENTIFIER,
      }),
      ...(envConfig.API_CORS !== undefined && { cors: envConfig.API_CORS }),
    },
  };

  // Merge environment variables with defaults using object spreading (original 4-pillar pattern)
  const mergedConfig: AppConfig = {
    server: { ...defaultConfig.server, ...structuredEnvConfig.server },
    jwt: {
      ...defaultConfig.jwt,
      ...structuredEnvConfig.jwt,
      // Special handling for issuer fallback to authority
      issuer:
        structuredEnvConfig.jwt.issuer ||
        structuredEnvConfig.jwt.authority ||
        defaultConfig.jwt.issuer,
    },
    kong: { ...defaultConfig.kong, ...structuredEnvConfig.kong },
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
      `Invalid configuration after merging:\n${issues}\n\nPlease check your environment variables.`
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
    throw new Error(`Missing required environment variables: ${missing}`);
  }

  return mergedConfig;
}

// Lazy initialization cache
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
export type { AppConfig, ServerConfig, JwtConfig, KongConfig, TelemetryConfig, ApiInfoConfig };

// Getter functions for component configurations
export const getServerConfig = () => getConfig().server;
export const getJwtConfig = () => getConfig().jwt;
export const getKongConfig = () => getConfig().kong;
export const getTelemetryConfig = () => getConfig().telemetry;
export const getApiInfoConfig = () => getConfig().apiInfo;

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
export const apiInfoConfig = new Proxy({} as ApiInfoConfig, {
  get(_target, prop) {
    return getConfig().apiInfo[prop as keyof ApiInfoConfig];
  },
});

export const configMetadata = {
  version: "3.0.0",
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
