/* test/k6/kong-gateway/kong-tokens-test.ts */

import { check } from "k6";
import http from "k6/http";

// Simple configuration for Kong Gateway testing
const config = {
  host: __ENV.TARGET_HOST || "localhost",
  port: Number.parseInt(__ENV.TARGET_PORT || "8000", 10),
  protocol: __ENV.TARGET_PROTOCOL || "http",
};
const baseUrl = `${config.protocol}://${config.host}:${config.port}`;
export const options = {
  scenarios: {
    kong_gateway_smoke: {
      executor: "constant-vus",
      vus: 1,
      duration: "10s",
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<1000", "p(99)<2000"],
    http_req_failed: ["rate<0.1"],
    checks: ["rate>0.9"],
  },
};

// API keys for our Kong Gateway simulation
const API_KEYS = {
  "test-consumer-001": "test-api-key-consumer-001",
  "test-consumer-002": "test-api-key-consumer-002",
  "test-consumer-003": "test-api-key-consumer-003",
  "test-consumer-004": "test-api-key-consumer-004",
  "test-consumer-005": "test-api-key-consumer-005",
  anonymous: "test-api-key-anonymous",
};

export default function () {
  console.log(`[Kong Gateway Test] Testing against: ${baseUrl}`);

  // Test 1: Valid API key for consumer 001
  testValidApiKey(baseUrl, "test-consumer-001", API_KEYS["test-consumer-001"]);

  // Test 2: Valid API key for consumer 004
  testValidApiKey(baseUrl, "test-consumer-004", API_KEYS["test-consumer-004"]);

  // Test 3: Invalid API key
  testInvalidApiKey(baseUrl);

  // Test 4: Missing API key
  testMissingApiKey(baseUrl);
}

function testValidApiKey(baseUrl: string, consumerName: string, apiKey: string) {
  const response = http.get(`${baseUrl}/tokens`, {
    headers: {
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
    },
    timeout: "30s",
  });

  check(response, {
    [`[${consumerName}] status is 200`]: (r) => r.status === 200,
    [`[${consumerName}] response time < 500ms`]: (r) => r.timings.duration < 500,
    [`[${consumerName}] has access_token`]: (r) => {
      try {
        const json = JSON.parse(r.body as string);
        return json.access_token !== undefined;
      } catch {
        return false;
      }
    },
    [`[${consumerName}] has expires_in`]: (r) => {
      try {
        const json = JSON.parse(r.body as string);
        return json.expires_in !== undefined;
      } catch {
        return false;
      }
    },
  });

  if (response.status === 200) {
    console.log(`✅ [${consumerName}] JWT token generated successfully`);
  } else {
    console.log(`❌ [${consumerName}] Failed: ${response.status} - ${response.body}`);
  }
}

function testInvalidApiKey(baseUrl: string) {
  const response = http.get(`${baseUrl}/tokens`, {
    headers: {
      "X-API-Key": "invalid-api-key-12345",
      "Content-Type": "application/json",
    },
    timeout: "30s",
  });

  check(response, {
    "[Invalid API Key] status is 401": (r) => r.status === 401,
    "[Invalid API Key] response time < 100ms": (r) => r.timings.duration < 100,
    "[Invalid API Key] has error message": (r) => {
      try {
        const json = JSON.parse(r.body as string);
        return json.message !== undefined;
      } catch {
        return false;
      }
    },
  });
}

function testMissingApiKey(baseUrl: string) {
  const response = http.get(`${baseUrl}/tokens`, {
    headers: {
      "Content-Type": "application/json",
    },
    timeout: "30s",
  });

  check(response, {
    "[Missing API Key] status is 401": (r) => r.status === 401,
    "[Missing API Key] response time < 100ms": (r) => r.timings.duration < 100,
    "[Missing API Key] has error message": (r) => {
      try {
        const json = JSON.parse(r.body as string);
        return json.message !== undefined;
      } catch {
        return false;
      }
    },
  });
}
