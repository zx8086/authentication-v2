/* test/k6/smoke/health-smoke.ts */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { getConfig, getPerformanceThresholds, getScenarioConfig } from '../utils/config.ts';

const config = getConfig();
const thresholds = getPerformanceThresholds();
const scenarios = getScenarioConfig();

export const options = {
  scenarios: {
    health_smoke: scenarios.smoke
  },
  thresholds: thresholds.health.smoke
};

export default function() {
  const baseUrl = config.baseUrl;

  // Test health endpoint
  const healthResponse = http.get(`${baseUrl}/health`);
  check(healthResponse, {
    'health status is 200': (r) => r.status === 200,
    'health response time < 100ms': (r) => r.timings.duration < 100,
    'health has status field': (r) => r.body.includes('"status"'),
  });

  sleep(0.5);

  // Test metrics endpoint
  const metricsResponse = http.get(`${baseUrl}/metrics`);
  check(metricsResponse, {
    'metrics status is 200': (r) => r.status === 200,
    'metrics response time < 50ms': (r) => r.timings.duration < 50,
  });

  sleep(0.5);

  // Test OpenAPI endpoint (served at root)
  const openapiResponse = http.get(`${baseUrl}/`);
  check(openapiResponse, {
    'openapi status is 200': (r) => r.status === 200,
    'openapi response time < 50ms': (r) => r.timings.duration < 50,
    'openapi contains spec': (r) => r.body.includes('"openapi": "3.0.3"'),
  });

  sleep(1);
}