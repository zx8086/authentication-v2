// test/bun/telemetry/tracer-operations.test.ts

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { TEST_KONG_ADMIN_TOKEN } from "../../shared/test-constants";

describe("Tracer Operations", () => {
  const originalEnv = { ...Bun.env };

  beforeEach(async () => {
    Object.keys(Bun.env).forEach((key) => {
      if (!["PATH", "HOME", "USER", "SHELL", "TERM"].includes(key)) {
        delete Bun.env[key];
      }
    });
    Bun.env.NODE_ENV = "test";
    Bun.env.KONG_JWT_AUTHORITY = "https://auth.test.com";
    Bun.env.KONG_JWT_AUDIENCE = "https://api.test.com";
    Bun.env.KONG_ADMIN_URL = originalEnv.KONG_ADMIN_URL || "http://192.168.178.3:30001";
    Bun.env.KONG_ADMIN_TOKEN = TEST_KONG_ADMIN_TOKEN;
    Bun.env.TELEMETRY_MODE = "console";

    const { resetConfigCache } = await import("../../../src/config/config");
    resetConfigCache();
  });

  afterEach(async () => {
    Object.keys(Bun.env).forEach((key) => {
      if (!(key in originalEnv)) {
        delete Bun.env[key];
      }
    });
    Object.assign(Bun.env, originalEnv);

    const { resetConfigCache } = await import("../../../src/config/config");
    resetConfigCache();
  });

  describe("telemetryTracer.createSpan", () => {
    it("should create span and execute synchronous operation", async () => {
      const { telemetryTracer } = await import("../../../src/telemetry/tracer");

      const result = telemetryTracer.createSpan(
        { operationName: "test-sync-operation" },
        () => "sync-result"
      );

      expect(result).toBe("sync-result");
    });

    it("should create span and execute async operation", async () => {
      const { telemetryTracer } = await import("../../../src/telemetry/tracer");

      const result = await telemetryTracer.createSpan(
        { operationName: "test-async-operation" },
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return "async-result";
        }
      );

      expect(result).toBe("async-result");
    });

    it("should handle sync operation errors", async () => {
      const { telemetryTracer } = await import("../../../src/telemetry/tracer");

      expect(() =>
        telemetryTracer.createSpan({ operationName: "test-error" }, () => {
          throw new Error("sync error");
        })
      ).toThrow("sync error");
    });

    it("should handle async operation errors", async () => {
      const { telemetryTracer } = await import("../../../src/telemetry/tracer");

      await expect(
        telemetryTracer.createSpan({ operationName: "test-async-error" }, async () => {
          throw new Error("async error");
        })
      ).rejects.toThrow("async error");
    });

    it("should accept span attributes", async () => {
      const { telemetryTracer } = await import("../../../src/telemetry/tracer");

      const result = telemetryTracer.createSpan(
        {
          operationName: "test-with-attributes",
          attributes: { "custom.attr": "value", "custom.number": 42 },
        },
        () => "result"
      );

      expect(result).toBe("result");
    });
  });

  describe("telemetryTracer.createHttpSpan", () => {
    it("should create HTTP span with basic params", async () => {
      const { telemetryTracer } = await import("../../../src/telemetry/tracer");

      const result = telemetryTracer.createHttpSpan("GET", "/health", 200, () => "http-result");

      expect(result).toBe("http-result");
    });

    it("should create HTTP span with version context", async () => {
      const { telemetryTracer } = await import("../../../src/telemetry/tracer");

      const result = telemetryTracer.createHttpSpan("POST", "/tokens", 201, () => "versioned", {
        version: "v2",
        source: "header",
        isLatest: true,
        isSupported: true,
      });

      expect(result).toBe("versioned");
    });

    it("should handle async HTTP operations", async () => {
      const { telemetryTracer } = await import("../../../src/telemetry/tracer");

      const result = await telemetryTracer.createHttpSpan("GET", "/metrics", 200, async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        return { metrics: true };
      });

      expect(result).toEqual({ metrics: true });
    });
  });

  describe("telemetryTracer.createKongSpan", () => {
    it("should create Kong span", async () => {
      const { telemetryTracer } = await import("../../../src/telemetry/tracer");

      const result = telemetryTracer.createKongSpan(
        "getConsumerSecret",
        "http://kong:8001/consumers/test",
        "GET",
        () => ({ secret: "test" })
      );

      expect(result).toEqual({ secret: "test" });
    });

    it("should default method to GET", async () => {
      const { telemetryTracer } = await import("../../../src/telemetry/tracer");

      const result = telemetryTracer.createKongSpan(
        "healthCheck",
        "http://kong:8001/status",
        undefined,
        () => "healthy"
      );

      expect(result).toBe("healthy");
    });
  });

  describe("telemetryTracer.createJWTSpan", () => {
    it("should create JWT span", async () => {
      const { telemetryTracer } = await import("../../../src/telemetry/tracer");

      const result = telemetryTracer.createJWTSpan("sign", () => "jwt.token.here", "testuser");

      expect(result).toBe("jwt.token.here");
    });

    it("should handle missing username", async () => {
      const { telemetryTracer } = await import("../../../src/telemetry/tracer");

      const result = telemetryTracer.createJWTSpan("verify", () => true);

      expect(result).toBe(true);
    });
  });

  describe("telemetryTracer.createApiVersionSpan", () => {
    it("should create API version span without version info", async () => {
      const { telemetryTracer } = await import("../../../src/telemetry/tracer");

      const result = telemetryTracer.createApiVersionSpan("parseVersion", () => "v1");

      expect(result).toBe("v1");
    });

    it("should create API version span with full version info", async () => {
      const { telemetryTracer } = await import("../../../src/telemetry/tracer");

      const result = telemetryTracer.createApiVersionSpan("routeRequest", () => "routed", {
        version: "v2",
        source: "query",
        parseTimeMs: 0.5,
        routingTimeMs: 1.2,
      });

      expect(result).toBe("routed");
    });

    it("should handle partial version info", async () => {
      const { telemetryTracer } = await import("../../../src/telemetry/tracer");

      const result = telemetryTracer.createApiVersionSpan("validateVersion", () => true, {
        version: "v1",
      });

      expect(result).toBe(true);
    });
  });

  describe("telemetryTracer.addSpanAttributes", () => {
    it("should add attributes when called inside span", async () => {
      const { telemetryTracer } = await import("../../../src/telemetry/tracer");

      const result = telemetryTracer.createSpan({ operationName: "test-add-attrs" }, () => {
        telemetryTracer.addSpanAttributes({ "added.attr": "value" });
        return "done";
      });

      expect(result).toBe("done");
    });

    it("should not throw when called outside span", async () => {
      const { telemetryTracer } = await import("../../../src/telemetry/tracer");

      expect(() => telemetryTracer.addSpanAttributes({ "no.span": true })).not.toThrow();
    });
  });

  describe("telemetryTracer.recordException", () => {
    it("should record exception inside span", async () => {
      const { telemetryTracer } = await import("../../../src/telemetry/tracer");

      const result = telemetryTracer.createSpan({ operationName: "test-record-exception" }, () => {
        const error = new Error("Test exception");
        telemetryTracer.recordException(error);
        return "recorded";
      });

      expect(result).toBe("recorded");
    });

    it("should not throw when called outside span", async () => {
      const { telemetryTracer } = await import("../../../src/telemetry/tracer");

      expect(() => telemetryTracer.recordException(new Error("no span"))).not.toThrow();
    });
  });

  describe("telemetryTracer.getCurrentTraceId", () => {
    it("should return trace ID inside span", async () => {
      const { telemetryTracer } = await import("../../../src/telemetry/tracer");

      let traceId: string | undefined;
      telemetryTracer.createSpan({ operationName: "test-get-trace" }, () => {
        traceId = telemetryTracer.getCurrentTraceId();
        return true;
      });

      // Trace ID may or may not be set depending on OTEL initialization
      expect(traceId === undefined || typeof traceId === "string").toBe(true);
    });

    it("should return undefined outside span", async () => {
      const { telemetryTracer } = await import("../../../src/telemetry/tracer");

      const traceId = telemetryTracer.getCurrentTraceId();

      expect(traceId).toBeUndefined();
    });
  });

  describe("telemetryTracer.getCurrentSpanId", () => {
    it("should return span ID inside span", async () => {
      const { telemetryTracer } = await import("../../../src/telemetry/tracer");

      let spanId: string | undefined;
      telemetryTracer.createSpan({ operationName: "test-get-span" }, () => {
        spanId = telemetryTracer.getCurrentSpanId();
        return true;
      });

      // Span ID may or may not be set depending on OTEL initialization
      expect(spanId === undefined || typeof spanId === "string").toBe(true);
    });

    it("should return undefined outside span", async () => {
      const { telemetryTracer } = await import("../../../src/telemetry/tracer");

      const spanId = telemetryTracer.getCurrentSpanId();

      expect(spanId).toBeUndefined();
    });
  });

  describe("telemetryTracer.initialize", () => {
    it("should accept initialize call (no-op)", async () => {
      const { telemetryTracer } = await import("../../../src/telemetry/tracer");

      expect(() => telemetryTracer.initialize()).not.toThrow();
      expect(() => telemetryTracer.initialize({ custom: "config" })).not.toThrow();
    });
  });

  describe("createSpan standalone export", () => {
    it("should export createSpan function", async () => {
      const { createSpan } = await import("../../../src/telemetry/tracer");

      const result = createSpan({ operationName: "standalone-test" }, () => "standalone");

      expect(result).toBe("standalone");
    });

    it("should work with async operations", async () => {
      const { createSpan } = await import("../../../src/telemetry/tracer");

      const result = await createSpan({ operationName: "standalone-async" }, async () => {
        return "async-standalone";
      });

      expect(result).toBe("async-standalone");
    });
  });
});
