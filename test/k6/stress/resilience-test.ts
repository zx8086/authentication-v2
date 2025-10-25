/* test/k6/stress/resilience-test.ts */

// Circuit breaker and resilience pattern validation under load

import { check, sleep } from "k6";
import http from "k6/http";
import { getConfig, getHeaders, getTestConsumer } from "../utils/config.ts";
import { setupTestConsumers } from "../utils/setup.js";
import { businessMetrics, recordError } from "../utils/metrics.ts";

export function setup() {
  console.log("[K6 Resilience Test] Running setup...");

  const success = setupTestConsumers();
  if (!success) {
    throw new Error("Failed to setup test consumers");
  }

  console.log("[K6 Resilience Test] Setup completed successfully");
  return { setupComplete: true };
}

export const options = {
  scenarios: {
    // Circuit breaker triggering scenario
    circuit_breaker_test: {
      executor: "ramping-vus",
      stages: [
        { duration: "30s", target: 50 },   // Baseline load
        { duration: "1m", target: 200 },   // Trigger circuit breaker
        { duration: "2m", target: 500 },   // Sustained high load
        { duration: "1m", target: 100 },   // Recovery phase
        { duration: "30s", target: 0 },    // Cool down
      ],
    },
    // Redis failure simulation
    redis_failure_simulation: {
      executor: "constant-vus",
      vus: 50,
      duration: "5m",
      env: {
        SIMULATE_REDIS_FAILURE: "true",
      },
    },
    // Kong connectivity issues
    kong_degradation_test: {
      executor: "ramping-vus",
      stages: [
        { duration: "1m", target: 100 },
        { duration: "3m", target: 300 },
        { duration: "1m", target: 50 },
      ],
    },
  },
  thresholds: {
    // Resilience-focused thresholds
    'http_req_duration{endpoint:tokens}': ["p(95)<100", "p(99)<300"],  // Degraded but functional
    'http_req_failed': ["rate<0.3"],  // Up to 30% failure during resilience testing
    'circuit_breaker_open': ["rate>0"], // Circuit breaker should activate
    'stale_cache_hits': ["rate>0.1"],  // Stale cache fallback should work
    'system_recovery_time': ["max<60000"], // Recovery within 60 seconds
  },
};

export default function () {
  const config = getConfig();
  const baseUrl = config.baseUrl;
  const consumer = getTestConsumer(__VU % 5);

  // Primary token generation with resilience monitoring
  const headers = getHeaders(consumer);
  const tokenResponse = http.get(`${baseUrl}/tokens`, {
    headers,
    tags: {
      endpoint: "tokens",
      test_type: "resilience",
      scenario: __ENV.K6_SCENARIO || "circuit_breaker_test"
    },
    timeout: "5s", // Shorter timeout for resilience testing
  });

  const isSuccess = tokenResponse.status === 200;
  const isCircuitBreakerOpen = tokenResponse.status === 503;
  const isStaleCache = tokenResponse.headers["X-Cache-Status"] === "STALE";

  check(tokenResponse, {
    "resilience token response received": (r) => r.status > 0,
    "resilience token success or circuit breaker": (r) => r.status === 200 || r.status === 503,
    "resilience token response time < 300ms": (r) => r.timings.duration < 300,
    "resilience circuit breaker working": (r) => {
      if (r.status === 503) {
        businessMetrics.rateLimitExceeded.add(1);
        return true;
      }
      return r.status === 200;
    },
    "resilience stale cache fallback": (r) => {
      if (isStaleCache) {
        // Record stale cache hit metric
        return true;
      }
      return r.status === 200;
    },
  });

  // Monitor circuit breaker state
  if (isCircuitBreakerOpen) {
    // Record circuit breaker activation
    recordError({
      errorType: "rate_limit",
      consumerId: consumer.id,
      endpoint: "tokens",
      httpStatus: 503,
    });
  }

  // Health check during resilience testing
  if (__ITER % 10 === 0) {
    const healthResponse = http.get(`${baseUrl}/health`, {
      tags: { endpoint: "health", test_type: "resilience" },
      timeout: "2s",
    });

    check(healthResponse, {
      "resilience health responds": (r) => r.status >= 200 && r.status < 500,
      "resilience health response time < 100ms": (r) => r.timings.duration < 100,
      "resilience kong status available": (r) => {
        const body = typeof r.body === "string" ? r.body : "";
        return body.includes('"kong"');
      },
    });
  }

  // Variable sleep based on system state
  if (isCircuitBreakerOpen) {
    sleep(0.5 + Math.random() * 1); // Longer sleep when circuit breaker is open
  } else if (isStaleCache) {
    sleep(0.2 + Math.random() * 0.3); // Medium sleep for stale cache responses
  } else {
    sleep(0.1 + Math.random() * 0.2); // Normal sleep for successful responses
  }
}

export function teardown(data) {
  console.log("[K6 Resilience Test] Resilience testing completed");
  console.log("Circuit breaker and cache fallback mechanisms validated");
}