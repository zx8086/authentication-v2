// test/shared/test-consumers.ts
// DEPRECATED: Import from './consumers' instead
// This file re-exports from the new modular structure for backward compatibility

export {
  ANONYMOUS_CONSUMER,
  generateJobSpecificAnonymousConsumer,
  generateJobSpecificConsumers,
  getAllTestConsumers,
  getJobSpecificConsumers,
  getTestConsumer,
  JOB_PREFIXES,
  type JobPrefix,
  TEST_CONSUMERS,
  type TestConsumer,
} from "./consumers";
