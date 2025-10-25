/* test/k6/utils/metrics.ts */

// Custom metrics and business KPIs for authentication service testing

import { Counter, Gauge, Rate, Trend } from "k6/metrics";

export const businessMetrics = {
  // Token generation metrics
  tokenGenerationRate: new Rate("token_generation_rate"),
  tokenGenerationDuration: new Trend("token_generation_duration"),
  tokensPerSecond: new Rate("tokens_per_second"),

  // Authentication flow metrics
  authenticationAttempts: new Counter("authentication_attempts"),
  authenticationSuccesses: new Counter("authentication_successes"),
  authenticationFailures: new Counter("authentication_failures"),

  // Kong integration metrics
  kongResponseTime: new Trend("kong_response_time"),
  kongProxyCacheHits: new Rate("kong_proxy_cache_hits"),
  kongProxyCacheMisses: new Rate("kong_proxy_cache_misses"),

  // Rate limiting metrics
  rateLimitExceeded: new Counter("rate_limit_exceeded"),
  rateLimitApproaching: new Counter("rate_limit_approaching"),

  // System performance metrics
  concurrentUsers: new Gauge("concurrent_active_users"),
  memoryUsage: new Trend("memory_usage_mb"),
  jwtSigningTime: new Trend("jwt_signing_time_ms"),

  // Business KPIs
  tokenUtilizationRate: new Rate("token_utilization_rate"),
  averageTokenLifetime: new Trend("average_token_lifetime"),
  peakConcurrentRequests: new Gauge("peak_concurrent_requests"),

  // High-throughput specific metrics
  requestsPerSecond: new Trend("requests_per_second"),
  tokensPerSecondActual: new Trend("tokens_per_second_actual"),
  circuitBreakerActivations: new Counter("circuit_breaker_activations"),
  staleCacheHits: new Counter("stale_cache_hits"),
  highThroughputViolations: new Counter("high_throughput_violations"),

  // Capacity planning metrics
  cpuUtilizationUnderLoad: new Trend("cpu_utilization_under_load"),
  memoryUtilizationUnderLoad: new Trend("memory_utilization_under_load"),
  connectionPoolUtilization: new Trend("connection_pool_utilization"),

  // Error tracking
  unauthorizedRequests: new Counter("unauthorized_requests"),
  invalidConsumerRequests: new Counter("invalid_consumer_requests"),
  systemErrors: new Counter("system_errors"),

  // Response quality metrics
  responseCompleteness: new Rate("response_completeness_rate"),
  tokenValidityRate: new Rate("token_validity_rate"),

  // Performance budget tracking
  performanceBudgetViolations: new Counter("performance_budget_violations"),
};

export interface TokenMetadata {
  consumerId: string;
  username: string;
  endpoint: string;
  success: boolean;
  duration: number;
  tokenValid?: boolean;
  proxyCacheHit?: boolean;
  rateLimited?: boolean;
}

export const recordTokenGeneration = (metadata: TokenMetadata) => {
  const tags = {
    consumer_id: metadata.consumerId,
    username: metadata.username,
    endpoint: metadata.endpoint,
    proxy_cache_status: metadata.proxyCacheHit ? "hit" : "miss",
  };

  // Record core metrics
  businessMetrics.authenticationAttempts.add(1, tags);
  businessMetrics.tokenGenerationDuration.add(metadata.duration, tags);

  if (metadata.success) {
    businessMetrics.authenticationSuccesses.add(1, tags);
    businessMetrics.tokenGenerationRate.add(1, tags);
    businessMetrics.tokensPerSecond.add(1, tags);

    if (metadata.tokenValid) {
      businessMetrics.tokenValidityRate.add(1, tags);
      businessMetrics.responseCompleteness.add(1, tags);
    }

    if (metadata.proxyCacheHit) {
      businessMetrics.kongProxyCacheHits.add(1, tags);
    } else {
      businessMetrics.kongProxyCacheMisses.add(1, tags);
    }
  } else {
    businessMetrics.authenticationFailures.add(1, tags);
    businessMetrics.tokenGenerationRate.add(0, tags);

    if (metadata.rateLimited) {
      businessMetrics.rateLimitExceeded.add(1, tags);
    }
  }

  // Update concurrent users
  businessMetrics.concurrentUsers.add(__VU);
};

export interface HealthMetadata {
  endpoint: string;
  duration: number;
  success: boolean;
  kongHealthy?: boolean;
  memoryUsage?: number;
}

export const recordHealthCheck = (metadata: HealthMetadata) => {
  const tags = {
    endpoint: metadata.endpoint,
    kong_status: metadata.kongHealthy ? "healthy" : "unhealthy",
  };

  if (metadata.success) {
    businessMetrics.responseCompleteness.add(1, tags);
  }

  if (metadata.memoryUsage) {
    businessMetrics.memoryUsage.add(metadata.memoryUsage, tags);
  }
};

export interface ErrorMetadata {
  errorType: "unauthorized" | "invalid_consumer" | "system_error" | "rate_limit";
  consumerId?: string;
  endpoint: string;
  httpStatus: number;
}

export const recordError = (metadata: ErrorMetadata) => {
  const tags = {
    error_type: metadata.errorType,
    endpoint: metadata.endpoint,
    http_status: metadata.httpStatus.toString(),
    consumer_id: metadata.consumerId || "unknown",
  };

  switch (metadata.errorType) {
    case "unauthorized":
      businessMetrics.unauthorizedRequests.add(1, tags);
      break;
    case "invalid_consumer":
      businessMetrics.invalidConsumerRequests.add(1, tags);
      break;
    case "rate_limit":
      businessMetrics.rateLimitExceeded.add(1, tags);
      break;
    case "system_error":
      businessMetrics.systemErrors.add(1, tags);
      break;
  }
};

export const recordPerformanceBudgetViolation = (
  operation: string,
  actualDuration: number,
  budgetMs: number
) => {
  const tags = {
    operation,
    budget_ms: budgetMs.toString(),
    actual_ms: actualDuration.toString(),
    violation_percent: Math.round(((actualDuration - budgetMs) / budgetMs) * 100).toString(),
  };

  businessMetrics.performanceBudgetViolations.add(1, tags);
};

export const getPerformanceBudget = (operation: string): number => {
  const budgets: { [key: string]: number } = {
    token_generation: 10,     // 10ms budget for token generation (100k+ req/sec target)
    token_generation_p99: 25, // 25ms P99 budget
    health_check: 20,         // 20ms budget for health checks
    health_check_p99: 30,     // 30ms P99 budget
    metrics_endpoint: 15,     // 15ms budget for metrics
    openapi_spec: 10,         // 10ms budget for OpenAPI spec
    jwt_signing: 3,           // 3ms budget for JWT signing
    circuit_breaker_response: 50, // 50ms budget for circuit breaker responses
    cache_lookup: 2,          // 2ms budget for cache operations
  };

  return budgets[operation] || 50; // Default 50ms budget for high-performance target
};

// Additional performance monitoring functions
export const recordHighThroughputMetrics = (requestsPerSecond: number, avgResponseTime: number) => {
  const tags = {
    throughput_tier: requestsPerSecond > 50000 ? "ultra_high" :
                    requestsPerSecond > 10000 ? "high" :
                    requestsPerSecond > 1000 ? "medium" : "low",
    performance_tier: avgResponseTime < 10 ? "excellent" :
                     avgResponseTime < 50 ? "good" :
                     avgResponseTime < 100 ? "acceptable" : "degraded"
  };

  businessMetrics.peakConcurrentRequests.add(requestsPerSecond, tags);
};

export const recordCircuitBreakerMetrics = (state: "open" | "closed" | "half-open", responseTime: number) => {
  const tags = {
    circuit_breaker_state: state,
    response_category: responseTime < 50 ? "fast" : responseTime < 200 ? "normal" : "slow"
  };

  if (state === "open") {
    businessMetrics.rateLimitExceeded.add(1, tags);
  }
};
