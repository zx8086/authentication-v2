/* src/telemetry/winston-logger.ts */

// Winston-based telemetry logger with ECS format and TELEMETRY_MODE support
import winston from "winston";
import ecsFormat from "@elastic/ecs-winston-format";
import { OpenTelemetryTransportV3 } from "@opentelemetry/winston-transport";
import { trace } from "@opentelemetry/api";
import { telemetryConfig } from "./config";

// Telemetry logger class with specialized methods
export class WinstonTelemetryLogger {
  private logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || "info",
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        ecsFormat({
          convertErr: true,        // Convert err field to ECS error fields
          convertReqRes: true,     // Convert req/res to ECS HTTP fields
          apmIntegration: true,    // Enable APM integration for trace correlation
          serviceName: telemetryConfig.serviceName,
          serviceVersion: telemetryConfig.serviceVersion,
          serviceEnvironment: telemetryConfig.deploymentEnvironment,
        }),
      ),
      transports: this.configureTransports(),
    });
  }

  private configureTransports(): winston.transport[] {
    const transports = [];
    const mode = telemetryConfig.telemetryMode;

    // Console transport for 'console' or 'both' mode
    if (mode === "console" || mode === "both") {
      transports.push(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize({ all: true }),
            winston.format.simple(),
          ),
        }),
      );
    }

    // OpenTelemetry transport for 'otlp' or 'both' mode
    if (mode === "otlp" || mode === "both") {
      transports.push(new OpenTelemetryTransportV3());
    }

    return transports;
  }

  // Helper to get current OpenTelemetry trace context
  private getTraceContext(): Record<string, any> {
    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      const spanContext = activeSpan.spanContext();
      return {
        'trace.id': spanContext.traceId,
        'span.id': spanContext.spanId,
      };
    }
    return {};
  }

  // Core logging methods - add trace correlation manually to ensure it works
  public info(message: string, context?: Record<string, any>): void {
    this.logger.info(message, { ...context, ...this.getTraceContext() });
  }

  public warn(message: string, context?: Record<string, any>): void {
    this.logger.warn(message, { ...context, ...this.getTraceContext() });
  }

  public error(message: string, context?: Record<string, any>): void {
    this.logger.error(message, { ...context, ...this.getTraceContext() });
  }

  public debug(message: string, context?: Record<string, any>): void {
    this.logger.debug(message, { ...context, ...this.getTraceContext() });
  }

  // Specialized logging methods - simplified for ECS compatibility
  public logHttpRequest(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    context?: Record<string, any>,
  ): void {
    this.info(`HTTP ${method} ${path} - ${statusCode}`, context);
  }

  public logAuthenticationEvent(
    event: string,
    success: boolean,
    context?: Record<string, any>,
  ): void {
    this.info(`Authentication: ${event} ${success ? 'success' : 'failed'}`, context);
  }

  public logKongOperation(
    operation: string,
    responseTime: number,
    success: boolean,
    context?: Record<string, any>,
  ): void {
    this.info(`Kong: ${operation} (${responseTime}ms) ${success ? 'success' : 'failed'}`, context);
  }


  // Utility method to flush logs (for graceful shutdown)
  public async flush(): Promise<void> {
    return new Promise((resolve) => {
      const transports = this.logger.transports;
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

  // Method to reinitialize (for testing different modes)
  public reinitialize(): void {
    this.logger.clear();
    this.logger.add(...this.configureTransports());
  }
}

// Export singleton instance
export const winstonTelemetryLogger = new WinstonTelemetryLogger();

// Also export individual methods for convenience
export const {
  info,
  warn,
  error,
  debug,
  logHttpRequest,
  logAuthenticationEvent,
  logKongOperation,
} = winstonTelemetryLogger;
