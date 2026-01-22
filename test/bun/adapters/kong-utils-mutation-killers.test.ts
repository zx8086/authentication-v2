/* test/bun/adapters/kong-utils-mutation-killers.test.ts */

/**
 * Targeted tests to kill surviving mutants in kong-utils.ts
 * Tests the actual KongApiError implementation
 */

import { describe, expect, it } from "bun:test";
import { KongApiError } from "../../../src/adapters/kong-utils";

describe("Kong Utils - Mutation Killers", () => {
  describe("KongApiError.isInfrastructureError - boundary conditions", () => {
    it("should mark 499 as NOT infrastructure error (just below 500)", () => {
      const error = new KongApiError("Test", 499, "Client Error");
      expect(error.isInfrastructureError).toBe(false);
      expect(error.status).toBe(499);
    });

    it("should mark 500 as infrastructure error (lower boundary)", () => {
      const error = new KongApiError("Test", 500, "Internal Server Error");
      expect(error.isInfrastructureError).toBe(true);
      expect(error.status).toBe(500);
    });

    it("should mark 599 as infrastructure error (upper boundary)", () => {
      const error = new KongApiError("Test", 599, "Server Error");
      expect(error.isInfrastructureError).toBe(true);
      expect(error.status).toBe(599);
    });

    it("should mark 600 as NOT infrastructure error (just above 599)", () => {
      const error = new KongApiError("Test", 600, "Unknown");
      expect(error.isInfrastructureError).toBe(false);
      expect(error.status).toBe(600);
    });

    it("should mark 503 as infrastructure error (mid-range)", () => {
      const error = new KongApiError("Test", 503, "Service Unavailable");
      expect(error.isInfrastructureError).toBe(true);
      expect(error.status).toBe(503);
    });

    it("should mark 429 as infrastructure error (rate limit)", () => {
      const error = new KongApiError("Test", 429, "Too Many Requests");
      expect(error.isInfrastructureError).toBe(true);
      expect(error.status).toBe(429);
    });

    it("should mark 502 as infrastructure error (bad gateway)", () => {
      const error = new KongApiError("Test", 502, "Bad Gateway");
      expect(error.isInfrastructureError).toBe(true);
      expect(error.status).toBe(502);
    });

    it("should mark 504 as infrastructure error (gateway timeout)", () => {
      const error = new KongApiError("Test", 504, "Gateway Timeout");
      expect(error.isInfrastructureError).toBe(true);
      expect(error.status).toBe(504);
    });

    it("should mark 400 as NOT infrastructure error (client error)", () => {
      const error = new KongApiError("Test", 400, "Bad Request");
      expect(error.isInfrastructureError).toBe(false);
      expect(error.status).toBe(400);
    });

    it("should mark 404 as NOT infrastructure error (not found)", () => {
      const error = new KongApiError("Test", 404, "Not Found");
      expect(error.isInfrastructureError).toBe(false);
      expect(error.status).toBe(404);
    });

    it("should mark 200 as NOT infrastructure error (success)", () => {
      const error = new KongApiError("Test", 200, "OK");
      expect(error.isInfrastructureError).toBe(false);
      expect(error.status).toBe(200);
    });
  });
});
