/* src/utils/logger.ts */

let winstonLogger: any = null;

function getWinstonLogger() {
  if (!winstonLogger) {
    try {
      const { winstonTelemetryLogger } = require("../telemetry/winston-logger");
      winstonLogger = winstonTelemetryLogger;
    } catch (error) {
      console.warn(
        "Could not load winston logger, falling back to console:",
        error,
      );
      winstonLogger = {
        info: (msg: string, ctx: any) =>
          console.log(
            JSON.stringify({
              "@timestamp": new Date().toISOString(),
              "log.level": "INFO",
              message: msg,
              service: {
                name: "authentication-service",
                environment: process.env.NODE_ENV || "development",
              },
              ...ctx,
            }),
          ),
        warn: (msg: string, ctx: any) =>
          console.warn(
            JSON.stringify({
              "@timestamp": new Date().toISOString(),
              "log.level": "WARN",
              message: msg,
              service: {
                name: "authentication-service",
                environment: process.env.NODE_ENV || "development",
              },
              ...ctx,
            }),
          ),
        error: (msg: string, ctx: any) =>
          console.error(
            JSON.stringify({
              "@timestamp": new Date().toISOString(),
              "log.level": "ERROR",
              message: msg,
              service: {
                name: "authentication-service",
                environment: process.env.NODE_ENV || "development",
              },
              ...ctx,
            }),
          ),
      };
    }
  }
  return winstonLogger;
}

export function log(message: string, context: Record<string, any> = {}) {
  getWinstonLogger().info(message, {
    service: {
      name: "authentication-service",
      environment: process.env.NODE_ENV || "development",
    },
    ...context,
  });
}

export function warn(message: string, context: Record<string, any> = {}) {
  getWinstonLogger().warn(message, {
    service: {
      name: "authentication-service",
      environment: process.env.NODE_ENV || "development",
    },
    ...context,
  });
}

export function error(message: string, context: Record<string, any> = {}) {
  getWinstonLogger().error(message, {
    service: {
      name: "authentication-service",
      environment: process.env.NODE_ENV || "development",
    },
    ...context,
  });
}

export const logger = { log, warn, error };
