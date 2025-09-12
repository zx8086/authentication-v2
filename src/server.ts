/* src/server.ts */

// Main authentication server using native Bun.serve with native routing

import { loadConfig, type AppConfig } from "./config/index";
import { NativeBunJWT } from "./services/jwt.service";
import { KongService } from "./services/kong.service";
import { PerformanceMonitor } from "./utils/performance";

const config = loadConfig();
const kongService = new KongService(config.kong.adminUrl, config.kong.adminToken);


function validateKongHeaders(req: Request): { consumerId: string; username: string } | { error: string } {
  const consumerId = req.headers.get(config.kong.consumerIdHeader);
  const username = req.headers.get(config.kong.consumerUsernameHeader);
  const isAnonymous = req.headers.get(config.kong.anonymousHeader);

  if (!consumerId || !username) {
    return { error: "Missing Kong consumer headers" };
  }

  if (isAnonymous === "true") {
    return { error: "Anonymous consumers are not allowed" };
  }

  return { consumerId, username };
}

async function handleTokenRequest(req: Request): Promise<Response> {
  const requestId = crypto.randomUUID();
  console.log(`🔑 Token request [${requestId}] started`);

  return PerformanceMonitor.measureAsync(
    "token-request",
    async () => {
      const validation = validateKongHeaders(req);
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
            },
          },
        );
      }

      const { consumerId, username } = validation;


      let consumerSecret = await kongService.getConsumerSecret(consumerId);

      if (!consumerSecret) {
        console.log(`📝 Creating new secret for consumer: ${consumerId}`);
        consumerSecret = await kongService.createConsumerSecret(consumerId);

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
        config.jwt.authority,
        config.jwt.audience,
      );

      console.log(`✅ Token issued [${requestId}] for user: ${username}`);

      return new Response(JSON.stringify(tokenResponse), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Request-Id": requestId,
        },
      });
    },
    false,
  ).then(({ result }) => result);
}

async function handleHealthCheck(): Promise<Response> {
  return PerformanceMonitor.measureAsync(
    "health-check",
    async () => {
      const kongHealth = await kongService.healthCheck();

      const health = {
        status: kongHealth.healthy ? "healthy" : "degraded",
        timestamp: new Date().toISOString(),
        version: "1.0.0",
        uptime: Math.floor(process.uptime()),
        environment: config.server.nodeEnv,
        dependencies: {
          kong: {
            status: kongHealth.healthy ? "healthy" : "unhealthy",
            response_time: Math.round(kongHealth.responseTime),
            url: config.kong.adminUrl,
            error: kongHealth.error,
          },
        },
        cache: kongService.getCacheStats(),
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

function handleMetrics(): Response {
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
    cache: kongService.getCacheStats(),
  };

  return new Response(JSON.stringify(metrics, null, 2), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

console.log("🔍 Checking Kong connectivity...");
const kongHealth = await kongService.healthCheck();
if (!kongHealth.healthy) {
  console.warn(`⚠️  Kong health check failed: ${kongHealth.error}`);
  console.warn("   Server will start but Kong integration may not work");
} else {
  console.log(`✅ Kong is healthy (${kongHealth.responseTime.toFixed(2)}ms)`);
}

const server = Bun.serve({
  port: config.server.port,
  hostname: "0.0.0.0",
  
  routes: {
    "/health": handleHealthCheck,
    "/metrics": handleMetrics,
    "/tokens": handleTokenRequest,
  },

  fetch(req) {
    const requestId = crypto.randomUUID();
    console.log(`📨 ${req.method} ${new URL(req.url).pathname} [${requestId}]`);
    
    return new Response(
      JSON.stringify({
        error: "Not Found",
        message: `Path ${new URL(req.url).pathname} not found`,
      }),
      {
        status: 404,
        headers: {
          "Content-Type": "application/json",
          "X-Request-Id": requestId,
        },
      },
    );
  },

  error(error) {
    const requestId = crypto.randomUUID();
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
  },
});


console.log("🚀 Authentication server started");
console.log(`   URL: http://localhost:${config.server.port}`);
console.log(`   Environment: ${config.server.nodeEnv}`);
console.log(`   PID: ${process.pid}`);
console.log("\n📋 Available endpoints:");
console.log("   GET  /health  - Health check");
console.log("   GET  /metrics - Performance metrics");
console.log("   GET  /tokens  - Issue JWT token (requires Kong headers)");
console.log("\n🎯 Ready to serve requests!\n");

process.on("SIGINT", async () => {
  console.log("\n🛑 Received SIGINT, shutting down gracefully...");
  await server.stop();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n🛑 Received SIGTERM, shutting down gracefully...");
  await server.stop();
  process.exit(0);
});
