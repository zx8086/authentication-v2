/* src/utils/logger.ts */

// Winston-based structured logger with ECS format and trace correlation
import { winstonTelemetryLogger } from '../telemetry/winston-logger';

export function log(message: string, context: Record<string, any> = {}) {
  winstonTelemetryLogger.info(message, {
    service: {
      name: "authentication-service",
      environment: process.env.NODE_ENV || "development",
    },
    ...context,
  });
}

export function warn(message: string, context: Record<string, any> = {}) {
  winstonTelemetryLogger.warn(message, {
    service: {
      name: "authentication-service",
      environment: process.env.NODE_ENV || "development",
    },
    ...context,
  });
}

export function error(message: string, context: Record<string, any> = {}) {
  winstonTelemetryLogger.error(message, {
    service: {
      name: "authentication-service",
      environment: process.env.NODE_ENV || "development",
    },
    ...context,
  });
}

export const logger = { log, warn, error };