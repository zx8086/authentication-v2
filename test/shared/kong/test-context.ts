// test/shared/kong/test-context.ts

import type { KongAdapter } from "../../../src/adapters/kong.adapter";
import { INTEGRATION_CONFIG } from "../../integration/setup";
import { createRealKongAdapter } from "./adapter-factory";
import { checkKongAvailability, getSkipMessage } from "./availability";

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
