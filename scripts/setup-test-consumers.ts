#!/usr/bin/env bun

/* scripts/setup-test-consumers.ts */

import { loadConfig } from '../src/config/index';
import { TEST_CONSUMERS, ANONYMOUS_CONSUMER, type TestConsumer } from '../test/shared/test-consumers';

interface KongConsumer {
  id: string;
  username: string;
  custom_id: string;
  created_at: number;
  updated_at: number;
}

class TestConsumerSetup {
  private config = loadConfig();
  private adminUrl: string;
  private adminToken: string;

  constructor() {
    this.adminUrl = this.config.kong.adminUrl;
    this.adminToken = this.config.kong.adminToken;

    if (!this.adminUrl || !this.adminToken) {
      throw new Error('Kong admin URL and token must be configured in environment variables');
    }
  }

  private async createConsumer(consumer: TestConsumer): Promise<boolean> {
    try {
      console.log(`Creating consumer: ${consumer.id} (${consumer.username})`);

      const response = await fetch(`${this.adminUrl}/core-entities/consumers`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.adminToken}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Test-Setup/1.0'
        },
        body: JSON.stringify({
          username: consumer.username,
          custom_id: consumer.custom_id || consumer.id
        })
      });

      if (response.ok) {
        const created = await response.json() as KongConsumer;
        console.log(`✅ Consumer created: ${created.username} (ID: ${created.id})`);
        return true;
      } else if (response.status === 409) {
        console.log(`⚠️  Consumer already exists: ${consumer.username}`);
        return true;
      } else {
        const errorText = await response.text();
        console.error(`❌ Failed to create consumer ${consumer.username}: ${response.status} ${errorText}`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Error creating consumer ${consumer.username}:`, error);
      return false;
    }
  }

  private async checkConsumerExists(consumer: TestConsumer): Promise<boolean> {
    try {
      const response = await fetch(`${this.adminUrl}/core-entities/consumers/${consumer.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.adminToken}`,
          'User-Agent': 'Test-Setup/1.0'
        }
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  private async deleteConsumer(consumer: TestConsumer): Promise<boolean> {
    try {
      console.log(`Deleting consumer: ${consumer.id}`);

      const response = await fetch(`${this.adminUrl}/core-entities/consumers/${consumer.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.adminToken}`,
          'User-Agent': 'Test-Setup/1.0'
        }
      });

      if (response.ok || response.status === 404) {
        console.log(`✅ Consumer deleted: ${consumer.id}`);
        return true;
      } else {
        const errorText = await response.text();
        console.error(`❌ Failed to delete consumer ${consumer.id}: ${response.status} ${errorText}`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Error deleting consumer ${consumer.id}:`, error);
      return false;
    }
  }

  private async checkKongHealth(): Promise<boolean> {
    try {
      console.log('Checking Kong connectivity...');

      const response = await fetch(this.adminUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.adminToken}`,
          'User-Agent': 'Test-Setup/1.0'
        },
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        console.log('✅ Kong is accessible');
        return true;
      } else {
        console.error(`❌ Kong health check failed: ${response.status}`);
        return false;
      }
    } catch (error) {
      console.error('❌ Kong connection failed:', error);
      return false;
    }
  }

  async setupConsumers(): Promise<boolean> {
    console.log('🚀 Setting up test consumers for authentication service tests\n');

    if (!await this.checkKongHealth()) {
      return false;
    }

    console.log(`\nCreating ${TEST_CONSUMERS.length} test consumers...\n`);

    let allSuccessful = true;
    const allConsumers = [...TEST_CONSUMERS, ANONYMOUS_CONSUMER];

    for (const consumer of allConsumers) {
      const success = await this.createConsumer(consumer);
      if (!success) {
        allSuccessful = false;
      }
    }

    if (allSuccessful) {
      console.log('\n✅ All test consumers created successfully!');
      console.log('\nTest consumers available:');
      allConsumers.forEach(consumer => {
        console.log(`  - ${consumer.id} (${consumer.username}): ${consumer.description}`);
      });
    } else {
      console.log('\n⚠️  Some test consumers could not be created');
    }

    return allSuccessful;
  }

  async cleanupConsumers(): Promise<boolean> {
    console.log('🧹 Cleaning up test consumers\n');

    if (!await this.checkKongHealth()) {
      return false;
    }

    let allSuccessful = true;
    const allConsumers = [...TEST_CONSUMERS, ANONYMOUS_CONSUMER];

    for (const consumer of allConsumers) {
      if (await this.checkConsumerExists(consumer)) {
        const success = await this.deleteConsumer(consumer);
        if (!success) {
          allSuccessful = false;
        }
      } else {
        console.log(`⚠️  Consumer ${consumer.id} does not exist`);
      }
    }

    if (allSuccessful) {
      console.log('\n✅ All test consumers cleaned up successfully!');
    } else {
      console.log('\n⚠️  Some test consumers could not be deleted');
    }

    return allSuccessful;
  }

  async listConsumers(): Promise<void> {
    console.log('📋 Listing test consumers\n');

    if (!await this.checkKongHealth()) {
      return;
    }

    const allConsumers = [...TEST_CONSUMERS, ANONYMOUS_CONSUMER];

    for (const consumer of allConsumers) {
      const exists = await this.checkConsumerExists(consumer);
      const status = exists ? '✅ EXISTS' : '❌ MISSING';
      console.log(`${status} ${consumer.id} (${consumer.username})`);
    }
  }
}

async function main() {
  const command = process.argv[2];
  const setup = new TestConsumerSetup();

  try {
    switch (command) {
      case 'setup':
        const setupSuccess = await setup.setupConsumers();
        process.exit(setupSuccess ? 0 : 1);
        break;

      case 'cleanup':
        const cleanupSuccess = await setup.cleanupConsumers();
        process.exit(cleanupSuccess ? 0 : 1);
        break;

      case 'list':
        await setup.listConsumers();
        process.exit(0);
        break;

      default:
        console.log('Usage: bun run setup-test-consumers [setup|cleanup|list]');
        console.log('');
        console.log('Commands:');
        console.log('  setup   - Create all test consumers in Kong');
        console.log('  cleanup - Delete all test consumers from Kong');
        console.log('  list    - List status of all test consumers');
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}