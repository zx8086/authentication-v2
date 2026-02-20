// src/services/cache/cache-operation-timeout.ts

/**
 * Error thrown when a cache operation times out.
 */
export class CacheOperationTimeoutError extends Error {
  public readonly operation: string;
  public readonly timeoutMs: number;
  public readonly startTime: number;

  constructor(operation: string, timeoutMs: number, startTime: number = Date.now()) {
    super(`Cache ${operation} operation timed out after ${timeoutMs}ms`);
    this.name = "CacheOperationTimeoutError";
    this.operation = operation;
    this.timeoutMs = timeoutMs;
    this.startTime = startTime;

    // Maintain proper stack trace in V8 environments
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CacheOperationTimeoutError);
    }
  }
}

/**
 * Default timeouts for different cache operations (in milliseconds).
 */
export interface CacheOperationTimeouts {
  /** Timeout for GET operations (default: 1000ms) */
  get: number;
  /** Timeout for SET operations (default: 2000ms) */
  set: number;
  /** Timeout for DELETE operations (default: 1000ms) */
  delete: number;
  /** Timeout for SCAN iterations (default: 5000ms) */
  scan: number;
  /** Timeout for health check PING (default: 500ms) */
  ping: number;
  /** Timeout for connection attempts (default: 5000ms) */
  connect: number;
}

/**
 * Default timeout values (conservative settings).
 */
export const DEFAULT_OPERATION_TIMEOUTS: CacheOperationTimeouts = {
  get: 1000,
  set: 2000,
  delete: 1000,
  scan: 5000,
  ping: 500,
  connect: 5000,
};

/**
 * Wrap a promise with a timeout.
 *
 * If the promise doesn't resolve within the timeout, a CacheOperationTimeoutError is thrown.
 * The original promise continues to run (cannot be cancelled), but its result is ignored.
 *
 * @param operation - Name of the operation (for error message)
 * @param timeoutMs - Timeout in milliseconds
 * @param promise - The promise to wrap
 * @returns The result of the promise if it completes in time
 * @throws CacheOperationTimeoutError if the timeout is exceeded
 *
 * @example
 * ```typescript
 * try {
 *   const result = await withOperationTimeout('GET', 1000, redisClient.get(key));
 *   return result;
 * } catch (error) {
 *   if (error instanceof CacheOperationTimeoutError) {
 *     logger.warn('Cache operation timed out', { operation: error.operation });
 *   }
 *   throw error;
 * }
 * ```
 */
export async function withOperationTimeout<T>(
  operation: string,
  timeoutMs: number,
  promise: Promise<T>
): Promise<T> {
  const startTime = Date.now();

  // Create abort controller for cleanup
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new CacheOperationTimeoutError(operation, timeoutMs, startTime));
    }, timeoutMs);

    // Ensure timer doesn't prevent process from exiting (Bun/Node compatible)
    if (timeoutId && typeof timeoutId === "object" && "unref" in timeoutId) {
      (timeoutId as { unref: () => void }).unref();
    }
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    // Clean up timeout to prevent memory leaks
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * Check if an error is a timeout error.
 *
 * @param error - The error to check
 * @returns true if the error is a CacheOperationTimeoutError
 */
export function isTimeoutError(error: unknown): error is CacheOperationTimeoutError {
  return error instanceof CacheOperationTimeoutError;
}

/**
 * Get the appropriate timeout for an operation type.
 *
 * @param operationType - The type of operation
 * @param customTimeouts - Optional custom timeout configuration
 * @returns The timeout in milliseconds
 */
export function getOperationTimeout(
  operationType: keyof CacheOperationTimeouts,
  customTimeouts?: Partial<CacheOperationTimeouts>
): number {
  const timeouts = { ...DEFAULT_OPERATION_TIMEOUTS, ...customTimeouts };
  return timeouts[operationType];
}

/**
 * Timeout configuration helper that merges with defaults.
 *
 * @param overrides - Partial timeout configuration
 * @returns Complete timeout configuration
 */
export function createTimeoutConfig(
  overrides?: Partial<CacheOperationTimeouts>
): CacheOperationTimeouts {
  return { ...DEFAULT_OPERATION_TIMEOUTS, ...overrides };
}
