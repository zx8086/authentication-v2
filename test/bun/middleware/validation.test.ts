/* test/bun/middleware/validation.test.ts */

/**
 * Tests for request validation middleware
 */

import { describe, expect, it } from "bun:test";
import {
  getAllowedMethods,
  isMethodAllowed,
  MAX_REQUEST_BODY_SIZE,
  validateBodySize,
  validateContentType,
  validateMethod,
  validateRequest,
} from "../../../src/middleware/validation";

describe("Request Validation Middleware", () => {
  describe("getAllowedMethods", () => {
    it("should return allowed methods for /tokens endpoint", () => {
      const methods = getAllowedMethods("/tokens");
      expect(methods).toEqual(["GET", "OPTIONS"]);
    });

    it("should return empty array for unknown endpoints", () => {
      const methods = getAllowedMethods("/unknown");
      expect(methods).toEqual([]);
    });
  });

  describe("isMethodAllowed", () => {
    it("should allow GET for /tokens", () => {
      expect(isMethodAllowed("GET", "/tokens")).toBe(true);
    });

    it("should not allow POST for /tokens", () => {
      expect(isMethodAllowed("POST", "/tokens")).toBe(false);
    });
  });

  describe("validateMethod", () => {
    it("should return null for valid method", () => {
      const request = new Request("http://localhost/tokens", { method: "GET" });
      const result = validateMethod(request, "/tokens");
      expect(result).toBeNull();
    });

    it("should return 405 response for invalid method", () => {
      const request = new Request("http://localhost/tokens", { method: "POST" });
      const result = validateMethod(request, "/tokens");

      expect(result).not.toBeNull();
      expect(result?.status).toBe(405);
    });
  });

  describe("validateContentType", () => {
    it("should return null for GET requests", () => {
      const request = new Request("http://localhost/tokens", { method: "GET" });
      const result = validateContentType(request);
      expect(result).toBeNull();
    });

    it("should return null for POST with valid JSON", () => {
      const request = new Request("http://localhost/debug/metrics/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const result = validateContentType(request);
      expect(result).toBeNull();
    });

    it("should return null for POST with valid form-urlencoded", () => {
      const request = new Request("http://localhost/debug/metrics/test", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      const result = validateContentType(request);
      expect(result).toBeNull();
    });

    it("should return null for POST with JSON and charset", () => {
      const request = new Request("http://localhost/debug/metrics/test", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
      const result = validateContentType(request);
      expect(result).toBeNull();
    });

    it("should return 400 for POST with invalid content type (text/plain)", () => {
      const request = new Request("http://localhost/debug/metrics/test", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
      });
      const result = validateContentType(request);
      expect(result).not.toBeNull();
      expect(result?.status).toBe(400);
    });

    it("should return 400 for POST with invalid content type (text/xml)", () => {
      const request = new Request("http://localhost/debug/metrics/test", {
        method: "POST",
        headers: { "Content-Type": "text/xml" },
      });
      const result = validateContentType(request);
      expect(result).not.toBeNull();
      expect(result?.status).toBe(400);
    });

    it("should return null for POST without Content-Type (allows empty bodies)", () => {
      const request = new Request("http://localhost/debug/metrics/test", {
        method: "POST",
      });
      const result = validateContentType(request);
      expect(result).toBeNull();
    });
  });

  describe("validateBodySize", () => {
    it("should return null for GET requests", async () => {
      const request = new Request("http://localhost/tokens", { method: "GET" });
      const result = await validateBodySize(request);
      expect(result).toBeNull();
    });

    it("should return error for oversized body", async () => {
      const tooLarge = MAX_REQUEST_BODY_SIZE + 1;
      const request = new Request("http://localhost/debug/metrics/test", {
        method: "POST",
        headers: { "Content-Length": String(tooLarge) },
      });
      const result = await validateBodySize(request);

      expect(result).not.toBeNull();
      expect(result?.status).toBe(400);
    });

    it("should return null for body at exact limit", async () => {
      const request = new Request("http://localhost/debug/metrics/test", {
        method: "POST",
        headers: { "Content-Length": String(MAX_REQUEST_BODY_SIZE) },
      });
      const result = await validateBodySize(request);
      expect(result).toBeNull();
    });

    it("should return null for body under limit", async () => {
      const request = new Request("http://localhost/debug/metrics/test", {
        method: "POST",
        headers: { "Content-Length": "1024" },
      });
      const result = await validateBodySize(request);
      expect(result).toBeNull();
    });

    it("should return null for POST without Content-Length", async () => {
      const request = new Request("http://localhost/debug/metrics/test", {
        method: "POST",
      });
      const result = await validateBodySize(request);
      expect(result).toBeNull();
    });
  });

  describe("validateRequest", () => {
    it("should return null for valid GET request", async () => {
      const request = new Request("http://localhost/tokens", { method: "GET" });
      const result = await validateRequest(request);
      expect(result).toBeNull();
    });

    it("should return null for valid POST with JSON content type", async () => {
      const request = new Request("http://localhost/debug/metrics/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": "100",
        },
      });
      const result = await validateRequest(request);
      expect(result).toBeNull();
    });

    it("should return 405 for invalid method first", async () => {
      const request = new Request("http://localhost/tokens", {
        method: "DELETE",
        headers: {
          "Content-Type": "text/plain",
          "Content-Length": String(MAX_REQUEST_BODY_SIZE + 1),
        },
      });
      const result = await validateRequest(request);
      expect(result).not.toBeNull();
      expect(result?.status).toBe(405);
    });
  });

  describe("405 Method Not Allowed Response", () => {
    it("should include Allow header in 405 response", async () => {
      const request = new Request("http://localhost/tokens", { method: "POST" });
      const result = validateMethod(request, "/tokens");

      expect(result).not.toBeNull();
      expect(result?.status).toBe(405);
      expect(result?.headers.get("Allow")).toBe("GET, OPTIONS");
    });

    it("should include problem+json content type", async () => {
      const request = new Request("http://localhost/tokens", { method: "POST" });
      const result = validateMethod(request, "/tokens");

      expect(result).not.toBeNull();
      expect(result?.headers.get("Content-Type")).toBe("application/problem+json");
    });

    it("should include allowed methods in body", async () => {
      const request = new Request("http://localhost/tokens", { method: "POST" });
      const result = validateMethod(request, "/tokens");

      expect(result).not.toBeNull();
      const body = await result?.json();
      expect(body.extensions.allowedMethods).toEqual(["GET", "OPTIONS"]);
    });
  });
});
