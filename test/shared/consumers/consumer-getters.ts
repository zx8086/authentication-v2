// test/shared/consumers/consumer-getters.ts

import { ANONYMOUS_CONSUMER, TEST_CONSUMERS, type TestConsumer } from "./consumer-data";

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

export const getAllTestConsumers = (): TestConsumer[] => {
  return [...TEST_CONSUMERS];
};

export const getAnonymousConsumer = (): TestConsumer => {
  return ANONYMOUS_CONSUMER;
};
