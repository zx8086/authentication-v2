/* test/k6/load/auth-load.ts */

// K6 load testing scenario for authentication service under sustained traffic

import { check, sleep } from "k6";
import http from "k6/http";
import { getConfig, getHeaders, getTestConsumer } from "../utils/config.ts";
import { setupTestConsumers } from "../utils/setup.js";

export function setup() {
  console.log("[K6 Load Test] Running setup...");

  const success = setupTestConsumers();
  if (!success) {
    throw new Error("Failed to setup test consumers");
  }

  console.log("[K6 Load Test] Setup completed successfully");
  return { setupComplete: true };
}

export const options = {
  scenarios: {
    steady_load: {
      executor: "ramping-vus",
      stages: [
        { duration: "1m", target: 10 }, // Ramp up to 10 VUs
        { duration: "3m", target: 20 }, // Scale to 20 VUs
        { duration: "1m", target: 0 }, // Ramp down
      ],
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<200", "p(99)<500"],
    http_req_failed: ["rate<0.05"],
  },
};

export default function () {
  const config = getConfig();
  const baseUrl = config.baseUrl;

  // 70% token generation requests
  if (Math.random() < 0.7) {
    const consumer = getTestConsumer(__VU % 5);
    const headers = getHeaders(consumer);

    const tokenResponse = http.get(`${baseUrl}/tokens`, { headers });
    check(tokenResponse, {
      "token status is 200": (r) => r.status === 200,
      "token response time < 200ms": (r) => r.timings.duration < 200,
      "token has access_token": (r) => {
        const body = typeof r.body === "string" ? r.body : "";
        return body.includes('"access_token"');
      },
    });

    sleep(0.5 + Math.random() * 0.5); // 0.5-1s think time
  }

  // 20% complete user journey simulation
  else if (Math.random() < 0.67) {
    // 20% of remaining 30%
    // Health check
    const healthResponse = http.get(`${baseUrl}/health`);
    check(healthResponse, {
      "health status is 200": (r) => r.status === 200,
    });

    sleep(0.3);

    // Token request
    const consumer = getTestConsumer((__VU + 2) % 5); // Offset for variety
    const headers = getHeaders(consumer);

    const tokenResponse = http.get(`${baseUrl}/tokens`, { headers });
    check(tokenResponse, {
      "journey token status is 200": (r) => r.status === 200,
    });

    sleep(1 + Math.random() * 2); // 1-3s think time for complete journey
  }

  // 10% health/metrics checks
  else {
    if (Math.random() < 0.5) {
      const healthResponse = http.get(`${baseUrl}/health`);
      check(healthResponse, {
        "health check status is 200": (r) => r.status === 200,
      });
    } else {
      const metricsResponse = http.get(`${baseUrl}/metrics`);
      check(metricsResponse, {
        "metrics check status is 200": (r) => r.status === 200,
      });
    }

    sleep(0.3 + Math.random() * 0.4); // 0.3-0.7s think time
  }

  // Base think time between operations
  sleep(0.8 + Math.random() * 0.4); // 0.8-1.2s
}
