/* src/handlers/profiling.ts */

// Stryker disable all: Profiling is a development/debugging feature with string-heavy responses.
// These handlers are tested via E2E tests and manual profiling sessions.

import { profilingService } from "../services/profiling.service";
import { log } from "../utils/logger";
import { createErrorResponse, createSuccessResponse, generateRequestId } from "../utils/response";

export async function handleProfilingStart(req: Request): Promise<Response> {
  const requestId = generateRequestId();
  const startTime = Bun.nanoseconds();

  log("Processing profiling start request", {
    component: "profiling",
    operation: "handle_profiling_start",
    endpoint: "/debug/profiling/start",
    requestId,
  });

  const status = profilingService.getStatus();

  if (!status.enabled) {
    const duration = (Bun.nanoseconds() - startTime) / 1_000_000;
    log("HTTP request processed", {
      method: "POST",
      url: "/debug/profiling/start",
      statusCode: 200,
      duration,
      requestId,
    });
    return createSuccessResponse(
      {
        message: "Profiling service is available but disabled via configuration",
        enabled: false,
        sessionId: null,
        instructions:
          "Enable profiling by setting PROFILING_ENABLED=true in your environment configuration",
      },
      requestId
    );
  }

  try {
    const url = new URL(req.url);
    const type = (url.searchParams.get("type") as "cpu" | "heap") || "cpu";
    const manual = url.searchParams.get("manual") !== "false";

    const sessionId = await profilingService.startProfiling(type, manual);

    if (!sessionId) {
      const duration = (Bun.nanoseconds() - startTime) / 1_000_000;
      log("HTTP request processed", {
        method: "POST",
        url: "/debug/profiling/start",
        statusCode: 400,
        duration,
        requestId,
      });
      return createErrorResponse(
        400,
        "Bad Request",
        "Cannot start profiling session - another session is already running",
        requestId,
        undefined,
        "/debug/profiling/start"
      );
    }

    const duration = (Bun.nanoseconds() - startTime) / 1_000_000;
    log("HTTP request processed", {
      method: "POST",
      url: "/debug/profiling/start",
      statusCode: 200,
      duration,
      requestId,
    });

    return createSuccessResponse(
      {
        message: "Profiling session started successfully",
        sessionId,
        type,
        manual,
        instructions: manual
          ? "Send SIGUSR2 signal to toggle profiling or use the stop endpoint"
          : "Profiling will start automatically",
      },
      requestId
    );
  } catch (error) {
    const duration = (Bun.nanoseconds() - startTime) / 1_000_000;
    log("HTTP request processed", {
      method: "POST",
      url: "/debug/profiling/start",
      statusCode: 500,
      duration,
      requestId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return createErrorResponse(
      500,
      "Internal Server Error",
      `Failed to start profiling: ${error instanceof Error ? error.message : "Unknown error"}`,
      requestId,
      undefined,
      "/debug/profiling/start"
    );
  }
}

export async function handleProfilingStop(req: Request): Promise<Response> {
  const requestId = generateRequestId();
  const startTime = Bun.nanoseconds();

  log("Processing profiling stop request", {
    component: "profiling",
    operation: "handle_profiling_stop",
    endpoint: "/debug/profiling/stop",
    requestId,
  });

  const status = profilingService.getStatus();

  if (!status.enabled) {
    const duration = (Bun.nanoseconds() - startTime) / 1_000_000;
    log("HTTP request processed", {
      method: "POST",
      url: "/debug/profiling/stop",
      statusCode: 200,
      duration,
      requestId,
    });
    return createSuccessResponse(
      {
        message: "Profiling service is available but disabled via configuration",
        enabled: false,
        sessionId: null,
        instructions:
          "Enable profiling by setting PROFILING_ENABLED=true in your environment configuration",
      },
      requestId
    );
  }

  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get("sessionId");

    const success = await profilingService.stopProfiling(sessionId || undefined);

    if (!success) {
      const duration = (Bun.nanoseconds() - startTime) / 1_000_000;
      log("HTTP request processed", {
        method: "POST",
        url: "/debug/profiling/stop",
        statusCode: 500,
        duration,
        requestId,
      });
      return createErrorResponse(
        500,
        "Internal Server Error",
        "Failed to stop profiling session",
        requestId,
        undefined,
        "/debug/profiling/stop"
      );
    }

    const duration = (Bun.nanoseconds() - startTime) / 1_000_000;
    log("HTTP request processed", {
      method: "POST",
      url: "/debug/profiling/stop",
      statusCode: 200,
      duration,
      requestId,
    });

    return createSuccessResponse(
      {
        message: "Profiling session stopped successfully",
        sessionId: sessionId || "global",
        instructions: "Profile data is available in Chrome DevTools at chrome://inspect",
        note: "Use Chrome DevTools to capture and export CPU/Memory profiles",
      },
      requestId
    );
  } catch (error) {
    const duration = (Bun.nanoseconds() - startTime) / 1_000_000;
    log("HTTP request processed", {
      method: "POST",
      url: "/debug/profiling/stop",
      statusCode: 500,
      duration,
      requestId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return createErrorResponse(
      500,
      "Internal Server Error",
      `Failed to stop profiling: ${error instanceof Error ? error.message : "Unknown error"}`,
      requestId,
      undefined,
      "/debug/profiling/stop"
    );
  }
}

export async function handleProfilingStatus(_req: Request): Promise<Response> {
  const requestId = generateRequestId();
  const startTime = Bun.nanoseconds();

  log("Processing profiling status request", {
    component: "profiling",
    operation: "handle_profiling_status",
    endpoint: "/debug/profiling/status",
    requestId,
  });

  try {
    const status = profilingService.getStatus();

    const duration = (Bun.nanoseconds() - startTime) / 1_000_000;
    log("HTTP request processed", {
      method: "GET",
      url: "/debug/profiling/status",
      statusCode: 200,
      duration,
      requestId,
    });

    return createSuccessResponse(
      {
        enabled: status.enabled,
        sessions: status.sessions,
        environment: process.env.NODE_ENV || "local",
        integration: "Chrome DevTools Protocol",
        instructions: "Use Chrome DevTools at chrome://inspect for profiling",
        availableCommands: {
          start: "POST /debug/profiling/start?type=cpu&manual=true",
          stop: "POST /debug/profiling/stop?sessionId=<id>",
          status: "GET /debug/profiling/status",
          cleanup: "POST /debug/profiling/cleanup",
        },
      },
      requestId
    );
  } catch (error) {
    const duration = (Bun.nanoseconds() - startTime) / 1_000_000;
    log("HTTP request processed", {
      method: "GET",
      url: "/debug/profiling/status",
      statusCode: 500,
      duration,
      requestId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return createErrorResponse(
      500,
      "Internal Server Error",
      `Failed to get profiling status: ${error instanceof Error ? error.message : "Unknown error"}`,
      requestId,
      undefined,
      "/debug/profiling/status"
    );
  }
}

export async function handleProfilingReports(_req: Request): Promise<Response> {
  const requestId = generateRequestId();
  const startTime = Bun.nanoseconds();

  log("Processing profiling reports request", {
    component: "profiling",
    operation: "handle_profiling_reports",
    endpoint: "/debug/profiling/reports",
    requestId,
  });

  const status = profilingService.getStatus();

  if (!status.enabled) {
    const duration = (Bun.nanoseconds() - startTime) / 1_000_000;
    log("HTTP request processed", {
      method: "GET",
      url: "/debug/profiling/reports",
      statusCode: 200,
      duration,
      requestId,
    });
    return createSuccessResponse(
      {
        reports: [],
        total: 0,
        enabled: false,
        message: "Profiling service is available but disabled via configuration",
        instructions:
          "Enable profiling by setting PROFILING_ENABLED=true in your environment configuration",
      },
      requestId
    );
  }

  try {
    const reports = profilingService.getReports();

    const duration = (Bun.nanoseconds() - startTime) / 1_000_000;
    log("HTTP request processed", {
      method: "GET",
      url: "/debug/profiling/reports",
      statusCode: 200,
      duration,
      requestId,
    });

    return createSuccessResponse(
      {
        reports: reports.map((file) => ({
          path: file,
          name: file.split("/").pop() || file,
          url: `/debug/profiling/report?file=${encodeURIComponent(file)}`,
        })),
        total: reports.length,
        instructions: "Open the HTML files in your browser for interactive flamegraph analysis",
      },
      requestId
    );
  } catch (error) {
    const duration = (Bun.nanoseconds() - startTime) / 1_000_000;
    log("HTTP request processed", {
      method: "GET",
      url: "/debug/profiling/reports",
      statusCode: 500,
      duration,
      requestId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return createErrorResponse(
      500,
      "Internal Server Error",
      `Failed to list profiling reports: ${error instanceof Error ? error.message : "Unknown error"}`,
      requestId,
      undefined,
      "/debug/profiling/reports"
    );
  }
}

export async function handleProfilingCleanup(_req: Request): Promise<Response> {
  const requestId = generateRequestId();
  const startTime = Bun.nanoseconds();

  log("Processing profiling cleanup request", {
    component: "profiling",
    operation: "handle_profiling_cleanup",
    endpoint: "/debug/profiling/cleanup",
    requestId,
  });

  const status = profilingService.getStatus();

  if (!status.enabled) {
    const duration = (Bun.nanoseconds() - startTime) / 1_000_000;
    log("HTTP request processed", {
      method: "POST",
      url: "/debug/profiling/cleanup",
      statusCode: 200,
      duration,
      requestId,
    });
    return createSuccessResponse(
      {
        message: "Profiling service is available but disabled via configuration",
        enabled: false,
        cleaned: [],
        instructions:
          "Enable profiling by setting PROFILING_ENABLED=true in your environment configuration",
      },
      requestId
    );
  }

  try {
    await profilingService.cleanup();

    const duration = (Bun.nanoseconds() - startTime) / 1_000_000;
    log("HTTP request processed", {
      method: "POST",
      url: "/debug/profiling/cleanup",
      statusCode: 200,
      duration,
      requestId,
    });

    return createSuccessResponse(
      {
        message: "Profiling artifacts cleaned up successfully",
        cleaned: [
          "*.pb files (pprof binary files)",
          "*.html files (flamegraph reports)",
          "flame-* artifacts",
          "profiling/ directory",
        ],
      },
      requestId
    );
  } catch (error) {
    const duration = (Bun.nanoseconds() - startTime) / 1_000_000;
    log("HTTP request processed", {
      method: "POST",
      url: "/debug/profiling/cleanup",
      statusCode: 500,
      duration,
      requestId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return createErrorResponse(
      500,
      "Internal Server Error",
      `Failed to cleanup profiling artifacts: ${error instanceof Error ? error.message : "Unknown error"}`,
      requestId,
      undefined,
      "/debug/profiling/cleanup"
    );
  }
}

export async function handleProfilingReport(req: Request): Promise<Response> {
  const requestId = generateRequestId();
  const startTime = Bun.nanoseconds();

  log("Processing profiling report request", {
    component: "profiling",
    operation: "handle_profiling_report",
    endpoint: "/debug/profiling/report",
    requestId,
  });

  const status = profilingService.getStatus();

  if (!status.enabled) {
    const duration = (Bun.nanoseconds() - startTime) / 1_000_000;
    log("HTTP request processed", {
      method: "GET",
      url: "/debug/profiling/report",
      statusCode: 200,
      duration,
      requestId,
    });
    return createSuccessResponse(
      {
        message: "Profiling service is available but disabled via configuration",
        enabled: false,
        report: null,
        instructions:
          "Enable profiling by setting PROFILING_ENABLED=true in your environment configuration",
      },
      requestId
    );
  }

  try {
    const url = new URL(req.url);
    const filePath = url.searchParams.get("file");

    if (!filePath) {
      const duration = (Bun.nanoseconds() - startTime) / 1_000_000;
      log("HTTP request processed", {
        method: "GET",
        url: "/debug/profiling/report",
        statusCode: 400,
        duration,
        requestId,
      });
      return createErrorResponse(
        400,
        "Bad Request",
        "File parameter is required",
        requestId,
        undefined,
        "/debug/profiling/report"
      );
    }

    const reports = profilingService.getReports();
    const requestedReport = reports.find((report) => report === filePath);

    if (!requestedReport) {
      const duration = (Bun.nanoseconds() - startTime) / 1_000_000;
      log("HTTP request processed", {
        method: "GET",
        url: "/debug/profiling/report",
        statusCode: 404,
        duration,
        requestId,
      });
      return createErrorResponse(
        404,
        "Not Found",
        "Report file not found",
        requestId,
        undefined,
        "/debug/profiling/report"
      );
    }

    try {
      const file = Bun.file(requestedReport);
      const content = await file.text();

      const duration = (Bun.nanoseconds() - startTime) / 1_000_000;
      log("HTTP request processed", {
        method: "GET",
        url: "/debug/profiling/report",
        statusCode: 200,
        duration,
        requestId,
      });

      return new Response(content, {
        status: 200,
        headers: {
          "Content-Type": "text/html",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
          "X-Request-Id": requestId,
        },
      });
    } catch (_fileError) {
      const duration = (Bun.nanoseconds() - startTime) / 1_000_000;
      log("HTTP request processed", {
        method: "GET",
        url: "/debug/profiling/report",
        statusCode: 500,
        duration,
        requestId,
        error: "Failed to read report file",
      });
      return createErrorResponse(
        500,
        "Internal Server Error",
        "Failed to read report file",
        requestId,
        undefined,
        "/debug/profiling/report"
      );
    }
  } catch (error) {
    const duration = (Bun.nanoseconds() - startTime) / 1_000_000;
    log("HTTP request processed", {
      method: "GET",
      url: "/debug/profiling/report",
      statusCode: 500,
      duration,
      requestId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return createErrorResponse(
      500,
      "Internal Server Error",
      `Failed to serve profiling report: ${error instanceof Error ? error.message : "Unknown error"}`,
      requestId,
      undefined,
      "/debug/profiling/report"
    );
  }
}
