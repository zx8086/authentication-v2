/* src/services/cache/redis-operation-tracker.ts */

/**
 * Redis Operation Tracker for graceful shutdown.
 *
 * This module tracks in-flight Redis operations to ensure all pending
 * operations complete before the connection is closed during shutdown.
 *
 * @see SIO-452: Fix ERR_REDIS_CONNECTION_CLOSED During Container Lifecycle
 */

import { lifecycleStateMachine } from "../../lifecycle";
import { SpanEvents, telemetryEmitter } from "../../telemetry/tracer";

/**
 * Metadata stored for each Redis operation.
 */
export interface OperationMetadata {
  /** Operation type (get, set, delete, etc.) */
  type: string;
  /** Operation start timestamp */
  startTime: number;
  /** Redis key being operated on (sanitized) */
  key?: string;
}

/**
 * Handle returned when starting an operation.
 */
export interface OperationHandle {
  /** Unique operation identifier */
  id: string;
  /** Complete the operation */
  complete: () => void;
}

/**
 * Redis Operation Tracker
 *
 * Tracks in-flight Redis operations for shutdown coordination:
 * - Registers operations when they start
 * - Completes operations when they finish
 * - Provides wait functionality for connection close
 * - Prevents new operations during shutdown
 */
export class RedisOperationTracker {
  private pendingOperations: Map<string, OperationMetadata> = new Map();
  private operationCounter = 0;
  private acceptingOperations = true;
  private completedCount = 0;
  private failedCount = 0;

  /**
   * Check if new operations are being accepted.
   */
  canAcceptOperations(): boolean {
    return this.acceptingOperations && !lifecycleStateMachine.isShuttingDown();
  }

  /**
   * Start tracking a Redis operation.
   *
   * @param type - Operation type (get, set, delete, etc.)
   * @param key - Redis key (optional, will be sanitized)
   * @returns OperationHandle with complete callback
   * @throws Error if not accepting operations
   */
  startOperation(type: string, key?: string): OperationHandle {
    if (!this.canAcceptOperations()) {
      throw new Error("Redis operations are not being accepted - service is shutting down");
    }

    const id = `redis_op_${++this.operationCounter}`;
    const sanitizedKey = key ? this.sanitizeKey(key) : undefined;

    this.pendingOperations.set(id, {
      type,
      startTime: Date.now(),
      key: sanitizedKey,
    });

    telemetryEmitter.debug(SpanEvents.REDIS_OPERATION_STARTED, `Redis operation started: ${type}`, {
      component: "redis_operation_tracker",
      operation: "operation_started",
      operation_id: id,
      operation_type: type,
      key: sanitizedKey,
      pending_count: this.pendingOperations.size,
    });

    return {
      id,
      complete: () => this.completeOperation(id),
    };
  }

  /**
   * Mark an operation as completed.
   *
   * @param id - Operation identifier
   */
  completeOperation(id: string): void {
    const metadata = this.pendingOperations.get(id);
    if (metadata) {
      const durationMs = Date.now() - metadata.startTime;
      this.pendingOperations.delete(id);
      this.completedCount++;

      telemetryEmitter.debug(
        SpanEvents.REDIS_OPERATION_COMPLETED,
        `Redis operation completed: ${metadata.type}`,
        {
          component: "redis_operation_tracker",
          operation: "operation_completed",
          operation_id: id,
          operation_type: metadata.type,
          duration_ms: durationMs,
          pending_count: this.pendingOperations.size,
        }
      );
    }
  }

  /**
   * Mark an operation as failed.
   *
   * @param id - Operation identifier
   * @param error - The error that occurred
   */
  failOperation(id: string, error: Error): void {
    const metadata = this.pendingOperations.get(id);
    if (metadata) {
      const durationMs = Date.now() - metadata.startTime;
      this.pendingOperations.delete(id);
      this.failedCount++;

      telemetryEmitter.warn(
        SpanEvents.REDIS_OPERATION_COMPLETED,
        `Redis operation failed: ${metadata.type}`,
        {
          component: "redis_operation_tracker",
          operation: "operation_failed",
          operation_id: id,
          operation_type: metadata.type,
          duration_ms: durationMs,
          error: error.message,
          pending_count: this.pendingOperations.size,
        }
      );
    }
  }

  /**
   * Get the number of pending operations.
   */
  getPendingCount(): number {
    return this.pendingOperations.size;
  }

  /**
   * Stop accepting new operations.
   * Called during shutdown preparation.
   */
  stopAcceptingOperations(): void {
    this.acceptingOperations = false;

    telemetryEmitter.info(
      SpanEvents.REDIS_OPERATION_DRAIN_WAIT,
      "Stopped accepting Redis operations",
      {
        component: "redis_operation_tracker",
        operation: "stop_accepting",
        pending_count: this.pendingOperations.size,
      }
    );
  }

  /**
   * Wait for all pending operations to complete.
   *
   * @param timeoutMs - Maximum time to wait in milliseconds
   * @param checkIntervalMs - Interval between checks (default: 50ms)
   * @returns true if all operations completed, false if timeout
   */
  async waitForCompletion(timeoutMs: number, checkIntervalMs = 50): Promise<boolean> {
    const startTime = Date.now();
    const initialCount = this.pendingOperations.size;

    telemetryEmitter.info(
      SpanEvents.REDIS_OPERATION_DRAIN_WAIT,
      "Waiting for pending Redis operations",
      {
        component: "redis_operation_tracker",
        operation: "wait_started",
        pending_count: initialCount,
        timeout_ms: timeoutMs,
      }
    );

    // If no pending operations, return immediately
    if (initialCount === 0) {
      return true;
    }

    const deadline = startTime + timeoutMs;

    // Poll until all complete or timeout
    while (this.pendingOperations.size > 0 && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, checkIntervalMs));
    }

    const durationMs = Date.now() - startTime;
    const remaining = this.pendingOperations.size;
    const completed = remaining === 0;

    telemetryEmitter.info(
      SpanEvents.REDIS_OPERATION_DRAIN_WAIT,
      `Redis operation wait ${completed ? "completed" : "timeout"}`,
      {
        component: "redis_operation_tracker",
        operation: completed ? "wait_completed" : "wait_timeout",
        initial_count: initialCount,
        remaining_count: remaining,
        duration_ms: durationMs,
      }
    );

    return completed;
  }

  /**
   * Get statistics about operation tracking.
   */
  getStats(): {
    pendingCount: number;
    completedCount: number;
    failedCount: number;
    acceptingOperations: boolean;
    oldestOperationAge: number | null;
    pendingByType: Record<string, number>;
  } {
    let oldestOperationAge: number | null = null;
    const now = Date.now();
    const pendingByType: Record<string, number> = {};

    for (const metadata of this.pendingOperations.values()) {
      const age = now - metadata.startTime;
      if (oldestOperationAge === null || age > oldestOperationAge) {
        oldestOperationAge = age;
      }
      pendingByType[metadata.type] = (pendingByType[metadata.type] || 0) + 1;
    }

    return {
      pendingCount: this.pendingOperations.size,
      completedCount: this.completedCount,
      failedCount: this.failedCount,
      acceptingOperations: this.acceptingOperations,
      oldestOperationAge,
      pendingByType,
    };
  }

  /**
   * Sanitize a Redis key for logging (remove sensitive data).
   */
  private sanitizeKey(key: string): string {
    // Remove potential secrets from key names
    // Keys like "consumer:12345:secret" become "consumer:***:secret"
    return key.replace(/:[a-f0-9-]{32,}:/gi, ":***:");
  }

  /**
   * Reset the tracker.
   * Only for testing purposes.
   */
  reset(): void {
    this.pendingOperations.clear();
    this.operationCounter = 0;
    this.acceptingOperations = true;
    this.completedCount = 0;
    this.failedCount = 0;
  }
}

/**
 * Singleton instance of the Redis operation tracker.
 */
export const redisOperationTracker = new RedisOperationTracker();
