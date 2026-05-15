/* src/telemetry/metrics/consumer-metrics.ts */

import { error } from "../../utils/logger";
import {
  consumerErrorsByVolumeCounter,
  consumerLatencyByVolumeHistogram,
  consumerRequestsByVolumeCounter,
} from "./instruments";
import { isMetricsInitialized } from "./state";
import type { ConsumerVolumeAttributes } from "./types";

export function recordConsumerRequest(volume: string): void {
  if (!isMetricsInitialized()) return;

  const attributes: ConsumerVolumeAttributes = {
    volume_category: volume as "high" | "medium" | "low",
    consumer_id: "unknown",
  };

  try {
    consumerRequestsByVolumeCounter.add(1, attributes);
  } catch (err) {
    error("Failed to record consumer request", {
      event_name: "metrics.consumer.record_failed",
      error: (err as Error).message,
      volume,
    });
  }
}

export function recordConsumerError(volume: string): void {
  if (!isMetricsInitialized()) return;

  const attributes: ConsumerVolumeAttributes = {
    volume_category: volume as "high" | "medium" | "low",
    consumer_id: "unknown",
  };

  try {
    consumerErrorsByVolumeCounter.add(1, attributes);
  } catch (err) {
    error("Failed to record consumer error", {
      event_name: "metrics.consumer.record_failed",
      error: (err as Error).message,
      volume,
    });
  }
}

export function recordConsumerLatency(volume: string, durationMs: number): void {
  if (!isMetricsInitialized()) return;

  const attributes: ConsumerVolumeAttributes = {
    volume_category: volume as "high" | "medium" | "low",
    consumer_id: "unknown",
  };

  try {
    consumerLatencyByVolumeHistogram.record(durationMs / 1000, attributes);
  } catch (err) {
    error("Failed to record consumer latency", {
      event_name: "metrics.consumer.record_failed",
      error: (err as Error).message,
      volume,
      durationMs,
    });
  }
}
