/* src/lifecycle/inflight-request-tracker.ts */

/**
 * In-Flight Request Tracker for graceful shutdown draining.
 *
 * This module tracks active HTTP requests to enable proper connection
 * draining during shutdown. It ensures all in-flight requests complete
 * before connections are closed.
 *
 * @see SIO-452: Fix ERR_REDIS_CONNECTION_CLOSED During Container Lifecycle
 */

import { SpanEvents, telemetryEmitter } from "../telemetry/tracer";

/**
 * Metadata stored for each in-flight request.
 */
export interface RequestMetadata {
  /** Request endpoint path */
  endpoint: string;
  /** Request start timestamp */
  startTime: number;
  /** HTTP method */
  method?: string;
  /** Request ID for correlation */
  requestId?: string;
}

/**
 * Result of a drain operation.
 */
export interface DrainResult {
  /** Whether all requests completed within timeout */
  drained: boolean;
  /** Number of requests that completed during drain */
  completedCount: number;
  /** Number of requests still in-flight after timeout */
  remaining: number;
  /** Time spent draining in milliseconds */
  durationMs: number;
}

/**
 * Configuration for drain behavior.
 */
export interface DrainConfig {
  /** Maximum time to wait for drain in milliseconds */
  timeoutMs: number;
  /** Interval between drain checks in milliseconds */
  checkIntervalMs: number;
}

const DEFAULT_DRAIN_CONFIG: DrainConfig = {
  timeoutMs: 5000,
  checkIntervalMs: 100,
};

/**
 * In-Flight Request Tracker
 *
 * Tracks active requests for graceful shutdown:
 * - Registers requests when they start
 * - Completes requests when they finish
 * - Provides drain wait functionality for shutdown
 */
export class InflightRequestTracker {
  private activeRequests: Map<string, RequestMetadata> = new Map();
  private completedCount = 0;
  private failedCount = 0;
  private totalCount = 0;

  /**
   * Register a new in-flight request.
   *
   * @param requestId - Unique identifier for the request
   * @param metadata - Request metadata
   */
  start(requestId: string, metadata: RequestMetadata): void {
    this.activeRequests.set(requestId, {
      ...metadata,
      requestId,
    });
    this.totalCount++;

    telemetryEmitter.debug(SpanEvents.REQUEST_INFLIGHT_STARTED, "Request started", {
      component: "inflight_tracker",
      operation: "request_started",
      request_id: requestId,
      endpoint: metadata.endpoint,
      method: metadata.method || "unknown",
      active_count: this.activeRequests.size,
    });
  }

  /**
   * Mark a request as completed successfully.
   *
   * @param requestId - The request identifier
   */
  complete(requestId: string): void {
    const metadata = this.activeRequests.get(requestId);
    if (metadata) {
      const durationMs = Date.now() - metadata.startTime;
      this.activeRequests.delete(requestId);
      this.completedCount++;

      telemetryEmitter.debug(SpanEvents.REQUEST_INFLIGHT_COMPLETED, "Request completed", {
        component: "inflight_tracker",
        operation: "request_completed",
        request_id: requestId,
        endpoint: metadata.endpoint,
        duration_ms: durationMs,
        active_count: this.activeRequests.size,
      });
    }
  }

  /**
   * Mark a request as failed.
   *
   * @param requestId - The request identifier
   * @param error - The error that occurred
   */
  fail(requestId: string, error: Error): void {
    const metadata = this.activeRequests.get(requestId);
    if (metadata) {
      const durationMs = Date.now() - metadata.startTime;
      this.activeRequests.delete(requestId);
      this.failedCount++;

      telemetryEmitter.warn(SpanEvents.REQUEST_INFLIGHT_COMPLETED, "Request failed", {
        component: "inflight_tracker",
        operation: "request_failed",
        request_id: requestId,
        endpoint: metadata.endpoint,
        duration_ms: durationMs,
        error: error.message,
        active_count: this.activeRequests.size,
      });
    }
  }

  /**
   * Get the number of currently active requests.
   */
  getActiveCount(): number {
    return this.activeRequests.size;
  }

  /**
   * Get all active request metadata.
   */
  getActiveRequests(): Map<string, RequestMetadata> {
    return new Map(this.activeRequests);
  }

  /**
   * Wait for all in-flight requests to complete.
   *
   * @param config - Drain configuration (optional)
   * @returns DrainResult with completion status
   */
  async waitForCompletion(config?: Partial<DrainConfig>): Promise<DrainResult> {
    const drainConfig = { ...DEFAULT_DRAIN_CONFIG, ...config };
    const startTime = Date.now();
    const initialCount = this.activeRequests.size;

    telemetryEmitter.info(SpanEvents.LIFECYCLE_DRAIN_STARTED, "Starting request drain", {
      component: "inflight_tracker",
      operation: "drain_started",
      active_count: initialCount,
      timeout_ms: drainConfig.timeoutMs,
      check_interval_ms: drainConfig.checkIntervalMs,
    });

    // If no requests, return immediately
    if (initialCount === 0) {
      const result: DrainResult = {
        drained: true,
        completedCount: 0,
        remaining: 0,
        durationMs: 0,
      };

      telemetryEmitter.info(SpanEvents.LIFECYCLE_DRAIN_COMPLETED, "Drain completed (no requests)", {
        component: "inflight_tracker",
        operation: "drain_completed",
        ...result,
      });

      return result;
    }

    const deadline = startTime + drainConfig.timeoutMs;

    // Poll until drained or timeout
    while (this.activeRequests.size > 0 && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, drainConfig.checkIntervalMs));
    }

    const durationMs = Date.now() - startTime;
    const remaining = this.activeRequests.size;
    const drained = remaining === 0;
    const completedCount = initialCount - remaining;

    const result: DrainResult = {
      drained,
      completedCount,
      remaining,
      durationMs,
    };

    if (drained) {
      telemetryEmitter.info(SpanEvents.LIFECYCLE_DRAIN_COMPLETED, "Drain completed successfully", {
        component: "inflight_tracker",
        operation: "drain_completed",
        ...result,
      });
    } else {
      telemetryEmitter.warn(
        SpanEvents.LIFECYCLE_DRAIN_TIMEOUT,
        "Drain timeout - forcing shutdown",
        {
          component: "inflight_tracker",
          operation: "drain_timeout",
          ...result,
          remaining_endpoints: Array.from(this.activeRequests.values())
            .map((r) => r.endpoint)
            .join(", "),
        }
      );
    }

    return result;
  }

  /**
   * Get statistics about request tracking.
   */
  getStats(): {
    activeCount: number;
    totalCount: number;
    completedCount: number;
    failedCount: number;
    oldestRequestAge: number | null;
  } {
    let oldestRequestAge: number | null = null;
    const now = Date.now();

    for (const metadata of this.activeRequests.values()) {
      const age = now - metadata.startTime;
      if (oldestRequestAge === null || age > oldestRequestAge) {
        oldestRequestAge = age;
      }
    }

    return {
      activeCount: this.activeRequests.size,
      totalCount: this.totalCount,
      completedCount: this.completedCount,
      failedCount: this.failedCount,
      oldestRequestAge,
    };
  }

  /**
   * Reset the tracker.
   * Only for testing purposes.
   */
  reset(): void {
    this.activeRequests.clear();
    this.completedCount = 0;
    this.failedCount = 0;
    this.totalCount = 0;
  }
}

/**
 * Singleton instance of the in-flight request tracker.
 */
export const inflightTracker = new InflightRequestTracker();
