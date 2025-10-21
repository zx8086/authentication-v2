/* test/shared/test-consumers.ts */

export interface TestConsumer {
  id: string;
  username: string;
  custom_id?: string;
  description: string;
}

export const TEST_CONSUMERS: TestConsumer[] = [
  {
    id: "test-user-001",
    username: "test-user-001",
    custom_id: "test-user-001",
    description: "Primary test consumer for basic authentication tests",
  },
  {
    id: "test-user-002",
    username: "test-user-002",
    custom_id: "test-user-002",
    description: "Secondary test consumer for multi-user scenarios",
  },
  {
    id: "test-user-003",
    username: "test-user-003",
    custom_id: "test-user-003",
    description: "Third test consumer for multi-user scenarios",
  },
  {
    id: "test-user-004",
    username: "test-user-004",
    custom_id: "test-user-004",
    description: "Load testing consumer for performance tests",
  },
  {
    id: "test-user-005",
    username: "test-user-005",
    custom_id: "test-user-005",
    description: "Load testing consumer for performance tests",
  },
];

export const ANONYMOUS_CONSUMER: TestConsumer = {
  id: "anonymous",
  username: "anonymous",
  custom_id: "anonymous",
  description: "Anonymous consumer for testing rejection scenarios",
};

export const getTestConsumer = (index: number, jobPrefix?: string): TestConsumer => {
  if (index < 0 || index >= TEST_CONSUMERS.length) {
    throw new Error(
      `Invalid test consumer index: ${index}. Available: 0-${TEST_CONSUMERS.length - 1}`
    );
  }

  const baseConsumer = TEST_CONSUMERS[index];

  if (jobPrefix) {
    return {
      id: `${jobPrefix}-${baseConsumer.id}`,
      username: `${jobPrefix}-${baseConsumer.username}`,
      custom_id: `${jobPrefix}-${baseConsumer.custom_id}`,
      description: `${baseConsumer.description} (${jobPrefix} job)`,
    };
  }

  return baseConsumer;
};

export const getRandomTestConsumer = (): TestConsumer => {
  const randomIndex = Math.floor(Math.random() * TEST_CONSUMERS.length);
  return TEST_CONSUMERS[randomIndex];
};

export const getAllTestConsumers = (): TestConsumer[] => {
  return [...TEST_CONSUMERS];
};

export const getLoadTestConsumers = (): TestConsumer[] => {
  return TEST_CONSUMERS.slice(3); // test-user-004 and test-user-005
};

export const getBasicTestConsumers = (): TestConsumer[] => {
  return TEST_CONSUMERS.slice(0, 3); // test-user-001, test-user-002, test-user-003
};

/**
 * Generate job-specific test consumers for parallel CI/CD workflows
 * This prevents Kong consumer conflicts between parallel jobs
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
