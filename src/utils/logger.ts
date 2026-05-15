// src/utils/logger.ts

// Stryker disable all: Logger implementation is tested via integration tests and telemetry output verification.
// String literal mutations in log messages and field names are low-value mutations that don't catch real bugs.

// SIO-447: Updated to use logging container for backend selection (Pino/Winston)
// SIO-755: event_name is required on every log line (typed to SpanEventName) and defended at runtime.

import type { SpanEventName } from "../telemetry/span-event-names";

type LoggerConfig = { telemetry: { serviceName: string; environment: string } };

/**
 * Context object passed to every public logger function. `event_name` is required
 * and must be one of the values in SpanEvents so the observability backend never
 * sees a null/missing event_name on a log line.
 */
export type LogContext = { event_name: SpanEventName } & Record<string, unknown>;

let configInstance: LoggerConfig | null = null;

function getConfig(): LoggerConfig {
  if (!configInstance) {
    try {
      const { loadConfig } = require("../config/index");
      configInstance = loadConfig();
    } catch (_error) {
      configInstance = {
        telemetry: {
          serviceName: "authentication-service",
          environment: "development",
        },
      };
    }
  }
  // TypeScript can't infer that configInstance is always non-null after the if block
  // because loadConfig() comes from a dynamic require
  // biome-ignore lint/style/noNonNullAssertion: Safe here - configInstance is guaranteed non-null after the if block
  return configInstance!;
}

function getLoggerInstance() {
  // Use logging container for backend selection (LOGGING_BACKEND env var)
  // Container handles Pino/Winston selection and initialization
  try {
    const { getLogger } = require("../logging/container");
    return getLogger();
  } catch (_error) {
    // Fallback: Try legacy Winston logger directly
    try {
      const { winstonTelemetryLogger } = require("../telemetry/winston-logger");
      return winstonTelemetryLogger;
    } catch (_innerError) {
      // Final fallback: console-based logger
      console.error("ERROR: Could not load logger, falling back to console:", _error);
      const config = getConfig();
      return {
        info: (msg: string, ctx: Record<string, unknown>) =>
          console.log(
            JSON.stringify({
              "@timestamp": new Date().toISOString(),
              "log.level": "INFO",
              message: msg,
              service: {
                name: config.telemetry.serviceName,
                environment: config.telemetry.environment,
              },
              ...ctx,
            })
          ),
        warn: (msg: string, ctx: Record<string, unknown>) =>
          console.warn(
            JSON.stringify({
              "@timestamp": new Date().toISOString(),
              "log.level": "WARN",
              message: msg,
              service: {
                name: config.telemetry.serviceName,
                environment: config.telemetry.environment,
              },
              ...ctx,
            })
          ),
        error: (msg: string, ctx: Record<string, unknown>) =>
          console.error(
            JSON.stringify({
              "@timestamp": new Date().toISOString(),
              "log.level": "ERROR",
              message: msg,
              service: {
                name: config.telemetry.serviceName,
                environment: config.telemetry.environment,
              },
              ...ctx,
            })
          ),
      };
    }
  }
}

// SIO-755: Runtime guard. If a caller bypasses the LogContext type (e.g. `as any`
// or untyped `require()` callers), we still emit a usable record AND a one-shot
// warn so the observability backend has a signal.
function ensureEventName(
  message: string,
  context: Record<string, unknown> | undefined
): Record<string, unknown> {
  const ctx = context ?? {};
  const v = ctx.event_name;
  if (typeof v === "string" && v.length > 0) return ctx;
  getLoggerInstance().warn("Log call missing event_name", {
    event_name: "logger.event_name.missing",
    original_message: message,
    provided_event_name: v ?? null,
  });
  return { ...ctx, event_name: "unknown" };
}

export function log(message: string, context: LogContext) {
  // Service info is in OTEL resource attributes - no need to duplicate in every log
  getLoggerInstance().info(message, ensureEventName(message, context));
}

export function warn(message: string, context: LogContext) {
  // Service info is in OTEL resource attributes - no need to duplicate in every log
  getLoggerInstance().warn(message, ensureEventName(message, context));
}

export function error(message: string, context: LogContext) {
  // Service info is in OTEL resource attributes - no need to duplicate in every log
  getLoggerInstance().error(message, ensureEventName(message, context));
}

export function audit(eventType: SpanEventName, context: Record<string, unknown> = {}) {
  // Service info is in OTEL resource attributes - no need to duplicate in every log
  // eventType is canonical: it overrides any event_name/event_type the caller passed.
  getLoggerInstance().info(
    eventType,
    ensureEventName(eventType, {
      audit: true,
      ...context,
      event_type: eventType,
      event_name: eventType,
    })
  );
}

export function logError(message: string, err: Error, context: LogContext) {
  // Service info is in OTEL resource attributes - no need to duplicate in every log
  getLoggerInstance().error(
    message,
    ensureEventName(message, {
      error: {
        name: err.name,
        message: err.message,
        stack: err.stack,
      },
      ...context,
    })
  );
}

export const logger = { log, warn, error, audit, logError };
