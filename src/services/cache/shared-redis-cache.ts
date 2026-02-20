// src/services/cache/shared-redis-cache.ts

import { RedisClient } from "bun";
import {
  type ConsumerSecret,
  ConsumerSecretLenientSchema,
  type IKongCacheService,
  type KongCacheStats,
} from "../../config/schemas";
import { recordCacheOperation, recordRedisConnection } from "../../telemetry/metrics";
import {
  instrumentRedisOperation,
  type RedisOperationContext,
} from "../../telemetry/redis-instrumentation";
import { winstonTelemetryLogger } from "../../telemetry/winston-logger";
import { validateExternalData } from "../../utils/validation";

export class SharedRedisCache implements IKongCacheService {
  private client: RedisClient | null = null;
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

  /**
   * Ensures the Redis client is connected before operations.
   * @throws Error if the client is not connected
   */
  private ensureConnected(): RedisClient {
    if (!this.client) {
      throw new Error("Redis client not connected. Call connect() first.");
    }
    return this.client;
  }

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

  async get<T = ConsumerSecret>(key: string): Promise<T | null> {
    const redisKey = this.keyPrefix + key;
    const context: RedisOperationContext = {
      operation: "GET",
      key: redisKey,
      connectionUrl: this.config.url,
      database: this.config.db,
    };

    const start = performance.now();

    return instrumentRedisOperation(context, async () => {
      const client = this.ensureConnected();
      const cached = await client.get(redisKey);
      if (cached) {
        this.recordHit(performance.now() - start);
        const parsed = JSON.parse(cached);
        const validationResult = validateExternalData(ConsumerSecretLenientSchema, parsed, {
          source: "redis_cache",
          operation: "get",
          consumerId: key.replace("consumer_secret:", ""),
        });
        return (validationResult.data ?? parsed) as T;
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

  async set<T = ConsumerSecret>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const typedValue = value as Record<string, unknown>;
    if (
      key.startsWith("consumer_secret:") &&
      typedValue.consumer &&
      typeof typedValue.consumer === "object" &&
      typedValue.consumer !== null
    ) {
      const consumer = typedValue.consumer as { id?: string };
      if (consumer.id) {
        const expectedConsumerId = key.replace("consumer_secret:", "");
        if (consumer.id !== expectedConsumerId) {
          winstonTelemetryLogger.error(
            `Cache key and consumer ID mismatch detected, preventing cache pollution`,
            {
              cacheKey: key,
              expectedConsumerId,
              actualConsumerId: consumer.id,
              component: "shared_redis_cache",
              action: "cache_pollution_prevention",
            }
          );
          return;
        }
      }
    }

    const redisKey = this.keyPrefix + key;
    const staleRedisKey = this.staleKeyPrefix + key;
    const context: RedisOperationContext = {
      operation: "SET",
      key: redisKey,
      connectionUrl: this.config.url,
      database: this.config.db,
    };

    return instrumentRedisOperation(context, async () => {
      const client = this.ensureConnected();
      const ttl = ttlSeconds || this.config.ttlSeconds;
      const staleTtlMinutes = this.config.staleDataToleranceMinutes || 30;
      const staleTtl = staleTtlMinutes * 60;

      await client.set(redisKey, JSON.stringify(value));
      await client.expire(redisKey, ttl);

      await client.set(staleRedisKey, JSON.stringify(value));
      await client.expire(staleRedisKey, staleTtl);
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
      const client = this.ensureConnected();
      await client.del(redisKey);
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
      const client = this.ensureConnected();
      let cursor = "0";
      do {
        const result = (await client.send("SCAN", [
          cursor,
          "MATCH",
          `${this.keyPrefix}*`,
          "COUNT",
          "100",
        ])) as [string, string[]];
        cursor = result[0];
        const keys = result[1];

        if (keys.length > 0) {
          await client.del(...keys);
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
      const client = this.ensureConnected();

      const primaryKeys: string[] = [];
      let primaryCursor = "0";
      do {
        const result = (await client.send("SCAN", [
          primaryCursor,
          "MATCH",
          `${this.keyPrefix}*`,
          "COUNT",
          "100",
        ])) as [string, string[]];
        primaryCursor = result[0];
        const nonStaleKeys = result[1].filter((key) => !key.startsWith(this.staleKeyPrefix));
        primaryKeys.push(...nonStaleKeys);
      } while (primaryCursor !== "0");

      const staleKeys: string[] = [];
      let staleCursor = "0";
      do {
        const result = (await client.send("SCAN", [
          staleCursor,
          "MATCH",
          `${this.staleKeyPrefix}*`,
          "COUNT",
          "100",
        ])) as [string, string[]];
        staleCursor = result[0];
        staleKeys.push(...result[1]);
      } while (staleCursor !== "0");

      const totalPrimaryEntries = primaryKeys.length;
      const sampleSize = Math.min(10, totalPrimaryEntries);
      const sampleKeys = primaryKeys.slice(0, sampleSize);
      let activeCount = 0;

      let ttlCheckErrors = 0;
      for (const key of sampleKeys) {
        try {
          const ttl = (await client.send("TTL", [key])) as number;
          if (ttl > 0) activeCount++;
        } catch {
          ttlCheckErrors++;
        }
      }
      if (ttlCheckErrors > 0) {
        winstonTelemetryLogger.debug("Some TTL checks failed during stats collection", {
          component: "shared_redis_cache",
          operation: "getStats",
          ttlCheckErrors,
          sampleSize,
        });
      }

      const activeRatio = totalPrimaryEntries > 0 ? activeCount / sampleSize : 0;
      const estimatedActive = Math.round(totalPrimaryEntries * activeRatio);
      const serverType = await this.getServerType();
      const primaryKeyNames = primaryKeys.map((key) => key.replace(this.keyPrefix, ""));

      return {
        strategy: "shared-redis",
        primary: {
          entries: totalPrimaryEntries,
          activeEntries: estimatedActive,
          keys: primaryKeyNames,
        },
        stale: {
          entries: staleKeys.length,
          keys: staleKeys.map((key) => key.replace(this.staleKeyPrefix, "")),
        },
        // Backward compatibility fields (aliases for primary cache values)
        size: totalPrimaryEntries,
        activeEntries: estimatedActive,
        hitRate: this.calculateHitRate(),
        redisConnected: true,
        averageLatencyMs: this.calculateAverageLatency(),
        serverType,
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
        primary: {
          entries: 0,
          activeEntries: 0,
        },
        stale: {
          entries: 0,
        },
        // Backward compatibility fields
        size: 0,
        activeEntries: 0,
        hitRate: "0.00",
        redisConnected: false,
        averageLatencyMs: 0,
      };
    }
  }

  async disconnect(): Promise<void> {
    const client = this.client;
    if (client) {
      await client.close();
      this.client = null;
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
    recordCacheOperation("hit", "redis");
  }

  private recordMiss(latency: number): void {
    this.stats.misses++;
    this.stats.totalLatency += latency;
    this.stats.operations++;
    recordCacheOperation("miss", "redis");
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

  async getServerType(): Promise<"redis" | "valkey"> {
    try {
      const client = this.ensureConnected();
      const info = (await client.send("INFO", ["server"])) as string;

      if (typeof info === "string" && info.toLowerCase().includes("valkey")) {
        return "valkey";
      }
      return "redis";
    } catch {
      return "redis";
    }
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
      const client = this.ensureConnected();
      const cached = await client.get(staleRedisKey);
      if (cached) {
        this.recordHit(performance.now() - start);
        winstonTelemetryLogger.info("Retrieved stale cache data", {
          key,
          component: "cache",
          operation: "get_stale_success",
          client: "bun-native",
        });
        const parsed = JSON.parse(cached);
        const validationResult = validateExternalData(ConsumerSecretLenientSchema, parsed, {
          source: "redis_cache",
          operation: "getStale",
          consumerId: key.replace("consumer_secret:", ""),
        });
        return (validationResult.data ?? parsed) as ConsumerSecret;
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
      const client = this.ensureConnected();
      const staleTtlMinutes = this.config.staleDataToleranceMinutes || 30;
      const staleTtl = staleTtlMinutes * 60;

      await client.set(staleRedisKey, JSON.stringify(value));
      await client.expire(staleRedisKey, staleTtl);
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
      const client = this.ensureConnected();
      let cursor = "0";
      do {
        const result = (await client.send("SCAN", [
          cursor,
          "MATCH",
          `${this.staleKeyPrefix}*`,
          "COUNT",
          "100",
        ])) as [string, string[]];
        cursor = result[0];
        const keys = result[1];

        if (keys.length > 0) {
          await client.del(...keys);
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
