/* test/k6/smoke/tokens-smoke.ts */

import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    token_smoke: {
      executor: 'constant-vus',
      vus: 3,
      duration: '30s'
    }
  },
  thresholds: {
    'http_req_duration': ['p(95)<100', 'p(99)<500'],
    'http_req_failed': ['rate<0.67']
  }
};

export default function() {
  const baseUrl = 'http://192.168.178.10:3000';

  // Test valid token generation with Kong consumer headers
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'K6-AuthService-LoadTest/1.0',
    'X-Consumer-Id': `test-consumer-${String(__VU).padStart(3, '0')}`,
    'X-Consumer-Username': `loadtest-user-${String(__VU).padStart(3, '0')}`,
    'X-Anonymous-Consumer': 'false',
  };

  const tokenResponse = http.get(`${baseUrl}/tokens`, { headers });
  check(tokenResponse, {
    'token status is 200': (r) => r.status === 200,
    'token response time < 100ms': (r) => r.timings.duration < 100,
    'token has access_token': (r) => r.body.includes('"access_token"'),
    'token has expires_in': (r) => r.body.includes('"expires_in"'),
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