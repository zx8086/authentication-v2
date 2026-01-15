/* test/k6/soak/auth-service-soak.ts */

// K6 soak test for authentication service - extended duration testing
// Following K6 best practices for soak testing: sustained average load over extended periods

import { check, sleep } from "k6";
import http from "k6/http";
import {
  getConfig,
  getHeaders,
  getPerformanceThresholds,
  getScenarioConfig,
  getTestConsumer,
} from "../utils/config.ts";
import { setupTestConsumers } from "../utils/setup.js";

export function setup() {
  console.log("[K6 Soak Test] Running setup...");

  const success = setupTestConsumers();
  if (!success) {
    throw new Error("Failed to setup test consumers");
  }

  console.log("[K6 Soak Test] Setup completed successfully");
  return { setupComplete: true };
}

export const options = {
  scenarios: {
    auth_service_soak: getScenarioConfig().soak,
  },
  thresholds: getPerformanceThresholds().soak,
};

export default function () {
  const config = getConfig();
  const baseUrl = config.baseUrl;

  // 70% token generation (core authentication service functionality)
  if (Math.random() < 0.7) {
    const consumer = getTestConsumer(__VU % 5);
    const headers = getHeaders(consumer);

    const tokenResponse = http.get(`${baseUrl}/tokens`, {
      headers,
      tags: { endpoint: "tokens" },
    });

    check(tokenResponse, {
      "soak token status is 200": (r) => r.status === 200,
      "soak token response time < 50ms": (r) => r.timings.duration < 50,
      "soak token has access_token": (r) => {
        const body = typeof r.body === "string" ? r.body : "";
        return body.includes('"access_token"');
      },
      "soak token has proper structure": (r) => {
        const body = typeof r.body === "string" ? r.body : "";
        return body.includes('"token_type"') && body.includes('"expires_in"');
      },
    });

    // Realistic think time for token requests
    sleep(1 + Math.random() * 2); // 1-3 seconds
  }

  // 20% health monitoring (system stability)
  else if (Math.random() < 0.67) {
    // 20% of remaining 30%
    const healthResponse = http.get(`${baseUrl}/health`, {
      tags: { endpoint: "health" },
    });

    check(healthResponse, {
      "soak health status is 200": (r) => r.status === 200,
      "soak health response time < 300ms": (r) => r.timings.duration < 300,
      "soak health has status field": (r) => {
        const body = typeof r.body === "string" ? r.body : "";
        return body.includes('"status"');
      },
      "soak health has dependencies": (r) => {
        const body = typeof r.body === "string" ? r.body : "";
        return body.includes('"dependencies"');
      },
      "soak health kong status available": (r) => {
        const body = typeof r.body === "string" ? r.body : "";
        return body.includes('"kong"');
      },
    });

    sleep(0.5 + Math.random() * 1); // 0.5-1.5 seconds
  }

  // 10% observability endpoints (metrics, OpenAPI)
  else {
    if (Math.random() < 0.5) {
      // Metrics endpoint
      const metricsResponse = http.get(`${baseUrl}/metrics`, {
        tags: { endpoint: "metrics" },
      });

      check(metricsResponse, {
        "soak metrics status is 200": (r) => r.status === 200,
        "soak metrics response time < 100ms": (r) => r.timings.duration < 100,
        "soak metrics has data": (r) => {
          const body = typeof r.body === "string" ? r.body : "";
          return body.length > 100;
        },
      });
    } else {
      // OpenAPI specification
      const openApiResponse = http.get(`${baseUrl}/`, {
        headers: { Accept: "application/json" },
        tags: { endpoint: "openapi" },
      });

      check(openApiResponse, {
        "soak openapi status is 200": (r) => r.status === 200,
        "soak openapi response time < 200ms": (r) => r.timings.duration < 200,
        "soak openapi has spec": (r) => {
          const body = typeof r.body === "string" ? r.body : "";
          return body.includes("openapi") || body.includes("swagger");
        },
      });
    }

    sleep(2 + Math.random() * 2); // 2-4 seconds for observability checks
  }

  // Base think time between operations (realistic user behavior)
  sleep(0.5 + Math.random() * 1); // 0.5-1.5 seconds
}
