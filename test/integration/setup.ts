/* test/integration/setup.ts */

/**
 * Integration test setup and utilities.
 * Provides helpers for connecting to the Docker-based test environment.
 */

import { ANONYMOUS_CONSUMER, TEST_CONSUMERS } from "../shared/test-consumers";

// Store original fetch
const originalFetch = globalThis.fetch;

// Re-export JWT credentials from shared module (factory-generated)
export {
  getAnonymousJwtCredential,
  getJwtCredentialByIndex,
  JWT_CREDENTIALS,
} from "../shared/test-jwt-credentials";

// Integration test environment configuration
// Priority: INTEGRATION_KONG_ADMIN_URL > KONG_ADMIN_URL (from .env) > localhost default

/**
 * Get Kong Admin URL dynamically to support late env loading.
 */
function getKongAdminUrl(): string {
  return (
    process.env.INTEGRATION_KONG_ADMIN_URL || process.env.KONG_ADMIN_URL || "http://localhost:8001"
  );
}

export const INTEGRATION_CONFIG = {
  // Kong Admin API - uses getter for dynamic resolution
  get KONG_ADMIN_URL(): string {
    return getKongAdminUrl();
  },

  // Kong Proxy (for API requests through Kong)
  get KONG_PROXY_URL(): string {
    return process.env.KONG_PROXY_URL || "http://localhost:8100";
  },

  // Redis (for cache testing)
  get REDIS_URL(): string {
    return process.env.REDIS_URL || "redis://localhost:6380";
  },

  // Auth service (if running locally alongside Kong)
  get AUTH_SERVICE_URL(): string {
    return process.env.AUTH_SERVICE_URL || "http://localhost:3000";
  },

  // Timeouts (static values)
  DEFAULT_TIMEOUT: 10000,
  KONG_READY_TIMEOUT: 60000,
};

// API keys matching test/kong-simulator/kong-proxy.ts
export const API_KEYS = {
  CONSUMER_001: "test-api-key-consumer-001",
  CONSUMER_002: "test-api-key-consumer-002",
  CONSUMER_003: "test-api-key-consumer-003",
  CONSUMER_004: "test-api-key-consumer-004",
  CONSUMER_005: "test-api-key-consumer-005",
  ANONYMOUS: "anonymous-key",
} as const;

/**
 * Wait for Kong to be ready
 * Uses curl as fallback when fetch fails (Bun networking issue with some IPs)
 */
export async function waitForKong(maxRetries = 30, retryInterval = 2000): Promise<boolean> {
  const url = `${INTEGRATION_CONFIG.KONG_ADMIN_URL}/status`;

  for (let i = 0; i < maxRetries; i++) {
    try {
      // Try with fetch first
      const response = await fetch(url);
      if (response.ok) {
        return true;
      }
    } catch {
      // Fallback to curl
      try {
        const proc = Bun.spawn(["curl", "-s", "-f", "-m", "5", url], {
          stdout: "pipe",
          stderr: "ignore",
        });
        const exitCode = await proc.exited;
        if (exitCode === 0) {
          return true;
        }
      } catch {
        // Kong not ready yet
      }
    }
    await new Promise((resolve) => setTimeout(resolve, retryInterval));
  }
  return false;
}

/**
 * Wait for the auth service to be ready
 */
export async function waitForAuthService(maxRetries = 30, retryInterval = 1000): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(`${INTEGRATION_CONFIG.AUTH_SERVICE_URL}/health`);
      if (response.ok) {
        return true;
      }
    } catch {
      // Service not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, retryInterval));
  }
  return false;
}

/**
 * Check if the integration test environment is available
 * Uses curl as fallback when fetch fails (Bun networking issue with some IPs)
 */
export async function isIntegrationEnvironmentAvailable(): Promise<boolean> {
  try {
    const url = `${INTEGRATION_CONFIG.KONG_ADMIN_URL}/status`;

    // Try multiple times with longer timeout
    for (let i = 0; i < 3; i++) {
      try {
        // First try with fetch
        const response = await fetch(url, {
          signal: AbortSignal.timeout(10000),
        });
        if (response.ok) {
          return true;
        }
      } catch (_fetchError) {
        // Fallback to curl if fetch fails (Bun networking bug with some network configs)
        try {
          const proc = Bun.spawn(["curl", "-s", "-f", "-m", "5", url], {
            stdout: "pipe",
            stderr: "ignore",
          });
          const exitCode = await proc.exited;
          if (exitCode === 0) {
            return true;
          }
        } catch {
          // curl also failed, continue retry loop
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Fetch wrapper with curl fallback for Bun networking issues
 * Use this instead of native fetch() in integration tests
 */
export async function fetchWithFallback(
  url: string | URL,
  options?: RequestInit
): Promise<Response> {
  try {
    return await originalFetch(url, options);
  } catch (_fetchError) {
    const urlString = url.toString();
    const method = options?.method || "GET";
    const headers = options?.headers;
    const signal = options?.signal;

    if (signal?.aborted) {
      throw new DOMException("The operation was aborted.", "AbortError");
    }

    // Use curl's own timeout (3 seconds) instead of relying on the signal
    // This ensures fast fallback when Bun's fetch fails due to networking issues
    const args = ["curl", "-s", "-m", "3", "--connect-timeout", "2"];

    // Use -I for HEAD requests (more reliable than -X HEAD)
    // Use -i for other methods to include headers in output
    if (method === "HEAD") {
      args.push("-I");
    } else {
      args.push("-i", "-X", method);
    }

    if (headers) {
      const headerEntries =
        headers instanceof Headers ? Array.from(headers.entries()) : Object.entries(headers);
      for (const [key, value] of headerEntries) {
        args.push("-H", `${key}: ${value}`);
      }
    }

    if (options?.body) {
      args.push("-d", options.body.toString());
    }

    args.push(urlString);

    // Do NOT pass the signal to curl - use curl's own timeout instead
    // This prevents the signal from blocking curl when Bun's fetch fails quickly
    const proc = Bun.spawn(args, {
      stdout: "pipe",
      stderr: "ignore",
    });

    const exitCode = await proc.exited;

    // Check if signal was aborted while curl was running
    if (signal?.aborted) {
      throw new DOMException("The operation was aborted.", "AbortError");
    }

    const output = await new Response(proc.stdout).text();

    // If curl failed (non-zero exit code) or empty output, throw error
    if (exitCode !== 0 || !output.trim()) {
      throw new Error(`curl failed with exit code ${exitCode}: ${output || "Connection refused"}`);
    }

    // Parse curl output (format: HTTP/1.1 200 OK\nheaders...\n\nbody)
    // Handle both \r\n\r\n and \n\n separators
    const separator = output.includes("\r\n\r\n") ? "\r\n\r\n" : "\n\n";
    const [headerSection, ...bodyParts] = output.split(separator);
    const body = bodyParts.join(separator);

    const lineSeparator = output.includes("\r\n") ? "\r\n" : "\n";
    const lines = headerSection.split(lineSeparator);
    const statusLine = lines[0];
    const statusMatch = statusLine.match(/HTTP\/[\d.]+ (\d+)/);
    const status = statusMatch ? Number.parseInt(statusMatch[1], 10) : 500;

    const responseHeaders = new Headers();
    for (let i = 1; i < lines.length; i++) {
      const [key, ...valueParts] = lines[i].split(": ");
      if (key && valueParts.length > 0) {
        responseHeaders.set(key, valueParts.join(": "));
      }
    }

    return new Response(body.trim(), {
      status,
      statusText: statusLine.split(" ").slice(2).join(" "),
      headers: responseHeaders,
    });
  }
}

/**
 * Get consumer by API key
 */
export async function getConsumerByApiKey(
  apiKey: string
): Promise<{ id: string; username: string } | null> {
  try {
    const response = await fetch(
      `${INTEGRATION_CONFIG.KONG_ADMIN_URL}/key-auths/${apiKey}/consumer`
    );
    if (response.ok) {
      return response.json();
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Get JWT credentials for a consumer
 */
export async function getJwtCredentials(
  consumerId: string
): Promise<Array<{ id: string; key: string; secret: string }>> {
  try {
    const response = await fetch(
      `${INTEGRATION_CONFIG.KONG_ADMIN_URL}/consumers/${consumerId}/jwt`
    );
    if (response.ok) {
      const data = await response.json();
      return data.data || [];
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Create a request to Kong with API key authentication
 */
export function createKongRequest(
  path: string,
  apiKey: string,
  options: RequestInit = {}
): Request {
  const url = `${INTEGRATION_CONFIG.KONG_PROXY_URL}${path}`;
  const headers = new Headers(options.headers);
  headers.set("X-API-Key", apiKey);

  return new Request(url, {
    ...options,
    headers,
  });
}

/**
 * Create a request to Kong with consumer headers (simulating Kong proxy behavior)
 */
export function createConsumerRequest(
  path: string,
  consumerId: string,
  consumerUsername: string,
  options: RequestInit = {}
): Request {
  const url = `${INTEGRATION_CONFIG.AUTH_SERVICE_URL}${path}`;
  const headers = new Headers(options.headers);
  headers.set("X-Consumer-ID", consumerId);
  headers.set("X-Consumer-Username", consumerUsername);

  return new Request(url, {
    ...options,
    headers,
  });
}

/**
 * Skip test if integration environment is not available
 */
export function skipIfNoIntegrationEnv(
  testFn: () => void | Promise<void>
): () => void | Promise<void> {
  return async () => {
    const available = await isIntegrationEnvironmentAvailable();
    if (!available) {
      console.log("Skipping: Integration environment not available");
      return;
    }
    return testFn();
  };
}

// Re-export test consumers for convenience
export { ANONYMOUS_CONSUMER, TEST_CONSUMERS };

/**
 * Enable fetch polyfill with curl fallback for integration tests
 * Call this in beforeAll() to override fetch globally
 */
export function enableFetchPolyfill(): void {
  // @ts-expect-error - Polyfill global fetch
  globalThis.fetch = fetchWithFallback;
}

/**
 * Restore original fetch implementation
 * Call this in afterAll() to clean up
 */
export function disableFetchPolyfill(): void {
  globalThis.fetch = originalFetch;
}
