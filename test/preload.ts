/* test/preload.ts */

/**
 * Test preload file - loads environment variables from .env before tests run.
 * This ensures tests have access to KONG_ADMIN_URL and other configuration.
 */

import { join } from "node:path";
import { file } from "bun";

// Load .env file if it exists
const envPath = join(import.meta.dir, "..", ".env");
const envFile = file(envPath);

if (await envFile.exists()) {
  const envContent = await envFile.text();
  const lines = envContent.split("\n");

  for (const line of lines) {
    // Skip comments and empty lines
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    // Parse KEY=VALUE
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex > 0) {
      const key = trimmed.slice(0, eqIndex).trim();
      let value = trimmed.slice(eqIndex + 1).trim();

      // Remove quotes if present
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      // Only set if not already defined (allow override from environment)
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }
}
