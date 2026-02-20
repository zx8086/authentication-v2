// src/services/cache/cache-scan-iterator.ts

import { winstonTelemetryLogger } from "../../telemetry/winston-logger";
import { isConnectionError } from "../../utils/cache-error-detector";
import { CacheOperationTimeoutError, withOperationTimeout } from "./cache-operation-timeout";

export interface CacheScanIteratorConfig {
  count: number;
  timeoutMs: number;
  maxIterations: number;
  retriesPerScan: number;
  retryDelayMs: number;
}

export interface ScanResult {
  cursor: number;
  keys: string[];
}

export interface ScanStats {
  totalKeys: number;
  iterations: number;
  durationMs: number;
  retries: number;
  completed: boolean;
  error?: string;
}

export const DEFAULT_SCAN_CONFIG: CacheScanIteratorConfig = {
  count: 100,
  timeoutMs: 5000,
  maxIterations: 10000,
  retriesPerScan: 2,
  retryDelayMs: 100,
};

export type ScanFunction = (
  cursor: number,
  options: { MATCH: string; COUNT: number }
) => Promise<ScanResult>;

export class CacheScanIterator {
  constructor(
    private readonly scanFn: ScanFunction,
    private readonly config: CacheScanIteratorConfig = DEFAULT_SCAN_CONFIG
  ) {}

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

  private async scanWithRetry(
    cursor: number,
    pattern: string,
    iteration: number
  ): Promise<ScanResult> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.retriesPerScan; attempt++) {
      try {
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

        if (attempt < this.config.retriesPerScan) {
          await this.delay(this.config.retryDelayMs * (attempt + 1));
        }
      }
    }

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

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

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

  async exists(pattern: string): Promise<boolean> {
    for await (const batch of this.iterate(pattern)) {
      if (batch.length > 0) {
        return true;
      }
    }
    return false;
  }
}

export function createScanIterator(
  scanFn: ScanFunction,
  overrides?: Partial<CacheScanIteratorConfig>
): CacheScanIterator {
  const config = { ...DEFAULT_SCAN_CONFIG, ...overrides };
  return new CacheScanIterator(scanFn, config);
}
