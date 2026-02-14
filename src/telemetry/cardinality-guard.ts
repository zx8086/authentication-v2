// src/telemetry/cardinality-guard.ts

import { loadConfig } from "../config/index";

const config = loadConfig();

const CARDINALITY_CONFIG = {
  maxUniqueConsumers: 1000,
  hashBuckets: 256,
  resetIntervalMs: 60 * 60 * 1000,
  warningThresholdPercent: 80,
};

const trackedConsumerIds = new Set<string>();

let cardinalityLimitExceeded = false;
let lastResetTime = Date.now();

let cardinalityResetIntervalId: ReturnType<typeof setInterval> | null = null;

const cardinalityStats = {
  uniqueConsumersTracked: 0,
  bucketsUsed: 0,
  totalRequests: 0,
  limitExceededAt: null as number | null,
  warningsEmitted: 0,
};

function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return hash >>> 0;
}

export function getBoundedConsumerId(consumerId: string): string {
  if (!consumerId) {
    return "unknown";
  }

  cardinalityStats.totalRequests++;

  if (trackedConsumerIds.has(consumerId)) {
    return consumerId;
  }

  if (trackedConsumerIds.size < CARDINALITY_CONFIG.maxUniqueConsumers) {
    trackedConsumerIds.add(consumerId);
    cardinalityStats.uniqueConsumersTracked = trackedConsumerIds.size;

    const usagePercent = (trackedConsumerIds.size / CARDINALITY_CONFIG.maxUniqueConsumers) * 100;
    if (usagePercent >= CARDINALITY_CONFIG.warningThresholdPercent && !cardinalityLimitExceeded) {
      cardinalityStats.warningsEmitted++;
    }

    return consumerId;
  }

  if (!cardinalityLimitExceeded) {
    cardinalityLimitExceeded = true;
    cardinalityStats.limitExceededAt = Date.now();
  }

  const bucket = hashString(consumerId) % CARDINALITY_CONFIG.hashBuckets;
  cardinalityStats.bucketsUsed = Math.max(cardinalityStats.bucketsUsed, bucket + 1);

  return `bucket_${bucket.toString().padStart(3, "0")}`;
}

export function getHashBucketedConsumerId(consumerId: string): string {
  if (!consumerId) {
    return "bucket_unknown";
  }

  const bucket = hashString(consumerId) % CARDINALITY_CONFIG.hashBuckets;
  return `bucket_${bucket.toString().padStart(3, "0")}`;
}

export function isConsumerTrackedIndividually(consumerId: string): boolean {
  return trackedConsumerIds.has(consumerId);
}

export function getCardinalityStats(): {
  uniqueConsumersTracked: number;
  maxUniqueConsumers: number;
  usagePercent: number;
  limitExceeded: boolean;
  limitExceededAt: number | null;
  bucketsUsed: number;
  totalBuckets: number;
  totalRequests: number;
  warningsEmitted: number;
  timeSinceReset: number;
} {
  return {
    uniqueConsumersTracked: cardinalityStats.uniqueConsumersTracked,
    maxUniqueConsumers: CARDINALITY_CONFIG.maxUniqueConsumers,
    usagePercent:
      (cardinalityStats.uniqueConsumersTracked / CARDINALITY_CONFIG.maxUniqueConsumers) * 100,
    limitExceeded: cardinalityLimitExceeded,
    limitExceededAt: cardinalityStats.limitExceededAt,
    bucketsUsed: cardinalityStats.bucketsUsed,
    totalBuckets: CARDINALITY_CONFIG.hashBuckets,
    totalRequests: cardinalityStats.totalRequests,
    warningsEmitted: cardinalityStats.warningsEmitted,
    timeSinceReset: Date.now() - lastResetTime,
  };
}

export function resetCardinalityTracking(): void {
  trackedConsumerIds.clear();
  cardinalityLimitExceeded = false;
  lastResetTime = Date.now();
  cardinalityStats.uniqueConsumersTracked = 0;
  cardinalityStats.bucketsUsed = 0;
  cardinalityStats.totalRequests = 0;
  cardinalityStats.limitExceededAt = null;
}

export function getCardinalityWarningLevel(): "ok" | "warning" | "critical" {
  const usagePercent = (trackedConsumerIds.size / CARDINALITY_CONFIG.maxUniqueConsumers) * 100;

  if (cardinalityLimitExceeded || usagePercent >= 100) {
    return "critical";
  }
  if (usagePercent >= CARDINALITY_CONFIG.warningThresholdPercent) {
    return "warning";
  }
  return "ok";
}

if (config.server.nodeEnv !== "test") {
  cardinalityResetIntervalId = setInterval(() => {
    resetCardinalityTracking();
  }, CARDINALITY_CONFIG.resetIntervalMs);
}

export function shutdownCardinalityGuard(): void {
  if (cardinalityResetIntervalId) {
    clearInterval(cardinalityResetIntervalId);
    cardinalityResetIntervalId = null;
  }
  trackedConsumerIds.clear();
}
