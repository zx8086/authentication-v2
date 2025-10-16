/* src/cache/cache-manager.ts */

import type { IKongCacheService, KongCacheStats } from "../config/schemas";
import { winstonTelemetryLogger } from "../telemetry/winston-logger";
import { LocalMemoryBackend } from "./backends/local-memory-backend";
import { SharedRedisBackend } from "./backends/shared-redis-backend";
import type {
  CacheManagerConfig,
  CacheStrategy,
  ICacheBackend,
  ICacheService,
} from "./cache.interface";

export class UnifiedCacheManager implements ICacheService, IKongCacheService {
  private backend: ICacheBackend | null = null;
  private config: CacheManagerConfig;
  private initializationPromise: Promise<void> | null = null;

  constructor(config: CacheManagerConfig) {
    this.config = config;
  }

  async get<T>(key: string): Promise<T | null> {
    await this.ensureInitialized();
    if (!this.backend) {
      throw new Error("Cache backend not initialized");
    }
    return await this.backend.get<T>(key);
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    await this.ensureInitialized();
    if (!this.backend) {
      throw new Error("Cache backend not initialized");
    }
    await this.backend.set(key, value, ttl);
  }

  async delete(key: string): Promise<void> {
    await this.ensureInitialized();
    if (!this.backend) {
      throw new Error("Cache backend not initialized");
    }
    await this.backend.delete(key);
  }

  async clear(): Promise<void> {
    await this.ensureInitialized();
    if (!this.backend) {
      throw new Error("Cache backend not initialized");
    }
    await this.backend.clear();
  }

  async getStats(): Promise<KongCacheStats> {
    await this.ensureInitialized();
    if (!this.backend) {
      throw new Error("Cache backend not initialized");
    }
    return await this.backend.getStats();
  }

  async isHealthy(): Promise<boolean> {
    await this.ensureInitialized();
    if (!this.backend) {
      return false;
    }
    return await this.backend.isHealthy();
  }

  async getStale<T>(key: string): Promise<T | null> {
    await this.ensureInitialized();
    if (!this.backend?.getStale) {
      winstonTelemetryLogger.debug("Cache backend does not support stale data access", {
        strategy: this.backend?.strategy,
        component: "cache_manager",
        operation: "get_stale_unsupported",
      });
      return null;
    }
    return await this.backend.getStale<T>(key);
  }

  async connect(): Promise<void> {
    await this.ensureInitialized();
    if (this.backend?.connect) {
      await this.backend.connect();
    }
  }

  async disconnect(): Promise<void> {
    if (this.backend?.disconnect) {
      await this.backend.disconnect();
    }
  }

  getStrategy(): CacheStrategy | null {
    return this.backend?.strategy || null;
  }

  getBackendName(): string | null {
    return this.backend?.name || null;
  }

  async reconfigure(newConfig: CacheManagerConfig): Promise<void> {
    const oldStrategy = this.backend?.strategy;
    const newStrategy = this.selectStrategy(newConfig);

    if (oldStrategy === newStrategy && this.backend) {
      winstonTelemetryLogger.debug("Cache configuration unchanged, keeping existing backend", {
        strategy: newStrategy,
        component: "cache_manager",
        operation: "reconfigure_skipped",
      });
      this.config = newConfig;
      return;
    }

    winstonTelemetryLogger.info("Reconfiguring cache manager with new strategy", {
      oldStrategy,
      newStrategy,
      component: "cache_manager",
      operation: "reconfigure",
    });

    await this.shutdown();
    this.config = newConfig;
    this.backend = null;
    this.initializationPromise = null;
    await this.ensureInitialized();
  }

  async shutdown(): Promise<void> {
    if (this.backend?.disconnect) {
      try {
        await this.backend.disconnect();
        winstonTelemetryLogger.info("Cache backend disconnected", {
          strategy: this.backend.strategy,
          component: "cache_manager",
          operation: "shutdown",
        });
      } catch (error) {
        winstonTelemetryLogger.warn("Error during cache backend shutdown", {
          strategy: this.backend.strategy,
          error: error instanceof Error ? error.message : "Unknown error",
          component: "cache_manager",
          operation: "shutdown_error",
        });
      }
    }
    this.backend = null;
    this.initializationPromise = null;
  }

  private async ensureInitialized(): Promise<void> {
    if (this.backend) {
      return;
    }

    if (this.initializationPromise) {
      await this.initializationPromise;
      return;
    }

    this.initializationPromise = this.initialize();
    await this.initializationPromise;
    this.initializationPromise = null;
  }

  private async initialize(): Promise<void> {
    const strategy = this.selectStrategy(this.config);

    winstonTelemetryLogger.info("Initializing cache manager", {
      strategy,
      highAvailability: this.config.highAvailability,
      component: "cache_manager",
      operation: "initialization",
    });

    try {
      this.backend = await this.createBackend(strategy, this.config);

      if (this.backend.connect) {
        await this.backend.connect();
      }

      winstonTelemetryLogger.info("Cache manager initialized successfully", {
        strategy: this.backend.strategy,
        name: this.backend.name,
        component: "cache_manager",
        operation: "initialization_success",
      });
    } catch (error) {
      winstonTelemetryLogger.error("Failed to initialize cache manager", {
        strategy,
        error: error instanceof Error ? error.message : "Unknown error",
        component: "cache_manager",
        operation: "initialization_failed",
      });

      if (strategy === "shared-redis") {
        winstonTelemetryLogger.warn("Falling back to local memory cache", {
          component: "cache_manager",
          operation: "fallback_to_memory",
        });
        this.backend = await this.createBackend("local-memory", this.config);
      } else {
        throw error;
      }
    }
  }

  private selectStrategy(config: CacheManagerConfig): CacheStrategy {
    return config.highAvailability ? "shared-redis" : "local-memory";
  }

  private async createBackend(
    strategy: CacheStrategy,
    config: CacheManagerConfig
  ): Promise<ICacheBackend> {
    switch (strategy) {
      case "shared-redis":
        return new SharedRedisBackend({
          url: config.redisUrl || "redis://localhost:6379",
          password: config.redisPassword,
          db: config.redisDb,
          ttlSeconds: config.ttlSeconds,
          staleDataToleranceMinutes: config.staleDataToleranceMinutes,
        });

      case "local-memory":
        return new LocalMemoryBackend({
          ttlSeconds: config.ttlSeconds,
          maxEntries: config.maxMemoryEntries || 1000,
        });

      default:
        throw new Error(`Unsupported cache strategy: ${strategy}`);
    }
  }
}
