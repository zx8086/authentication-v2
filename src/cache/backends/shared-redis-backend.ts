/* src/cache/backends/shared-redis-backend.ts */

import type { KongCacheStats } from "../../config/schemas";
import { SharedRedisCache } from "../../services/cache/shared-redis-cache";
import type { CacheStrategy, ICacheBackend } from "../cache.interface";

interface SharedRedisBackendConfig {
  url: string;
  password?: string;
  db: number;
  ttlSeconds: number;
  staleDataToleranceMinutes: number;
}

export class SharedRedisBackend implements ICacheBackend {
  readonly strategy: CacheStrategy = "shared-redis";
  readonly name: string = "SharedRedisBackend";

  private cache: SharedRedisCache;

  constructor(config: SharedRedisBackendConfig) {
    this.cache = new SharedRedisCache({
      url: config.url,
      password: config.password,
      db: config.db,
      ttlSeconds: config.ttlSeconds,
    });
  }

  async get<T>(key: string): Promise<T | null> {
    return (await this.cache.get(key)) as T | null;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    await this.cache.set(key, value as any, ttl);
  }

  async delete(key: string): Promise<void> {
    await this.cache.delete(key);
  }

  async clear(): Promise<void> {
    await this.cache.clear();
  }

  async getStats(): Promise<KongCacheStats> {
    return await this.cache.getStats();
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.cache.getStats();
      return true;
    } catch {
      return false;
    }
  }

  async getStale<T>(key: string): Promise<T | null> {
    return (await this.cache.getStale(key)) as T | null;
  }

  async connect(): Promise<void> {
    await this.cache.connect();
  }

  async disconnect(): Promise<void> {
    await this.cache.disconnect();
  }
}
