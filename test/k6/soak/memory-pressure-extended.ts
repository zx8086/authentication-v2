/* test/k6/soak/memory-monitoring-soak.ts */

// K6 soak test for enhanced memory monitoring endpoints

import { check, sleep } from "k6";
import http from "k6/http";
import { getConfig } from "../utils/config.ts";

export const options = {
  scenarios: {
    memory_monitoring_soak: {
      executor: "ramping-vus",
      stages: [
        // Quick validation mode for CI/testing
        {
          duration: __ENV.K6_SOAK_WARMUP_DURATION || "2m",
          target: Number.parseInt(__ENV.K6_SOAK_WARMUP_VUS || "3", 10),
        },
        {
          duration: __ENV.K6_SOAK_RAMPUP_DURATION || "3m",
          target: Number.parseInt(__ENV.K6_SOAK_TARGET_VUS || "8", 10),
        },
        {
          duration: __ENV.K6_SOAK_PEAK_DURATION || "5m",
          target: Number.parseInt(__ENV.K6_SOAK_PEAK_VUS || "12", 10),
        },

        // Sustained load phase
        {
          duration: __ENV.K6_SOAK_SUSTAINED_DURATION || "10m",
          target: Number.parseInt(__ENV.K6_SOAK_PEAK_VUS || "12", 10),
        },

        // Memory pressure testing
        {
          duration: __ENV.K6_SOAK_PRESSURE_DURATION || "3m",
          target: Number.parseInt(__ENV.K6_SOAK_PRESSURE_VUS || "20", 10),
        },
        {
          duration: __ENV.K6_SOAK_PRESSURE_HOLD_DURATION || "5m",
          target: Number.parseInt(__ENV.K6_SOAK_PRESSURE_VUS || "20", 10),
        },

        // Recovery phase
        {
          duration: __ENV.K6_SOAK_RECOVERY_DURATION || "2m",
          target: Number.parseInt(__ENV.K6_SOAK_TARGET_VUS || "8", 10),
        },
        {
          duration: __ENV.K6_SOAK_STABILIZE_DURATION || "3m",
          target: Number.parseInt(__ENV.K6_SOAK_TARGET_VUS || "8", 10),
        },

        // Final ramp down
        { duration: __ENV.K6_SOAK_RAMPDOWN_DURATION || "2m", target: 0 },
      ],
      gracefulRampDown: "30s",
    },
  },
  thresholds: {
    // Core application endpoint thresholds during sustained load
    "http_req_duration{endpoint:health}": ["p(95)<500", "p(99)<1000"],
    "http_req_duration{endpoint:metrics}": ["p(95)<800", "p(99)<1500"],
    "http_req_duration{endpoint:openapi}": ["p(95)<200", "p(99)<500"],
    "http_req_duration{endpoint:telemetry_health}": ["p(95)<300", "p(99)<600"],

    // Overall application health during memory pressure testing
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<1000", "p(99)<2000"],
  },
};

export default function () {
  const config = getConfig();
  const baseUrl = config.baseUrl;

  // 60% health endpoint testing (main application endpoint)
  if (Math.random() < 0.6) {
    const healthResponse = http.get(`${baseUrl}/health`, {
      tags: { endpoint: "health" },
    });
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

    sleep(0.5 + Math.random() * 0.5); // 0.5-1s think time
  }

  // 25% metrics endpoint testing (application metrics)
  else if (Math.random() < 0.71) {
    // 25% of remaining 40%
    const metricsResponse = http.get(`${baseUrl}/metrics`, {
      tags: { endpoint: "metrics" },
    });
    check(metricsResponse, {
      "metrics status is 200": (r) => r.status === 200,
      "metrics response time < 800ms": (r) => r.timings.duration < 800,
      "metrics has data": (r) => {
        const body = typeof r.body === "string" ? r.body : "";
        return body.length > 0;
      },
    });

    sleep(1 + Math.random() * 1); // 1-2s think time
  }

  // 10% OpenAPI spec testing
  else if (Math.random() < 0.67) {
    // 10% of remaining 30%
    const openApiResponse = http.get(`${baseUrl}/`, {
      headers: { Accept: "application/json" },
      tags: { endpoint: "openapi" },
    });
    check(openApiResponse, {
      "openapi status is 200": (r) => r.status === 200,
      "openapi response time < 200ms": (r) => r.timings.duration < 200,
      "openapi has spec": (r) => {
        const body = typeof r.body === "string" ? r.body : "";
        return body.includes("openapi") || body.includes("swagger");
      },
    });

    sleep(2 + Math.random() * 1); // 2-3s think time for spec loading
  }

  // 5% telemetry health testing
  else {
    const telemetryHealthResponse = http.get(`${baseUrl}/health/telemetry`, {
      tags: { endpoint: "telemetry_health" },
    });
    check(telemetryHealthResponse, {
      "telemetry health status is 200": (r) => r.status === 200,
      "telemetry health response time < 300ms": (r) => r.timings.duration < 300,
    });

    sleep(0.3 + Math.random() * 0.4); // 0.3-0.7s think time
  }

  // Base think time between operations
  sleep(0.8 + Math.random() * 0.4); // 0.8-1.2s
}
