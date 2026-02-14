/* src/config/defaults.ts */

import pkg from "../../package.json" with { type: "json" };
import type { AppConfig } from "./schemas";

// Type for the telemetry config with required enabled fields
type TelemetryConfigWithEnabled = AppConfig["telemetry"];

// Pillar 1: Default Configuration Object
export const defaultConfig: AppConfig = {
  server: {
    port: 3000,
    nodeEnv: "development",
    maxRequestBodySize: 10 * 1024 * 1024,
    requestTimeoutMs: 30000,
  },
  jwt: {
    authority: "https://api.example.com",
    audience: "example-api",
    issuer: "https://api.example.com",
    keyClaimName: "key",
    expirationMinutes: 15,
  },
  kong: {
    mode: "API_GATEWAY",
    adminUrl: "http://localhost:8001",
    adminToken: "",
    consumerIdHeader: "x-consumer-id",
    consumerUsernameHeader: "x-consumer-username",
    anonymousHeader: "x-anonymous-consumer",
    circuitBreaker: {
      enabled: true,
      timeout: 5000,
      errorThresholdPercentage: 50,
      resetTimeout: 60000,
      rollingCountTimeout: 10000,
      rollingCountBuckets: 10,
      volumeThreshold: 3,
    },
    secretCreationMaxRetries: 3,
    maxHeaderLength: 256,
  },
  caching: {
    highAvailability: false,
    redisUrl: "",
    redisPassword: "",
    redisDb: 0,
    ttlSeconds: 300,
    staleDataToleranceMinutes: 30,
    healthCheckTtlMs: 2000,
    redisMaxRetries: 3,
    redisConnectionTimeout: 5000,
  },
  telemetry: {
    serviceName: "authentication-service",
    serviceVersion: pkg.version,
    environment: "development",
    mode: "both",
    logLevel: "info",
    logsEndpoint: "",
    tracesEndpoint: "",
    metricsEndpoint: "",
    exportTimeout: 30000,
    batchSize: 2048,
    maxQueueSize: 10000,
    enableOpenTelemetry: true,
    enabled: true,
    infrastructure: {
      isKubernetes: false,
      isEcs: false,
      podName: undefined,
      namespace: undefined,
    },
    circuitBreaker: {
      failureThreshold: 5,
      recoveryTimeout: 60000,
      successThreshold: 3,
      monitoringInterval: 10000,
    },
  } satisfies TelemetryConfigWithEnabled,
  profiling: {
    enabled: false,
  },
  continuousProfiling: {
    enabled: false,
    autoTriggerOnSlaViolation: true,
    slaViolationThrottleMinutes: 60,
    outputDir: "profiles/auto",
    maxConcurrentProfiles: 1,
    slaThresholds: [
      { endpoint: "/tokens", p95: 100, p99: 200 },
      { endpoint: "/tokens/validate", p95: 50, p99: 100 },
      { endpoint: "/health", p95: 400, p99: 500 },
    ],
    rollingBufferSize: 100,
  },
  apiInfo: {
    title: "Authentication Service API",
    description:
      "High-performance authentication service with Kong integration, OpenTelemetry observability, and comprehensive health monitoring",
    version: pkg.version,
    contactName: "Simon Owusu",
    contactEmail: "simonowusu@pvh.com",
    licenseName: "Proprietary",
    licenseIdentifier: "UNLICENSED",
    cors: "*",
    versioning: {
      defaultVersion: "v1",
      supportedVersions: ["v1", "v2"],
      // Example deprecation config (commented out - no versions deprecated by default):
      // deprecation: {
      //   v1: {
      //     sunsetDate: "2025-12-31T23:59:59Z",
      //     migrationUrl: "https://docs.example.com/api/v2-migration",
      //     message: "v1 API is deprecated. Please migrate to v2.",
      //   },
      // },
    },
  },
};
