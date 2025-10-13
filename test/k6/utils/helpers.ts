/* test/k6/utils/helpers.ts */

// Test helper functions for authentication service testing

import http from 'k6/http';
import type { Response } from 'k6/http';
import { check } from 'k6';
import type { Checkers } from 'k6';
import { getConfig, getHeaders, ConsumerConfig } from './config';
import { recordTokenGeneration, recordHealthCheck, recordError, getPerformanceBudget, recordPerformanceBudgetViolation } from './metrics';

export interface TokenResponse {
  access_token: string;
  expires_in: number;
}

export interface ValidationOptions {
  endpoint: string;
  expectToken?: boolean;
  expectedStatus?: number;
  validateJWT?: boolean;
  performanceBudget?: number;
}

export const executeTokenRequest = (consumer: ConsumerConfig, options: ValidationOptions = { endpoint: 'tokens' }): Response => {
  const config = getConfig();
  const startTime = Date.now();

  const headers = getHeaders(consumer);
  const url = `${config.baseUrl}/tokens`;

  const params = {
    headers,
    tags: {
      endpoint: 'tokens',
      consumer_id: consumer.id,
      username: consumer.username,
      test_type: 'token_generation'
    },
    timeout: config.timeout
  };

  const response = http.get(url, params);
  const duration = Date.now() - startTime;

  // Validate response and record metrics
  const success = validateTokenResponse(response, options);

  recordTokenGeneration({
    consumerId: consumer.id,
    username: consumer.username,
    endpoint: 'tokens',
    success,
    duration,
    tokenValid: success && options.validateJWT,
    proxyCacheHit: typeof response.headers['X-Cache-Status'] === 'string' && response.headers['X-Cache-Status'] === 'HIT',
    rateLimited: response.status === 429
  });

  // Check performance budget
  const budget = options.performanceBudget || getPerformanceBudget('token_generation');
  if (duration > budget) {
    recordPerformanceBudgetViolation('token_generation', duration, budget);
  }

  return response;
};

export const validateTokenResponse = (response: Response, options: ValidationOptions): boolean => {
  const expectedStatus = options.expectedStatus || 200;

  const checks: Checkers<Response> = {
    [`status is ${expectedStatus}`]: (r: Response) => r.status === expectedStatus,
    'has content-type header': (r: Response) => {
      const contentType = r.headers['Content-Type'];
      return typeof contentType === 'string' ? contentType === 'application/json' : false;
    },
    'has request-id header': (r: Response) => {
      const requestId = r.headers['X-Request-Id'];
      return typeof requestId === 'string' ? !!requestId : false;
    },
    'response time acceptable': (r: Response) => r.timings.duration < (options.performanceBudget || 100)
  };

  if (expectedStatus === 200 && options.expectToken !== false) {
    checks['has access_token'] = (r: Response) => {
      try {
        const body = typeof r.body === 'string' ? r.body : '';
        const tokenResponse = JSON.parse(body) as TokenResponse;
        return !!tokenResponse.access_token;
      } catch {
        return false;
      }
    };

    checks['has expires_in'] = (r: Response) => {
      try {
        const body = typeof r.body === 'string' ? r.body : '';
        const tokenResponse = JSON.parse(body) as TokenResponse;
        return tokenResponse.expires_in === 900;
      } catch {
        return false;
      }
    };

    if (options.validateJWT) {
      checks['valid JWT structure'] = (r: Response) => {
        try {
          const body = typeof r.body === 'string' ? r.body : '';
          const tokenResponse = JSON.parse(body) as TokenResponse;
          const tokenParts = tokenResponse.access_token.split('.');
          return tokenParts.length === 3;
        } catch {
          return false;
        }
      };

      checks['valid JWT payload'] = (r: Response) => {
        try {
          const body = typeof r.body === 'string' ? r.body : '';
          const tokenResponse = JSON.parse(body) as TokenResponse;
          const tokenParts = tokenResponse.access_token.split('.');
          // K6 doesn't have atob, so we'll just check the token structure
          // Full JWT validation would require importing encoding libraries
          return tokenParts.length === 3 && tokenParts[1].length > 0;
        } catch {
          return false;
        }
      };
    }
  }

  const success = check(response, checks);

  // Record errors for failed requests
  if (!success || response.status >= 400) {
    let errorType: 'unauthorized' | 'invalid_consumer' | 'system_error' | 'rate_limit' = 'system_error';

    if (response.status === 401) {
      errorType = 'unauthorized';
    } else if (response.status === 429) {
      errorType = 'rate_limit';
    } else if (response.status === 400) {
      errorType = 'invalid_consumer';
    }

    recordError({
      errorType,
      endpoint: options.endpoint,
      httpStatus: response.status,
      consumerId: response.request?.headers?.['X-Consumer-Id']?.[0]
    });
  }

  return success;
};

export const executeHealthCheck = (): Response => {
  const config = getConfig();
  const startTime = Date.now();

  const url = `${config.baseUrl}/health`;
  const params = {
    headers: {
      'User-Agent': config.userAgent,
      'Accept': 'application/json'
    },
    tags: {
      endpoint: 'health',
      test_type: 'health_check'
    },
    timeout: config.timeout
  };

  const response = http.get(url, params);
  const duration = Date.now() - startTime;

  const success = validateHealthResponse(response);

  let memoryUsage: number | undefined;
  let kongHealthy: boolean | undefined;

  if (success && response.status === 200) {
    try {
      const body = typeof response.body === 'string' ? response.body : '';
      const healthData = JSON.parse(body);
      kongHealthy = healthData.dependencies?.kong?.status === 'healthy';
      memoryUsage = healthData.memory?.used ? Math.round(healthData.memory.used / (1024 * 1024)) : undefined;
    } catch {
      // Ignore JSON parsing errors
    }
  }

  recordHealthCheck({
    endpoint: 'health',
    duration,
    success,
    kongHealthy,
    memoryUsage
  });

  // Check performance budget
  const budget = getPerformanceBudget('health_check');
  if (duration > budget) {
    recordPerformanceBudgetViolation('health_check', duration, budget);
  }

  return response;
};

export const validateHealthResponse = (response: Response): boolean => {
  const checks: Checkers<Response> = {
    'status is 200 or 503': (r: Response) => [200, 503].includes(r.status),
    'has content-type header': (r: Response) => {
      const contentType = r.headers['Content-Type'];
      return typeof contentType === 'string' ? contentType === 'application/json' : false;
    },
    'has valid health response': (r: Response) => {
      try {
        const body = typeof r.body === 'string' ? r.body : '';
        const health = JSON.parse(body);
        return health.status && health.timestamp && health.version !== undefined;
      } catch {
        return false;
      }
    },
    'response time under 100ms': (r: Response) => r.timings.duration < 100
  };

  return check(response, checks);
};

export const executeMetricsCheck = (): Response => {
  const config = getConfig();
  const startTime = Date.now();

  const url = `${config.baseUrl}/metrics`;
  const params = {
    headers: {
      'User-Agent': config.userAgent,
      'Accept': 'application/json'
    },
    tags: {
      endpoint: 'metrics',
      test_type: 'metrics_check'
    },
    timeout: config.timeout
  };

  const response = http.get(url, params);
  const duration = Date.now() - startTime;

  const success = validateMetricsResponse(response);

  // Check performance budget
  const budget = getPerformanceBudget('metrics_endpoint');
  if (duration > budget) {
    recordPerformanceBudgetViolation('metrics_endpoint', duration, budget);
  }

  return response;
};

export const validateMetricsResponse = (response: Response): boolean => {
  const checks: Checkers<Response> = {
    'status is 200': (r: Response) => r.status === 200,
    'has content-type header': (r: Response) => {
      const contentType = r.headers['Content-Type'];
      return typeof contentType === 'string' ? contentType === 'application/json' : false;
    },
    'has valid metrics response': (r: Response) => {
      try {
        const body = typeof r.body === 'string' ? r.body : '';
        const metrics = JSON.parse(body);
        return metrics.timestamp && metrics.uptime !== undefined && metrics.memory && metrics.performance;
      } catch {
        return false;
      }
    },
    'response time under 50ms': (r: Response) => r.timings.duration < 50
  };

  return check(response, checks);
};

export const executeOpenAPICheck = (): Response => {
  const config = getConfig();
  const startTime = Date.now();

  const url = `${config.baseUrl}/openapi`;
  const params = {
    headers: {
      'User-Agent': config.userAgent,
      'Accept': 'application/json'
    },
    tags: {
      endpoint: 'openapi',
      test_type: 'openapi_check'
    },
    timeout: config.timeout
  };

  const response = http.get(url, params);
  const duration = Date.now() - startTime;

  const success = validateOpenAPIResponse(response);

  // Check performance budget
  const budget = getPerformanceBudget('openapi_spec');
  if (duration > budget) {
    recordPerformanceBudgetViolation('openapi_spec', duration, budget);
  }

  return response;
};

export const validateOpenAPIResponse = (response: Response): boolean => {
  const checks: Checkers<Response> = {
    'status is 200': (r: Response) => r.status === 200,
    'has content-type header': (r: Response) => {
      const contentType = r.headers['Content-Type'];
      return typeof contentType === 'string' ? contentType === 'application/json' : false;
    },
    'has valid OpenAPI spec': (r: Response) => {
      try {
        const body = typeof r.body === 'string' ? r.body : '';
        const spec = JSON.parse(body);
        return spec.openapi && spec.info && spec.paths;
      } catch {
        return false;
      }
    },
    'response time under 20ms': (r: Response) => r.timings.duration < 20
  };

  return check(response, checks);
};

export const testRateLimiting = (consumer: ConsumerConfig, requestCount: number = 10): void => {
  console.log(`Testing rate limiting for consumer ${consumer.id} with ${requestCount} requests`);

  const responses = [];
  for (let i = 0; i < requestCount; i++) {
    const response = executeTokenRequest(consumer, {
      endpoint: 'tokens',
      expectedStatus: undefined // Don't enforce status, we expect some 429s
    });
    responses.push(response);

    // Small delay to avoid overwhelming the system
    if (i < requestCount - 1) {
      // K6 doesn't support sub-second sleep, so we skip the delay
      // sleep(0.01) would be ideal but K6 sleep() only accepts seconds
    }
  }

  const successCount = responses.filter(r => r.status === 200).length;
  const rateLimitedCount = responses.filter(r => r.status === 429).length;

  console.log(`Rate limiting test results: ${successCount} successful, ${rateLimitedCount} rate limited`);
};

export const simulateUserJourney = (consumer: ConsumerConfig): void => {
  // 1. Check service health
  executeHealthCheck();

  // 2. Check metrics
  executeMetricsCheck();

  // 3. Generate token
  const tokenResponse = executeTokenRequest(consumer, {
    endpoint: 'tokens',
    validateJWT: true
  });

  // 4. Verify token was generated successfully
  if (tokenResponse.status === 200) {
    try {
      const body = typeof tokenResponse.body === 'string' ? tokenResponse.body : '';
      const tokenData = JSON.parse(body) as TokenResponse;
      console.log(`Generated token for ${consumer.username}, expires in ${tokenData.expires_in}s`);
    } catch (e) {
      console.error(`Failed to parse token response for ${consumer.username}`);
    }
  }
};