/* test/kong-simulator/kong-proxy.ts */

import { ANONYMOUS_CONSUMER, TEST_CONSUMERS } from "../shared/test-consumers";

interface ApiKeyMapping {
  [key: string]: {
    consumerId: string;
    username: string;
    isAnonymous: boolean;
  };
}

// Map API keys to consumer information
const API_KEY_MAPPINGS: ApiKeyMapping = {
  "test-api-key-consumer-001": {
    consumerId: TEST_CONSUMERS[0].id,
    username: TEST_CONSUMERS[0].username,
    isAnonymous: false,
  },
  "test-api-key-consumer-002": {
    consumerId: TEST_CONSUMERS[1].id,
    username: TEST_CONSUMERS[1].username,
    isAnonymous: false,
  },
  "test-api-key-consumer-003": {
    consumerId: TEST_CONSUMERS[2].id,
    username: TEST_CONSUMERS[2].username,
    isAnonymous: false,
  },
  "test-api-key-consumer-004": {
    consumerId: TEST_CONSUMERS[3].id,
    username: TEST_CONSUMERS[3].username,
    isAnonymous: false,
  },
  "test-api-key-consumer-005": {
    consumerId: TEST_CONSUMERS[4].id,
    username: TEST_CONSUMERS[4].username,
    isAnonymous: false,
  },
  "test-api-key-anonymous": {
    consumerId: ANONYMOUS_CONSUMER.id,
    username: ANONYMOUS_CONSUMER.username,
    isAnonymous: true,
  },
};

/**
 * Simple Kong Gateway simulator for local testing
 * Validates API keys and forwards requests with Kong headers
 * Also simulates Kong Admin API for consumer management
 */
export class KongSimulator {
  private authServiceUrl: string;
  private proxyPort: number;

  constructor(authServiceUrl = "http://localhost:3000", proxyPort = 8000) {
    this.authServiceUrl = authServiceUrl;
    this.proxyPort = proxyPort;
  }

  async start(): Promise<void> {
    const _server = Bun.serve({
      port: this.proxyPort,
      fetch: this.handleRequest.bind(this),
    });

    console.log(`Kong Simulator running on http://localhost:${this.proxyPort}`);
    console.log(`Proxying to authentication service at ${this.authServiceUrl}`);
  }

  private async handleRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Handle Kong Admin API calls
    if (url.pathname.startsWith("/consumers/")) {
      return await this.handleKongAdminAPI(request, url);
    }

    // Only proxy authentication service endpoints
    if (!["/tokens", "/health", "/metrics"].includes(url.pathname)) {
      return new Response("Not Found", { status: 404 });
    }

    // Extract API key from headers
    const apiKey = request.headers.get("X-API-Key") || request.headers.get("x-api-key");

    if (!apiKey) {
      return new Response(JSON.stringify({ message: "No API key found" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate API key and get consumer info
    const consumer = API_KEY_MAPPINGS[apiKey];
    if (!consumer) {
      return new Response(JSON.stringify({ message: "Invalid API key" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Forward request to authentication service with Kong headers
    const forwardUrl = `${this.authServiceUrl}${url.pathname}${url.search}`;
    const forwardHeaders = new Headers(request.headers);

    // Remove the API key header (Kong would do this)
    forwardHeaders.delete("X-API-Key");
    forwardHeaders.delete("x-api-key");

    // Add Kong consumer headers
    forwardHeaders.set("X-Consumer-ID", consumer.consumerId);
    forwardHeaders.set("X-Consumer-Username", consumer.username);
    forwardHeaders.set("X-Anonymous-Consumer", consumer.isAnonymous.toString());

    // Add Kong-like headers
    forwardHeaders.set("X-Kong-Proxy-Latency", "1");
    forwardHeaders.set("X-Kong-Upstream-Latency", "1");

    try {
      const response = await fetch(forwardUrl, {
        method: request.method,
        headers: forwardHeaders,
        body: request.body,
      });

      // Return the response from authentication service
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    } catch (error) {
      console.error("Error proxying request:", error);
      return new Response(JSON.stringify({ message: "Service unavailable" }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  /**
   * Handle Kong Admin API calls for consumer secrets
   */
  private async handleKongAdminAPI(request: Request, url: URL): Promise<Response> {
    const pathParts = url.pathname.split("/");

    // Handle /consumers/{id}/jwt requests
    if (pathParts.length >= 4 && pathParts[3] === "jwt") {
      const consumerId = pathParts[2];

      // Find consumer by ID
      let consumer = Object.values(API_KEY_MAPPINGS).find((c) => c.consumerId === consumerId);
      if (!consumer) {
        // Try to find by username if ID lookup fails
        consumer = Object.values(API_KEY_MAPPINGS).find((c) => c.username === consumerId);
      }

      if (!consumer) {
        return new Response(JSON.stringify({ message: "Not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Generate a mock JWT secret for this consumer
      const jwtSecret = {
        id: `jwt-secret-${consumer.consumerId}`,
        consumer: {
          id: consumer.consumerId,
        },
        key: `test-key-${consumer.username}-${Date.now()}`,
        secret: this.generateSecureSecret(),
        created_at: Math.floor(Date.now() / 1000),
        updated_at: Math.floor(Date.now() / 1000),
      };

      return new Response(JSON.stringify(jwtSecret), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle /consumers/{id} requests
    if (pathParts.length === 3) {
      const consumerId = pathParts[2];

      // Find consumer by ID
      let consumer = Object.values(API_KEY_MAPPINGS).find((c) => c.consumerId === consumerId);
      if (!consumer) {
        // Try to find by username if ID lookup fails
        consumer = Object.values(API_KEY_MAPPINGS).find((c) => c.username === consumerId);
      }

      if (!consumer) {
        return new Response(JSON.stringify({ message: "Not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Return mock consumer data
      const consumerData = {
        id: consumer.consumerId,
        username: consumer.username,
        custom_id: consumer.username,
        created_at: Math.floor(Date.now() / 1000),
        updated_at: Math.floor(Date.now() / 1000),
      };

      return new Response(JSON.stringify(consumerData), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ message: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  private generateSecureSecret(): string {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }
}

// Start the simulator if this file is run directly
if (import.meta.main) {
  const simulator = new KongSimulator();
  await simulator.start();
}
