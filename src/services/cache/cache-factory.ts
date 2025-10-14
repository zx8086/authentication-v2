/* src/services/cache/cache-factory.ts */

import { getCachingConfig } from "../../config";
import type { IKongCacheService } from "../../config/schemas";
import { winstonTelemetryLogger } from "../../telemetry/winston-logger";
import { LocalMemoryCache } from "./local-memory-cache";
import { SharedRedisCache } from "./shared-redis-cache";

export class CacheFactory {
  private static instance: IKongCacheService | null = null;
  private static currentConfig: string | null = null;
  private static initializationPromise: Promise<void> | null = null;

  static async createKongCache(): Promise<IKongCacheService> {
    const config = getCachingConfig();
    const configKey = `${config.highAvailability}-${config.redisUrl}-${config.redisDb}`;

    // Return existing instance if configuration hasn't changed
    if (CacheFactory.instance && CacheFactory.currentConfig === configKey) {
      return CacheFactory.instance;
    }

    // If we're already initializing with this config, wait for it
    if (CacheFactory.initializationPromise && CacheFactory.currentConfig === configKey) {
      await CacheFactory.initializationPromise;
      if (!CacheFactory.instance) {
        throw new Error("Cache initialization failed");
      }
      return CacheFactory.instance;
    }

    // Configuration changed or first time, create new instance
    CacheFactory.initializationPromise = CacheFactory.initializeCache(config, configKey);
    await CacheFactory.initializationPromise;
    CacheFactory.initializationPromise = null;

    if (!CacheFactory.instance) {
      throw new Error("Cache initialization failed");
    }
    return CacheFactory.instance;
  }

  private static async initializeCache(config: any, configKey: string): Promise<void> {
    if (config.highAvailability) {
      winstonTelemetryLogger.info("Initializing Shared Redis Cache (HA Mode)", {
        redisUrl: config.redisUrl || "redis://localhost:6379",
        redisDb: config.redisDb,
        ttlSeconds: config.ttlSeconds,
        component: "cache",
        operation: "initialization",
        strategy: "shared-redis",
      });

      const redisCache = new SharedRedisCache({
        url: config.redisUrl || "redis://localhost:6379",
        password: config.redisPassword,
        db: config.redisDb,
        ttlSeconds: config.ttlSeconds,
      });

      // Initialize Redis connection
      try {
        await redisCache.connect();
        CacheFactory.instance = redisCache;
      } catch (error) {
        winstonTelemetryLogger.warn(
          "Redis connection failed during initialization, will fallback on demand",
          {
            error: error instanceof Error ? error.message : "Unknown error",
            component: "cache",
            operation: "initialization_failed",
            strategy: "shared-redis",
          }
        );
        CacheFactory.instance = redisCache; // Still assign instance for lazy connection attempts
      }
    } else {
      winstonTelemetryLogger.info("Initializing Local Memory Cache (Single Instance Mode)", {
        ttlSeconds: config.ttlSeconds,
        maxEntries: 1000,
        component: "cache",
        operation: "initialization",
        strategy: "local-memory",
      });
      CacheFactory.instance = new LocalMemoryCache({
        ttlSeconds: config.ttlSeconds,
        maxEntries: 1000,
      });
    }

    CacheFactory.currentConfig = configKey;
  }

  // Method to reset the singleton (useful for testing)
  static reset(): void {
    CacheFactory.instance = null;
    CacheFactory.currentConfig = null;
  }
}
