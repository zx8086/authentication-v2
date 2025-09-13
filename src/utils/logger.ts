/* src/utils/logger.ts */

// Simple structured JSON logger
export function log(message: string, context: Record<string, any> = {}) {
  const structuredOutput = {
    "@timestamp": new Date().toISOString(),
    "log.level": "INFO",
    message,
    service: {
      name: "authentication-service",
      environment: process.env.NODE_ENV || "development",
    },
    ...context,
  };
  console.log(JSON.stringify(structuredOutput));
}

export function warn(message: string, context: Record<string, any> = {}) {
  const structuredOutput = {
    "@timestamp": new Date().toISOString(),
    "log.level": "WARN",
    message,
    service: {
      name: "authentication-service",
      environment: process.env.NODE_ENV || "development",
    },
    ...context,
  };
  console.warn(JSON.stringify(structuredOutput));
}

export function error(message: string, context: Record<string, any> = {}) {
  const structuredOutput = {
    "@timestamp": new Date().toISOString(),
    "log.level": "ERROR",
    message,
    service: {
      name: "authentication-service",
      environment: process.env.NODE_ENV || "development",
    },
    ...context,
  };
  console.error(JSON.stringify(structuredOutput));
}

export const logger = { log, warn, error };