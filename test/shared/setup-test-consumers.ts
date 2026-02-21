#!/usr/bin/env bun

/* test/shared/setup-test-consumers.ts */

import { loadConfig } from "../../src/config/index";
import {
  ANONYMOUS_CONSUMER,
  getJobSpecificConsumers,
  JOB_PREFIXES,
  type JobPrefix,
  TEST_CONSUMERS,
  type TestConsumer,
} from "./test-consumers";

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
      throw new Error("Kong admin URL and token must be configured in environment variables");
    }
  }

  private async createConsumer(consumer: TestConsumer): Promise<boolean> {
    try {
      // Check if consumer already exists first
      const exists = await this.checkConsumerExists(consumer);
      if (exists) {
        console.log(`WARNING:  Consumer already exists: ${consumer.username}`);
        // Still need to ensure JWT credentials exist
        return await this.ensureJWTCredentials(consumer);
      }

      console.log(`Creating consumer: ${consumer.id} (${consumer.username})`);

      // Use appropriate endpoint for Kong mode
      const isKonnect = this.config.kong.mode === "KONNECT";
      const endpoint = isKonnect
        ? `${this.adminUrl}/core-entities/consumers`
        : `${this.adminUrl}/consumers`;

      const headers = {
        "Content-Type": "application/json",
        "User-Agent": "Test-Setup/1.0",
        ...(this.adminToken ? { Authorization: `Bearer ${this.adminToken}` } : {}),
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
        console.log(`[COMPLETE] Consumer created: ${created.username} (ID: ${created.id})`);
        // Create JWT credentials for the new consumer
        return await this.ensureJWTCredentials(consumer);
      } else if (response.status === 409 || response.status === 400) {
        console.log(`WARNING:  Consumer already exists: ${consumer.username}`);
        // Still need to ensure JWT credentials exist
        return await this.ensureJWTCredentials(consumer);
      } else {
        const errorText = await response.text();
        console.error(
          `[FAIL] Failed to create consumer ${consumer.username}: ${response.status} ${errorText}`
        );
        return false;
      }
    } catch (error) {
      console.error(`[FAIL] Error creating consumer ${consumer.username}:`, error);
      return false;
    }
  }

  private async checkConsumerExists(consumer: TestConsumer): Promise<boolean> {
    try {
      // Use appropriate endpoint for Kong mode
      const isKonnect = this.config.kong.mode === "KONNECT";
      const endpoint = isKonnect
        ? `${this.adminUrl}/core-entities/consumers/${consumer.id}`
        : `${this.adminUrl}/consumers/${consumer.id}`;

      const headers = {
        "User-Agent": "Test-Setup/1.0",
        ...(this.adminToken ? { Authorization: `Bearer ${this.adminToken}` } : {}),
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

  private async ensureJWTCredentials(consumer: TestConsumer): Promise<boolean> {
    try {
      // Get consumer UUID first
      const isKonnect = this.config.kong.mode === "KONNECT";
      const endpoint = isKonnect
        ? `${this.adminUrl}/core-entities/consumers/${consumer.id}`
        : `${this.adminUrl}/consumers/${consumer.id}`;

      const headers = {
        "User-Agent": "Test-Setup/1.0",
        ...(this.adminToken ? { Authorization: `Bearer ${this.adminToken}` } : {}),
      };

      const consumerResponse = await fetch(endpoint, {
        method: "GET",
        headers,
      });

      if (!consumerResponse.ok) {
        console.error(`[FAIL] Failed to get consumer UUID for ${consumer.username}`);
        return false;
      }

      const consumerData = (await consumerResponse.json()) as KongConsumer;
      const consumerUuid = consumerData.id;

      // Check existing JWT credentials
      const jwtEndpoint = isKonnect
        ? `${this.adminUrl}/core-entities/consumers/${consumerUuid}/jwt`
        : `${this.adminUrl}/consumers/${consumerUuid}/jwt`;

      const jwtResponse = await fetch(jwtEndpoint, {
        method: "GET",
        headers,
      });

      if (jwtResponse.ok) {
        const jwtData = await jwtResponse.json();
        if (jwtData.data && jwtData.data.length > 0) {
          // Keep exactly one credential per consumer - reuse existing if valid
          const existingCredential = jwtData.data[0];

          // If there are multiple credentials, delete extras (cleanup orphans)
          if (jwtData.data.length > 1) {
            console.log(
              `Cleaning up ${jwtData.data.length - 1} extra JWT credentials for ${consumer.username}`
            );
            for (let i = 1; i < jwtData.data.length; i++) {
              const credential = jwtData.data[i];
              const deleteEndpoint = isKonnect
                ? `${this.adminUrl}/core-entities/consumers/${consumerUuid}/jwt/${credential.id}`
                : `${this.adminUrl}/consumers/${consumerUuid}/jwt/${credential.id}`;

              await fetch(deleteEndpoint, {
                method: "DELETE",
                headers,
              });
            }
          }

          console.log(
            `[COMPLETE] Using existing JWT credential for ${consumer.username}: key=${existingCredential.key}`
          );
          return true;
        }
      }

      // Only create new JWT credentials if none exist
      console.log(`Creating JWT credentials for: ${consumer.username}`);

      // Use key format matching kong/kong.yml declarative config
      const key = `${consumer.username}-jwt-key`;
      const secret = `${consumer.username}-jwt-secret`;

      const createEndpoint = isKonnect
        ? `${this.adminUrl}/core-entities/consumers/${consumerUuid}/jwt`
        : `${this.adminUrl}/consumers/${consumerUuid}/jwt`;

      const createJwtResponse = await fetch(createEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Test-Setup/1.0",
          ...(this.adminToken ? { Authorization: `Bearer ${this.adminToken}` } : {}),
        },
        body: JSON.stringify({
          key: key,
          secret: secret,
        }),
      });

      if (createJwtResponse.ok) {
        const createdCredential = await createJwtResponse.json();
        console.log(
          `[COMPLETE] JWT credentials created for ${consumer.username}: key=${createdCredential.key}`
        );
        return true;
      } else {
        const errorText = await createJwtResponse.text();
        console.error(
          `[FAIL] Failed to create JWT credentials for ${consumer.username}: ${createJwtResponse.status} ${errorText}`
        );
        return false;
      }
    } catch (error) {
      console.error(`[FAIL] Error ensuring JWT credentials for ${consumer.username}:`, error);
      return false;
    }
  }

  private async deleteConsumer(consumer: TestConsumer): Promise<boolean> {
    try {
      console.log(`Deleting consumer: ${consumer.id}`);

      // Use appropriate endpoint for Kong mode
      const isKonnect = this.config.kong.mode === "KONNECT";
      const endpoint = isKonnect
        ? `${this.adminUrl}/core-entities/consumers/${consumer.id}`
        : `${this.adminUrl}/consumers/${consumer.id}`;

      const headers = {
        "User-Agent": "Test-Setup/1.0",
        ...(this.adminToken ? { Authorization: `Bearer ${this.adminToken}` } : {}),
      };

      const response = await fetch(endpoint, {
        method: "DELETE",
        headers,
      });

      if (response.ok || response.status === 404) {
        console.log(`[COMPLETE] Consumer deleted: ${consumer.id}`);
        return true;
      } else {
        const errorText = await response.text();
        console.error(
          `[FAIL] Failed to delete consumer ${consumer.id}: ${response.status} ${errorText}`
        );
        return false;
      }
    } catch (error) {
      console.error(`[FAIL] Error deleting consumer ${consumer.id}:`, error);
      return false;
    }
  }

  private async checkKongHealth(): Promise<boolean> {
    try {
      console.log("Checking Kong connectivity...");

      const response = await fetch(this.adminUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.adminToken}`,
          "User-Agent": "Test-Setup/1.0",
        },
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        console.log("[COMPLETE] Kong is accessible");
        return true;
      } else {
        console.error(`[FAIL] Kong health check failed: ${response.status}`);
        return false;
      }
    } catch (error) {
      console.error("[FAIL] Kong connection failed:", error);
      return false;
    }
  }

  async setupConsumers(jobPrefix?: JobPrefix): Promise<boolean> {
    const consumerSet = jobPrefix
      ? getJobSpecificConsumers(jobPrefix)
      : { consumers: TEST_CONSUMERS, anonymous: ANONYMOUS_CONSUMER };

    const jobDescription = jobPrefix ? ` for ${jobPrefix} job` : "";
    console.log(` Setting up test consumers${jobDescription} for authentication service tests\n`);

    if (!(await this.checkKongHealth())) {
      return false;
    }

    console.log(`\nCreating ${consumerSet.consumers.length} test consumers${jobDescription}...\n`);

    let allSuccessful = true;
    const allConsumers = [...consumerSet.consumers, consumerSet.anonymous];

    for (const consumer of allConsumers) {
      const success = await this.createConsumer(consumer);
      if (!success) {
        allSuccessful = false;
      }
    }

    if (allSuccessful) {
      console.log("\n[COMPLETE] All test consumers created successfully!");
      console.log("\nTest consumers available:");
      allConsumers.forEach((consumer) => {
        console.log(`  - ${consumer.id} (${consumer.username}): ${consumer.description}`);
      });
    } else {
      console.log("\nWARNING:  Some test consumers could not be created");
    }

    return allSuccessful;
  }

  async cleanupConsumers(jobPrefix?: JobPrefix): Promise<boolean> {
    const consumerSet = jobPrefix
      ? getJobSpecificConsumers(jobPrefix)
      : { consumers: TEST_CONSUMERS, anonymous: ANONYMOUS_CONSUMER };

    const jobDescription = jobPrefix ? ` for ${jobPrefix} job` : "";
    console.log(`Cleaning up test consumers${jobDescription}\n`);

    if (!(await this.checkKongHealth())) {
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
        console.log(`WARNING:  Consumer ${consumer.id} does not exist`);
      }
    }

    if (allSuccessful) {
      console.log("\n[COMPLETE] All test consumers cleaned up successfully!");
    } else {
      console.log("\nWARNING:  Some test consumers could not be deleted");
    }

    return allSuccessful;
  }

  async listConsumers(jobPrefix?: JobPrefix): Promise<void> {
    const consumerSet = jobPrefix
      ? getJobSpecificConsumers(jobPrefix)
      : { consumers: TEST_CONSUMERS, anonymous: ANONYMOUS_CONSUMER };

    const jobDescription = jobPrefix ? ` for ${jobPrefix} job` : "";
    console.log(`Listing test consumers${jobDescription}\n`);

    if (!(await this.checkKongHealth())) {
      return;
    }

    const allConsumers = [...consumerSet.consumers, consumerSet.anonymous];

    for (const consumer of allConsumers) {
      const exists = await this.checkConsumerExists(consumer);
      const status = exists ? "[COMPLETE] EXISTS" : "[FAIL] MISSING";
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
      console.error(
        `Invalid job prefix: ${jobPrefixArg}. Valid options: ${validPrefixes.join(", ")}`
      );
      process.exit(1);
    }
  } else if (process.env.CI_JOB_PREFIX) {
    jobPrefix = process.env.CI_JOB_PREFIX as JobPrefix;
  }

  try {
    switch (command) {
      case "setup": {
        const setupSuccess = await setup.setupConsumers(jobPrefix);
        process.exit(setupSuccess ? 0 : 1);
        break;
      }

      case "cleanup": {
        const cleanupSuccess = await setup.cleanupConsumers(jobPrefix);
        process.exit(cleanupSuccess ? 0 : 1);
        break;
      }

      case "list":
        await setup.listConsumers(jobPrefix);
        process.exit(0);
        break;

      default:
        console.log("Usage: bun run setup-test-consumers [setup|cleanup|list] [job-prefix]");
        console.log("");
        console.log("Commands:");
        console.log("  setup   - Create all test consumers in Kong");
        console.log("  cleanup - Delete all test consumers from Kong");
        console.log("  list    - List status of all test consumers");
        console.log("");
        console.log("Job Prefixes (for CI/CD isolation):");
        console.log(`  ${Object.values(JOB_PREFIXES).join(", ")}`);
        console.log("");
        console.log("Examples:");
        console.log("  bun run setup-test-consumers setup unit    # Unit test consumers");
        console.log("  bun run setup-test-consumers setup e2e     # E2E test consumers");
        console.log("  bun run setup-test-consumers setup         # Default consumers");
        process.exit(1);
    }
  } catch (error) {
    console.error("[FAIL] Setup failed:", error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}
