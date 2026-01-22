/* src/telemetry/winston-logger.ts */

import ecsFormat from "@elastic/ecs-winston-format";
import { trace } from "@opentelemetry/api";
import { OpenTelemetryTransportV3 } from "@opentelemetry/winston-transport";
import winston from "winston";
import pkg from "../../package.json" with { type: "json" };
import { loadConfig } from "../config/index";

const config = loadConfig();
const telemetryConfig = config.telemetry;

export class WinstonTelemetryLogger {
  private logger: winston.Logger | null = null;

  private initializeLogger(): winston.Logger {
    if (this.logger) {
      return this.logger;
    }

    let config: any;
    try {
      config = telemetryConfig;
    } catch (error) {
      console.warn("Could not load telemetry config, using fallback values:", error);
      config = {
        serviceName: "authentication-service",
        serviceVersion: pkg.version || "1.0.0",
        environment: "development",
        mode: "console",
      };
    }

    this.logger = winston.createLogger({
      level: config.logLevel || "info",
      silent: config.logLevel === "silent",
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        ecsFormat({
          convertErr: true,
          convertReqRes: true,
          apmIntegration: true,
          serviceName: config.serviceName,
          serviceVersion: config.serviceVersion,
          serviceEnvironment: config.environment,
        })
      ),
      transports: this.configureTransports(),
    });

    return this.logger;
  }

  private configureTransports(): winston.transport[] {
    const transports = [];
    let mode = "console";
    try {
      mode = telemetryConfig.mode || "console";
    } catch (_error) {
      console.warn("Could not access telemetry config mode, defaulting to console");
    }

    if (mode === "console" || mode === "both") {
      transports.push(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize({ all: true }),
            winston.format.simple()
          ),
        })
      );
    }

    if (mode === "otlp" || mode === "both") {
      transports.push(new OpenTelemetryTransportV3());
    }

    if (transports.length === 0) {
      transports.push(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize({ all: true }),
            winston.format.simple()
          ),
        })
      );
    }

    return transports;
  }

  private getTraceContext(): Record<string, any> {
    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      const spanContext = activeSpan.spanContext();
      return {
        "trace.id": spanContext.traceId,
        "span.id": spanContext.spanId,
      };
    }
    return {};
  }

  /**
   * Maps custom application fields to ECS (Elastic Common Schema) compliant field names
   * This ensures fields appear at top-level in Elasticsearch instead of nested under labels.*
   */
  private mapToEcsFields(context?: Record<string, any>): Record<string, any> {
    if (!context) return {};

    const ecsFields: Record<string, any> = {};

    // Map custom fields to ECS standard fields
    if (context.consumerId) {
      ecsFields["user.id"] = context.consumerId; // Consumer ID → user.id
    }
    if (context.username) {
      ecsFields["user.name"] = context.username; // Username → user.name
    }
    if (context.requestId) {
      ecsFields["event.id"] = context.requestId; // Request ID → event.id
    }
    if (context.totalDuration !== undefined) {
      ecsFields["event.duration"] = context.totalDuration; // Duration → event.duration (nanoseconds)
    }

    // Keep all other context fields as-is (will go to labels.* for non-ECS fields)
    Object.keys(context).forEach((key) => {
      if (!["consumerId", "username", "requestId", "totalDuration"].includes(key)) {
        ecsFields[key] = context[key];
      }
    });

    return ecsFields;
  }

  public info(message: string, context?: Record<string, any>): void {
    const ecsContext = this.mapToEcsFields(context);
    this.initializeLogger().info(message, { ...ecsContext, ...this.getTraceContext() });
  }

  public warn(message: string, context?: Record<string, any>): void {
    const ecsContext = this.mapToEcsFields(context);
    this.initializeLogger().warn(message, { ...ecsContext, ...this.getTraceContext() });
  }

  public error(message: string, context?: Record<string, any>): void {
    const ecsContext = this.mapToEcsFields(context);
    this.initializeLogger().error(message, { ...ecsContext, ...this.getTraceContext() });
  }

  public debug(message: string, context?: Record<string, any>): void {
    const ecsContext = this.mapToEcsFields(context);
    this.initializeLogger().debug(message, { ...ecsContext, ...this.getTraceContext() });
  }

  public logHttpRequest(
    method: string,
    path: string,
    statusCode: number,
    _duration: number,
    context?: Record<string, any>
  ): void {
    this.info(`HTTP ${method} ${path} - ${statusCode}`, context);
  }

  public logAuthenticationEvent(
    event: string,
    success: boolean,
    context?: Record<string, any>
  ): void {
    this.info(`Authentication: ${event} ${success ? "success" : "failed"}`, context);
  }

  public logKongOperation(
    operation: string,
    responseTime: number,
    success: boolean,
    context?: Record<string, any>
  ): void {
    this.info(`Kong: ${operation} (${responseTime}ms) ${success ? "success" : "failed"}`, context);
  }

  public async flush(): Promise<void> {
    return new Promise((resolve) => {
      const transports = this.initializeLogger().transports;
      let completed = 0;
      const total = transports.length;

      if (total === 0) {
        resolve();
        return;
      }

      transports.forEach((transport) => {
        transport.end(() => {
          completed++;
          if (completed === total) {
            resolve();
          }
        });
      });
    });
  }

  public reinitialize(): void {
    this.logger = null;
    const logger = this.initializeLogger();
    logger.clear();
    const transports = this.configureTransports();
    for (const transport of transports) {
      logger.add(transport);
    }
  }
}

export const winstonTelemetryLogger = new WinstonTelemetryLogger();

export const {
  info,
  warn,
  error,
  debug,
  logHttpRequest,
  logAuthenticationEvent,
  logKongOperation,
} = winstonTelemetryLogger;
