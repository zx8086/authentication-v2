/* test/k6/smoke/ci-safe-smoke.ts */

// CI-safe smoke test that only runs gateway-independent tests
// Perfect for environments without Kong Gateway setup

import { check, sleep } from "k6";
import http from "k6/http";
import { getConfig, getPerformanceThresholds, getScenarioConfig } from "../utils/config.ts";
import { detectEnvironment, logEnvironmentInfo } from "../utils/environment.ts";

const config = getConfig();
const thresholds = getPerformanceThresholds();
const scenarios = getScenarioConfig();

export const options = {
  scenarios: {
    ci_safe_smoke: {
      executor: "constant-vus",
      vus: 2,
      duration: "30s", // Shorter for CI
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<1000", "p(99)<2000"],
    http_req_failed: ["rate<0.1"],
    checks: ["rate>0.95"],
  },
};

export function setup() {
  console.log("[K6 CI-Safe Smoke Test] Starting...");
  logEnvironmentInfo();
  return { setupComplete: true };
}

export default function () {
  const env = detectEnvironment();
  const baseUrl = env.baseUrl;

  // Test 1: Health endpoint (no Kong needed)
  const healthResponse = http.get(`${baseUrl}/health`);
  check(healthResponse, {
    "health status is 200": (r) => r.status === 200,
    "health response time < 500ms": (r) => r.timings.duration < 500,
    "health has status field": (r) => {
      const body = typeof r.body === "string" ? r.body : "";
      return body.includes('"status"');
    },
    "health has dependencies": (r) => {
      const body = typeof r.body === "string" ? r.body : "";
      return body.includes('"dependencies"');
    },
  });

  sleep(0.5);

  // Test 2: OpenAPI endpoint (no Kong needed) - root path
  const openApiResponse = http.get(`${baseUrl}/`);
  check(openApiResponse, {
    "openapi status is 200": (r) => r.status === 200,
    "openapi response time < 300ms": (r) => r.timings.duration < 300,
    "openapi has openapi field": (r) => {
      const body = typeof r.body === "string" ? r.body : "";
      return body.includes('"openapi"');
    },
    "openapi has paths": (r) => {
      const body = typeof r.body === "string" ? r.body : "";
      return body.includes('"paths"');
    },
  });

  sleep(0.5);

  // Test 3: Metrics endpoint (no Kong needed)
  const metricsResponse = http.get(`${baseUrl}/metrics`);
  check(metricsResponse, {
    "metrics status is 200": (r) => r.status === 200,
    "metrics response time < 200ms": (r) => r.timings.duration < 200,
    "metrics has timestamp": (r) => {
      const body = typeof r.body === "string" ? r.body : "";
      return body.includes('"timestamp"');
    },
    "metrics has uptime": (r) => {
      const body = typeof r.body === "string" ? r.body : "";
      return body.includes('"uptime"');
    },
  });

  sleep(1);

  console.log(`[CI-Safe Test] All gateway-independent endpoints tested successfully`);
}