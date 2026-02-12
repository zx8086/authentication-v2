/* test/kong-simulator/kong-admin.ts */

import { ANONYMOUS_CONSUMER, TEST_CONSUMERS } from "../shared/test-consumers";

/**
 * Kong Admin API simulator for local testing
 * Simulates Kong Admin API endpoints that the authentication service uses
 */
export class KongAdminSimulator {
  private adminPort: number;

  constructor(adminPort = 8001) {
    this.adminPort = adminPort;
  }

  async start(): Promise<void> {
    const _server = Bun.serve({
      port: this.adminPort,
      fetch: this.handleRequest.bind(this),
    });

    console.log(`Kong Admin API Simulator running on http://localhost:${this.adminPort}`);
    console.log(`Simulating Kong Admin API for consumer management`);
  }

  private async handleRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");

    // Add CORS headers for all responses
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    // Handle preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    // Handle Kong health check and status
    if (url.pathname === "/" || url.pathname === "" || url.pathname === "/status") {
      return new Response(
        JSON.stringify({
          hostname: "kong-admin-simulator",
          node_id: "simulator-node",
          version: "3.9.1-simulator",
          configuration: { database: "off" },
          status: "running",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Handle /consumers/{id}/jwt requests
    if (pathParts.length >= 4 && pathParts[1] === "consumers" && pathParts[3] === "jwt") {
      const consumerId = pathParts[2];
      return await this.handleConsumerJWT(consumerId, request, corsHeaders);
    }

    // Handle /consumers/{id} requests
    if (pathParts.length === 3 && pathParts[1] === "consumers") {
      const consumerId = pathParts[2];
      return await this.handleConsumer(consumerId, corsHeaders);
    }

    return new Response(JSON.stringify({ message: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  private async handleConsumerJWT(
    consumerId: string,
    request: Request,
    corsHeaders: Record<string, string>
  ): Promise<Response> {
    // Find consumer by ID or username
    const consumer = this.findConsumer(consumerId);

    if (!consumer) {
      return new Response(JSON.stringify({ message: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Generate a mock JWT secret for this consumer
    const jwtSecret = {
      id: `jwt-secret-${consumer.id}`,
      consumer: {
        id: consumer.id,
      },
      key: `test-key-${consumer.username}-${Date.now()}`,
      secret: this.generateSecureSecret(),
      created_at: Math.floor(Date.now() / 1000),
      updated_at: Math.floor(Date.now() / 1000),
    };

    console.log(
      `Kong Admin: Generated JWT secret for consumer ${consumer.username} (${consumer.id})`
    );

    return new Response(JSON.stringify(jwtSecret), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  private async handleConsumer(
    consumerId: string,
    corsHeaders: Record<string, string>
  ): Promise<Response> {
    // Find consumer by ID or username
    const consumer = this.findConsumer(consumerId);

    if (!consumer) {
      return new Response(JSON.stringify({ message: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Return mock consumer data
    const consumerData = {
      id: consumer.id,
      username: consumer.username,
      custom_id: consumer.custom_id || consumer.id,
      created_at: Math.floor(Date.now() / 1000),
      updated_at: Math.floor(Date.now() / 1000),
    };

    console.log(`Kong Admin: Retrieved consumer ${consumer.username} (${consumer.id})`);

    return new Response(JSON.stringify(consumerData), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  private findConsumer(consumerId: string) {
    // Check all test consumers
    const allConsumers = [...TEST_CONSUMERS, ANONYMOUS_CONSUMER];

    // Try to find by ID first
    let consumer = allConsumers.find((c) => c.id === consumerId);

    // If not found by ID, try by username
    if (!consumer) {
      consumer = allConsumers.find((c) => c.username === consumerId);
    }

    return consumer;
  }

  private generateSecureSecret(): string {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }
}

// Start the simulator if this file is run directly
if (import.meta.main) {
  const adminSimulator = new KongAdminSimulator();
  await adminSimulator.start();
}
