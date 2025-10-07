/* test/k6/stress/system-stress.ts */

// K6 stress testing scenario to determine authentication service breaking point

import http from 'k6/http';
import { check, sleep } from 'k6';
import { getConfig } from '../utils/config.ts';
import { setupTestConsumers } from '../utils/setup.js';

export function setup() {
  console.log('[K6 Stress Test] Running setup...');

  const success = setupTestConsumers();
  if (!success) {
    throw new Error('Failed to setup test consumers');
  }

  console.log('[K6 Stress Test] Setup completed successfully');
  return { setupComplete: true };
}

export const options = {
  scenarios: {
    stress_test: {
      executor: 'ramping-vus',
      stages: [
        { duration: '1m', target: 50 },   // Ramp up to 50 VUs
        { duration: '2m', target: 100 },  // Push to 100 VUs (beyond normal capacity)
        { duration: '2m', target: 100 },  // Sustain stress load
        { duration: '1m', target: 0 }     // Ramp down
      ]
    }
  },
  thresholds: {
    'http_req_duration': ['p(95)<500'],  // Relaxed threshold for stress
    'http_req_failed': ['rate<0.1']      // Higher error tolerance
  }
};

export default function() {
  const config = getConfig();
  const baseUrl = config.baseUrl;

  // Rapid token requests for stress testing
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'K6-AuthService-StressTest/1.0',
    'X-Consumer-Id': `stress-consumer-${String(__VU).padStart(3, '0')}`,
    'X-Consumer-Username': `stress-user-${String(__VU).padStart(3, '0')}`,
    'X-Anonymous-Consumer': 'false',
  };

  const tokenResponse = http.get(`${baseUrl}/tokens`, { headers });
  check(tokenResponse, {
    'stress token status is 200 or 429': (r) => r.status === 200 || r.status === 429,
    'stress token response time < 500ms': (r) => r.timings.duration < 500,
  });

  // Occasional health checks during stress
  if (__ITER % 10 === 0) {
    const healthResponse = http.get(`${baseUrl}/health`);
    check(healthResponse, {
      'stress health check responds': (r) => r.status >= 200 && r.status < 500,
    });
  }

  // Minimal sleep for stress testing
  sleep(0.1);
}