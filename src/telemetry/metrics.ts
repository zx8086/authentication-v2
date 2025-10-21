import {
  type Attributes,
  type Counter,
  type Gauge,
  type Histogram,
  metrics,
} from "@opentelemetry/api";
import { z } from "zod";
import { error, log as info, warn } from "../utils/logger";

// ===========================
// TYPE-SAFE ATTRIBUTE DEFINITIONS
// ===========================

// HTTP Request Attributes
interface HttpRequestAttributes extends Attributes {
  method: string;
  route: string;
  status_code?: string;
  status_class?: string;
  version?: "v1" | "v2";
}

// Process Attributes
interface ProcessAttributes extends Attributes {
  component: string;
  pid?: string;
}

// Authentication Attributes
interface AuthAttributes extends Attributes {
  consumer_id: string;
  operation: "token_generation" | "validation" | "refresh";
  result: "success" | "failure";
}

// Kong Operation Attributes
interface KongAttributes extends Attributes {
  operation: "get_consumer" | "create_credential" | "health_check";
  cache_status: "hit" | "miss" | "stale";
}

// Circuit Breaker Attributes
interface CircuitBreakerAttributes extends Attributes {
  operation: string;
  state: "closed" | "open" | "half_open";
}

// API Versioning Attributes
interface ApiVersionAttributes extends Attributes {
  version: "v1" | "v2";
  endpoint: string;
  source: "header" | "default" | "fallback";
  method: string;
}

// Security Attributes (V2)
interface SecurityAttributes extends Attributes {
  event_type: "jwt_anomaly" | "rate_limit" | "suspicious_activity" | "header_validation";
  severity: "low" | "medium" | "high" | "critical";
  consumer_id?: string;
  version: "v2";
}

// Cache Tier Attributes
interface CacheTierAttributes extends Attributes {
  tier: "memory" | "redis" | "kong" | "fallback";
  operation: "get" | "set" | "delete" | "invalidate";
}

// Consumer Volume Attributes
interface ConsumerVolumeAttributes extends Attributes {
  volume_category: "high" | "medium" | "low";
  consumer_id: string;
}

// Redis Operation Attributes
interface RedisAttributes extends Attributes {
  operation: "get" | "set" | "del" | "exists" | "expire";
  key_pattern?: string;
}

// Error Attributes
interface ErrorAttributes extends Attributes {
  error_type: string;
  operation: string;
  component: string;
}

// Telemetry Export Attributes
interface TelemetryAttributes extends Attributes {
  exporter: "console" | "otlp" | "jaeger";
  status: "success" | "failure";
}

// Track initialization state
let isInitialized = false;

// ===========================
// TYPED METRIC INSTRUMENTS
// ===========================

// HTTP Metrics
let httpRequestCounter: Counter<HttpRequestAttributes>;
let httpRequestsByStatusCounter: Counter<HttpRequestAttributes>;
let httpResponseTimeHistogram: Histogram<HttpRequestAttributes>;
let httpRequestSizeHistogram: Histogram<HttpRequestAttributes>;
let httpResponseSizeHistogram: Histogram<HttpRequestAttributes>;
let httpActiveRequestsGauge: Gauge<HttpRequestAttributes>;
let httpRequestsInFlightGauge: Gauge<HttpRequestAttributes>;

// Process Metrics
let processStartTimeGauge: Gauge<ProcessAttributes>;
let processUptimeGauge: Gauge<ProcessAttributes>;
let processMemoryUsageGauge: Gauge<ProcessAttributes>;
let processHeapUsedGauge: Gauge<ProcessAttributes>;
let processHeapTotalGauge: Gauge<ProcessAttributes>;
let processRssGauge: Gauge<ProcessAttributes>;
let processExternalGauge: Gauge<ProcessAttributes>;
let processCpuUsageGauge: Gauge<ProcessAttributes>;
let processEventLoopDelayHistogram: Histogram<ProcessAttributes>;
let processEventLoopUtilizationGauge: Gauge<ProcessAttributes>;

// System Metrics
let systemMemoryUsageGauge: Gauge<ProcessAttributes>;
let systemMemoryFreeGauge: Gauge<ProcessAttributes>;
let systemMemoryTotalGauge: Gauge<ProcessAttributes>;
let systemCpuUsageGauge: Gauge<ProcessAttributes>;
let systemLoadAverageGauge: Gauge<ProcessAttributes>;

// GC Metrics
let gcCollectionCounter: Counter<ProcessAttributes>;
let gcDurationHistogram: Histogram<ProcessAttributes>;
let gcOldGenerationSizeBeforeGauge: Gauge<ProcessAttributes>;
let gcOldGenerationSizeAfterGauge: Gauge<ProcessAttributes>;
let gcYoungGenerationSizeBeforeGauge: Gauge<ProcessAttributes>;
let gcYoungGenerationSizeAfterGauge: Gauge<ProcessAttributes>;

// File/Network Metrics
let fileDescriptorUsageGauge: Gauge<ProcessAttributes>;
let fileDescriptorLimitGauge: Gauge<ProcessAttributes>;
let networkBytesInCounter: Counter<ProcessAttributes>;
let networkBytesOutCounter: Counter<ProcessAttributes>;

// Thread Pool Metrics
let threadPoolPendingGauge: Gauge<ProcessAttributes>;
let threadPoolActiveGauge: Gauge<ProcessAttributes>;
let threadPoolIdleGauge: Gauge<ProcessAttributes>;
let handleUsageGauge: Gauge<ProcessAttributes>;

// JWT/Auth Metrics
let jwtTokenCreationTimeHistogram: Histogram<AuthAttributes>;
let authenticationAttemptsCounter: Counter<AuthAttributes>;
let authenticationSuccessCounter: Counter<AuthAttributes>;
let authenticationFailureCounter: Counter<AuthAttributes>;

// Kong Metrics
let kongOperationsCounter: Counter<KongAttributes>;
let kongResponseTimeHistogram: Histogram<KongAttributes>;
let kongCacheHitCounter: Counter<KongAttributes>;
let kongCacheMissCounter: Counter<KongAttributes>;

// Redis Metrics
let redisOperationsCounter: Counter<RedisAttributes>;
let redisOperationDurationHistogram: Histogram<RedisAttributes>;
let redisConnectionsGauge: Gauge<RedisAttributes>;
let redisCacheHitCounter: Counter<RedisAttributes>;
let redisCacheMissCounter: Counter<RedisAttributes>;
let redisErrorsCounter: Counter<ErrorAttributes>;

// Error Metrics
let errorRateCounter: Counter<ErrorAttributes>;
let exceptionCounter: Counter<ErrorAttributes>;

// Telemetry Metrics
let telemetryExportCounter: Counter<TelemetryAttributes>;
let telemetryExportErrorCounter: Counter<TelemetryAttributes>;

// Circuit Breaker Metrics
let circuitBreakerStateGauge: Gauge<CircuitBreakerAttributes>;
let circuitBreakerRequestsCounter: Counter<CircuitBreakerAttributes>;
let circuitBreakerRejectedCounter: Counter<CircuitBreakerAttributes>;
let circuitBreakerFallbackCounter: Counter<CircuitBreakerAttributes>;
let circuitBreakerStateTransitionCounter: Counter<CircuitBreakerAttributes>;

// Cache Tier Metrics
let cacheTierUsageCounter: Counter<CacheTierAttributes>;
let cacheTierLatencyHistogram: Histogram<CacheTierAttributes>;
let cacheTierErrorCounter: Counter<ErrorAttributes>;

// General Operation Metrics
let operationDurationHistogram: Histogram<Attributes>;

// API Versioning Metrics
let apiVersionRequestsCounter: Counter<ApiVersionAttributes>;
let apiVersionHeaderSourceCounter: Counter<ApiVersionAttributes>;
let apiVersionUnsupportedCounter: Counter<ApiVersionAttributes>;
let apiVersionFallbackCounter: Counter<ApiVersionAttributes>;
let apiVersionParsingDurationHistogram: Histogram<ApiVersionAttributes>;
let apiVersionRoutingDurationHistogram: Histogram<ApiVersionAttributes>;

// Consumer Volume Metrics
let consumerRequestsByVolumeCounter: Counter<ConsumerVolumeAttributes>;
let consumerErrorsByVolumeCounter: Counter<ConsumerVolumeAttributes>;
let consumerLatencyByVolumeHistogram: Histogram<ConsumerVolumeAttributes>;

// Security Metrics (V2)
let securityEventsCounter: Counter<SecurityAttributes>;
let securityHeadersAppliedCounter: Counter<SecurityAttributes>;
let auditEventsCounter: Counter<SecurityAttributes>;
let securityRiskScoreHistogram: Histogram<SecurityAttributes>;
let securityAnomaliesCounter: Counter<SecurityAttributes>;

// ===========================
// INITIALIZATION
// ===========================

export function initializeMetrics(serviceName?: string, serviceVersion?: string): void {
  if (isInitialized) {
    warn("Metrics already initialized", {
      serviceName,
      serviceVersion,
      initialized: true,
    });
    return;
  }

  try {
    const meter = metrics.getMeter(
      serviceName || "authentication-service",
      serviceVersion || "1.0.0"
    );

    // HTTP Metrics
    httpRequestCounter = meter.createCounter("http_requests_total", {
      description: "Total number of HTTP requests",
      unit: "1",
    });

    httpRequestsByStatusCounter = meter.createCounter("http_requests_by_status_total", {
      description: "Total HTTP requests grouped by status code and other dimensions",
      unit: "1",
    });

    httpResponseTimeHistogram = meter.createHistogram("http_request_duration_seconds", {
      description: "HTTP request duration",
      unit: "s",
      advice: {
        explicitBucketBoundaries: [
          0.005, 0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 0.75, 1, 2.5, 5, 7.5, 10,
        ],
      },
    });

    httpRequestSizeHistogram = meter.createHistogram("http_request_size_bytes", {
      description: "Size of HTTP requests in bytes",
      unit: "By",
      advice: {
        explicitBucketBoundaries: [100, 1000, 10000, 100000, 1000000, 10000000],
      },
    });

    httpResponseSizeHistogram = meter.createHistogram("http_response_size_bytes", {
      description: "Size of HTTP responses in bytes",
      unit: "By",
      advice: {
        explicitBucketBoundaries: [100, 1000, 10000, 100000, 1000000, 10000000],
      },
    });

    httpActiveRequestsGauge = meter.createGauge("http_active_requests", {
      description: "Number of active HTTP requests",
      unit: "1",
    });

    httpRequestsInFlightGauge = meter.createGauge("http_requests_in_flight", {
      description: "Number of HTTP requests currently in flight",
      unit: "1",
    });

    // Process Metrics
    processStartTimeGauge = meter.createGauge("process_start_time_seconds", {
      description: "Start time of the process since unix epoch in seconds",
      unit: "s",
    });

    processUptimeGauge = meter.createGauge("process_uptime_seconds", {
      description: "Process uptime in seconds",
      unit: "s",
    });

    processMemoryUsageGauge = meter.createGauge("process_memory_usage_bytes", {
      description: "Process memory usage in bytes",
      unit: "By",
    });

    processHeapUsedGauge = meter.createGauge("process_heap_used_bytes", {
      description: "Process heap used in bytes",
      unit: "By",
    });

    processHeapTotalGauge = meter.createGauge("process_heap_total_bytes", {
      description: "Process heap total in bytes",
      unit: "By",
    });

    processRssGauge = meter.createGauge("process_resident_memory_bytes", {
      description: "Resident memory size in bytes",
      unit: "By",
    });

    processExternalGauge = meter.createGauge("process_external_memory_bytes", {
      description: "External memory usage in bytes",
      unit: "By",
    });

    processCpuUsageGauge = meter.createGauge("process_cpu_usage_percent", {
      description: "Process CPU usage as a percentage",
      unit: "1",
    });

    processEventLoopDelayHistogram = meter.createHistogram("process_event_loop_delay_seconds", {
      description: "Event loop delay in seconds",
      unit: "s",
      advice: {
        explicitBucketBoundaries: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
      },
    });

    processEventLoopUtilizationGauge = meter.createGauge("process_event_loop_utilization_percent", {
      description: "Event loop utilization as a percentage",
      unit: "1",
    });

    // System Metrics
    systemMemoryUsageGauge = meter.createGauge("system_memory_usage_bytes", {
      description: "System memory usage in bytes",
      unit: "By",
    });

    systemMemoryFreeGauge = meter.createGauge("system_memory_free_bytes", {
      description: "System free memory in bytes",
      unit: "By",
    });

    systemMemoryTotalGauge = meter.createGauge("system_memory_total_bytes", {
      description: "System total memory in bytes",
      unit: "By",
    });

    systemCpuUsageGauge = meter.createGauge("system_cpu_usage_percent", {
      description: "System CPU usage as a percentage",
      unit: "1",
    });

    systemLoadAverageGauge = meter.createGauge("system_load_average", {
      description: "System load average",
      unit: "1",
    });

    // GC Metrics
    gcCollectionCounter = meter.createCounter("gc_collections_total", {
      description: "Total number of garbage collection runs",
      unit: "1",
    });

    gcDurationHistogram = meter.createHistogram("gc_duration_seconds", {
      description: "Time spent in garbage collection",
      unit: "s",
      advice: {
        explicitBucketBoundaries: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
      },
    });

    gcOldGenerationSizeBeforeGauge = meter.createGauge("gc_old_generation_size_before_bytes", {
      description: "Old generation heap size before GC",
      unit: "By",
    });

    gcOldGenerationSizeAfterGauge = meter.createGauge("gc_old_generation_size_after_bytes", {
      description: "Old generation heap size after GC",
      unit: "By",
    });

    gcYoungGenerationSizeBeforeGauge = meter.createGauge("gc_young_generation_size_before_bytes", {
      description: "Young generation heap size before GC",
      unit: "By",
    });

    gcYoungGenerationSizeAfterGauge = meter.createGauge("gc_young_generation_size_after_bytes", {
      description: "Young generation heap size after GC",
      unit: "By",
    });

    // File/Network Metrics
    fileDescriptorUsageGauge = meter.createGauge("file_descriptor_usage", {
      description: "Number of file descriptors in use",
      unit: "1",
    });

    fileDescriptorLimitGauge = meter.createGauge("file_descriptor_limit", {
      description: "Maximum number of file descriptors",
      unit: "1",
    });

    networkBytesInCounter = meter.createCounter("network_bytes_received_total", {
      description: "Total bytes received over the network",
      unit: "By",
    });

    networkBytesOutCounter = meter.createCounter("network_bytes_sent_total", {
      description: "Total bytes sent over the network",
      unit: "By",
    });

    // Thread Pool Metrics
    threadPoolPendingGauge = meter.createGauge("thread_pool_pending_tasks", {
      description: "Number of pending tasks in thread pool",
      unit: "1",
    });

    threadPoolActiveGauge = meter.createGauge("thread_pool_active_threads", {
      description: "Number of active threads in thread pool",
      unit: "1",
    });

    threadPoolIdleGauge = meter.createGauge("thread_pool_idle_threads", {
      description: "Number of idle threads in thread pool",
      unit: "1",
    });

    handleUsageGauge = meter.createGauge("handle_usage", {
      description: "Number of handles in use",
      unit: "1",
    });

    // JWT/Auth Metrics
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

    // Kong Metrics
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

    // Redis Metrics
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

    redisConnectionsGauge = meter.createGauge("redis_connections_active", {
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

    // Error Metrics
    errorRateCounter = meter.createCounter("application_errors_total", {
      description: "Total number of application errors",
      unit: "1",
    });

    exceptionCounter = meter.createCounter("application_exceptions_total", {
      description: "Total number of uncaught exceptions",
      unit: "1",
    });

    // Telemetry Metrics
    telemetryExportCounter = meter.createCounter("telemetry_exports_total", {
      description: "Total number of telemetry export attempts",
      unit: "1",
    });

    telemetryExportErrorCounter = meter.createCounter("telemetry_export_errors_total", {
      description: "Total number of telemetry export errors",
      unit: "1",
    });

    // Circuit Breaker Metrics
    circuitBreakerStateGauge = meter.createGauge("circuit_breaker_state", {
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

    // Cache Tier Metrics
    cacheTierUsageCounter = meter.createCounter("cache_tier_usage_total", {
      description: "Total number of cache tier usages by tier type",
      unit: "1",
    });

    cacheTierLatencyHistogram = meter.createHistogram("cache_tier_latency_seconds", {
      description: "Cache tier access latency in seconds",
      unit: "s",
      advice: {
        explicitBucketBoundaries: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5],
      },
    });

    cacheTierErrorCounter = meter.createCounter("cache_tier_errors_total", {
      description: "Total number of cache tier errors",
      unit: "1",
    });

    operationDurationHistogram = meter.createHistogram("operation_duration_seconds", {
      description: "Duration of various operations",
      unit: "s",
    });

    // API Versioning metrics
    apiVersionRequestsCounter = meter.createCounter("api_version_requests_total", {
      description: "Total API requests by version, endpoint, and method",
      unit: "1",
    });

    apiVersionHeaderSourceCounter = meter.createCounter("api_version_header_source_total", {
      description: "Count of version detection by source (Accept-Version, media-type, default)",
      unit: "1",
    });

    apiVersionUnsupportedCounter = meter.createCounter("api_version_unsupported_total", {
      description: "Count of unsupported version requests",
      unit: "1",
    });

    apiVersionFallbackCounter = meter.createCounter("api_version_fallback_total", {
      description: "Count of fallbacks to default version",
      unit: "1",
    });

    apiVersionParsingDurationHistogram = meter.createHistogram(
      "api_version_parsing_duration_seconds",
      {
        description: "Time taken to parse API version from headers",
        unit: "s",
        advice: {
          explicitBucketBoundaries: [0.0001, 0.0005, 0.001, 0.005, 0.01, 0.025, 0.05, 0.1],
        },
      }
    );

    apiVersionRoutingDurationHistogram = meter.createHistogram(
      "api_version_routing_duration_seconds",
      {
        description: "Additional overhead from version-aware routing",
        unit: "s",
        advice: {
          explicitBucketBoundaries: [0.0001, 0.0005, 0.001, 0.005, 0.01, 0.025, 0.05, 0.1],
        },
      }
    );

    // Consumer volume-based metrics (KISS approach)
    consumerRequestsByVolumeCounter = meter.createCounter("consumer_requests_by_volume", {
      description: "Consumer requests grouped by volume (high/medium/low)",
      unit: "1",
    });

    consumerErrorsByVolumeCounter = meter.createCounter("consumer_errors_by_volume", {
      description: "Consumer errors grouped by volume (high/medium/low)",
      unit: "1",
    });

    consumerLatencyByVolumeHistogram = meter.createHistogram("consumer_latency_by_volume", {
      description: "Consumer response times grouped by volume (high/medium/low)",
      unit: "s",
      advice: {
        explicitBucketBoundaries: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
      },
    });

    // Security metrics for v2 features
    securityEventsCounter = meter.createCounter("security_events_total", {
      description: "Total number of security events recorded",
      unit: "1",
    });

    securityHeadersAppliedCounter = meter.createCounter("security_headers_applied_total", {
      description: "Count of responses with security headers applied",
      unit: "1",
    });

    auditEventsCounter = meter.createCounter("audit_events_total", {
      description: "Total number of audit events logged",
      unit: "1",
    });

    securityRiskScoreHistogram = meter.createHistogram("security_risk_score", {
      description: "Distribution of security event risk scores",
      unit: "1",
      advice: {
        explicitBucketBoundaries: [5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
      },
    });

    securityAnomaliesCounter = meter.createCounter("security_anomalies_total", {
      description: "Count of security anomalies detected",
      unit: "1",
    });

    setupSystemMetricsCollection();
    startMemoryPressureMonitoring();

    isInitialized = true;
  } catch (err) {
    error("Failed to initialize metrics", {
      error: (err as Error).message,
      serviceName,
      serviceVersion,
    });
    throw err;
  }
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

  const attributes: HttpRequestAttributes = {
    method: method.toUpperCase(),
    route,
    ...(statusCode && { status_code: statusCode.toString() }),
  };

  try {
    httpRequestCounter.add(1, attributes);

    if (statusCode) {
      const statusAttributes: HttpRequestAttributes = {
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
  if (!isInitialized) return;

  const attributes: HttpRequestAttributes = {
    method: method.toUpperCase(),
    route,
    ...(statusCode && { status_code: statusCode.toString() }),
  };

  try {
    httpResponseTimeHistogram.record(durationMs / 1000, attributes);
  } catch (err) {
    error("Failed to record HTTP response time", {
      error: (err as Error).message,
      durationMs,
      attributes,
    });
  }
}

export function recordActiveRequests(count: number): void {
  if (!isInitialized) return;

  try {
    httpActiveRequestsGauge.record(count, { method: "GET", route: "/active" });
  } catch (err) {
    error("Failed to record active requests", {
      error: (err as Error).message,
      count,
    });
  }
}

export function recordHttpResponseSize(
  size: number,
  method: string,
  route: string,
  statusCode?: number
): void {
  if (!isInitialized) return;

  const attributes: HttpRequestAttributes = {
    method: method.toUpperCase() as any,
    route,
    ...(statusCode && {
      status_code: statusCode.toString() as any,
      status_class: `${Math.floor(statusCode / 100)}xx` as any,
    }),
  };

  try {
    httpResponseSizeHistogram.record(size, attributes);
  } catch (err) {
    error("Failed to record HTTP response size metric", {
      error: (err as Error).message,
      attributes,
      size,
    });
  }
}

export function recordJwtTokenCreation(durationMs: number, consumerId: string): void {
  if (!isInitialized) return;

  const attributes: AuthAttributes = {
    consumer_id: consumerId,
    operation: "token_generation",
    result: "success",
  };

  try {
    jwtTokenCreationTimeHistogram.record(durationMs / 1000, attributes);
  } catch (err) {
    error("Failed to record JWT token creation time", {
      error: (err as Error).message,
      durationMs,
      attributes,
    });
  }
}

export function recordAuthenticationAttempt(
  consumerId: string,
  success: boolean,
  operation?: string
): void {
  if (!isInitialized) return;

  const validOperation =
    operation === "token_generation" || operation === "validation" || operation === "refresh"
      ? operation
      : "validation";

  const attributes: AuthAttributes = {
    consumer_id: consumerId,
    operation: validOperation,
    result: success ? "success" : "failure",
  };

  try {
    authenticationAttemptsCounter.add(1, attributes);

    if (success) {
      authenticationSuccessCounter.add(1, attributes);
    } else {
      authenticationFailureCounter.add(1, attributes);
    }
  } catch (err) {
    error("Failed to record authentication attempt", {
      error: (err as Error).message,
      attributes,
    });
  }
}

export function recordKongOperation(
  operation: string,
  durationMs: number,
  cacheHit?: boolean,
  extraParam?: any
): void {
  if (!isInitialized) return;

  const validOperation =
    operation === "get_consumer" ||
    operation === "create_credential" ||
    operation === "health_check"
      ? (operation as "get_consumer" | "create_credential" | "health_check")
      : "health_check";

  const attributes: KongAttributes = {
    operation: validOperation,
    cache_status: cacheHit === true ? "hit" : cacheHit === false ? "miss" : "stale",
  };

  try {
    kongOperationsCounter.add(1, attributes);
    kongResponseTimeHistogram.record(durationMs / 1000, attributes);

    if (cacheHit === true) {
      kongCacheHitCounter.add(1, attributes);
    } else if (cacheHit === false) {
      kongCacheMissCounter.add(1, attributes);
    }
  } catch (err) {
    error("Failed to record Kong operation", {
      error: (err as Error).message,
      operation,
      durationMs,
      cacheHit,
    });
  }
}

export function recordHttpRequestSize(
  size: number,
  method: string,
  route: string,
  statusCode?: number
): void {
  if (!isInitialized) return;

  const attributes: HttpRequestAttributes = {
    method: method.toUpperCase() as any,
    route,
    ...(statusCode && {
      status_code: statusCode.toString() as any,
      status_class: `${Math.floor(statusCode / 100)}xx` as any,
    }),
  };

  try {
    httpRequestSizeHistogram.record(size, attributes);
  } catch (err) {
    error("Failed to record HTTP request size metric", {
      error: (err as Error).message,
      attributes,
      size,
    });
  }
}

export function recordKongResponseTime(
  durationMs: number,
  operation: string,
  success: boolean = true
): void {
  if (!isInitialized) return;

  const attributes: KongAttributes = {
    operation,
    status: success ? "success" : "failure",
  };

  try {
    kongResponseTimeHistogram.record(durationMs, attributes);
  } catch (err) {
    error("Failed to record Kong response time", {
      error: (err as Error).message,
      operation,
      durationMs,
      success,
    });
  }
}

export function recordKongCacheHit(consumerId: string, operation: string): void {
  if (!isInitialized) return;

  const attributes: KongAttributes = {
    operation,
    consumer_id: consumerId,
  };

  try {
    kongCacheHitCounter.add(1, attributes);
  } catch (err) {
    error("Failed to record Kong cache hit", {
      error: (err as Error).message,
      consumerId,
      operation,
    });
  }
}

export function recordKongCacheMiss(consumerId: string, operation: string): void {
  if (!isInitialized) return;

  const attributes: KongAttributes = {
    operation,
    consumer_id: consumerId,
  };

  try {
    kongCacheMissCounter.add(1, attributes);
  } catch (err) {
    error("Failed to record Kong cache miss", {
      error: (err as Error).message,
      consumerId,
      operation,
    });
  }
}

export function recordTelemetryExportError(
  exporter: "console" | "otlp" | "jaeger",
  errorType: string
): void {
  if (!isInitialized) return;

  const attributes: TelemetryAttributes = {
    exporter,
    error_type: errorType as any,
  };

  try {
    telemetryExportErrorCounter.add(1, attributes);
  } catch (err) {
    error("Failed to record telemetry export error", {
      error: (err as Error).message,
      exporter,
      errorType,
    });
  }
}

export function recordRedisOperation(
  operation: string,
  durationMs: number,
  success: boolean = true,
  extraParam1?: any,
  extraParam2?: any
): void {
  if (!isInitialized) return;

  const validOperation =
    operation === "get" ||
    operation === "set" ||
    operation === "del" ||
    operation === "exists" ||
    operation === "expire"
      ? (operation as "get" | "set" | "del" | "exists" | "expire")
      : "get";

  const attributes: RedisAttributes = { operation: validOperation };

  try {
    redisOperationsCounter.add(1, attributes);
    redisOperationDurationHistogram.record(durationMs / 1000, attributes);

    if (!success) {
      const errorAttributes: ErrorAttributes = {
        error_type: "redis_operation_error",
        operation,
        component: "redis",
      };
      redisErrorsCounter.add(1, errorAttributes);
    }
  } catch (err) {
    error("Failed to record Redis operation", {
      error: (err as Error).message,
      operation,
      durationMs,
      success,
    });
  }
}

export function recordCacheOperation(
  operation: "hit" | "miss",
  tier: "redis" | "kong" = "redis"
): void {
  if (!isInitialized) return;

  try {
    if (tier === "redis") {
      const attributes: RedisAttributes = { operation: operation === "hit" ? "get" : "set" };

      if (operation === "hit") {
        redisCacheHitCounter.add(1, attributes);
      } else {
        redisCacheMissCounter.add(1, attributes);
      }
    } else if (tier === "kong") {
      const attributes: KongAttributes = {
        operation: "get_consumer",
        cache_status: operation,
      };

      if (operation === "hit") {
        kongCacheHitCounter.add(1, attributes);
      } else {
        kongCacheMissCounter.add(1, attributes);
      }
    }
  } catch (err) {
    error("Failed to record cache operation", {
      error: (err as Error).message,
      operation,
      tier,
    });
  }
}

export function recordError(errorType: string, context?: Record<string, unknown>): void {
  if (!isInitialized) return;

  const attributes: ErrorAttributes = {
    error_type: errorType,
    operation: (context?.operation as string) || "unknown",
    component: (context?.component as string) || "application",
  };

  try {
    errorRateCounter.add(1, attributes);
  } catch (err) {
    error("Failed to record error metric", {
      error: (err as Error).message,
      errorType,
      context,
    });
  }
}

export function recordException(
  exceptionType: string | Error,
  component: string = "application"
): void {
  if (!isInitialized) return;

  const errorType = typeof exceptionType === "string" ? exceptionType : exceptionType.message;

  const attributes: ErrorAttributes = {
    error_type: errorType,
    operation: "exception_handling",
    component,
  };

  try {
    exceptionCounter.add(1, attributes);
  } catch (err) {
    error("Failed to record exception metric", {
      error: (err as Error).message,
      exceptionType,
      component,
    });
  }
}

export function recordTelemetryExport(
  exporter: "console" | "otlp" | "jaeger",
  success: boolean
): void {
  if (!isInitialized) return;

  const attributes: TelemetryAttributes = {
    exporter,
    status: success ? "success" : "failure",
  };

  try {
    telemetryExportCounter.add(1, attributes);

    if (!success) {
      telemetryExportErrorCounter.add(1, attributes);
    }
  } catch (err) {
    error("Failed to record telemetry export", {
      error: (err as Error).message,
      exporter,
      success,
    });
  }
}

export function recordCircuitBreakerState(
  operation: string,
  state: "closed" | "open" | "half_open"
): void {
  if (!isInitialized) return;

  const attributes: CircuitBreakerAttributes = { operation, state };
  const stateValue = state === "closed" ? 0 : state === "open" ? 1 : 2;

  try {
    circuitBreakerStateGauge.record(stateValue, attributes);
  } catch (err) {
    error("Failed to record circuit breaker state", {
      error: (err as Error).message,
      operation,
      state,
    });
  }
}

export function recordCircuitBreakerOperation(
  operation: string,
  state: "closed" | "open" | "half_open",
  action: "request" | "rejected" | "fallback" | "state_transition"
): void {
  if (!isInitialized) return;

  const attributes: CircuitBreakerAttributes = { operation, state };

  try {
    switch (action) {
      case "request":
        circuitBreakerRequestsCounter.add(1, attributes);
        break;
      case "rejected":
        circuitBreakerRejectedCounter.add(1, attributes);
        break;
      case "fallback":
        circuitBreakerFallbackCounter.add(1, attributes);
        break;
      case "state_transition":
        circuitBreakerStateTransitionCounter.add(1, attributes);
        break;
    }
  } catch (err) {
    error("Failed to record circuit breaker operation", {
      error: (err as Error).message,
      operation,
      state,
      action,
    });
  }
}

export function recordApiVersionUsage(
  version: "v1" | "v2",
  endpoint: string,
  method: string,
  source: "header" | "default" | "fallback"
): void {
  if (!isInitialized) return;

  const attributes: ApiVersionAttributes = { version, endpoint, method, source };

  try {
    apiVersionRequestsCounter.add(1, attributes);
    apiVersionHeaderSourceCounter.add(1, attributes);

    if (source === "fallback") {
      apiVersionFallbackCounter.add(1, attributes);
    }
  } catch (err) {
    error("Failed to record API version usage", {
      error: (err as Error).message,
      attributes,
    });
  }
}

export function recordApiVersionParsing(
  version: "v1" | "v2",
  endpoint: string,
  method: string,
  durationMs: number
): void {
  if (!isInitialized) return;

  const attributes: ApiVersionAttributes = {
    version,
    endpoint,
    method,
    source: "header",
  };

  try {
    apiVersionParsingDurationHistogram.record(durationMs / 1000, attributes);
  } catch (err) {
    error("Failed to record API version parsing duration", {
      error: (err as Error).message,
      attributes,
      durationMs,
    });
  }
}

export function recordSecurityEvent(
  eventType: "jwt_anomaly" | "rate_limit" | "suspicious_activity" | "header_validation",
  severity: "low" | "medium" | "high" | "critical",
  consumerId?: string
): void {
  if (!isInitialized) return;

  const attributes: SecurityAttributes = {
    event_type: eventType,
    severity,
    version: "v2",
    ...(consumerId && { consumer_id: consumerId }),
  };

  try {
    securityEventsCounter.add(1, attributes);

    if (severity === "high" || severity === "critical") {
      securityAnomaliesCounter.add(1, attributes);
    }
  } catch (err) {
    error("Failed to record security event", {
      error: (err as Error).message,
      attributes,
    });
  }
}

export function recordSecurityHeaders(): void {
  if (!isInitialized) return;

  const attributes: SecurityAttributes = {
    event_type: "header_validation",
    severity: "low",
    version: "v2",
  };

  try {
    securityHeadersAppliedCounter.add(1, attributes);
  } catch (err) {
    error("Failed to record security headers application", {
      error: (err as Error).message,
    });
  }
}

export function recordOperationDuration(
  operation: string,
  durationMs: number,
  component?: string | boolean
): void {
  if (!isInitialized) return;

  try {
    const componentName = typeof component === "string" ? component : "unknown";
    operationDurationHistogram.record(durationMs / 1000, { operation, component: componentName });
  } catch (err) {
    error("Failed to record operation duration", {
      error: (err as Error).message,
      operation,
      component,
      durationMs,
    });
  }
}

// Memory pressure monitoring
let memoryPressureInterval: NodeJS.Timeout | null = null;

function startMemoryPressureMonitoring(): void {
  if (memoryPressureInterval) {
    return;
  }

  memoryPressureInterval = setInterval(() => {
    if (!isInitialized) return;

    try {
      const memUsage = process.memoryUsage();
      const attributes: ProcessAttributes = { component: "memory_monitor" };

      processMemoryUsageGauge.record(memUsage.rss, attributes);
      processHeapUsedGauge.record(memUsage.heapUsed, attributes);
      processHeapTotalGauge.record(memUsage.heapTotal, attributes);
      processExternalGauge.record(memUsage.external, attributes);
    } catch (err) {
      error("Failed to record memory metrics", {
        error: (err as Error).message,
      });
    }
  }, 5000); // Every 5 seconds
}

function setupSystemMetricsCollection(): void {
  if (!isInitialized) return;

  try {
    const processStartTime = Date.now() / 1000;
    const attributes: ProcessAttributes = { component: "process_monitor" };

    processStartTimeGauge.record(processStartTime, attributes);

    setInterval(() => {
      if (!isInitialized) return;

      try {
        const uptime = process.uptime();
        processUptimeGauge.record(uptime, attributes);
      } catch (err) {
        error("Failed to record process uptime", {
          error: (err as Error).message,
        });
      }
    }, 10000); // Every 10 seconds
  } catch (err) {
    error("Failed to setup system metrics collection", {
      error: (err as Error).message,
    });
  }
}

export function getMetricsStatus(): {
  initialized: boolean;
  instrumentCount: number;
  availableMetrics?: string[];
  instruments?: string[];
} {
  const metricNames = [
    "http_requests_total",
    "http_request_duration_seconds",
    "authentication_attempts_total",
    "kong_operations_total",
    "redis_operations_total",
    "security_events_total",
  ];

  return {
    initialized: isInitialized,
    instrumentCount: isInitialized ? 65 : 0, // Total number of instruments
    availableMetrics: isInitialized ? metricNames : [],
    instruments: isInitialized ? metricNames : [],
  };
}

export function stopMemoryPressureMonitoring(): void {
  if (memoryPressureInterval) {
    clearInterval(memoryPressureInterval);
    memoryPressureInterval = null;
  }
}

// Graceful shutdown
export function shutdown(): void {
  stopMemoryPressureMonitoring();
  isInitialized = false;
  info("Metrics system shutdown completed");
}

// Export types for external use
export type {
  HttpRequestAttributes,
  ProcessAttributes,
  AuthAttributes,
  KongAttributes,
  CircuitBreakerAttributes,
  ApiVersionAttributes,
  SecurityAttributes,
  CacheTierAttributes,
  ConsumerVolumeAttributes,
  RedisAttributes,
  ErrorAttributes,
  TelemetryAttributes,
};

// Export instrument references for advanced usage
export {
  httpRequestCounter,
  httpRequestsByStatusCounter,
  httpResponseTimeHistogram,
  httpRequestSizeHistogram,
  httpResponseSizeHistogram,
  httpActiveRequestsGauge,
  httpRequestsInFlightGauge,
  processStartTimeGauge,
  processUptimeGauge,
  processMemoryUsageGauge,
  processHeapUsedGauge,
  processHeapTotalGauge,
  processRssGauge,
  processExternalGauge,
  processCpuUsageGauge,
  processEventLoopDelayHistogram,
  processEventLoopUtilizationGauge,
  systemMemoryUsageGauge,
  systemMemoryFreeGauge,
  systemMemoryTotalGauge,
  systemCpuUsageGauge,
  systemLoadAverageGauge,
  gcCollectionCounter,
  gcDurationHistogram,
  gcOldGenerationSizeBeforeGauge,
  gcOldGenerationSizeAfterGauge,
  gcYoungGenerationSizeBeforeGauge,
  gcYoungGenerationSizeAfterGauge,
  fileDescriptorUsageGauge,
  fileDescriptorLimitGauge,
  networkBytesInCounter,
  networkBytesOutCounter,
  threadPoolPendingGauge,
  threadPoolActiveGauge,
  threadPoolIdleGauge,
  handleUsageGauge,
  jwtTokenCreationTimeHistogram,
  authenticationAttemptsCounter,
  authenticationSuccessCounter,
  authenticationFailureCounter,
  kongOperationsCounter,
  kongResponseTimeHistogram,
  kongCacheHitCounter,
  kongCacheMissCounter,
  redisOperationsCounter,
  redisOperationDurationHistogram,
  redisConnectionsGauge,
  redisCacheHitCounter,
  redisCacheMissCounter,
  redisErrorsCounter,
  errorRateCounter,
  exceptionCounter,
  telemetryExportCounter,
  telemetryExportErrorCounter,
  circuitBreakerStateGauge,
  circuitBreakerRequestsCounter,
  circuitBreakerRejectedCounter,
  circuitBreakerFallbackCounter,
  circuitBreakerStateTransitionCounter,
  cacheTierUsageCounter,
  cacheTierLatencyHistogram,
  cacheTierErrorCounter,
  operationDurationHistogram,
  apiVersionRequestsCounter,
  apiVersionHeaderSourceCounter,
  apiVersionUnsupportedCounter,
  apiVersionFallbackCounter,
  apiVersionParsingDurationHistogram,
  apiVersionRoutingDurationHistogram,
  consumerRequestsByVolumeCounter,
  consumerErrorsByVolumeCounter,
  consumerLatencyByVolumeHistogram,
  securityEventsCounter,
  securityHeadersAppliedCounter,
  auditEventsCounter,
  securityRiskScoreHistogram,
  securityAnomaliesCounter,
};

// ===========================
// ADDITIONAL LEGACY FUNCTIONS FOR BACKWARD COMPATIBILITY
// ===========================

export function recordJwtTokenIssued(username: string, creationTimeMs?: number): void {
  recordJwtTokenCreation(creationTimeMs, username);
}

// Additional authentication functions for backward compatibility with tests
export function recordAuthenticationSuccess(username?: string): void {
  if (!isInitialized) return;

  const attributes: AuthAttributes = {
    consumer_id: username || "unknown",
    operation: "validation",
    result: "success",
  };

  try {
    authenticationSuccessCounter.add(1, attributes);
  } catch (err) {
    error("Failed to record authentication success metric", {
      error: (err as Error).message,
      username,
    });
  }
}

export function recordAuthenticationFailure(username?: string, reason?: string): void {
  if (!isInitialized) return;

  const attributes: AuthAttributes = {
    consumer_id: username || "unknown",
    operation: "validation",
    result: "failure",
  };

  try {
    authenticationFailureCounter.add(1, attributes);
  } catch (err) {
    error("Failed to record authentication failure metric", {
      error: (err as Error).message,
      username,
      reason,
    });
  }
}

// Overloaded version of recordAuthenticationAttempt to match test signature
export function recordAuthenticationAttempt(username: string): void;
export function recordAuthenticationAttempt(
  type: string,
  success: boolean,
  username?: string
): void;
export function recordAuthenticationAttempt(
  typeOrUsername: string,
  success?: boolean,
  username?: string
): void {
  if (!isInitialized) return;

  // Handle the single-parameter case (test signature)
  if (success === undefined && username === undefined) {
    const attributes: AuthAttributes = {
      consumer_id: typeOrUsername || "unknown",
      operation: "validation",
      result: "success", // Default assumption for simple call
    };

    try {
      authenticationAttemptsCounter.add(1, attributes);
    } catch (err) {
      error("Failed to record authentication attempt metric", {
        error: (err as Error).message,
        username: typeOrUsername,
      });
    }
  } else {
    // Handle the three-parameter case (existing signature)
    const attributes: AuthAttributes = {
      consumer_id: username || "unknown",
      operation: "validation",
      result: success ? "success" : "failure",
    };

    try {
      authenticationAttemptsCounter.add(1, attributes);
      if (success) {
        authenticationSuccessCounter.add(1, attributes);
      } else {
        authenticationFailureCounter.add(1, attributes);
      }
    } catch (err) {
      error("Failed to record authentication attempt metric", {
        error: (err as Error).message,
        type: typeOrUsername,
        success,
        username,
      });
    }
  }
}

export function recordConsumerRequest(volume: string): void {
  if (!isInitialized) return;

  const attributes: ConsumerVolumeAttributes = {
    volume_category: volume as "high" | "medium" | "low",
    consumer_id: "unknown",
  };

  try {
    consumerRequestsByVolumeCounter.add(1, attributes);
  } catch (err) {
    error("Failed to record consumer request", {
      error: (err as Error).message,
      volume,
    });
  }
}

export function recordConsumerError(volume: string): void {
  if (!isInitialized) return;

  const attributes: ConsumerVolumeAttributes = {
    volume_category: volume as "high" | "medium" | "low",
    consumer_id: "unknown",
  };

  try {
    consumerErrorsByVolumeCounter.add(1, attributes);
  } catch (err) {
    error("Failed to record consumer error", {
      error: (err as Error).message,
      volume,
    });
  }
}

export function recordConsumerLatency(volume: string, durationMs: number): void {
  if (!isInitialized) return;

  const attributes: ConsumerVolumeAttributes = {
    volume_category: volume as "high" | "medium" | "low",
    consumer_id: "unknown",
  };

  try {
    consumerLatencyByVolumeHistogram.record(durationMs / 1000, attributes);
  } catch (err) {
    error("Failed to record consumer latency", {
      error: (err as Error).message,
      volume,
      durationMs,
    });
  }
}

export function recordRedisConnection(increment: boolean): void {
  if (!isInitialized) return;

  const attributes: RedisAttributes = { operation: "exists" };

  try {
    redisConnectionsGauge.record(increment ? 1 : 0, attributes);
  } catch (err) {
    error("Failed to record Redis connection", {
      error: (err as Error).message,
      increment,
    });
  }
}

export function recordCircuitBreakerRequest(operation: string, state?: string): void {
  if (!isInitialized) return;

  recordCircuitBreakerOperation(operation, (state as any) || "closed", "request");
}

export function recordCircuitBreakerRejection(operation: string, reason?: string): void {
  if (!isInitialized) return;

  recordCircuitBreakerOperation(operation, "open", "rejected");
}

export function recordCircuitBreakerStateTransition(
  operation: string,
  fromState: string,
  toState: string
): void {
  if (!isInitialized) return;

  recordCircuitBreakerOperation(operation, toState as any, "state_transition");
}

export function recordCircuitBreakerFallback(operation: string, reason?: string): void {
  if (!isInitialized) return;

  recordCircuitBreakerOperation(operation, "open", "fallback");
}

export function recordCacheTierUsage(tier: string, operation: string): void {
  if (!isInitialized) return;

  const attributes: CacheTierAttributes = {
    tier: tier as any,
    operation: operation as any,
  };

  try {
    cacheTierUsageCounter.add(1, attributes);
  } catch (err) {
    error("Failed to record cache tier usage", {
      error: (err as Error).message,
      tier,
      operation,
    });
  }
}

export function recordCacheTierLatency(tier: string, operation: string, latencyMs: number): void {
  if (!isInitialized) return;

  const attributes: CacheTierAttributes = {
    tier: tier as any,
    operation: operation as any,
  };

  try {
    cacheTierLatencyHistogram.record(latencyMs / 1000, attributes);
  } catch (err) {
    error("Failed to record cache tier latency", {
      error: (err as Error).message,
      tier,
      operation,
      latencyMs,
    });
  }
}

export function recordCacheTierError(tier: string, operation: string, errorType?: string): void {
  if (!isInitialized) return;

  const attributes: ErrorAttributes = {
    error_type: errorType || "cache_error",
    operation,
    component: tier,
  };

  try {
    cacheTierErrorCounter.add(1, attributes);
  } catch (err) {
    error("Failed to record cache tier error", {
      error: (err as Error).message,
      tier,
      operation,
      errorType,
    });
  }
}

export function recordAuditEvent(eventType: string, auditLevel: string, version?: string): void {
  if (!isInitialized) return;

  const attributes: SecurityAttributes = {
    event_type: "header_validation",
    severity: auditLevel as any,
    version: (version as any) || "v2",
  };

  try {
    auditEventsCounter.add(1, attributes);
  } catch (err) {
    error("Failed to record audit event", {
      error: (err as Error).message,
      eventType,
      auditLevel,
      version,
    });
  }
}

export function recordSecurityHeadersApplied(version: string, headerCount: number): void {
  recordSecurityHeaders();
}

export function testMetricRecording(): void {
  if (!isInitialized) {
    warn("Metrics not initialized - cannot test recording");
    return;
  }

  info("Testing metric recording functionality");

  try {
    recordHttpRequest("GET", "/test", 200);
    recordAuthenticationAttempt("test-consumer", true);
    recordKongOperation("health_check", 50);
    recordRedisOperation("get", 5);

    info("Test metric recording completed successfully");
  } catch (err) {
    error("Failed to test metric recording", {
      error: (err as Error).message,
    });
  }
}

export function shutdownMetrics(): void {
  shutdown();
}

export function startSystemMetricsCollection(): void {
  setupSystemMetricsCollection();
}

export function stopSystemMetricsCollection(): void {
  stopMemoryPressureMonitoring();
}

// Additional API versioning functions for backward compatibility
export function recordApiVersionRequest(
  version: string,
  endpoint: string,
  method: string,
  source?: string
): void {
  recordApiVersionUsage(version as any, endpoint, method, (source as any) || "header");
}

export function recordApiVersionHeaderSource(
  version: string,
  endpoint: string,
  method: string,
  source: string
): void {
  recordApiVersionUsage(version as any, endpoint, method, source as any);
}

export function recordApiVersionParsingDuration(
  version: string,
  endpoint: string,
  method: string,
  durationMs: number
): void {
  recordApiVersionParsing(version as any, endpoint, method, durationMs);
}

export function recordApiVersionUnsupported(
  version: string,
  endpoint: string,
  method: string
): void {
  if (!isInitialized) return;

  const attributes: ApiVersionAttributes = {
    version: version as any,
    endpoint,
    method,
    source: "header",
  };

  try {
    apiVersionUnsupportedCounter.add(1, attributes);
  } catch (err) {
    error("Failed to record unsupported API version", {
      error: (err as Error).message,
      version,
      endpoint,
      method,
    });
  }
}

export function recordApiVersionFallback(version: string, endpoint: string, method: string): void {
  if (!isInitialized) return;

  const attributes: ApiVersionAttributes = {
    version: version as any,
    endpoint,
    method,
    source: "fallback",
  };

  try {
    apiVersionFallbackCounter.add(1, attributes);
  } catch (err) {
    error("Failed to record API version fallback", {
      error: (err as Error).message,
      version,
      endpoint,
      method,
    });
  }
}

export function recordApiVersionRoutingDuration(
  version: string,
  endpoint: string,
  method: string,
  durationMs: number
): void {
  if (!isInitialized) return;

  const attributes: ApiVersionAttributes = {
    version: version as any,
    endpoint,
    method,
    source: "header",
  };

  try {
    apiVersionRoutingDurationHistogram.record(durationMs / 1000, attributes);
  } catch (err) {
    error("Failed to record API version routing duration", {
      error: (err as Error).message,
      version,
      endpoint,
      method,
      durationMs,
    });
  }
}
