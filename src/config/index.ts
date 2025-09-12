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
  adminUrl: z.string().url(),
  adminToken: z.string().min(1),
  consumerIdHeader: z.string().min(1),
  consumerUsernameHeader: z.string().min(1),
  anonymousHeader: z.string().min(1),
});

const TelemetryConfigSchema = z.object({
  endpoint: z.string().url(),
}).optional();

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
    endpoint: "OPEN_TELEMETRY_ENDPOINT",
  },
} as const;

function parseEnvVar(value: string | undefined, type: "string" | "number" | "boolean"): unknown {
  if (value === undefined) return undefined;
  if (type === "number") return Number(value);
  if (type === "boolean") return value.toLowerCase() === "true";
  return value;
}


function loadConfigFromEnv(): Partial<AppConfig> {
  const config: Partial<AppConfig> = {};

  // Load server config
  config.server = {
    port: (parseEnvVar(Bun.env[envVarMapping.server.port], "number") as number) || defaultConfig.server.port,
    nodeEnv: (parseEnvVar(Bun.env[envVarMapping.server.nodeEnv], "string") as string) || defaultConfig.server.nodeEnv,
  };

  // Load JWT config
  config.jwt = {
    authority: (parseEnvVar(Bun.env[envVarMapping.jwt.authority], "string") as string) || defaultConfig.jwt.authority,
    audience: (parseEnvVar(Bun.env[envVarMapping.jwt.audience], "string") as string) || defaultConfig.jwt.audience,
    keyClaimName: (parseEnvVar(Bun.env[envVarMapping.jwt.keyClaimName], "string") as string) || defaultConfig.jwt.keyClaimName,
    expirationMinutes: (parseEnvVar(Bun.env[envVarMapping.jwt.expirationMinutes], "number") as number) || defaultConfig.jwt.expirationMinutes,
  };

  // Load Kong config
  config.kong = {
    adminUrl: (parseEnvVar(Bun.env[envVarMapping.kong.adminUrl], "string") as string) || defaultConfig.kong.adminUrl,
    adminToken: (parseEnvVar(Bun.env[envVarMapping.kong.adminToken], "string") as string) || defaultConfig.kong.adminToken,
    consumerIdHeader: defaultConfig.kong.consumerIdHeader,
    consumerUsernameHeader: defaultConfig.kong.consumerUsernameHeader,
    anonymousHeader: defaultConfig.kong.anonymousHeader,
  };

  // Load Telemetry config
  const telemetryEndpoint = parseEnvVar(Bun.env[envVarMapping.telemetry.endpoint], "string") as string;
  if (telemetryEndpoint) {
    config.telemetry = {
      endpoint: telemetryEndpoint,
    };
  }

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
    ({ value }) => !value || value.trim() === ""
  );

  if (missingVars.length > 0) {
    const missing = missingVars.map(({ key }) => key).join(", ");
    throw new Error(`Missing required environment variables: ${missing}`);
  }

  console.log("✅ Configuration loaded successfully");
  console.log(`   Server: ${config.server.nodeEnv} mode on port ${config.server.port}`);
  console.log(`   JWT Authority: ${config.jwt.authority}`);
  console.log(`   Kong Admin: ${config.kong.adminUrl}`);

  if (config.telemetry) {
    console.log(`   Telemetry: ${config.telemetry.endpoint}`);
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

