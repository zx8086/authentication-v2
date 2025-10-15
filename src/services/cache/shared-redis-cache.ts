/* src/services/cache/shared-redis-cache.ts */

import { RedisClient } from "bun";
import type { ConsumerSecret, IKongCacheService, KongCacheStats } from "../../config/schemas";
import { recordRedisConnection } from "../../telemetry/metrics";
import {
  instrumentRedisOperation,
  type RedisOperationContext,
} from "../../telemetry/redis-instrumentation";
import { winstonTelemetryLogger } from "../../telemetry/winston-logger";

export class SharedRedisCache implements IKongCacheService {
  private client!: RedisClient;
  private keyPrefix = "auth_service:";
  private staleKeyPrefix = "auth_service_stale:";
  private stats = {
    hits: 0,
    misses: 0,
    totalLatency: 0,
    operations: 0,
  };

  constructor(
    private config: {
      url: string;
      password?: string;
      db: number;
      ttlSeconds: number;
      staleDataToleranceMinutes?: number;
    }
  ) {}

  async connect(): Promise<void> {
    const context: RedisOperationContext = {
      operation: "CONNECT",
      connectionUrl: this.config.url,
      database: this.config.db,
    };

    return instrumentRedisOperation(context, async () => {
      const redisUrl = this.config.password
        ? this.config.url.replace("redis://", `redis://:${this.config.password}@`)
        : this.config.url;

      this.client = new RedisClient(redisUrl, {
        connectionTimeout: 5000,
        autoReconnect: true,
        maxRetries: 3,
        enableOfflineQueue: true,
      });

      await this.client.connect();

      if (this.config.db > 0) {
        await this.client.send("SELECT", [this.config.db.toString()]);
      }

      await this.client.send("PING", []);
      recordRedisConnection(true);
      winstonTelemetryLogger.info("Connected to Redis using Bun native client", {
        redisUrl: this.config.url,
        redisDb: this.config.db,
        component: "cache",
        operation: "connection",
        strategy: "shared-redis",
        client: "bun-native",
      });
    }).catch((error) => {
      winstonTelemetryLogger.warn("Failed to connect to Redis, will use graceful fallback", {
        error: error instanceof Error ? error.message : "Unknown error",
        component: "cache",
        operation: "connection_failed",
        strategy: "shared-redis",
        client: "bun-native",
      });
      throw error;
    });
  }

  async get(key: string): Promise<ConsumerSecret | null> {
    const redisKey = this.keyPrefix + key;
    const context: RedisOperationContext = {
      operation: "GET",
      key: redisKey,
      connectionUrl: this.config.url,
      database: this.config.db,
    };

    const start = performance.now();

    return instrumentRedisOperation(context, async () => {
      const cached = await this.client.get(redisKey);
      if (cached) {
        this.recordHit(performance.now() - start);
        return JSON.parse(cached);
      }

      this.recordMiss(performance.now() - start);
      return null;
    }).catch((error) => {
      winstonTelemetryLogger.warn("Redis get operation failed, falling back to null", {
        error: error instanceof Error ? error.message : "Unknown error",
        component: "cache",
        operation: "get_failed",
        key,
        client: "bun-native",
      });
      this.recordMiss(performance.now() - start);
      return null;
    });
  }

  async set(key: string, value: ConsumerSecret, ttlSeconds?: number): Promise<void> {
    const redisKey = this.keyPrefix + key;
    const staleRedisKey = this.staleKeyPrefix + key;
    const context: RedisOperationContext = {
      operation: "SET",
      key: redisKey,
      connectionUrl: this.config.url,
      database: this.config.db,
    };

    return instrumentRedisOperation(context, async () => {
      const ttl = ttlSeconds || this.config.ttlSeconds;
      const staleTtlMinutes = this.config.staleDataToleranceMinutes || 30;
      const staleTtl = staleTtlMinutes * 60; // Convert minutes to seconds

      await this.client.set(redisKey, JSON.stringify(value));
      await this.client.expire(redisKey, ttl);

      // Also store in stale cache with consistent tolerance
      await this.client.set(staleRedisKey, JSON.stringify(value));
      await this.client.expire(staleRedisKey, staleTtl);
    }).catch((error) => {
      winstonTelemetryLogger.warn("Redis set operation failed", {
        error: error instanceof Error ? error.message : "Unknown error",
        component: "cache",
        operation: "set_failed",
        key,
        client: "bun-native",
      });
    });
  }

  async delete(key: string): Promise<void> {
    const redisKey = this.keyPrefix + key;
    const context: RedisOperationContext = {
      operation: "DELETE",
      key: redisKey,
      connectionUrl: this.config.url,
      database: this.config.db,
    };

    return instrumentRedisOperation(context, async () => {
      await this.client.del(redisKey);
    }).catch((error) => {
      winstonTelemetryLogger.warn("Redis delete operation failed", {
        error: error instanceof Error ? error.message : "Unknown error",
        component: "cache",
        operation: "delete_failed",
        key,
        client: "bun-native",
      });
    });
  }

  async clear(): Promise<void> {
    try {
      // Use SCAN instead of KEYS for better performance and reliability
      let cursor = "0";
      do {
        const result = (await this.client.send("SCAN", [
          cursor,
          "MATCH",
          `${this.keyPrefix}*`,
          "COUNT",
          "100",
        ])) as [string, string[]];
        cursor = result[0];
        const keys = result[1];

        if (keys.length > 0) {
          await this.client.del(...keys);
        }
      } while (cursor !== "0");
    } catch (error) {
      winstonTelemetryLogger.warn("Redis clear operation failed", {
        error: error instanceof Error ? error.message : "Unknown error",
        component: "cache",
        operation: "clear_failed",
        client: "bun-native",
      });
    }
  }

  async getStats(): Promise<KongCacheStats> {
    try {
      // Use SCAN instead of KEYS for better performance
      const keys: string[] = [];
      let cursor = "0";
      do {
        const result = (await this.client.send("SCAN", [
          cursor,
          "MATCH",
          `${this.keyPrefix}*`,
          "COUNT",
          "100",
        ])) as [string, string[]];
        cursor = result[0];
        keys.push(...result[1]);
      } while (cursor !== "0");

      const totalEntries = keys.length;
      const sampleSize = Math.min(10, totalEntries);
      const sampleKeys = keys.slice(0, sampleSize);
      let activeCount = 0;

      for (const key of sampleKeys) {
        try {
          const ttl = (await this.client.send("TTL", [key])) as number;
          if (ttl > 0) activeCount++;
        } catch (_error) {
          // Skip this key if TTL check fails
        }
      }

      const activeRatio = totalEntries > 0 ? activeCount / sampleSize : 0;
      const estimatedActive = Math.round(totalEntries * activeRatio);

      return {
        strategy: "shared-redis",
        size: totalEntries,
        entries: keys.map((key) => key.replace(this.keyPrefix, "")), // Strip prefix for cleaner interface
        activeEntries: estimatedActive,
        hitRate: this.calculateHitRate(),
        redisConnected: true,
        averageLatencyMs: this.calculateAverageLatency(),
      };
    } catch (error) {
      winstonTelemetryLogger.warn("Failed to get Redis stats", {
        error: error instanceof Error ? error.message : "Unknown error",
        component: "cache",
        operation: "stats_failed",
        client: "bun-native",
      });
      return {
        strategy: "shared-redis",
        size: 0,
        entries: [],
        activeEntries: 0,
        hitRate: "0.00",
        redisConnected: false,
        averageLatencyMs: 0,
      };
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      recordRedisConnection(false);
      winstonTelemetryLogger.info("Disconnected from Redis", {
        component: "cache",
        operation: "disconnection",
        strategy: "shared-redis",
        client: "bun-native",
      });
    }
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

  getClientForHealthCheck(): RedisClient | null {
    return this.client || null;
  }

  async getStale(key: string): Promise<ConsumerSecret | null> {
    const staleRedisKey = this.staleKeyPrefix + key;
    const context: RedisOperationContext = {
      operation: "GET_STALE",
      key: staleRedisKey,
      connectionUrl: this.config.url,
      database: this.config.db,
    };

    const start = performance.now();

    return instrumentRedisOperation(context, async () => {
      const cached = await this.client.get(staleRedisKey);
      if (cached) {
        this.recordHit(performance.now() - start);
        winstonTelemetryLogger.info("Retrieved stale cache data", {
          key,
          component: "cache",
          operation: "get_stale_success",
          client: "bun-native",
        });
        return JSON.parse(cached);
      }

      this.recordMiss(performance.now() - start);
      return null;
    }).catch((error) => {
      winstonTelemetryLogger.warn("Redis get stale operation failed", {
        error: error instanceof Error ? error.message : "Unknown error",
        component: "cache",
        operation: "get_stale_failed",
        key,
        client: "bun-native",
      });
      this.recordMiss(performance.now() - start);
      return null;
    });
  }

  async setStale(key: string, value: ConsumerSecret, _ttlSeconds?: number): Promise<void> {
    const staleRedisKey = this.staleKeyPrefix + key;
    const context: RedisOperationContext = {
      operation: "SET_STALE",
      key: staleRedisKey,
      connectionUrl: this.config.url,
      database: this.config.db,
    };

    return instrumentRedisOperation(context, async () => {
      const staleTtlMinutes = this.config.staleDataToleranceMinutes || 30;
      const staleTtl = staleTtlMinutes * 60; // Convert minutes to seconds

      await this.client.set(staleRedisKey, JSON.stringify(value));
      await this.client.expire(staleRedisKey, staleTtl);
    }).catch((error) => {
      winstonTelemetryLogger.warn("Redis set stale operation failed", {
        error: error instanceof Error ? error.message : "Unknown error",
        component: "cache",
        operation: "set_stale_failed",
        key,
        client: "bun-native",
      });
    });
  }

  async clearStale(): Promise<void> {
    try {
      let cursor = "0";
      do {
        const result = (await this.client.send("SCAN", [
          cursor,
          "MATCH",
          `${this.staleKeyPrefix}*`,
          "COUNT",
          "100",
        ])) as [string, string[]];
        cursor = result[0];
        const keys = result[1];

        if (keys.length > 0) {
          await this.client.del(...keys);
        }
      } while (cursor !== "0");

      winstonTelemetryLogger.info("Cleared stale cache", {
        component: "cache",
        operation: "clear_stale_success",
        client: "bun-native",
      });
    } catch (error) {
      winstonTelemetryLogger.warn("Redis clear stale operation failed", {
        error: error instanceof Error ? error.message : "Unknown error",
        component: "cache",
        operation: "clear_stale_failed",
        client: "bun-native",
      });
    }
  }
}
