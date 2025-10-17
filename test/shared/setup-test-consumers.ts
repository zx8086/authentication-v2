#!/usr/bin/env bun

/* test/shared/setup-test-consumers.ts */

import { loadConfig } from '../../src/config/index';
import {
  TEST_CONSUMERS,
  ANONYMOUS_CONSUMER,
  type TestConsumer,
  getJobSpecificConsumers,
  JOB_PREFIXES,
  type JobPrefix
} from './test-consumers';

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

  async setupConsumers(jobPrefix?: JobPrefix): Promise<boolean> {
    const consumerSet = jobPrefix
      ? getJobSpecificConsumers(jobPrefix)
      : { consumers: TEST_CONSUMERS, anonymous: ANONYMOUS_CONSUMER };

    const jobDescription = jobPrefix ? ` for ${jobPrefix} job` : '';
    console.log(`🚀 Setting up test consumers${jobDescription} for authentication service tests\n`);

    if (!await this.checkKongHealth()) {
      return false;
    }

    console.log(`\nCreating ${consumerSet.consumers.length} test consumers${jobDescription}...\n`);

    let allSuccessful = true;
    const allConsumers = [...consumerSet.consumers, consumerSet.anonymous];

    for (const consumer of allConsumers) {
      // Check if consumer already exists
      const exists = await this.checkConsumerExists(consumer);
      if (exists) {
        console.log(`✅ Consumer already exists: ${consumer.username}`);
        continue;
      }

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

  async cleanupConsumers(jobPrefix?: JobPrefix): Promise<boolean> {
    const consumerSet = jobPrefix
      ? getJobSpecificConsumers(jobPrefix)
      : { consumers: TEST_CONSUMERS, anonymous: ANONYMOUS_CONSUMER };

    const jobDescription = jobPrefix ? ` for ${jobPrefix} job` : '';
    console.log(`🧹 Cleaning up test consumers${jobDescription}\n`);

    if (!await this.checkKongHealth()) {
      return false;
    }

    let allSuccessful = true;
    const allConsumers = [...consumerSet.consumers, consumerSet.anonymous];

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

  async listConsumers(jobPrefix?: JobPrefix): Promise<void> {
    const consumerSet = jobPrefix
      ? getJobSpecificConsumers(jobPrefix)
      : { consumers: TEST_CONSUMERS, anonymous: ANONYMOUS_CONSUMER };

    const jobDescription = jobPrefix ? ` for ${jobPrefix} job` : '';
    console.log(`📋 Listing test consumers${jobDescription}\n`);

    if (!await this.checkKongHealth()) {
      return;
    }

    const allConsumers = [...consumerSet.consumers, consumerSet.anonymous];

    for (const consumer of allConsumers) {
      const exists = await this.checkConsumerExists(consumer);
      const status = exists ? '✅ EXISTS' : '❌ MISSING';
      console.log(`${status} ${consumer.id} (${consumer.username})`);
    }
  }
}

async function main() {
  const command = process.argv[2];
  const jobPrefixArg = process.argv[3]; // Optional job prefix argument
  const setup = new TestConsumerSetup();

  // Parse job prefix from argument or environment variable
  let jobPrefix: JobPrefix | undefined;
  if (jobPrefixArg) {
    const validPrefixes = Object.values(JOB_PREFIXES);
    if (validPrefixes.includes(jobPrefixArg as JobPrefix)) {
      jobPrefix = jobPrefixArg as JobPrefix;
    } else {
      console.error(`Invalid job prefix: ${jobPrefixArg}. Valid options: ${validPrefixes.join(', ')}`);
      process.exit(1);
    }
  } else if (process.env.CI_JOB_PREFIX) {
    jobPrefix = process.env.CI_JOB_PREFIX as JobPrefix;
  }

  try {
    switch (command) {
      case 'setup':
        const setupSuccess = await setup.setupConsumers(jobPrefix);
        process.exit(setupSuccess ? 0 : 1);
        break;

      case 'cleanup':
        const cleanupSuccess = await setup.cleanupConsumers(jobPrefix);
        process.exit(cleanupSuccess ? 0 : 1);
        break;

      case 'list':
        await setup.listConsumers(jobPrefix);
        process.exit(0);
        break;

      default:
        console.log('Usage: bun run setup-test-consumers [setup|cleanup|list] [job-prefix]');
        console.log('');
        console.log('Commands:');
        console.log('  setup   - Create all test consumers in Kong');
        console.log('  cleanup - Delete all test consumers from Kong');
        console.log('  list    - List status of all test consumers');
        console.log('');
        console.log('Job Prefixes (for CI/CD isolation):');
        console.log(`  ${Object.values(JOB_PREFIXES).join(', ')}`);
        console.log('');
        console.log('Examples:');
        console.log('  bun run setup-test-consumers setup unit    # Unit test consumers');
        console.log('  bun run setup-test-consumers setup e2e     # E2E test consumers');
        console.log('  bun run setup-test-consumers setup         # Default consumers');
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