/* src/services/cache/local-memory-cache.ts */

import type {
  ConsumerSecret,
  GenericCacheEntry,
  IKongCacheService,
  KongCacheStats,
} from "../../config/schemas";

export class LocalMemoryCache implements IKongCacheService {
  private cache = new Map<string, GenericCacheEntry<ConsumerSecret>>();
  private staleCache = new Map<string, GenericCacheEntry<ConsumerSecret>>();
  private stats = {
    hits: 0,
    misses: 0,
    totalLatency: 0,
    operations: 0,
  };

  constructor(private config: { ttlSeconds: number; maxEntries: number }) {}

  async get(key: string): Promise<ConsumerSecret | null> {
    const start = performance.now();

    const entry = this.cache.get(key);
    if (entry && Date.now() < entry.expires) {
      this.recordHit(performance.now() - start);
      return entry.data;
    }

    if (entry) {
      this.cache.delete(key);
    }

    this.recordMiss(performance.now() - start);
    return null;
  }

  async set(key: string, value: ConsumerSecret, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds || this.config.ttlSeconds;
    const now = Date.now();
    const entry: GenericCacheEntry<ConsumerSecret> = {
      data: value,
      expires: now + ttl * 1000,
      createdAt: now,
    };

    // Store in both regular and stale cache
    this.cache.set(key, entry);

    // Stale cache keeps data 24x longer
    const staleEntry: GenericCacheEntry<ConsumerSecret> = {
      data: value,
      expires: now + ttl * 1000 * 24,
      createdAt: now,
    };
    this.staleCache.set(key, staleEntry);

    this.enforceMaxEntries();
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  async getStats(): Promise<KongCacheStats> {
    const now = Date.now();
    let activeEntries = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now < entry.expires) {
        activeEntries++;
      } else {
        this.cache.delete(key);
      }
    }

    return {
      strategy: "local-memory",
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
      activeEntries,
      hitRate: this.calculateHitRate(),
      memoryUsageMB: this.estimateMemoryUsage(),
      averageLatencyMs: this.calculateAverageLatency(),
    };
  }

  private recordHit(latency: number): void {
    this.stats.hits++;
    this.stats.totalLatency += latency;
    this.stats.operations++;
  }

  private recordMiss(latency: number): void {
    this.stats.misses++;
    this.stats.totalLatency += latency;
    this.stats.operations++;
  }

  private calculateHitRate(): string {
    const total = this.stats.hits + this.stats.misses;
    if (total === 0) return "0.00";
    return ((this.stats.hits / total) * 100).toFixed(2);
  }

  private calculateAverageLatency(): number {
    return this.stats.operations > 0 ? this.stats.totalLatency / this.stats.operations : 0;
  }

  private estimateMemoryUsage(): number {
    return Math.round((this.cache.size * 1024) / 1024 / 1024);
  }

  private enforceMaxEntries(): void {
    if (this.cache.size > this.config.maxEntries) {
      const entries = Array.from(this.cache.entries()).sort(
        ([, a], [, b]) => a.createdAt - b.createdAt
      );

      const toRemove = entries.slice(0, this.cache.size - this.config.maxEntries);
      for (const [key] of toRemove) {
        this.cache.delete(key);
      }
    }

    // Also enforce for stale cache (allow 2x the normal limit)
    const staleMaxEntries = this.config.maxEntries * 2;
    if (this.staleCache.size > staleMaxEntries) {
      const staleEntries = Array.from(this.staleCache.entries()).sort(
        ([, a], [, b]) => a.createdAt - b.createdAt
      );

      const staleToRemove = staleEntries.slice(0, this.staleCache.size - staleMaxEntries);
      for (const [key] of staleToRemove) {
        this.staleCache.delete(key);
      }
    }
  }

  async getStale(key: string): Promise<ConsumerSecret | null> {
    const start = performance.now();

    const entry = this.staleCache.get(key);
    if (entry && Date.now() < entry.expires) {
      this.recordHit(performance.now() - start);
      return entry.data;
    }

    if (entry) {
      this.staleCache.delete(key);
    }

    this.recordMiss(performance.now() - start);
    return null;
  }

  async setStale(key: string, value: ConsumerSecret, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds || this.config.ttlSeconds;
    const now = Date.now();

    // Stale cache keeps data 24x longer
    const staleEntry: GenericCacheEntry<ConsumerSecret> = {
      data: value,
      expires: now + ttl * 1000 * 24,
      createdAt: now,
    };
    this.staleCache.set(key, staleEntry);
  }

  async clearStale(): Promise<void> {
    this.staleCache.clear();
  }
}
