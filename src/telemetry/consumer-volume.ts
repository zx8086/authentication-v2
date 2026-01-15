/* src/telemetry/consumer-volume.ts */

// 3-bucket classification: high (>5K/hr), medium (100-5K/hr), low (<100/hr)
const consumerRequestCounts = new Map<string, number>();

export function incrementConsumerRequest(consumerId: string): void {
  if (!consumerId) return;

  const current = consumerRequestCounts.get(consumerId) || 0;
  consumerRequestCounts.set(consumerId, current + 1);
}

export function getVolumeBucket(consumerId: string): string {
  if (!consumerId) return "low";

  const hourlyCount = consumerRequestCounts.get(consumerId) || 0;

  if (hourlyCount > 5000) return "high";
  if (hourlyCount > 100) return "medium";
  return "low";
}

export function getConsumerCountByVolume(volume: "high" | "medium" | "low"): number {
  let count = 0;

  for (const [consumerId] of consumerRequestCounts) {
    if (getVolumeBucket(consumerId) === volume) {
      count++;
    }
  }

  return count;
}

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

// Reset counts hourly to maintain hourly classification
const HOUR_IN_MS = 60 * 60 * 1000;
setInterval(() => {
  consumerRequestCounts.clear();
}, HOUR_IN_MS);
