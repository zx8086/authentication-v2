/* test/k6/smoke/metrics-only-smoke.ts */

// K6 smoke test for metrics endpoint only - tests /metrics endpoint performance

import http from 'k6/http';
import { check, sleep } from 'k6';
import { getConfig, getPerformanceThresholds, getScenarioConfig } from '../utils/config.ts';

const config = getConfig();
const thresholds = getPerformanceThresholds();
const scenarios = getScenarioConfig();

export const options = {
  scenarios: {
    metrics_only_smoke: scenarios.smoke
  },
  thresholds: thresholds.metrics.smoke
};

export default function() {
  const baseUrl = config.baseUrl;

  // Test metrics endpoint only
  const metricsResponse = http.get(`${baseUrl}/metrics`);
  check(metricsResponse, {
    'metrics status is 200': (r) => r.status === 200,
    'metrics response time < 50ms': (r) => r.timings.duration < 50,
    'metrics has timestamp': (r) => r.body.includes('"timestamp"'),
    'metrics has uptime': (r) => r.body.includes('"uptime"'),
    'metrics has memory info': (r) => r.body.includes('"memory"'),
    'metrics has cache info': (r) => r.body.includes('"cache"'),
    'metrics has telemetry info': (r) => r.body.includes('"telemetry"'),
  });

  sleep(1);
}