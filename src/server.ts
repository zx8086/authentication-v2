/* src/server.ts */

import pkg from "../package.json" with { type: "json" };
import { loadConfig } from "./config/index";
import { handleServerError } from "./middleware/error-handler";
import { apiDocGenerator } from "./openapi-generator";
import { createRoutes, handleRoute } from "./routes/router";
import type { IKongService } from "./services/kong.service";
import { KongServiceFactory } from "./services/kong.service";
import {
  getSimpleTelemetryStatus,
  initializeTelemetry,
  shutdownSimpleTelemetry,
} from "./telemetry/instrumentation";
import { recordKongOperation, shutdownMetrics } from "./telemetry/metrics";
import { error, log, warn } from "./utils/logger";

const config = loadConfig();

// Initialize OpenAPI documentation generator
apiDocGenerator.registerAllRoutes();

const kongService: IKongService = KongServiceFactory.create(
  config.kong.mode,
  config.kong.adminUrl,
  config.kong.adminToken
);

try {
  await initializeTelemetry();
} catch (error) {
  console.error("Failed to initialize telemetry:", (error as Error).message);
}

log("Authentication Service starting up", {
  component: "server",
  event: "startup_initiated",
  version: pkg.version || "1.0.0",
  environment: config.server.nodeEnv,
  port: config.server.port,
});

log("Checking Kong connectivity...", {
  component: "kong",
  event: "connectivity_check",
});

const startupKongHealth = await kongService.healthCheck();
recordKongOperation(
  "startup_health_check",
  startupKongHealth.responseTime,
  startupKongHealth.healthy
);

if (!startupKongHealth.healthy) {
  log("Kong health check failed during startup", {
    operation: "health_check",
    duration: startupKongHealth.responseTime,
    success: false,
    error: startupKongHealth.error,
  });
  warn("Server will start but Kong integration may not work", {
    component: "kong",
    status: "degraded",
  });
} else {
  log("Kong connectivity verified", {
    component: "kong",
    event: "connectivity_verified",
    duration: startupKongHealth.responseTime,
  });
}

const routes = createRoutes(kongService);
let server: any;

try {
  server = Bun.serve({
    port: config.server.port,
    hostname: "0.0.0.0",

    async fetch(req) {
      const url = new URL(req.url);

      try {
        return await handleRoute(req, url, routes);
      } catch (error) {
        return handleServerError(error as Error);
      }
    },
  });
} catch (err) {
  if (err instanceof Error && err.message.includes("EADDRINUSE")) {
    error("Server failed to start - port already in use", {
      component: "server",
      event: "startup_failed",
      error: err.message,
      port: config.server.port,
      suggestion: `Port ${config.server.port} is already in use. Please stop the existing server or use a different port.`,
    });

    log(
      "To stop existing servers, run: pkill -f 'bun src/server.ts' or lsof -ti:3000 | xargs kill",
      {
        component: "server",
        event: "troubleshooting_hint",
      }
    );

    process.exit(1);
  } else {
    error("Server failed to start with unexpected error", {
      component: "server",
      event: "startup_failed",
      error: err instanceof Error ? err.message : "Unknown error",
    });

    process.exit(1);
  }
}

log("Authentication server started", {
  component: "server",
  event: "startup",
  "server.url": `http://localhost:${config.server.port}`,
  "server.environment": config.server.nodeEnv,
  "server.pid": process.pid,
  "server.port": config.server.port,
});

log("Server endpoints configured", {
  component: "server",
  event: "endpoints_configured",
  endpoints: [
    "GET / - OpenAPI specification (JSON/YAML based on Accept header)",
    "GET /health - Health check",
    "GET /health/telemetry - Telemetry health status",
    "GET /health/metrics - Metrics health and debugging",
    "GET /metrics - Performance metrics",
    "GET /tokens - Issue JWT token (requires Kong headers)",
    "POST /debug/metrics/test - Record test metrics",
    "POST /debug/metrics/export - Force metrics export",
    "GET /debug/metrics/stats - Export statistics",
  ],
});

log("Metrics debugging endpoints available", {
  component: "metrics",
  event: "debug_endpoints_ready",
  endpoints: {
    test: "POST /debug/metrics/test",
    export: "POST /debug/metrics/export",
    stats: "GET /debug/metrics/stats",
    health: "GET /health/metrics",
  },
  usage: {
    test_and_check:
      "curl -X POST http://localhost:3000/debug/metrics/test && sleep 15 && curl http://localhost:3000/debug/metrics/stats",
    manual_export: "curl -X POST http://localhost:3000/debug/metrics/export",
    view_stats: "curl http://localhost:3000/debug/metrics/stats",
  },
});

log("OpenTelemetry configuration loaded", {
  component: "telemetry",
  event: "configuration_loaded",
  success: true,
  "otel.service.name": getSimpleTelemetryStatus().config.serviceName,
  "otel.service.version": getSimpleTelemetryStatus().config.serviceVersion,
  "otel.deployment.environment": getSimpleTelemetryStatus().config.environment,
  "otel.telemetry.mode": getSimpleTelemetryStatus().config.mode,
  "otel.exporter.traces.endpoint": getSimpleTelemetryStatus().config.tracesEndpoint,
  "otel.exporter.metrics.endpoint": getSimpleTelemetryStatus().config.metricsEndpoint,
  "otel.exporter.logs.endpoint": getSimpleTelemetryStatus().config.logsEndpoint,
  "otel.exporter.timeout_ms": getSimpleTelemetryStatus().config.exportTimeout,
  "otel.batch.size": getSimpleTelemetryStatus().config.batchSize,
  "otel.queue.max_size": getSimpleTelemetryStatus().config.maxQueueSize,
  "otel.enabled": getSimpleTelemetryStatus().config.enableOpenTelemetry,
});

log("Server ready to serve requests", {
  component: "server",
  event: "ready",
  status: "ready",
});

let isShuttingDown = false;

const gracefulShutdown = async (signal: string) => {
  if (isShuttingDown) {
    log("Shutdown already in progress, ignoring duplicate signal", {
      component: "server",
      event: "shutdown_duplicate",
      signal,
    });
    return;
  }

  isShuttingDown = true;
  log("Graceful shutdown initiated", {
    component: "server",
    event: "shutdown_initiated",
    signal,
    pid: process.pid,
  });

  const shutdownTimeout = setTimeout(() => {
    error("Graceful shutdown timeout - forcing exit", {
      component: "server",
      event: "shutdown_timeout",
      pid: process.pid,
    });
    process.exit(1);
  }, 10000);

  try {
    if (server) {
      log("Stopping HTTP server...", {
        component: "server",
        event: "shutdown_http_server",
      });
      server.stop();
    }

    log("Shutting down telemetry...", {
      component: "telemetry",
      event: "shutdown_telemetry",
    });

    await Promise.all([shutdownMetrics(), shutdownSimpleTelemetry()]);

    clearTimeout(shutdownTimeout);

    log("Graceful shutdown completed", {
      component: "server",
      event: "shutdown_completed",
      signal,
    });

    process.exit(0);
  } catch (err) {
    error("Error during graceful shutdown", {
      component: "server",
      event: "shutdown_error",
      error: err instanceof Error ? err.message : "Unknown error",
    });

    clearTimeout(shutdownTimeout);
    process.exit(1);
  }
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

process.on("unhandledRejection", (reason, promise) => {
  error("Unhandled promise rejection", {
    component: "server",
    event: "unhandled_rejection",
    reason: reason instanceof Error ? reason.message : String(reason),
    promise: String(promise),
  });
});

process.on("uncaughtException", (err) => {
  error("Uncaught exception", {
    component: "server",
    event: "uncaught_exception",
    error: err.message,
    stack: err.stack,
  });
  process.exit(1);
});
