// test/shared/consumers/consumer-data.ts

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
