/* src/telemetry/metrics.ts */

// Comprehensive metrics collection for production observability
import { type Attributes, metrics, type ObservableResult } from "@opentelemetry/api";

let isInitialized = false;

// HTTP Metrics
let httpRequestCounter: any;
let httpResponseTimeHistogram: any;
let httpRequestsByStatusCounter: any;
let httpActiveConnectionsGauge: any;
let httpRequestSizeHistogram: any;
let httpResponseSizeHistogram: any;

// System Metrics
let processMemoryUsageGauge: any;
let processHeapUsageGauge: any;
let processCpuUsageGauge: any;
let processUptimeGauge: any;
let processActiveHandlesGauge: any;

// Business/Application Metrics
let jwtTokensIssuedCounter: any;
let jwtTokenCreationTimeHistogram: any;
let authenticationAttemptsCounter: any;
let authenticationSuccessCounter: any;
let authenticationFailureCounter: any;
let kongOperationsCounter: any;
let kongResponseTimeHistogram: any;
let kongCacheHitCounter: any;
let kongCacheMissCounter: any;

// Error and Performance Metrics
let errorRateCounter: any;
let exceptionCounter: any;
let telemetryExportCounter: any;
let telemetryExportErrorCounter: any;
let circuitBreakerStateGauge: any;
let operationDurationHistogram: any;

// System monitoring interval
let systemMetricsInterval: Timer | null = null;

export function initializeMetrics(): void {
  if (isInitialized) return;

  // Use the global metrics API - should be configured by NodeSDK
  const _meterProvider = metrics.getMeterProvider();

  const meter = metrics.getMeter("authentication-service-metrics", "1.0.0");

  // HTTP Metrics
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

  // System Metrics
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

  // Business/Application Metrics
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

  // Error and Performance Metrics
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

  operationDurationHistogram = meter.createHistogram("operation_duration_seconds", {
    description: "Duration of various operations",
    unit: "s",
  });

  // Set up system metrics collection
  setupSystemMetricsCollection();

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
    console.warn("⚠️ Metrics not initialized - cannot record HTTP request", {
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
    // Record total HTTP requests
    httpRequestCounter.add(1, attributes);

    // Record requests by status code
    if (statusCode) {
      const statusAttributes = {
        method: method.toUpperCase(),
        route,
        status_code: statusCode.toString(),
        status_class: `${Math.floor(statusCode / 100)}xx`,
      };
      httpRequestsByStatusCounter.add(1, statusAttributes);
    }

    // Record request size if provided
    if (requestSize !== undefined) {
      httpRequestSizeHistogram.record(requestSize, attributes);
    }

    // Record response size if provided
    if (responseSize !== undefined) {
      httpResponseSizeHistogram.record(responseSize, attributes);
    }
  } catch (error) {
    console.error("❌ Failed to record HTTP request metrics:", error, {
      attributes,
    });
    recordError("metrics_recording_error", {
      operation: "recordHttpRequest",
      error: error instanceof Error ? error.message : "Unknown error",
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
    console.warn("⚠️ Metrics not initialized - cannot record HTTP response time", {
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
  } catch (error) {
    console.error("❌ Failed to record HTTP response time metric:", error, {
      attributes,
      durationMs,
    });
    recordError("metrics_recording_error", {
      operation: "recordHttpResponseTime",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// JWT Token Metrics
export function recordJwtTokenIssued(username: string, creationTimeMs: number): void {
  if (!isInitialized) return;

  const attributes = { username };
  const creationTimeSeconds = creationTimeMs / 1000;

  try {
    jwtTokensIssuedCounter.add(1, attributes);
    jwtTokenCreationTimeHistogram.record(creationTimeSeconds, attributes);
  } catch (error) {
    console.error("❌ Failed to record JWT token metrics:", error);
  }
}

// Authentication Metrics
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
  } catch (error) {
    console.error("❌ Failed to record authentication metrics:", error);
  }
}

// Kong Operation Metrics
export function recordKongOperation(
  operation: string,
  durationMs: number,
  success: boolean,
  cached?: boolean
): void {
  if (!isInitialized) return;

  const attributes = {
    operation,
    success: success.toString(),
  };

  const durationSeconds = durationMs / 1000;

  try {
    kongOperationsCounter.add(1, attributes);
    kongResponseTimeHistogram.record(durationSeconds, attributes);

    if (cached !== undefined) {
      if (cached) {
        kongCacheHitCounter.add(1, { operation });
      } else {
        kongCacheMissCounter.add(1, { operation });
      }
    }
  } catch (error) {
    console.error("❌ Failed to record Kong operation metrics:", error);
  }
}

// Active Connections
export function recordActiveConnection(increment: boolean): void {
  if (!isInitialized) return;

  try {
    httpActiveConnectionsGauge.add(increment ? 1 : -1);
  } catch (error) {
    console.error("❌ Failed to record active connection metric:", error);
  }
}

// Error Tracking
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
  } catch (error) {
    console.error("❌ Failed to record error metric:", error);
  }
}

// Exception Tracking
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
  } catch (error) {
    console.error("❌ Failed to record exception metric:", error);
  }
}

// Operation Duration
export function recordOperationDuration(
  operation: string,
  durationMs: number,
  success: boolean,
  context?: Record<string, any>
): void {
  if (!isInitialized) return;

  const attributes = {
    operation,
    success: success.toString(),
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
  } catch (error) {
    console.error("❌ Failed to record operation duration metric:", error);
  }
}

// Telemetry Export Tracking
export function recordTelemetryExport(success: boolean, exportType: string, error?: string): void {
  if (!isInitialized) return;

  const attributes = { export_type: exportType };

  try {
    telemetryExportCounter.add(1, attributes);

    if (!success) {
      telemetryExportErrorCounter.add(1, {
        ...attributes,
        ...(error && { error_type: error }),
      });
    }
  } catch (error) {
    console.error("❌ Failed to record telemetry export metric:", error);
  }
}

// System Metrics Collection
function setupSystemMetricsCollection(): void {
  // Collect system metrics every 10 seconds
  systemMetricsInterval = setInterval(() => {
    try {
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();

      // Memory metrics
      processMemoryUsageGauge.addCallback((observableResult: ObservableResult<Attributes>) => {
        observableResult.observe(memUsage.rss, { type: "rss" });
        observableResult.observe(memUsage.external, { type: "external" });
        observableResult.observe(memUsage.arrayBuffers, {
          type: "array_buffers",
        });
      });

      processHeapUsageGauge.addCallback((observableResult: ObservableResult<Attributes>) => {
        observableResult.observe(memUsage.heapUsed, { type: "used" });
        observableResult.observe(memUsage.heapTotal, { type: "total" });
      });

      // CPU metrics (converted to percentage)
      const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1000; // Convert from microseconds
      processCpuUsageGauge.addCallback((observableResult: ObservableResult<Attributes>) => {
        observableResult.observe(cpuPercent, { type: "combined" });
      });

      // Uptime
      processUptimeGauge.addCallback((observableResult: ObservableResult<Attributes>) => {
        observableResult.observe(process.uptime());
      });

      // Active handles (if available)
      if (typeof (process as any)._getActiveHandles === "function") {
        const activeHandles = (process as any)._getActiveHandles().length;
        processActiveHandlesGauge.addCallback((observableResult: ObservableResult<Attributes>) => {
          observableResult.observe(activeHandles);
        });
      }
    } catch (error) {
      console.error("❌ Failed to collect system metrics:", error);
    }
  }, 10000); // Every 10 seconds
}

// Test metric recording function for debugging
export function testMetricRecording(): void {
  // Test HTTP metrics
  recordHttpRequest("GET", "/test", 200, 1024, 2048);
  recordHttpResponseTime(123, "GET", "/test", 200);
  recordActiveConnection(true);
  recordActiveConnection(false);

  // Test business metrics
  recordJwtTokenIssued("test-user", 45);
  recordAuthenticationAttempt("kong_header", true, "test-user");
  recordAuthenticationAttempt("jwt", false);
  recordKongOperation("get_consumer_secret", 89, true, false);
  recordKongOperation("health_check", 23, true, true);

  // Test error metrics
  recordError("validation_error", { field: "username", reason: "missing" });
  recordException(new Error("Test exception"), { component: "test" });
  recordOperationDuration("database_query", 156, true, {
    query: "SELECT users",
  });

  // Test telemetry metrics
  recordTelemetryExport(true, "metrics");
  recordTelemetryExport(false, "traces", "connection_timeout");
}

export function getMetricsStatus() {
  return {
    initialized: isInitialized,
    instruments: {
      // HTTP Metrics
      httpRequestCounter: !!httpRequestCounter,
      httpResponseTimeHistogram: !!httpResponseTimeHistogram,
      httpRequestsByStatusCounter: !!httpRequestsByStatusCounter,
      httpActiveConnectionsGauge: !!httpActiveConnectionsGauge,
      httpRequestSizeHistogram: !!httpRequestSizeHistogram,
      httpResponseSizeHistogram: !!httpResponseSizeHistogram,

      // System Metrics
      processMemoryUsageGauge: !!processMemoryUsageGauge,
      processHeapUsageGauge: !!processHeapUsageGauge,
      processCpuUsageGauge: !!processCpuUsageGauge,
      processUptimeGauge: !!processUptimeGauge,
      processActiveHandlesGauge: !!processActiveHandlesGauge,

      // Business Metrics
      jwtTokensIssuedCounter: !!jwtTokensIssuedCounter,
      jwtTokenCreationTimeHistogram: !!jwtTokenCreationTimeHistogram,
      authenticationAttemptsCounter: !!authenticationAttemptsCounter,
      authenticationSuccessCounter: !!authenticationSuccessCounter,
      authenticationFailureCounter: !!authenticationFailureCounter,
      kongOperationsCounter: !!kongOperationsCounter,
      kongResponseTimeHistogram: !!kongResponseTimeHistogram,
      kongCacheHitCounter: !!kongCacheHitCounter,
      kongCacheMissCounter: !!kongCacheMissCounter,

      // Error and Performance Metrics
      errorRateCounter: !!errorRateCounter,
      exceptionCounter: !!exceptionCounter,
      telemetryExportCounter: !!telemetryExportCounter,
      telemetryExportErrorCounter: !!telemetryExportErrorCounter,
      circuitBreakerStateGauge: !!circuitBreakerStateGauge,
      operationDurationHistogram: !!operationDurationHistogram,
    },
    meterInfo: {
      name: "authentication-service-metrics",
      version: "1.0.0",
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
      errors: [
        "application_errors_total",
        "application_exceptions_total",
        "telemetry_exports_total",
        "telemetry_export_errors_total",
        "circuit_breaker_state",
        "operation_duration_seconds",
      ],
    },
    totalInstruments: 23,
  };
}

// Cleanup function for graceful shutdown
export function shutdownMetrics(): void {
  if (systemMetricsInterval) {
    clearInterval(systemMetricsInterval);
    systemMetricsInterval = null;
  }

  isInitialized = false;
}

// Note: Metrics initialization is now called explicitly after telemetry SDK starts
// to ensure we use the correct MeterProvider
// This comprehensive metrics collection provides full observability into:
// - HTTP request patterns and performance
// - System resource usage and health
// - Business logic operations (JWT, authentication, Kong)
// - Error rates and exception tracking
// - Telemetry system health and performance
