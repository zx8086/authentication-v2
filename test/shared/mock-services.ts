/* test/shared/mock-services.ts */

import type { ConsumerSecret, IKongService, KongHealthCheckResult } from "../../src/config";

/**
 * Mock Kong Service for unit tests
 * Provides predictable responses without external dependencies
 */
export class MockKongService implements IKongService {
  private mockSecrets = new Map<string, ConsumerSecret>();
  private healthyStatus = true;

  constructor(isHealthy = true) {
    this.healthyStatus = isHealthy;
    this.setupDefaultTestSecrets();
  }

  private setupDefaultTestSecrets(): void {
    // Pre-populate with test consumers
    const testConsumers = [
      "test-consumer-001",
      "test-consumer-002",
      "test-consumer-003",
      "test-consumer-004",
      "test-consumer-005"
    ];

    testConsumers.forEach((consumerId, index) => {
      this.mockSecrets.set(consumerId, {
        id: `jwt-credential-${index + 1}`,
        key: `test-key-${index + 1}`,
        secret: "a".repeat(44) + "=", // Base64-like secret
        consumer: {
          id: consumerId
        }
      });
    });
  }

  async getConsumerSecret(consumerId: string): Promise<ConsumerSecret | null> {
    // Simulate network delay
    await Bun.sleep(Math.random() * 10);

    return this.mockSecrets.get(consumerId) || null;
  }

  async createConsumerSecret(consumerId: string): Promise<ConsumerSecret | null> {
    // Simulate network delay
    await Bun.sleep(Math.random() * 20);

    if (!this.mockSecrets.has(consumerId)) {
      return null;
    }

    const newSecret: ConsumerSecret = {
      id: `new-jwt-credential-${Date.now()}`,
      key: `new-key-${Date.now()}`,
      secret: "b".repeat(44) + "=",
      consumer: {
        id: consumerId
      }
    };

    this.mockSecrets.set(consumerId, newSecret);
    return newSecret;
  }

  async healthCheck(): Promise<KongHealthCheckResult> {
    // Simulate network delay
    await Bun.sleep(Math.random() * 5);

    return {
      healthy: this.healthyStatus,
      responseTime: Math.random() * 50 + 10 // 10-60ms
    };
  }

  async clearCache?(): Promise<void> {
    // Mock implementation - no-op for unit tests
  }

  // Helper methods for test control
  setHealthyStatus(healthy: boolean): void {
    this.healthyStatus = healthy;
  }

  addMockSecret(consumerId: string, secret: ConsumerSecret): void {
    this.mockSecrets.set(consumerId, secret);
  }

  removeMockSecret(consumerId: string): void {
    this.mockSecrets.delete(consumerId);
  }

  clearMockSecrets(): void {
    this.mockSecrets.clear();
    this.setupDefaultTestSecrets();
  }
}

/**
 * Mock HTTP Server for testing HTTP endpoints
 */
export class MockHTTPServer {
  private server: any;
  private port: number;

  constructor(port = 3001) {
    this.port = port;
  }

  async start(): Promise<void> {
    this.server = Bun.serve({
      port: this.port,
      fetch: this.handleRequest.bind(this),
    });
  }

  async stop(): Promise<void> {
    if (this.server) {
      this.server.stop();
      this.server = null;
    }
  }

  private async handleRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);

    switch (url.pathname) {
      case "/health":
        return this.handleHealth(request);
      case "/metrics":
        return this.handleMetrics(request);
      case "/health/metrics":
        return this.handleHealthMetrics(request);
      case "/tokens":
        return this.handleTokens(request);
      default:
        return new Response(JSON.stringify({ error: "Not Found" }), {
          status: 404,
          headers: {
            "Content-Type": "application/json",
            "X-Request-Id": crypto.randomUUID()
          }
        });
    }
  }

  private handleHealth(request: Request): Response {
    const acceptVersion = request.headers.get("Accept-Version");

    const health = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: "2.4.0",
      uptime: Math.random() * 1000,
      dependencies: {
        kong: {
          status: "healthy",
          responseTime: Math.random() * 50 + 10
        }
      }
    };

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      "X-Request-Id": crypto.randomUUID()
    };

    // Add v2 security headers
    if (acceptVersion === "v2") {
      Object.assign(headers, {
        "Strict-Transport-Security": "max-age=63072000",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "X-XSS-Protection": "1; mode=block"
      });
    }

    return new Response(JSON.stringify(health), {
      status: 200,
      headers
    });
  }

  private handleMetrics(request: Request): Response {
    const url = new URL(request.url);
    const view = url.searchParams.get("view") || "operational";

    const baseMetrics = {
      timestamp: new Date().toISOString(),
      uptime: Math.random() * 1000,
      memory: {
        used: Math.random() * 100 * 1024 * 1024,
        total: 200 * 1024 * 1024,
        rss: Math.random() * 150 * 1024 * 1024
      },
      telemetry: {
        enabled: true,
        mode: "console"
      }
    };

    if (view === "operational" || view === "full") {
      Object.assign(baseMetrics, {
        circuitBreakers: {
          enabled: true,
          totalBreakers: 2,
          states: {
            closed: 2,
            open: 0,
            halfOpen: 0
          }
        }
      });
    }

    return new Response(JSON.stringify(baseMetrics), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }

  private handleHealthMetrics(request: Request): Response {
    const healthMetrics = {
      timestamp: new Date().toISOString(),
      metrics: {
        exports: {
          successful: Math.floor(Math.random() * 100),
          failed: 0
        }
      },
      circuitBreakers: {
        enabled: true,
        totalBreakers: 2,
        states: {
          closed: 2,
          open: 0,
          halfOpen: 0
        }
      }
    };

    return new Response(JSON.stringify(healthMetrics), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }

  private handleTokens(request: Request): Response {
    // Only handle GET requests for tokens, return 401 for other methods (like real service)
    if (request.method !== "GET") {
      return new Response(JSON.stringify({
        error: "Unauthorized",
        message: "Missing required Kong headers"
      }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    const consumerId = request.headers.get("X-Consumer-Id");
    const consumerUsername = request.headers.get("X-Consumer-Username");
    const anonymous = request.headers.get("X-Anonymous-Consumer");

    if (!consumerId || !consumerUsername) {
      return new Response(JSON.stringify({
        error: "Unauthorized",
        message: "Missing required Kong headers"
      }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (anonymous === "true") {
      return new Response(JSON.stringify({
        error: "Unauthorized",
        message: "Anonymous consumers not allowed"
      }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Generate mock JWT
    const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const payload = btoa(JSON.stringify({
      sub: consumerUsername,
      iss: "https://api.pvhcorp.com",
      aud: "pvh-api",
      exp: Math.floor(Date.now() / 1000) + 900,
      iat: Math.floor(Date.now() / 1000),
      jti: crypto.randomUUID()
    }));
    const signature = "mock-signature";

    return new Response(JSON.stringify({
      access_token: `${header}.${payload}.${signature}`,
      expires_in: 900
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "X-Request-Id": crypto.randomUUID()
      }
    });
  }
}

/**
 * Test Setup Utilities
 */
export class TestEnvironment {
  static isUnitTest(): boolean {
    return Bun.env.NODE_ENV === "test" || Bun.env.TEST_MODE === "true";
  }

  static async setupMockServer(port = 3001): Promise<MockHTTPServer> {
    const server = new MockHTTPServer(port);
    await server.start();
    return server;
  }

  static createMockKongService(isHealthy = true): MockKongService {
    return new MockKongService(isHealthy);
  }

  static async waitForServer(url: string, maxAttempts = 10): Promise<boolean> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await fetch(url);
        if (response.status < 500) return true;
      } catch {
        // Server not ready, continue waiting
      }
      await Bun.sleep(100);
    }
    return false;
  }
}