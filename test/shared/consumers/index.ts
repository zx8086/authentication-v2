// test/shared/consumers/index.ts - Barrel export

export { ANONYMOUS_CONSUMER, TEST_CONSUMERS, type TestConsumer } from "./consumer-data";
export { getAllTestConsumers, getAnonymousConsumer, getTestConsumer } from "./consumer-getters";
export {
  generateJobSpecificAnonymousConsumer,
  generateJobSpecificConsumers,
  getJobSpecificConsumers,
  JOB_PREFIXES,
  type JobPrefix,
} from "./job-isolation";
