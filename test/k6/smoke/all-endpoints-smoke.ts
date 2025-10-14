/* test/k6/smoke/all-endpoints-smoke.ts */

// K6 smoke tests for ALL main endpoints

import http from "k6/http";
import { check, sleep } from "k6";
import {
  getConfig,
  getPerformanceThresholds,
  getScenarioConfig,
} from "../utils/config.ts";

const config = getConfig();
const thresholds = getPerformanceThresholds();
const scenarios = getScenarioConfig();

export const options = {
  scenarios: {
    all_endpoints_smoke: scenarios.smoke,
  },
  thresholds: thresholds.health.smoke,
};

export default function () {
  const baseUrl = config.baseUrl;

  // Test OpenAPI endpoint (served at root)
  const openapiResponse = http.get(`${baseUrl}/`);
  check(openapiResponse, {
    "GET / (OpenAPI) status is 200": (r) => r.status === 200,
    "GET / response time < 50ms": (r) => r.timings.duration < 50,
    "GET / contains OpenAPI spec": (r) => {
      const body = typeof r.body === "string" ? r.body : "";
      return body.includes('"openapi": "3.0.3"');
    },
  });

  sleep(0.3);

  // Test main health endpoint
  const healthResponse = http.get(`${baseUrl}/health`);
  check(healthResponse, {
    "GET /health status is 200": (r) => r.status === 200,
    "GET /health response time < 500ms": (r) => r.timings.duration < 500,
    "GET /health has status field": (r) => {
      const body = typeof r.body === "string" ? r.body : "";
      return body.includes('"status"');
    },
  });

  sleep(0.3);

  // Test telemetry health endpoint
  const telemetryHealthResponse = http.get(`${baseUrl}/health/telemetry`);
  check(telemetryHealthResponse, {
    "GET /health/telemetry status is 200": (r) => r.status === 200,
    "GET /health/telemetry response time < 50ms": (r) =>
      r.timings.duration < 50,
    "GET /health/telemetry has telemetry status": (r) => {
      const body = typeof r.body === "string" ? r.body : "";
      return body.includes('"telemetry"') && body.includes('"initialized"');
    },
  });

  sleep(0.3);

  // Test unified metrics endpoint (default operational view)
  const metricsResponse = http.get(`${baseUrl}/metrics`);
  check(metricsResponse, {
    "GET /metrics status is 200": (r) => r.status === 200,
    "GET /metrics response time < 50ms": (r) => r.timings.duration < 50,
    "GET /metrics has timestamp": (r) => {
      const body = typeof r.body === "string" ? r.body : "";
      return body.includes('"timestamp"');
    },
    "GET /metrics has operational data": (r) => {
      const body = typeof r.body === "string" ? r.body : "";
      return body.includes('"memory"') && body.includes('"uptime"');
    },
  });

  sleep(0.3);

  // Test metrics with infrastructure view
  const metricsInfraResponse = http.get(`${baseUrl}/metrics?view=infrastructure`);
  check(metricsInfraResponse, {
    "GET /metrics?view=infrastructure status is 200": (r) => r.status === 200,
    "GET /metrics?view=infrastructure response time < 50ms": (r) => r.timings.duration < 50,
    "GET /metrics?view=infrastructure has infrastructure data": (r) => {
      const body = typeof r.body === "string" ? r.body : "";
      return body.includes('"infrastructure"') && body.includes('"metrics"');
    },
  });

  sleep(0.3);

  // Test metrics with exports view
  const metricsExportsResponse = http.get(`${baseUrl}/metrics?view=exports`);
  check(metricsExportsResponse, {
    "GET /metrics?view=exports status is 200": (r) => r.status === 200,
    "GET /metrics?view=exports response time < 50ms": (r) => r.timings.duration < 50,
    "GET /metrics?view=exports has export data": (r) => {
      const body = typeof r.body === "string" ? r.body : "";
      return body.includes('"exports"') && body.includes('"configuration"');
    },
  });

  sleep(0.3);

  // Test debug metrics test endpoint (POST)
  const debugTestResponse = http.post(`${baseUrl}/debug/metrics/test`);
  check(debugTestResponse, {
    "POST /debug/metrics/test status is 200": (r) => r.status === 200,
    "POST /debug/metrics/test response time < 50ms": (r) =>
      r.timings.duration < 50,
    "POST /debug/metrics/test confirms test metrics": (r) => {
      const body = typeof r.body === "string" ? r.body : "";
      return body.includes('"success"');
    },
  });

  sleep(0.3);

  // Test debug metrics export endpoint (POST)
  const debugExportResponse = http.post(`${baseUrl}/debug/metrics/export`);
  check(debugExportResponse, {
    "POST /debug/metrics/export status is 200": (r) => r.status === 200,
    "POST /debug/metrics/export response time < 200ms": (r) =>
      r.timings.duration < 200,
    "POST /debug/metrics/export confirms export": (r) => {
      const body = typeof r.body === "string" ? r.body : "";
      return body.includes('"message"');
    },
  });

  sleep(1);
}
