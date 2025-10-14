/* src/telemetry/metrics.ts */

import { type Attributes, metrics, type ObservableResult } from "@opentelemetry/api";
import pkg from "../../package.json" with { type: "json" };
import { error, warn } from "../utils/logger";
import {
  getMemoryStats,
  shouldDropNonCriticalMetrics,
  shouldDropTelemetry,
  startMemoryPressureMonitoring,
  stopMemoryPressureMonitoring,
} from "../utils/memory-pressure";

let isInitialized = false;

let httpRequestCounter: any;
let httpResponseTimeHistogram: any;
let httpRequestsByStatusCounter: any;
let httpActiveConnectionsGauge: any;
let httpRequestSizeHistogram: any;
let httpResponseSizeHistogram: any;

let processMemoryUsageGauge: any;
let processHeapUsageGauge: any;
let processCpuUsageGauge: any;
let processUptimeGauge: any;
let processActiveHandlesGauge: any;

let jwtTokensIssuedCounter: any;
let jwtTokenCreationTimeHistogram: any;
let authenticationAttemptsCounter: any;
let authenticationSuccessCounter: any;
let authenticationFailureCounter: any;
let kongOperationsCounter: any;
let kongResponseTimeHistogram: any;
let kongCacheHitCounter: any;
let kongCacheMissCounter: any;

let redisOperationsCounter: any;
let redisOperationDurationHistogram: any;
let redisConnectionsGauge: any;
let redisCacheHitCounter: any;
let redisCacheMissCounter: any;
let redisErrorsCounter: any;

let errorRateCounter: any;
let exceptionCounter: any;
let telemetryExportCounter: any;
let telemetryExportErrorCounter: any;
let circuitBreakerStateGauge: any;
let circuitBreakerRequestsCounter: any;
let circuitBreakerRejectedCounter: any;
let circuitBreakerFallbackCounter: any;
let circuitBreakerStateTransitionCounter: any;
let operationDurationHistogram: any;

let systemMetricsInterval: Timer | null = null;

export function initializeMetrics(): void {
  if (isInitialized) return;

  const _meterProvider = metrics.getMeterProvider();

  const meter = metrics.getMeter("authentication-service", pkg.version || "1.0.0");

  httpRequestCounter = meter.createCounter("http_requests_total", {
    description: "Total number of HTTP requests",
    unit: "1",
  });

  httpResponseTimeHistogram = meter.createHistogram("http_response_time_seconds", {
    description: "HTTP request response time in seconds",
    unit: "s",
    advice: {
      explicitBucketBoundaries: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    },
  });

  httpRequestsByStatusCounter = meter.createCounter("http_requests_by_status_total", {
    description: "HTTP requests grouped by status code",
    unit: "1",
  });

  httpActiveConnectionsGauge = meter.createUpDownCounter("http_active_connections", {
    description: "Number of active HTTP connections",
    unit: "1",
  });

  httpRequestSizeHistogram = meter.createHistogram("http_request_size_bytes", {
    description: "HTTP request payload size in bytes",
    unit: "By",
  });

  httpResponseSizeHistogram = meter.createHistogram("http_response_size_bytes", {
    description: "HTTP response payload size in bytes",
    unit: "By",
  });

  processMemoryUsageGauge = meter.createObservableGauge("process_memory_usage_bytes", {
    description: "Process memory usage in bytes",
    unit: "By",
  });

  processHeapUsageGauge = meter.createObservableGauge("process_heap_usage_bytes", {
    description: "Process heap memory usage in bytes",
    unit: "By",
  });

  processCpuUsageGauge = meter.createObservableGauge("process_cpu_usage_percent", {
    description: "Process CPU usage percentage",
    unit: "%",
  });

  processUptimeGauge = meter.createObservableGauge("process_uptime_seconds", {
    description: "Process uptime in seconds",
    unit: "s",
  });

  processActiveHandlesGauge = meter.createObservableGauge("process_active_handles", {
    description: "Number of active handles",
    unit: "1",
  });

  jwtTokensIssuedCounter = meter.createCounter("jwt_tokens_issued_total", {
    description: "Total number of JWT tokens issued",
    unit: "1",
  });

  jwtTokenCreationTimeHistogram = meter.createHistogram("jwt_token_creation_duration_seconds", {
    description: "Time taken to create JWT tokens",
    unit: "s",
  });

  authenticationAttemptsCounter = meter.createCounter("authentication_attempts_total", {
    description: "Total number of authentication attempts",
    unit: "1",
  });

  authenticationSuccessCounter = meter.createCounter("authentication_success_total", {
    description: "Total number of successful authentications",
    unit: "1",
  });

  authenticationFailureCounter = meter.createCounter("authentication_failures_total", {
    description: "Total number of failed authentications",
    unit: "1",
  });

  kongOperationsCounter = meter.createCounter("kong_operations_total", {
    description: "Total number of Kong API operations",
    unit: "1",
  });

  kongResponseTimeHistogram = meter.createHistogram("kong_operation_duration_seconds", {
    description: "Kong API operation response time",
    unit: "s",
  });

  kongCacheHitCounter = meter.createCounter("kong_cache_hits_total", {
    description: "Number of Kong cache hits",
    unit: "1",
  });

  kongCacheMissCounter = meter.createCounter("kong_cache_misses_total", {
    description: "Number of Kong cache misses",
    unit: "1",
  });

  redisOperationsCounter = meter.createCounter("redis_operations_total", {
    description: "Total number of Redis operations",
    unit: "1",
  });

  redisOperationDurationHistogram = meter.createHistogram("redis_operation_duration_seconds", {
    description: "Redis operation response time in seconds",
    unit: "s",
    advice: {
      explicitBucketBoundaries: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2],
    },
  });

  redisConnectionsGauge = meter.createUpDownCounter("redis_connections_active", {
    description: "Number of active Redis connections",
    unit: "1",
  });

  redisCacheHitCounter = meter.createCounter("redis_cache_hits_total", {
    description: "Total number of Redis cache hits",
    unit: "1",
  });

  redisCacheMissCounter = meter.createCounter("redis_cache_misses_total", {
    description: "Total number of Redis cache misses",
    unit: "1",
  });

  redisErrorsCounter = meter.createCounter("redis_errors_total", {
    description: "Total number of Redis operation errors",
    unit: "1",
  });

  errorRateCounter = meter.createCounter("application_errors_total", {
    description: "Total number of application errors",
    unit: "1",
  });

  exceptionCounter = meter.createCounter("application_exceptions_total", {
    description: "Total number of uncaught exceptions",
    unit: "1",
  });

  telemetryExportCounter = meter.createCounter("telemetry_exports_total", {
    description: "Total number of telemetry export attempts",
    unit: "1",
  });

  telemetryExportErrorCounter = meter.createCounter("telemetry_export_errors_total", {
    description: "Total number of telemetry export errors",
    unit: "1",
  });

  circuitBreakerStateGauge = meter.createObservableGauge("circuit_breaker_state", {
    description: "Circuit breaker state (0=closed, 1=open, 2=half-open)",
    unit: "1",
  });

  circuitBreakerRequestsCounter = meter.createCounter("circuit_breaker_requests_total", {
    description: "Total number of requests through circuit breaker",
    unit: "1",
  });

  circuitBreakerRejectedCounter = meter.createCounter("circuit_breaker_rejected_total", {
    description: "Total number of requests rejected by circuit breaker",
    unit: "1",
  });

  circuitBreakerFallbackCounter = meter.createCounter("circuit_breaker_fallback_total", {
    description: "Total number of fallback executions",
    unit: "1",
  });

  circuitBreakerStateTransitionCounter = meter.createCounter(
    "circuit_breaker_state_transitions_total",
    {
      description: "Total number of circuit breaker state transitions",
      unit: "1",
    }
  );

  operationDurationHistogram = meter.createHistogram("operation_duration_seconds", {
    description: "Duration of various operations",
    unit: "s",
  });

  setupSystemMetricsCollection();
  startMemoryPressureMonitoring();

  isInitialized = true;
}

export function recordHttpRequest(
  method: string,
  route: string,
  statusCode?: number,
  requestSize?: number,
  responseSize?: number
): void {
  if (!isInitialized) {
    warn("Metrics not initialized - cannot record HTTP request", {
      initialized: isInitialized,
    });
    return;
  }

  const attributes = {
    method: method.toUpperCase(),
    route,
    ...(statusCode && { status_code: statusCode.toString() }),
  };

  try {
    httpRequestCounter.add(1, attributes);

    if (statusCode) {
      const statusAttributes = {
        method: method.toUpperCase(),
        route,
        status_code: statusCode.toString(),
        status_class: `${Math.floor(statusCode / 100)}xx`,
      };
      httpRequestsByStatusCounter.add(1, statusAttributes);
    }

    if (requestSize !== undefined) {
      httpRequestSizeHistogram.record(requestSize, attributes);
    }

    if (responseSize !== undefined) {
      httpResponseSizeHistogram.record(responseSize, attributes);
    }
  } catch (err) {
    error("Failed to record HTTP request metrics", {
      error: (err as Error).message,
      attributes,
    });
    recordError("metrics_recording_error", {
      operation: "recordHttpRequest",
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
}

export function recordHttpResponseTime(
  durationMs: number,
  method: string,
  route: string,
  statusCode?: number
): void {
  if (!isInitialized) {
    warn("Metrics not initialized - cannot record HTTP response time", {
      initialized: isInitialized,
    });
    return;
  }

  const durationSeconds = durationMs / 1000;
  const attributes = {
    method: method.toUpperCase(),
    route,
    ...(statusCode && { status_code: statusCode.toString() }),
  };

  try {
    httpResponseTimeHistogram.record(durationSeconds, attributes);
  } catch (err) {
    error("Failed to record HTTP response time metric", {
      error: (err as Error).message,
      attributes,
      durationMs,
    });
    recordError("metrics_recording_error", {
      operation: "recordHttpResponseTime",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export function recordHttpRequestSize(
  size: number,
  method: string,
  route: string,
  statusCode?: number
): void {
  if (!isInitialized) {
    warn("Metrics not initialized - cannot record HTTP request size", {
      initialized: isInitialized,
    });
    return;
  }

  const attributes = {
    method: method.toUpperCase(),
    route,
    ...(statusCode && { status_code: statusCode.toString() }),
  };

  try {
    httpRequestSizeHistogram.record(size, attributes);
  } catch (err) {
    error("Failed to record HTTP request size metric", {
      error: (err as Error).message,
      attributes,
      size,
    });
    recordError("metrics_recording_error", {
      operation: "recordHttpRequestSize",
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
}

export function recordHttpResponseSize(
  size: number,
  method: string,
  route: string,
  statusCode?: number
): void {
  if (!isInitialized) {
    warn("Metrics not initialized - cannot record HTTP response size", {
      initialized: isInitialized,
    });
    return;
  }

  const attributes = {
    method: method.toUpperCase(),
    route,
    ...(statusCode && { status_code: statusCode.toString() }),
  };

  try {
    httpResponseSizeHistogram.record(size, attributes);
  } catch (err) {
    error("Failed to record HTTP response size metric", {
      error: (err as Error).message,
      attributes,
      size,
    });
    recordError("metrics_recording_error", {
      operation: "recordHttpResponseSize",
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
}

export function recordJwtTokenIssued(username: string, creationTimeMs: number): void {
  if (!isInitialized) return;

  const attributes = { username };
  const creationTimeSeconds = creationTimeMs / 1000;

  try {
    jwtTokensIssuedCounter.add(1, attributes);
    jwtTokenCreationTimeHistogram.record(creationTimeSeconds, attributes);
  } catch (err) {
    error("Failed to record JWT token metrics", {
      error: (err as Error).message,
    });
  }
}

export function recordAuthenticationAttempt(
  type: string,
  success: boolean,
  username?: string
): void {
  if (!isInitialized) return;

  const attributes = {
    auth_type: type,
    ...(username && { username }),
  };

  try {
    authenticationAttemptsCounter.add(1, attributes);

    if (success) {
      authenticationSuccessCounter.add(1, attributes);
    } else {
      authenticationFailureCounter.add(1, attributes);
    }
  } catch (err) {
    error("Failed to record authentication metrics", {
      error: (err as Error).message,
    });
  }
}

export function recordAuthenticationSuccess(username?: string): void {
  if (!isInitialized) return;

  const attributes = {
    ...(username && { username }),
  };

  try {
    authenticationSuccessCounter.add(1, attributes);
  } catch (err) {
    error("Failed to record authentication success metric", {
      error: (err as Error).message,
    });
  }
}

export function recordAuthenticationFailure(username?: string, reason?: string): void {
  if (!isInitialized) return;

  const attributes = {
    ...(username && { username }),
    ...(reason && { reason }),
  };

  try {
    authenticationFailureCounter.add(1, attributes);
  } catch (err) {
    error("Failed to record authentication failure metric", {
      error: (err as Error).message,
    });
  }
}

export function recordKongOperation(
  operation: string,
  status?: string,
  durationMs?: number,
  success?: boolean,
  cached?: boolean
): void {
  if (!isInitialized) return;

  const attributes = {
    operation,
    ...(status && { status }),
    ...(success !== undefined && { success: success.toString() }),
  };

  try {
    kongOperationsCounter.add(1, attributes);

    if (durationMs !== undefined) {
      const durationSeconds = durationMs / 1000;
      kongResponseTimeHistogram.record(durationSeconds, attributes);
    }

    if (cached !== undefined) {
      if (cached) {
        kongCacheHitCounter.add(1, { operation });
      } else {
        kongCacheMissCounter.add(1, { operation });
      }
    }
  } catch (err) {
    error("Failed to record Kong operation metrics", {
      error: (err as Error).message,
    });
  }
}

export function recordKongResponseTime(
  durationMs: number,
  operation: string,
  status?: string
): void {
  if (!isInitialized) return;

  const attributes = {
    operation,
    ...(status && { status }),
  };

  const durationSeconds = durationMs / 1000;

  try {
    kongResponseTimeHistogram.record(durationSeconds, attributes);
  } catch (err) {
    error("Failed to record Kong response time metric", {
      error: (err as Error).message,
    });
  }
}

export function recordKongCacheHit(consumerId: string, operation: string): void {
  if (!isInitialized) return;

  const attributes = { operation, consumer_id: consumerId };

  try {
    kongCacheHitCounter.add(1, attributes);
  } catch (err) {
    error("Failed to record Kong cache hit metric", {
      error: (err as Error).message,
    });
  }
}

export function recordKongCacheMiss(consumerId: string, operation: string): void {
  if (!isInitialized) return;

  const attributes = { operation, consumer_id: consumerId };

  try {
    kongCacheMissCounter.add(1, attributes);
  } catch (err) {
    error("Failed to record Kong cache miss metric", {
      error: (err as Error).message,
    });
  }
}

export function recordRedisOperation(
  operation: string,
  durationMs: number,
  success: boolean,
  cacheResult?: "hit" | "miss",
  connectionInfo?: { url?: string; database?: number }
): void {
  if (!isInitialized) return;

  const attributes = {
    operation: operation.toUpperCase(),
    success: success.toString(),
    ...(connectionInfo?.database !== undefined && { database: connectionInfo.database.toString() }),
  };

  const durationSeconds = durationMs / 1000;

  try {
    redisOperationsCounter.add(1, attributes);
    redisOperationDurationHistogram.record(durationSeconds, attributes);

    if (cacheResult) {
      const cacheAttributes = { operation: operation.toUpperCase() };
      if (cacheResult === "hit") {
        redisCacheHitCounter.add(1, cacheAttributes);
      } else {
        redisCacheMissCounter.add(1, cacheAttributes);
      }
    }

    if (!success) {
      redisErrorsCounter.add(1, { operation: operation.toUpperCase() });
    }
  } catch (err) {
    error("Failed to record Redis operation metrics", {
      error: (err as Error).message,
      operation,
      success,
      durationMs,
    });
  }
}

export function recordRedisConnection(increment: boolean): void {
  if (!isInitialized) return;

  try {
    redisConnectionsGauge.add(increment ? 1 : -1);
  } catch (err) {
    error("Failed to record Redis connection metric", {
      error: (err as Error).message,
      increment,
    });
  }
}

export function recordActiveConnection(increment: boolean): void {
  if (!isInitialized) return;

  try {
    httpActiveConnectionsGauge.add(increment ? 1 : -1);
  } catch (err) {
    error("Failed to record active connection metric", {
      error: (err as Error).message,
    });
  }
}

export function recordError(errorType: string, context?: Record<string, any>): void {
  if (!isInitialized) return;

  const attributes = {
    error_type: errorType,
    ...(context &&
      Object.keys(context).reduce(
        (acc, key) => {
          acc[key] = String(context[key]);
          return acc;
        },
        {} as Record<string, string>
      )),
  };

  try {
    errorRateCounter.add(1, attributes);
  } catch (err) {
    error("Failed to record error metric", {
      error: (err as Error).message,
    });
  }
}

export function recordException(exception: Error, context?: Record<string, any>): void {
  if (!isInitialized) return;

  const attributes = {
    exception_name: exception.name,
    exception_message: exception.message,
    ...(context &&
      Object.keys(context).reduce(
        (acc, key) => {
          acc[key] = String(context[key]);
          return acc;
        },
        {} as Record<string, string>
      )),
  };

  try {
    exceptionCounter.add(1, attributes);
  } catch (err) {
    error("Failed to record exception metric", {
      error: (err as Error).message,
    });
  }
}

export function recordOperationDuration(
  operation: string,
  durationMs: number,
  success?: boolean,
  context?: Record<string, any>
): void {
  if (!isInitialized) return;

  const attributes = {
    operation,
    ...(success !== undefined && { success: success.toString() }),
    ...(context &&
      Object.keys(context).reduce(
        (acc, key) => {
          acc[key] = String(context[key]);
          return acc;
        },
        {} as Record<string, string>
      )),
  };

  const durationSeconds = durationMs / 1000;

  try {
    operationDurationHistogram.record(durationSeconds, attributes);
  } catch (err) {
    error("Failed to record operation duration metric", {
      error: (err as Error).message,
    });
  }
}

export function recordTelemetryExport(exportType: string): void {
  if (!isInitialized) return;

  const attributes = { export_type: exportType };

  try {
    telemetryExportCounter.add(1, attributes);
  } catch (err) {
    error("Failed to record telemetry export metric", {
      error: (err as Error).message,
    });
  }
}

export function recordTelemetryExportError(exportType: string, errorType?: string): void {
  if (!isInitialized) return;

  const attributes = {
    export_type: exportType,
    ...(errorType && { error_type: errorType }),
  };

  try {
    telemetryExportErrorCounter.add(1, attributes);
  } catch (err) {
    error("Failed to record telemetry export error metric", {
      error: (err as Error).message,
    });
  }
}

export function recordCircuitBreakerRequest(
  operation: string,
  success: boolean,
  fallback?: boolean
): void {
  if (!isInitialized) return;

  const attributes = {
    operation,
    success: success.toString(),
  };

  try {
    circuitBreakerRequestsCounter.add(1, attributes);

    if (fallback) {
      circuitBreakerFallbackCounter.add(1, { operation });
    }
  } catch (err) {
    error("Failed to record circuit breaker request metric", {
      error: (err as Error).message,
    });
  }
}

export function recordCircuitBreakerRejection(operation: string, reason?: string): void {
  if (!isInitialized) return;

  const attributes = {
    operation,
    ...(reason && { reason }),
  };

  try {
    circuitBreakerRejectedCounter.add(1, attributes);
  } catch (err) {
    error("Failed to record circuit breaker rejection metric", {
      error: (err as Error).message,
    });
  }
}

export function recordCircuitBreakerStateTransition(
  operation: string,
  fromState: string,
  toState: string
): void {
  if (!isInitialized) return;

  const attributes = {
    operation,
    from_state: fromState,
    to_state: toState,
  };

  try {
    circuitBreakerStateTransitionCounter.add(1, attributes);
  } catch (err) {
    error("Failed to record circuit breaker state transition metric", {
      error: (err as Error).message,
    });
  }
}

export function recordCircuitBreakerFallback(operation: string, reason?: string): void {
  if (!isInitialized) return;

  const attributes = {
    operation,
    ...(reason && { reason }),
  };

  try {
    circuitBreakerFallbackCounter.add(1, attributes);
  } catch (err) {
    error("Failed to record circuit breaker fallback metric", {
      error: (err as Error).message,
    });
  }
}

function setupSystemMetricsCollection(): void {
  // Set up callbacks once during initialization
  processMemoryUsageGauge.addCallback((observableResult: ObservableResult<Attributes>) => {
    try {
      if (shouldDropTelemetry()) return;

      const memUsage = process.memoryUsage();
      observableResult.observe(memUsage.rss, { type: "rss" });
      observableResult.observe(memUsage.external, { type: "external" });
      observableResult.observe(memUsage.arrayBuffers, { type: "array_buffers" });
    } catch (err) {
      error("Failed to collect memory metrics", { error: (err as Error).message });
    }
  });

  processHeapUsageGauge.addCallback((observableResult: ObservableResult<Attributes>) => {
    try {
      if (shouldDropTelemetry()) return;

      const memUsage = process.memoryUsage();
      observableResult.observe(memUsage.heapUsed, { type: "used" });
      observableResult.observe(memUsage.heapTotal, { type: "total" });
    } catch (err) {
      error("Failed to collect heap metrics", { error: (err as Error).message });
    }
  });

  let previousCpuUsage = process.cpuUsage();
  let previousTime = Date.now();

  processCpuUsageGauge.addCallback((observableResult: ObservableResult<Attributes>) => {
    try {
      if (shouldDropNonCriticalMetrics()) return;

      const currentCpuUsage = process.cpuUsage(previousCpuUsage);
      const currentTime = Date.now();
      const timeDiff = currentTime - previousTime;
      const cpuPercent =
        timeDiff > 0
          ? ((currentCpuUsage.user + currentCpuUsage.system) / 1000 / timeDiff) * 100
          : 0;

      observableResult.observe(cpuPercent, { type: "combined" });

      previousCpuUsage = process.cpuUsage();
      previousTime = currentTime;
    } catch (err) {
      error("Failed to collect CPU metrics", { error: (err as Error).message });
    }
  });

  processUptimeGauge.addCallback((observableResult: ObservableResult<Attributes>) => {
    try {
      observableResult.observe(process.uptime());
    } catch (err) {
      error("Failed to collect uptime metrics", { error: (err as Error).message });
    }
  });

  processActiveHandlesGauge.addCallback((observableResult: ObservableResult<Attributes>) => {
    try {
      if (shouldDropNonCriticalMetrics()) return;

      if (typeof (process as any)._getActiveHandles === "function") {
        const activeHandles = (process as any)._getActiveHandles().length;
        observableResult.observe(activeHandles);
      }
    } catch (err) {
      error("Failed to collect active handles metrics", { error: (err as Error).message });
    }
  });

  // Optional interval for additional monitoring (not required for OpenTelemetry)
  systemMetricsInterval = setInterval(() => {
    // This can be used for logging or debugging purposes
    // The actual metrics collection happens through callbacks above
  }, 10000);
}

export function testMetricRecording(): void {
  recordHttpRequest("GET", "/test", 200, 1024, 2048);
  recordHttpResponseTime(123, "GET", "/test", 200);
  recordActiveConnection(true);
  recordActiveConnection(false);

  recordJwtTokenIssued("test-user", 45);
  recordAuthenticationAttempt("kong_header", true, "test-user");
  recordAuthenticationAttempt("jwt", false);
  recordKongOperation("get_consumer_secret", "success", 89, true, false);
  recordKongOperation("health_check", "success", 23, true, true);

  recordRedisOperation("GET", 12, true, "hit", { database: 0 });
  recordRedisOperation("SET", 8, true, undefined, { database: 0 });
  recordRedisOperation("DEL", 5, true, undefined, { database: 0 });
  recordRedisOperation("GET", 15, true, "miss", { database: 0 });
  recordRedisOperation("CONNECT", 45, false, undefined, { database: 0 });
  recordRedisConnection(true);

  recordError("validation_error", { field: "username", reason: "missing" });
  recordException(new Error("Test exception"), { component: "test" });
  recordOperationDuration("database_query", 156, true, {
    query: "SELECT users",
  });

  recordTelemetryExport("metrics");
  recordTelemetryExportError("traces", "connection_timeout");
}

export function getMetricsStatus() {
  return {
    initialized: isInitialized,
    instruments: {
      httpRequestCounter: !!httpRequestCounter,
      httpResponseTimeHistogram: !!httpResponseTimeHistogram,
      httpRequestsByStatusCounter: !!httpRequestsByStatusCounter,
      httpActiveConnectionsGauge: !!httpActiveConnectionsGauge,
      httpRequestSizeHistogram: !!httpRequestSizeHistogram,
      httpResponseSizeHistogram: !!httpResponseSizeHistogram,

      processMemoryUsageGauge: !!processMemoryUsageGauge,
      processHeapUsageGauge: !!processHeapUsageGauge,
      processCpuUsageGauge: !!processCpuUsageGauge,
      processUptimeGauge: !!processUptimeGauge,
      processActiveHandlesGauge: !!processActiveHandlesGauge,

      jwtTokensIssuedCounter: !!jwtTokensIssuedCounter,
      jwtTokenCreationTimeHistogram: !!jwtTokenCreationTimeHistogram,
      authenticationAttemptsCounter: !!authenticationAttemptsCounter,
      authenticationSuccessCounter: !!authenticationSuccessCounter,
      authenticationFailureCounter: !!authenticationFailureCounter,
      kongOperationsCounter: !!kongOperationsCounter,
      kongResponseTimeHistogram: !!kongResponseTimeHistogram,
      kongCacheHitCounter: !!kongCacheHitCounter,
      kongCacheMissCounter: !!kongCacheMissCounter,

      redisOperationsCounter: !!redisOperationsCounter,
      redisOperationDurationHistogram: !!redisOperationDurationHistogram,
      redisConnectionsGauge: !!redisConnectionsGauge,
      redisCacheHitCounter: !!redisCacheHitCounter,
      redisCacheMissCounter: !!redisCacheMissCounter,
      redisErrorsCounter: !!redisErrorsCounter,

      errorRateCounter: !!errorRateCounter,
      exceptionCounter: !!exceptionCounter,
      telemetryExportCounter: !!telemetryExportCounter,
      telemetryExportErrorCounter: !!telemetryExportErrorCounter,
      circuitBreakerStateGauge: !!circuitBreakerStateGauge,
      circuitBreakerRequestsCounter: !!circuitBreakerRequestsCounter,
      circuitBreakerRejectedCounter: !!circuitBreakerRejectedCounter,
      circuitBreakerFallbackCounter: !!circuitBreakerFallbackCounter,
      circuitBreakerStateTransitionCounter: !!circuitBreakerStateTransitionCounter,
      operationDurationHistogram: !!operationDurationHistogram,
    },
    meterInfo: {
      name: "authentication-service-metrics",
      version: pkg.version || "1.0.0",
    },
    systemMetricsCollection: {
      enabled: !!systemMetricsInterval,
      intervalMs: 10000,
    },
    availableMetrics: {
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
      redis: [
        "redis_operations_total",
        "redis_operation_duration_seconds",
        "redis_connections_active",
        "redis_cache_hits_total",
        "redis_cache_misses_total",
        "redis_errors_total",
      ],
      errors: [
        "application_errors_total",
        "application_exceptions_total",
        "telemetry_exports_total",
        "telemetry_export_errors_total",
        "operation_duration_seconds",
      ],
      circuitBreaker: [
        "circuit_breaker_state",
        "circuit_breaker_requests_total",
        "circuit_breaker_rejected_total",
        "circuit_breaker_fallback_total",
        "circuit_breaker_state_transitions_total",
      ],
    },
    totalInstruments: 33,
    memoryPressure: getMemoryStats(),
    optimizations: {
      memoryPressureEnabled: true,
      duplicateMetricsRemoved: true,
      elasticCompatibilityLayerRemoved: true,
    },
  };
}

export function startSystemMetricsCollection(): void {
  if (systemMetricsInterval) return;

  systemMetricsInterval = setInterval(() => {
    // Metrics are collected via callbacks during initialization
    // This interval exists for potential future use
  }, 10000);
}

export function stopSystemMetricsCollection(): void {
  if (systemMetricsInterval) {
    clearInterval(systemMetricsInterval);
    systemMetricsInterval = null;
  }
}

export function shutdownMetrics(): void {
  stopSystemMetricsCollection();
  stopMemoryPressureMonitoring();
  isInitialized = false;
}
