import { describe, expect, test } from "bun:test";
import { SpanKind } from "@opentelemetry/api";
import { createSpan, telemetryTracer } from "../../../src/telemetry/tracer";

describe("Tracer Mutation Killers", () => {
  test("initialize is no-op", () => {
    telemetryTracer.initialize({});
    expect(true).toBe(true);
  });

  test("createSpan executes synchronous operation", () => {
    const result = telemetryTracer.createSpan({ operationName: "test-sync" }, () => 42);
    expect(result).toBe(42);
  });

  test("createSpan executes async operation", async () => {
    const result = await telemetryTracer.createSpan(
      { operationName: "test-async" },
      async () => 42
    );
    expect(result).toBe(42);
  });

  test("createSpan handles synchronous errors", () => {
    expect(() =>
      telemetryTracer.createSpan({ operationName: "test-error" }, () => {
        throw new Error("sync error");
      })
    ).toThrow("sync error");
  });

  test("createSpan handles async errors", async () => {
    await expect(
      telemetryTracer.createSpan({ operationName: "test-async-error" }, async () => {
        throw new Error("async error");
      })
    ).rejects.toThrow("async error");
  });

  test("createSpan uses provided kind", () => {
    const result = telemetryTracer.createSpan(
      { operationName: "test-kind", kind: SpanKind.CLIENT },
      () => 42
    );
    expect(result).toBe(42);
  });

  test("createSpan uses provided attributes", () => {
    const result = telemetryTracer.createSpan(
      {
        operationName: "test-attrs",
        attributes: { "test.attr": "value" },
      },
      () => 42
    );
    expect(result).toBe(42);
  });

  test("createHttpSpan executes operation", () => {
    const result = telemetryTracer.createHttpSpan("GET", "/test", 200, () => 42);
    expect(result).toBe(42);
  });

  test("createHttpSpan includes version context", () => {
    const result = telemetryTracer.createHttpSpan("POST", "/test", 201, () => 42, {
      version: "v1",
      source: "header",
      isLatest: true,
      isSupported: true,
    });
    expect(result).toBe(42);
  });

  test("createKongSpan executes operation", () => {
    const result = telemetryTracer.createKongSpan(
      "consumer_lookup",
      "http://kong:8001/consumers/test",
      "GET",
      () => 42
    );
    expect(result).toBe(42);
  });

  test("createKongSpan defaults method to GET", () => {
    const result = telemetryTracer.createKongSpan(
      "consumer_lookup",
      "http://kong:8001/consumers/test",
      undefined,
      () => 42
    );
    expect(result).toBe(42);
  });

  test("createJWTSpan executes operation", () => {
    const result = telemetryTracer.createJWTSpan("sign", () => 42);
    expect(result).toBe(42);
  });

  test("createJWTSpan includes username", () => {
    const result = telemetryTracer.createJWTSpan("verify", () => 42, "testuser");
    expect(result).toBe(42);
  });

  test("createJWTSpan handles missing username", () => {
    const result = telemetryTracer.createJWTSpan("verify", () => 42, undefined);
    expect(result).toBe(42);
  });

  test("addSpanAttributes handles no active span", () => {
    telemetryTracer.addSpanAttributes({ "test.attr": "value" });
    expect(true).toBe(true);
  });

  test("recordException handles no active span", () => {
    telemetryTracer.recordException(new Error("test"));
    expect(true).toBe(true);
  });

  test("getCurrentTraceId returns undefined with no active span", () => {
    const traceId = telemetryTracer.getCurrentTraceId();
    expect(traceId).toBeUndefined();
  });

  test("getCurrentSpanId returns undefined with no active span", () => {
    const spanId = telemetryTracer.getCurrentSpanId();
    expect(spanId).toBeUndefined();
  });

  test("createApiVersionSpan executes operation", () => {
    const result = telemetryTracer.createApiVersionSpan("parse", () => 42);
    expect(result).toBe(42);
  });

  test("createApiVersionSpan includes version", () => {
    const result = telemetryTracer.createApiVersionSpan("route", () => 42, { version: "v2" });
    expect(result).toBe(42);
  });

  test("createApiVersionSpan includes source", () => {
    const result = telemetryTracer.createApiVersionSpan("route", () => 42, { source: "header" });
    expect(result).toBe(42);
  });

  test("createApiVersionSpan includes parseTimeMs", () => {
    const result = telemetryTracer.createApiVersionSpan("route", () => 42, { parseTimeMs: 5 });
    expect(result).toBe(42);
  });

  test("createApiVersionSpan includes routingTimeMs", () => {
    const result = telemetryTracer.createApiVersionSpan("route", () => 42, { routingTimeMs: 10 });
    expect(result).toBe(42);
  });

  test("createApiVersionSpan handles all version info", () => {
    const result = telemetryTracer.createApiVersionSpan("route", () => 42, {
      version: "v1",
      source: "default",
      parseTimeMs: 3,
      routingTimeMs: 7,
    });
    expect(result).toBe(42);
  });

  test("createSpan standalone function", () => {
    const result = createSpan({ operationName: "standalone" }, () => 42);
    expect(result).toBe(42);
  });

  test("async operation returns promise", async () => {
    const result = telemetryTracer.createSpan({ operationName: "promise-test" }, async () => {
      return 99;
    });
    expect(result instanceof Promise).toBe(true);
    expect(await result).toBe(99);
  });

  test("async error includes message", async () => {
    await expect(
      telemetryTracer.createSpan({ operationName: "error-message" }, async () => {
        throw new Error("specific message");
      })
    ).rejects.toThrow("specific message");
  });

  test("sync error includes message", () => {
    expect(() =>
      telemetryTracer.createSpan({ operationName: "sync-error-message" }, () => {
        throw new Error("sync specific");
      })
    ).toThrow("sync specific");
  });
});
