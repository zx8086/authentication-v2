/* src/telemetry/cardinality-guard.ts */

import { loadConfig } from "../config/index";

const config = loadConfig();

// Configuration for cardinality limits
const CARDINALITY_CONFIG = {
  // Maximum number of unique consumer IDs to track individually
  maxUniqueConsumers: 1000,
  // Number of hash buckets when cardinality limit is exceeded
  hashBuckets: 256,
  // Interval to reset tracking (1 hour in milliseconds)
  resetIntervalMs: 60 * 60 * 1000,
  // Warning threshold (percentage of max before warning)
  warningThresholdPercent: 80,
};

// Track unique consumer IDs seen
const trackedConsumerIds = new Set<string>();

// Track when cardinality limit was exceeded
let cardinalityLimitExceeded = false;
let lastResetTime = Date.now();

// Cardinality statistics
const cardinalityStats = {
  uniqueConsumersTracked: 0,
  bucketsUsed: 0,
  totalRequests: 0,
  limitExceededAt: null as number | null,
  warningsEmitted: 0,
};

/**
 * Simple hash function for consistent bucketing
 * Uses djb2 algorithm for good distribution
 */
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return hash >>> 0; // Convert to unsigned 32-bit integer
}

/**
 * Get a bounded consumer ID for metrics to prevent cardinality explosion.
 *
 * Strategy:
 * 1. If under cardinality limit, track consumer ID directly
 * 2. If at/over limit, use hash bucketing for new IDs
 * 3. Already-tracked IDs continue to be tracked directly
 *
 * @param consumerId - The original consumer ID
 * @returns A bounded consumer ID safe for metric labels
 */
export function getBoundedConsumerId(consumerId: string): string {
  if (!consumerId) {
    return "unknown";
  }

  cardinalityStats.totalRequests++;

  // If already tracking this consumer, return it directly
  if (trackedConsumerIds.has(consumerId)) {
    return consumerId;
  }

  // Check if we're under the cardinality limit
  if (trackedConsumerIds.size < CARDINALITY_CONFIG.maxUniqueConsumers) {
    trackedConsumerIds.add(consumerId);
    cardinalityStats.uniqueConsumersTracked = trackedConsumerIds.size;

    // Emit warning if approaching limit
    const usagePercent = (trackedConsumerIds.size / CARDINALITY_CONFIG.maxUniqueConsumers) * 100;
    if (usagePercent >= CARDINALITY_CONFIG.warningThresholdPercent && !cardinalityLimitExceeded) {
      cardinalityStats.warningsEmitted++;
    }

    return consumerId;
  }

  // Cardinality limit exceeded - use hash bucketing
  if (!cardinalityLimitExceeded) {
    cardinalityLimitExceeded = true;
    cardinalityStats.limitExceededAt = Date.now();
  }

  // Hash the consumer ID to a bucket
  const bucket = hashString(consumerId) % CARDINALITY_CONFIG.hashBuckets;
  cardinalityStats.bucketsUsed = Math.max(cardinalityStats.bucketsUsed, bucket + 1);

  return `bucket_${bucket.toString().padStart(3, "0")}`;
}

/**
 * Get a hash-bucketed consumer ID regardless of cardinality state.
 * Use this for metrics that should always use bucketing.
 *
 * @param consumerId - The original consumer ID
 * @returns A bucketed consumer ID
 */
export function getHashBucketedConsumerId(consumerId: string): string {
  if (!consumerId) {
    return "bucket_unknown";
  }

  const bucket = hashString(consumerId) % CARDINALITY_CONFIG.hashBuckets;
  return `bucket_${bucket.toString().padStart(3, "0")}`;
}

/**
 * Check if a consumer ID is being tracked individually or bucketed.
 *
 * @param consumerId - The consumer ID to check
 * @returns true if tracked individually, false if bucketed
 */
export function isConsumerTrackedIndividually(consumerId: string): boolean {
  return trackedConsumerIds.has(consumerId);
}

/**
 * Get current cardinality statistics for monitoring.
 */
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

/**
 * Reset cardinality tracking. Called periodically to allow new consumers
 * to be tracked individually.
 */
export function resetCardinalityTracking(): void {
  trackedConsumerIds.clear();
  cardinalityLimitExceeded = false;
  lastResetTime = Date.now();
  cardinalityStats.uniqueConsumersTracked = 0;
  cardinalityStats.bucketsUsed = 0;
  cardinalityStats.totalRequests = 0;
  cardinalityStats.limitExceededAt = null;
  // Don't reset warningsEmitted - keep cumulative count
}

/**
 * Check if cardinality is approaching the limit.
 * Returns a warning level: "ok" | "warning" | "critical"
 */
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

// Set up periodic reset (hourly by default)
// Only in non-test environments
if (config.server.nodeEnv !== "test") {
  setInterval(() => {
    resetCardinalityTracking();
  }, CARDINALITY_CONFIG.resetIntervalMs);
}
