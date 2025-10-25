/* src/telemetry/tracer.ts */

import { context, SpanKind, SpanStatusCode, trace } from "@opentelemetry/api";
import { SemanticAttributes } from "@opentelemetry/semantic-conventions";
import { loadConfig } from "../config/index";

const config = loadConfig();
const telemetryConfig = config.telemetry;

export interface SpanContext {
  operationName: string;
  kind?: SpanKind;
  attributes?: Record<string, string | number | boolean>;
  parentSpan?: any;
}

class BunTelemetryTracer {
  private tracer = trace.getTracer(telemetryConfig.serviceName, telemetryConfig.serviceVersion);

  public initialize(_config?: any): void {
    /* no-op */
  }

  public createSpan<T>(spanContext: SpanContext, operation: () => T | Promise<T>): T | Promise<T> {
    const span = this.tracer.startSpan(spanContext.operationName, {
      kind: spanContext.kind || SpanKind.INTERNAL,
      attributes: spanContext.attributes || {},
    });

    const runWithSpan = <TResult>(
      fn: () => TResult | Promise<TResult>
    ): TResult | Promise<TResult> => {
      return context.with(trace.setSpan(context.active(), span), () => {
        let result: TResult | Promise<TResult>;
        try {
          result = fn();

          if (result instanceof Promise) {
            return result
              .then((res) => {
                span.setStatus({ code: SpanStatusCode.OK });
                return res;
              })
              .catch((error) => {
                span.recordException(error);
                span.setStatus({
                  code: SpanStatusCode.ERROR,
                  message: error.message || "Unknown error",
                });
                throw error;
              })
              .finally(() => {
                span.end();
              });
          }

          span.setStatus({ code: SpanStatusCode.OK });
          span.end();
          return result;
        } catch (error) {
          span.recordException(error as Error);
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: (error as Error).message || "Unknown error",
          });
          span.end();
          throw error;
        }
      });
    };

    return runWithSpan(operation);
  }

  public createHttpSpan<T>(
    method: string,
    url: string,
    statusCode: number,
    operation: () => T | Promise<T>,
    versionContext?: {
      version: string;
      source: string;
      isLatest: boolean;
      isSupported: boolean;
    }
  ): T | Promise<T> {
    const baseAttributes: Record<string, string | number | boolean> = {
      [SemanticAttributes.HTTP_METHOD]: method,
      [SemanticAttributes.HTTP_URL]: url,
      [SemanticAttributes.HTTP_STATUS_CODE]: statusCode,
      "http.server.type": "bun_serve",
    };

    // Add API versioning attributes if provided
    if (versionContext) {
      baseAttributes["api.version"] = versionContext.version;
      baseAttributes["api.version.source"] = versionContext.source;
      baseAttributes["api.version.is_latest"] = versionContext.isLatest;
      baseAttributes["api.version.is_supported"] = versionContext.isSupported;
    }

    return this.createSpan(
      {
        operationName: `${method} ${url}`,
        kind: SpanKind.SERVER,
        attributes: baseAttributes,
      },
      operation
    );
  }

  public createKongSpan<T>(
    operation: string,
    url: string,
    method: string = "GET",
    spanOperation: () => T | Promise<T>
  ): T | Promise<T> {
    return this.createSpan(
      {
        operationName: `http.client.kong.${operation}`,
        kind: SpanKind.CLIENT,
        attributes: {
          [SemanticAttributes.HTTP_METHOD]: method,
          [SemanticAttributes.HTTP_URL]: url,
          "kong.operation": operation,
          "kong.api.type": "admin_api",
          "http.client.type": "kong_gateway",
          component: "kong_client",
          "span.type": "http_client",
        },
      },
      spanOperation
    );
  }

  public createJWTSpan<T>(
    operation: string,
    spanOperation: () => T | Promise<T>,
    username?: string
  ): T | Promise<T> {
    return this.createSpan(
      {
        operationName: `crypto.jwt.${operation}`,
        kind: SpanKind.INTERNAL,
        attributes: {
          "jwt.operation": operation,
          "jwt.username": username || "unknown",
          "crypto.algorithm": "HS256",
          "crypto.key_type": "hmac",
          component: "jwt_service",
          "span.type": "crypto",
        },
      },
      spanOperation
    );
  }

  public addSpanAttributes(attributes: Record<string, string | number | boolean>): void {
    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      activeSpan.setAttributes(attributes);
    }
  }

  public recordException(error: Error): void {
    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      activeSpan.recordException(error);
      activeSpan.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message,
      });
    }
  }

  public getCurrentTraceId(): string | undefined {
    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      return activeSpan.spanContext().traceId;
    }
    return undefined;
  }

  public getCurrentSpanId(): string | undefined {
    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      return activeSpan.spanContext().spanId;
    }
    return undefined;
  }

  public createApiVersionSpan<T>(
    operation: string,
    spanOperation: () => T | Promise<T>,
    versionInfo?: {
      version?: string;
      source?: string;
      parseTimeMs?: number;
      routingTimeMs?: number;
    }
  ): T | Promise<T> {
    const attributes: Record<string, string | number | boolean> = {
      "api.versioning.operation": operation,
      component: "api_versioning",
      "middleware.type": "api_versioning",
    };

    if (versionInfo) {
      if (versionInfo.version) attributes["api.version"] = versionInfo.version;
      if (versionInfo.source) attributes["api.version.source"] = versionInfo.source;
      if (versionInfo.parseTimeMs !== undefined) {
        attributes["api.version.parse_time_ms"] = versionInfo.parseTimeMs;
      }
      if (versionInfo.routingTimeMs !== undefined) {
        attributes["api.version.routing_time_ms"] = versionInfo.routingTimeMs;
      }
    }

    return this.createSpan(
      {
        operationName: `api_versioning.${operation}`,
        kind: SpanKind.INTERNAL,
        attributes,
      },
      spanOperation
    );
  }
}

export const telemetryTracer = new BunTelemetryTracer();

export function createSpan<T>(
  spanContext: SpanContext,
  operation: () => T | Promise<T>
): T | Promise<T> {
  return telemetryTracer.createSpan(spanContext, operation);
}
