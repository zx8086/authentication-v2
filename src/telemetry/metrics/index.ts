/* src/telemetry/metrics/index.ts */

/**
 * OpenTelemetry Metrics Module
 *
 * This module provides comprehensive metrics collection for the authentication service.
 * Metrics are organized into focused sub-modules for better maintainability:
 *
 * - types.ts: Type definitions for metric attributes
 * - instruments.ts: Metric instrument declarations
 * - state.ts: Initialization state management
 * - initialization.ts: Metric initialization logic
 * - http-metrics.ts: HTTP request/response metrics
 * - auth-metrics.ts: Authentication and JWT metrics
 * - kong-metrics.ts: Kong API gateway metrics
 * - redis-metrics.ts: Redis cache metrics
 * - circuit-breaker-metrics.ts: Circuit breaker metrics
 * - cache-metrics.ts: Cache tier metrics
 * - api-version-metrics.ts: API versioning metrics
 * - security-metrics.ts: Security and audit metrics
 * - consumer-metrics.ts: Consumer volume metrics
 * - telemetry-metrics.ts: Telemetry export metrics
 * - process-metrics.ts: Process and GC metrics
 * - error-metrics.ts: Error and exception metrics
 */

import { error, log as info, warn } from "../../utils/logger";
import { stopMemoryPressureMonitoring } from "./process-metrics";
import { isMetricsInitialized, setMetricsInitialized } from "./state";

// Re-export cardinality stats
export { getCardinalityStats } from "../cardinality-guard";
// Re-export API version metrics
export {
  recordApiVersionFallback,
  recordApiVersionHeaderSource,
  recordApiVersionParsing,
  recordApiVersionParsingDuration,
  recordApiVersionRequest,
  recordApiVersionRoutingDuration,
  recordApiVersionUnsupported,
  recordApiVersionUsage,
} from "./api-version-metrics";
// Re-export auth metrics
export {
  recordAuthenticationAttempt,
  recordAuthenticationFailure,
  recordAuthenticationSuccess,
  recordJwtTokenCreation,
  recordJwtTokenIssued,
} from "./auth-metrics";
// Re-export cache metrics
export {
  recordCacheTierError,
  recordCacheTierLatency,
  recordCacheTierUsage,
  recordOperationDuration,
} from "./cache-metrics";
// Re-export circuit breaker metrics
export {
  recordCircuitBreakerFallback,
  recordCircuitBreakerOperation,
  recordCircuitBreakerRejection,
  recordCircuitBreakerRequest,
  recordCircuitBreakerState,
  recordCircuitBreakerStateTransition,
} from "./circuit-breaker-metrics";
// Re-export consumer metrics
export {
  recordConsumerError,
  recordConsumerLatency,
  recordConsumerRequest,
} from "./consumer-metrics";
// Re-export error metrics
export { recordError, recordException } from "./error-metrics";
// Re-export HTTP metrics
export {
  recordActiveRequests,
  recordHttpRequest,
  recordHttpRequestSize,
  recordHttpResponseSize,
  recordHttpResponseTime,
} from "./http-metrics";
// Re-export initialization
export { initializeMetrics } from "./initialization";
// Re-export instruments
export {
  apiVersionFallbackCounter,
  apiVersionHeaderSourceCounter,
  apiVersionParsingDurationHistogram,
  apiVersionRequestsCounter,
  apiVersionRoutingDurationHistogram,
  apiVersionUnsupportedCounter,
  auditEventsCounter,
  authenticationAttemptsCounter,
  authenticationFailureCounter,
  authenticationSuccessCounter,
  cacheTierErrorCounter,
  cacheTierLatencyHistogram,
  cacheTierUsageCounter,
  circuitBreakerFallbackCounter,
  circuitBreakerRejectedCounter,
  circuitBreakerRequestsCounter,
  circuitBreakerStateGauge,
  circuitBreakerStateTransitionCounter,
  consumerErrorsByVolumeCounter,
  consumerLatencyByVolumeHistogram,
  consumerRequestsByVolumeCounter,
  errorRateCounter,
  exceptionCounter,
  fileDescriptorLimitGauge,
  fileDescriptorUsageGauge,
  gcCollectionCounter,
  gcDurationHistogram,
  gcOldGenerationSizeAfterGauge,
  gcOldGenerationSizeBeforeGauge,
  gcYoungGenerationSizeAfterGauge,
  gcYoungGenerationSizeBeforeGauge,
  handleUsageGauge,
  httpActiveRequestsGauge,
  httpRequestCounter,
  httpRequestSizeHistogram,
  httpRequestsByStatusCounter,
  httpRequestsInFlightGauge,
  httpResponseSizeHistogram,
  httpResponseTimeHistogram,
  jwtTokenCreationTimeHistogram,
  kongCacheHitCounter,
  kongCacheMissCounter,
  kongOperationsCounter,
  kongResponseTimeHistogram,
  networkBytesInCounter,
  networkBytesOutCounter,
  operationDurationHistogram,
  processCpuUsageGauge,
  processEventLoopDelayHistogram,
  processEventLoopUtilizationGauge,
  processExternalGauge,
  processHeapTotalGauge,
  processHeapUsedGauge,
  processMemoryUsageGauge,
  processRssGauge,
  processStartTimeGauge,
  processUptimeGauge,
  redisCacheHitCounter,
  redisCacheMissCounter,
  redisConnectionsGauge,
  redisErrorsCounter,
  redisOperationDurationHistogram,
  redisOperationsCounter,
  securityAnomaliesCounter,
  securityEventsCounter,
  securityHeadersAppliedCounter,
  securityRiskScoreHistogram,
  systemCpuUsageGauge,
  systemLoadAverageGauge,
  systemMemoryFreeGauge,
  systemMemoryTotalGauge,
  systemMemoryUsageGauge,
  telemetryExportCounter,
  telemetryExportErrorCounter,
  threadPoolActiveGauge,
  threadPoolIdleGauge,
  threadPoolPendingGauge,
} from "./instruments";
// Re-export Kong metrics
export {
  recordKongCacheHit,
  recordKongCacheMiss,
  recordKongOperation,
  recordKongResponseTime,
} from "./kong-metrics";
// Re-export process metrics
export {
  recordGCCollection,
  recordGCDuration,
  recordGCHeapSizes,
  setupSystemMetricsCollection,
  startMemoryPressureMonitoring,
  startSystemMetricsCollection,
  stopMemoryPressureMonitoring,
  stopSystemMetricsCollection,
} from "./process-metrics";
// Re-export Redis metrics
export { recordCacheOperation, recordRedisConnection, recordRedisOperation } from "./redis-metrics";
// Re-export security metrics
export {
  recordAuditEvent,
  recordSecurityEvent,
  recordSecurityHeaders,
  recordSecurityHeadersApplied,
} from "./security-metrics";
// Re-export telemetry metrics
export { recordTelemetryExport, recordTelemetryExportError } from "./telemetry-metrics";
// Re-export types
export type {
  ApiVersionAttributes,
  AuthAttributes,
  CacheTierAttributes,
  CircuitBreakerAttributes,
  ConsumerVolumeAttributes,
  ErrorAttributes,
  HttpRequestAttributes,
  KongAttributes,
  ProcessAttributes,
  RedisAttributes,
  SecurityAttributes,
  TelemetryAttributes,
} from "./types";

// Status and lifecycle functions
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
    initialized: isMetricsInitialized(),
    instrumentCount: isMetricsInitialized() ? 65 : 0,
    availableMetrics: isMetricsInitialized() ? metricNames : [],
    instruments: isMetricsInitialized() ? metricNames : [],
  };
}

export function shutdown(): void {
  stopMemoryPressureMonitoring();
  setMetricsInitialized(false);
  info("Metrics system shutdown completed");
}

export function shutdownMetrics(): void {
  shutdown();
}

export function testMetricRecording(): void {
  if (!isMetricsInitialized()) {
    warn("Metrics not initialized - cannot test recording");
    return;
  }

  info("Testing metric recording functionality");

  try {
    // Import locally to avoid circular imports at module load time
    const httpMetrics = require("./http-metrics");
    const authMetrics = require("./auth-metrics");
    const kongMetrics = require("./kong-metrics");
    const redisMetrics = require("./redis-metrics");

    httpMetrics.recordHttpRequest("GET", "/test", 200);
    authMetrics.recordAuthenticationAttempt("test-consumer", true);
    kongMetrics.recordKongOperation("health_check", 50);
    redisMetrics.recordRedisOperation("get", 5);

    info("Test metric recording completed successfully");
  } catch (err) {
    error("Failed to test metric recording", {
      error: (err as Error).message,
    });
  }
}
