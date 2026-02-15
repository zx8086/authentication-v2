// test/shared/kong-test-helpers.ts
// Re-exports test utilities for backward compatibility
// Using direct file imports to avoid barrel export issues in CI

// Re-export INTEGRATION_CONFIG from integration setup
export { INTEGRATION_CONFIG } from "../integration/setup";
// Consumer utilities - import directly from source files
export {
  ANONYMOUS_CONSUMER,
  TEST_CONSUMERS,
  type TestConsumer,
} from "./consumers/consumer-data";
export { getAllTestConsumers, getTestConsumer } from "./consumers/consumer-getters";
export { createKongAdapterWithConfig, createRealKongAdapter } from "./kong/adapter-factory";
// Kong utilities - import directly from source files
export {
  checkKongAvailability,
  getKongAdminUrl,
  getSkipMessage,
  resetKongAvailabilityCache,
  shouldSkipTest,
} from "./kong/availability";
export { setupKongTestContext } from "./kong/test-context";
