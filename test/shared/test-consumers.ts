// test/shared/test-consumers.ts

export interface TestConsumer {
  id: string;
  username: string;
  custom_id?: string;
  description: string;
}

export const TEST_CONSUMERS: TestConsumer[] = [
  {
    id: "f48534e1-4caf-4106-9103-edf38eae7ebc",
    username: "test-consumer-001",
    custom_id: "test-consumer-001",
    description: "Primary test consumer for basic authentication tests",
  },
  {
    id: "1ff7d425-917a-4858-9e99-c2a911ba1b05",
    username: "test-consumer-002",
    custom_id: "test-consumer-002",
    description: "Secondary test consumer for multi-user scenarios",
  },
  {
    id: "73881280-13b4-40b3-aecf-84d981d6ac35",
    username: "test-consumer-003",
    custom_id: "test-consumer-003",
    description: "Third test consumer for multi-user scenarios",
  },
  {
    id: "10f37f4d-99b2-4b93-8e10-4f9090d62ee0",
    username: "test-consumer-004",
    custom_id: "test-consumer-004",
    description: "Load testing consumer for performance tests",
  },
  {
    id: "2df241f5-11db-49a3-b9fb-c797135db9c3",
    username: "test-consumer-005",
    custom_id: "test-consumer-005",
    description: "Load testing consumer for performance tests",
  },
];

export const ANONYMOUS_CONSUMER: TestConsumer = {
  id: "56456a01-65ec-4415-aec8-49fec6403c9c",
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
