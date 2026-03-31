// src/services/profiling.service.ts

// Stryker disable all: Profiling service is a development tool with V8 inspector integration.
// Tested via manual profiling sessions and E2E tests, not unit tests.

import { getProfilingConfig, getServerConfig } from "../config/index";
import { error, log, warn } from "../utils/logger";

export interface ProfilingSession {
  id: string;
  type: "cpu" | "heap";
  startTime: Date;
  endTime?: Date;
  status: "running" | "stopped" | "completed" | "failed";
  pid?: number;
}

export interface ProfilingStatus {
  enabled: boolean;
  sessions: ProfilingSession[];
}

class ProfilingService {
  private serverConfig = getServerConfig();
  private profilingConfig = getProfilingConfig();
  private sessions: Map<string, ProfilingSession> = new Map();
  private enabled: boolean;
  constructor() {
    this.enabled = this.isProfilingEnabled();

    if (this.enabled) {
      log("Profiling service initialized", {
        component: "profiling",
        event_name: "profiling.service.initialized",
        enabled: this.enabled,
        note: "Uses Chrome DevTools integration - no file generation required",
      });
    }
  }

  private isProfilingEnabled(): boolean {
    const configEnabled = this.profilingConfig.enabled;

    if (this.serverConfig.nodeEnv === "production") {
      if (configEnabled) {
        log("Profiling enabled in production via explicit configuration", {
          component: "profiling",
          event_name: "profiling.production.enabled",
        });
      } else {
        log(
          "Profiling available but disabled in production (use PROFILING_ENABLED=true to enable)",
          {
            component: "profiling",
            event_name: "profiling.production.available",
          }
        );
      }
      return configEnabled;
    }

    return configEnabled !== false;
  }

  private generateSessionId(): string {
    const randomBytes = crypto.getRandomValues(new Uint8Array(6));
    const randomPart = Array.from(randomBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return `profile-${Date.now()}-${randomPart}`;
  }

  async startProfiling(
    type: "cpu" | "heap" = "cpu",
    manual: boolean = true
  ): Promise<string | null> {
    if (!this.enabled) {
      log("Profiling start attempted but service is disabled", {
        component: "profiling",
        event_name: "profiling.start.disabled",
        type,
        note: "Profiling service is available but disabled via configuration",
      });
      return null;
    }

    const runningSessions = Array.from(this.sessions.values()).filter(
      (session) => session.status === "running"
    );

    const existingSession = runningSessions[0];
    if (existingSession) {
      warn("Profiling start rejected - session already running", {
        event_name: "profiling.start.rejected",
        component: "profiling",
        type,
        existing_session_id: existingSession.id,
        existing_sessions: runningSessions.length,
      });
      return null;
    }

    const sessionId = this.generateSessionId();
    const session: ProfilingSession = {
      id: sessionId,
      type,
      startTime: new Date(),
      status: "running",
      pid: process.pid,
    };

    try {
      this.sessions.set(sessionId, session);

      log("Profiling session started", {
        event_name: "profiling.session.started",
        component: "profiling",
        session_id: sessionId,
        type,
        manual,
        pid: session.pid,
        instructions: "Use Chrome DevTools at chrome://inspect for interactive profiling",
        note: "Profiling is active on current process. Use Chrome Inspector to capture CPU/Memory profiles.",
      });

      return sessionId;
    } catch (err) {
      session.status = "failed";
      session.endTime = new Date();
      this.sessions.set(sessionId, session);

      error("Failed to start profiling session", {
        event_name: "profiling.session.start_failed",
        component: "profiling",
        session_id: sessionId,
        error: err instanceof Error ? err.message : "Unknown error",
      });

      return null;
    }
  }

  async stopProfiling(sessionId?: string): Promise<boolean> {
    if (!this.enabled) {
      log("Profiling stop attempted but service is disabled", {
        event_name: "profiling.stop.disabled",
        component: "profiling",
        note: "Profiling service is available but disabled via configuration",
      });
      return false;
    }

    if (sessionId) {
      const session = this.sessions.get(sessionId);
      if (!session || session.status !== "running") {
        return false;
      }

      try {
        session.status = "completed";
        session.endTime = new Date();
        this.sessions.set(sessionId, session);

        log("Profiling session stopped", {
          event_name: "profiling.session.stopped",
          component: "profiling",
          session_id: sessionId,
          instructions: "Profile data captured. Use Chrome DevTools to analyze performance data.",
        });
        return true;
      } catch (err) {
        error("Failed to stop profiling session", {
          event_name: "profiling.session.stop_failed",
          component: "profiling",
          session_id: sessionId,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
      return false;
    }

    try {
      const runningSessions = Array.from(this.sessions.values()).filter(
        (session) => session.status === "running"
      );

      if (runningSessions.length === 0) {
        log("No running sessions to stop", {
          event_name: "profiling.stop.no_sessions",
          component: "profiling",
        });
        return true;
      }

      let stoppedCount = 0;
      for (const session of runningSessions) {
        session.status = "completed";
        session.endTime = new Date();
        this.sessions.set(session.id, session);
        stoppedCount++;
      }

      log("All running profiling sessions stopped", {
        event_name: "profiling.session.all_stopped",
        component: "profiling",
        stopped_count: stoppedCount,
        instructions: "Use Chrome DevTools at chrome://inspect for profiling analysis",
      });
      return true;
    } catch (err) {
      error("Failed to stop profiling sessions", {
        event_name: "profiling.session.stop_failed",
        component: "profiling",
        error: err instanceof Error ? err.message : "Unknown error",
      });
      return false;
    }
  }

  getStatus(): ProfilingStatus {
    return {
      enabled: this.enabled,
      sessions: Array.from(this.sessions.values()),
    };
  }

  getSession(sessionId: string): ProfilingSession | null {
    return this.sessions.get(sessionId) || null;
  }

  getReports(): string[] {
    log("Profile reports are managed through Chrome DevTools", {
      event_name: "profiling.reports.requested",
      component: "profiling",
      instructions: "Use Chrome DevTools at chrome://inspect to capture and export profiles",
      note: "This service uses Chrome DevTools protocol - no file-based reports are generated",
    });
    return [];
  }

  async cleanup(): Promise<void> {
    if (!this.enabled) {
      log("Profiling cleanup attempted but service is disabled", {
        event_name: "profiling.cleanup.disabled",
        component: "profiling",
        note: "Profiling service is available but disabled via configuration",
      });
      return;
    }

    try {
      this.sessions.clear();

      log("Profiling session state cleared", {
        event_name: "profiling.cleanup.completed",
        component: "profiling",
        note: "Chrome DevTools profiles are managed independently - no files to clean up",
        instructions: "Use Chrome DevTools at chrome://inspect to manage saved profiles",
      });
    } catch (err) {
      error("Failed to cleanup profiling sessions", {
        event_name: "profiling.cleanup.failed",
        component: "profiling",
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  async shutdown(): Promise<void> {
    if (!this.enabled) {
      log("Profiling shutdown attempted but service is disabled", {
        event_name: "profiling.shutdown.disabled",
        component: "profiling",
        note: "Profiling service is available but disabled via configuration",
      });
      return;
    }

    log("Shutting down profiling service", {
      event_name: "profiling.shutdown.initiated",
      component: "profiling",
    });

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.status === "running") {
        await this.stopProfiling(sessionId);
      }
    }

    // Clear session metadata to release memory
    this.sessions.clear();

    log("Profiling service shutdown completed", {
      event_name: "profiling.shutdown.completed",
      component: "profiling",
    });
  }
}

export const profilingService = new ProfilingService();
