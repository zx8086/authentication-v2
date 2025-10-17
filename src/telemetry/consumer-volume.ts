/* src/telemetry/consumer-volume.ts */

/**
 * KISS Consumer Volume Classification
 *
 * Simple 3-bucket classification based on requests per hour:
 * - high: >5K requests/hour (enterprise level)
 * - medium: 100-5K requests/hour (business level)
 * - low: <100 requests/hour (basic usage)
 */

// Simple in-memory consumer request tracking
const consumerRequestCounts = new Map<string, number>();

/**
 * Increment request count for a consumer
 */
export function incrementConsumerRequest(consumerId: string): void {
  if (!consumerId) return;

  const current = consumerRequestCounts.get(consumerId) || 0;
  consumerRequestCounts.set(consumerId, current + 1);
}

/**
 * Get volume bucket classification for a consumer
 */
export function getVolumeBucket(consumerId: string): string {
  if (!consumerId) return "low";

  const hourlyCount = consumerRequestCounts.get(consumerId) || 0;

  if (hourlyCount > 5000) return "high"; // >5K/hour (enterprise)
  if (hourlyCount > 100) return "medium"; // 100-5K/hour (business)
  return "low"; // <100/hour (basic)
}

/**
 * Get consumer count by volume bucket
 */
export function getConsumerCountByVolume(volume: "high" | "medium" | "low"): number {
  let count = 0;

  for (const [consumerId] of consumerRequestCounts) {
    if (getVolumeBucket(consumerId) === volume) {
      count++;
    }
  }

  return count;
}

/**
 * Get all consumer volume statistics
 */
export function getConsumerVolumeStats(): {
  high: number;
  medium: number;
  low: number;
  total: number;
} {
  return {
    high: getConsumerCountByVolume("high"),
    medium: getConsumerCountByVolume("medium"),
    low: getConsumerCountByVolume("low"),
    total: consumerRequestCounts.size,
  };
}

// Reset counts every hour to maintain hourly classification
const HOUR_IN_MS = 60 * 60 * 1000;
setInterval(() => {
  consumerRequestCounts.clear();
}, HOUR_IN_MS);
