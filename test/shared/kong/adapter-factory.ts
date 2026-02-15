// test/shared/kong/adapter-factory.ts

import { KongAdapter } from "../../../src/adapters/kong.adapter";
import type { KongModeType } from "../../../src/config";
import { loadConfig } from "../../../src/config";
import { INTEGRATION_CONFIG } from "../../integration/setup";

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
