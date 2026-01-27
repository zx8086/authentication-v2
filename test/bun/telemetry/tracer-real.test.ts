/* test/bun/telemetry/tracer-real.test.ts
 * Real behavior tests for telemetry/tracer.ts
 */

import { describe, expect, it } from "bun:test";
import { SpanKind } from "@opentelemetry/api";
import { telemetryTracer } from "../../../src/telemetry/tracer";

describe("Telemetry Tracer - Real behavior", () => {
  describe("initialize", () => {
    it("should initialize without throwing", () => {
      expect(() => telemetryTracer.initialize()).not.toThrow();
      expect(() => telemetryTracer.initialize({})).not.toThrow();
      expect(() => telemetryTracer.initialize({ test: "config" })).not.toThrow();
    });
  });

  describe("createSpan - Synchronous operations", () => {
    it("should execute synchronous operation and return result", () => {
      const result = telemetryTracer.createSpan(
        {
          operationName: "test.sync.operation",
          kind: SpanKind.INTERNAL,
        },
        () => {
          return 42;
        }
      );

      expect(result).toBe(42);
    });

    it("should handle synchronous operation with string return", () => {
      const result = telemetryTracer.createSpan(
        {
          operationName: "test.sync.string",
        },
        () => {
          return "test-result";
        }
      );

      expect(result).toBe("test-result");
    });

    it("should handle synchronous operation with object return", () => {
      const result = telemetryTracer.createSpan(
        {
          operationName: "test.sync.object",
        },
        () => {
          return { success: true, value: 123 };
        }
      );

      expect(result).toEqual({ success: true, value: 123 });
    });

    it("should handle synchronous operation that throws error", () => {
      expect(() => {
        telemetryTracer.createSpan(
          {
            operationName: "test.sync.error",
          },
          () => {
            throw new Error("Test error");
          }
        );
      }).toThrow("Test error");
    });

    it("should handle synchronous operation with custom attributes", () => {
      const result = telemetryTracer.createSpan(
        {
          operationName: "test.with.attributes",
          attributes: {
            "test.string": "value",
            "test.number": 123,
            "test.boolean": true,
          },
        },
        () => {
          return "success";
        }
      );

      expect(result).toBe("success");
    });

    it("should handle empty attributes object", () => {
      const result = telemetryTracer.createSpan(
        {
          operationName: "test.empty.attributes",
          attributes: {},
        },
        () => {
          return "ok";
        }
      );

      expect(result).toBe("ok");
    });

    it("should default to INTERNAL span kind when not specified", () => {
      const result = telemetryTracer.createSpan(
        {
          operationName: "test.default.kind",
        },
        () => {
          return "default-kind";
        }
      );

      expect(result).toBe("default-kind");
    });
  });

  describe("createSpan - Asynchronous operations", () => {
    it("should execute async operation and return result", async () => {
      const result = await telemetryTracer.createSpan(
        {
          operationName: "test.async.operation",
        },
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return 42;
        }
      );

      expect(result).toBe(42);
    });

    it("should handle async operation that resolves with string", async () => {
      const result = await telemetryTracer.createSpan(
        {
          operationName: "test.async.string",
        },
        async () => {
          return Promise.resolve("async-result");
        }
      );

      expect(result).toBe("async-result");
    });

    it("should handle async operation that resolves with object", async () => {
      const result = await telemetryTracer.createSpan(
        {
          operationName: "test.async.object",
        },
        async () => {
          return Promise.resolve({ data: "test", count: 5 });
        }
      );

      expect(result).toEqual({ data: "test", count: 5 });
    });

    it("should handle async operation that rejects with error", async () => {
      try {
        await telemetryTracer.createSpan(
          {
            operationName: "test.async.error",
          },
          async () => {
            throw new Error("Async test error");
          }
        );
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect((error as Error).message).toBe("Async test error");
      }
    });

    it("should handle async operation with Promise.reject", async () => {
      try {
        await telemetryTracer.createSpan(
          {
            operationName: "test.async.reject",
          },
          async () => {
            return Promise.reject(new Error("Promise rejected"));
          }
        );
        expect(true).toBe(false);
      } catch (error) {
        expect((error as Error).message).toBe("Promise rejected");
      }
    });

    it("should handle error without message property", async () => {
      try {
        await telemetryTracer.createSpan(
          {
            operationName: "test.error.no.message",
          },
          async () => {
            const err: any = { code: "TEST_ERROR" };
            throw err;
          }
        );
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
        expect((error as any).code).toBe("TEST_ERROR");
      }
    });
  });

  describe("createHttpSpan", () => {
    it("should create HTTP span with basic attributes", () => {
      const result = telemetryTracer.createHttpSpan("GET", "/health", 200, () => {
        return "OK";
      });

      expect(result).toBe("OK");
    });

    it("should handle POST request", () => {
      const result = telemetryTracer.createHttpSpan("POST", "/api/users", 201, () => {
        return { id: 1, created: true };
      });

      expect(result).toEqual({ id: 1, created: true });
    });

    it("should handle 404 status code", () => {
      const result = telemetryTracer.createHttpSpan("GET", "/not-found", 404, () => {
        return "Not Found";
      });

      expect(result).toBe("Not Found");
    });

    it("should handle 500 status code", () => {
      const result = telemetryTracer.createHttpSpan("GET", "/error", 500, () => {
        return "Internal Server Error";
      });

      expect(result).toBe("Internal Server Error");
    });

    it("should handle version context with all fields", () => {
      const result = telemetryTracer.createHttpSpan(
        "GET",
        "/api/v2/users",
        200,
        () => {
          return "Success";
        },
        {
          version: "v2",
          source: "header",
          isLatest: true,
          isSupported: true,
        }
      );

      expect(result).toBe("Success");
    });

    it("should handle version context with isLatest false", () => {
      const result = telemetryTracer.createHttpSpan(
        "GET",
        "/api/v1/users",
        200,
        () => {
          return "Success";
        },
        {
          version: "v1",
          source: "url",
          isLatest: false,
          isSupported: true,
        }
      );

      expect(result).toBe("Success");
    });

    it("should handle version context with isSupported false", () => {
      const result = telemetryTracer.createHttpSpan(
        "GET",
        "/api/v0/users",
        200,
        () => {
          return "Deprecated";
        },
        {
          version: "v0",
          source: "default",
          isLatest: false,
          isSupported: false,
        }
      );

      expect(result).toBe("Deprecated");
    });

    it("should handle HTTP span with async operation", async () => {
      const result = await telemetryTracer.createHttpSpan("GET", "/async", 200, async () => {
        return Promise.resolve({ data: "async-http" });
      });

      expect(result).toEqual({ data: "async-http" });
    });

    it("should handle PUT method", () => {
      const result = telemetryTracer.createHttpSpan("PUT", "/api/users/1", 200, () => {
        return { updated: true };
      });

      expect(result).toEqual({ updated: true });
    });

    it("should handle DELETE method", () => {
      const result = telemetryTracer.createHttpSpan("DELETE", "/api/users/1", 204, () => {
        return null;
      });

      expect(result).toBe(null);
    });

    it("should handle PATCH method", () => {
      const result = telemetryTracer.createHttpSpan("PATCH", "/api/users/1", 200, () => {
        return { patched: true };
      });

      expect(result).toEqual({ patched: true });
    });
  });

  describe("createKongSpan", () => {
    it("should create Kong span with default GET method", () => {
      const result = telemetryTracer.createKongSpan(
        "fetch_consumer",
        "http://kong:8001/consumers/test",
        undefined,
        () => {
          return { id: "test-consumer" };
        }
      );

      expect(result).toEqual({ id: "test-consumer" });
    });

    it("should create Kong span with explicit GET method", () => {
      const result = telemetryTracer.createKongSpan(
        "fetch_consumer",
        "http://kong:8001/consumers/test",
        "GET",
        () => {
          return { id: "test" };
        }
      );

      expect(result).toEqual({ id: "test" });
    });

    it("should create Kong span with POST method", () => {
      const result = telemetryTracer.createKongSpan(
        "create_consumer",
        "http://kong:8001/consumers",
        "POST",
        () => {
          return { created: true };
        }
      );

      expect(result).toEqual({ created: true });
    });

    it("should create Kong span with async operation", async () => {
      const result = await telemetryTracer.createKongSpan(
        "async_operation",
        "http://kong:8001/status",
        "GET",
        async () => {
          return Promise.resolve({ status: "healthy" });
        }
      );

      expect(result).toEqual({ status: "healthy" });
    });

    it("should handle Kong span for different operations", () => {
      const operations = [
        "fetch_consumer",
        "create_consumer",
        "update_consumer",
        "delete_consumer",
      ];

      for (const op of operations) {
        const result = telemetryTracer.createKongSpan(op, "http://kong:8001/test", "GET", () => {
          return `${op}-result`;
        });

        expect(result).toBe(`${op}-result`);
      }
    });
  });

  describe("createJWTSpan", () => {
    it("should create JWT span with username", () => {
      const result = telemetryTracer.createJWTSpan(
        "sign",
        () => {
          return "jwt-token-123";
        },
        "test@example.com"
      );

      expect(result).toBe("jwt-token-123");
    });

    it("should create JWT span without username", () => {
      const result = telemetryTracer.createJWTSpan("sign", () => {
        return "jwt-token-456";
      });

      expect(result).toBe("jwt-token-456");
    });

    it("should create JWT span with undefined username", () => {
      const result = telemetryTracer.createJWTSpan(
        "sign",
        () => {
          return "jwt-token-789";
        },
        undefined
      );

      expect(result).toBe("jwt-token-789");
    });

    it("should handle different JWT operations", () => {
      const operations = ["sign", "verify", "decode", "refresh"];

      for (const op of operations) {
        const result = telemetryTracer.createJWTSpan(op, () => {
          return `${op}-result`;
        });

        expect(result).toBe(`${op}-result`);
      }
    });

    it("should handle async JWT operation", async () => {
      const result = await telemetryTracer.createJWTSpan("sign", async () => {
        return Promise.resolve("async-jwt-token");
      });

      expect(result).toBe("async-jwt-token");
    });
  });

  describe("createApiVersionSpan", () => {
    it("should create API version span without version info", () => {
      const result = telemetryTracer.createApiVersionSpan("parse_version", () => {
        return { version: "v1" };
      });

      expect(result).toEqual({ version: "v1" });
    });

    it("should create API version span with version only", () => {
      const result = telemetryTracer.createApiVersionSpan(
        "parse_version",
        () => {
          return { parsed: true };
        },
        { version: "v2" }
      );

      expect(result).toEqual({ parsed: true });
    });

    it("should create API version span with source only", () => {
      const result = telemetryTracer.createApiVersionSpan(
        "parse_version",
        () => {
          return { parsed: true };
        },
        { source: "header" }
      );

      expect(result).toEqual({ parsed: true });
    });

    it("should create API version span with parseTimeMs", () => {
      const result = telemetryTracer.createApiVersionSpan(
        "parse_version",
        () => {
          return { parsed: true };
        },
        { parseTimeMs: 1.5 }
      );

      expect(result).toEqual({ parsed: true });
    });

    it("should create API version span with parseTimeMs = 0", () => {
      const result = telemetryTracer.createApiVersionSpan(
        "parse_version",
        () => {
          return { parsed: true };
        },
        { parseTimeMs: 0 }
      );

      expect(result).toEqual({ parsed: true });
    });

    it("should create API version span with routingTimeMs", () => {
      const result = telemetryTracer.createApiVersionSpan(
        "route_version",
        () => {
          return { routed: true };
        },
        { routingTimeMs: 2.3 }
      );

      expect(result).toEqual({ routed: true });
    });

    it("should create API version span with routingTimeMs = 0", () => {
      const result = telemetryTracer.createApiVersionSpan(
        "route_version",
        () => {
          return { routed: true };
        },
        { routingTimeMs: 0 }
      );

      expect(result).toEqual({ routed: true });
    });

    it("should create API version span with all version info", () => {
      const result = telemetryTracer.createApiVersionSpan(
        "full_version",
        () => {
          return { complete: true };
        },
        {
          version: "v3",
          source: "query",
          parseTimeMs: 1.2,
          routingTimeMs: 0.8,
        }
      );

      expect(result).toEqual({ complete: true });
    });

    it("should handle async API version span", async () => {
      const result = await telemetryTracer.createApiVersionSpan("async_version", async () => {
        return Promise.resolve({ async: true });
      });

      expect(result).toEqual({ async: true });
    });
  });

  describe("addSpanAttributes", () => {
    it("should not throw when adding attributes", () => {
      expect(() => {
        telemetryTracer.addSpanAttributes({
          "test.attr": "value",
          "test.number": 123,
          "test.bool": true,
        });
      }).not.toThrow();
    });

    it("should handle empty attributes object", () => {
      expect(() => {
        telemetryTracer.addSpanAttributes({});
      }).not.toThrow();
    });
  });

  describe("recordException", () => {
    it("should not throw when recording exception", () => {
      const error = new Error("Test exception");
      expect(() => {
        telemetryTracer.recordException(error);
      }).not.toThrow();
    });

    it("should handle exception with message", () => {
      const error = new Error("Detailed error message");
      expect(() => {
        telemetryTracer.recordException(error);
      }).not.toThrow();
    });

    it("should handle exception without message", () => {
      const error = new Error("");
      expect(() => {
        telemetryTracer.recordException(error);
      }).not.toThrow();
    });
  });

  describe("getCurrentTraceId", () => {
    it("should return undefined when no active span", () => {
      const traceId = telemetryTracer.getCurrentTraceId();
      expect(traceId).toBeUndefined();
    });
  });

  describe("getCurrentSpanId", () => {
    it("should return undefined when no active span", () => {
      const spanId = telemetryTracer.getCurrentSpanId();
      expect(spanId).toBeUndefined();
    });
  });

  describe("Edge cases and boundaries", () => {
    it("should handle empty string operation name", () => {
      const result = telemetryTracer.createSpan(
        {
          operationName: "",
        },
        () => {
          return "empty-name";
        }
      );

      expect(result).toBe("empty-name");
    });

    it("should handle very long operation name", () => {
      const longName = "a".repeat(1000);
      const result = telemetryTracer.createSpan(
        {
          operationName: longName,
        },
        () => {
          return "long-name";
        }
      );

      expect(result).toBe("long-name");
    });

    it("should handle special characters in operation name", () => {
      const result = telemetryTracer.createSpan(
        {
          operationName: "test-$#@!%^&*()_+{}[]|\\:;\"'<>?,./",
        },
        () => {
          return "special-chars";
        }
      );

      expect(result).toBe("special-chars");
    });

    it("should handle null attribute values", () => {
      const result = telemetryTracer.createSpan(
        {
          operationName: "test.null.attrs",
          attributes: {
            "test.string": "",
            "test.number": 0,
            "test.boolean": false,
          },
        },
        () => {
          return "null-attrs";
        }
      );

      expect(result).toBe("null-attrs");
    });

    it("should handle negative numbers in attributes", () => {
      const result = telemetryTracer.createSpan(
        {
          operationName: "test.negative",
          attributes: {
            "test.negative": -123,
          },
        },
        () => {
          return "negative";
        }
      );

      expect(result).toBe("negative");
    });

    it("should handle very large numbers in attributes", () => {
      const result = telemetryTracer.createSpan(
        {
          operationName: "test.large.number",
          attributes: {
            "test.large": Number.MAX_SAFE_INTEGER,
          },
        },
        () => {
          return "large-number";
        }
      );

      expect(result).toBe("large-number");
    });
  });
});
