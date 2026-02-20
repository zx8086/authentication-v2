// src/utils/cache-reconnect-manager.ts

import { winstonTelemetryLogger } from "../telemetry/winston-logger";

/**
 * Configuration for the reconnect manager.
 */
export interface ReconnectManagerConfig {
  /** Maximum number of reconnection attempts before giving up (default: 5) */
  maxAttempts: number;
  /** Base delay in milliseconds for exponential backoff (default: 100) */
  baseDelayMs: number;
  /** Maximum delay cap in milliseconds (default: 5000) */
  maxDelayMs: number;
  /** Time in milliseconds after which attempt counter resets (default: 60000) */
  cooldownMs: number;
}

/**
 * Result of a reconnection attempt.
 */
export interface ReconnectResult {
  /** Whether the reconnection was successful */
  success: boolean;
  /** Error if reconnection failed */
  error?: Error;
  /** Number of attempts made */
  attempts: number;
  /** Total time spent in milliseconds */
  durationMs: number;
}

/**
 * Statistics about reconnection attempts.
 */
export interface ReconnectStats {
  /** Current number of consecutive attempts */
  attempts: number;
  /** Timestamp of last attempt */
  lastAttemptTime: number;
  /** Whether a reconnection is currently in progress */
  isReconnecting: boolean;
  /** Total successful reconnections */
  totalSuccesses: number;
  /** Total failed reconnections */
  totalFailures: number;
}

/**
 * Default configuration values (conservative settings).
 */
export const DEFAULT_RECONNECT_CONFIG: ReconnectManagerConfig = {
  maxAttempts: 5,
  baseDelayMs: 100,
  maxDelayMs: 5000,
  cooldownMs: 60000,
};

/**
 * Manages cache reconnection with exponential backoff and mutex protection.
 *
 * Features:
 * - **Mutex**: Prevents concurrent reconnection attempts (race condition prevention)
 * - **Exponential Backoff**: Delays increase: 100ms, 200ms, 400ms, 800ms, 1600ms...
 * - **Time-based Reset**: Attempt counter resets after cooldown period
 * - **Metrics Integration**: Reports reconnection attempts for observability
 *
 * @example
 * ```typescript
 * const manager = new CacheReconnectManager({
 *   maxAttempts: 5,
 *   baseDelayMs: 100,
 *   maxDelayMs: 5000,
 *   cooldownMs: 60000,
 * });
 *
 * const result = await manager.executeReconnect(async () => {
 *   await client.connect();
 *   await client.ping();
 * });
 *
 * if (!result.success) {
 *   logger.error("Reconnection failed", { error: result.error });
 * }
 * ```
 */
export class CacheReconnectManager {
  private reconnectAttempts = 0;
  private lastAttemptTime = 0;
  private reconnectPromise: Promise<ReconnectResult> | null = null;
  private totalSuccesses = 0;
  private totalFailures = 0;

  constructor(private readonly config: ReconnectManagerConfig = DEFAULT_RECONNECT_CONFIG) {}

  /**
   * Execute a reconnection operation with mutex protection and exponential backoff.
   *
   * If a reconnection is already in progress, waits for it to complete
   * instead of starting a new one (mutex behavior).
   *
   * @param reconnectFn - Async function that performs the actual reconnection
   * @returns Result of the reconnection attempt
   */
  async executeReconnect(reconnectFn: () => Promise<void>): Promise<ReconnectResult> {
    // Mutex: If reconnection is already in progress, wait for it
    if (this.reconnectPromise) {
      winstonTelemetryLogger.debug("Reconnection already in progress, waiting", {
        component: "cache_reconnect",
        operation: "mutex_wait",
        currentAttempts: this.reconnectAttempts,
      });
      return this.reconnectPromise;
    }

    // Check cooldown - reset attempts if enough time has passed
    const now = Date.now();
    if (this.lastAttemptTime > 0 && now - this.lastAttemptTime > this.config.cooldownMs) {
      winstonTelemetryLogger.debug("Cooldown period elapsed, resetting attempt counter", {
        component: "cache_reconnect",
        operation: "cooldown_reset",
        previousAttempts: this.reconnectAttempts,
        elapsedMs: now - this.lastAttemptTime,
        cooldownMs: this.config.cooldownMs,
      });
      this.reconnectAttempts = 0;
    }

    // Check if we've exceeded max attempts
    if (this.reconnectAttempts >= this.config.maxAttempts) {
      const error = new Error(
        `Max reconnection attempts (${this.config.maxAttempts}) exceeded. ` +
          `Cooldown resets in ${Math.max(0, this.config.cooldownMs - (now - this.lastAttemptTime))}ms`
      );

      winstonTelemetryLogger.warn("Max reconnection attempts exceeded", {
        component: "cache_reconnect",
        operation: "max_attempts_exceeded",
        maxAttempts: this.config.maxAttempts,
        lastAttemptTime: this.lastAttemptTime,
        cooldownMs: this.config.cooldownMs,
      });

      return {
        success: false,
        error,
        attempts: this.reconnectAttempts,
        durationMs: 0,
      };
    }

    // Execute reconnection with mutex
    this.reconnectPromise = this.doReconnect(reconnectFn);

    try {
      return await this.reconnectPromise;
    } finally {
      this.reconnectPromise = null;
    }
  }

  /**
   * Internal reconnection logic with exponential backoff.
   */
  private async doReconnect(reconnectFn: () => Promise<void>): Promise<ReconnectResult> {
    const startTime = Date.now();
    this.reconnectAttempts++;
    this.lastAttemptTime = startTime;

    // Calculate exponential backoff delay
    // Formula: min(baseDelay * 2^(attempt-1), maxDelay)
    // Results for base=100, max=5000: [100, 200, 400, 800, 1600, 3200, 5000, 5000...]
    const delayMs = Math.min(
      this.config.baseDelayMs * 2 ** (this.reconnectAttempts - 1),
      this.config.maxDelayMs
    );

    winstonTelemetryLogger.info("Starting cache reconnection attempt", {
      component: "cache_reconnect",
      operation: "reconnect_start",
      attempt: this.reconnectAttempts,
      maxAttempts: this.config.maxAttempts,
      delayMs,
      backoffFormula: `min(${this.config.baseDelayMs} * 2^${this.reconnectAttempts - 1}, ${this.config.maxDelayMs})`,
    });

    // Apply backoff delay (skip on first attempt for faster recovery)
    if (this.reconnectAttempts > 1) {
      await this.delay(delayMs);
    }

    try {
      await reconnectFn();

      const durationMs = Date.now() - startTime;
      this.totalSuccesses++;

      // Reset attempt counter on success
      this.reconnectAttempts = 0;

      winstonTelemetryLogger.info("Cache reconnection successful", {
        component: "cache_reconnect",
        operation: "reconnect_success",
        durationMs,
        totalSuccesses: this.totalSuccesses,
      });

      return {
        success: true,
        attempts: 1,
        durationMs,
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      this.totalFailures++;

      const errorObj = error instanceof Error ? error : new Error(String(error));

      winstonTelemetryLogger.warn("Cache reconnection attempt failed", {
        component: "cache_reconnect",
        operation: "reconnect_failed",
        attempt: this.reconnectAttempts,
        maxAttempts: this.config.maxAttempts,
        durationMs,
        error: errorObj.message,
        totalFailures: this.totalFailures,
        willRetry: this.reconnectAttempts < this.config.maxAttempts,
      });

      return {
        success: false,
        error: errorObj,
        attempts: this.reconnectAttempts,
        durationMs,
      };
    }
  }

  /**
   * Delay helper that can be mocked in tests.
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Check if a reconnection is currently in progress.
   */
  isReconnecting(): boolean {
    return this.reconnectPromise !== null;
  }

  /**
   * Get current reconnection statistics.
   */
  getStats(): ReconnectStats {
    return {
      attempts: this.reconnectAttempts,
      lastAttemptTime: this.lastAttemptTime,
      isReconnecting: this.isReconnecting(),
      totalSuccesses: this.totalSuccesses,
      totalFailures: this.totalFailures,
    };
  }

  /**
   * Reset the manager state.
   * Use this when the connection is known to be healthy.
   */
  reset(): void {
    this.reconnectAttempts = 0;
    this.lastAttemptTime = 0;
    this.reconnectPromise = null;

    winstonTelemetryLogger.debug("Reconnect manager reset", {
      component: "cache_reconnect",
      operation: "reset",
    });
  }

  /**
   * Force reset of attempt counter.
   * Use with caution - bypasses cooldown check.
   */
  forceResetAttempts(): void {
    const previousAttempts = this.reconnectAttempts;
    this.reconnectAttempts = 0;

    winstonTelemetryLogger.info("Reconnect attempts force reset", {
      component: "cache_reconnect",
      operation: "force_reset",
      previousAttempts,
    });
  }

  /**
   * Calculate the delay for the next reconnection attempt.
   * Useful for logging/metrics without actually reconnecting.
   */
  getNextDelayMs(): number {
    const nextAttempt = this.reconnectAttempts + 1;
    return Math.min(this.config.baseDelayMs * 2 ** (nextAttempt - 1), this.config.maxDelayMs);
  }

  /**
   * Check if attempts have been exhausted (max reached, waiting for cooldown).
   */
  isExhausted(): boolean {
    return this.reconnectAttempts >= this.config.maxAttempts;
  }

  /**
   * Get time remaining until cooldown resets (in milliseconds).
   * Returns 0 if cooldown has already elapsed.
   */
  getCooldownRemainingMs(): number {
    if (this.lastAttemptTime === 0) return 0;
    const elapsed = Date.now() - this.lastAttemptTime;
    return Math.max(0, this.config.cooldownMs - elapsed);
  }
}
