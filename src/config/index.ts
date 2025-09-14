/* src/config/index.ts */

import { z } from "zod";
import pkg from "../../package.json" with { type: "json" };

const ServerConfigSchema = z.object({
  port: z.number().min(1).max(65535),
  nodeEnv: z.string().min(1),
});

const JwtConfigSchema = z.object({
  authority: z.string().min(1),
  audience: z.string().min(1),
  keyClaimName: z.string().min(1),
  expirationMinutes: z.number().min(1),
});

const KongConfigSchema = z.object({
  adminUrl: z.url(),
  adminToken: z.string().min(1),
  consumerIdHeader: z.string().min(1),
  consumerUsernameHeader: z.string().min(1),
  anonymousHeader: z.string().min(1),
});

const TelemetryConfigSchema = z
  .object({
    enabled: z.boolean(),
    serviceName: z.string().min(1).describe("Service identifier for telemetry"),
    serviceVersion: z.string().min(1).describe("Service version for telemetry"),
    environment: z
      .enum(["development", "staging", "production"])
      .describe("Deployment environment"),
    mode: z.enum(["console", "otlp", "both"]),

    endpoint: z.url().optional(),
    logsEndpoint: z.url().optional(),
    tracesEndpoint: z.url().optional(),
    metricsEndpoint: z.url().optional(),

    exportTimeout: z.int32().min(1000).max(60000),
    batchSize: z.int32().min(1).max(5000),
    maxQueueSize: z.int32().min(1).max(50000),
  })
  .superRefine((data, ctx) => {
    if (data.environment === "production") {
      if (data.serviceName.includes("localhost") || data.serviceName.includes("test")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Production service name cannot contain localhost or test references",
          path: ["serviceName"],
        });
      }
      if (data.serviceVersion === "dev" || data.serviceVersion === "latest") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Production requires specific version, not dev or latest",
          path: ["serviceVersion"],
        });
      }
    }
  });

const AppConfigSchema = z.object({
  server: ServerConfigSchema,
  jwt: JwtConfigSchema,
  kong: KongConfigSchema,
  telemetry: TelemetryConfigSchema,
});

export type AppConfig = z.infer<typeof AppConfigSchema> & {
  telemetry: z.infer<typeof TelemetryConfigSchema> & {
    enableOpenTelemetry: boolean;
  };
};

// Production-ready default configuration
const defaultConfig: AppConfig = {
  server: {
    port: 3000,
    nodeEnv: "development",
  },
  jwt: {
    authority: "",
    audience: "",
    keyClaimName: "key",
    expirationMinutes: 15,
  },
  kong: {
    adminUrl: "",
    adminToken: "",
    consumerIdHeader: "x-consumer-id",
    consumerUsernameHeader: "x-consumer-username",
    anonymousHeader: "x-anonymous-consumer",
  },
  telemetry: {
    enabled: false, // Disabled by default - enable via TELEMETRY_ENABLED=true
    serviceName: pkg.name || "authentication-service",
    serviceVersion: pkg.version || "1.0.0",
    environment: "development",
    mode: "console", // Safe default - only console logging until explicitly configured
    logsEndpoint: "", // Must be set via environment variables
    tracesEndpoint: "", // Must be set via environment variables
    metricsEndpoint: "", // Must be set via environment variables
    exportTimeout: 30000,
    batchSize: 2048,
    maxQueueSize: 10000,
    // No sampling config - using 100% sampling, letting collector handle it
    enableOpenTelemetry: false, // Computed property - will be overridden
  } as any,
};

// Environment variable mapping with OpenTelemetry standard support
const envVarMapping = {
  server: {
    port: "PORT",
    nodeEnv: "NODE_ENV",
  },
  jwt: {
    authority: "JWT_AUTHORITY",
    audience: "JWT_AUDIENCE",
    keyClaimName: "JWT_KEY_CLAIM_NAME",
    expirationMinutes: "JWT_EXPIRATION_MINUTES",
  },
  kong: {
    adminUrl: "KONG_ADMIN_URL",
    adminToken: "KONG_ADMIN_TOKEN",
  },
  telemetry: {
    enabled: "TELEMETRY_ENABLED",
    // Use standard OpenTelemetry environment variables as primary
    serviceName: "OTEL_SERVICE_NAME",
    serviceVersion: "OTEL_SERVICE_VERSION",
    environment: "NODE_ENV", // Standard Node.js convention
    mode: "TELEMETRY_MODE", // Custom variable for our specific needs
    endpoint: "OTEL_EXPORTER_OTLP_ENDPOINT", // Base endpoint
    logsEndpoint: "OTEL_EXPORTER_OTLP_LOGS_ENDPOINT",
    tracesEndpoint: "OTEL_EXPORTER_OTLP_TRACES_ENDPOINT",
    metricsEndpoint: "OTEL_EXPORTER_OTLP_METRICS_ENDPOINT",
    exportTimeout: "OTEL_EXPORTER_OTLP_TIMEOUT",
    batchSize: "OTEL_BSP_MAX_EXPORT_BATCH_SIZE",
    maxQueueSize: "OTEL_BSP_MAX_QUEUE_SIZE",
    // No sampling env vars - using 100% sampling
  },
} as const;

// Enhanced environment variable parsing with Zod v4 validation
function parseEnvVar(
  value: string | undefined,
  type: "string" | "number" | "boolean" | "url" | "email",
  fallback?: unknown
): unknown {
  if (value === undefined) return fallback;

  try {
    switch (type) {
      case "number": {
        const num = Number(value);
        if (Number.isNaN(num)) throw new Error(`Invalid number: ${value}`);
        return num;
      }
      case "boolean":
        return z.stringbool().parse(value);
      case "url":
        return z.url().parse(value);
      case "email":
        return z.email().parse(value);
      default:
        return value;
    }
  } catch (error) {
    console.warn(`Failed to parse environment variable "${value}" as ${type}:`, error);
    return fallback;
  }
}

// Manual configuration loading with proper default setup and environment overrides
function loadConfigFromEnv(): Partial<AppConfig> {
  const config: Partial<AppConfig> = {};

  // Load server config with fallbacks
  config.server = {
    port: parseEnvVar(
      Bun.env[envVarMapping.server.port],
      "number",
      defaultConfig.server.port
    ) as number,
    nodeEnv: parseEnvVar(
      Bun.env[envVarMapping.server.nodeEnv],
      "string",
      defaultConfig.server.nodeEnv
    ) as string,
  };

  // Load JWT config with fallbacks
  config.jwt = {
    authority: parseEnvVar(
      Bun.env[envVarMapping.jwt.authority],
      "string",
      defaultConfig.jwt.authority
    ) as string,
    audience: parseEnvVar(
      Bun.env[envVarMapping.jwt.audience],
      "string",
      defaultConfig.jwt.audience
    ) as string,
    keyClaimName: parseEnvVar(
      Bun.env[envVarMapping.jwt.keyClaimName],
      "string",
      defaultConfig.jwt.keyClaimName
    ) as string,
    expirationMinutes: parseEnvVar(
      Bun.env[envVarMapping.jwt.expirationMinutes],
      "number",
      defaultConfig.jwt.expirationMinutes
    ) as number,
  };

  // Load Kong config with fallbacks
  config.kong = {
    adminUrl: parseEnvVar(
      Bun.env[envVarMapping.kong.adminUrl],
      "string",
      defaultConfig.kong.adminUrl
    ) as string,
    adminToken: parseEnvVar(
      Bun.env[envVarMapping.kong.adminToken],
      "string",
      defaultConfig.kong.adminToken
    ) as string,
    consumerIdHeader: defaultConfig.kong.consumerIdHeader,
    consumerUsernameHeader: defaultConfig.kong.consumerUsernameHeader,
    anonymousHeader: defaultConfig.kong.anonymousHeader,
  };

  // Load Telemetry config with proper fallback chain and OpenTelemetry standard support
  const baseEndpoint = parseEnvVar(Bun.env[envVarMapping.telemetry.endpoint], "string") as string;

  config.telemetry = {
    enabled: parseEnvVar(
      Bun.env[envVarMapping.telemetry.enabled],
      "boolean",
      defaultConfig.telemetry.enabled
    ) as boolean,

    // Use standard OpenTelemetry environment variables
    serviceName: parseEnvVar(
      Bun.env[envVarMapping.telemetry.serviceName],
      "string",
      defaultConfig.telemetry.serviceName
    ) as string,

    serviceVersion: parseEnvVar(
      Bun.env[envVarMapping.telemetry.serviceVersion],
      "string",
      defaultConfig.telemetry.serviceVersion
    ) as string,

    environment: parseEnvVar(
      Bun.env[envVarMapping.telemetry.environment],
      "string",
      config.server?.nodeEnv || defaultConfig.telemetry.environment
    ) as "development" | "staging" | "production",

    mode: parseEnvVar(
      Bun.env[envVarMapping.telemetry.mode],
      "string",
      defaultConfig.telemetry.mode
    ) as "console" | "otlp" | "both",

    // OTLP endpoint handling - only parse if values exist (for console mode compatibility)
    logsEndpoint: parseEnvVar(
      Bun.env[envVarMapping.telemetry.logsEndpoint] ||
        (baseEndpoint ? `${baseEndpoint}/v1/logs` : undefined),
      "string",
      undefined // Don't provide fallback for console mode
    ) as string | undefined,

    tracesEndpoint: parseEnvVar(
      Bun.env[envVarMapping.telemetry.tracesEndpoint] ||
        (baseEndpoint ? `${baseEndpoint}/v1/traces` : undefined),
      "string",
      undefined // Don't provide fallback for console mode
    ) as string | undefined,

    metricsEndpoint: parseEnvVar(
      Bun.env[envVarMapping.telemetry.metricsEndpoint] ||
        (baseEndpoint ? `${baseEndpoint}/v1/metrics` : undefined),
      "string",
      undefined // Don't provide fallback for console mode
    ) as string | undefined,

    // Standard OpenTelemetry configuration
    exportTimeout: parseEnvVar(
      Bun.env[envVarMapping.telemetry.exportTimeout],
      "number",
      defaultConfig.telemetry.exportTimeout
    ) as number,

    batchSize: parseEnvVar(
      Bun.env[envVarMapping.telemetry.batchSize],
      "number",
      defaultConfig.telemetry.batchSize
    ) as number,

    maxQueueSize: parseEnvVar(
      Bun.env[envVarMapping.telemetry.maxQueueSize],
      "number",
      defaultConfig.telemetry.maxQueueSize
    ) as number,

    // No sampling config - using 100% sampling, letting collector handle it

    // OpenTelemetry is enabled when mode is 'otlp' or 'both'
    enableOpenTelemetry: false, // Will be computed later based on mode
  } as any;

  return config;
}

let config: AppConfig;

try {
  // Merge default config with environment variables (proper precedence: defaults < environment)
  const envConfig = loadConfigFromEnv();
  const mergedConfig = {
    server: { ...defaultConfig.server, ...envConfig.server },
    jwt: { ...defaultConfig.jwt, ...envConfig.jwt },
    kong: { ...defaultConfig.kong, ...envConfig.kong },
    telemetry: { ...defaultConfig.telemetry, ...envConfig.telemetry },
  };

  // Validate merged configuration against schemas
  const validatedConfig = AppConfigSchema.parse(mergedConfig);

  // Add computed properties
  config = {
    ...validatedConfig,
    telemetry: {
      ...validatedConfig.telemetry,
      // OpenTelemetry is enabled when mode is 'otlp' or 'both', regardless of enabled flag
      enableOpenTelemetry: validatedConfig.telemetry.mode !== "console",
    },
  };

  // Check required variables
  const requiredVars = [
    { key: "JWT_AUTHORITY", value: config.jwt.authority },
    { key: "JWT_AUDIENCE", value: config.jwt.audience },
    { key: "KONG_ADMIN_URL", value: config.kong.adminUrl },
    { key: "KONG_ADMIN_TOKEN", value: config.kong.adminToken },
  ];

  const missingVars = requiredVars.filter(({ value }) => !value || value.trim() === "");

  if (missingVars.length > 0) {
    const missing = missingVars.map(({ key }) => key).join(", ");
    throw new Error(`Missing required environment variables: ${missing}`);
  }
} catch (error) {
  if (error instanceof z.ZodError) {
    const issues = error.issues
      .map((issue) => {
        const path = issue.path.join(".");
        return `  - ${path}: ${issue.message}`;
      })
      .join("\n");

    throw new Error(`Configuration validation failed:\n${issues}`);
  }

  throw error;
}

export function loadConfig(): AppConfig {
  return config;
}

// Configuration health monitoring
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

  // Critical security checks for production
  if (config.telemetry.environment === "production") {
    if (
      config.telemetry.serviceName.includes("localhost") ||
      config.telemetry.serviceName.includes("test")
    ) {
      health.issues.push({
        path: "telemetry.serviceName",
        message: "Service name contains localhost or test in production",
        severity: "critical",
      });
      health.status = "critical";
    }

    if (config.telemetry.serviceVersion === "dev" || config.telemetry.serviceVersion === "latest") {
      health.issues.push({
        path: "telemetry.serviceVersion",
        message: "Production requires specific version, not dev or latest",
        severity: "critical",
      });
      health.status = "critical";
    }

    if (
      config.telemetry.tracesEndpoint?.includes("localhost") ||
      config.telemetry.logsEndpoint?.includes("localhost") ||
      config.telemetry.metricsEndpoint?.includes("localhost")
    ) {
      health.issues.push({
        path: "telemetry.endpoints",
        message: "Telemetry endpoints point to localhost in production",
        severity: "warning",
      });
      if (health.status === "healthy") health.status = "degraded";
    }
  }

  // Required environment variables check
  const requiredVars = [
    { path: "jwt.authority", value: config.jwt.authority },
    { path: "jwt.audience", value: config.jwt.audience },
    { path: "kong.adminUrl", value: config.kong.adminUrl },
    { path: "kong.adminToken", value: config.kong.adminToken },
  ];

  const missingRequired = requiredVars.filter(({ value }) => !value || value.trim() === "");
  if (missingRequired.length > 0) {
    missingRequired.forEach(({ path }) => {
      health.issues.push({
        path,
        message: "Required configuration value is missing or empty",
        severity: "critical",
      });
    });
    health.status = "critical";
  }

  // Performance and operational recommendations
  if (config.telemetry.batchSize > 3000) {
    health.recommendations.push("Consider reducing telemetry batch size for better memory usage");
  }

  if (config.telemetry.exportTimeout > 45000) {
    health.recommendations.push(
      "Export timeout is very high, consider reducing for better responsiveness"
    );
  }

  // Note: Using 100% sampling - sampling handled by collector

  return health;
}

// Export individual config sections for focused access
export const serverConfig = config.server;
export const jwtConfig = config.jwt;
export const kongConfig = config.kong;
export const telemetryConfig = config.telemetry;

// Configuration metadata for tooling
export const configMetadata = {
  version: "2.0.0",
  loadedAt: new Date().toISOString(),
  environment: config.telemetry.environment,
  serviceName: config.telemetry.serviceName,
  serviceVersion: config.telemetry.serviceVersion,
};
