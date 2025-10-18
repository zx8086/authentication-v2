/* test/bun/profiling.test.ts */

import { describe, it, test, expect, beforeAll, afterAll } from "bun:test";
import { profilingService } from "../../src/services/profiling.service";

const TEST_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";

describe("Profiling Endpoints", () => {
  beforeAll(async () => {
    console.log("Starting profiling endpoint tests...");
  });

  afterAll(async () => {
    console.log("Profiling endpoint tests completed");
  });

  describe("GET /debug/profiling/status", () => {
    test.concurrent("should return profiling service status", async () => {
      const response = await fetch(`${TEST_BASE_URL}/debug/profiling/status`);

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("application/json");

      const data = await response.json();
      expect(data).toHaveProperty("enabled");
      expect(data).toHaveProperty("sessions");
      expect(Array.isArray(data.sessions)).toBe(true);
      expect(typeof data.enabled).toBe("boolean");
    });

    test.concurrent("should have proper response structure", async () => {
      const response = await fetch(`${TEST_BASE_URL}/debug/profiling/status`);

      expect(response.status).toBe(200);
      const data = await response.json();

      if (data.enabled) {
        // Check session structure if any exist
        if (data.sessions.length > 0) {
          const session = data.sessions[0];
          expect(session).toHaveProperty("id");
          expect(session).toHaveProperty("type");
          expect(session).toHaveProperty("startTime");
          expect(session).toHaveProperty("status");
          expect(["cpu", "heap"]).toContain(session.type);
          expect(["running", "stopped", "completed", "failed"]).toContain(session.status);
        }
      } else {
        // When disabled, sessions should be empty
        expect(data.sessions).toHaveLength(0);
      }
    });
  });

  describe("GET /debug/profiling/reports", () => {
    it("should return profiling reports list", async () => {
      const response = await fetch(`${TEST_BASE_URL}/debug/profiling/reports`);

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("application/json");

      const data = await response.json();
      expect(data).toHaveProperty("reports");
      expect(data).toHaveProperty("total");
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

    it("should have valid response structure", async () => {
      const response = await fetch(`${TEST_BASE_URL}/debug/profiling/reports`);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty("reports");
      expect(data).toHaveProperty("total");
      expect(data.total).toBeGreaterThanOrEqual(0);
    });
  });

  describe("POST /debug/profiling/start", () => {
    it("should handle profiling start request", async () => {
      const response = await fetch(`${TEST_BASE_URL}/debug/profiling/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("application/json");

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
        }
      } else {
        // Profiling is disabled - should get graceful response
        expect(data.enabled).toBe(false);
        expect(data.sessionId).toBeNull();
      }
    });

    it("should handle dynamic profiling state", async () => {
      const response = await fetch(`${TEST_BASE_URL}/debug/profiling/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty("message");
      expect(typeof data.message).toBe("string");

      // The response should always be valid regardless of profiling state
      expect(data.message.toLowerCase()).toContain("profiling");
    });
  });

  describe("POST /debug/profiling/stop", () => {
    it("should handle profiling stop request", async () => {
      const response = await fetch(`${TEST_BASE_URL}/debug/profiling/stop`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("application/json");

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
  });

  describe("POST /debug/profiling/cleanup", () => {
    it("should handle profiling cleanup request", async () => {
      const response = await fetch(`${TEST_BASE_URL}/debug/profiling/cleanup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("application/json");

      const data = await response.json();
      expect(data).toHaveProperty("message");
      expect(typeof data.message).toBe("string");

      expect(data).toHaveProperty("cleaned");
      expect(Array.isArray(data.cleaned)).toBe(true);

      if (data.enabled === false) {
        // When disabled, cleaned array should be empty
        expect(data.cleaned).toHaveLength(0);
      }
    });

    it("should provide meaningful cleanup feedback", async () => {
      const response = await fetch(`${TEST_BASE_URL}/debug/profiling/cleanup`, {
        method: "POST",
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message.toLowerCase()).toMatch(/cleanup|clean|artifacts|profiling|configuration/i);
    });
  });

  describe("Profiling Service Unit Tests", () => {
    it("should have correct service configuration", () => {
      const status = profilingService.getStatus();
      expect(status).toHaveProperty("enabled");
      expect(status).toHaveProperty("sessions");
      expect(typeof status.enabled).toBe("boolean");
      expect(Array.isArray(status.sessions)).toBe(true);
    });

    it("should handle session lifecycle correctly", async () => {
      const status = profilingService.getStatus();

      if (!status.enabled) {
        // Skip if profiling is disabled
        return;
      }

      // Test session creation (if profiling is enabled)
      const initialSessionCount = status.sessions.length;

      // Start a session
      const sessionId = await profilingService.startProfiling("cpu", true);

      if (sessionId) {
        // Session created successfully
        expect(typeof sessionId).toBe("string");
        expect(sessionId).toMatch(/^profile-\d+-[a-z0-9]+$/);

        // Check session exists
        const session = profilingService.getSession(sessionId);
        expect(session).toBeTruthy();
        expect(session?.id).toBe(sessionId);
        expect(session?.type).toBe("cpu");
        expect(session?.status).toBe("running");

        // Stop the session
        const stopped = await profilingService.stopProfiling(sessionId);
        expect(stopped).toBe(true);

        // Verify session is stopped
        const stoppedSession = profilingService.getSession(sessionId);
        expect(stoppedSession?.status).toBe("completed");
      }
    });

    it("should handle cleanup properly", async () => {
      const status = profilingService.getStatus();

      // Cleanup should work regardless of enabled state
      await expect(profilingService.cleanup()).resolves.toBeUndefined();

      // After cleanup, sessions should be cleared (if profiling was enabled)
      if (status.enabled) {
        const postCleanupStatus = profilingService.getStatus();
        expect(postCleanupStatus.sessions).toHaveLength(0);
      }
    });
  });

  describe("Integration Tests", () => {
    it("should handle complete profiling workflow", async () => {
      // Test the complete workflow: start -> status -> stop -> reports -> cleanup

      // 1. Start profiling
      const startResponse = await fetch(`${TEST_BASE_URL}/debug/profiling/start`, {
        method: "POST",
      });

      expect(startResponse.status).toBe(200);
      const startData = await startResponse.json();
      let sessionId: string | null = startData.sessionId;
      const profilingEnabled = startData.enabled !== false;

      // 2. Check status
      const statusResponse = await fetch(`${TEST_BASE_URL}/debug/profiling/status`);
      expect(statusResponse.status).toBe(200);

      const statusData = await statusResponse.json();
      expect(statusData.enabled).toBe(profilingEnabled);

      if (sessionId && profilingEnabled) {
        const activeSession = statusData.sessions.find((s: any) => s.id === sessionId);
        if (activeSession) {
          expect(activeSession.status).toBe("running");
          expect(activeSession.type).toBe("cpu");
        }
      }

      // 3. Stop profiling (if we have a session)
      if (sessionId && profilingEnabled) {
        await new Promise(resolve => setTimeout(resolve, 100)); // Brief profiling period

        const stopResponse = await fetch(`${TEST_BASE_URL}/debug/profiling/stop`, {
          method: "POST",
        });
        expect(stopResponse.status).toBe(200);
      }

      // 4. Check reports
      const reportsResponse = await fetch(`${TEST_BASE_URL}/debug/profiling/reports`);
      expect(reportsResponse.status).toBe(200);

      const reportsData = await reportsResponse.json();
      expect(reportsData).toHaveProperty("reports");
      expect(reportsData).toHaveProperty("total");

      if (!profilingEnabled) {
        expect(reportsData.reports).toHaveLength(0);
        expect(reportsData.total).toBe(0);
      }

      // 5. Cleanup
      const cleanupResponse = await fetch(`${TEST_BASE_URL}/debug/profiling/cleanup`, {
        method: "POST",
      });
      expect(cleanupResponse.status).toBe(200);
    });
  });
});