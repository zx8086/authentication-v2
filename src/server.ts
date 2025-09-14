/* src/server.ts */

// Main authentication server using native Bun.serve with OpenTelemetry instrumentation

import { SpanKind, trace } from "@opentelemetry/api";
import { loadConfig } from "./config/index";
import { NativeBunJWT } from "./services/jwt.service";
import { KongService } from "./services/kong.service";
import {
  forceMetricsFlush,
  getMetricsExportStats,
  getSimpleTelemetryStatus,
  getTelemetryStatus,
  initializeTelemetry,
  shutdownSimpleTelemetry,
} from "./telemetry/instrumentation";
import {
  getMetricsStatus,
  recordAuthenticationAttempt,
  recordError,
  recordException,
  recordJwtTokenIssued,
  recordKongOperation,
  recordOperationDuration,
  shutdownMetrics,
  testMetricRecording,
} from "./telemetry/metrics";
import { error, log, warn } from "./utils/logger";

const config = loadConfig();

const kongService = new KongService(config.kong.adminUrl, config.kong.adminToken);

// Initialize telemetry FIRST - always enabled
try {
  await initializeTelemetry();
} catch (error) {
  console.error("Failed to initialize telemetry:", (error as Error).message);
}

function validateKongHeaders(
  req: Request
): { consumerId: string; username: string } | { error: string } {
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

async function handleTokenRequest(req: Request, span: any): Promise<Response> {
  const requestId = crypto.randomUUID();
  const url = new URL(req.url);
  const startTime = Bun.nanoseconds();

  log("Token request started", {
    requestId,
    operation: "token_request",
    "http.method": req.method,
    "http.url": url.pathname,
  });

  try {
    const validation = validateKongHeaders(req);
    if ("error" in validation) {
      const duration = (Bun.nanoseconds() - startTime) / 1_000_000;

      // Record authentication failure
      recordAuthenticationAttempt("kong_header", false);
      recordError("validation_error", {
        reason: validation.error,
        endpoint: "/tokens",
      });

      span.setAttributes({
        "http.response.status_code": 401,
        "error.type": "validation_error",
        "error.message": validation.error,
        "http.request.duration_ms": duration,
      });

      log("HTTP request processed", {
        method: req.method,
        url: url.pathname,
        statusCode: 401,
        duration,
        requestId,
        error: validation.error,
      });

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
        }
      );
    }

    const { consumerId, username } = validation;

    span.setAttributes({
      "user.id": username,
      "consumer.id": consumerId,
    });

    // Record successful authentication attempt
    recordAuthenticationAttempt("kong_header", true, username);

    log("Authentication header validation successful", {
      userId: username,
      consumerId,
      requestId,
      event: "header_validation",
      success: true,
    });

    const kongOperationStart = Bun.nanoseconds();
    let consumerSecret = await kongService.getConsumerSecret(consumerId);
    const kongGetDuration = (Bun.nanoseconds() - kongOperationStart) / 1_000_000;

    if (!consumerSecret) {
      // Record Kong operation - get consumer secret (cache miss)
      recordKongOperation("get_consumer_secret", kongGetDuration, true, false);

      log("Kong consumer secret creation initiated", {
        consumerId,
        operation: "create_consumer_secret",
        duration: 0,
        success: true,
      });

      const createStart = Bun.nanoseconds();
      consumerSecret = await kongService.createConsumerSecret(consumerId);
      const createDuration = (Bun.nanoseconds() - createStart) / 1_000_000;

      // Record Kong operation - create consumer secret
      recordKongOperation("create_consumer_secret", createDuration, !!consumerSecret);

      if (!consumerSecret) {
        const duration = (Bun.nanoseconds() - startTime) / 1_000_000;

        span.setAttributes({
          "http.response.status_code": 404,
          "error.type": "provision_error",
          "error.message": "Unable to provision consumer credentials",
          duration_ms: duration,
        });

        // Record error for failed consumer secret creation
        recordError("consumer_provisioning_failed", {
          consumerId,
          operation: "create_consumer_secret",
        });

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
          }
        );
      }
    } else {
      // Record Kong operation - get consumer secret (cache hit)
      recordKongOperation("get_consumer_secret", kongGetDuration, true, true);
    }

    const jwtStart = Bun.nanoseconds();
    const tokenResponse = await NativeBunJWT.createToken(
      username,
      consumerSecret.key,
      consumerSecret.secret,
      config.jwt.authority,
      config.jwt.audience
    );
    const jwtDuration = (Bun.nanoseconds() - jwtStart) / 1_000_000;

    // Record JWT token creation
    recordJwtTokenIssued(username, jwtDuration);

    const duration = (Bun.nanoseconds() - startTime) / 1_000_000;

    span.setAttributes({
      "http.response.status_code": 200,
      "jwt.expires_in": tokenResponse.expires_in,
      duration_ms: duration,
    });

    log("Authentication token issued successfully", {
      userId: username,
      requestId,
      duration,
      event: "token_issued",
      success: true,
    });

    // Calculate response size (approximate)
    const _responseSize = JSON.stringify(tokenResponse).length;

    // Skip manual HTTP metrics recording - OpenTelemetry spans automatically generate HTTP metrics
    recordOperationDuration("token_creation", duration, true, {
      username,
      consumerId,
    });

    return new Response(JSON.stringify(tokenResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "X-Request-Id": requestId,
        "X-Trace-Id": span.spanContext().traceId,
      },
    });
  } catch (err) {
    const duration = (Bun.nanoseconds() - startTime) / 1_000_000;

    span.setAttributes({
      "http.response.status_code": 500,
      "error.type": "internal_error",
      "error.message": (err as Error).message,
      duration_ms: duration,
    });

    // Record exception and error metrics
    recordException(err as Error, {
      operation: "token_request",
      requestId,
      endpoint: "/tokens",
    });
    recordError("token_request_failed", {
      requestId,
      error: (err as Error).message,
    });

    error("Token request failed with error", {
      requestId,
      operation: "token_request",
      error: (err as Error).message,
      duration,
    });

    throw err;
  }
}

async function handleHealthCheck(span: any): Promise<Response> {
  const startTime = Bun.nanoseconds();

  try {
    const healthCheckStart = Bun.nanoseconds();
    const kongHealth = await kongService.healthCheck();
    const healthCheckDuration = (Bun.nanoseconds() - healthCheckStart) / 1_000_000;

    // Record Kong health check operation
    recordKongOperation("health_check", healthCheckDuration, kongHealth.healthy);

    // Get telemetry health status - always available
    const telemetryHealth = getTelemetryStatus();

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
      telemetry: {
        initialized: telemetryHealth.initialized,
        mode: telemetryHealth.config.mode,
      },
    };

    const duration = (Bun.nanoseconds() - startTime) / 1_000_000;
    const status = health.status === "healthy" ? 200 : 503;

    span.setAttributes({
      "http.response.status_code": status,
      "health.status": health.status,
      "kong.healthy": kongHealth.healthy,
      duration_ms: duration,
    });

    log("HTTP request processed Health check completed successfully", {
      method: "GET",
      url: "/health",
      statusCode: status,
      duration,
      health_status: health.status,
      operation: "health_check",
    });

    // Calculate response size
    const healthResponse = JSON.stringify(health, null, 2);
    const _responseSize = healthResponse.length;

    // Record comprehensive metrics
    // Skip manual metrics recording for monitoring endpoints to avoid double counting
    // (OpenTelemetry spans automatically generate HTTP metrics from span attributes)
    recordOperationDuration("health_check", duration, status === 200);

    return new Response(JSON.stringify(health, null, 2), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const duration = (Bun.nanoseconds() - startTime) / 1_000_000;

    span.setAttributes({
      "http.response.status_code": 503,
      "error.type": "health_check_error",
      "error.message": (err as Error).message,
      duration_ms: duration,
    });

    error("Health check failed", {
      component: "health",
      operation: "health_check",
      error: (err as Error).message,
      duration,
    });

    // Record error metrics
    recordException(err as Error, {
      operation: "health_check",
      component: "kong",
    });
    recordError("health_check_failed", {
      error: (err as Error).message,
    });

    // Record metrics for error case
    // Skip manual metrics recording for monitoring endpoints to avoid double counting
    // (OpenTelemetry spans automatically generate HTTP metrics from span attributes)

    throw err;
  }
}

function handleTelemetryHealth(): Response {
  const startTime = Bun.nanoseconds();

  // Create HTTP span following the same pattern as other endpoints
  const tracer = trace.getTracer("authentication-service");

  return tracer.startActiveSpan(
    "GET /health/telemetry",
    {
      kind: 1, // SpanKind.SERVER
      attributes: {
        "http.request.method": "GET",
        "http.route": "/health/telemetry",
        "url.path": "/health/telemetry",
        "url.scheme": "http",
      },
    },
    (span) => {
      try {
        const telemetryStatus = getSimpleTelemetryStatus();

        const duration = (Bun.nanoseconds() - startTime) / 1_000_000;

        span.setAttributes({
          "http.response.status_code": 200,
          "telemetry.initialized": telemetryStatus.initialized,
          duration_ms: duration,
        });

        log("HTTP request processed Telemetry health status retrieved successfully", {
          method: "GET",
          url: "/health/telemetry",
          statusCode: 200,
          duration,
          telemetry_initialized: telemetryStatus.initialized,
          operation: "telemetry_health_check",
        });

        const _responseSize = JSON.stringify(telemetryStatus, null, 2).length;
        // Skip manual metrics recording for monitoring endpoints to avoid double counting
        // (OpenTelemetry spans automatically generate HTTP metrics from span attributes)

        return new Response(JSON.stringify(telemetryStatus, null, 2), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (err) {
        const duration = (Bun.nanoseconds() - startTime) / 1_000_000;

        span.setAttributes({
          "http.response.status_code": 500,
          "error.type": "telemetry_health_error",
          "error.message": (err as Error).message,
          duration_ms: duration,
        });

        error("Telemetry health endpoint failed", {
          component: "telemetry",
          operation: "health_endpoint",
          error: (err as Error).message,
          duration,
        });

        throw err;
      } finally {
        span.end();
      }
    }
  );
}

function handleMetricsHealth(): Response {
  const startTime = Bun.nanoseconds();

  try {
    const telemetryStatus = getTelemetryStatus();
    const metricsStatus = getMetricsStatus();
    const exportStats = getMetricsExportStats();

    const metricsHealth = {
      timestamp: new Date().toISOString(),
      telemetry: {
        initialized: telemetryStatus.initialized,
        mode: telemetryStatus.config.mode,
        endpoints: {
          traces: telemetryStatus.config.tracesEndpoint,
          metrics: telemetryStatus.config.metricsEndpoint,
          logs: telemetryStatus.config.logsEndpoint,
        },
      },
      metrics: {
        reader_type: "PeriodicExportingMetricReader",
        export_interval: "10 seconds",
        initialized: metricsStatus.initialized,
        total_instruments: metricsStatus.totalInstruments || 23,
        available_metrics: metricsStatus.availableMetrics || {
          http: [
            "requests_total",
            "response_time_seconds",
            "requests_by_status_total",
            "active_connections",
            "request_size_bytes",
            "response_size_bytes",
          ],
          system: [
            "memory_usage_bytes",
            "heap_usage_bytes",
            "cpu_usage_percent",
            "uptime_seconds",
            "active_handles",
          ],
          business: [
            "jwt_tokens_issued_total",
            "jwt_token_creation_duration_seconds",
            "authentication_attempts_total",
            "authentication_success_total",
            "authentication_failures_total",
            "kong_operations_total",
            "kong_operation_duration_seconds",
            "kong_cache_hits_total",
            "kong_cache_misses_total",
          ],
          errors: [
            "application_errors_total",
            "application_exceptions_total",
            "telemetry_exports_total",
            "telemetry_export_errors_total",
            "circuit_breaker_state",
            "operation_duration_seconds",
          ],
        },
        instruments: {
          http_metrics_count: 6,
          system_metrics_count: 5,
          business_metrics_count: 9,
          error_metrics_count: 6,
          system_monitoring_enabled: metricsStatus.systemMetricsCollection?.enabled || false,
        },
      },
      export_stats: exportStats,
      debug: {
        environment_vars: {
          SERVICE_NAME: process.env.serviceName,
          SERVICE_VERSION: process.env.SERVICE_VERSION,
          OTEL_LOG_LEVEL: process.env.OTEL_LOG_LEVEL,
          TELEMETRY_MODE: process.env.mode,
        },
        actions: {
          test_metrics: "POST /debug/metrics/test",
          force_export: "POST /debug/metrics/export",
          export_stats: "GET /debug/metrics/stats",
        },
      },
    };

    const _duration = (Bun.nanoseconds() - startTime) / 1_000_000;
    const _responseSize = JSON.stringify(metricsHealth, null, 2).length;
    // Skip manual metrics recording for monitoring endpoints to avoid double counting
    // (OpenTelemetry spans automatically generate HTTP metrics from span attributes)

    return new Response(JSON.stringify(metricsHealth, null, 2), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Metrics health check failed",
        message: (error as Error).message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

function handleDebugMetricsTest(): Response {
  const startTime = Bun.nanoseconds();

  try {

    // Record test metrics
    testMetricRecording();

    const result = {
      timestamp: new Date().toISOString(),
      message: "Test metrics recorded successfully",
      test_metrics: [
        "http_requests_total: GET /test (200)",
        "http_response_time_seconds: 123ms for GET /test",
      ],
      export_stats: getMetricsExportStats(),
      next_scheduled_export: "Within 10 seconds (automatic)",
      manual_export: "Available at POST /debug/metrics/export",
    };

    const duration = (Bun.nanoseconds() - startTime) / 1_000_000;
    const responseSize = JSON.stringify(result, null, 2).length;

    log("HTTP request processed", {
      method: "POST",
      url: "/debug/metrics/test",
      statusCode: 200,
      duration,
      debug_endpoint: "metrics_test",
      response_size: responseSize,
      message: "Test metrics recorded successfully",
      operation: "test_metrics_recording",
    });

    return new Response(JSON.stringify(result, null, 2), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const duration = (Bun.nanoseconds() - startTime) / 1_000_000;
    log("HTTP request processed", {
      method: "POST",
      url: "/debug/metrics/test",
      statusCode: 500,
      duration,
      debug_endpoint: "metrics_test",
      error: "Test metrics failed",
      message: "Test metrics recording failed",
      operation: "test_metrics_recording",
    });
    return new Response(
      JSON.stringify({
        error: "Test metrics failed",
        message: (error as Error).message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

async function handleDebugMetricsExport(): Promise<Response> {
  const startTime = Bun.nanoseconds();

  try {

    const statsBefore = getMetricsExportStats();

    // Force export metrics
    await forceMetricsFlush();

    const statsAfter = getMetricsExportStats();

    const result = {
      timestamp: new Date().toISOString(),
      message: "Metrics export completed successfully",
      stats_before: statsBefore,
      stats_after: statsAfter,
      export_attempts_since_flush:
        "totalExports" in statsAfter && "totalExports" in statsBefore
          ? statsAfter.totalExports - statsBefore.totalExports
          : 0,
      endpoint: getTelemetryStatus().config.metricsEndpoint,
    };

    const duration = (Bun.nanoseconds() - startTime) / 1_000_000;
    const responseSize = JSON.stringify(result, null, 2).length;

    log("HTTP request processed", {
      method: "POST",
      url: "/debug/metrics/export",
      statusCode: 200,
      duration,
      debug_endpoint: "metrics_export",
      response_size: responseSize,
      exports_triggered: 1,
      message: "Metrics export completed successfully",
      operation: "manual_metrics_export",
    });

    return new Response(JSON.stringify(result, null, 2), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const duration = (Bun.nanoseconds() - startTime) / 1_000_000;
    console.error("❌ [DEBUG] Manual metrics export failed:", error);
    log("HTTP request processed", {
      method: "POST",
      url: "/debug/metrics/export",
      statusCode: 500,
      duration,
      debug_endpoint: "metrics_export",
      error: "Manual metrics export failed",
    });

    return new Response(
      JSON.stringify({
        error: "Manual metrics export failed",
        message: (error as Error).message,
        stack: (error as Error).stack,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

function handleDebugMetricsStats(): Response {
  const startTime = Bun.nanoseconds();

  try {
    const exportStats = getMetricsExportStats();
    const metricsStatus = getMetricsStatus();
    const telemetryStatus = getTelemetryStatus();

    const result = {
      timestamp: new Date().toISOString(),
      message: "Metrics statistics retrieved successfully",
      export_statistics: exportStats,
      metrics_status: metricsStatus,
      telemetry_config: {
        service_name: telemetryStatus.config.serviceName,
        metrics_endpoint: telemetryStatus.config.metricsEndpoint,
        export_timeout: telemetryStatus.config.exportTimeout,
        mode: telemetryStatus.config.mode,
      },
      debugging_tips: {
        "If no exports": "Check endpoint connectivity and authentication",
        "If exports failing": "Check recentErrors in export_statistics",
        "To test": "POST /debug/metrics/test",
        "To export": "POST /debug/metrics/export",
      },
    };

    const duration = (Bun.nanoseconds() - startTime) / 1_000_000;
    const responseSize = JSON.stringify(result, null, 2).length;

    log("HTTP request processed", {
      method: "GET",
      url: "/debug/metrics/stats",
      statusCode: 200,
      duration,
      debug_endpoint: "metrics_stats",
      response_size: responseSize,
      total_instruments: result.metrics_status.totalInstruments,
      message: "Metrics statistics retrieved successfully",
      operation: "metrics_stats_retrieval",
    });

    return new Response(JSON.stringify(result, null, 2), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const duration = (Bun.nanoseconds() - startTime) / 1_000_000;
    log("HTTP request processed", {
      method: "GET",
      url: "/debug/metrics/stats",
      statusCode: 500,
      duration,
      debug_endpoint: "metrics_stats",
      error: "Failed to get metrics stats",
    });
    return new Response(
      JSON.stringify({
        error: "Failed to get metrics stats",
        message: (error as Error).message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

function handleMetrics(): Response {
  const startTime = Bun.nanoseconds();

  // No need for additional span - already covered by main request handler
  // This prevents double HTTP metrics recording

  try {
    const telemetryHealth = getTelemetryStatus();

    const metrics = {
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
      },
      cache: kongService.getCacheStats(),
      telemetry: {
        initialized: telemetryHealth.initialized,
        mode: telemetryHealth.config.mode,
        status: "enabled",
      },
    };

    const duration = (Bun.nanoseconds() - startTime) / 1_000_000;

    // No span attributes needed since we removed the extra span

    log("HTTP request processed Performance metrics retrieved successfully", {
      method: "GET",
      url: "/metrics",
      statusCode: 200,
      duration,
      uptime: Math.floor(process.uptime()),
      operation: "performance_metrics_retrieval",
    });

    const _responseSize = JSON.stringify(metrics, null, 2).length;
    // Skip manual metrics recording for monitoring endpoints to avoid double counting
    // (OpenTelemetry spans automatically generate HTTP metrics from span attributes)

    return new Response(JSON.stringify(metrics, null, 2), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const duration = (Bun.nanoseconds() - startTime) / 1_000_000;

    error("Metrics endpoint failed", {
      component: "metrics",
      operation: "metrics_endpoint",
      error: (err as Error).message,
      duration,
    });

    return new Response(
      JSON.stringify({
        error: "Failed to generate metrics",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

log("Checking Kong connectivity...", {
  component: "kong",
  event: "connectivity_check",
});

const startupKongHealth = await kongService.healthCheck();
// Record startup Kong health check
recordKongOperation(
  "startup_health_check",
  startupKongHealth.responseTime,
  startupKongHealth.healthy
);

if (!startupKongHealth.healthy) {
  recordError("kong_startup_health_failed", {
    error: startupKongHealth.error,
    responseTime: startupKongHealth.responseTime,
  });

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
  log("Kong health check successful during startup", {
    operation: "health_check",
    duration: startupKongHealth.responseTime,
    success: true,
  });
}

let server: any;

try {
  // Create tracer - exactly like working test
  const tracer = trace.getTracer("authentication-service", "1.0.0");

  server = Bun.serve({
    port: config.server.port,
    hostname: "0.0.0.0",

    fetch(req) {
      const url = new URL(req.url);

      // Create HTTP span for every request - exactly like working test
      return tracer.startActiveSpan(
        `${req.method} ${url.pathname}`,
        {
          kind: SpanKind.SERVER,
          attributes: {
            "http.request.method": req.method,
            "http.route": url.pathname,
            "url.path": url.pathname,
            "url.scheme": url.protocol.replace(":", ""),
            "server.address": req.headers.get("host") || "localhost",
            "server.port": config.server.port,
          },
        },
        async (span) => {
          let response: Response;

          try {
            if (url.pathname === "/health") {
              response = await handleHealthCheck(span);
            } else if (url.pathname === "/health/telemetry") {
              response = await handleTelemetryHealth();
            } else if (url.pathname === "/metrics") {
              response = await handleMetrics();
            } else if (url.pathname === "/health/metrics") {
              response = handleMetricsHealth();
            } else if (url.pathname === "/debug/metrics/test" && req.method === "POST") {
              response = handleDebugMetricsTest();
            } else if (url.pathname === "/debug/metrics/export" && req.method === "POST") {
              response = await handleDebugMetricsExport();
            } else if (url.pathname === "/debug/metrics/stats" && req.method === "GET") {
              response = handleDebugMetricsStats();
            } else if (url.pathname === "/tokens") {
              response = await handleTokenRequest(req, span);
            } else {
              const requestId = crypto.randomUUID();
              const startTime = Bun.nanoseconds();
              const duration = (Bun.nanoseconds() - startTime) / 1_000_000;

              log("HTTP request processed", {
                method: req.method,
                url: url.pathname,
                statusCode: 404,
                duration,
                requestId,
              });

              const _notFoundResponse = JSON.stringify({
                error: "Not Found",
                message: `Path ${url.pathname} not found`,
                traceId: span.spanContext().traceId,
              });

              // Skip manual HTTP metrics recording - OpenTelemetry spans automatically generate HTTP metrics

              response = new Response(
                JSON.stringify({
                  error: "Not Found",
                  message: `Path ${url.pathname} not found`,
                  traceId: span.spanContext().traceId,
                }),
                {
                  status: 404,
                  headers: {
                    "Content-Type": "application/json",
                    "X-Request-Id": requestId,
                    "X-Trace-Id": span.spanContext().traceId,
                  },
                }
              );
            }

            // Set span status
            span.setStatus({ code: 1 }); // OK
            span.setAttributes({
              "http.response.status_code": response.status,
            });

            return response;
          } catch (error) {
            span.setStatus({
              code: 2, // ERROR
              message: error instanceof Error ? error.message : "Unknown error",
            });
            span.setAttributes({
              "http.response.status_code": 500,
            });

            const requestId = crypto.randomUUID();

            return new Response(
              JSON.stringify({
                error: "Internal Server Error",
                message: "An unexpected error occurred",
                traceId: span.spanContext().traceId,
              }),
              {
                status: 500,
                headers: {
                  "Content-Type": "application/json",
                  "X-Request-Id": requestId,
                  "X-Trace-Id": span.spanContext().traceId,
                },
              }
            );
          } finally {
            span.end();
          }
        }
      );
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
  }, 10000); // 10 second timeout

  try {
    // Stop server first
    if (server) {
      log("Stopping HTTP server...", {
        component: "server",
        event: "shutdown_http_server",
      });
      await server.stop();
      log("HTTP server stopped successfully", {
        component: "server",
        event: "shutdown_http_server_completed",
      });
    }

    // Shutdown telemetry and metrics
    log("Shutting down telemetry...", {
      component: "telemetry",
      event: "shutdown_telemetry",
    });

    shutdownMetrics();
    await shutdownSimpleTelemetry();

    log("Telemetry shutdown completed", {
      component: "telemetry",
      event: "shutdown_telemetry_completed",
    });

    log("Graceful shutdown completed successfully", {
      component: "server",
      event: "shutdown_completed",
      pid: process.pid,
    });

    clearTimeout(shutdownTimeout);
    process.exit(0);
  } catch (shutdownError) {
    error("Error during graceful shutdown", {
      component: "server",
      event: "shutdown_error",
      error: (shutdownError as Error).message,
      stack: (shutdownError as Error).stack,
      pid: process.pid,
    });

    clearTimeout(shutdownTimeout);
    process.exit(1);
  }
};

// Handle various termination signals
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGHUP", () => gracefulShutdown("SIGHUP"));

// Handle uncaught exceptions
process.on("uncaughtException", (uncaughtError) => {
  error("Uncaught exception - forcing shutdown", {
    component: "server",
    event: "uncaught_exception",
    error: uncaughtError.message,
    stack: uncaughtError.stack,
    pid: process.pid,
  });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, _promise) => {
  error("Unhandled promise rejection - forcing shutdown", {
    component: "server",
    event: "unhandled_rejection",
    reason: String(reason),
    pid: process.pid,
  });
  process.exit(1);
});
