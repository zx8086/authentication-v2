/* src/config/envMapping.ts */

// Pillar 2: Environment Variable Mapping
export const envVarMapping = {
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
