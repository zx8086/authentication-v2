/* test/k6/utils/test-consumers.js */

// K6-compatible JavaScript version of test consumers

export const TEST_CONSUMERS = [
  {
    id: "test-consumer-001",
    username: "test-consumer-001",
    custom_id: "test-consumer-001",
    description: "Primary test consumer for basic authentication tests",
  },
  {
    id: "test-consumer-002",
    username: "test-consumer-002",
    custom_id: "test-consumer-002",
    description: "Secondary test consumer for multi-user scenarios",
  },
  {
    id: "test-consumer-003",
    username: "test-consumer-003",
    custom_id: "test-consumer-003",
    description: "Third test consumer for multi-user scenarios",
  },
  {
    id: "test-consumer-004",
    username: "test-consumer-004",
    custom_id: "test-consumer-004",
    description: "Load testing consumer for performance tests",
  },
  {
    id: "test-consumer-005",
    username: "test-consumer-005",
    custom_id: "test-consumer-005",
    description: "Load testing consumer for performance tests",
  },
];

export const ANONYMOUS_CONSUMER = {
  id: "anonymous",
  username: "anonymous",
  custom_id: "anonymous",
  description: "Anonymous consumer for testing rejection scenarios",
};

export function getTestConsumer(index = 0) {
  if (index < 0 || index >= TEST_CONSUMERS.length) {
    throw new Error(
      `Invalid test consumer index: ${index}. Available: 0-${TEST_CONSUMERS.length - 1}`
    );
  }
  return TEST_CONSUMERS[index];
}

export function getRandomTestConsumer() {
  const randomIndex = Math.floor(Math.random() * TEST_CONSUMERS.length);
  return TEST_CONSUMERS[randomIndex];
}

export function getAllTestConsumers() {
  return [...TEST_CONSUMERS];
}

export function getLoadTestConsumers() {
  return TEST_CONSUMERS.slice(3); // test-user-004 and test-user-005
}

export function getBasicTestConsumers() {
  return TEST_CONSUMERS.slice(0, 3); // test-user-001, test-user-002, test-user-003
}
