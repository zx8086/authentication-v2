// test/playwright/profiling.e2e.ts

import { expect, test } from "@playwright/test";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";

test.describe("Profiling Endpoints E2E", () => {
  test.beforeEach(async ({ request }) => {
    // Set longer timeout for profiling operations
    test.setTimeout(30000);

    try {
      // Always cleanup profiling sessions before each test to ensure clean state
      await request.post(`${API_BASE_URL}/debug/profiling/cleanup`);
    } catch (error) {
      // Don't fail tests if cleanup fails (server might be down)
      console.warn("Pre-test profiling cleanup failed:", error);
    }
  });

  test.afterEach(async ({ request }) => {
    try {
      // Always cleanup profiling sessions after each test to ensure test isolation
      await request.post(`${API_BASE_URL}/debug/profiling/cleanup`);
    } catch (error) {
      // Don't fail tests if cleanup fails (server might be down)
      console.warn("Profiling cleanup failed:", error);
    }
  });

  test("should handle profiling status endpoint", async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/debug/profiling/status`);

    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("application/json");

    const data = await response.json();
    expect(data).toHaveProperty("enabled");
    expect(data).toHaveProperty("sessions");

    // Validate data types
    expect(typeof data.enabled).toBe("boolean");
    expect(Array.isArray(data.sessions)).toBe(true);

    // When disabled, sessions should be empty
    if (data.enabled === false) {
      expect(data.sessions).toHaveLength(0);
    }
  });

  test("should handle profiling reports endpoint", async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/debug/profiling/reports`);

    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("application/json");

    const data = await response.json();
    expect(data).toHaveProperty("reports");
    expect(data).toHaveProperty("total");

    // Validate structure
    expect(Array.isArray(data.reports)).toBe(true);
    expect(typeof data.total).toBe("number");
    expect(data.total).toBeGreaterThanOrEqual(0);
    expect(data.reports.length).toBe(data.total);

    // When disabled, reports should be empty
    if (data.enabled === false) {
      expect(data.reports).toHaveLength(0);
      expect(data.total).toBe(0);
    }
  });

  test("should handle profiling start endpoint", async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/debug/profiling/start`, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("application/json");

    const data = await response.json();
    expect(data).toHaveProperty("message");
    expect(typeof data.message).toBe("string");

    if (data.enabled !== false) {
      // Profiling is enabled - should get a session or error
      if (data.sessionId) {
        expect(typeof data.sessionId).toBe("string");
        expect(data.sessionId).toMatch(/^profile-\d+-[a-z0-9]+$/);
        expect(data).toHaveProperty("type");
        expect(data.type).toBe("cpu");

        // Stop the session to prevent interference with other tests
        await request.post(`${API_BASE_URL}/debug/profiling/stop`);
      }
    } else {
      // Profiling is disabled - should get graceful response
      expect(data.enabled).toBe(false);
      expect(data.sessionId).toBeNull();
    }
  });

  test("should handle profiling stop endpoint", async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/debug/profiling/stop`, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("application/json");

    const data = await response.json();
    expect(data).toHaveProperty("message");
    expect(typeof data.message).toBe("string");

    if (data.enabled !== false) {
      // Profiling is enabled - should have sessionId
      expect(data).toHaveProperty("sessionId");
    } else {
      // Profiling is disabled - should get graceful response
      expect(data.enabled).toBe(false);
      expect(data.sessionId).toBeNull();
    }
  });

  test("should handle profiling cleanup endpoint", async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/debug/profiling/cleanup`, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("application/json");

    const data = await response.json();
    expect(data).toHaveProperty("message");
    expect(typeof data.message).toBe("string");

    expect(data).toHaveProperty("cleaned");
    expect(Array.isArray(data.cleaned)).toBe(true);

    if (data.enabled === false) {
      // When disabled, cleaned array should be empty
      expect(data.cleaned).toHaveLength(0);
    }

    expect(data.message).toMatch(/cleanup|clean|artifacts|profiling|configuration/i);
  });

  test("should handle complete profiling workflow", async ({ request }) => {
    // Check profiling status first
    const statusCheck = await request.get(`${API_BASE_URL}/debug/profiling/status`);
    expect(statusCheck.status()).toBe(200);
    const statusCheckData = await statusCheck.json();
    const profilingEnabled = statusCheckData.enabled;

    let sessionId: string | null = null;

    // 1. Start profiling
    const startResponse = await request.post(`${API_BASE_URL}/debug/profiling/start`);
    expect(startResponse.status()).toBe(200);

    const startData = await startResponse.json();
    sessionId = startData.sessionId;

    if (profilingEnabled && sessionId) {
      expect(sessionId).toBeTruthy();
      expect(sessionId).toMatch(/^profile-\d+-[a-z0-9]+$/);
    } else if (!profilingEnabled) {
      expect(sessionId).toBeNull();
    }

    // 2. Check status shows active session
    const statusResponse = await request.get(`${API_BASE_URL}/debug/profiling/status`);
    expect(statusResponse.status()).toBe(200);

    const statusData = await statusResponse.json();
    if (sessionId && statusData.enabled) {
      const activeSession = statusData.sessions.find((s: any) => s.id === sessionId);
      if (activeSession) {
        expect(activeSession.status).toBe("running");
        expect(activeSession.type).toBe("cpu");
      }
    }

    // 3. Wait briefly for profiling data
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 4. Stop profiling
    if (sessionId && profilingEnabled) {
      const stopResponse = await request.post(`${API_BASE_URL}/debug/profiling/stop`);
      expect(stopResponse.status()).toBe(200);
    }

    // 5. Check that session is now stopped
    const finalStatusResponse = await request.get(`${API_BASE_URL}/debug/profiling/status`);
    const finalStatusData = await finalStatusResponse.json();

    if (sessionId && finalStatusData.enabled) {
      const stoppedSession = finalStatusData.sessions.find((s: any) => s.id === sessionId);
      if (stoppedSession) {
        expect(["stopped", "completed", "running"]).toContain(stoppedSession.status);
      }
    }

    // 6. Check reports (may have been generated)
    const reportsResponse = await request.get(`${API_BASE_URL}/debug/profiling/reports`);
    expect(reportsResponse.status()).toBe(200);

    const reportsData = await reportsResponse.json();
    expect(reportsData).toHaveProperty("reports");
    expect(reportsData).toHaveProperty("total");
    expect(reportsData.total).toBeGreaterThanOrEqual(0);

    // 7. Cleanup
    const cleanupResponse = await request.post(`${API_BASE_URL}/debug/profiling/cleanup`);
    expect(cleanupResponse.status()).toBe(200);

    const cleanupData = await cleanupResponse.json();
    expect(cleanupData).toHaveProperty("cleaned");
    expect(Array.isArray(cleanupData.cleaned)).toBe(true);

    // 8. Verify cleanup - sessions should be cleared
    const postCleanupResponse = await request.get(`${API_BASE_URL}/debug/profiling/status`);
    const postCleanupData = await postCleanupResponse.json();

    if (profilingEnabled && postCleanupData.enabled) {
      expect(postCleanupData.sessions).toHaveLength(0);
    }
  });

  test("should validate response schemas match actual API", async ({ request }) => {
    // Test that responses match the actual API implementation

    // Status endpoint validation
    const statusResponse = await request.get(`${API_BASE_URL}/debug/profiling/status`);
    if (statusResponse.status() === 200) {
      const statusData = await statusResponse.json();

      // Required fields from actual implementation
      expect(statusData).toHaveProperty("enabled");
      expect(statusData).toHaveProperty("sessions");

      // Session schema validation if sessions exist
      statusData.sessions.forEach((session: any) => {
        expect(session).toHaveProperty("id");
        expect(session).toHaveProperty("type");
        expect(session).toHaveProperty("startTime");
        expect(session).toHaveProperty("status");

        // Enum validations
        expect(["cpu", "heap"]).toContain(session.type);
        expect(["running", "stopped", "completed", "failed"]).toContain(session.status);

        // Date format validation
        expect(new Date(session.startTime).getTime()).not.toBeNaN();
        if (session.endTime) {
          expect(new Date(session.endTime).getTime()).not.toBeNaN();
        }
      });
    }

    // Reports endpoint validation
    const reportsResponse = await request.get(`${API_BASE_URL}/debug/profiling/reports`);
    if (reportsResponse.status() === 200) {
      const reportsData = await reportsResponse.json();

      // Required fields from actual implementation
      expect(reportsData).toHaveProperty("reports");
      expect(reportsData).toHaveProperty("total");

      // Type validations
      expect(Array.isArray(reportsData.reports)).toBe(true);
      expect(typeof reportsData.total).toBe("number");
      expect(reportsData.total).toBeGreaterThanOrEqual(0);
    }

    // Start endpoint validation
    const startResponse = await request.post(`${API_BASE_URL}/debug/profiling/start`);
    expect(startResponse.status()).toBe(200);

    const startData = await startResponse.json();

    // Required fields from actual implementation
    expect(startData).toHaveProperty("message");
    expect(typeof startData.message).toBe("string");

    if (startData.enabled !== false) {
      // Profiling enabled - should have sessionId and type when successful
      if (startData.sessionId) {
        expect(typeof startData.sessionId).toBe("string");
        expect(startData.sessionId).toMatch(/^profile-\d+-[a-z0-9]+$/);
        expect(startData).toHaveProperty("type");
        expect(startData.type).toBe("cpu");
      }
    } else {
      // Profiling disabled - should have enabled=false and sessionId=null
      expect(startData.enabled).toBe(false);
      expect(startData.sessionId).toBeNull();
    }
  });

  test("should handle error cases properly", async ({ request }) => {
    // Test behavior - all profiling endpoints should always return 200 with proper JSON

    const endpoints = [
      {
        method: "GET",
        path: "/debug/profiling/status",
        expectedProps: ["enabled", "sessions"],
      },
      {
        method: "GET",
        path: "/debug/profiling/reports",
        expectedProps: ["reports", "total"],
      },
      {
        method: "POST",
        path: "/debug/profiling/start",
        expectedProps: ["message"],
      },
      {
        method: "POST",
        path: "/debug/profiling/stop",
        expectedProps: ["message"],
      },
      {
        method: "POST",
        path: "/debug/profiling/cleanup",
        expectedProps: ["message", "cleaned"],
      },
    ];

    for (const endpoint of endpoints) {
      const response =
        endpoint.method === "GET"
          ? await request.get(`${API_BASE_URL}${endpoint.path}`)
          : await request.post(`${API_BASE_URL}${endpoint.path}`);

      // Should always return 200 with graceful handling
      expect(response.status()).toBe(200);

      // All responses should be JSON
      expect(response.headers()["content-type"]).toContain("application/json");

      const data = await response.json();

      // Check that response has expected properties for this endpoint
      for (const prop of endpoint.expectedProps) {
        expect(data).toHaveProperty(prop);
      }
    }
  });
});
