// test/k6/smoke/health-only-smoke.ts

import { check, sleep } from "k6";
import http from "k6/http";
import { getConfig, getPerformanceThresholds, getScenarioConfig } from "../utils/config.ts";

const config = getConfig();
const thresholds = getPerformanceThresholds();
const scenarios = getScenarioConfig();

export const options = {
  scenarios: {
    health_only_smoke: scenarios.smoke,
  },
  thresholds: thresholds.health.smoke,
};

export default function () {
  const baseUrl = config.baseUrl;

  // Test health endpoint only
  const healthResponse = http.get(`${baseUrl}/health`);
  check(healthResponse, {
    "health status is 200": (r) => r.status === 200,
    "health has status field": (r) => {
      const body = typeof r.body === "string" ? r.body : "";
      return body.includes('"status"');
    },
    "health has dependencies": (r) => {
      const body = typeof r.body === "string" ? r.body : "";
      return body.includes('"dependencies"');
    },
    "health has kong dependency": (r) => {
      const body = typeof r.body === "string" ? r.body : "";
      return body.includes('"kong"');
    },
    "health has telemetry dependency": (r) => {
      const body = typeof r.body === "string" ? r.body : "";
      return body.includes('"telemetry"') && body.includes('"traces"');
    },
    "health has telemetry info": (r) => {
      const body = typeof r.body === "string" ? r.body : "";
      return body.includes('"telemetry"');
    },
  });

  sleep(1);
}
