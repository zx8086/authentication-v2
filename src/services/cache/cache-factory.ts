/* src/services/cache/cache-factory.ts */

import { getCachingConfig } from "../../config";
import type { IKongCacheService } from "../../config/schemas";
import { winstonTelemetryLogger } from "../../telemetry/winston-logger";
import { LocalMemoryCache } from "./local-memory-cache";
import { SharedRedisCache } from "./shared-redis-cache";

export class CacheFactory {
  static createKongCache(): IKongCacheService {
    const config = getCachingConfig();

    if (config.highAvailability) {
      winstonTelemetryLogger.info("Initializing Shared Redis Cache (HA Mode)", {
        redisUrl: config.redisUrl || "redis://localhost:6379",
        redisDb: config.redisDb,
        ttlSeconds: config.ttlSeconds,
        component: "cache",
        operation: "initialization",
        strategy: "shared-redis",
      });
      return new SharedRedisCache({
        url: config.redisUrl || "redis://localhost:6379",
        password: config.redisPassword,
        db: config.redisDb,
        ttlSeconds: config.ttlSeconds,
      });
    } else {
      winstonTelemetryLogger.info("Initializing Local Memory Cache (Single Instance Mode)", {
        ttlSeconds: config.ttlSeconds,
        maxEntries: 1000,
        component: "cache",
        operation: "initialization",
        strategy: "local-memory",
      });
      return new LocalMemoryCache({
        ttlSeconds: config.ttlSeconds,
        maxEntries: 1000,
      });
    }
  }
}
