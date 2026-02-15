// test/shared/kong/index.ts - Barrel export

// Re-export INTEGRATION_CONFIG for convenience
export { INTEGRATION_CONFIG } from "../../integration/setup";
export { createKongAdapterWithConfig, createRealKongAdapter } from "./adapter-factory";
export {
  checkKongAvailability,
  getKongAdminUrl,
  getSkipMessage,
  resetKongAvailabilityCache,
  shouldSkipTest,
} from "./availability";
export { setupKongTestContext } from "./test-context";
