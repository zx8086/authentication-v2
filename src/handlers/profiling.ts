/* src/handlers/profiling.ts */

import { profilingService } from "../services/profiling.service";
import { createErrorResponse, createSuccessResponse, generateRequestId } from "../utils/response";

export async function handleProfilingStart(req: Request): Promise<Response> {
  const requestId = generateRequestId();
  const status = profilingService.getStatus();

  if (!status.enabled) {
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
      return createErrorResponse(
        400,
        "Bad Request",
        "Cannot start profiling session - another session is already running",
        requestId
      );
    }

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
    return createErrorResponse(
      500,
      "Internal Server Error",
      `Failed to start profiling: ${error instanceof Error ? error.message : "Unknown error"}`,
      requestId
    );
  }
}

export async function handleProfilingStop(req: Request): Promise<Response> {
  const requestId = generateRequestId();
  const status = profilingService.getStatus();

  if (!status.enabled) {
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
      return createErrorResponse(
        500,
        "Internal Server Error",
        "Failed to stop profiling session",
        requestId
      );
    }

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
    return createErrorResponse(
      500,
      "Internal Server Error",
      `Failed to stop profiling: ${error instanceof Error ? error.message : "Unknown error"}`,
      requestId
    );
  }
}

export async function handleProfilingStatus(_req: Request): Promise<Response> {
  const requestId = generateRequestId();

  try {
    const status = profilingService.getStatus();

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
    return createErrorResponse(
      500,
      "Internal Server Error",
      `Failed to get profiling status: ${error instanceof Error ? error.message : "Unknown error"}`,
      requestId
    );
  }
}

export async function handleProfilingReports(_req: Request): Promise<Response> {
  const requestId = generateRequestId();
  const status = profilingService.getStatus();

  if (!status.enabled) {
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
    return createErrorResponse(
      500,
      "Internal Server Error",
      `Failed to list profiling reports: ${error instanceof Error ? error.message : "Unknown error"}`,
      requestId
    );
  }
}

export async function handleProfilingCleanup(_req: Request): Promise<Response> {
  const requestId = generateRequestId();
  const status = profilingService.getStatus();

  if (!status.enabled) {
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
    return createErrorResponse(
      500,
      "Internal Server Error",
      `Failed to cleanup profiling artifacts: ${error instanceof Error ? error.message : "Unknown error"}`,
      requestId
    );
  }
}

export async function handleProfilingReport(req: Request): Promise<Response> {
  const requestId = generateRequestId();
  const status = profilingService.getStatus();

  if (!status.enabled) {
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
      return createErrorResponse(400, "Bad Request", "File parameter is required", requestId);
    }

    const reports = profilingService.getReports();
    const requestedReport = reports.find((report) => report === filePath);

    if (!requestedReport) {
      return createErrorResponse(404, "Not Found", "Report file not found", requestId);
    }

    try {
      const file = Bun.file(requestedReport);
      const content = await file.text();

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
      return createErrorResponse(
        500,
        "Internal Server Error",
        "Failed to read report file",
        requestId
      );
    }
  } catch (error) {
    return createErrorResponse(
      500,
      "Internal Server Error",
      `Failed to serve profiling report: ${error instanceof Error ? error.message : "Unknown error"}`,
      requestId
    );
  }
}
