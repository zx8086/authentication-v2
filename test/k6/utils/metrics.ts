/* test/k6/utils/metrics.ts */

// Custom metrics and business KPIs for authentication service testing

import { Counter, Trend, Rate, Gauge } from 'k6/metrics';

export const businessMetrics = {
  // Token generation metrics
  tokenGenerationRate: new Rate('token_generation_rate'),
  tokenGenerationDuration: new Trend('token_generation_duration'),
  tokensPerSecond: new Rate('tokens_per_second'),

  // Authentication flow metrics
  authenticationAttempts: new Counter('authentication_attempts'),
  authenticationSuccesses: new Counter('authentication_successes'),
  authenticationFailures: new Counter('authentication_failures'),

  // Kong integration metrics
  kongResponseTime: new Trend('kong_response_time'),
  kongCacheHits: new Rate('kong_cache_hits'),
  kongCacheMisses: new Rate('kong_cache_misses'),

  // Rate limiting metrics
  rateLimitExceeded: new Counter('rate_limit_exceeded'),
  rateLimitApproaching: new Counter('rate_limit_approaching'),

  // System performance metrics
  concurrentUsers: new Gauge('concurrent_active_users'),
  memoryUsage: new Trend('memory_usage_mb'),
  jwtSigningTime: new Trend('jwt_signing_time_ms'),

  // Business KPIs
  tokenUtilizationRate: new Rate('token_utilization_rate'),
  averageTokenLifetime: new Trend('average_token_lifetime'),
  peakConcurrentRequests: new Gauge('peak_concurrent_requests'),

  // Error tracking
  unauthorizedRequests: new Counter('unauthorized_requests'),
  invalidConsumerRequests: new Counter('invalid_consumer_requests'),
  systemErrors: new Counter('system_errors'),

  // Response quality metrics
  responseCompleteness: new Rate('response_completeness_rate'),
  tokenValidityRate: new Rate('token_validity_rate'),

  // Performance budget tracking
  performanceBudgetViolations: new Counter('performance_budget_violations')
};

export interface TokenMetadata {
  consumerId: string;
  username: string;
  endpoint: string;
  success: boolean;
  duration: number;
  tokenValid?: boolean;
  cacheHit?: boolean;
  rateLimited?: boolean;
}

export const recordTokenGeneration = (metadata: TokenMetadata) => {
  const tags = {
    consumer_id: metadata.consumerId,
    username: metadata.username,
    endpoint: metadata.endpoint,
    cache_status: metadata.cacheHit ? 'hit' : 'miss'
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

    if (metadata.cacheHit) {
      businessMetrics.kongCacheHits.add(1, tags);
    } else {
      businessMetrics.kongCacheMisses.add(1, tags);
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
    kong_status: metadata.kongHealthy ? 'healthy' : 'unhealthy'
  };

  if (metadata.success) {
    businessMetrics.responseCompleteness.add(1, tags);
  }

  if (metadata.memoryUsage) {
    businessMetrics.memoryUsage.add(metadata.memoryUsage, tags);
  }
};

export interface ErrorMetadata {
  errorType: 'unauthorized' | 'invalid_consumer' | 'system_error' | 'rate_limit';
  consumerId?: string;
  endpoint: string;
  httpStatus: number;
}

export const recordError = (metadata: ErrorMetadata) => {
  const tags = {
    error_type: metadata.errorType,
    endpoint: metadata.endpoint,
    http_status: metadata.httpStatus.toString(),
    consumer_id: metadata.consumerId || 'unknown'
  };

  switch (metadata.errorType) {
    case 'unauthorized':
      businessMetrics.unauthorizedRequests.add(1, tags);
      break;
    case 'invalid_consumer':
      businessMetrics.invalidConsumerRequests.add(1, tags);
      break;
    case 'rate_limit':
      businessMetrics.rateLimitExceeded.add(1, tags);
      break;
    case 'system_error':
      businessMetrics.systemErrors.add(1, tags);
      break;
  }
};

export const recordPerformanceBudgetViolation = (operation: string, actualDuration: number, budgetMs: number) => {
  const tags = {
    operation,
    budget_ms: budgetMs.toString(),
    actual_ms: actualDuration.toString(),
    violation_percent: Math.round(((actualDuration - budgetMs) / budgetMs) * 100).toString()
  };

  businessMetrics.performanceBudgetViolations.add(1, tags);
};

export const getPerformanceBudget = (operation: string): number => {
  const budgets: { [key: string]: number } = {
    'token_generation': 50,   // 50ms budget for token generation
    'health_check': 30,       // 30ms budget for health checks
    'metrics_endpoint': 20,   // 20ms budget for metrics
    'openapi_spec': 10        // 10ms budget for OpenAPI spec
  };

  return budgets[operation] || 100; // Default 100ms budget
};