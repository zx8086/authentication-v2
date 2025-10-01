/* src/server.ts */

import { SpanKind, trace } from "@opentelemetry/api";
import { loadConfig } from "./config/index";
import { apiDocGenerator } from "./openapi-generator";
import { NativeBunJWT } from "./services/jwt.service";
import type { IKongService } from "./services/kong.service";
import { KongServiceFactory } from "./services/kong.service";
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

async function checkOtlpEndpointHealth(url: string): Promise<{
  healthy: boolean;
  responseTime: number;
  error?: string;
}> {
  if (!url) {
    return { healthy: false, responseTime: 0, error: "URL not configured" };
  }

  const startTime = Bun.nanoseconds();
  try {
    const response = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(5000),
    });
    const responseTime = (Bun.nanoseconds() - startTime) / 1_000_000;

    return {
      healthy: response.status < 500,
      responseTime: Math.round(responseTime),
      error: response.status >= 500 ? `HTTP ${response.status}` : undefined,
    };
  } catch (error) {
    const responseTime = (Bun.nanoseconds() - startTime) / 1_000_000;
    return {
      healthy: false,
      responseTime: Math.round(responseTime),
      error: error instanceof Error ? error.message : "Connection failed",
    };
  }
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

      recordKongOperation("create_consumer_secret", createDuration, !!consumerSecret);

      if (!consumerSecret) {
        const duration = (Bun.nanoseconds() - startTime) / 1_000_000;

        span.setAttributes({
          "http.response.status_code": 404,
          "error.type": "provision_error",
          "error.message": "Unable to provision consumer credentials",
          duration_ms: duration,
        });

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

    const _responseSize = JSON.stringify(tokenResponse).length;

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

    recordKongOperation("health_check", healthCheckDuration, kongHealth.healthy);

    const telemetryHealth = getTelemetryStatus();

    // Check OTLP endpoint connectivity in parallel
    const [tracesHealth, metricsHealth, logsHealth] = await Promise.all([
      checkOtlpEndpointHealth(telemetryHealth.config.tracesEndpoint || ""),
      checkOtlpEndpointHealth(telemetryHealth.config.metricsEndpoint || ""),
      checkOtlpEndpointHealth(telemetryHealth.config.logsEndpoint || ""),
    ]);

    const otlpHealthy = tracesHealth.healthy && metricsHealth.healthy && logsHealth.healthy;
    const overallHealthy =
      kongHealth.healthy && (telemetryHealth.config.mode === "console" || otlpHealthy);

    const health = {
      status: overallHealthy ? "healthy" : "degraded",
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
        opentelemetry: {
          traces_endpoint: {
            status: !telemetryHealth.config.tracesEndpoint
              ? "not_configured"
              : tracesHealth.healthy
                ? "healthy"
                : "unhealthy",
            url: telemetryHealth.config.tracesEndpoint,
            response_time: tracesHealth.responseTime || undefined,
            error: tracesHealth.error,
          },
          metrics_endpoint: {
            status: !telemetryHealth.config.metricsEndpoint
              ? "not_configured"
              : metricsHealth.healthy
                ? "healthy"
                : "unhealthy",
            url: telemetryHealth.config.metricsEndpoint,
            response_time: metricsHealth.responseTime || undefined,
            error: metricsHealth.error,
          },
          logs_endpoint: {
            status: !telemetryHealth.config.logsEndpoint
              ? "not_configured"
              : logsHealth.healthy
                ? "healthy"
                : "unhealthy",
            url: telemetryHealth.config.logsEndpoint,
            response_time: logsHealth.responseTime || undefined,
            error: logsHealth.error,
          },
        },
      },
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

    const healthResponse = JSON.stringify(health, null, 2);
    const _responseSize = healthResponse.length;

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

    recordException(err as Error, {
      operation: "health_check",
      component: "kong",
    });
    recordError("health_check_failed", {
      error: (err as Error).message,
    });

    throw err;
  }
}

function handleTelemetryHealth(): Response {
  const startTime = Bun.nanoseconds();

  const tracer = trace.getTracer("authentication-service");

  return tracer.startActiveSpan(
    "GET /health/telemetry",
    {
      kind: 1,
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

function handleOpenAPISpec(acceptHeader?: string): Response {
  const startTime = Bun.nanoseconds();

  try {
    apiDocGenerator.setConfig(config);

    apiDocGenerator.registerAllRoutes();

    const openApiSpec = apiDocGenerator.generateSpec();

    const isYamlRequested =
      acceptHeader?.includes("application/yaml") ||
      acceptHeader?.includes("text/yaml") ||
      acceptHeader?.includes("application/x-yaml");

    let responseContent: string;
    let contentType: string;

    if (isYamlRequested) {
      responseContent = convertToYaml(openApiSpec);
      contentType = "application/yaml";
    } else {
      responseContent = JSON.stringify(openApiSpec, null, 2);
      contentType = "application/json";
    }

    const duration = (Bun.nanoseconds() - startTime) / 1_000_000;

    log("HTTP request processed OpenAPI specification served successfully", {
      method: "GET",
      url: "/",
      statusCode: 200,
      duration,
      format: isYamlRequested ? "yaml" : "json",
      routes_documented: Object.keys(openApiSpec.paths).length,
      schemas_defined: Object.keys(openApiSpec.components.schemas).length,
      operation: "openapi_spec_generation",
    });

    return new Response(responseContent, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=300",
        "X-API-Version": openApiSpec.info.version,
        "X-Generated-At": new Date().toISOString(),
      },
    });
  } catch (error) {
    const duration = (Bun.nanoseconds() - startTime) / 1_000_000;

    log("OpenAPI specification generation failed", {
      method: "GET",
      url: "/",
      statusCode: 500,
      duration,
      error: (error as Error).message,
      operation: "openapi_spec_generation",
    });

    return new Response(
      JSON.stringify({
        error: "OpenAPI Generation Error",
        message: "Failed to generate OpenAPI specification",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

function convertToYaml(obj: any, indent = 0): string {
  const spaces = "  ".repeat(indent);

  if (obj === null || obj === undefined) {
    return "null";
  }

  if (typeof obj === "string") {
    if (obj.includes("\n") || obj.includes('"') || obj.includes("'")) {
      return `|\n${spaces}  ${obj.split("\n").join(`\n${spaces}  `)}`;
    }
    if (obj.includes(":") || obj.includes("[") || obj.includes("{") || /^\d/.test(obj)) {
      return `"${obj.replace(/"/g, '\\"')}"`;
    }
    return obj;
  }

  if (typeof obj === "number" || typeof obj === "boolean") {
    return obj.toString();
  }

  if (Array.isArray(obj)) {
    if (obj.length === 0) return "[]";
    return obj
      .map(
        (item) => `\n${spaces}- ${convertToYaml(item, indent + 1).replace(/\n/g, `\n${spaces}  `)}`
      )
      .join("");
  }

  if (typeof obj === "object") {
    const entries = Object.entries(obj);
    if (entries.length === 0) return "{}";

    return entries
      .map(([key, value]) => {
        const yamlValue = convertToYaml(value, indent + 1);
        if (typeof value === "object" && !Array.isArray(value) && value !== null) {
          return `\n${spaces}${key}:${yamlValue.startsWith("\n") ? yamlValue : ` ${yamlValue}`}`;
        }
        return `\n${spaces}${key}: ${yamlValue}`;
      })
      .join("");
  }

  return obj.toString();
}

function handleMetrics(): Response {
  const startTime = Bun.nanoseconds();

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

    log("HTTP request processed Performance metrics retrieved successfully", {
      method: "GET",
      url: "/metrics",
      statusCode: 200,
      duration,
      uptime: Math.floor(process.uptime()),
      operation: "performance_metrics_retrieval",
    });

    const _responseSize = JSON.stringify(metrics, null, 2).length;

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

log("Authentication Service starting up", {
  component: "server",
  event: "startup_initiated",
  version: "1.0.0",
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

const routes = {
  "GET /": (req: Request, _url: URL, _span: any) =>
    handleOpenAPISpec(req.headers.get("Accept") || undefined),

  "GET /health": (_req: Request, _url: URL, span: any) => handleHealthCheck(span),

  "GET /health/telemetry": (_req: Request, _url: URL, _span: any) => handleTelemetryHealth(),

  "GET /health/metrics": (_req: Request, _url: URL, _span: any) => handleMetricsHealth(),

  "GET /metrics": (_req: Request, _url: URL, _span: any) => handleMetrics(),

  "GET /tokens": (req: Request, _url: URL, span: any) => handleTokenRequest(req, span),

  "POST /debug/metrics/test": (_req: Request, _url: URL, _span: any) => handleDebugMetricsTest(),

  "POST /debug/metrics/export": (_req: Request, _url: URL, _span: any) =>
    handleDebugMetricsExport(),

  "GET /debug/metrics/stats": (_req: Request, _url: URL, _span: any) => handleDebugMetricsStats(),
} as const;

async function handleRoute(req: Request, url: URL, span: any): Promise<Response> {
  const routeKey = `${req.method} ${url.pathname}` as keyof typeof routes;
  const handler = routes[routeKey];

  if (handler) {
    return await handler(req, url, span);
  }

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

  return new Response(
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

let server: any;

try {
  const tracer = trace.getTracer("authentication-service", "1.0.0");

  server = Bun.serve({
    port: config.server.port,
    hostname: "0.0.0.0",

    async fetch(req) {
      const url = new URL(req.url);

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
          try {
            const response = await handleRoute(req, url, span);

            span.setStatus({ code: 1 });
            span.setAttributes({
              "http.response.status_code": response.status,
            });

            return response;
          } catch (error) {
            span.setStatus({
              code: 2,
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
      await server.stop();
      log("HTTP server stopped successfully", {
        component: "server",
        event: "shutdown_http_server_completed",
      });
    }

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

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGHUP", () => gracefulShutdown("SIGHUP"));

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

process.on("unhandledRejection", (reason, _promise) => {
  error("Unhandled promise rejection - forcing shutdown", {
    component: "server",
    event: "unhandled_rejection",
    reason: String(reason),
    pid: process.pid,
  });
  process.exit(1);
});
