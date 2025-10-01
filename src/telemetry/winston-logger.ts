/* src/telemetry/winston-logger.ts */

import ecsFormat from "@elastic/ecs-winston-format";
import { trace } from "@opentelemetry/api";
import { OpenTelemetryTransportV3 } from "@opentelemetry/winston-transport";
import winston from "winston";
import { telemetryConfig } from "./config";

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
        serviceVersion: "1.0.0",
        environment: "development",
        mode: "console",
      };
    }

    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || "info",
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

    if (mode === "otlp") {
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

  public info(message: string, context?: Record<string, any>): void {
    this.initializeLogger().info(message, { ...context, ...this.getTraceContext() });
  }

  public warn(message: string, context?: Record<string, any>): void {
    this.initializeLogger().warn(message, { ...context, ...this.getTraceContext() });
  }

  public error(message: string, context?: Record<string, any>): void {
    this.initializeLogger().error(message, { ...context, ...this.getTraceContext() });
  }

  public debug(message: string, context?: Record<string, any>): void {
    this.initializeLogger().debug(message, { ...context, ...this.getTraceContext() });
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
