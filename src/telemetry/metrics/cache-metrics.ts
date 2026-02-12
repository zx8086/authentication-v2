/* src/telemetry/metrics/cache-metrics.ts */

import { error } from "../../utils/logger";
import {
  cacheTierErrorCounter,
  cacheTierLatencyHistogram,
  cacheTierUsageCounter,
  operationDurationHistogram,
} from "./instruments";
import { isMetricsInitialized } from "./state";
import type { CacheTierAttributes, ErrorAttributes } from "./types";

export function recordCacheTierUsage(tier: string, operation: string): void {
  if (!isMetricsInitialized()) return;

  const validTier = ["memory", "redis", "kong", "fallback"].includes(tier)
    ? (tier as "memory" | "redis" | "kong" | "fallback")
    : "fallback";
  const validOperation = ["get", "set", "delete", "invalidate"].includes(operation)
    ? (operation as "get" | "set" | "delete" | "invalidate")
    : "get";

  const attributes: CacheTierAttributes = {
    tier: validTier,
    operation: validOperation,
  };

  try {
    cacheTierUsageCounter.add(1, attributes);
  } catch (err) {
    error("Failed to record cache tier usage", {
      error: (err as Error).message,
      tier,
      operation,
    });
  }
}

export function recordCacheTierLatency(tier: string, operation: string, latencyMs: number): void {
  if (!isMetricsInitialized()) return;

  const validTier = ["memory", "redis", "kong", "fallback"].includes(tier)
    ? (tier as "memory" | "redis" | "kong" | "fallback")
    : "fallback";
  const validOperation = ["get", "set", "delete", "invalidate"].includes(operation)
    ? (operation as "get" | "set" | "delete" | "invalidate")
    : "get";

  const attributes: CacheTierAttributes = {
    tier: validTier,
    operation: validOperation,
  };

  try {
    cacheTierLatencyHistogram.record(latencyMs / 1000, attributes);
  } catch (err) {
    error("Failed to record cache tier latency", {
      error: (err as Error).message,
      tier,
      operation,
      latencyMs,
    });
  }
}

export function recordCacheTierError(tier: string, operation: string, errorType?: string): void {
  if (!isMetricsInitialized()) return;

  const attributes: ErrorAttributes = {
    error_type: errorType || "cache_error",
    operation,
    component: tier,
  };

  try {
    cacheTierErrorCounter.add(1, attributes);
  } catch (err) {
    error("Failed to record cache tier error", {
      error: (err as Error).message,
      tier,
      operation,
      errorType,
    });
  }
}

export function recordOperationDuration(
  operation: string,
  durationMs: number,
  component?: string | boolean
): void {
  if (!isMetricsInitialized()) return;

  try {
    const componentName = typeof component === "string" ? component : "unknown";
    operationDurationHistogram.record(durationMs / 1000, { operation, component: componentName });
  } catch (err) {
    error("Failed to record operation duration", {
      error: (err as Error).message,
      operation,
      component,
      durationMs,
    });
  }
}
