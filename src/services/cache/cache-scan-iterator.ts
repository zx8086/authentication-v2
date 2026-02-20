// src/services/cache/cache-scan-iterator.ts

import { winstonTelemetryLogger } from "../../telemetry/winston-logger";
import { isConnectionError } from "../../utils/cache-error-detector";
import { CacheOperationTimeoutError, withOperationTimeout } from "./cache-operation-timeout";

/**
 * Configuration for the resilient scan iterator.
 */
export interface CacheScanIteratorConfig {
  /** Number of keys to fetch per SCAN iteration (default: 100) */
  count: number;
  /** Timeout for each SCAN operation in milliseconds (default: 5000) */
  timeoutMs: number;
  /** Maximum number of iterations to prevent infinite loops (default: 10000) */
  maxIterations: number;
  /** Number of retries per failed SCAN (default: 2) */
  retriesPerScan: number;
  /** Delay between retries in milliseconds (default: 100) */
  retryDelayMs: number;
}

/**
 * Result of a scan operation.
 */
export interface ScanResult {
  /** Next cursor position (0 = complete) */
  cursor: number;
  /** Keys found in this iteration */
  keys: string[];
}

/**
 * Stats from a completed scan.
 */
export interface ScanStats {
  /** Total keys found */
  totalKeys: number;
  /** Number of SCAN iterations performed */
  iterations: number;
  /** Total time spent scanning (ms) */
  durationMs: number;
  /** Number of retries needed */
  retries: number;
  /** Whether the scan completed successfully */
  completed: boolean;
  /** Error if scan failed */
  error?: string;
}

/**
 * Default configuration (conservative settings).
 */
export const DEFAULT_SCAN_CONFIG: CacheScanIteratorConfig = {
  count: 100,
  timeoutMs: 5000,
  maxIterations: 10000,
  retriesPerScan: 2,
  retryDelayMs: 100,
};

/**
 * Type definition for the SCAN function provided by the cache client.
 */
export type ScanFunction = (
  cursor: number,
  options: { MATCH: string; COUNT: number }
) => Promise<ScanResult>;

/**
 * Resilient SCAN iterator for cache operations.
 *
 * Provides safe iteration over cache keys with:
 * - Per-iteration timeouts
 * - Automatic retries with backoff
 * - Connection error detection
 * - Progress tracking
 * - Maximum iteration limits (prevent infinite loops)
 *
 * @example
 * ```typescript
 * const iterator = new CacheScanIterator(
 *   (cursor, options) => client.scan(cursor, options),
 *   { count: 100, timeoutMs: 5000 }
 * );
 *
 * // Collect all keys matching pattern
 * const allKeys = await iterator.collectAll('auth_service:*');
 *
 * // Or iterate in batches
 * for await (const batch of iterator.iterate('auth_service_stale:*')) {
 *   console.log(`Found ${batch.length} keys`);
 * }
 * ```
 */
export class CacheScanIterator {
  constructor(
    private readonly scanFn: ScanFunction,
    private readonly config: CacheScanIteratorConfig = DEFAULT_SCAN_CONFIG
  ) {}

  /**
   * Async generator for iterating over keys in batches.
   *
   * @param pattern - Key pattern to match (e.g., "auth_service:*")
   * @yields Arrays of keys found in each SCAN iteration
   * @throws Error if max iterations exceeded or unrecoverable error occurs
   */
  async *iterate(pattern: string): AsyncGenerator<string[], void, unknown> {
    let cursor = 0;
    let iterations = 0;

    winstonTelemetryLogger.debug("Starting cache SCAN iteration", {
      component: "cache_scan_iterator",
      operation: "iterate_start",
      pattern,
      config: {
        count: this.config.count,
        timeoutMs: this.config.timeoutMs,
        maxIterations: this.config.maxIterations,
      },
    });

    do {
      iterations++;

      // Safety check for infinite loops
      if (iterations > this.config.maxIterations) {
        const error = new Error(
          `SCAN exceeded maximum iterations (${this.config.maxIterations}). ` +
            `Pattern: ${pattern}, Last cursor: ${cursor}`
        );

        winstonTelemetryLogger.error("SCAN max iterations exceeded", {
          component: "cache_scan_iterator",
          operation: "max_iterations_exceeded",
          pattern,
          iterations,
          cursor,
        });

        throw error;
      }

      // Execute SCAN with retries
      const result = await this.scanWithRetry(cursor, pattern, iterations);

      cursor = result.cursor;

      if (result.keys.length > 0) {
        yield result.keys;
      }
    } while (cursor !== 0);

    winstonTelemetryLogger.debug("Cache SCAN iteration complete", {
      component: "cache_scan_iterator",
      operation: "iterate_complete",
      pattern,
      iterations,
    });
  }

  /**
   * Collect all keys matching a pattern.
   *
   * @param pattern - Key pattern to match
   * @returns All matching keys and scan statistics
   */
  async collectAll(pattern: string): Promise<{ keys: string[]; stats: ScanStats }> {
    const startTime = Date.now();
    const allKeys: string[] = [];
    let iterations = 0;
    const totalRetries = 0;

    try {
      for await (const batch of this.iterate(pattern)) {
        allKeys.push(...batch);
        iterations++;
      }

      const stats: ScanStats = {
        totalKeys: allKeys.length,
        iterations,
        durationMs: Date.now() - startTime,
        retries: totalRetries,
        completed: true,
      };

      winstonTelemetryLogger.debug("Cache SCAN collectAll complete", {
        component: "cache_scan_iterator",
        operation: "collect_all_complete",
        pattern,
        stats,
      });

      return { keys: allKeys, stats };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      const stats: ScanStats = {
        totalKeys: allKeys.length,
        iterations,
        durationMs: Date.now() - startTime,
        retries: totalRetries,
        completed: false,
        error: errorMessage,
      };

      winstonTelemetryLogger.warn("Cache SCAN collectAll failed", {
        component: "cache_scan_iterator",
        operation: "collect_all_failed",
        pattern,
        stats,
        error: errorMessage,
      });

      return { keys: allKeys, stats };
    }
  }

  /**
   * Execute a single SCAN with retries and timeout.
   */
  private async scanWithRetry(
    cursor: number,
    pattern: string,
    iteration: number
  ): Promise<ScanResult> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.retriesPerScan; attempt++) {
      try {
        // Apply timeout to SCAN operation
        const result = await withOperationTimeout(
          "SCAN",
          this.config.timeoutMs,
          this.scanFn(cursor, {
            MATCH: pattern,
            COUNT: this.config.count,
          })
        );

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if this is a connection error (should trigger reconnection upstream)
        if (isConnectionError(lastError)) {
          winstonTelemetryLogger.warn("SCAN connection error, will retry", {
            component: "cache_scan_iterator",
            operation: "scan_connection_error",
            cursor,
            pattern,
            iteration,
            attempt,
            maxRetries: this.config.retriesPerScan,
            error: lastError.message,
          });
        } else if (lastError instanceof CacheOperationTimeoutError) {
          winstonTelemetryLogger.warn("SCAN timeout, will retry", {
            component: "cache_scan_iterator",
            operation: "scan_timeout",
            cursor,
            pattern,
            iteration,
            attempt,
            maxRetries: this.config.retriesPerScan,
            timeoutMs: this.config.timeoutMs,
          });
        } else {
          // Unknown error, log and retry
          winstonTelemetryLogger.warn("SCAN error, will retry", {
            component: "cache_scan_iterator",
            operation: "scan_error",
            cursor,
            pattern,
            iteration,
            attempt,
            maxRetries: this.config.retriesPerScan,
            error: lastError.message,
          });
        }

        // Don't delay on last attempt (will throw anyway)
        if (attempt < this.config.retriesPerScan) {
          await this.delay(this.config.retryDelayMs * (attempt + 1));
        }
      }
    }

    // All retries exhausted
    winstonTelemetryLogger.error("SCAN failed after all retries", {
      component: "cache_scan_iterator",
      operation: "scan_all_retries_failed",
      cursor,
      pattern,
      iteration,
      retriesAttempted: this.config.retriesPerScan + 1,
      error: lastError?.message,
    });

    throw lastError || new Error("SCAN failed with unknown error");
  }

  /**
   * Delay helper that can be mocked in tests.
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Count keys matching a pattern without collecting them.
   * More memory-efficient for large datasets.
   *
   * @param pattern - Key pattern to match
   * @returns Count and scan statistics
   */
  async count(pattern: string): Promise<{ count: number; stats: ScanStats }> {
    const startTime = Date.now();
    let count = 0;
    let iterations = 0;
    const totalRetries = 0;

    try {
      for await (const batch of this.iterate(pattern)) {
        count += batch.length;
        iterations++;
      }

      const stats: ScanStats = {
        totalKeys: count,
        iterations,
        durationMs: Date.now() - startTime,
        retries: totalRetries,
        completed: true,
      };

      return { count, stats };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      const stats: ScanStats = {
        totalKeys: count,
        iterations,
        durationMs: Date.now() - startTime,
        retries: totalRetries,
        completed: false,
        error: errorMessage,
      };

      return { count, stats };
    }
  }

  /**
   * Check if any keys match a pattern (early exit on first match).
   *
   * @param pattern - Key pattern to match
   * @returns true if at least one key matches
   */
  async exists(pattern: string): Promise<boolean> {
    for await (const batch of this.iterate(pattern)) {
      if (batch.length > 0) {
        return true;
      }
    }
    return false;
  }
}

/**
 * Create a scan iterator with custom configuration.
 *
 * @param scanFn - The SCAN function from the cache client
 * @param overrides - Configuration overrides
 * @returns Configured CacheScanIterator
 */
export function createScanIterator(
  scanFn: ScanFunction,
  overrides?: Partial<CacheScanIteratorConfig>
): CacheScanIterator {
  const config = { ...DEFAULT_SCAN_CONFIG, ...overrides };
  return new CacheScanIterator(scanFn, config);
}
