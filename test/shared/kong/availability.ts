// test/shared/kong/availability.ts

import { INTEGRATION_CONFIG, isIntegrationEnvironmentAvailable } from "../../integration/setup";

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
