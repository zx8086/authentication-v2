/* test/bun/adapters/kong-utils-integration.test.ts */

/**
 * Integration tests that execute actual kong-utils code
 */

import { describe, expect, it } from "bun:test";
import { KongApiError } from "../../../src/adapters/kong-utils";

describe("Kong Utils - Integration Tests", () => {
  describe("KongApiError construction and properties", () => {
    it("should create error with status 500 and mark as infrastructure error", () => {
      const error = new KongApiError("Internal Server Error", 500, "Server failed");

      expect(error.message).toBe("Internal Server Error");
      expect(error.status).toBe(500);
      expect(error.statusText).toBe("Server failed");
      expect(error.isInfrastructureError).toBe(true);
      expect(error.name).toBe("KongApiError");
    });

    it("should create error with status 429 and mark as infrastructure error", () => {
      const error = new KongApiError("Rate Limited", 429, "Too many requests");

      expect(error.status).toBe(429);
      expect(error.isInfrastructureError).toBe(true);
    });

    it("should create error with status 503 and mark as infrastructure error", () => {
      const error = new KongApiError("Service Unavailable", 503, "Unavailable");

      expect(error.status).toBe(503);
      expect(error.isInfrastructureError).toBe(true);
    });

    it("should create error with status 502 and mark as infrastructure error", () => {
      const error = new KongApiError("Bad Gateway", 502, "Gateway error");

      expect(error.status).toBe(502);
      expect(error.isInfrastructureError).toBe(true);
    });

    it("should create error with status 504 and mark as infrastructure error", () => {
      const error = new KongApiError("Gateway Timeout", 504, "Timeout");

      expect(error.status).toBe(504);
      expect(error.isInfrastructureError).toBe(true);
    });

    it("should create error with status 400 and NOT mark as infrastructure error", () => {
      const error = new KongApiError("Bad Request", 400, "Invalid input");

      expect(error.status).toBe(400);
      expect(error.isInfrastructureError).toBe(false);
    });

    it("should create error with status 404 and NOT mark as infrastructure error", () => {
      const error = new KongApiError("Not Found", 404, "Resource missing");

      expect(error.status).toBe(404);
      expect(error.isInfrastructureError).toBe(false);
    });

    it("should create error with status 401 and NOT mark as infrastructure error", () => {
      const error = new KongApiError("Unauthorized", 401, "Auth failed");

      expect(error.status).toBe(401);
      expect(error.isInfrastructureError).toBe(false);
    });

    it("should create error with status 499 (boundary) and NOT mark as infrastructure error", () => {
      const error = new KongApiError("Client Error", 499, "Just below 500");

      expect(error.status).toBe(499);
      expect(error.isInfrastructureError).toBe(false);
    });

    it("should create error with status 599 (boundary) and mark as infrastructure error", () => {
      const error = new KongApiError("Server Error", 599, "Upper boundary");

      expect(error.status).toBe(599);
      expect(error.isInfrastructureError).toBe(true);
    });

    it("should create error with status 600 and NOT mark as infrastructure error", () => {
      const error = new KongApiError("Unknown", 600, "Above 599");

      expect(error.status).toBe(600);
      expect(error.isInfrastructureError).toBe(false);
    });

    it("should create error with status 200 and NOT mark as infrastructure error", () => {
      const error = new KongApiError("OK", 200, "Success code");

      expect(error.status).toBe(200);
      expect(error.isInfrastructureError).toBe(false);
    });
  });

  describe("KongApiError inheritance", () => {
    it("should be instance of Error", () => {
      const error = new KongApiError("Test", 500, "Details");

      expect(error instanceof Error).toBe(true);
      expect(error instanceof KongApiError).toBe(true);
    });

    it("should have Error prototype chain", () => {
      const error = new KongApiError("Test", 500, "Details");

      expect(Object.getPrototypeOf(error).constructor.name).toBe("KongApiError");
    });
  });

  describe("KongApiError with different status codes", () => {
    it("should handle all 5xx status codes as infrastructure errors", () => {
      const statusCodes = [500, 501, 502, 503, 504, 505, 550, 599];

      for (const status of statusCodes) {
        const error = new KongApiError("Test", status, "Test");
        expect(error.isInfrastructureError).toBe(true);
      }
    });

    it("should handle all 4xx status codes except 429 as NOT infrastructure errors", () => {
      const statusCodes = [400, 401, 403, 404, 405, 410, 422, 499];

      for (const status of statusCodes) {
        const error = new KongApiError("Test", status, "Test");
        expect(error.isInfrastructureError).toBe(false);
      }
    });

    it("should handle 2xx and 3xx status codes as NOT infrastructure errors", () => {
      const statusCodes = [200, 201, 204, 300, 301, 302, 304];

      for (const status of statusCodes) {
        const error = new KongApiError("Test", status, "Test");
        expect(error.isInfrastructureError).toBe(false);
      }
    });
  });
});
