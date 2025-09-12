/* src/config/index.ts */

import { z } from "zod";

const ServerConfigSchema = z.object({
  port: z
    .number()
    .min(1, "Port must be at least 1")
    .max(65535, "Port must be at most 65535"),
  nodeEnv: z.string().min(1, "Node environment is required"),
});

const JwtConfigSchema = z.object({
  authority: z.string().min(1, "JWT authority is required"),
  audience: z.string().min(1, "JWT audience is required"),
  keyClaimName: z.string().min(1, "JWT key claim name is required"),
  expirationMinutes: z
    .number()
    .min(1, "JWT expiration must be at least 1 minute"),
});

const KongConfigSchema = z.object({
  adminUrl: z.string().url("Kong admin URL must be a valid URL"),
  adminToken: z.string().min(1, "Kong admin token is required"),
  consumerIdHeader: z.string().min(1, "Consumer ID header is required"),
  consumerUsernameHeader: z
    .string()
    .min(1, "Consumer username header is required"),
  anonymousHeader: z.string().min(1, "Anonymous header is required"),
});

const TelemetryConfigSchema = z
  .object({
    endpoint: z.string().url("Telemetry endpoint must be a valid URL"),
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
  },
  kong: {
    adminUrl: "KONG_ADMIN_URL",
    adminToken: "KONG_ADMIN_TOKEN",
  },
  telemetry: {
    endpoint: "OPEN_TELEMETRY_ENDPOINT",
  },
};

function parseEnvVar(
  value: string | undefined,
  type: "string" | "number" | "array",
): unknown {
  if (value === undefined || value === "") return undefined;

  value = value.replace(/^['"]+|['"]+$/g, "").trim();

  switch (type) {
    case "number":
      const num = Number(value);
      return isNaN(num) ? undefined : num;
    case "array":
      return value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    default:
      return value;
  }
}

function getEnvValue(key: string): string | undefined {
  return Bun.env[key] || process.env[key];
}

function loadFromEnvironment(): Partial<AppConfig> {
  const config: any = {
    server: {},
    jwt: {},
    kong: {},
  };

  const serverPort = getEnvValue(envVarMapping.server.port);
  if (serverPort) config.server.port = parseEnvVar(serverPort, "number");

  const nodeEnv = getEnvValue(envVarMapping.server.nodeEnv);
  if (nodeEnv) config.server.nodeEnv = parseEnvVar(nodeEnv, "string");

  const jwtAuthority = getEnvValue(envVarMapping.jwt.authority);
  if (jwtAuthority) config.jwt.authority = parseEnvVar(jwtAuthority, "string");

  const jwtAudience = getEnvValue(envVarMapping.jwt.audience);
  if (jwtAudience) config.jwt.audience = parseEnvVar(jwtAudience, "string");

  const jwtKeyClaimName = getEnvValue(envVarMapping.jwt.keyClaimName);
  if (jwtKeyClaimName)
    config.jwt.keyClaimName = parseEnvVar(jwtKeyClaimName, "string");

  const kongAdminUrl = getEnvValue(envVarMapping.kong.adminUrl);
  if (kongAdminUrl) config.kong.adminUrl = parseEnvVar(kongAdminUrl, "string");

  const kongAdminToken = getEnvValue(envVarMapping.kong.adminToken);
  if (kongAdminToken)
    config.kong.adminToken = parseEnvVar(kongAdminToken, "string");

  const telemetryEndpoint = getEnvValue(envVarMapping.telemetry.endpoint);
  if (telemetryEndpoint) {
    config.telemetry = {
      endpoint: parseEnvVar(telemetryEndpoint, "string"),
    };
  }

  return config;
}

function deepMerge<T>(target: T, source: Partial<T>): T {
  const output = { ...target } as any;

  for (const key in source) {
    const sourceValue = source[key];
    if (
      sourceValue &&
      typeof sourceValue === "object" &&
      !Array.isArray(sourceValue)
    ) {
      output[key] = deepMerge(
        target[key as keyof T] || ({} as any),
        sourceValue,
      );
    } else if (sourceValue !== undefined) {
      output[key] = sourceValue;
    }
  }

  return output;
}

export function loadConfig(): AppConfig {
  try {
    const envConfig = loadFromEnvironment();
    const mergedConfig = deepMerge(defaultConfig, envConfig);
    const config = AppConfigSchema.parse(mergedConfig);

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

    console.log("✅ Configuration loaded successfully");
    console.log(
      `   Server: ${config.server.nodeEnv} mode on port ${config.server.port}`,
    );
    console.log(`   JWT Authority: ${config.jwt.authority}`);
    console.log(`   Kong Admin: ${config.kong.adminUrl}`);

    if (config.telemetry) {
      console.log(`   Telemetry: ${config.telemetry.endpoint}`);
    }

    return config;
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
}