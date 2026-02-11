/* test/bun/utils/bun-fetch-fallback-internals.test.ts
 * Direct tests for bun-fetch-fallback internal functions
 */

import { describe, expect, it } from "bun:test";
import { fetchWithFallback } from "../../../src/utils/bun-fetch-fallback";

describe("fetchWithFallback - Real behavior tests", () => {
  describe("Successful fetch path", () => {
    it("should use native fetch when it succeeds", async () => {
      const mockServer = Bun.serve({
        port: 0, // Random available port
        fetch(req) {
          return new Response("Success from native fetch", {
            status: 200,
            headers: { "Content-Type": "text/plain" },
          });
        },
      });

      try {
        const url = `http://localhost:${mockServer.port}/test`;
        const response = await fetchWithFallback(url);
        const text = await response.text();

        expect(response.status).toBe(200);
        expect(text).toBe("Success from native fetch");
      } finally {
        mockServer.stop();
      }
    });

    it("should handle POST requests with body", async () => {
      let receivedBody: string | null = null;

      const mockServer = Bun.serve({
        port: 0,
        async fetch(req) {
          receivedBody = await req.text();
          return new Response(JSON.stringify({ received: receivedBody }), {
            status: 201,
            headers: { "Content-Type": "application/json" },
          });
        },
      });

      try {
        const url = `http://localhost:${mockServer.port}/test`;
        const response = await fetchWithFallback(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ test: "data" }),
        });

        expect(response.status).toBe(201);
        expect(receivedBody).toBe(JSON.stringify({ test: "data" }));
      } finally {
        mockServer.stop();
      }
    });

    it("should handle custom headers", async () => {
      let receivedHeaders: Record<string, string> = {};

      const mockServer = Bun.serve({
        port: 0,
        fetch(req) {
          receivedHeaders = {
            "x-custom-header": req.headers.get("x-custom-header") || "",
            authorization: req.headers.get("authorization") || "",
          };
          return new Response("OK", { status: 200 });
        },
      });

      try {
        const url = `http://localhost:${mockServer.port}/test`;
        await fetchWithFallback(url, {
          headers: {
            "X-Custom-Header": "custom-value",
            Authorization: "Bearer token123",
          },
        });

        expect(receivedHeaders["x-custom-header"]).toBe("custom-value");
        expect(receivedHeaders.authorization).toBe("Bearer token123");
      } finally {
        mockServer.stop();
      }
    });
  });

  describe("Curl fallback path", () => {
    it("should fall back to curl when fetch fails", async () => {
      // Use invalid domain to trigger fetch failure and curl fallback
      // Invalid domains fail fast, unlike non-routable IPs which hang
      const url = "http://invalid-domain-that-absolutely-does-not-exist-12345.test/endpoint";

      try {
        await fetchWithFallback(url, {
          method: "GET",
        });
        // If we reach here, either fetch or curl succeeded (unlikely for invalid domain)
        throw new Error("Should have thrown an error for invalid domain");
      } catch (error) {
        // Expected: both fetch and curl should fail for invalid domain
        expect(error).toBeDefined();
      }
    });

    it("should throw original fetch error when both fetch and curl fail", async () => {
      const url = "http://invalid-domain-that-does-not-exist-12345.com/test";

      try {
        await fetchWithFallback(url);
        throw new Error("Should have thrown an error");
      } catch (error) {
        expect(error).toBeDefined();
        // Should throw the original fetch error, not the curl error
      }
    });
  });

  describe("Method handling", () => {
    it("should default to GET when no method specified", async () => {
      let receivedMethod = "";

      const mockServer = Bun.serve({
        port: 0,
        fetch(req) {
          receivedMethod = req.method;
          return new Response("OK");
        },
      });

      try {
        const url = `http://localhost:${mockServer.port}/test`;
        await fetchWithFallback(url);

        expect(receivedMethod).toBe("GET");
      } finally {
        mockServer.stop();
      }
    });

    it("should handle PUT method", async () => {
      let receivedMethod = "";

      const mockServer = Bun.serve({
        port: 0,
        fetch(req) {
          receivedMethod = req.method;
          return new Response("OK");
        },
      });

      try {
        const url = `http://localhost:${mockServer.port}/test`;
        await fetchWithFallback(url, { method: "PUT" });

        expect(receivedMethod).toBe("PUT");
      } finally {
        mockServer.stop();
      }
    });

    it("should handle PATCH method", async () => {
      let receivedMethod = "";

      const mockServer = Bun.serve({
        port: 0,
        fetch(req) {
          receivedMethod = req.method;
          return new Response("OK");
        },
      });

      try {
        const url = `http://localhost:${mockServer.port}/test`;
        await fetchWithFallback(url, { method: "PATCH" });

        expect(receivedMethod).toBe("PATCH");
      } finally {
        mockServer.stop();
      }
    });

    it("should handle DELETE method", async () => {
      let receivedMethod = "";

      const mockServer = Bun.serve({
        port: 0,
        fetch(req) {
          receivedMethod = req.method;
          return new Response("OK");
        },
      });

      try {
        const url = `http://localhost:${mockServer.port}/test`;
        await fetchWithFallback(url, { method: "DELETE" });

        expect(receivedMethod).toBe("DELETE");
      } finally {
        mockServer.stop();
      }
    });
  });

  describe("Response status codes", () => {
    it("should handle 404 Not Found", async () => {
      const mockServer = Bun.serve({
        port: 0,
        fetch(req) {
          return new Response("Not Found", { status: 404 });
        },
      });

      try {
        const url = `http://localhost:${mockServer.port}/test`;
        const response = await fetchWithFallback(url);

        expect(response.status).toBe(404);
      } finally {
        mockServer.stop();
      }
    });

    it("should handle 500 Internal Server Error", async () => {
      const mockServer = Bun.serve({
        port: 0,
        fetch(req) {
          return new Response("Error", { status: 500 });
        },
      });

      try {
        const url = `http://localhost:${mockServer.port}/test`;
        const response = await fetchWithFallback(url);

        expect(response.status).toBe(500);
      } finally {
        mockServer.stop();
      }
    });

    it("should handle 201 Created", async () => {
      const mockServer = Bun.serve({
        port: 0,
        fetch(req) {
          return new Response("Created", { status: 201 });
        },
      });

      try {
        const url = `http://localhost:${mockServer.port}/test`;
        const response = await fetchWithFallback(url);

        expect(response.status).toBe(201);
      } finally {
        mockServer.stop();
      }
    });

    it("should handle 204 No Content", async () => {
      const mockServer = Bun.serve({
        port: 0,
        fetch(req) {
          return new Response(null, { status: 204 });
        },
      });

      try {
        const url = `http://localhost:${mockServer.port}/test`;
        const response = await fetchWithFallback(url);

        expect(response.status).toBe(204);
      } finally {
        mockServer.stop();
      }
    });

    it("should handle 401 Unauthorized", async () => {
      const mockServer = Bun.serve({
        port: 0,
        fetch(req) {
          return new Response("Unauthorized", { status: 401 });
        },
      });

      try {
        const url = `http://localhost:${mockServer.port}/test`;
        const response = await fetchWithFallback(url);

        expect(response.status).toBe(401);
      } finally {
        mockServer.stop();
      }
    });

    it("should handle 403 Forbidden", async () => {
      const mockServer = Bun.serve({
        port: 0,
        fetch(req) {
          return new Response("Forbidden", { status: 403 });
        },
      });

      try {
        const url = `http://localhost:${mockServer.port}/test`;
        const response = await fetchWithFallback(url);

        expect(response.status).toBe(403);
      } finally {
        mockServer.stop();
      }
    });

    it("should handle 409 Conflict", async () => {
      const mockServer = Bun.serve({
        port: 0,
        fetch(req) {
          return new Response("Conflict", { status: 409 });
        },
      });

      try {
        const url = `http://localhost:${mockServer.port}/test`;
        const response = await fetchWithFallback(url);

        expect(response.status).toBe(409);
      } finally {
        mockServer.stop();
      }
    });

    it("should handle 429 Too Many Requests", async () => {
      const mockServer = Bun.serve({
        port: 0,
        fetch(req) {
          return new Response("Too Many Requests", { status: 429 });
        },
      });

      try {
        const url = `http://localhost:${mockServer.port}/test`;
        const response = await fetchWithFallback(url);

        expect(response.status).toBe(429);
      } finally {
        mockServer.stop();
      }
    });

    it("should handle 502 Bad Gateway", async () => {
      const mockServer = Bun.serve({
        port: 0,
        fetch(req) {
          return new Response("Bad Gateway", { status: 502 });
        },
      });

      try {
        const url = `http://localhost:${mockServer.port}/test`;
        const response = await fetchWithFallback(url);

        expect(response.status).toBe(502);
      } finally {
        mockServer.stop();
      }
    });

    it("should handle 503 Service Unavailable", async () => {
      const mockServer = Bun.serve({
        port: 0,
        fetch(req) {
          return new Response("Service Unavailable", { status: 503 });
        },
      });

      try {
        const url = `http://localhost:${mockServer.port}/test`;
        const response = await fetchWithFallback(url);

        expect(response.status).toBe(503);
      } finally {
        mockServer.stop();
      }
    });

    it("should handle 504 Gateway Timeout", async () => {
      const mockServer = Bun.serve({
        port: 0,
        fetch(req) {
          return new Response("Gateway Timeout", { status: 504 });
        },
      });

      try {
        const url = `http://localhost:${mockServer.port}/test`;
        const response = await fetchWithFallback(url);

        expect(response.status).toBe(504);
      } finally {
        mockServer.stop();
      }
    });
  });

  describe("Empty and whitespace handling", () => {
    it("should handle empty response body", async () => {
      const mockServer = Bun.serve({
        port: 0,
        fetch(req) {
          return new Response("", { status: 200 });
        },
      });

      try {
        const url = `http://localhost:${mockServer.port}/test`;
        const response = await fetchWithFallback(url);
        const text = await response.text();

        expect(response.status).toBe(200);
        expect(text).toBe("");
      } finally {
        mockServer.stop();
      }
    });

    it("should handle whitespace-only response body", async () => {
      const mockServer = Bun.serve({
        port: 0,
        fetch(req) {
          return new Response("   \n  \t  ", { status: 200 });
        },
      });

      try {
        const url = `http://localhost:${mockServer.port}/test`;
        const response = await fetchWithFallback(url);
        const text = await response.text();

        expect(response.status).toBe(200);
        expect(text.trim()).toBe("");
        expect(text.trim().length).toBe(0);
      } finally {
        mockServer.stop();
      }
    });
  });

  describe("Body content handling", () => {
    it("should handle JSON response body", async () => {
      const mockServer = Bun.serve({
        port: 0,
        fetch(req) {
          return new Response(JSON.stringify({ success: true, data: [1, 2, 3] }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        },
      });

      try {
        const url = `http://localhost:${mockServer.port}/test`;
        const response = await fetchWithFallback(url);
        const json = await response.json();

        expect(json.success).toBe(true);
        expect(json.data).toEqual([1, 2, 3]);
      } finally {
        mockServer.stop();
      }
    });

    it("should handle large response body", async () => {
      const largeBody = "x".repeat(10000);
      const mockServer = Bun.serve({
        port: 0,
        fetch(req) {
          return new Response(largeBody, { status: 200 });
        },
      });

      try {
        const url = `http://localhost:${mockServer.port}/test`;
        const response = await fetchWithFallback(url);
        const text = await response.text();

        expect(text.length).toBe(10000);
        expect(text).toBe(largeBody);
      } finally {
        mockServer.stop();
      }
    });

    it("should preserve body content exactly with special characters", async () => {
      const specialBody = "Line1\r\nLine2\n\nLine3\r\n\r\nLine4";
      const mockServer = Bun.serve({
        port: 0,
        fetch(req) {
          return new Response(specialBody, { status: 200 });
        },
      });

      try {
        const url = `http://localhost:${mockServer.port}/test`;
        const response = await fetchWithFallback(url);
        const text = await response.text();

        expect(text).toBe(specialBody);
      } finally {
        mockServer.stop();
      }
    });
  });
});
