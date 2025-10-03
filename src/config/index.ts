/* src/config/index.ts */

import { z } from "zod";
import pkg from "../../package.json" with { type: "json" };

// Kong Response Schemas
export const ConsumerSecretSchema = z.object({
  id: z.string(),
  key: z.string(),
  secret: z.string(),
  consumer: z.object({
    id: z.string(),
  }),
});

export const ConsumerResponseSchema = z.object({
  data: z.array(ConsumerSecretSchema),
  total: z.number(),
});

export const ConsumerSchema = z.object({
  id: z.string(),
  username: z.string(),
  custom_id: z.string().optional(),
  tags: z.array(z.string()).optional(),
  created_at: z.number(),
});

export const KongHealthCheckResultSchema = z.object({
  healthy: z.boolean(),
  responseTime: z.number(),
  error: z.string().optional(),
});

export const KongCacheStatsSchema = z.object({
  size: z.number(),
  entries: z.array(z.any()),
  activeEntries: z.number(),
  hitRate: z.string(),
});

// Export types from Zod schemas
export type ConsumerSecret = z.infer<typeof ConsumerSecretSchema>;
export type ConsumerResponse = z.infer<typeof ConsumerResponseSchema>;
export type Consumer = z.infer<typeof ConsumerSchema>;
export type KongHealthCheckResult = z.infer<typeof KongHealthCheckResultSchema>;
export type KongCacheStats = z.infer<typeof KongCacheStatsSchema>;

// Kong Service Interface
export const TokenResponseSchema = z.object({
  access_token: z.string(),
  expires_in: z.number(),
});

export const JWTPayloadSchema = z.object({
  sub: z.string(),
  key: z.string(),
  jti: z.string(),
  iat: z.number(),
  exp: z.number(),
  iss: z.string(),
  aud: z.union([z.string(), z.array(z.string())]),
  name: z.string(),
  unique_name: z.string(),
});

export const RouteDefinitionSchema = z.object({
  path: z.string(),
  method: z.string(),
  summary: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  requiresAuth: z.boolean().optional(),
  parameters: z.any().optional(),
  requestBody: z.any().optional(),
  responses: z.any().optional(),
});

export const CacheEntrySchema = z.object({
  data: ConsumerSecretSchema,
  expires: z.number(),
});

export type TokenResponse = z.infer<typeof TokenResponseSchema>;
export type JWTPayload = z.infer<typeof JWTPayloadSchema>;
export type RouteDefinition = z.infer<typeof RouteDefinitionSchema>;
export type CacheEntry = z.infer<typeof CacheEntrySchema>;
export type KongMode = "API_GATEWAY" | "KONNECT";

export interface IKongService {
  getConsumerSecret(consumerId: string): Promise<ConsumerSecret | null>;
  createConsumerSecret(consumerId: string): Promise<ConsumerSecret | null>;
  clearCache(consumerId?: string): void;
  getCacheStats(): KongCacheStats;
  healthCheck(): Promise<KongHealthCheckResult>;
}

const ServerConfigSchema = z.object({
  port: z.number().min(1).max(65535),
  nodeEnv: z.string().min(1),
});

const JwtConfigSchema = z.object({
  authority: z.string().min(1),
  audience: z.string().min(1),
  issuer: z.string().min(1).optional(),
  keyClaimName: z.string().min(1),
  expirationMinutes: z.number().min(1),
  validateSignature: z.boolean(),
});

const KongConfigSchema = z.object({
  mode: z.enum(["API_GATEWAY", "KONNECT"]),
  adminUrl: z.url(),
  adminToken: z.string().min(1),
  consumerIdHeader: z.string().min(1),
  consumerUsernameHeader: z.string().min(1),
  anonymousHeader: z.string().min(1),
});

const ApiInfoConfigSchema = z.object({
  title: z.string().min(1).describe("API title"),
  description: z.string().min(1).describe("API description"),
  version: z.string().min(1).describe("API version"),
  contactName: z.string().min(1).describe("Contact name"),
  contactEmail: z.email().describe("Contact email"),
  licenseName: z.string().min(1).describe("License name"),
  licenseIdentifier: z.string().min(1).describe("License identifier"),
  cors: z.string().min(1).describe("CORS origin configuration"),
});

const TelemetryConfigSchema = z
  .object({
    serviceName: z.string().min(1).describe("Service identifier for telemetry"),
    serviceVersion: z.string().min(1).describe("Service version for telemetry"),
    environment: z
      .enum(["local", "development", "staging", "production"])
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
          code: "custom",
          message: "Production service name cannot contain localhost or test references",
          path: ["serviceName"],
        });
      }
      if (data.serviceVersion === "dev" || data.serviceVersion === "latest") {
        ctx.addIssue({
          code: "custom",
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
  apiInfo: ApiInfoConfigSchema,
});

export type AppConfig = z.infer<typeof AppConfigSchema> & {
  telemetry: z.infer<typeof TelemetryConfigSchema> & {
    enabled: boolean;
    enableOpenTelemetry: boolean;
  };
};

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
    validateSignature: false,
  },
  kong: {
    mode: "KONNECT",
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
    enableOpenTelemetry: false,
  } as any,
  apiInfo: {
    title: "Authentication Service API",
    description:
      "High-performance authentication service with Kong integration, OpenTelemetry observability, and comprehensive health monitoring",
    version: pkg.version || "1.0.0",
    contactName: "Example Corp",
    contactEmail: "api-support@example.com",
    licenseName: "Proprietary",
    licenseIdentifier: "UNLICENSED",
    cors: "*",
  },
};

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
    validateSignature: "KONG_JWT_VALIDATE_SIGNATURE",
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
        return z.coerce.boolean().parse(value);
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

function loadConfigFromEnv(): Partial<AppConfig> {
  const config: Partial<AppConfig> = {};

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
    issuer: parseEnvVar(
      Bun.env[envVarMapping.jwt.issuer],
      "string",
      Bun.env[envVarMapping.jwt.authority] || defaultConfig.jwt.issuer
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
    validateSignature: parseEnvVar(
      Bun.env[envVarMapping.jwt.validateSignature],
      "boolean",
      defaultConfig.jwt.validateSignature
    ) as boolean,
  };

  config.kong = {
    mode: parseEnvVar(Bun.env[envVarMapping.kong.mode], "string", defaultConfig.kong.mode) as
      | "API_GATEWAY"
      | "KONNECT",
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

  const baseEndpoint = parseEnvVar(Bun.env[envVarMapping.telemetry.endpoint], "string") as string;

  config.telemetry = {
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
    ) as "local" | "development" | "staging" | "production",

    mode: parseEnvVar(
      Bun.env[envVarMapping.telemetry.mode],
      "string",
      defaultConfig.telemetry.mode
    ) as "console" | "otlp" | "both",

    logsEndpoint: parseEnvVar(
      Bun.env[envVarMapping.telemetry.logsEndpoint] ||
        (baseEndpoint ? `${baseEndpoint}/v1/logs` : undefined),
      "string",
      undefined
    ) as string | undefined,

    tracesEndpoint: parseEnvVar(
      Bun.env[envVarMapping.telemetry.tracesEndpoint] ||
        (baseEndpoint ? `${baseEndpoint}/v1/traces` : undefined),
      "string",
      undefined
    ) as string | undefined,

    metricsEndpoint: parseEnvVar(
      Bun.env[envVarMapping.telemetry.metricsEndpoint] ||
        (baseEndpoint ? `${baseEndpoint}/v1/metrics` : undefined),
      "string",
      undefined
    ) as string | undefined,

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

    enableOpenTelemetry: false,
  } as any;

  config.apiInfo = {
    title: parseEnvVar(
      Bun.env[envVarMapping.apiInfo.title],
      "string",
      defaultConfig.apiInfo.title
    ) as string,
    description: parseEnvVar(
      Bun.env[envVarMapping.apiInfo.description],
      "string",
      defaultConfig.apiInfo.description
    ) as string,
    version: parseEnvVar(
      Bun.env[envVarMapping.apiInfo.version],
      "string",
      defaultConfig.apiInfo.version
    ) as string,
    contactName: parseEnvVar(
      Bun.env[envVarMapping.apiInfo.contactName],
      "string",
      defaultConfig.apiInfo.contactName
    ) as string,
    contactEmail: parseEnvVar(
      Bun.env[envVarMapping.apiInfo.contactEmail],
      "email",
      defaultConfig.apiInfo.contactEmail
    ) as string,
    licenseName: parseEnvVar(
      Bun.env[envVarMapping.apiInfo.licenseName],
      "string",
      defaultConfig.apiInfo.licenseName
    ) as string,
    licenseIdentifier: parseEnvVar(
      Bun.env[envVarMapping.apiInfo.licenseIdentifier],
      "string",
      defaultConfig.apiInfo.licenseIdentifier
    ) as string,
    cors: parseEnvVar(
      Bun.env[envVarMapping.apiInfo.cors],
      "string",
      defaultConfig.apiInfo.cors
    ) as string,
  };

  return config;
}

let config: AppConfig;

try {
  const envConfig = loadConfigFromEnv();
  const mergedConfig = {
    server: { ...defaultConfig.server, ...envConfig.server },
    jwt: { ...defaultConfig.jwt, ...envConfig.jwt },
    kong: { ...defaultConfig.kong, ...envConfig.kong },
    telemetry: { ...defaultConfig.telemetry, ...envConfig.telemetry },
    apiInfo: { ...defaultConfig.apiInfo, ...envConfig.apiInfo },
  };

  const validatedConfig = AppConfigSchema.parse(mergedConfig);

  config = {
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

export const serverConfig = config.server;
export const jwtConfig = config.jwt;
export const kongConfig = config.kong;
export const telemetryConfig = config.telemetry;
export const apiInfoConfig = config.apiInfo;

export const configMetadata = {
  version: "2.0.0",
  loadedAt: new Date().toISOString(),
  environment: config.telemetry.environment,
  serviceName: config.telemetry.serviceName,
  serviceVersion: config.telemetry.serviceVersion,
};
