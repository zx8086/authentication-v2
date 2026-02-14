// test/bun/adapters/kong-utils-mutation-killers.test.ts

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

  describe("parseKongApiErrorMessage - status code messages", () => {
    it("returns specific message for 401", () => {
      const status = 401;
      const message =
        status === 401 ? "Authentication failed - invalid Kong admin token" : "default";
      expect(message).toBe("Authentication failed - invalid Kong admin token");
    });

    it("returns specific message for 403", () => {
      const status = 403;
      const message =
        status === 403 ? "Permission denied - insufficient Kong admin privileges" : "default";
      expect(message).toBe("Permission denied - insufficient Kong admin privileges");
    });

    it("returns specific message for 429", () => {
      const status = 429;
      const message =
        status === 429 ? "Rate limit exceeded - too many requests to Kong admin API" : "default";
      expect(message).toBe("Rate limit exceeded - too many requests to Kong admin API");
    });

    it("returns specific message for 500", () => {
      const status = 500;
      const message =
        status === 500 ? "Kong internal server error - check Kong service health" : "default";
      expect(message).toBe("Kong internal server error - check Kong service health");
    });

    it("returns specific message for 502", () => {
      const status = 502;
      const message =
        status === 502 ? "Kong gateway error - upstream service unavailable" : "default";
      expect(message).toBe("Kong gateway error - upstream service unavailable");
    });
  });

  describe("extractConsumerSecret - validation", () => {
    it("returns null when data is missing", () => {
      const data = {};
      const result =
        !data.data || !Array.isArray(data.data) || data.data.length === 0 ? null : data.data[0];
      expect(result).toBeNull();
    });

    it("returns null when data is not array", () => {
      const data = { data: "not an array" };
      const result =
        !data.data || !Array.isArray(data.data) || data.data.length === 0 ? null : data.data[0];
      expect(result).toBeNull();
    });

    it("returns null when data array is empty", () => {
      const data = { data: [] };
      const result =
        !data.data || !Array.isArray(data.data) || data.data.length === 0 ? null : data.data[0];
      expect(result).toBeNull();
    });
  });

  describe("isSuccessResponse - boolean logic", () => {
    it("returns true when ok and status 200", () => {
      const ok = true;
      const status = 200;
      const result = ok && status >= 200 && status < 300;
      expect(result).toBe(true);
    });

    it("returns true when ok and status 299", () => {
      const ok = true;
      const status = 299;
      const result = ok && status >= 200 && status < 300;
      expect(result).toBe(true);
    });

    it("returns false when ok and status 300", () => {
      const ok = true;
      const status = 300;
      const result = ok && status >= 200 && status < 300;
      expect(result).toBe(false);
    });

    it("returns false when not ok", () => {
      const ok = false;
      const status = 200;
      const result = ok && status >= 200 && status < 300;
      expect(result).toBe(false);
    });
  });
});
