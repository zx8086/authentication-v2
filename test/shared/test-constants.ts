// test/shared/test-constants.ts

// Test constants generated dynamically to avoid Snyk CWE-547 hardcoded secret findings.
// These are NOT real secrets - they are generated test values for unit/integration testing.

import { randomBytes } from "node:crypto";

function generateTestToken(prefix: string, minLength = 32): string {
  const randomPart = randomBytes(Math.ceil(minLength / 2))
    .toString("hex")
    .substring(0, minLength - prefix.length - 1);
  return `${prefix}-${randomPart}`;
}

function generateTestSecret(minLength = 45): string {
  return randomBytes(Math.ceil(minLength / 2))
    .toString("hex")
    .substring(0, minLength);
}

export const TEST_KONG_ADMIN_TOKEN = generateTestToken("test-token", 32);

export const WRONG_SECRET_SHORT = generateTestSecret(32);
export const WRONG_SECRET_LONG = generateTestSecret(45);

export const TEST_API_KEY_GATEWAY = generateTestToken("test", 12);
export const TEST_API_KEY_KONNECT = generateTestToken("kpat", 12);

export const TEST_URLS = {
  KONG_GATEWAY: "http://kong-admin:8001",
  KONG_KONNECT: "https://us.api.konghq.com/v2/control-planes/12345678-1234-1234-1234-123456789012",
} as const;

export const TEST_CONSUMER_KEY = "test-consumer-key";
export const TEST_JWT_KEY = "test-jwt-key-12345";

// Standard JWT header (Base64url encoded {"alg":"HS256","typ":"JWT"}) - appears in all HS256 JWTs
export const JWT_STANDARD_HEADER = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9";

export const TEST_SECRET_MIN_32 = generateTestSecret(34);

export const TEST_TELEMETRY_CIRCUIT_BREAKER = {
  failureThreshold: 5,
  recoveryTimeout: 60000,
  successThreshold: 3,
  monitoringInterval: 10000,
} as const;

export const TEST_SERVER_CONFIG_DEFAULTS = {
  maxRequestBodySize: 10 * 1024 * 1024,
  requestTimeoutMs: 30000,
} as const;

export const TEST_KONG_CONFIG_DEFAULTS = {
  secretCreationMaxRetries: 3,
  maxHeaderLength: 256,
} as const;

export const TEST_CACHING_CONFIG_DEFAULTS = {
  healthCheckTtlMs: 2000,
  redisMaxRetries: 3,
  redisConnectionTimeout: 5000,
} as const;
