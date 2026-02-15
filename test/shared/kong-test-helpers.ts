// test/shared/kong-test-helpers.ts
// DEPRECATED: Import from './kong/index.ts' or './consumers/index.ts' instead
// This file re-exports from the new modular structure for backward compatibility

// Consumer utilities (for files that imported from kong-test-helpers)
export {
  ANONYMOUS_CONSUMER,
  getAllTestConsumers,
  getTestConsumer,
  TEST_CONSUMERS,
} from "./consumers/index.ts";
// Kong utilities
// Note: Using explicit '.ts' extension for robust module resolution in CI environments
// This fixes intermittent "Cannot find module" errors in Bun's parallel test runner
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
} from "./kong/index.ts";
