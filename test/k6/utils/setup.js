/* test/k6/utils/setup.js */

// K6-compatible test consumer setup utility
// Uses shared test consumers that are already configured in Kong
// No need for Kong admin API access - consumers are pre-configured

import { ANONYMOUS_CONSUMER, TEST_CONSUMERS } from "./test-consumers.js";

export class K6TestSetup {
  constructor() {
    // K6 tests use the shared test consumers that are already set up in Kong
    // Consumers: test-consumer-001, test-consumer-002, test-consumer-003, test-consumer-004, test-consumer-005
    console.log("K6 using shared test consumers:", TEST_CONSUMERS.map(c => c.id).join(", "));
  }

  getTestConsumers() {
    return TEST_CONSUMERS;
  }

  getAnonymousConsumer() {
    return ANONYMOUS_CONSUMER;
  }

  getAllConsumers() {
    return [...TEST_CONSUMERS, ANONYMOUS_CONSUMER];
  }
}

// Setup function that can be called from K6 tests
// Returns the shared test consumers (no Kong API calls needed)
export function setupTestConsumers() {
  const setup = new K6TestSetup();
  console.log("[K6 Setup] Using pre-configured shared test consumers");
  return {
    success: true,
    consumers: setup.getTestConsumers(),
    anonymous: setup.getAnonymousConsumer()
  };
}