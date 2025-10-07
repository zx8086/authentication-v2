/* src/config/schemas.ts */

import { z } from "zod";

export const ConsumerSecretSchema = z.strictObject({
  id: z.string(),
  key: z.string(),
  secret: z.string(),
  consumer: z.strictObject({
    id: z.string(),
  }),
});

export const ConsumerResponseSchema = z.strictObject({
  data: z.array(ConsumerSecretSchema),
  total: z.number(),
});

export const ConsumerSchema = z.strictObject({
  id: z.string(),
  username: z.string(),
  custom_id: z.string().optional(),
  tags: z.array(z.string()).optional(),
  created_at: z.number(),
});

export const KongHealthCheckResultSchema = z.strictObject({
  healthy: z.boolean(),
  responseTime: z.number(),
  error: z.string().optional(),
});

export const KongCacheStatsSchema = z.strictObject({
  size: z.number(),
  entries: z.array(z.any()),
  activeEntries: z.number(),
  hitRate: z.string(),
});

export const TokenResponseSchema = z.strictObject({
  access_token: z.string(),
  expires_in: z.number(),
});

export const JWTPayloadSchema = z.strictObject({
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

export const RouteDefinitionSchema = z.strictObject({
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

export const CacheEntrySchema = z.strictObject({
  data: ConsumerSecretSchema,
  expires: z.number(),
});

export const EnvironmentType = z.enum(["local", "development", "staging", "production"]);
export const TelemetryMode = z.enum(["console", "otlp", "both"]);
export const KongMode = z.enum(["API_GATEWAY", "KONNECT"]);

// Reusable Format Functions (Zod v4)
export const HttpsUrl = z.url();
export const EmailAddress = z.email();
export const PositiveInt = z.int32().min(1);
export const PortNumber = z.int32().min(1).max(65535);
export const NonEmptyString = z.string().min(1);

export const ServerConfigSchema = z.strictObject({
  port: PortNumber,
  nodeEnv: NonEmptyString,
});

export const JwtConfigSchema = z.strictObject({
  authority: NonEmptyString,
  audience: NonEmptyString,
  issuer: NonEmptyString.optional(),
  keyClaimName: NonEmptyString,
  expirationMinutes: PositiveInt,
});

export const KongConfigSchema = z.strictObject({
  mode: KongMode,
  adminUrl: HttpsUrl,
  adminToken: NonEmptyString,
  consumerIdHeader: NonEmptyString,
  consumerUsernameHeader: NonEmptyString,
  anonymousHeader: NonEmptyString,
});

export const ApiInfoConfigSchema = z.strictObject({
  title: NonEmptyString.describe("API title"),
  description: NonEmptyString.describe("API description"),
  version: NonEmptyString.describe("API version"),
  contactName: NonEmptyString.describe("Contact name"),
  contactEmail: EmailAddress.describe("Contact email"),
  licenseName: NonEmptyString.describe("License name"),
  licenseIdentifier: NonEmptyString.describe("License identifier"),
  cors: NonEmptyString.describe("CORS origin configuration"),
});

export const TelemetryConfigSchema = z
  .strictObject({
    serviceName: NonEmptyString.describe("Service identifier for telemetry"),
    serviceVersion: NonEmptyString.describe("Service version for telemetry"),
    environment: EnvironmentType.describe("Deployment environment"),
    mode: TelemetryMode,
    endpoint: HttpsUrl.optional(),
    logsEndpoint: HttpsUrl.optional(),
    tracesEndpoint: HttpsUrl.optional(),
    metricsEndpoint: HttpsUrl.optional(),
    exportTimeout: z.int32().min(1000).max(60000),
    batchSize: z.int32().min(1).max(5000),
    maxQueueSize: z.int32().min(1).max(50000),
    enabled: z.boolean().optional(),
    enableOpenTelemetry: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    // Production-specific validation
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
      // Ensure HTTPS endpoints in production
      if (data.logsEndpoint && !data.logsEndpoint.startsWith("https://")) {
        ctx.addIssue({
          code: "custom",
          message: "Production telemetry endpoints must use HTTPS",
          path: ["logsEndpoint"],
        });
      }
      if (data.tracesEndpoint && !data.tracesEndpoint.startsWith("https://")) {
        ctx.addIssue({
          code: "custom",
          message: "Production telemetry endpoints must use HTTPS",
          path: ["tracesEndpoint"],
        });
      }
      if (data.metricsEndpoint && !data.metricsEndpoint.startsWith("https://")) {
        ctx.addIssue({
          code: "custom",
          message: "Production telemetry endpoints must use HTTPS",
          path: ["metricsEndpoint"],
        });
      }
    }
  });

export const AppConfigSchema = z
  .strictObject({
    server: ServerConfigSchema,
    jwt: JwtConfigSchema,
    kong: KongConfigSchema,
    telemetry: TelemetryConfigSchema,
    apiInfo: ApiInfoConfigSchema,
  })
  .superRefine((data, ctx) => {
    // Cross-field validation
    if (data.server.nodeEnv === "production") {
      if (data.kong.adminUrl.includes("localhost")) {
        ctx.addIssue({
          code: "custom",
          message: "Kong Admin URL cannot use localhost in production",
          path: ["kong", "adminUrl"],
        });
      }
      if (data.kong.adminToken === "test" || data.kong.adminToken.length < 32) {
        ctx.addIssue({
          code: "custom",
          message: "Production Kong admin token must be secure (32+ characters)",
          path: ["kong", "adminToken"],
        });
      }
    }
  });

export const SchemaRegistry = {
  Server: ServerConfigSchema,
  Jwt: JwtConfigSchema,
  Kong: KongConfigSchema,
  Telemetry: TelemetryConfigSchema,
  ApiInfo: ApiInfoConfigSchema,
  AppConfig: AppConfigSchema,
  ConsumerSecret: ConsumerSecretSchema,
  ConsumerResponse: ConsumerResponseSchema,
  Consumer: ConsumerSchema,
  KongHealthCheckResult: KongHealthCheckResultSchema,
  KongCacheStats: KongCacheStatsSchema,
  TokenResponse: TokenResponseSchema,
  JWTPayload: JWTPayloadSchema,
  RouteDefinition: RouteDefinitionSchema,
  CacheEntry: CacheEntrySchema,
} as const;

export type ConsumerSecret = z.infer<typeof ConsumerSecretSchema>;
export type ConsumerResponse = z.infer<typeof ConsumerResponseSchema>;
export type Consumer = z.infer<typeof ConsumerSchema>;
export type KongHealthCheckResult = z.infer<typeof KongHealthCheckResultSchema>;
export type KongCacheStats = z.infer<typeof KongCacheStatsSchema>;
export type TokenResponse = z.infer<typeof TokenResponseSchema>;
export type JWTPayload = z.infer<typeof JWTPayloadSchema>;
export type RouteDefinition = z.infer<typeof RouteDefinitionSchema>;
export type CacheEntry = z.infer<typeof CacheEntrySchema>;
export type KongModeType = "API_GATEWAY" | "KONNECT";
export type AppConfig = z.infer<typeof AppConfigSchema> & {
  telemetry: z.infer<typeof TelemetryConfigSchema> & {
    enabled: boolean;
    enableOpenTelemetry: boolean;
  };
};
export type ServerConfig = z.infer<typeof ServerConfigSchema>;
export type JwtConfig = z.infer<typeof JwtConfigSchema>;
export type KongConfig = z.infer<typeof KongConfigSchema>;
export type TelemetryConfig = z.infer<typeof TelemetryConfigSchema>;
export type ApiInfoConfig = z.infer<typeof ApiInfoConfigSchema>;

export interface IKongService {
  getConsumerSecret(consumerId: string): Promise<ConsumerSecret | null>;
  createConsumerSecret(consumerId: string): Promise<ConsumerSecret | null>;
  clearCache(consumerId?: string): void;
  getCacheStats(): KongCacheStats;
  healthCheck(): Promise<KongHealthCheckResult>;
}
