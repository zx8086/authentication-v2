/* test/shared/test-consumers.ts */

export interface TestConsumer {
  id: string;
  username: string;
  custom_id?: string;
  description: string;
}

export const TEST_CONSUMERS: TestConsumer[] = [
  {
    id: 'test-user-001',
    username: 'test-user-001',
    custom_id: 'test-user-001',
    description: 'Primary test consumer for basic authentication tests'
  },
  {
    id: 'test-user-002',
    username: 'test-user-002',
    custom_id: 'test-user-002',
    description: 'Secondary test consumer for multi-user scenarios'
  },
  {
    id: 'test-user-003',
    username: 'test-user-003',
    custom_id: 'test-user-003',
    description: 'Third test consumer for multi-user scenarios'
  },
  {
    id: 'test-user-004',
    username: 'test-user-004',
    custom_id: 'test-user-004',
    description: 'Load testing consumer for performance tests'
  },
  {
    id: 'test-user-005',
    username: 'test-user-005',
    custom_id: 'test-user-005',
    description: 'Load testing consumer for performance tests'
  }
];

export const ANONYMOUS_CONSUMER: TestConsumer = {
  id: 'anonymous',
  username: 'anonymous',
  custom_id: 'anonymous',
  description: 'Anonymous consumer for testing rejection scenarios'
};

export const getTestConsumer = (index: number): TestConsumer => {
  if (index < 0 || index >= TEST_CONSUMERS.length) {
    throw new Error(`Invalid test consumer index: ${index}. Available: 0-${TEST_CONSUMERS.length - 1}`);
  }
  return TEST_CONSUMERS[index];
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