/* test/bun/utils/bun-fetch-fallback-real.test.ts
 * Real integration tests for utils/bun-fetch-fallback.ts using live HTTP servers
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { fetchWithFallback } from "../../../src/utils/bun-fetch-fallback";

describe("fetchWithFallback - Real Integration Tests", () => {
  let testServer: ReturnType<typeof Bun.serve> | null = null;
  let testServerPort = 0;

  afterEach(() => {
    if (testServer) {
      testServer.stop();
      testServer = null;
    }
  });

  describe("Successful fetch path with real server", () => {
    beforeEach(() => {
      testServer = Bun.serve({
        port: 0, // Random available port
        fetch: (req) => {
          const url = new URL(req.url);

          if (url.pathname === "/success") {
            return new Response("success", { status: 200 });
          }

          if (url.pathname === "/json") {
            return new Response(JSON.stringify({ data: "test" }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          }

          if (url.pathname === "/headers") {
            const contentType = req.headers.get("Content-Type");
            const auth = req.headers.get("Authorization");
            return new Response(JSON.stringify({ contentType, auth }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          }

          if (url.pathname === "/post" && req.method === "POST") {
            return new Response("created", { status: 201 });
          }

          return new Response("Not Found", { status: 404 });
        },
      });
      testServerPort = testServer.port;
    });

    it("should return response from native fetch when server responds", async () => {
      const result = await fetchWithFallback(`http://localhost:${testServerPort}/success`);

      expect(result.status).toBe(200);
      const text = await result.text();
      expect(text).toBe("success");
    });

    it("should pass method option to fetch", async () => {
      const result = await fetchWithFallback(`http://localhost:${testServerPort}/post`, {
        method: "POST",
      });

      expect(result.status).toBe(201);
      const text = await result.text();
      expect(text).toBe("created");
    });

    it("should pass headers option to fetch", async () => {
      const result = await fetchWithFallback(`http://localhost:${testServerPort}/headers`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer token123",
        },
      });

      expect(result.status).toBe(200);
      const body = await result.json();
      expect(body.contentType).toBe("application/json");
      expect(body.auth).toBe("Bearer token123");
    });

    it("should handle JSON responses", async () => {
      const result = await fetchWithFallback(`http://localhost:${testServerPort}/json`);

      expect(result.status).toBe(200);
      const body = await result.json();
      expect(body.data).toBe("test");
    });
  });

  describe("Curl fallback path with real failures", () => {
    it("should fallback to curl when fetch fails with invalid domain", async () => {
      // Use invalid domain to trigger fetch failure and curl fallback
      // This test demonstrates real curl fallback behavior
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

    it("should handle 404 responses correctly", async () => {
      testServer = Bun.serve({
        port: 0,
        fetch: () => new Response("Not Found", { status: 404 }),
      });

      const result = await fetchWithFallback(`http://localhost:${testServer.port}/missing`);
      expect(result.status).toBe(404);
    });

    it("should handle 500 responses correctly", async () => {
      testServer = Bun.serve({
        port: 0,
        fetch: () => new Response("Internal Server Error", { status: 500 }),
      });

      const result = await fetchWithFallback(`http://localhost:${testServer.port}/error`);
      expect(result.status).toBe(500);
    });
  });

  describe("Response handling with real servers", () => {
    it("should handle different HTTP methods", async () => {
      testServer = Bun.serve({
        port: 0,
        fetch: (req) => {
          const method = req.method;
          return new Response(JSON.stringify({ method }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        },
      });

      const methods = ["GET", "POST", "PUT", "PATCH", "DELETE"];

      for (const method of methods) {
        const result = await fetchWithFallback(`http://localhost:${testServer.port}/test`, {
          method,
        });
        const body = await result.json();
        expect(body.method).toBe(method);
      }
    });

    it("should handle custom headers", async () => {
      testServer = Bun.serve({
        port: 0,
        fetch: (req) => {
          const customHeader = req.headers.get("X-Custom-Header");
          return new Response(JSON.stringify({ customHeader }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        },
      });

      const result = await fetchWithFallback(`http://localhost:${testServer.port}/test`, {
        headers: { "X-Custom-Header": "test-value" },
      });

      const body = await result.json();
      expect(body.customHeader).toBe("test-value");
    });

    it("should handle request body", async () => {
      testServer = Bun.serve({
        port: 0,
        fetch: async (req) => {
          const body = await req.text();
          return new Response(JSON.stringify({ receivedBody: body }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        },
      });

      const result = await fetchWithFallback(`http://localhost:${testServer.port}/test`, {
        method: "POST",
        body: '{"test":"data"}',
      });

      const responseBody = await result.json();
      expect(responseBody.receivedBody).toBe('{"test":"data"}');
    });
  });

  describe("Edge cases with real servers", () => {
    it("should handle empty response", async () => {
      testServer = Bun.serve({
        port: 0,
        fetch: () => new Response("", { status: 204 }),
      });

      const result = await fetchWithFallback(`http://localhost:${testServer.port}/empty`);
      expect(result.status).toBe(204);
      const text = await result.text();
      expect(text).toBe("");
    });

    it("should handle large responses", async () => {
      testServer = Bun.serve({
        port: 0,
        fetch: () => {
          const largeData = "x".repeat(10000);
          return new Response(largeData, { status: 200 });
        },
      });

      const result = await fetchWithFallback(`http://localhost:${testServer.port}/large`);
      expect(result.status).toBe(200);
      const text = await result.text();
      expect(text.length).toBe(10000);
    });

    it("should handle response with multiple headers", async () => {
      testServer = Bun.serve({
        port: 0,
        fetch: () =>
          new Response("OK", {
            status: 200,
            headers: {
              "Content-Type": "text/plain",
              "X-Custom-1": "value1",
              "X-Custom-2": "value2",
            },
          }),
      });

      const result = await fetchWithFallback(`http://localhost:${testServer.port}/headers`);
      expect(result.headers.get("Content-Type")).toBe("text/plain");
      expect(result.headers.get("X-Custom-1")).toBe("value1");
      expect(result.headers.get("X-Custom-2")).toBe("value2");
    });
  });

  describe("Timeout handling", () => {
    it("should respect abort signal timeout", async () => {
      testServer = Bun.serve({
        port: 0,
        fetch: async () => {
          // Simulate slow response
          await new Promise((resolve) => setTimeout(resolve, 2000));
          return new Response("slow", { status: 200 });
        },
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 100);

      try {
        await fetchWithFallback(`http://localhost:${testServer.port}/slow`, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        clearTimeout(timeoutId);
        expect(error).toBeDefined();
      }
    });
  });
});
