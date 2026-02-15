// test/shared/consumers/job-isolation.ts

import { ANONYMOUS_CONSUMER, TEST_CONSUMERS, type TestConsumer } from "./consumer-data";

/**
 * Generate job-specific test consumers for parallel CI/CD workflows.
 * This prevents Kong consumer conflicts between parallel jobs.
 */
export const generateJobSpecificConsumers = (jobPrefix: string): TestConsumer[] => {
  return TEST_CONSUMERS.map((consumer) => ({
    id: `${jobPrefix}-${consumer.id}`,
    username: `${jobPrefix}-${consumer.username}`,
    custom_id: `${jobPrefix}-${consumer.custom_id}`,
    description: `${consumer.description} (${jobPrefix} job)`,
  }));
};

/**
 * Generate job-specific anonymous consumer
 */
export const generateJobSpecificAnonymousConsumer = (jobPrefix: string): TestConsumer => ({
  id: `${jobPrefix}-${ANONYMOUS_CONSUMER.id}`,
  username: `${jobPrefix}-${ANONYMOUS_CONSUMER.username}`,
  custom_id: `${jobPrefix}-${ANONYMOUS_CONSUMER.custom_id}`,
  description: `${ANONYMOUS_CONSUMER.description} (${jobPrefix} job)`,
});

/**
 * Get all consumers for a specific job (including anonymous)
 */
export const getJobSpecificConsumers = (
  jobPrefix: string
): { consumers: TestConsumer[]; anonymous: TestConsumer } => {
  return {
    consumers: generateJobSpecificConsumers(jobPrefix),
    anonymous: generateJobSpecificAnonymousConsumer(jobPrefix),
  };
};

/**
 * Job prefixes for parallel CI/CD workflow isolation
 */
export const JOB_PREFIXES = {
  UNIT_TESTS: "unit",
  E2E_TESTS: "e2e",
  PERFORMANCE_TESTS: "perf",
  LOCAL_DEV: "local",
} as const;

export type JobPrefix = (typeof JOB_PREFIXES)[keyof typeof JOB_PREFIXES];
