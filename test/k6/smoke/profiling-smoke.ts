// test/k6/smoke/profiling-smoke.ts

import { check, sleep } from "k6";
import http from "k6/http";
import { getConfig, getPerformanceThresholds, getScenarioConfig } from "../utils/config.ts";

const config = getConfig();
const thresholds = getPerformanceThresholds();
const scenarios = getScenarioConfig();

export const options = {
  scenarios: {
    profiling_smoke: scenarios.smoke,
  },
  thresholds: {
    ...thresholds.health.smoke,
    // Custom thresholds for profiling endpoints
    "http_req_duration{endpoint:profiling}": ["p(95)<200"],
    "http_req_failed{endpoint:profiling}": ["rate<0.1"],
  },
};

export default function () {
  const baseUrl = config.baseUrl;

  // Test profiling status endpoint
  const statusResponse = http.get(`${baseUrl}/debug/profiling/status`, {
    tags: { endpoint: "profiling" },
  });

  const isProfilingEnabled = statusResponse.status === 200;

  check(statusResponse, {
    "GET /debug/profiling/status responds appropriately": (r) =>
      r.status === 200 || r.status === 404,
    "GET /debug/profiling/status response time < 100ms": (r) => r.timings.duration < 100,
    "GET /debug/profiling/status valid response when enabled": (r) => {
      if (r.status === 200) {
        const body = typeof r.body === "string" ? r.body : "";
        return (
          body.includes('"enabled"') &&
          body.includes('"sessions"') &&
          body.includes('"environment"')
        );
      }
      return true; // 404 is acceptable when disabled
    },
  });

  if (!isProfilingEnabled) {
    console.log("Profiling is disabled - testing 404 responses");

    // When profiling is disabled, all endpoints should return 404
    const endpoints = [
      "/debug/profiling/reports",
      "/debug/profiling/start",
      "/debug/profiling/stop",
      "/debug/profiling/cleanup",
    ];

    endpoints.forEach((endpoint) => {
      const method =
        endpoint.includes("start") || endpoint.includes("stop") || endpoint.includes("cleanup")
          ? "POST"
          : "GET";
      const response =
        method === "POST"
          ? http.post(`${baseUrl}${endpoint}`, null, { tags: { endpoint: "profiling" } })
          : http.get(`${baseUrl}${endpoint}`, { tags: { endpoint: "profiling" } });

      check(response, {
        [`${method} ${endpoint} returns 404 when disabled`]: (r) => r.status === 404,
      });
    });

    return;
  }

  console.log("Profiling is enabled - testing functionality");

  sleep(0.3);

  // Test profiling reports endpoint
  const reportsResponse = http.get(`${baseUrl}/debug/profiling/reports`, {
    tags: { endpoint: "profiling" },
  });

  check(reportsResponse, {
    "GET /debug/profiling/reports status is 200": (r) => r.status === 200,
    "GET /debug/profiling/reports response time < 100ms": (r) => r.timings.duration < 100,
    "GET /debug/profiling/reports has valid structure": (r) => {
      const body = typeof r.body === "string" ? r.body : "";
      return body.includes('"reports"') && body.includes('"total"');
    },
  });

  sleep(0.3);

  // Check if a session is already running (external profiling script may have started one)
  let sessionId: string | null = null;
  let externalSessionExists = false;
  let statusData: any = null;

  // Parse status data from the previous status check
  if (statusResponse.status === 200) {
    try {
      statusData = JSON.parse(statusResponse.body as string);
    } catch (_e) {
      console.log("Failed to parse status response JSON");
    }
  }

  if (statusData?.enabled && statusData.sessions && statusData.sessions.length > 0) {
    // External session exists, use it instead of starting a new one
    externalSessionExists = true;
    sessionId = statusData.sessions[0].id;
    console.log(`Using existing external profiling session: ${sessionId}`);
  } else {
    // No external session, test profiling start endpoint
    const startResponse = http.post(`${baseUrl}/debug/profiling/start`, null, {
      headers: { "Content-Type": "application/json" },
      tags: { endpoint: "profiling" },
    });

    check(startResponse, {
      "POST /debug/profiling/start responds appropriately": (r) =>
        r.status === 200 || r.status === 400,
      "POST /debug/profiling/start response time < 200ms": (r) => r.timings.duration < 200,
      "POST /debug/profiling/start has valid response": (r) => {
        const body = typeof r.body === "string" ? r.body : "";
        return body.includes('"message"') && (body.includes('"sessionId"') || r.status === 400);
      },
    });

    // Extract session ID if profiling started successfully
    if (startResponse.status === 200) {
      try {
        const startData = JSON.parse(startResponse.body as string);
        if (startData.sessionId) {
          sessionId = startData.sessionId;

          check(sessionId, {
            "Session ID has valid format": (id) => /^profile-\d+-[a-z0-9]+$/.test(id || ""),
          });
        }
      } catch (_e) {
        console.log("Failed to parse start response JSON");
      }
    }
  }

  sleep(0.5); // Brief profiling period

  // Test profiling status with active session
  if (sessionId) {
    const activeStatusResponse = http.get(`${baseUrl}/debug/profiling/status`, {
      tags: { endpoint: "profiling" },
    });

    check(activeStatusResponse, {
      "GET /debug/profiling/status shows active session": (r) => {
        if (r.status === 200) {
          const body = typeof r.body === "string" ? r.body : "";
          return body.includes(sessionId || "");
        }
        return false;
      },
    });
  }

  sleep(0.3);

  // Test profiling stop endpoint (only if we started the session internally)
  if (!externalSessionExists && sessionId) {
    const stopResponse = http.post(`${baseUrl}/debug/profiling/stop`, null, {
      headers: { "Content-Type": "application/json" },
      tags: { endpoint: "profiling" },
    });

    check(stopResponse, {
      "POST /debug/profiling/stop responds appropriately": (r) =>
        r.status === 200 || r.status === 400,
      "POST /debug/profiling/stop response time < 200ms": (r) => r.timings.duration < 200,
      "POST /debug/profiling/stop has valid response": (r) => {
        const body = typeof r.body === "string" ? r.body : "";
        return body.includes('"message"') && (body.includes('"sessionId"') || r.status === 400);
      },
    });
  } else if (externalSessionExists) {
    console.log("Skipping stop test - using external profiling session managed by script");
  }

  sleep(0.3);

  // Test profiling cleanup endpoint (only if we started the session internally)
  if (!externalSessionExists) {
    const cleanupResponse = http.post(`${baseUrl}/debug/profiling/cleanup`, null, {
      headers: { "Content-Type": "application/json" },
      tags: { endpoint: "profiling" },
    });

    check(cleanupResponse, {
      "POST /debug/profiling/cleanup responds appropriately": (r) =>
        r.status === 200 || r.status === 400,
      "POST /debug/profiling/cleanup response time < 200ms": (r) => r.timings.duration < 200,
      "POST /debug/profiling/cleanup has valid response": (r) => {
        const body = typeof r.body === "string" ? r.body : "";
        return body.includes('"message"') && (body.includes('"cleaned"') || r.status === 400);
      },
      "POST /debug/profiling/cleanup message mentions cleanup": (r) => {
        const body = typeof r.body === "string" ? r.body : "";
        return /cleanup|clean|artifacts|profiling/i.test(body);
      },
    });

    sleep(0.3);

    // Verify cleanup worked - check status again
    const finalStatusResponse = http.get(`${baseUrl}/debug/profiling/status`, {
      tags: { endpoint: "profiling" },
    });

    check(finalStatusResponse, {
      "GET /debug/profiling/status after cleanup": (r) => {
        if (r.status === 200) {
          try {
            const data = JSON.parse(r.body as string);
            // Sessions should be empty after cleanup
            return Array.isArray(data.sessions) && data.sessions.length === 0;
          } catch (_e) {
            return false;
          }
        }
        return false;
      },
    });
  } else {
    console.log("Skipping cleanup test - using external profiling session managed by script");
  }

  sleep(0.5);
}
