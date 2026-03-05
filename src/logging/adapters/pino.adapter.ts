// src/logging/adapters/pino.adapter.ts
// SIO-447: Pino adapter implementing ILogger interface with ECS compliance

import { ecsFormat } from "@elastic/ecs-pino-format";
import { isSpanContextValid, trace } from "@opentelemetry/api";
import pino from "pino";
import type { ILogger, ITelemetryLogger, LogContext, LoggerConfig } from "../ports/logger.port";

/**
 * Pino adapter configuration
 */
export type PinoAdapterConfig = LoggerConfig;

/**
 * Determine whether the logger should output raw ECS NDJSON (production)
 * or human-readable formatted output (development/local/test).
 *
 * Production mode: NODE_ENV is "production" or "staging"
 * Development mode: everything else (including "local", "development", "test", or unset)
 */
// IMPORTANT: This reads NODE_ENV at call time (not module load time).
// Tests rely on this lazy evaluation to switch modes between describe blocks.
function isProductionOutput(): boolean {
  const env = process.env.NODE_ENV;
  return env === "production" || env === "staging";
}

/**
 * Pino-based logger implementation.
 * Implements ILogger interface for Clean Architecture.
 *
 * Features:
 * - ECS-compliant formatting via @elastic/ecs-pino-format
 * - Dual-mode output: raw NDJSON (production) or human-readable (development/test)
 * - OpenTelemetry trace context injection via Pino mixin
 * - OTLP export handled by PinoInstrumentation's OTelPinoStream (not manual)
 * - Sync stdout for reliable console output (non-blocking)
 */
export class PinoAdapter implements ITelemetryLogger {
  private pinoInstance: pino.Logger | null = null;
  private readonly config: PinoAdapterConfig;

  constructor(config: PinoAdapterConfig) {
    this.config = config;
  }

  /**
   * Initialize or get the Pino logger instance
   */
  private getLogger(): pino.Logger {
    if (!this.pinoInstance) {
      this.pinoInstance = this.createLogger();
    }
    return this.pinoInstance;
  }

  /**
   * ECS fields to exclude from console context display.
   * These are metadata fields that clutter the human-readable output.
   */
  private static readonly ECS_METADATA_FIELDS = new Set([
    "@timestamp",
    "ecs.version",
    "log.level",
    "log.logger",
    "process.pid",
    "host.hostname",
    "service.name",
    "service.version",
    "service.environment",
    "event.dataset",
  ]);

  /**
   * Format log output like Winston: "4:25:58 AM info: Message {context}"
   * Handles ECS-formatted log records from @elastic/ecs-pino-format.
   */
  private formatLogLine(obj: Record<string, unknown>): string {
    // ECS format uses "log.level" string, standard Pino uses numeric "level"
    const ecsLevel = obj["log.level"] as string | undefined;
    const pinoLevel = obj.level as number | undefined;

    const levelName =
      ecsLevel?.toLowerCase() ||
      (pinoLevel === 10
        ? "trace"
        : pinoLevel === 20
          ? "debug"
          : pinoLevel === 30
            ? "info"
            : pinoLevel === 40
              ? "warn"
              : pinoLevel === 50
                ? "error"
                : pinoLevel === 60
                  ? "fatal"
                  : "info");

    // ECS uses "message", standard Pino uses "msg"
    const msg = (obj.message as string) || (obj.msg as string) || "";

    // ECS uses "@timestamp" ISO string, standard Pino uses "time" epoch
    const timestamp = obj["@timestamp"] as string | undefined;
    const pinoTime = obj.time as number | undefined;
    const date = timestamp ? new Date(timestamp) : new Date(pinoTime || Date.now());

    // Color codes
    const colors: Record<string, string> = {
      trace: "\x1b[90m", // gray
      debug: "\x1b[36m", // cyan
      info: "\x1b[32m", // green
      warn: "\x1b[33m", // yellow
      error: "\x1b[31m", // red
      fatal: "\x1b[35m", // magenta
    };
    const reset = "\x1b[0m";

    // Format time as "h:MM:ss TT"
    const hours = date.getHours();
    const ampm = hours >= 12 ? "PM" : "AM";
    const hour12 = hours % 12 || 12;
    const timeStr = `${hour12}:${String(date.getMinutes()).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")} ${ampm}`;

    // Extract context - exclude ECS metadata and standard Pino fields
    const context: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      // Skip standard Pino fields
      if (["level", "time", "msg", "message", "pid", "hostname"].includes(key)) continue;
      // Skip ECS metadata fields (use dot notation check for nested keys like "log.level")
      if (PinoAdapter.ECS_METADATA_FIELDS.has(key)) continue;
      context[key] = value;
    }

    // Build output line
    const contextStr = Object.keys(context).length > 0 ? ` ${JSON.stringify(context)}` : "";
    return `${timeStr} ${colors[levelName]}${levelName}${reset}: ${msg}${contextStr}\n`;
  }

  /**
   * Create a new Pino logger instance with ECS-compliant formatting.
   * Uses @elastic/ecs-pino-format for Elastic Common Schema compliance.
   *
   * Dual-mode output:
   * - Production (NODE_ENV === "production" || "staging"): raw ECS NDJSON to stdout
   * - Development/Test (everything else): human-readable formatted output via custom destination
   */
  private createLogger(): pino.Logger {
    const { level, service } = this.config;

    // ECS format options - see https://www.elastic.co/docs/reference/ecs/logging/nodejs/pino
    const ecsOptions = ecsFormat({
      // Disable Elastic APM integration - we use OpenTelemetry directly
      apmIntegration: false,
      // Service metadata for ECS fields
      serviceName: service.name,
      serviceVersion: service.version,
      serviceEnvironment: service.environment,
      // Enable error conversion to ECS error fields
      convertErr: true,
      // Enable req/res conversion to ECS HTTP fields
      convertReqRes: true,
    });

    // Pino mixin injects OpenTelemetry trace context into every log record.
    // Uses ECS dot-notation (trace.id, span.id, transaction.id) for Elastic compatibility.
    // PinoInstrumentation's built-in mixin is disabled (disableLogCorrelation: true)
    // because it uses underscore format (trace_id, span_id) which conflicts with ECS.
    const traceMixin = (): Record<string, string> => {
      const span = trace.getActiveSpan();
      if (!span) return {};

      const ctx = span.spanContext();
      if (!isSpanContextValid(ctx)) return {};

      return {
        "trace.id": ctx.traceId,
        "span.id": ctx.spanId,
        "transaction.id": ctx.traceId,
      };
    };

    const pinoOptions: pino.LoggerOptions = {
      level: level === "silent" ? "silent" : level,
      // ECS format provides formatters and hooks
      ...ecsOptions,
      // Trace context mixin - runs on every log call
      mixin: traceMixin,
    };

    if (isProductionOutput()) {
      // Production: raw ECS NDJSON written directly to stdout.
      // Uses a simple write destination to ensure process.stdout.write captures output
      // (pino.destination({ dest: 1 }) bypasses process.stdout.write).
      const rawDestination = {
        write: (data: string) => {
          process.stdout.write(data);
        },
      };
      return pino(pinoOptions, rawDestination);
    }

    // Development/Test: human-readable formatted output.
    // Custom sync destination that formats output like Winston for console.
    // Avoids pino.transport() worker threads which have issues with Bun.
    const formattedDestination = {
      write: (data: string) => {
        try {
          const obj = JSON.parse(data);
          const formatted = this.formatLogLine(obj);
          process.stdout.write(formatted);
        } catch {
          // Fallback for non-JSON data
          process.stdout.write(data);
        }
      },
    };

    return pino(pinoOptions, formattedDestination);
  }

  // ILogger implementation

  debug(message: string, context?: LogContext): void {
    this.getLogger().debug(context || {}, message);
  }

  info(message: string, context?: LogContext): void {
    this.getLogger().info(context || {}, message);
  }

  warn(message: string, context?: LogContext): void {
    this.getLogger().warn(context || {}, message);
  }

  error(message: string, context?: LogContext): void {
    this.getLogger().error(context || {}, message);
  }

  child(bindings: LogContext): ILogger {
    // Create a child adapter with bound context
    return new PinoChildAdapter(this.getLogger().child(bindings));
  }

  async flush(): Promise<void> {
    const logger = this.getLogger();
    return new Promise((resolve) => {
      logger.flush();
      // OTLP logs are batched by PinoInstrumentation's OTelPinoStream
      // which flushes automatically. No explicit flush needed here.
      setTimeout(resolve, 50);
    });
  }

  reinitialize(): void {
    if (this.pinoInstance) {
      this.pinoInstance.flush();
    }
    this.pinoInstance = null;
    this.getLogger(); // Reinitialize console logger
  }

  // ITelemetryLogger implementation (backward compatibility with WinstonTelemetryLogger)

  logHttpRequest(
    method: string,
    path: string,
    statusCode: number,
    _duration: number,
    context?: LogContext
  ): void {
    this.info(`HTTP ${method} ${path} - ${statusCode}`, context);
  }

  logAuthenticationEvent(event: string, success: boolean, context?: LogContext): void {
    this.info(`Authentication: ${event} ${success ? "success" : "failed"}`, context);
  }

  logKongOperation(
    operation: string,
    responseTime: number,
    success: boolean,
    context?: LogContext
  ): void {
    this.info(`Kong: ${operation} (${responseTime}ms) ${success ? "success" : "failed"}`, context);
  }
}

/**
 * Child logger adapter for bound context
 */
class PinoChildAdapter implements ILogger {
  constructor(private readonly childLogger: pino.Logger) {}

  debug(message: string, context?: LogContext): void {
    this.childLogger.debug(context || {}, message);
  }

  info(message: string, context?: LogContext): void {
    this.childLogger.info(context || {}, message);
  }

  warn(message: string, context?: LogContext): void {
    this.childLogger.warn(context || {}, message);
  }

  error(message: string, context?: LogContext): void {
    this.childLogger.error(context || {}, message);
  }

  child(bindings: LogContext): ILogger {
    return new PinoChildAdapter(this.childLogger.child(bindings));
  }

  async flush(): Promise<void> {
    return new Promise((resolve) => {
      this.childLogger.flush();
      setTimeout(resolve, 50);
    });
  }

  reinitialize(): void {
    // Child loggers don't need reinitialization
  }
}
