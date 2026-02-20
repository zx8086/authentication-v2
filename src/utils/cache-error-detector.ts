// src/utils/cache-error-detector.ts

/**
 * Categories of cache connection errors.
 * Used for metrics, logging, and determining recovery strategies.
 */
export type CacheErrorCategory =
  | "connection_closed"
  | "connection_refused"
  | "connection_timeout"
  | "connection_reset"
  | "network_error"
  | "readonly_mode"
  | "server_busy"
  | "unknown";

/**
 * Detailed information about a detected cache error.
 */
export interface CacheErrorInfo {
  /** The category of the error */
  category: CacheErrorCategory;
  /** Whether the error is recoverable with retry */
  isRecoverable: boolean;
  /** Whether a reconnection attempt should be triggered */
  shouldReconnect: boolean;
  /** The original error message */
  message: string;
}

/**
 * Error pattern definition for matching cache errors.
 */
interface ErrorPattern {
  /** String or regex pattern to match against error message */
  pattern: RegExp | string;
  /** Category to assign when matched */
  category: CacheErrorCategory;
  /** Whether error is recoverable */
  isRecoverable: boolean;
  /** Whether reconnection should be attempted */
  shouldReconnect: boolean;
}

/**
 * Extended error patterns for Redis/Valkey connection issues.
 * Patterns are ordered by specificity (most specific first).
 * Covers 15+ error patterns vs the original 4.
 */
const ERROR_PATTERNS: ErrorPattern[] = [
  // Connection closed errors (most common)
  {
    pattern: "ERR_REDIS_CONNECTION_CLOSED",
    category: "connection_closed",
    isRecoverable: true,
    shouldReconnect: true,
  },
  {
    pattern: "EPIPE",
    category: "connection_closed",
    isRecoverable: true,
    shouldReconnect: true,
  },
  {
    pattern: "ENOTCONN",
    category: "connection_closed",
    isRecoverable: true,
    shouldReconnect: true,
  },
  {
    pattern: /connection\s*(closed|lost)/i,
    category: "connection_closed",
    isRecoverable: true,
    shouldReconnect: true,
  },
  {
    pattern: /socket\s*(closed|hang\s*up)/i,
    category: "connection_closed",
    isRecoverable: true,
    shouldReconnect: true,
  },
  {
    pattern: /broken\s*pipe/i,
    category: "connection_closed",
    isRecoverable: true,
    shouldReconnect: true,
  },

  // Connection reset errors
  {
    pattern: "ECONNRESET",
    category: "connection_reset",
    isRecoverable: true,
    shouldReconnect: true,
  },
  {
    pattern: /read\s*ECONNRESET/i,
    category: "connection_reset",
    isRecoverable: true,
    shouldReconnect: true,
  },
  {
    pattern: /connection\s*reset/i,
    category: "connection_reset",
    isRecoverable: true,
    shouldReconnect: true,
  },

  // Connection refused errors
  {
    pattern: "ECONNREFUSED",
    category: "connection_refused",
    isRecoverable: true,
    shouldReconnect: true,
  },

  // Timeout errors
  {
    pattern: "ETIMEDOUT",
    category: "connection_timeout",
    isRecoverable: true,
    shouldReconnect: true,
  },
  {
    pattern: /connection\s*timeout/i,
    category: "connection_timeout",
    isRecoverable: true,
    shouldReconnect: true,
  },
  {
    pattern: /operation\s*timed?\s*out/i,
    category: "connection_timeout",
    isRecoverable: true,
    shouldReconnect: true,
  },

  // Network errors
  {
    pattern: "EHOSTUNREACH",
    category: "network_error",
    isRecoverable: true,
    shouldReconnect: true,
  },
  {
    pattern: "ENETUNREACH",
    category: "network_error",
    isRecoverable: true,
    shouldReconnect: true,
  },
  {
    pattern: "EADDRNOTAVAIL",
    category: "network_error",
    isRecoverable: true,
    shouldReconnect: true,
  },
  {
    pattern: "ENETDOWN",
    category: "network_error",
    isRecoverable: true,
    shouldReconnect: true,
  },
  {
    pattern: "ENOENT",
    category: "network_error",
    isRecoverable: true,
    shouldReconnect: true,
  },

  // Redis/Valkey server-specific errors (non-recoverable via reconnection)
  {
    pattern: /READONLY/i,
    category: "readonly_mode",
    isRecoverable: false,
    shouldReconnect: false,
  },
  {
    pattern: /LOADING/i,
    category: "server_busy",
    isRecoverable: true,
    shouldReconnect: false,
  },
  {
    pattern: /BUSY/i,
    category: "server_busy",
    isRecoverable: true,
    shouldReconnect: false,
  },
  {
    pattern: /CLUSTERDOWN/i,
    category: "server_busy",
    isRecoverable: true,
    shouldReconnect: false,
  },
];

/**
 * Detects and categorizes a cache/Redis/Valkey error.
 *
 * @param error - The error to analyze (Error object or string message)
 * @returns Detailed information about the error category and recovery options
 *
 * @example
 * ```typescript
 * const info = detectCacheError(new Error("Connection closed"));
 * if (info.shouldReconnect) {
 *   await reconnectManager.executeReconnect(reconnectFn);
 * }
 * ```
 */
export function detectCacheError(error: Error | string): CacheErrorInfo {
  // Defensive handling: ensure message is always a string
  const rawMessage = error instanceof Error ? error.message : error;
  const message = typeof rawMessage === "string" ? rawMessage : String(rawMessage ?? "");

  // If message is empty, return unknown category
  if (!message) {
    return {
      category: "unknown",
      isRecoverable: false,
      shouldReconnect: false,
      message: "",
    };
  }

  for (const { pattern, category, isRecoverable, shouldReconnect } of ERROR_PATTERNS) {
    const matches = typeof pattern === "string" ? message.includes(pattern) : pattern.test(message);

    if (matches) {
      return { category, isRecoverable, shouldReconnect, message };
    }
  }

  return {
    category: "unknown",
    isRecoverable: false,
    shouldReconnect: false,
    message,
  };
}

/**
 * Quick check if an error is a connection error that should trigger reconnection.
 *
 * @param error - The error to check
 * @returns true if the error indicates a connection problem requiring reconnection
 *
 * @example
 * ```typescript
 * try {
 *   await redisClient.get(key);
 * } catch (error) {
 *   if (isConnectionError(error)) {
 *     circuitBreaker.recordFailure(error);
 *     markConnectionBroken();
 *   }
 * }
 * ```
 */
export function isConnectionError(error: Error | string): boolean {
  const info = detectCacheError(error);
  return info.shouldReconnect;
}

/**
 * Quick check if an error is recoverable (can be retried).
 *
 * @param error - The error to check
 * @returns true if the error is potentially recoverable with retry
 */
export function isRecoverableError(error: Error | string): boolean {
  const info = detectCacheError(error);
  return info.isRecoverable;
}

/**
 * Get all supported error patterns for documentation/testing.
 *
 * @returns Array of pattern descriptions
 */
export function getSupportedErrorPatterns(): Array<{
  category: CacheErrorCategory;
  patterns: string[];
}> {
  const byCategory = new Map<CacheErrorCategory, string[]>();

  for (const { pattern, category } of ERROR_PATTERNS) {
    const patterns = byCategory.get(category) || [];
    patterns.push(typeof pattern === "string" ? pattern : pattern.source);
    byCategory.set(category, patterns);
  }

  return Array.from(byCategory.entries()).map(([category, patterns]) => ({
    category,
    patterns,
  }));
}
