/* test/k6/stress/system-stress.ts */

// K6 stress testing scenario to determine authentication service breaking point

import { check, sleep } from "k6";
import http from "k6/http";
import { getConfig, getHeaders, getTestConsumer } from "../utils/config.ts";
import { setupTestConsumers } from "../utils/setup.js";

export function setup() {
  console.log("[K6 Stress Test] Running setup...");

  const success = setupTestConsumers();
  if (!success) {
    throw new Error("Failed to setup test consumers");
  }

  console.log("[K6 Stress Test] Setup completed successfully");
  return { setupComplete: true };
}

export const options = {
  scenarios: {
    // Breaking point analysis with extreme load
    breaking_point_vus: {
      executor: "ramping-vus",
      stages: [
        { duration: "2m", target: 200 },   // Baseline stress
        { duration: "3m", target: 500 },   // High stress
        { duration: "3m", target: 1000 },  // Extreme stress
        { duration: "2m", target: 1500 },  // Breaking point
        { duration: "3m", target: 0 },     // Recovery analysis
      ],
    },
    // Arrival-rate stress testing for throughput limits
    throughput_stress: {
      executor: "ramping-arrival-rate",
      startRate: 1000,
      timeUnit: "1s",
      preAllocatedVUs: 200,
      maxVUs: 2000,
      stages: [
        { target: 5000, duration: "2m" },   // 5k req/sec
        { target: 10000, duration: "2m" },  // 10k req/sec
        { target: 20000, duration: "2m" },  // 20k req/sec
        { target: 50000, duration: "1m" },  // 50k req/sec burst
        { target: 100000, duration: "30s" }, // 100k req/sec target
        { target: 0, duration: "2m" },      // Recovery
      ],
    },
  },
  thresholds: {
    // Stress testing with degraded performance acceptance
    'http_req_duration{endpoint:tokens}': ["p(95)<200", "p(99)<500"],  // Degraded but functional
    'http_req_duration{endpoint:health}': ["p(95)<100", "p(99)<200"],  // Health still responsive
    'http_req_failed': ["rate<0.1"],                                   // 90% success under stress
    'throughput_stress_http_reqs': ["rate>5000"],                     // Minimum 5k req/sec sustained
  },
};

export default function () {
  const config = getConfig();
  const baseUrl = config.baseUrl;

  // Rapid token requests for stress testing
  const consumer = getTestConsumer(__VU % 5);
  const headers = getHeaders(consumer);

  const tokenResponse = http.get(`${baseUrl}/tokens`, { headers });
  check(tokenResponse, {
    "stress token status is 200 or 429": (r) => r.status === 200 || r.status === 429,
    "stress token response time < 500ms": (r) => r.timings.duration < 500,
  });

  // Occasional health checks during stress
  if (__ITER % 10 === 0) {
    const healthResponse = http.get(`${baseUrl}/health`);
    check(healthResponse, {
      "stress health check responds": (r) => r.status >= 200 && r.status < 500,
    });
  }

  // Minimal sleep for stress testing
  sleep(0.1);
}
