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
  });

  describe("validateRequest", () => {
    it("should return null for valid GET request", async () => {
      const request = new Request("http://localhost/tokens", { method: "GET" });
      const result = await validateRequest(request);
      expect(result).toBeNull();
    });
  });
});
