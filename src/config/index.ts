/* src/config/index.ts */

import { z } from "zod";

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
    enabled: z.boolean().default(true),
    serviceName: z.string().default("authentication-service"),
    serviceVersion: z.string().default("1.0.0"),
    environment: z.string().default("development"),
    endpoint: z.url().optional(),
    logsEndpoint: z.url().optional(),
    tracesEndpoint: z.url().optional(),
    metricsEndpoint: z.url().optional(),
    mode: z.enum(['console', 'otlp', 'both']).default('both'),
    consoleLogging: z.boolean().default(true),
    sampling: z
      .object({
        traces: z.number().min(0).max(1).default(0.15),
        logs: z.number().min(0).max(1).default(0.15),
        metrics: z.number().min(0).max(1).default(0.15),
        errors: z.number().min(0).max(1).default(1.0),
      })
      .default({ traces: 0.15, logs: 0.15, metrics: 0.15, errors: 1.0 }),
    batchSize: z.number().default(10000),
    exportTimeout: z.number().default(30000),
    maxQueueSize: z.number().default(50000),
  })
  .optional();

const AppConfigSchema = z.object({
  server: ServerConfigSchema,
  jwt: JwtConfigSchema,
  kong: KongConfigSchema,
  telemetry: TelemetryConfigSchema,
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

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
};

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
    serviceName: "SERVICE_NAME",
    serviceVersion: "SERVICE_VERSION",
    environment: "DEPLOYMENT_ENVIRONMENT",
    endpoint: "OTLP_ENDPOINT",
    logsEndpoint: "LOGS_ENDPOINT",
    tracesEndpoint: "TRACES_ENDPOINT",
    metricsEndpoint: "METRICS_ENDPOINT",
    mode: "TELEMETRY_MODE",
    consoleLogging: "CONSOLE_LOGGING",
    traceSamplingRate: "TRACE_SAMPLING_RATE",
    logSamplingRate: "LOG_SAMPLING_RATE",
    metricSamplingRate: "METRIC_SAMPLING_RATE",
    errorSamplingRate: "ERROR_SAMPLING_RATE",
    batchSize: "BATCH_SIZE",
    exportTimeout: "EXPORT_TIMEOUT_MS",
    maxQueueSize: "MAX_QUEUE_SIZE",
  },
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

function loadConfigFromEnv(): Partial<AppConfig> {
  const config: Partial<AppConfig> = {};

  // Load server config
  config.server = {
    port:
      (parseEnvVar(Bun.env[envVarMapping.server.port], "number") as number) ||
      defaultConfig.server.port,
    nodeEnv:
      (parseEnvVar(
        Bun.env[envVarMapping.server.nodeEnv],
        "string",
      ) as string) || defaultConfig.server.nodeEnv,
  };

  // Load JWT config
  config.jwt = {
    authority:
      (parseEnvVar(Bun.env[envVarMapping.jwt.authority], "string") as string) ||
      defaultConfig.jwt.authority,
    audience:
      (parseEnvVar(Bun.env[envVarMapping.jwt.audience], "string") as string) ||
      defaultConfig.jwt.audience,
    keyClaimName:
      (parseEnvVar(
        Bun.env[envVarMapping.jwt.keyClaimName],
        "string",
      ) as string) || defaultConfig.jwt.keyClaimName,
    expirationMinutes:
      (parseEnvVar(
        Bun.env[envVarMapping.jwt.expirationMinutes],
        "number",
      ) as number) || defaultConfig.jwt.expirationMinutes,
  };

  // Load Kong config
  config.kong = {
    adminUrl:
      (parseEnvVar(Bun.env[envVarMapping.kong.adminUrl], "string") as string) ||
      defaultConfig.kong.adminUrl,
    adminToken:
      (parseEnvVar(
        Bun.env[envVarMapping.kong.adminToken],
        "string",
      ) as string) || defaultConfig.kong.adminToken,
    consumerIdHeader: defaultConfig.kong.consumerIdHeader,
    consumerUsernameHeader: defaultConfig.kong.consumerUsernameHeader,
    anonymousHeader: defaultConfig.kong.anonymousHeader,
  };

  // Load Telemetry config
  const telemetryEndpoint = parseEnvVar(
    Bun.env[envVarMapping.telemetry.endpoint],
    "string",
  ) as string;
  const logsEndpoint = parseEnvVar(
    Bun.env[envVarMapping.telemetry.logsEndpoint],
    "string",
  ) as string;
  const tracesEndpoint = parseEnvVar(
    Bun.env[envVarMapping.telemetry.tracesEndpoint],
    "string",
  ) as string;
  const metricsEndpoint = parseEnvVar(
    Bun.env[envVarMapping.telemetry.metricsEndpoint],
    "string",
  ) as string;
  const serviceName = parseEnvVar(
    Bun.env[envVarMapping.telemetry.serviceName],
    "string",
  ) as string;
  const serviceVersion = parseEnvVar(
    Bun.env[envVarMapping.telemetry.serviceVersion],
    "string",
  ) as string;
  const environment = parseEnvVar(
    Bun.env[envVarMapping.telemetry.environment],
    "string",
  ) as string;
  const mode = parseEnvVar(
    Bun.env[envVarMapping.telemetry.mode],
    "string",
  ) as 'console' | 'otlp' | 'both';
  const consoleLogging = parseEnvVar(
    Bun.env[envVarMapping.telemetry.consoleLogging],
    "boolean",
  ) as boolean;
  const traceSamplingRate = parseEnvVar(
    Bun.env[envVarMapping.telemetry.traceSamplingRate],
    "number",
  ) as number;
  const logSamplingRate = parseEnvVar(
    Bun.env[envVarMapping.telemetry.logSamplingRate],
    "number",
  ) as number;
  const metricSamplingRate = parseEnvVar(
    Bun.env[envVarMapping.telemetry.metricSamplingRate],
    "number",
  ) as number;
  const errorSamplingRate = parseEnvVar(
    Bun.env[envVarMapping.telemetry.errorSamplingRate],
    "number",
  ) as number;
  const batchSize = parseEnvVar(
    Bun.env[envVarMapping.telemetry.batchSize],
    "number",
  ) as number;
  const exportTimeout = parseEnvVar(
    Bun.env[envVarMapping.telemetry.exportTimeout],
    "number",
  ) as number;
  const maxQueueSize = parseEnvVar(
    Bun.env[envVarMapping.telemetry.maxQueueSize],
    "number",
  ) as number;

  // Always create telemetry config - KISS principle
  config.telemetry = {
    enabled: true,
    serviceName: serviceName || "authentication-service",
    serviceVersion: serviceVersion || "1.0.0",
    environment: environment || config.server.nodeEnv,
    endpoint: telemetryEndpoint,
    logsEndpoint: logsEndpoint,
    tracesEndpoint: tracesEndpoint,
    metricsEndpoint: metricsEndpoint,
    mode: mode || 'both',
    consoleLogging: consoleLogging ?? true,
    sampling: {
      traces: traceSamplingRate ?? 0.15,
      logs: logSamplingRate ?? 0.15,
      metrics: metricSamplingRate ?? 0.15,
      errors: errorSamplingRate ?? 1.0,
    },
    batchSize: batchSize ?? 10000,
    exportTimeout: exportTimeout ?? 30000,
    maxQueueSize: maxQueueSize ?? 50000,
  };

  return config;
}

let config: AppConfig;

try {
  // Merge default config with environment variables
  const envConfig = loadConfigFromEnv();
  const mergedConfig = {
    server: { ...defaultConfig.server, ...envConfig.server },
    jwt: { ...defaultConfig.jwt, ...envConfig.jwt },
    kong: { ...defaultConfig.kong, ...envConfig.kong },
    telemetry: envConfig.telemetry,
  };

  // Validate merged configuration against schemas
  config = AppConfigSchema.parse(mergedConfig);

  // Check required variables
  const requiredVars = [
    { key: "JWT_AUTHORITY", value: config.jwt.authority },
    { key: "JWT_AUDIENCE", value: config.jwt.audience },
    { key: "KONG_ADMIN_URL", value: config.kong.adminUrl },
    { key: "KONG_ADMIN_TOKEN", value: config.kong.adminToken },
  ];

  const missingVars = requiredVars.filter(
    ({ value }) => !value || value.trim() === "",
  );

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
