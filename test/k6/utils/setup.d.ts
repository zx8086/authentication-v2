/* test/k6/utils/setup.d.ts */

// Type declarations for K6 test consumer setup utility

export declare class K6TestSetup {
  adminUrl: string;
  adminToken: string;

  constructor();

  checkConsumerExists(consumer: { id: string; username: string }): boolean;
  createConsumer(consumer: { id: string; username: string; custom_id?: string }): boolean;
  checkKongHealth(): boolean;
  setupConsumers(): boolean;
}

export declare function setupTestConsumers(): boolean;