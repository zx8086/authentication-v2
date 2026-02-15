// test/shared/kong-test-helpers.ts
// DEPRECATED: Import from './kong' or './consumers' instead
// This file re-exports from the new modular structure for backward compatibility

// Consumer utilities (for files that imported from kong-test-helpers)
export {
  ANONYMOUS_CONSUMER,
  getAllTestConsumers,
  getTestConsumer,
  TEST_CONSUMERS,
} from "./consumers";
// Kong utilities
export {
  checkKongAvailability,
  createKongAdapterWithConfig,
  createRealKongAdapter,
  getKongAdminUrl,
  getSkipMessage,
  INTEGRATION_CONFIG,
  resetKongAvailabilityCache,
  setupKongTestContext,
  shouldSkipTest,
} from "./kong";
