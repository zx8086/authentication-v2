/* test/integration/setup.ts */

/**
 * Integration test setup and utilities.
 * Provides helpers for connecting to the Docker-based test environment.
 */

import { ANONYMOUS_CONSUMER, TEST_CONSUMERS } from "../shared/test-consumers";

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

// JWT credentials matching seed-test-consumers.ts
export const JWT_CREDENTIALS: Record<string, { key: string; secret: string; algorithm: string }> = {
  [TEST_CONSUMERS[0].id]: {
    key: "test-jwt-key-001",
    secret: "test-jwt-secret-001-minimum-32-characters-long",
    algorithm: "HS256",
  },
  [TEST_CONSUMERS[1].id]: {
    key: "test-jwt-key-002",
    secret: "test-jwt-secret-002-minimum-32-characters-long",
    algorithm: "HS256",
  },
  [TEST_CONSUMERS[2].id]: {
    key: "test-jwt-key-003",
    secret: "test-jwt-secret-003-minimum-32-characters-long",
    algorithm: "HS256",
  },
  [TEST_CONSUMERS[3].id]: {
    key: "test-jwt-key-004",
    secret: "test-jwt-secret-004-minimum-32-characters-long",
    algorithm: "HS256",
  },
  [TEST_CONSUMERS[4].id]: {
    key: "test-jwt-key-005",
    secret: "test-jwt-secret-005-minimum-32-characters-long",
    algorithm: "HS256",
  },
  [ANONYMOUS_CONSUMER.id]: {
    key: "anonymous-jwt-key",
    secret: "anonymous-jwt-secret-minimum-32-characters-long",
    algorithm: "HS256",
  },
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
 */
export async function waitForKong(maxRetries = 30, retryInterval = 2000): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(`${INTEGRATION_CONFIG.KONG_ADMIN_URL}/status`);
      if (response.ok) {
        return true;
      }
    } catch {
      // Kong not ready yet
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
 */
export async function isIntegrationEnvironmentAvailable(): Promise<boolean> {
  try {
    // Try multiple times with longer timeout
    for (let i = 0; i < 3; i++) {
      try {
        const response = await fetch(`${INTEGRATION_CONFIG.KONG_ADMIN_URL}/status`, {
          signal: AbortSignal.timeout(10000),
        });
        if (response.ok) {
          return true;
        }
      } catch {
        // Retry
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    return false;
  } catch {
    return false;
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
