/* src/telemetry/config.ts */

// Telemetry configuration re-export for centralized access

import { telemetryConfig as mainTelemetryConfig } from "../config/index";

export const telemetryConfig = mainTelemetryConfig;

export function getTelemetryConfig() {
  return telemetryConfig;
}

export type TelemetryConfig = typeof telemetryConfig;
