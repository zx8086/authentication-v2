/* test/shared/kong-test-helpers.ts */

/**
 * Kong test helpers for Bun tests.
 * Provides utilities for checking Kong availability and creating real adapters.
 * Tests will skip gracefully when Kong is unavailable.
 */

import { KongAdapter } from "../../src/adapters/kong.adapter";
import type { KongModeType } from "../../src/config";
import { loadConfig } from "../../src/config";
import { INTEGRATION_CONFIG, isIntegrationEnvironmentAvailable } from "../integration/setup";
import { ANONYMOUS_CONSUMER, TEST_CONSUMERS } from "./test-consumers";

// Cache Kong availability check result to avoid repeated network calls
let kongAvailabilityCache: boolean | null = null;
let kongAvailabilityCheckTime: number = 0;
const AVAILABILITY_CACHE_TTL_MS = 30000; // 30 seconds

/**
 * Check if Kong is available at the configured URL.
 * Results are cached for 30 seconds to avoid repeated network calls during test runs.
 */
export async function checkKongAvailability(): Promise<boolean> {
  const now = Date.now();

  // Use cached result if still valid
  if (
    kongAvailabilityCache !== null &&
    now - kongAvailabilityCheckTime < AVAILABILITY_CACHE_TTL_MS
  ) {
    return kongAvailabilityCache;
  }

  kongAvailabilityCache = await isIntegrationEnvironmentAvailable();
  kongAvailabilityCheckTime = now;

  return kongAvailabilityCache;
}

/**
 * Reset the Kong availability cache.
 * Useful for tests that need to re-check Kong availability.
 */
export function resetKongAvailabilityCache(): void {
  kongAvailabilityCache = null;
  kongAvailabilityCheckTime = 0;
}

/**
 * Get the Kong Admin URL from configuration.
 * Priority: KONG_ADMIN_URL from .env > localhost default
 */
export function getKongAdminUrl(): string {
  return INTEGRATION_CONFIG.KONG_ADMIN_URL;
}

/**
 * Create a real KongAdapter using configuration from .env.
 * Returns null if Kong configuration is not available.
 */
export async function createRealKongAdapter(): Promise<KongAdapter | null> {
  try {
    const config = loadConfig();
    const kongConfig = config.kong;

    // Use the admin URL from integration config (which reads from .env)
    const adminUrl = INTEGRATION_CONFIG.KONG_ADMIN_URL;
    const adminToken = kongConfig.adminToken || "";

    return new KongAdapter(kongConfig.mode as KongModeType, adminUrl, adminToken);
  } catch (error) {
    console.error("Failed to create KongAdapter:", error);
    return null;
  }
}

/**
 * Create a KongAdapter with explicit configuration.
 * Useful for tests that need specific Kong settings.
 */
export function createKongAdapterWithConfig(
  mode: KongModeType,
  adminUrl: string,
  adminToken: string
): KongAdapter {
  return new KongAdapter(mode, adminUrl, adminToken);
}

/**
 * Skip message to log when Kong is unavailable.
 */
export function getSkipMessage(): string {
  return `Skipping: Kong not available at ${INTEGRATION_CONFIG.KONG_ADMIN_URL}`;
}

/**
 * Log skip message and return early if Kong is unavailable.
 * Use this at the start of test functions that require Kong.
 *
 * @example
 * it("should get consumer secret", async () => {
 *   if (await shouldSkipTest()) return;
 *   // ... test code
 * });
 */
export async function shouldSkipTest(): Promise<boolean> {
  const available = await checkKongAvailability();
  if (!available) {
    console.log(getSkipMessage());
    return true;
  }
  return false;
}

/**
 * Wrapper for beforeAll that checks Kong availability.
 * Sets up shared test state if Kong is available.
 *
 * @example
 * let kongAdapter: KongAdapter | null = null;
 * let kongAvailable = false;
 *
 * beforeAll(async () => {
 *   const result = await setupKongTestContext();
 *   kongAvailable = result.available;
 *   kongAdapter = result.adapter;
 * });
 */
export async function setupKongTestContext(): Promise<{
  available: boolean;
  adapter: KongAdapter | null;
  adminUrl: string;
}> {
  const available = await checkKongAvailability();
  let adapter: KongAdapter | null = null;

  if (available) {
    adapter = await createRealKongAdapter();
  } else {
    console.log(getSkipMessage());
  }

  return {
    available,
    adapter,
    adminUrl: INTEGRATION_CONFIG.KONG_ADMIN_URL,
  };
}

/**
 * Get test consumer data for use in tests.
 * Returns the first test consumer by default.
 */
export function getTestConsumer(index: number = 0) {
  if (index < 0 || index >= TEST_CONSUMERS.length) {
    throw new Error(
      `Invalid test consumer index: ${index}. Valid range: 0-${TEST_CONSUMERS.length - 1}`
    );
  }
  return TEST_CONSUMERS[index];
}

/**
 * Get the anonymous consumer for rejection testing.
 */
export function getAnonymousConsumer() {
  return ANONYMOUS_CONSUMER;
}

/**
 * Get all test consumers.
 */
export function getAllTestConsumers() {
  return TEST_CONSUMERS;
}

// Re-export commonly used items from integration setup
export { INTEGRATION_CONFIG } from "../integration/setup";
export { ANONYMOUS_CONSUMER, TEST_CONSUMERS } from "./test-consumers";
