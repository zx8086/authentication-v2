/* src/services/profiling.service.ts */

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
        event: "service_initialized",
        enabled: this.enabled,
        note: "Uses Chrome DevTools integration - no file generation required",
      });
    }
  }

  private isProfilingEnabled(): boolean {
    // Check if profiling is explicitly enabled via config
    const configEnabled = this.profilingConfig.enabled;

    // In production, require explicit configuration to enable profiling
    if (this.serverConfig.nodeEnv === "production") {
      if (configEnabled) {
        log("Profiling enabled in production via explicit configuration", {
          component: "profiling",
          event: "production_enabled",
        });
      } else {
        log(
          "Profiling available but disabled in production (use PROFILING_ENABLED=true to enable)",
          {
            component: "profiling",
            event: "production_available",
          }
        );
      }
      return configEnabled;
    }

    // In non-production environments, default to enabled if not explicitly configured
    return configEnabled !== false; // true if enabled=true or undefined, false only if explicitly false
  }

  private generateSessionId(): string {
    return `profile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async startProfiling(
    type: "cpu" | "heap" = "cpu",
    manual: boolean = true
  ): Promise<string | null> {
    if (!this.enabled) {
      log("Profiling start attempted but service is disabled", {
        component: "profiling",
        event: "start_disabled",
        type,
        note: "Profiling service is available but disabled via configuration",
      });
      return null;
    }

    // Check for existing running sessions - only allow one at a time
    const runningSessions = Array.from(this.sessions.values()).filter(
      (session) => session.status === "running"
    );

    if (runningSessions.length > 0) {
      warn("Profiling start rejected - session already running", {
        component: "profiling",
        event: "start_rejected_concurrent",
        type,
        existingSessionId: runningSessions[0].id,
        existingSessions: runningSessions.length,
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
        component: "profiling",
        event: "session_started",
        sessionId,
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
        component: "profiling",
        event: "start_failed",
        sessionId,
        error: err instanceof Error ? err.message : "Unknown error",
      });

      return null;
    }
  }

  async stopProfiling(sessionId?: string): Promise<boolean> {
    if (!this.enabled) {
      log("Profiling stop attempted but service is disabled", {
        component: "profiling",
        event: "stop_disabled",
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
          component: "profiling",
          event: "session_stopped",
          sessionId,
          instructions: "Profile data captured. Use Chrome DevTools to analyze performance data.",
        });
        return true;
      } catch (err) {
        error("Failed to stop profiling session", {
          component: "profiling",
          event: "stop_failed",
          sessionId,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
      return false;
    }

    try {
      // Stop all running sessions when no specific sessionId provided
      const runningSessions = Array.from(this.sessions.values()).filter(
        (session) => session.status === "running"
      );

      if (runningSessions.length === 0) {
        log("No running sessions to stop", {
          component: "profiling",
          event: "stop_no_sessions",
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
        component: "profiling",
        event: "global_sessions_stopped",
        stoppedCount,
        instructions: "Use Chrome DevTools at chrome://inspect for profiling analysis",
      });
      return true;
    } catch (err) {
      error("Failed to stop profiling sessions", {
        component: "profiling",
        event: "stop_failed",
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
      component: "profiling",
      event: "reports_request",
      instructions: "Use Chrome DevTools at chrome://inspect to capture and export profiles",
      note: "This service uses Chrome DevTools protocol - no file-based reports are generated",
    });
    return [];
  }

  async cleanup(): Promise<void> {
    if (!this.enabled) {
      log("Profiling cleanup attempted but service is disabled", {
        component: "profiling",
        event: "cleanup_disabled",
        note: "Profiling service is available but disabled via configuration",
      });
      return;
    }

    try {
      this.sessions.clear();

      log("Profiling session state cleared", {
        component: "profiling",
        event: "cleanup_completed",
        note: "Chrome DevTools profiles are managed independently - no files to clean up",
        instructions: "Use Chrome DevTools at chrome://inspect to manage saved profiles",
      });
    } catch (err) {
      error("Failed to cleanup profiling sessions", {
        component: "profiling",
        event: "cleanup_failed",
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  async shutdown(): Promise<void> {
    if (!this.enabled) {
      log("Profiling shutdown attempted but service is disabled", {
        component: "profiling",
        event: "shutdown_disabled",
        note: "Profiling service is available but disabled via configuration",
      });
      return;
    }

    log("Shutting down profiling service", {
      component: "profiling",
      event: "shutdown_initiated",
    });

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.status === "running") {
        await this.stopProfiling(sessionId);
      }
    }

    log("Profiling service shutdown completed", {
      component: "profiling",
      event: "shutdown_completed",
    });
  }
}

export const profilingService = new ProfilingService();
