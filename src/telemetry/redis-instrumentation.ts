/* src/telemetry/redis-instrumentation.ts */

import { type Span, SpanKind, SpanStatusCode, trace } from "@opentelemetry/api";
import { SemanticAttributes } from "@opentelemetry/semantic-conventions";
import { recordRedisOperation } from "./metrics";

const tracer = trace.getTracer("redis-bun-instrumentation", "1.0.0");

export interface RedisOperationContext {
  operation: string;
  key?: string;
  args?: string[];
  connectionUrl?: string;
  database?: number;
}

export interface RedisInstrumentationOptions {
  enabled?: boolean;
  sanitizeKeys?: boolean;
  maxKeyLength?: number;
}

const defaultOptions: RedisInstrumentationOptions = {
  enabled: true,
  sanitizeKeys: true,
  maxKeyLength: 100,
};

export class BunRedisInstrumentation {
  private options: RedisInstrumentationOptions;

  constructor(options: RedisInstrumentationOptions = {}) {
    this.options = { ...defaultOptions, ...options };
  }

  isEnabled(): boolean {
    return this.options.enabled ?? true;
  }

  createSpan(context: RedisOperationContext): Span {
    if (!this.isEnabled()) {
      return trace.getActiveSpan() || tracer.startSpan("noop");
    }

    const spanName = `redis.${context.operation.toLowerCase()}`;
    const sanitizedKey = this.sanitizeKey(context.key);

    const span = tracer.startSpan(spanName, {
      kind: SpanKind.CLIENT,
      attributes: {
        [SemanticAttributes.DB_SYSTEM]: "redis",
        [SemanticAttributes.DB_OPERATION]: context.operation.toUpperCase(),
        ...(sanitizedKey && { "db.redis.key": sanitizedKey }),
        ...(context.connectionUrl && {
          "db.connection_string": this.sanitizeConnectionString(context.connectionUrl),
        }),
        ...(context.database !== undefined && { "db.redis.database_index": context.database }),
        "db.redis.client": "bun-native",
      },
    });

    return span;
  }

  recordSuccess(span: Span, result?: any): void {
    if (!this.isEnabled()) return;

    span.setStatus({ code: SpanStatusCode.OK });

    if (result !== undefined) {
      const resultType = typeof result;
      span.setAttributes({
        "db.redis.result.type": resultType,
        "db.redis.result.length": this.getResultLength(result),
      });
    }
  }

  recordError(span: Span, error: Error): void {
    if (!this.isEnabled()) return;

    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message,
    });

    span.recordException(error);
    span.setAttributes({
      "error.name": error.name,
      "error.message": error.message,
    });
  }

  recordCacheMetrics(span: Span, isHit: boolean, latencyMs: number): void {
    if (!this.isEnabled()) return;

    span.setAttributes({
      "cache.hit": isHit,
      "cache.miss": !isHit,
      "db.redis.operation.duration_ms": latencyMs,
    });
  }

  finishSpan(span: Span): void {
    if (!this.isEnabled()) return;
    span.end();
  }

  private sanitizeKey(key?: string): string | undefined {
    if (!key) return undefined;
    if (!this.options.sanitizeKeys) return key;

    const maxLength = this.options.maxKeyLength || 100;

    if (key.includes("consumer_secret:")) {
      return "consumer_secret:***";
    }

    if (key.length > maxLength) {
      return `${key.substring(0, maxLength - 3)}...`;
    }

    return key;
  }

  private sanitizeConnectionString(url: string): string {
    try {
      const parsed = new URL(url);
      // Remove password from connection string for security
      parsed.password = "***";
      return parsed.toString();
    } catch {
      return "redis://***";
    }
  }

  private getResultLength(result: any): number {
    if (typeof result === "string") return result.length;
    if (Array.isArray(result)) return result.length;
    if (result && typeof result === "object") return Object.keys(result).length;
    return 0;
  }
}

export const redisInstrumentation = new BunRedisInstrumentation();

export function instrumentRedisOperation<T>(
  context: RedisOperationContext,
  operation: () => Promise<T>
): Promise<T> {
  if (!redisInstrumentation.isEnabled()) {
    return operation();
  }

  const span = redisInstrumentation.createSpan(context);
  const startTime = performance.now();

  return operation()
    .then((result) => {
      const endTime = performance.now();
      const latencyMs = endTime - startTime;

      redisInstrumentation.recordSuccess(span, result);

      const cacheResult =
        context.operation.toLowerCase() === "get" ? (result ? "hit" : "miss") : undefined;

      if (cacheResult) {
        redisInstrumentation.recordCacheMetrics(span, !!result, latencyMs);
      }

      recordRedisOperation(context.operation, latencyMs, true, cacheResult, {
        database: context.database,
      });

      redisInstrumentation.finishSpan(span);
      return result;
    })
    .catch((error) => {
      const endTime = performance.now();
      const latencyMs = endTime - startTime;

      redisInstrumentation.recordError(span, error);

      const cacheResult = context.operation.toLowerCase() === "get" ? "miss" : undefined;

      if (cacheResult) {
        redisInstrumentation.recordCacheMetrics(span, false, latencyMs);
      }

      recordRedisOperation(context.operation, latencyMs, false, cacheResult, {
        database: context.database,
      });

      redisInstrumentation.finishSpan(span);
      throw error;
    });
}

export function createRedisSpan(context: RedisOperationContext): Span {
  return redisInstrumentation.createSpan(context);
}

export function recordRedisSuccess(span: Span, result?: any): void {
  redisInstrumentation.recordSuccess(span, result);
}

export function recordRedisError(span: Span, error: Error): void {
  redisInstrumentation.recordError(span, error);
}

export function recordRedisCacheMetrics(span: Span, isHit: boolean, latencyMs: number): void {
  redisInstrumentation.recordCacheMetrics(span, isHit, latencyMs);
}

export function finishRedisSpan(span: Span): void {
  redisInstrumentation.finishSpan(span);
}
