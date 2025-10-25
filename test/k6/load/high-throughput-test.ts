/* test/k6/load/high-throughput-test.ts */

// High-throughput load testing targeting 100k+ req/sec capability validation

import { check, sleep } from "k6";
import http from "k6/http";
import { SharedArray } from "k6/data";
import { getConfig, getHeaders, getTestConsumer } from "../utils/config.ts";
import { setupTestConsumers } from "../utils/setup.js";
import { businessMetrics, recordTokenGeneration, recordError } from "../utils/metrics.ts";

// Pre-allocate test consumers for high-throughput testing
const testConsumers = new SharedArray("high-throughput-consumers", function () {
  const consumers = [];
  for (let i = 0; i < 50; i++) {
    consumers.push({
      id: `perf-consumer-${String(i).padStart(3, '0')}`,
      username: `perf-user-${String(i).padStart(3, '0')}`,
      isAnonymous: false,
    });
  }
  return consumers;
});

export function setup() {
  console.log("[K6 High-Throughput Test] Running setup...");

  const success = setupTestConsumers();
  if (!success) {
    throw new Error("Failed to setup test consumers");
  }

  console.log("[K6 High-Throughput Test] Setup completed successfully");
  return { setupComplete: true };
}

export const options = {
  scenarios: {
    // Constant arrival rate for sustained throughput testing
    sustained_throughput: {
      executor: "constant-arrival-rate",
      rate: 5000,  // 5k req/sec sustained
      timeUnit: "1s",
      duration: "10m",
      preAllocatedVUs: 200,
      maxVUs: 1000,
    },
    // Ramping arrival rate for capacity planning
    capacity_test: {
      executor: "ramping-arrival-rate",
      startRate: 1000,
      timeUnit: "1s",
      preAllocatedVUs: 100,
      maxVUs: 2000,
      stages: [
        { target: 5000, duration: "2m" },   // 5k req/sec
        { target: 10000, duration: "2m" },  // 10k req/sec
        { target: 25000, duration: "2m" },  // 25k req/sec
        { target: 50000, duration: "1m" },  // 50k req/sec
        { target: 100000, duration: "30s" }, // 100k req/sec target
        { target: 10000, duration: "2m" },  // Sustained fallback
        { target: 0, duration: "1m" },     // Graceful shutdown
      ],
    },
  },
  thresholds: {
    // High-throughput performance targets
    'http_req_duration{endpoint:tokens}': ["p(95)<10", "p(99)<25", "avg<5"],
    'http_req_duration{endpoint:health}': ["p(95)<20", "p(99)<30", "avg<10"],
    'http_req_failed': ["rate<0.005"],  // 99.5% success rate
    'http_reqs': ["rate>1000"],         // Minimum 1k req/sec
    'sustained_throughput_http_reqs': ["rate>4500"],  // 90% of target 5k req/sec
    'capacity_test_http_reqs': ["rate>5000"],         // Capacity test minimum

    // Business metrics thresholds
    'token_generation_rate': ["rate>0.98"],           // 98% token generation success
    'jwt_signing_time': ["p(95)<3", "p(99)<8"],      // Sub-3ms average JWT signing
    'concurrent_active_users': ["value<1000"],        // Concurrent user limit
  },
};

export default function () {
  const config = getConfig();
  const baseUrl = config.baseUrl;

  // Use pre-allocated consumer pool for better performance
  const consumer = testConsumers[Math.floor(Math.random() * testConsumers.length)];

  // 80% token generation (primary use case)
  if (Math.random() < 0.8) {
    const headers = getHeaders(consumer);
    const startTime = Date.now();

    const tokenResponse = http.get(`${baseUrl}/tokens`, {
      headers,
      tags: { endpoint: "tokens", test_type: "high_throughput" }
    });

    const duration = Date.now() - startTime;
    const success = tokenResponse.status === 200;

    // Record business metrics
    recordTokenGeneration({
      consumerId: consumer.id,
      username: consumer.username,
      endpoint: "tokens",
      success,
      duration,
      tokenValid: success && tokenResponse.body.includes('"access_token"'),
      proxyCacheHit: tokenResponse.headers["X-Cache-Status"] === "HIT",
    });

    check(tokenResponse, {
      "high-throughput token status is 200": (r) => r.status === 200,
      "high-throughput token response time < 10ms": (r) => r.timings.duration < 10,
      "high-throughput token has access_token": (r) => {
        const body = typeof r.body === "string" ? r.body : "";
        return body.includes('"access_token"');
      },
      "high-throughput token has proper structure": (r) => {
        const body = typeof r.body === "string" ? r.body : "";
        return body.includes('"token_type"') && body.includes('"expires_in"');
      },
    });

    if (!success) {
      recordError({
        errorType: tokenResponse.status === 401 ? "unauthorized" : "system_error",
        consumerId: consumer.id,
        endpoint: "tokens",
        httpStatus: tokenResponse.status,
      });
    }

    // Update concurrent users metric
    businessMetrics.concurrentUsers.add(__VU);

    // Minimal sleep for high throughput
    sleep(0.01 + Math.random() * 0.02); // 10-30ms
  }

  // 15% health checks (system monitoring)
  else if (Math.random() < 0.75) {
    const healthResponse = http.get(`${baseUrl}/health`, {
      tags: { endpoint: "health", test_type: "high_throughput" }
    });

    check(healthResponse, {
      "high-throughput health status is 200": (r) => r.status === 200,
      "high-throughput health response time < 20ms": (r) => r.timings.duration < 20,
      "high-throughput health has status": (r) => {
        const body = typeof r.body === "string" ? r.body : "";
        return body.includes('"status"');
      },
    });

    sleep(0.005 + Math.random() * 0.01); // 5-15ms
  }

  // 5% metrics endpoint (observability)
  else {
    const metricsResponse = http.get(`${baseUrl}/metrics`, {
      tags: { endpoint: "metrics", test_type: "high_throughput" }
    });

    check(metricsResponse, {
      "high-throughput metrics status is 200": (r) => r.status === 200,
      "high-throughput metrics response time < 30ms": (r) => r.timings.duration < 30,
    });

    sleep(0.1 + Math.random() * 0.05); // 100-150ms
  }
}

export function teardown(data) {
  console.log("[K6 High-Throughput Test] Test completed");
  console.log(`Peak concurrent users: ${businessMetrics.concurrentUsers.value || 0}`);
}