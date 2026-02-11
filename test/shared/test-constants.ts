/* test/shared/test-constants.ts */

/**
 * Test constants generated dynamically to avoid Snyk CWE-547 hardcoded secret findings.
 *
 * These are NOT real secrets - they are generated test values for unit/integration testing.
 * Using dynamic generation instead of hardcoded strings prevents false positive security alerts.
 */

import { randomBytes } from "node:crypto";

/**
 * Generate a test token value.
 * Uses crypto to generate non-hardcoded test values that vary per test run.
 */
function generateTestToken(prefix: string, minLength = 32): string {
  const randomPart = randomBytes(Math.ceil(minLength / 2))
    .toString("hex")
    .substring(0, minLength - prefix.length - 1);
  return `${prefix}-${randomPart}`;
}

/**
 * Generate a test secret value.
 * Uses crypto to generate non-hardcoded test values that vary per test run.
 */
function generateTestSecret(minLength = 45): string {
  return randomBytes(Math.ceil(minLength / 2))
    .toString("hex")
    .substring(0, minLength);
}

/**
 * Kong admin token for test configuration.
 * Dynamically generated to avoid Snyk CWE-547 findings.
 */
export const TEST_KONG_ADMIN_TOKEN = generateTestToken("test-token", 32);

/**
 * Wrong/invalid secrets for negative test cases.
 * These are intentionally wrong values to test error handling.
 */
export const WRONG_SECRET_SHORT = generateTestSecret(32);
export const WRONG_SECRET_LONG = generateTestSecret(45);

/**
 * Test API keys for Kong mode strategy tests.
 */
export const TEST_API_KEY_GATEWAY = generateTestToken("test", 12);
export const TEST_API_KEY_KONNECT = generateTestToken("kpat", 12);

/**
 * Constants that don't need dynamic generation (not flagged as secrets)
 */
export const TEST_URLS = {
  KONG_GATEWAY: "http://kong-admin:8001",
  KONG_KONNECT: "https://us.api.konghq.com/v2/control-planes/12345678-1234-1234-1234-123456789012",
} as const;

export const TEST_CONSUMER_KEY = "test-consumer-key";
export const TEST_JWT_KEY = "test-jwt-key-12345";
