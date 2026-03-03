// src/cache/cache-manager.ts
import type { IKongCacheService, KongCacheStats } from "../config/schemas";
import {
  type ComponentHealthStatus,
  type LifecycleAwareComponent,
  lifecycleCoordinator,
} from "../lifecycle";
import { SpanEvents, telemetryEmitter } from "../telemetry/tracer";
import { LocalMemoryBackend } from "./backends/local-memory-backend";
import { SharedRedisBackend } from "./backends/shared-redis-backend";
import type {
  CacheManagerConfig,
  CacheStrategy,
  ICacheBackend,
  ICacheService,
} from "./cache.interface";

/**
 * Unified Cache Manager
 *
 * Manages cache operations with support for multiple backends (Redis, local memory).
 * Implements LifecycleAwareComponent for graceful shutdown coordination.
 *
 * @see SIO-452: Fix ERR_REDIS_CONNECTION_CLOSED During Container Lifecycle
 */
export class UnifiedCacheManager
  implements ICacheService, IKongCacheService, LifecycleAwareComponent
{
  /** Component name for lifecycle coordination */
  readonly name = "cache_manager";

  /**
   * Shutdown priority (60 = mid-priority).
   * - Higher than telemetry (40) and logging (10)
   * - Lower than HTTP server (100) and Kong operations (80)
   */
  readonly priority = 60;

  private backend: ICacheBackend | null = null;
  private config: CacheManagerConfig;
  private initializationPromise: Promise<void> | null = null;

  /** Flag to prevent new operations during shutdown */
  private shuttingDown = false;

  constructor(config: CacheManagerConfig) {
    this.config = config;

    // Register with lifecycle coordinator for coordinated shutdown (SIO-452)
    lifecycleCoordinator.register(this);
  }

  /**
   * Prepare for shutdown - stop accepting new operations.
   * Called when entering DRAINING state.
   */
  async prepareForShutdown(): Promise<void> {
    this.shuttingDown = true;
    telemetryEmitter.info(
      SpanEvents.CACHE_MANAGER_SHUTDOWN,
      "Cache manager preparing for shutdown",
      {
        component: "cache_manager",
        operation: "prepare_shutdown",
        strategy: this.backend?.strategy ?? "none",
      }
    );
  }

  /**
   * Get component health status for lifecycle coordinator.
   */
  getHealthStatus(): ComponentHealthStatus {
    return {
      name: this.name,
      healthy: !this.shuttingDown && this.backend !== null,
      details: {
        strategy: this.backend?.strategy ?? "none",
        shuttingDown: this.shuttingDown,
        initialized: this.backend !== null,
      },
    };
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
      telemetryEmitter.debug(
        SpanEvents.CACHE_STALE_RETRIEVED,
        "Cache backend does not support stale data access",
        {
          strategy: this.backend?.strategy ?? "unknown",
          component: "cache_manager",
          operation: "get_stale_unsupported",
        }
      );
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

  getClientForHealthCheck(): import("bun").RedisClient | null {
    if (this.backend && "getClientForHealthCheck" in this.backend) {
      return (
        this.backend as import("./backends/shared-redis-backend").SharedRedisBackend
      ).getClientForHealthCheck();
    }
    return null;
  }

  async getServerType(): Promise<"redis" | "valkey"> {
    if (this.backend && "getServerType" in this.backend) {
      return await (
        this.backend as import("./backends/shared-redis-backend").SharedRedisBackend
      ).getServerType();
    }
    return "redis";
  }

  getResilienceStats(): ReturnType<
    import("./backends/shared-redis-backend").SharedRedisBackend["getResilienceStats"]
  > | null {
    if (this.backend && "getResilienceStats" in this.backend) {
      return (
        this.backend as import("./backends/shared-redis-backend").SharedRedisBackend
      ).getResilienceStats();
    }
    return null;
  }

  async reconfigure(newConfig: CacheManagerConfig): Promise<void> {
    const oldStrategy = this.backend?.strategy;
    const newStrategy = this.selectStrategy(newConfig);

    if (oldStrategy === newStrategy && this.backend) {
      telemetryEmitter.debug(
        SpanEvents.CACHE_MANAGER_RECONFIGURED,
        "Cache configuration unchanged, keeping existing backend",
        {
          strategy: newStrategy,
          component: "cache_manager",
          operation: "reconfigure_skipped",
        }
      );
      this.config = newConfig;
      return;
    }

    telemetryEmitter.info(
      SpanEvents.CACHE_MANAGER_RECONFIGURED,
      "Reconfiguring cache manager with new strategy",
      {
        old_strategy: oldStrategy ?? "none",
        new_strategy: newStrategy,
        component: "cache_manager",
        operation: "reconfigure",
      }
    );

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
        telemetryEmitter.info(SpanEvents.CACHE_MANAGER_SHUTDOWN, "Cache backend disconnected", {
          strategy: this.backend.strategy,
          component: "cache_manager",
          operation: "shutdown",
        });
      } catch (error) {
        telemetryEmitter.warn(
          SpanEvents.CACHE_MANAGER_SHUTDOWN,
          "Error during cache backend shutdown",
          {
            strategy: this.backend.strategy,
            error: error instanceof Error ? error.message : "Unknown error",
            component: "cache_manager",
            operation: "shutdown_error",
          }
        );
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

    telemetryEmitter.info(SpanEvents.CACHE_MANAGER_INITIALIZING, "Initializing cache manager", {
      strategy,
      high_availability: this.config.highAvailability,
      component: "cache_manager",
      operation: "initialization",
    });

    try {
      this.backend = await this.createBackend(strategy, this.config);

      if (this.backend.connect) {
        await this.backend.connect();
      }

      telemetryEmitter.info(
        SpanEvents.CACHE_MANAGER_INITIALIZED,
        "Cache manager initialized successfully",
        {
          strategy: this.backend.strategy,
          name: this.backend.name,
          component: "cache_manager",
          operation: "initialization_success",
        }
      );
    } catch (error) {
      telemetryEmitter.error(
        SpanEvents.CACHE_OPERATION_FAILED,
        "Failed to initialize cache manager",
        {
          strategy,
          error: error instanceof Error ? error.message : "Unknown error",
          component: "cache_manager",
          operation: "initialization_failed",
        }
      );

      if (strategy === "shared-redis") {
        telemetryEmitter.warn(SpanEvents.CB_FALLBACK_USED, "Falling back to local memory cache", {
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
