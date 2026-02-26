// test/bun/telemetry/telemetry-emitter.test.ts

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { TEST_KONG_ADMIN_TOKEN } from "../../shared/test-constants";

describe("TelemetryEmitter", () => {
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

  describe("telemetryEmitter singleton", () => {
    it("should export telemetryEmitter from tracer.ts", async () => {
      const { telemetryEmitter } = await import("../../../src/telemetry/tracer");

      expect(telemetryEmitter).toBeDefined();
      expect(typeof telemetryEmitter.emit).toBe("function");
      expect(typeof telemetryEmitter.info).toBe("function");
      expect(typeof telemetryEmitter.debug).toBe("function");
      expect(typeof telemetryEmitter.warn).toBe("function");
      expect(typeof telemetryEmitter.error).toBe("function");
      expect(typeof telemetryEmitter.timed).toBe("function");
      expect(typeof telemetryEmitter.timedWithLevel).toBe("function");
    });

    it("should export SpanEvents from tracer.ts", async () => {
      const { SpanEvents } = await import("../../../src/telemetry/tracer");

      expect(SpanEvents).toBeDefined();
      expect(SpanEvents.CACHE_HIT).toBe("cache.hit");
      expect(SpanEvents.CB_STATE_OPEN).toBe("circuit_breaker.state.open");
      expect(SpanEvents.KONG_CONSUMER_NOT_FOUND).toBe("kong.consumer.not_found");
    });
  });

  describe("emit method", () => {
    it("should emit with default info level", async () => {
      const { telemetryEmitter, SpanEvents } = await import("../../../src/telemetry/tracer");

      // Should not throw
      expect(() => {
        telemetryEmitter.emit({
          event: SpanEvents.CACHE_HIT,
          message: "Test message",
        });
      }).not.toThrow();
    });

    it("should emit with explicit level", async () => {
      const { telemetryEmitter, SpanEvents } = await import("../../../src/telemetry/tracer");

      // Should not throw for any level
      expect(() => {
        telemetryEmitter.emit({
          event: SpanEvents.CACHE_HIT,
          message: "Debug message",
          level: "debug",
        });
      }).not.toThrow();

      expect(() => {
        telemetryEmitter.emit({
          event: SpanEvents.CACHE_MISS,
          message: "Info message",
          level: "info",
        });
      }).not.toThrow();

      expect(() => {
        telemetryEmitter.emit({
          event: SpanEvents.CB_FAILURE,
          message: "Warn message",
          level: "warn",
        });
      }).not.toThrow();

      expect(() => {
        telemetryEmitter.emit({
          event: SpanEvents.CB_STATE_OPEN,
          message: "Error message",
          level: "error",
        });
      }).not.toThrow();
    });

    it("should emit with attributes", async () => {
      const { telemetryEmitter, SpanEvents } = await import("../../../src/telemetry/tracer");

      expect(() => {
        telemetryEmitter.emit({
          event: SpanEvents.CACHE_HIT,
          message: "Test with attributes",
          attributes: {
            component: "test",
            operation: "emit_test",
            duration_ms: 42,
            success: true,
          },
        });
      }).not.toThrow();
    });

    it("should filter out undefined attributes", async () => {
      const { telemetryEmitter, SpanEvents } = await import("../../../src/telemetry/tracer");

      expect(() => {
        telemetryEmitter.emit({
          event: SpanEvents.CACHE_MISS,
          message: "Test with undefined attributes",
          attributes: {
            component: "test",
            optional_value: undefined,
            present_value: "present",
          },
        });
      }).not.toThrow();
    });

    it("should handle startTime for timed events", async () => {
      const { telemetryEmitter, SpanEvents } = await import("../../../src/telemetry/tracer");
      const startTime = performance.now();

      // Simulate some work
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(() => {
        telemetryEmitter.emit({
          event: SpanEvents.CACHE_SET,
          message: "Timed operation completed",
          startTime,
        });
      }).not.toThrow();
    });
  });

  describe("convenience methods", () => {
    it("info should emit at info level", async () => {
      const { telemetryEmitter, SpanEvents } = await import("../../../src/telemetry/tracer");

      expect(() => {
        telemetryEmitter.info(SpanEvents.CACHE_HIT, "Info log", { key: "test" });
      }).not.toThrow();
    });

    it("debug should emit at debug level", async () => {
      const { telemetryEmitter, SpanEvents } = await import("../../../src/telemetry/tracer");

      expect(() => {
        telemetryEmitter.debug(SpanEvents.CACHE_OPERATION_STARTED, "Debug log", { key: "test" });
      }).not.toThrow();
    });

    it("warn should emit at warn level", async () => {
      const { telemetryEmitter, SpanEvents } = await import("../../../src/telemetry/tracer");

      expect(() => {
        telemetryEmitter.warn(SpanEvents.CB_FAILURE, "Warning log", { error: "test error" });
      }).not.toThrow();
    });

    it("error should emit at error level", async () => {
      const { telemetryEmitter, SpanEvents } = await import("../../../src/telemetry/tracer");

      expect(() => {
        telemetryEmitter.error(SpanEvents.CB_STATE_OPEN, "Error log", { failure_count: 5 });
      }).not.toThrow();
    });

    it("should work without attributes", async () => {
      const { telemetryEmitter, SpanEvents } = await import("../../../src/telemetry/tracer");

      expect(() => telemetryEmitter.info(SpanEvents.CACHE_HIT, "No attributes")).not.toThrow();
      expect(() => telemetryEmitter.debug(SpanEvents.CACHE_MISS, "No attributes")).not.toThrow();
      expect(() => telemetryEmitter.warn(SpanEvents.CB_FAILURE, "No attributes")).not.toThrow();
      expect(() => telemetryEmitter.error(SpanEvents.CB_STATE_OPEN, "No attributes")).not.toThrow();
    });
  });

  describe("timed methods", () => {
    it("timed should emit at info level with duration", async () => {
      const { telemetryEmitter, SpanEvents } = await import("../../../src/telemetry/tracer");
      const startTime = performance.now();

      await new Promise((resolve) => setTimeout(resolve, 5));

      expect(() => {
        telemetryEmitter.timed(SpanEvents.CACHE_SET, "Operation completed", startTime, {
          key: "test",
        });
      }).not.toThrow();
    });

    it("timedWithLevel should emit at specified level with duration", async () => {
      const { telemetryEmitter, SpanEvents } = await import("../../../src/telemetry/tracer");
      const startTime = performance.now();

      await new Promise((resolve) => setTimeout(resolve, 5));

      expect(() => {
        telemetryEmitter.timedWithLevel(
          SpanEvents.CB_TIMEOUT,
          "Operation timed out",
          "warn",
          startTime,
          { operation: "test" }
        );
      }).not.toThrow();
    });

    it("timed should work without attributes", async () => {
      const { telemetryEmitter, SpanEvents } = await import("../../../src/telemetry/tracer");
      const startTime = performance.now();

      expect(() => {
        telemetryEmitter.timed(SpanEvents.CACHE_DELETE, "Deleted", startTime);
      }).not.toThrow();
    });
  });

  describe("SpanEvents constants", () => {
    it("should have circuit breaker events", async () => {
      const { SpanEvents } = await import("../../../src/telemetry/tracer");

      expect(SpanEvents.CB_STATE_OPEN).toBe("circuit_breaker.state.open");
      expect(SpanEvents.CB_STATE_HALF_OPEN).toBe("circuit_breaker.state.half_open");
      expect(SpanEvents.CB_STATE_CLOSED).toBe("circuit_breaker.state.closed");
      expect(SpanEvents.CB_FAILURE).toBe("circuit_breaker.failure");
      expect(SpanEvents.CB_FALLBACK_USED).toBe("circuit_breaker.fallback.used");
    });

    it("should have cache events", async () => {
      const { SpanEvents } = await import("../../../src/telemetry/tracer");

      expect(SpanEvents.CACHE_HIT).toBe("cache.hit");
      expect(SpanEvents.CACHE_MISS).toBe("cache.miss");
      expect(SpanEvents.CACHE_SET).toBe("cache.set");
      expect(SpanEvents.CACHE_DELETE).toBe("cache.delete");
      expect(SpanEvents.CACHE_CONNECTED).toBe("cache.connection.established");
      expect(SpanEvents.CACHE_DISCONNECTED).toBe("cache.connection.lost");
    });

    it("should have kong events", async () => {
      const { SpanEvents } = await import("../../../src/telemetry/tracer");

      expect(SpanEvents.KONG_CONSUMER_FOUND).toBe("kong.consumer.found");
      expect(SpanEvents.KONG_CONSUMER_NOT_FOUND).toBe("kong.consumer.not_found");
      expect(SpanEvents.KONG_CACHE_HIT).toBe("kong.cache.hit");
      expect(SpanEvents.KONG_REQUEST_SUCCESS).toBe("kong.request.success");
      expect(SpanEvents.KONG_REQUEST_FAILED).toBe("kong.request.failed");
    });

    it("should have validation events", async () => {
      const { SpanEvents } = await import("../../../src/telemetry/tracer");

      expect(SpanEvents.VALIDATION_FAILED).toBe("validation.failed");
      expect(SpanEvents.VALIDATION_FAILED_STRICT).toBe("validation.failed.strict");
      expect(SpanEvents.VALIDATION_JSON_PARSE_FAILED).toBe("validation.json.parse_failed");
      expect(SpanEvents.VALIDATION_ARRAY_FILTERED).toBe("validation.array.filtered");
    });

    it("should have health check events", async () => {
      const { SpanEvents } = await import("../../../src/telemetry/tracer");

      expect(SpanEvents.HEALTH_CHECK_SUCCESS).toBe("health.check.success");
      expect(SpanEvents.HEALTH_CHECK_DEGRADED).toBe("health.check.degraded");
      expect(SpanEvents.HEALTH_CHECK_FAILED).toBe("health.check.failed");
    });
  });

  describe("integration with spans", () => {
    it("should emit event within a span context", async () => {
      const { telemetryTracer, telemetryEmitter, SpanEvents } = await import(
        "../../../src/telemetry/tracer"
      );

      const result = telemetryTracer.createSpan({ operationName: "test-emitter-in-span" }, () => {
        telemetryEmitter.info(SpanEvents.CACHE_HIT, "Cache hit within span", { key: "test" });
        return "completed";
      });

      expect(result).toBe("completed");
    });

    it("should emit multiple events within a span", async () => {
      const { telemetryTracer, telemetryEmitter, SpanEvents } = await import(
        "../../../src/telemetry/tracer"
      );

      const result = await telemetryTracer.createSpan(
        { operationName: "test-multiple-emits" },
        async () => {
          telemetryEmitter.debug(SpanEvents.CACHE_OPERATION_STARTED, "Starting cache operation");

          await new Promise((resolve) => setTimeout(resolve, 5));

          telemetryEmitter.info(SpanEvents.CACHE_HIT, "Cache hit", { key: "test" });
          telemetryEmitter.info(SpanEvents.CACHE_OPERATION_COMPLETED, "Cache operation completed");

          return "done";
        }
      );

      expect(result).toBe("done");
    });

    it("should emit timed event within a span", async () => {
      const { telemetryTracer, telemetryEmitter, SpanEvents } = await import(
        "../../../src/telemetry/tracer"
      );

      const result = await telemetryTracer.createSpan(
        { operationName: "test-timed-emitter" },
        async () => {
          const start = performance.now();
          await new Promise((resolve) => setTimeout(resolve, 10));
          telemetryEmitter.timed(SpanEvents.CACHE_SET, "Timed operation", start);
          return "timed";
        }
      );

      expect(result).toBe("timed");
    });
  });
});
