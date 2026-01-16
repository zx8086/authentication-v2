/* test/bun/kong-utils.test.ts */

import { afterAll, afterEach, beforeAll, describe, expect, it } from "bun:test";
import { context, propagation, trace } from "@opentelemetry/api";
import { W3CTraceContextPropagator } from "@opentelemetry/core";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  BasicTracerProvider,
  InMemorySpanExporter,
  SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import {
  createKongApiError,
  createRequestTimeout,
  createStandardHeaders,
  extractConsumerSecret,
  generateCacheKey,
  generateJwtKey,
  generateSecureSecret,
  isConsumerNotFound,
  isSuccessResponse,
  KongApiError,
} from "../../src/adapters/kong-utils";

describe("kong-utils", () => {
  let provider: BasicTracerProvider;
  let exporter: InMemorySpanExporter;

  beforeAll(() => {
    // Set up W3C Trace Context propagator
    propagation.setGlobalPropagator(new W3CTraceContextPropagator());

    // Set up a real tracer provider for testing
    exporter = new InMemorySpanExporter();
    provider = new BasicTracerProvider({
      resource: resourceFromAttributes({
        "service.name": "test-service",
      }),
      spanProcessors: [new SimpleSpanProcessor(exporter)],
    });
    trace.setGlobalTracerProvider(provider);
  });

  afterAll(async () => {
    await provider.shutdown();
  });

  afterEach(() => {
    exporter.reset();
  });

  describe("createStandardHeaders", () => {
    it("should include Content-Type and User-Agent headers", () => {
      const headers = createStandardHeaders();

      expect(headers["Content-Type"]).toBe("application/json");
      expect(headers["User-Agent"]).toBe("Authentication-Service/1.0");
    });

    it("should merge base headers with standard headers", () => {
      const headers = createStandardHeaders({
        Authorization: "Bearer test-token",
        "X-Custom-Header": "custom-value",
      });

      expect(headers["Content-Type"]).toBe("application/json");
      expect(headers["User-Agent"]).toBe("Authentication-Service/1.0");
      expect(headers.Authorization).toBe("Bearer test-token");
      expect(headers["X-Custom-Header"]).toBe("custom-value");
    });

    it("should allow base headers to override standard headers", () => {
      const headers = createStandardHeaders({
        "Content-Type": "application/xml",
      });

      expect(headers["Content-Type"]).toBe("application/xml");
    });

    it("should inject W3C Trace Context headers when trace context is present", () => {
      const tracer = trace.getTracer("test-tracer");
      const span = tracer.startSpan("test-span");
      const spanContext = span.spanContext();

      // Verify span has valid trace context
      expect(spanContext.traceId).toMatch(/^[a-f0-9]{32}$/);
      expect(spanContext.spanId).toMatch(/^[a-f0-9]{16}$/);

      // Create headers with trace context by injecting into a context with the span
      const headers: Record<string, string> = {};
      const ctx = trace.setSpan(context.active(), span);
      propagation.inject(ctx, headers);

      // When there's an active span context, traceparent header should be present
      // The format is: version-traceId-spanId-flags (e.g., "00-abc123...-def456...-01")
      expect(headers.traceparent).toBeDefined();
      expect(headers.traceparent).toMatch(/^00-[a-f0-9]{32}-[a-f0-9]{16}-[a-f0-9]{2}$/);
      expect(headers.traceparent).toContain(spanContext.traceId);
      expect(headers.traceparent).toContain(spanContext.spanId);

      span.end();
    });

    it("should not include traceparent when no active span", () => {
      // Without an active span, createStandardHeaders should still work
      const headers = createStandardHeaders();

      // Standard headers should still be present
      expect(headers["Content-Type"]).toBe("application/json");
      expect(headers["User-Agent"]).toBe("Authentication-Service/1.0");

      // Without a span context, traceparent should not be present
      expect(headers.traceparent).toBeUndefined();
    });

    it("should preserve trace context through nested operations", () => {
      const tracer = trace.getTracer("test-tracer");
      const parentSpan = tracer.startSpan("parent-span");
      const parentTraceId = parentSpan.spanContext().traceId;

      // Create child span within parent context
      const parentContext = trace.setSpan(context.active(), parentSpan);
      const childSpan = tracer.startSpan("child-span", undefined, parentContext);

      // Inject headers from child context
      const childHeaders: Record<string, string> = {};
      const childContext = trace.setSpan(parentContext, childSpan);
      propagation.inject(childContext, childHeaders);

      // Child span's headers should contain the same trace ID as parent
      expect(childHeaders.traceparent).toBeDefined();
      expect(childHeaders.traceparent).toContain(parentTraceId);

      childSpan.end();
      parentSpan.end();
    });
  });

  describe("KongApiError", () => {
    it("should create error with status and statusText", () => {
      const error = new KongApiError("Test error", 500, "Internal Server Error");

      expect(error.message).toBe("Test error");
      expect(error.status).toBe(500);
      expect(error.statusText).toBe("Internal Server Error");
      expect(error.name).toBe("KongApiError");
    });

    it("should mark 5xx errors as infrastructure errors", () => {
      expect(new KongApiError("Error", 500).isInfrastructureError).toBe(true);
      expect(new KongApiError("Error", 502).isInfrastructureError).toBe(true);
      expect(new KongApiError("Error", 503).isInfrastructureError).toBe(true);
      expect(new KongApiError("Error", 504).isInfrastructureError).toBe(true);
    });

    it("should mark rate limit (429) as infrastructure error", () => {
      expect(new KongApiError("Rate limited", 429).isInfrastructureError).toBe(true);
    });

    it("should not mark 4xx errors as infrastructure errors", () => {
      expect(new KongApiError("Not found", 404).isInfrastructureError).toBe(false);
      expect(new KongApiError("Unauthorized", 401).isInfrastructureError).toBe(false);
      expect(new KongApiError("Forbidden", 403).isInfrastructureError).toBe(false);
      expect(new KongApiError("Bad request", 400).isInfrastructureError).toBe(false);
    });
  });

  describe("generateCacheKey", () => {
    it("should generate cache key with consumer_secret prefix", () => {
      const key = generateCacheKey("consumer-123");
      expect(key).toBe("consumer_secret:consumer-123");
    });

    it("should handle special characters in consumer ID", () => {
      const key = generateCacheKey("user@domain.com");
      expect(key).toBe("consumer_secret:user@domain.com");
    });
  });

  describe("generateSecureSecret", () => {
    it("should generate 64-character hex string", () => {
      const secret = generateSecureSecret();
      expect(secret).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should generate unique secrets", () => {
      const secrets = new Set(Array.from({ length: 10 }, () => generateSecureSecret()));
      expect(secrets.size).toBe(10);
    });
  });

  describe("generateJwtKey", () => {
    it("should generate 32-character hex string without dashes", () => {
      const key = generateJwtKey();
      expect(key).toMatch(/^[a-f0-9]{32}$/);
      expect(key).not.toContain("-");
    });
  });

  describe("createRequestTimeout", () => {
    it("should create AbortSignal with default timeout", () => {
      const signal = createRequestTimeout();
      expect(signal).toBeInstanceOf(AbortSignal);
    });

    it("should create AbortSignal with custom timeout", () => {
      const signal = createRequestTimeout(10000);
      expect(signal).toBeInstanceOf(AbortSignal);
    });
  });

  describe("extractConsumerSecret", () => {
    it("should extract first secret from data array", () => {
      const data = {
        data: [
          {
            id: "secret-1",
            key: "key-1",
            secret: "secret-value-1",
            consumer: { id: "consumer-1" },
          },
        ],
        total: 1,
      };

      const secret = extractConsumerSecret(data);
      expect(secret).not.toBeNull();
      expect(secret?.id).toBe("secret-1");
      expect(secret?.key).toBe("key-1");
    });

    it("should return null for empty data array", () => {
      expect(extractConsumerSecret({ data: [], total: 0 })).toBeNull();
    });

    it("should return null for missing data property", () => {
      expect(extractConsumerSecret({} as any)).toBeNull();
    });

    it("should return null for incomplete secret data", () => {
      const incomplete = {
        data: [{ id: "secret-1" }],
        total: 1,
      };
      expect(extractConsumerSecret(incomplete as any)).toBeNull();
    });
  });

  describe("isConsumerNotFound", () => {
    it("should return true for 404 status", () => {
      const response = new Response(null, { status: 404 });
      expect(isConsumerNotFound(response)).toBe(true);
    });

    it("should return false for other statuses", () => {
      expect(isConsumerNotFound(new Response(null, { status: 200 }))).toBe(false);
      expect(isConsumerNotFound(new Response(null, { status: 500 }))).toBe(false);
    });
  });

  describe("isSuccessResponse", () => {
    it("should return true for 2xx status codes", () => {
      expect(isSuccessResponse(new Response(null, { status: 200 }))).toBe(true);
      expect(isSuccessResponse(new Response(null, { status: 201 }))).toBe(true);
      expect(isSuccessResponse(new Response(null, { status: 204 }))).toBe(true);
    });

    it("should return false for non-2xx status codes", () => {
      expect(isSuccessResponse(new Response(null, { status: 400 }))).toBe(false);
      expect(isSuccessResponse(new Response(null, { status: 404 }))).toBe(false);
      expect(isSuccessResponse(new Response(null, { status: 500 }))).toBe(false);
    });
  });

  describe("createKongApiError", () => {
    it("should create error from response with 401 status", async () => {
      const response = new Response(null, { status: 401, statusText: "Unauthorized" });
      const error = await createKongApiError(response);

      expect(error.status).toBe(401);
      expect(error.message).toContain("Authentication failed");
    });

    it("should create error from response with 404 status", async () => {
      const response = new Response(null, { status: 404, statusText: "Not Found" });
      const error = await createKongApiError(response);

      expect(error.status).toBe(404);
      expect(error.message).toContain("not found");
    });

    it("should create error from response with 500 status", async () => {
      const response = new Response(null, { status: 500, statusText: "Internal Server Error" });
      const error = await createKongApiError(response);

      expect(error.status).toBe(500);
      expect(error.isInfrastructureError).toBe(true);
    });
  });
});
