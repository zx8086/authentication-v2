/* src/config/schemas.ts */

import { z } from "zod";
import type { CircuitBreakerStats } from "../services/circuit-breaker.service";

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

export const EnvironmentType = z.enum(["local", "development", "staging", "production", "test"]);
export const TelemetryMode = z.enum(["console", "otlp", "both"]);
export const KongMode = z.enum(["API_GATEWAY", "KONNECT"]);

export const KongCacheStatsSchema = z.strictObject({
  strategy: z.enum(["local-memory", "shared-redis"]),
  size: z.number(),
  entries: z.array(z.any()),
  activeEntries: z.number(),
  hitRate: z.string(),
  memoryUsageMB: z.number().optional(),
  redisConnected: z.boolean().optional(),
  averageLatencyMs: z.number(),
});

export const CacheEntrySchema = z.strictObject({
  data: ConsumerSecretSchema,
  expires: z.number(),
  createdAt: z.number(),
});

export const GenericCacheEntrySchema = <T>(dataSchema: z.ZodSchema<T>) =>
  z.strictObject({
    data: dataSchema,
    expires: z.number(),
    createdAt: z.number(),
  });

export const CachingConfigSchema = z.strictObject({
  highAvailability: z.boolean(),
  redisUrl: z.string().optional(),
  redisPassword: z.string().optional(),
  redisDb: z.number().int().min(0).max(15),
  ttlSeconds: z.number().int().min(60).max(3600),
  staleDataToleranceMinutes: z
    .number()
    .int()
    .min(5)
    .max(240)
    .describe("Tolerance for serving stale cache data in minutes"),
});

export const CircuitBreakerConfigSchema = z.strictObject({
  enabled: z.boolean().describe("Enable circuit breaker protection"),
  timeout: z.number().int().min(100).max(10000).describe("Request timeout in milliseconds"),
  errorThresholdPercentage: z
    .number()
    .min(1)
    .max(100)
    .describe("Failure rate threshold percentage"),
  resetTimeout: z
    .number()
    .int()
    .min(1000)
    .max(300000)
    .describe("Circuit reset timeout in milliseconds"),
  rollingCountTimeout: z
    .number()
    .int()
    .min(1000)
    .max(60000)
    .describe("Rolling window duration in milliseconds"),
  rollingCountBuckets: z
    .number()
    .int()
    .min(2)
    .max(50)
    .describe("Number of buckets for rolling window"),
  volumeThreshold: z
    .number()
    .int()
    .min(1)
    .max(1000)
    .describe("Minimum requests before circuit can trip"),
});

export function addProductionSecurityValidation<
  T extends { environment?: string; nodeEnv?: string },
>(
  data: T,
  ctx: z.RefinementCtx,
  options: {
    serviceName?: string;
    serviceVersion?: string;
    adminUrl?: string;
    adminToken?: string;
    endpoints?: Array<{ path: string[]; value?: string }>;
  } = {}
) {
  const isProduction = data.environment === "production" || data.nodeEnv === "production";

  if (!isProduction) return;

  if (options.serviceName) {
    if (options.serviceName.includes("localhost") || options.serviceName.includes("test")) {
      ctx.addIssue({
        code: "custom",
        message: "Production service name cannot contain localhost or test references",
        path: ["serviceName"],
      });
      return;
    }
  }

  if (options.serviceVersion) {
    if (options.serviceVersion === "dev" || options.serviceVersion === "latest") {
      ctx.addIssue({
        code: "custom",
        message: "Production requires specific version, not dev or latest",
        path: ["serviceVersion"],
      });
      return;
    }
  }

  if (options.endpoints) {
    for (const endpoint of options.endpoints) {
      if (endpoint.value && !endpoint.value.startsWith("https://")) {
        ctx.addIssue({
          code: "custom",
          message: "Production telemetry endpoints must use HTTPS",
          path: endpoint.path,
        });
        return;
      }
    }
  }

  if (options.adminUrl) {
    if (options.adminUrl.includes("localhost")) {
      ctx.addIssue({
        code: "custom",
        message: "Kong Admin URL cannot use localhost in production",
        path: ["kong", "adminUrl"],
      });
      return;
    }
  }

  if (options.adminToken) {
    if (options.adminToken === "test" || options.adminToken.length < 32) {
      ctx.addIssue({
        code: "custom",
        message: "Production Kong admin token must be secure (32+ characters)",
        path: ["kong", "adminToken"],
      });
      return;
    }
  }
}

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
  circuitBreaker: CircuitBreakerConfigSchema,
  highAvailability: z.boolean().optional(),
});

export const ProfilingConfigSchema = z.strictObject({
  enabled: z.boolean().describe("Enable profiling service"),
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

export const ApiVersioningConfigSchema = z.strictObject({
  supportedVersions: z.array(NonEmptyString).min(1).describe("List of supported API versions"),
  defaultVersion: NonEmptyString.describe("Default API version when none specified"),
  latestVersion: NonEmptyString.describe("Latest available API version"),
  deprecationPolicy: z
    .strictObject({
      enabled: z.boolean().describe("Whether version deprecation is enabled"),
      warningHeader: z.boolean().describe("Include deprecation warning in response headers"),
      gracePeriodDays: z
        .number()
        .int()
        .min(30)
        .max(365)
        .describe("Grace period before version removal"),
    })
    .describe("API version deprecation policy"),
  strategy: z.enum(["header", "url", "content-type"]).describe("Versioning strategy"),
  headers: z
    .strictObject({
      versionHeader: NonEmptyString.describe("Header name for version specification"),
      responseHeader: NonEmptyString.describe("Header name for version confirmation"),
      supportedHeader: NonEmptyString.describe("Header name for supported versions list"),
    })
    .describe("Header configuration for version management"),
});

export const ApiV2SecurityHeadersConfigSchema = z.strictObject({
  enabled: z.boolean().describe("Enable security headers for v2 API"),
  hstsMaxAge: z
    .number()
    .int()
    .min(86400)
    .max(63072000)
    .describe("HSTS max-age in seconds (min 1 day, max 2 years)"),
  hstsIncludeSubdomains: z.boolean().describe("Include subdomains in HSTS policy"),
  hstsPreload: z.boolean().describe("Enable HSTS preload"),
  cspPolicy: NonEmptyString.describe("Content Security Policy directive"),
  frameOptions: z.enum(["DENY", "SAMEORIGIN"]).describe("X-Frame-Options policy"),
  contentTypeOptions: z.boolean().describe("Enable X-Content-Type-Options: nosniff"),
  xssProtection: z.boolean().describe("Enable X-XSS-Protection"),
  referrerPolicy: z
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
    .describe("Referrer-Policy directive"),
  permissionsPolicy: NonEmptyString.describe("Permissions-Policy directive"),
});

export const ApiV2AuditConfigSchema = z.strictObject({
  enabled: z.boolean().describe("Enable enhanced audit logging for v2 API"),
  level: z.enum(["basic", "detailed", "comprehensive"]).describe("Audit logging detail level"),
  retentionDays: z
    .number()
    .int()
    .min(30)
    .max(2555)
    .describe("Audit log retention period in days (min 30 days, max 7 years)"),
  includeClientInfo: z.boolean().describe("Include client information in audit logs"),
  anonymizeIp: z.boolean().describe("Anonymize IP addresses in audit logs for privacy"),
  includePii: z.boolean().describe("Include PII in audit logs (compliance consideration)"),
  correlationIdHeader: NonEmptyString.describe("Header name for audit correlation ID"),
  securityEventThresholds: z.strictObject({
    authFailureCount: z.number().int().min(1).describe("Auth failure threshold for alerting"),
    anomalyDetection: z.boolean().describe("Enable anomaly pattern detection"),
    suspiciousPatterns: z.boolean().describe("Enable suspicious pattern detection"),
  }),
});

export const ApiV2ConfigSchema = z.strictObject({
  securityHeaders: ApiV2SecurityHeadersConfigSchema,
  auditLogging: ApiV2AuditConfigSchema,
});

export const TelemetryConfigSchema = z
  .strictObject({
    serviceName: NonEmptyString.describe("Service identifier for telemetry"),
    serviceVersion: NonEmptyString.describe("Service version for telemetry"),
    environment: EnvironmentType.describe("Deployment environment"),
    mode: TelemetryMode,
    logLevel: z.enum(["error", "warn", "info", "debug"]).describe("Winston log level"),
    endpoint: HttpsUrl.optional(),
    logsEndpoint: HttpsUrl.optional(),
    tracesEndpoint: HttpsUrl.optional(),
    metricsEndpoint: HttpsUrl.optional(),
    exportTimeout: z.int32().min(1000).max(60000),
    batchSize: z.int32().min(1).max(5000),
    maxQueueSize: z.int32().min(1).max(50000),
    enabled: z.boolean().optional(),
    enableOpenTelemetry: z.boolean().optional(),
    infrastructure: z.object({
      isKubernetes: z.boolean(),
      isEcs: z.boolean(),
      podName: z.string().optional(),
      namespace: z.string().optional(),
    }),
  })
  .superRefine((data, ctx) => {
    addProductionSecurityValidation(data, ctx, {
      serviceName: data.serviceName,
      serviceVersion: data.serviceVersion,
      endpoints: [
        { path: ["logsEndpoint"], value: data.logsEndpoint },
        { path: ["tracesEndpoint"], value: data.tracesEndpoint },
        { path: ["metricsEndpoint"], value: data.metricsEndpoint },
      ],
    });
  });

export const AppConfigSchema = z
  .strictObject({
    server: ServerConfigSchema,
    jwt: JwtConfigSchema,
    kong: KongConfigSchema,
    caching: CachingConfigSchema,
    telemetry: TelemetryConfigSchema,
    profiling: ProfilingConfigSchema,
    apiInfo: ApiInfoConfigSchema,
    apiVersioning: ApiVersioningConfigSchema,
    apiV2: ApiV2ConfigSchema.optional(),
  })
  .superRefine((data, ctx) => {
    addProductionSecurityValidation({ nodeEnv: data.server.nodeEnv }, ctx, {
      adminUrl: data.kong.adminUrl,
      adminToken: data.kong.adminToken,
    });
  });

export const SchemaRegistry = {
  Server: ServerConfigSchema,
  Jwt: JwtConfigSchema,
  Kong: KongConfigSchema,
  Caching: CachingConfigSchema,
  CircuitBreaker: CircuitBreakerConfigSchema,
  Telemetry: TelemetryConfigSchema,
  Profiling: ProfilingConfigSchema,
  ApiInfo: ApiInfoConfigSchema,
  ApiVersioning: ApiVersioningConfigSchema,
  ApiV2: ApiV2ConfigSchema,
  ApiV2SecurityHeaders: ApiV2SecurityHeadersConfigSchema,
  ApiV2Audit: ApiV2AuditConfigSchema,
  AppConfig: AppConfigSchema,
  ConsumerSecret: ConsumerSecretSchema,
  ConsumerResponse: ConsumerResponseSchema,
  Consumer: ConsumerSchema,
  KongHealthCheckResult: KongHealthCheckResultSchema,
  KongCacheStats: KongCacheStatsSchema,
  CacheEntry: CacheEntrySchema,
  TokenResponse: TokenResponseSchema,
  JWTPayload: JWTPayloadSchema,
  RouteDefinition: RouteDefinitionSchema,
} as const;

export type ConsumerSecret = z.infer<typeof ConsumerSecretSchema>;
export type ConsumerResponse = z.infer<typeof ConsumerResponseSchema>;
export type Consumer = z.infer<typeof ConsumerSchema>;
export type KongHealthCheckResult = z.infer<typeof KongHealthCheckResultSchema>;
export type TokenResponse = z.infer<typeof TokenResponseSchema>;
export type JWTPayload = z.infer<typeof JWTPayloadSchema>;
export type RouteDefinition = z.infer<typeof RouteDefinitionSchema>;
export type KongModeType = "API_GATEWAY" | "KONNECT";
export type KongCacheStats = z.infer<typeof KongCacheStatsSchema>;
export type CacheEntry = z.infer<typeof CacheEntrySchema>;

export interface GenericCacheEntry<T> {
  data: T;
  expires: number;
  createdAt: number;
}
export type CachingConfig = z.infer<typeof CachingConfigSchema>;
export type CircuitBreakerConfig = z.infer<typeof CircuitBreakerConfigSchema>;
export type ProfilingConfig = z.infer<typeof ProfilingConfigSchema>;
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
export type ApiVersioningConfig = z.infer<typeof ApiVersioningConfigSchema>;
export type ApiV2Config = z.infer<typeof ApiV2ConfigSchema>;
export type ApiV2SecurityHeadersConfig = z.infer<typeof ApiV2SecurityHeadersConfigSchema>;
export type ApiV2AuditConfig = z.infer<typeof ApiV2AuditConfigSchema>;

export interface IKongService {
  getConsumerSecret(consumerId: string): Promise<ConsumerSecret | null>;
  createConsumerSecret(consumerId: string): Promise<ConsumerSecret | null>;
  clearCache(consumerId?: string): Promise<void>;
  getCacheStats(): Promise<KongCacheStats>;
  healthCheck(): Promise<KongHealthCheckResult>;
  getCircuitBreakerStats(): Record<string, CircuitBreakerStats>;
}

export interface IKongCacheService {
  get(key: string): Promise<ConsumerSecret | null>;
  set(key: string, value: ConsumerSecret, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  getStats(): Promise<KongCacheStats>;
  connect?(): Promise<void>;
  disconnect?(): Promise<void>;
  getStale?(key: string): Promise<ConsumerSecret | null>;
  setStale?(key: string, value: ConsumerSecret, ttlSeconds?: number): Promise<void>;
  clearStale?(): Promise<void>;
}

export type { OtlpEndpointConfig, OtlpEndpoints } from "./helpers";
export {
  createOtlpConfig,
  deriveAllOtlpEndpoints,
  deriveOtlpEndpoint,
  OTLP_STANDARD_PATHS,
  validateOtlpEndpoints,
} from "./helpers";
