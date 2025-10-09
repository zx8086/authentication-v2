/* src/config/config.ts */

import pkg from "../../package.json" with { type: "json" };
import {
  type ApiInfoConfig,
  type AppConfig,
  AppConfigSchema,
  type JwtConfig,
  type KongConfig,
  SchemaRegistry,
  type ServerConfig,
  type TelemetryConfig,
} from "./schemas";

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

// Pillar 3: Manual Configuration Loading
function parseEnvVar(
  value: string | undefined,
  type: "string" | "number" | "boolean" | "url" | "email"
): unknown {
  if (!value) return undefined;

  switch (type) {
    case "number": {
      const num = Number(value);
      return Number.isNaN(num) ? undefined : num;
    }
    case "boolean":
      return value.toLowerCase() === "true" || value === "1";
    case "url":
      // Basic URL validation without Zod chaining
      try {
        new URL(value);
        return value;
      } catch {
        return undefined;
      }
    case "email":
      // Basic email validation without Zod chaining
      return value.includes("@") ? value : undefined;
    default:
      return value;
  }
}

function loadConfigFromEnv(): Partial<AppConfig> {
  const envSource = typeof Bun !== "undefined" ? Bun.env : process.env;

  return {
    server: {
      port:
        (parseEnvVar(envSource[envVarMapping.server.port], "number") as number) ||
        defaultConfig.server.port,
      nodeEnv:
        (parseEnvVar(envSource[envVarMapping.server.nodeEnv], "string") as string) ||
        defaultConfig.server.nodeEnv,
    },
    jwt: {
      authority:
        (parseEnvVar(envSource[envVarMapping.jwt.authority], "string") as string) ||
        defaultConfig.jwt.authority,
      audience:
        (parseEnvVar(envSource[envVarMapping.jwt.audience], "string") as string) ||
        defaultConfig.jwt.audience,
      issuer:
        (parseEnvVar(envSource[envVarMapping.jwt.issuer], "string") as string) ||
        envSource[envVarMapping.jwt.authority] ||
        defaultConfig.jwt.issuer,
      keyClaimName:
        (parseEnvVar(envSource[envVarMapping.jwt.keyClaimName], "string") as string) ||
        defaultConfig.jwt.keyClaimName,
      expirationMinutes:
        (parseEnvVar(envSource[envVarMapping.jwt.expirationMinutes], "number") as number) ||
        defaultConfig.jwt.expirationMinutes,
    },
    kong: {
      mode:
        (parseEnvVar(envSource[envVarMapping.kong.mode], "string") as "API_GATEWAY" | "KONNECT") ||
        defaultConfig.kong.mode,
      adminUrl:
        (parseEnvVar(envSource[envVarMapping.kong.adminUrl], "string") as string) ||
        defaultConfig.kong.adminUrl,
      adminToken:
        (parseEnvVar(envSource[envVarMapping.kong.adminToken], "string") as string) ||
        defaultConfig.kong.adminToken,
      consumerIdHeader: defaultConfig.kong.consumerIdHeader,
      consumerUsernameHeader: defaultConfig.kong.consumerUsernameHeader,
      anonymousHeader: defaultConfig.kong.anonymousHeader,
    },
    telemetry: {
      serviceName:
        (parseEnvVar(envSource[envVarMapping.telemetry.serviceName], "string") as string) ||
        defaultConfig.telemetry.serviceName,
      serviceVersion:
        (parseEnvVar(envSource[envVarMapping.telemetry.serviceVersion], "string") as string) ||
        defaultConfig.telemetry.serviceVersion,
      environment: (() => {
        const env =
          (parseEnvVar(envSource[envVarMapping.telemetry.environment], "string") as string) ||
          defaultConfig.telemetry.environment;
        // Map "test" to "local" for testing purposes
        return env === "test"
          ? "local"
          : (env as "local" | "development" | "staging" | "production");
      })(),
      mode:
        (parseEnvVar(envSource[envVarMapping.telemetry.mode], "string") as
          | "console"
          | "otlp"
          | "both") || defaultConfig.telemetry.mode,
      endpoint: parseEnvVar(envSource[envVarMapping.telemetry.endpoint], "string") as
        | string
        | undefined,
      logsEndpoint: (() => {
        const baseEndpoint = envSource[envVarMapping.telemetry.endpoint];
        return (
          (parseEnvVar(envSource[envVarMapping.telemetry.logsEndpoint], "string") as string) ||
          (baseEndpoint ? `${baseEndpoint}/v1/logs` : undefined)
        );
      })(),
      tracesEndpoint: (() => {
        const baseEndpoint = envSource[envVarMapping.telemetry.endpoint];
        return (
          (parseEnvVar(envSource[envVarMapping.telemetry.tracesEndpoint], "string") as string) ||
          (baseEndpoint ? `${baseEndpoint}/v1/traces` : undefined)
        );
      })(),
      metricsEndpoint: (() => {
        const baseEndpoint = envSource[envVarMapping.telemetry.endpoint];
        return (
          (parseEnvVar(envSource[envVarMapping.telemetry.metricsEndpoint], "string") as string) ||
          (baseEndpoint ? `${baseEndpoint}/v1/metrics` : undefined)
        );
      })(),
      exportTimeout:
        (parseEnvVar(envSource[envVarMapping.telemetry.exportTimeout], "number") as number) ||
        defaultConfig.telemetry.exportTimeout,
      batchSize:
        (parseEnvVar(envSource[envVarMapping.telemetry.batchSize], "number") as number) ||
        defaultConfig.telemetry.batchSize,
      maxQueueSize:
        (parseEnvVar(envSource[envVarMapping.telemetry.maxQueueSize], "number") as number) ||
        defaultConfig.telemetry.maxQueueSize,
      enableOpenTelemetry: false,
      enabled: false,
    } as any,
    apiInfo: {
      title:
        (parseEnvVar(envSource[envVarMapping.apiInfo.title], "string") as string) ||
        defaultConfig.apiInfo.title,
      description:
        (parseEnvVar(envSource[envVarMapping.apiInfo.description], "string") as string) ||
        defaultConfig.apiInfo.description,
      version:
        (parseEnvVar(envSource[envVarMapping.apiInfo.version], "string") as string) ||
        defaultConfig.apiInfo.version,
      contactName:
        (parseEnvVar(envSource[envVarMapping.apiInfo.contactName], "string") as string) ||
        defaultConfig.apiInfo.contactName,
      contactEmail:
        (parseEnvVar(envSource[envVarMapping.apiInfo.contactEmail], "email") as string) ||
        defaultConfig.apiInfo.contactEmail,
      licenseName:
        (parseEnvVar(envSource[envVarMapping.apiInfo.licenseName], "string") as string) ||
        defaultConfig.apiInfo.licenseName,
      licenseIdentifier:
        (parseEnvVar(envSource[envVarMapping.apiInfo.licenseIdentifier], "string") as string) ||
        defaultConfig.apiInfo.licenseIdentifier,
      cors:
        (parseEnvVar(envSource[envVarMapping.apiInfo.cors], "string") as string) ||
        defaultConfig.apiInfo.cors,
    },
  };
}

// Pillar 4: Configuration Initialization
function initializeConfig(): AppConfig {
  try {
    const envConfig = loadConfigFromEnv();
    const mergedConfig = {
      server: { ...defaultConfig.server, ...envConfig.server },
      jwt: { ...defaultConfig.jwt, ...envConfig.jwt },
      kong: { ...defaultConfig.kong, ...envConfig.kong },
      telemetry: { ...defaultConfig.telemetry, ...envConfig.telemetry },
      apiInfo: { ...defaultConfig.apiInfo, ...envConfig.apiInfo },
    };

    const result = AppConfigSchema.safeParse(mergedConfig);

    if (!result.success) {
      console.error("Configuration validation failed:");
      console.error(result.error.message);

      const issues = result.error.issues
        .map((issue) => {
          const path = issue.path.length > 0 ? issue.path.join(".") : "root";
          return `  - ${path}: ${issue.message}`;
        })
        .join("\n");

      throw new Error(
        `Invalid configuration:\n${issues}\n\nPlease check your environment variables and default configuration.`
      );
    }

    const validatedConfig = result.data;

    const config: AppConfig = {
      ...validatedConfig,
      telemetry: {
        ...validatedConfig.telemetry,
        enabled: validatedConfig.telemetry.mode !== "console",
        enableOpenTelemetry: validatedConfig.telemetry.mode !== "console",
      },
    };

    const requiredVars = [
      { key: "KONG_JWT_AUTHORITY", value: config.jwt.authority },
      { key: "KONG_JWT_AUDIENCE", value: config.jwt.audience },
      { key: "KONG_ADMIN_URL", value: config.kong.adminUrl },
      { key: "KONG_ADMIN_TOKEN", value: config.kong.adminToken },
    ];

    const missingVars = requiredVars.filter(({ value }) => !value || value.trim() === "");

    if (missingVars.length > 0) {
      const missing = missingVars.map(({ key }) => key).join(", ");
      throw new Error(`Missing required environment variables: ${missing}`);
    }

    return config;
  } catch (error) {
    console.error("Configuration initialization failed:", error);
    throw error;
  }
}

export const config = initializeConfig();

// Configuration Health Validation
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

    // Security checks
    if (config.kong.adminUrl.includes("localhost")) {
      health.issues.push({
        path: "kong.adminUrl",
        message: "Kong Admin URL uses localhost in production",
        severity: "critical",
      });
      health.status = "critical";
    }

    if (config.kong.adminToken.length < 32) {
      health.issues.push({
        path: "kong.adminToken",
        message: "Kong admin token is too short for production use",
        severity: "critical",
      });
      health.status = "critical";
    }
  }

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

  if (config.telemetry.batchSize > 3000) {
    health.recommendations.push("Consider reducing telemetry batch size for better memory usage");
  }

  if (config.telemetry.exportTimeout > 45000) {
    health.recommendations.push(
      "Export timeout is very high, consider reducing for better responsiveness"
    );
  }

  return health;
}

export function loadConfig(): AppConfig {
  return config;
}

export { SchemaRegistry };
export type { AppConfig, ServerConfig, JwtConfig, KongConfig, TelemetryConfig, ApiInfoConfig };

export const serverConfig = config.server;
export const jwtConfig = config.jwt;
export const kongConfig = config.kong;
export const telemetryConfig = config.telemetry;
export const apiInfoConfig = config.apiInfo;

export const configMetadata = {
  version: "3.0.0",
  loadedAt: new Date().toISOString(),
  environment: config.telemetry.environment,
  serviceName: config.telemetry.serviceName,
  serviceVersion: config.telemetry.serviceVersion,
  pattern: "4-pillar",
  zodVersion: "v4",
};

export const getConfigJSONSchema = () => AppConfigSchema;
export const validateConfiguration = (data: unknown) => {
  const result = AppConfigSchema.safeParse(data);
  if (!result.success) {
    throw new Error(JSON.stringify(result.error.issues, null, 2));
  }
  return result.data;
};
