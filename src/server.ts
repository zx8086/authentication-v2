/* src/server.ts */

// Main authentication server using native Bun.serve

import { loadConfig, type AppConfig } from "./config/index";
import { NativeBunJWT } from "./services/jwt.service";
import { KongService } from "./services/kong.service";
import { PerformanceMonitor, RateLimiter } from "./utils/performance";

class AuthenticationServer {
  private config: AppConfig;
  private kongService: KongService;
  private rateLimiter: RateLimiter;
  private server: any;

  constructor() {
    this.config = loadConfig();
    this.kongService = new KongService(
      this.config.kong.adminUrl,
      this.config.kong.adminToken,
    );
    this.rateLimiter = new RateLimiter(
      this.config.rateLimit.windowMs,
      this.config.rateLimit.maxRequests,
    );
  }

  private getCorsHeaders(origin?: string | null): HeadersInit {
    const allowedOrigins = this.config.cors.origins;
    const allowOrigin =
      origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

    return {
      "Access-Control-Allow-Origin": allowOrigin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, X-Consumer-Id, X-Consumer-Username, X-Anonymous-Consumer",
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Max-Age": "86400",
    };
  }

  private handleCorsPrelight(req: Request): Response {
    return new Response(null, {
      status: 204,
      headers: this.getCorsHeaders(req.headers.get("origin")),
    });
  }

  private validateKongHeaders(req: Request):
    | {
        consumerId: string;
        username: string;
      }
    | { error: string } {
    const consumerId = req.headers.get(this.config.kong.consumerIdHeader);
    const username = req.headers.get(this.config.kong.consumerUsernameHeader);
    const isAnonymous = req.headers.get(this.config.kong.anonymousHeader);

    if (!consumerId || !username) {
      return { error: "Missing Kong consumer headers" };
    }

    if (isAnonymous === "true") {
      return { error: "Anonymous consumers are not allowed" };
    }

    return { consumerId, username };
  }

  private async handleTokenRequest(req: Request): Promise<Response> {
    const requestId = crypto.randomUUID();
    console.log(`🔑 Token request [${requestId}] started`);

    return PerformanceMonitor.measureAsync(
      "token-request",
      async () => {
        const validation = this.validateKongHeaders(req);
        if ("error" in validation) {
          return new Response(
            JSON.stringify({
              error: "Unauthorized",
              message: validation.error,
            }),
            {
              status: 401,
              headers: {
                "Content-Type": "application/json",
                "X-Request-Id": requestId,
                ...this.getCorsHeaders(req.headers.get("origin")),
              },
            },
          );
        }

        const { consumerId, username } = validation;

        if (!this.rateLimiter.checkLimit(consumerId)) {
          const stats = this.rateLimiter.getStats(consumerId);
          return new Response(
            JSON.stringify({
              error: "Rate Limit Exceeded",
              message: "Too many requests",
              retry_after: Math.ceil((stats.resetTime - Date.now()) / 1000),
            }),
            {
              status: 429,
              headers: {
                "Content-Type": "application/json",
                "X-Request-Id": requestId,
                "X-RateLimit-Limit":
                  this.config.rateLimit.maxRequests.toString(),
                "X-RateLimit-Remaining": stats.remaining.toString(),
                "X-RateLimit-Reset": Math.ceil(
                  stats.resetTime / 1000,
                ).toString(),
                "Retry-After": Math.ceil(
                  (stats.resetTime - Date.now()) / 1000,
                ).toString(),
              },
            },
          );
        }

        let consumerSecret =
          await this.kongService.getConsumerSecret(consumerId);

        if (!consumerSecret) {
          console.log(`📝 Creating new secret for consumer: ${consumerId}`);
          consumerSecret =
            await this.kongService.createConsumerSecret(consumerId);

          if (!consumerSecret) {
            return new Response(
              JSON.stringify({
                error: "Not Found",
                message: "Unable to provision consumer credentials",
              }),
              {
                status: 404,
                headers: {
                  "Content-Type": "application/json",
                  "X-Request-Id": requestId,
                },
              },
            );
          }
        }

        const tokenResponse = await NativeBunJWT.createToken(
          username,
          consumerSecret.key,
          consumerSecret.secret,
          this.config.jwt.authority,
          this.config.jwt.audience,
        );

        console.log(`✅ Token issued [${requestId}] for user: ${username}`);

        return new Response(JSON.stringify(tokenResponse), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "X-Request-Id": requestId,
            ...this.getCorsHeaders(req.headers.get("origin")),
          },
        });
      },
      false, // Don't log individual request times (too verbose)
    ).then(({ result }) => result);
  }

  private async handleHealthCheck(): Promise<Response> {
    return PerformanceMonitor.measureAsync(
      "health-check",
      async () => {
        const kongHealth = await this.kongService.healthCheck();

        const health = {
          status: kongHealth.healthy ? "healthy" : "degraded",
          timestamp: new Date().toISOString(),
          version: "1.0.0",
          uptime: Math.floor(process.uptime()),
          environment: this.config.server.nodeEnv,
          dependencies: {
            kong: {
              status: kongHealth.healthy ? "healthy" : "unhealthy",
              response_time: Math.round(kongHealth.responseTime),
              url: this.config.kong.adminUrl,
              error: kongHealth.error,
            },
          },
          cache: this.kongService.getCacheStats(),
        };

        const status = health.status === "healthy" ? 200 : 503;
        return new Response(JSON.stringify(health, null, 2), {
          status,
          headers: { "Content-Type": "application/json" },
        });
      },
      false,
    ).then(({ result }) => result);
  }

  private handleMetrics(): Response {
    const stats = PerformanceMonitor.getAllStats();
    const metrics = {
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
      },
      performance: stats,
      cache: this.kongService.getCacheStats(),
    };

    return new Response(JSON.stringify(metrics, null, 2), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  private async handleRequest(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const method = req.method;
    const requestId = crypto.randomUUID();

    console.log(`📨 ${method} ${url.pathname} [${requestId}]`);

    try {
      if (method === "OPTIONS") {
        return this.handleCorsPrelight(req);
      }

      switch (url.pathname) {
        case "/health":
          if (method === "GET") {
            return await this.handleHealthCheck();
          }
          break;

        case "/metrics":
          if (method === "GET") {
            return this.handleMetrics();
          }
          break;

        case "/tokens":
          if (method === "GET") {
            return await this.handleTokenRequest(req);
          }
          break;

        default:
          return new Response(
            JSON.stringify({
              error: "Not Found",
              message: `Path ${url.pathname} not found`,
            }),
            {
              status: 404,
              headers: {
                "Content-Type": "application/json",
                "X-Request-Id": requestId,
              },
            },
          );
      }

      return new Response(
        JSON.stringify({
          error: "Method Not Allowed",
          message: `${method} not allowed for ${url.pathname}`,
        }),
        {
          status: 405,
          headers: {
            "Content-Type": "application/json",
            "X-Request-Id": requestId,
            Allow: "GET, OPTIONS",
          },
        },
      );
    } catch (error) {
      console.error(`❌ Request [${requestId}] failed:`, error);

      return new Response(
        JSON.stringify({
          error: "Internal Server Error",
          message: "An unexpected error occurred",
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "X-Request-Id": requestId,
          },
        },
      );
    }
  }

  async start(): Promise<void> {
    try {
      console.log("🔍 Checking Kong connectivity...");
      const kongHealth = await this.kongService.healthCheck();
      if (!kongHealth.healthy) {
        console.warn(`⚠️  Kong health check failed: ${kongHealth.error}`);
        console.warn("   Server will start but Kong integration may not work");
      } else {
        console.log(
          `✅ Kong is healthy (${kongHealth.responseTime.toFixed(2)}ms)`,
        );
      }

      this.server = Bun.serve({
        port: this.config.server.port,
        hostname: "0.0.0.0",

        fetch: (req) => this.handleRequest(req),

        error(error) {
          console.error("🚨 Server error:", error);
          return new Response("Internal Server Error", {
            status: 500,
            headers: { "Content-Type": "text/plain" },
          });
        },
      });

      setInterval(() => {
        this.rateLimiter.cleanup();
      }, 60000); // Cleanup every minute

      console.log("🚀 Authentication server started");
      console.log(`   URL: http://localhost:${this.config.server.port}`);
      console.log(`   Environment: ${this.config.server.nodeEnv}`);
      console.log(`   PID: ${process.pid}`);
      console.log("\n📋 Available endpoints:");
      console.log("   GET  /health  - Health check");
      console.log("   GET  /metrics - Performance metrics");
      console.log("   GET  /tokens  - Issue JWT token (requires Kong headers)");
      console.log("\n🎯 Ready to serve requests!\n");
    } catch (error) {
      console.error("❌ Failed to start server:", error);
      process.exit(1);
    }
  }

  async stop(): Promise<void> {
    if (this.server) {
      this.server.stop();
      console.log("🛑 Server stopped");
    }
  }
}

process.on("SIGINT", async () => {
  console.log("\n🛑 Received SIGINT, shutting down gracefully...");
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n🛑 Received SIGTERM, shutting down gracefully...");
  process.exit(0);
});

const server = new AuthenticationServer();
server.start().catch((error) => {
  console.error("💥 Failed to start authentication server:", error);
  process.exit(1);
});
