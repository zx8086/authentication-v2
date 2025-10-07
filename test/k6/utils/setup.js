/* test/k6/utils/setup.js */

// K6-compatible test consumer setup utility

import http from 'k6/http';
import { TEST_CONSUMERS, ANONYMOUS_CONSUMER } from './test-consumers.js';

export class K6TestSetup {
  constructor() {
    this.adminUrl = __ENV.KONG_ADMIN_URL;
    this.adminToken = __ENV.KONG_ADMIN_TOKEN;

    if (!this.adminUrl || !this.adminToken) {
      throw new Error('KONG_ADMIN_URL and KONG_ADMIN_TOKEN environment variables must be set');
    }
  }

  checkConsumerExists(consumer) {
    const response = http.get(`${this.adminUrl}/core-entities/consumers/${consumer.id}`, {
      headers: {
        'Authorization': `Bearer ${this.adminToken}`,
        'User-Agent': 'K6-Test-Setup/1.0'
      }
    });

    return response.status === 200;
  }

  createConsumer(consumer) {
    if (this.checkConsumerExists(consumer)) {
      console.log(`[K6 Setup] Consumer already exists: ${consumer.username}`);
      return true;
    }

    console.log(`[K6 Setup] Creating consumer: ${consumer.id}`);

    const response = http.post(`${this.adminUrl}/core-entities/consumers`, JSON.stringify({
      username: consumer.username,
      custom_id: consumer.custom_id || consumer.id
    }), {
      headers: {
        'Authorization': `Bearer ${this.adminToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'K6-Test-Setup/1.0'
      }
    });

    if (response.status === 200 || response.status === 201) {
      console.log(`[K6 Setup] Consumer created: ${consumer.username}`);
      return true;
    } else if (response.status === 409 || response.status === 400) {
      console.log(`[K6 Setup] Consumer already exists: ${consumer.username}`);
      return true;
    } else {
      console.error(`[K6 Setup] Failed to create consumer ${consumer.username}: ${response.status} ${response.body}`);
      return false;
    }
  }

  checkKongHealth() {
    console.log('[K6 Setup] Checking Kong connectivity...');

    const response = http.get(this.adminUrl, {
      headers: {
        'Authorization': `Bearer ${this.adminToken}`,
        'User-Agent': 'K6-Test-Setup/1.0'
      },
      timeout: '5s'
    });

    if (response.status === 200) {
      console.log('[K6 Setup] Kong is accessible');
      return true;
    } else {
      console.error(`[K6 Setup] Kong health check failed: ${response.status}`);
      return false;
    }
  }

  setupConsumers() {
    console.log('[K6 Setup] Setting up test consumers for performance tests');

    if (!this.checkKongHealth()) {
      return false;
    }

    const allConsumers = [...TEST_CONSUMERS, ANONYMOUS_CONSUMER];
    let allSuccessful = true;

    for (const consumer of allConsumers) {
      const success = this.createConsumer(consumer);
      if (!success) {
        allSuccessful = false;
      }
    }

    if (allSuccessful) {
      console.log('[K6 Setup] All test consumers ready for performance tests');
    } else {
      console.log('[K6 Setup] Some test consumers could not be created');
    }

    return allSuccessful;
  }
}

// Setup function that can be called from K6 tests
export function setupTestConsumers() {
  const setup = new K6TestSetup();
  return setup.setupConsumers();
}