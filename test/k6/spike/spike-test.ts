/* test/k6/spike/spike-test.ts */

// K6 spike testing scenario for authentication service under traffic bursts

import http from 'k6/http';
import { check, sleep } from 'k6';
import { getConfig } from '../utils/config.ts';

export const options = {
  scenarios: {
    spike_test: {
      executor: 'ramping-vus',
      stages: [
        { duration: '30s', target: 25 },   // Normal load
        { duration: '30s', target: 200 },  // Sudden spike
        { duration: '2m', target: 200 },   // Sustain spike
        { duration: '30s', target: 25 },   // Back to normal
        { duration: '30s', target: 0 }     // Ramp down
      ]
    }
  },
  thresholds: {
    'http_req_duration': ['p(95)<500'],
    'http_req_failed': ['rate<0.1']
  }
};

export default function() {
  const config = getConfig();
  const baseUrl = config.baseUrl;

  // Primary load: token generation
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'K6-AuthService-SpikeTest/1.0',
    'X-Consumer-Id': `spike-consumer-${String(__VU).padStart(3, '0')}`,
    'X-Consumer-Username': `spike-user-${String(__VU).padStart(3, '0')}`,
    'X-Anonymous-Consumer': 'false',
  };

  const tokenResponse = http.get(`${baseUrl}/tokens`, { headers });
  check(tokenResponse, {
    'spike token status is 200 or 429': (r) => r.status === 200 || r.status === 429,
    'spike token response time < 500ms': (r) => r.timings.duration < 500,
  });

  // Test system health during spike
  if (__ITER % 20 === 0) {
    const healthResponse = http.get(`${baseUrl}/health`);
    check(healthResponse, {
      'spike health check responds': (r) => r.status >= 200 && r.status < 500,
    });
  }

  // Short sleep to maximize request rate during spike
  sleep(0.1);
}