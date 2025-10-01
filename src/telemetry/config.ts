/* src/telemetry/config.ts */

import { telemetryConfig as mainTelemetryConfig } from "../config/index";

export const telemetryConfig = mainTelemetryConfig;

export function getTelemetryConfig() {
  return telemetryConfig;
}

export type TelemetryConfig = typeof telemetryConfig;
