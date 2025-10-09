/* test/k6/utils/test-consumers.d.ts */

// Type declarations for test consumers

export interface TestConsumer {
  id: string;
  username: string;
  custom_id: string;
  description: string;
}

export declare const TEST_CONSUMERS: TestConsumer[];

export declare const ANONYMOUS_CONSUMER: TestConsumer;

export declare function getTestConsumer(index?: number): TestConsumer;