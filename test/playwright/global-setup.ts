/* test/playwright/global-setup.ts */

import type { FullConfig } from "@playwright/test";
// Load environment variables explicitly for global setup
import { readFileSync } from "fs";
import { join } from "path";
import {
  ANONYMOUS_CONSUMER,
  getJobSpecificConsumers,
  JOB_PREFIXES,
  type JobPrefix,
  TEST_CONSUMERS,
  type TestConsumer,
} from "../shared/test-consumers";

function loadEnvFile() {
  try {
    const envPath = join(process.cwd(), ".env");
    const envContent = readFileSync(envPath, "utf8");

    envContent.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const [key, ...valueParts] = trimmed.split("=");
        if (key && valueParts.length > 0) {
          const value = valueParts.join("=").replace(/^['"]|['"]$/g, "");
          process.env[key.trim()] = value;
        }
      }
    });
  } catch (error) {
    console.warn(
      "[Playwright Setup] Could not load .env file:",
      error instanceof Error ? error.message : String(error)
    );
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

    this.adminUrl = process.env.KONG_ADMIN_URL || "";
    this.adminToken = process.env.KONG_ADMIN_TOKEN || "";

    if (!this.adminUrl) {
      throw new Error(
        "KONG_ADMIN_URL environment variable must be configured"
      );
    }

    // KONG_ADMIN_TOKEN can be empty for API Gateway mode without authentication
    if (!this.adminToken) {
      console.log("[Playwright Setup] Running with empty Kong Admin Token (API Gateway mode)")
    }
  }

  private async checkConsumerExists(consumer: TestConsumer): Promise<boolean> {
    try {
      // Try Kong Gateway endpoint first, fallback to Konnect
      const isKongGateway = this.adminToken === "";
      const endpoint = isKongGateway
        ? `${this.adminUrl}/consumers/${consumer.id}`
        : `${this.adminUrl}/core-entities/consumers/${consumer.id}`;

      const headers = {
        "User-Agent": "Playwright-Test-Setup/1.0",
        ...(this.adminToken ? { Authorization: `Bearer ${this.adminToken}` } : {})
      };

      const response = await fetch(endpoint, {
        method: "GET",
        headers,
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
        // Still need to ensure JWT credentials exist
        return await this.ensureJWTCredentials(consumer);
      }

      console.log(`[Playwright Setup] Creating consumer: ${consumer.id}`);

      // Use appropriate endpoint for Kong mode
      const isKongGateway = this.adminToken === "";
      const endpoint = isKongGateway
        ? `${this.adminUrl}/consumers`
        : `${this.adminUrl}/core-entities/consumers`;

      const headers = {
        "Content-Type": "application/json",
        "User-Agent": "Playwright-Test-Setup/1.0",
        ...(this.adminToken ? { Authorization: `Bearer ${this.adminToken}` } : {})
      };

      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          username: consumer.username,
          custom_id: consumer.custom_id || consumer.id,
        }),
      });

      if (response.ok) {
        const created = (await response.json()) as KongConsumer;
        console.log(`[Playwright Setup] Consumer created: ${created.username}`);
        // Create JWT credentials for the new consumer
        return await this.ensureJWTCredentials(consumer);
      } else if (response.status === 409 || response.status === 400) {
        console.log(`[Playwright Setup] Consumer already exists: ${consumer.username}`);
        // Still need to ensure JWT credentials exist
        return await this.ensureJWTCredentials(consumer);
      } else {
        const errorText = await response.text();
        console.error(
          `[Playwright Setup] Failed to create consumer ${consumer.username}: ${response.status} ${errorText}`
        );
        return false;
      }
    } catch (error) {
      console.error(`[Playwright Setup] Error creating consumer ${consumer.username}:`, error);
      return false;
    }
  }

  private async ensureJWTCredentials(consumer: TestConsumer): Promise<boolean> {
    try {
      // Get consumer UUID first
      const isKongGateway = this.adminToken === "";
      const endpoint = isKongGateway
        ? `${this.adminUrl}/consumers/${consumer.id}`
        : `${this.adminUrl}/core-entities/consumers/${consumer.id}`;

      const headers = {
        "User-Agent": "Playwright-Test-Setup/1.0",
        ...(this.adminToken ? { Authorization: `Bearer ${this.adminToken}` } : {})
      };

      const consumerResponse = await fetch(endpoint, {
        method: "GET",
        headers,
      });

      if (!consumerResponse.ok) {
        console.error(`[Playwright Setup] Failed to get consumer UUID for ${consumer.username}`);
        return false;
      }

      const consumerData = (await consumerResponse.json()) as KongConsumer;
      const consumerUuid = consumerData.id;

      // Force delete existing JWT credentials to ensure unique credentials for each consumer
      const jwtEndpoint = isKongGateway
        ? `${this.adminUrl}/consumers/${consumerUuid}/jwt`
        : `${this.adminUrl}/core-entities/consumers/${consumerUuid}/jwt`;

      const jwtResponse = await fetch(jwtEndpoint, {
        method: "GET",
        headers,
      });

      if (jwtResponse.ok) {
        const jwtData = await jwtResponse.json();
        if (jwtData.data && jwtData.data.length > 0) {
          // Delete existing JWT credentials to force unique credential creation
          for (const credential of jwtData.data) {
            console.log(
              `[Playwright Setup] Deleting existing JWT credential for ${consumer.username}: ${credential.id}`
            );

            const deleteEndpoint = isKongGateway
              ? `${this.adminUrl}/consumers/${consumerUuid}/jwt/${credential.id}`
              : `${this.adminUrl}/core-entities/consumers/${consumerUuid}/jwt/${credential.id}`;

            const deleteResponse = await fetch(deleteEndpoint, {
              method: "DELETE",
              headers,
            });

            if (!deleteResponse.ok) {
              console.warn(
                `[Playwright Setup] Failed to delete JWT credential ${credential.id} for ${consumer.username}: ${deleteResponse.status}`
              );
            } else {
              console.log(
                `[Playwright Setup] Deleted JWT credential ${credential.id} for ${consumer.username}`
              );
            }
          }
        }
      }

      // Create new JWT credentials with unique key and secret
      console.log(
        `[Playwright Setup] Creating new unique JWT credentials for: ${consumer.username}`
      );

      const key = `test-key-${consumer.id}-${Date.now()}`;
      const secret = this.generateSecureSecret();

      const createEndpoint = isKongGateway
        ? `${this.adminUrl}/consumers/${consumerUuid}/jwt`
        : `${this.adminUrl}/core-entities/consumers/${consumerUuid}/jwt`;

      const createJwtResponse = await fetch(createEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Playwright-Test-Setup/1.0",
          ...(this.adminToken ? { Authorization: `Bearer ${this.adminToken}` } : {})
        },
        body: JSON.stringify({
          key: key,
          secret: secret,
        }),
      });

      if (createJwtResponse.ok) {
        const createdCredential = await createJwtResponse.json();
        console.log(
          `[Playwright Setup] New JWT credentials created for ${consumer.username}: key=${createdCredential.key}`
        );
        return true;
      } else {
        const errorText = await createJwtResponse.text();
        console.error(
          `[Playwright Setup] Failed to create JWT credentials for ${consumer.username}: ${createJwtResponse.status} ${errorText}`
        );
        return false;
      }
    } catch (error) {
      console.error(
        `[Playwright Setup] Error ensuring JWT credentials for ${consumer.username}:`,
        error
      );
      return false;
    }
  }

  private generateSecureSecret(): string {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  private async checkKongHealth(): Promise<boolean> {
    try {
      console.log("[Playwright Setup] Checking Kong connectivity...");

      const response = await fetch(this.adminUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.adminToken}`,
          "User-Agent": "Playwright-Test-Setup/1.0",
        },
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        console.log("[Playwright Setup] Kong is accessible");
        return true;
      } else {
        console.error(`[Playwright Setup] Kong health check failed: ${response.status}`);
        return false;
      }
    } catch (error) {
      console.error("[Playwright Setup] Kong connection failed:", error);
      return false;
    }
  }

  async setupConsumers(): Promise<boolean> {
    // Check for job prefix in environment
    const jobPrefix = process.env.CI_JOB_PREFIX as JobPrefix;
    const consumerSet = jobPrefix
      ? getJobSpecificConsumers(jobPrefix)
      : { consumers: TEST_CONSUMERS, anonymous: ANONYMOUS_CONSUMER };

    const jobDescription = jobPrefix ? ` for ${jobPrefix} job` : "";
    console.log(`[Playwright Setup] Setting up test consumers${jobDescription} for E2E tests`);

    if (!(await this.checkKongHealth())) {
      return false;
    }

    const allConsumers = [...consumerSet.consumers, consumerSet.anonymous];
    let allSuccessful = true;

    for (const consumer of allConsumers) {
      const success = await this.createConsumer(consumer);
      if (!success) {
        allSuccessful = false;
      }
    }

    if (allSuccessful) {
      console.log(`[Playwright Setup] All test consumers${jobDescription} ready for E2E tests`);
    } else {
      console.log(`[Playwright Setup] Some test consumers${jobDescription} could not be created`);
    }

    return allSuccessful;
  }
}

async function globalSetup(config: FullConfig) {
  console.log("[Playwright Setup] Starting global setup...");

  try {
    const setup = new PlaywrightTestSetup();
    const success = await setup.setupConsumers();

    if (!success) {
      console.error("[Playwright Setup] Test consumer setup failed");
      process.exit(1);
    }

    console.log("[Playwright Setup] Global setup completed successfully");
  } catch (error) {
    console.error("[Playwright Setup] Global setup failed:", error);
    process.exit(1);
  }
}

export default globalSetup;
