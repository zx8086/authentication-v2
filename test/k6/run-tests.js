/* test/k6/run-tests.js */

// Simple test runner script for K6 authentication service tests
// Usage: k6 run test/k6/run-tests.js

import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    comprehensive_test: {
      executor: 'constant-vus',
      vus: 2,
      duration: '60s'
    }
  },
  thresholds: {
    'http_req_duration': ['p(95)<200'],
    'http_req_failed': ['rate<0.05']
  }
};

export default function() {
  const baseUrl = 'http://192.168.178.10:3000';

  // Health check
  const healthResponse = http.get(`${baseUrl}/health`);
  check(healthResponse, {
    'health status is 200': (r) => r.status === 200,
  });

  sleep(0.3);

  // Metrics check
  const metricsResponse = http.get(`${baseUrl}/metrics`);
  check(metricsResponse, {
    'metrics status is 200': (r) => r.status === 200,
  });

  sleep(0.3);

  // Token generation with proper headers
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'K6-AuthService-Test/1.0',
    'X-Consumer-Id': `test-consumer-${String(__VU).padStart(3, '0')}`,
    'X-Consumer-Username': `test-user-${String(__VU).padStart(3, '0')}`,
    'X-Anonymous-Consumer': 'false',
  };

  const tokenResponse = http.get(`${baseUrl}/tokens`, { headers });
  check(tokenResponse, {
    'token status is 200': (r) => r.status === 200,
    'token has access_token': (r) => r.body.includes('"access_token"'),
  });

  sleep(0.3);

  // OpenAPI spec check
  const openapiResponse = http.get(`${baseUrl}/`);
  check(openapiResponse, {
    'openapi status is 200': (r) => r.status === 200,
    'openapi contains spec': (r) => r.body.includes('"openapi"'),
  });

  sleep(1);
}