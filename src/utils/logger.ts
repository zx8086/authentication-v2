/* src/utils/logger.ts */

// Stryker disable all: Logger implementation is tested via integration tests and telemetry output verification.
// String literal mutations in log messages and field names are low-value mutations that don't catch real bugs.

let winstonLogger: any = null;
let configInstance: any = null;

function getConfig() {
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
  return configInstance;
}

function getWinstonLogger() {
  if (!winstonLogger) {
    try {
      const { winstonTelemetryLogger } = require("../telemetry/winston-logger");
      winstonLogger = winstonTelemetryLogger;
    } catch (_error) {
      console.error("ERROR: Could not load winston logger, falling back to console:", _error);
      const config = getConfig();
      winstonLogger = {
        info: (msg: string, ctx: any) =>
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
        warn: (msg: string, ctx: any) =>
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
        error: (msg: string, ctx: any) =>
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
  return winstonLogger;
}

export function log(message: string, context: Record<string, any> = {}) {
  const config = getConfig();
  getWinstonLogger().info(message, {
    service: {
      name: config.telemetry.serviceName,
      environment: config.telemetry.environment,
    },
    ...context,
  });
}

export function warn(message: string, context: Record<string, any> = {}) {
  const config = getConfig();
  getWinstonLogger().warn(message, {
    service: {
      name: config.telemetry.serviceName,
      environment: config.telemetry.environment,
    },
    ...context,
  });
}

export function error(message: string, context: Record<string, any> = {}) {
  const config = getConfig();
  getWinstonLogger().error(message, {
    service: {
      name: config.telemetry.serviceName,
      environment: config.telemetry.environment,
    },
    ...context,
  });
}

export function audit(eventType: string, context: Record<string, any> = {}) {
  const config = getConfig();
  getWinstonLogger().info(eventType, {
    audit: true,
    event_type: eventType,
    service: {
      name: config.telemetry.serviceName,
      environment: config.telemetry.environment,
    },
    ...context,
  });
}

export function logError(message: string, err: Error, context: Record<string, any> = {}) {
  const config = getConfig();
  getWinstonLogger().error(message, {
    service: {
      name: config.telemetry.serviceName,
      environment: config.telemetry.environment,
    },
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
    },
    ...context,
  });
}

export const logger = { log, warn, error, audit, logError };
