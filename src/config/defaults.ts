/* src/config/defaults.ts */

import type { AppConfig } from "./schemas";

// Pillar 1: Default Configuration Object
export const defaultConfig: AppConfig = {
  server: {
    port: 3000,
    nodeEnv: "development",
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
    adminToken: "example-token",
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
  },
  caching: {
    highAvailability: false,
    redisUrl: "",
    redisPassword: "",
    redisDb: 0,
    ttlSeconds: 300,
    staleDataToleranceMinutes: 30,
  },
  telemetry: {
    serviceName: "authentication-service",
    serviceVersion: "1.0.0",
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
  } as any,
  profiling: {
    enabled: false,
  },
  apiInfo: {
    title: "Authentication Service API",
    description:
      "High-performance authentication service with Kong integration, OpenTelemetry observability, and comprehensive health monitoring",
    version: "1.0.0",
    contactName: "Simon Owusu",
    contactEmail: "simonowusu@pvh.com",
    licenseName: "Proprietary",
    licenseIdentifier: "UNLICENSED",
    cors: "*",
  },
};
