// test/shared/kong-test-helpers.ts

import { KongAdapter } from "../../src/adapters/kong.adapter";
import type { KongModeType } from "../../src/config";
import { loadConfig } from "../../src/config";
import { INTEGRATION_CONFIG, isIntegrationEnvironmentAvailable } from "../integration/setup";
import { ANONYMOUS_CONSUMER, TEST_CONSUMERS } from "./test-consumers";

// Cache Kong availability check result to avoid repeated network calls
let kongAvailabilityCache: boolean | null = null;
let kongAvailabilityCheckTime: number = 0;
const AVAILABILITY_CACHE_TTL_MS = 30000;

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

export function resetKongAvailabilityCache(): void {
  kongAvailabilityCache = null;
  kongAvailabilityCheckTime = 0;
}

export function getKongAdminUrl(): string {
  return INTEGRATION_CONFIG.KONG_ADMIN_URL;
}

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

export function createKongAdapterWithConfig(
  mode: KongModeType,
  adminUrl: string,
  adminToken: string
): KongAdapter {
  return new KongAdapter(mode, adminUrl, adminToken);
}

export function getSkipMessage(): string {
  return `Skipping: Kong not available at ${INTEGRATION_CONFIG.KONG_ADMIN_URL}`;
}

export async function shouldSkipTest(): Promise<boolean> {
  const available = await checkKongAvailability();
  if (!available) {
    console.log(getSkipMessage());
    return true;
  }
  return false;
}

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

export function getTestConsumer(index: number = 0) {
  if (index < 0 || index >= TEST_CONSUMERS.length) {
    throw new Error(
      `Invalid test consumer index: ${index}. Valid range: 0-${TEST_CONSUMERS.length - 1}`
    );
  }
  return TEST_CONSUMERS[index];
}

export function getAnonymousConsumer() {
  return ANONYMOUS_CONSUMER;
}

export function getAllTestConsumers() {
  return TEST_CONSUMERS;
}

// Re-export commonly used items from integration setup
export { INTEGRATION_CONFIG } from "../integration/setup";
export { ANONYMOUS_CONSUMER, TEST_CONSUMERS } from "./test-consumers";
