/* test/playwright/global-setup.ts */

import { FullConfig } from '@playwright/test';
import { TEST_CONSUMERS, ANONYMOUS_CONSUMER, type TestConsumer } from '../shared/test-consumers';

// Load environment variables explicitly for global setup
import { readFileSync } from 'fs';
import { join } from 'path';

function loadEnvFile() {
  try {
    const envPath = join(process.cwd(), '.env');
    const envContent = readFileSync(envPath, 'utf8');

    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^['"]|['"]$/g, '');
          process.env[key.trim()] = value;
        }
      }
    });
  } catch (error) {
    console.warn('[Playwright Setup] Could not load .env file:', error.message);
  }
}

interface KongConsumer {
  id: string;
  username: string;
  custom_id: string;
  created_at: number;
  updated_at: number;
}

class PlaywrightTestSetup {
  private adminUrl: string;
  private adminToken: string;

  constructor() {
    // Load environment variables first
    loadEnvFile();

    this.adminUrl = process.env.KONG_ADMIN_URL || '';
    this.adminToken = process.env.KONG_ADMIN_TOKEN || '';

    if (!this.adminUrl || !this.adminToken) {
      throw new Error('KONG_ADMIN_URL and KONG_ADMIN_TOKEN environment variables must be configured');
    }
  }

  private async checkConsumerExists(consumer: TestConsumer): Promise<boolean> {
    try {
      const response = await fetch(`${this.adminUrl}/core-entities/consumers/${consumer.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.adminToken}`,
          'User-Agent': 'Playwright-Test-Setup/1.0'
        }
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  private async createConsumer(consumer: TestConsumer): Promise<boolean> {
    try {
      // Check if consumer already exists
      const exists = await this.checkConsumerExists(consumer);
      if (exists) {
        console.log(`[Playwright Setup] Consumer already exists: ${consumer.username}`);
        return true;
      }

      console.log(`[Playwright Setup] Creating consumer: ${consumer.id}`);

      const response = await fetch(`${this.adminUrl}/core-entities/consumers`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.adminToken}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Playwright-Test-Setup/1.0'
        },
        body: JSON.stringify({
          username: consumer.username,
          custom_id: consumer.custom_id || consumer.id
        })
      });

      if (response.ok) {
        const created = await response.json() as KongConsumer;
        console.log(`[Playwright Setup] Consumer created: ${created.username}`);
        return true;
      } else if (response.status === 409 || response.status === 400) {
        console.log(`[Playwright Setup] Consumer already exists: ${consumer.username}`);
        return true;
      } else {
        const errorText = await response.text();
        console.error(`[Playwright Setup] Failed to create consumer ${consumer.username}: ${response.status} ${errorText}`);
        return false;
      }
    } catch (error) {
      console.error(`[Playwright Setup] Error creating consumer ${consumer.username}:`, error);
      return false;
    }
  }

  private async checkKongHealth(): Promise<boolean> {
    try {
      console.log('[Playwright Setup] Checking Kong connectivity...');

      const response = await fetch(this.adminUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.adminToken}`,
          'User-Agent': 'Playwright-Test-Setup/1.0'
        },
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        console.log('[Playwright Setup] Kong is accessible');
        return true;
      } else {
        console.error(`[Playwright Setup] Kong health check failed: ${response.status}`);
        return false;
      }
    } catch (error) {
      console.error('[Playwright Setup] Kong connection failed:', error);
      return false;
    }
  }

  async setupConsumers(): Promise<boolean> {
    console.log('[Playwright Setup] Setting up test consumers for E2E tests');

    if (!await this.checkKongHealth()) {
      return false;
    }

    const allConsumers = [...TEST_CONSUMERS, ANONYMOUS_CONSUMER];
    let allSuccessful = true;

    for (const consumer of allConsumers) {
      const success = await this.createConsumer(consumer);
      if (!success) {
        allSuccessful = false;
      }
    }

    if (allSuccessful) {
      console.log('[Playwright Setup] All test consumers ready for E2E tests');
    } else {
      console.log('[Playwright Setup] Some test consumers could not be created');
    }

    return allSuccessful;
  }
}

async function globalSetup(config: FullConfig) {
  console.log('[Playwright Setup] Starting global setup...');

  try {
    const setup = new PlaywrightTestSetup();
    const success = await setup.setupConsumers();

    if (!success) {
      console.error('[Playwright Setup] Test consumer setup failed');
      process.exit(1);
    }

    console.log('[Playwright Setup] Global setup completed successfully');
  } catch (error) {
    console.error('[Playwright Setup] Global setup failed:', error);
    process.exit(1);
  }
}

export default globalSetup;