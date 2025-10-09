/* test/k6/smoke/tokens-smoke.ts */

// K6 smoke tests for JWT token generation endpoint performance validation

import http from 'k6/http';
import { check, sleep } from 'k6';
import { getConfig, getPerformanceThresholds, getScenarioConfig, getTestConsumer, getHeaders } from '../utils/config.ts';
import { setupTestConsumers } from '../utils/setup.js';

const config = getConfig();
const thresholds = getPerformanceThresholds();
const scenarios = getScenarioConfig();

export const options = {
  scenarios: {
    token_smoke: scenarios.smoke
  },
  thresholds: thresholds.tokens.smoke
};

export function setup() {
  console.log('[K6 Tokens Test] Running setup...');
  const success = setupTestConsumers();
  if (!success) {
    throw new Error('Failed to setup test consumers');
  }
  console.log('[K6 Tokens Test] Setup completed successfully');
  return { setupComplete: true };
}

export default function() {
  const baseUrl = config.baseUrl;
  const consumer = getTestConsumer(0);

  // Test valid token generation with Kong consumer headers
  const headers = getHeaders(consumer);

  const tokenResponse = http.get(`${baseUrl}/tokens`, { headers });
  check(tokenResponse, {
    'token status is 200': (r) => r.status === 200,
    'token response time < 100ms': (r) => r.timings.duration < 100,
    'token has access_token': (r) => {
      const body = typeof r.body === 'string' ? r.body : '';
      return body.includes('"access_token"');
    },
    'token has expires_in': (r) => {
      const body = typeof r.body === 'string' ? r.body : '';
      return body.includes('"expires_in"');
    },
  });

  sleep(1);

  // Test invalid consumer (no headers)
  const invalidResponse = http.get(`${baseUrl}/tokens`);
  check(invalidResponse, {
    'invalid request returns 401': (r) => r.status === 401,
    'invalid request response time < 20ms': (r) => r.timings.duration < 20,
  });

  sleep(0.5);

  // Test anonymous consumer rejection
  const anonymousHeaders = {
    ...headers,
    'X-Anonymous-Consumer': 'true',
  };

  const anonymousResponse = http.get(`${baseUrl}/tokens`, { headers: anonymousHeaders });
  check(anonymousResponse, {
    'anonymous request returns 401': (r) => r.status === 401,
    'anonymous request response time < 20ms': (r) => r.timings.duration < 20,
  });

  sleep(1);
}