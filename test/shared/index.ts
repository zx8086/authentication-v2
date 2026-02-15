// test/shared/index.ts - Main barrel export for backward compatibility
// All existing imports continue to work through this file

// Consumer utilities
export {
  ANONYMOUS_CONSUMER,
  generateJobSpecificAnonymousConsumer,
  generateJobSpecificConsumers,
  getAllTestConsumers,
  getAnonymousConsumer,
  getJobSpecificConsumers,
  getTestConsumer,
  JOB_PREFIXES,
  type JobPrefix,
  TEST_CONSUMERS,
  type TestConsumer,
} from "./consumers";

// Credential utilities
export {
  getAnonymousJwtCredential,
  getJwtCredentialByIndex,
  JWT_CREDENTIALS,
  type JwtCredential,
  TestConsumerSecretFactory,
  TestScenarios,
} from "./credentials";

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
