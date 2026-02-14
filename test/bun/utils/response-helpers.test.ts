import { describe, expect, it } from "bun:test";
import { ErrorCodes } from "../../../src/errors/error-codes";
import {
  createMethodNotAllowedResponse,
  createRateLimitErrorResponse,
  createValidationErrorResponse,
  generateETag,
  getRateLimitHeaders,
  hasMatchingETag,
  type RateLimitInfo,
  type ValidationError,
} from "../../../src/utils/response";

describe("Response Helpers", () => {
  describe("createMethodNotAllowedResponse", () => {
    it("should return 405 status code", async () => {
      const response = createMethodNotAllowedResponse("test-request-id", ["GET", "POST"]);
      expect(response.status).toBe(405);
    });

    it("should include Allow header with allowed methods", async () => {
      const allowedMethods = ["GET", "POST", "OPTIONS"];
      const response = createMethodNotAllowedResponse("test-request-id", allowedMethods);
      expect(response.headers.get("Allow")).toBe("GET, POST, OPTIONS");
    });

    it("should have application/problem+json content type", async () => {
      const response = createMethodNotAllowedResponse("test-request-id", ["GET"]);
      expect(response.headers.get("Content-Type")).toBe("application/problem+json");
    });

    it("should include RFC 9110 problem type URI", async () => {
      const response = createMethodNotAllowedResponse("test-request-id", ["GET", "POST"]);
      const body = await response.json();
      expect(body.type).toBe("https://httpwg.org/specs/rfc9110.html#status.405");
    });

    it("should include allowed methods in extensions", async () => {
      const allowedMethods = ["GET", "POST"];
      const response = createMethodNotAllowedResponse("test-request-id", allowedMethods);
      const body = await response.json();
      expect(body.extensions.allowedMethods).toEqual(allowedMethods);
    });

    it("should include request ID in body", async () => {
      const requestId = "unique-request-id-123";
      const response = createMethodNotAllowedResponse(requestId, ["GET"]);
      const body = await response.json();
      expect(body.requestId).toBe(requestId);
    });

    it("should include timestamp in body", async () => {
      const response = createMethodNotAllowedResponse("test-request-id", ["GET"]);
      const body = await response.json();
      expect(body.timestamp).toBeDefined();
      expect(new Date(body.timestamp).getTime()).not.toBeNaN();
    });
  });

  describe("generateETag", () => {
    it("should generate SHA-256 based ETag", async () => {
      const content = "test content";
      const etag = await generateETag(content);
      expect(etag).toMatch(/^"[a-f0-9]{32}"$/);
    });

    it("should wrap ETag in quotes", async () => {
      const etag = await generateETag("any content");
      expect(etag.startsWith('"')).toBe(true);
      expect(etag.endsWith('"')).toBe(true);
    });

    it("should generate different ETags for different content", async () => {
      const etag1 = await generateETag("content one");
      const etag2 = await generateETag("content two");
      expect(etag1).not.toBe(etag2);
    });

    it("should generate same ETag for same content", async () => {
      const content = "identical content";
      const etag1 = await generateETag(content);
      const etag2 = await generateETag(content);
      expect(etag1).toBe(etag2);
    });

    it("should handle empty content", async () => {
      const etag = await generateETag("");
      expect(etag).toMatch(/^"[a-f0-9]{32}"$/);
    });

    it("should handle large content", async () => {
      const largeContent = "x".repeat(100000);
      const etag = await generateETag(largeContent);
      expect(etag).toMatch(/^"[a-f0-9]{32}"$/);
    });
  });

  describe("hasMatchingETag", () => {
    it("should return true when If-None-Match matches ETag", () => {
      const etag = '"abc123"';
      const request = new Request("http://test.com", {
        headers: { "If-None-Match": '"abc123"' },
      });
      expect(hasMatchingETag(request, etag)).toBe(true);
    });

    it("should return false when If-None-Match does not match ETag", () => {
      const etag = '"abc123"';
      const request = new Request("http://test.com", {
        headers: { "If-None-Match": '"xyz789"' },
      });
      expect(hasMatchingETag(request, etag)).toBe(false);
    });

    it("should return false when If-None-Match header is missing", () => {
      const etag = '"abc123"';
      const request = new Request("http://test.com");
      expect(hasMatchingETag(request, etag)).toBe(false);
    });

    it("should handle empty If-None-Match header", () => {
      const etag = '"abc123"';
      const request = new Request("http://test.com", {
        headers: { "If-None-Match": "" },
      });
      expect(hasMatchingETag(request, etag)).toBe(false);
    });
  });

  describe("getRateLimitHeaders", () => {
    it("should include X-RateLimit-Limit header", () => {
      const rateLimitInfo: RateLimitInfo = { limit: 100, remaining: 50, reset: 1234567890 };
      const headers = getRateLimitHeaders(rateLimitInfo);
      expect(headers["X-RateLimit-Limit"]).toBe("100");
    });

    it("should include X-RateLimit-Remaining header", () => {
      const rateLimitInfo: RateLimitInfo = { limit: 100, remaining: 25, reset: 1234567890 };
      const headers = getRateLimitHeaders(rateLimitInfo);
      expect(headers["X-RateLimit-Remaining"]).toBe("25");
    });

    it("should include X-RateLimit-Reset header", () => {
      const resetTime = 1234567890;
      const rateLimitInfo: RateLimitInfo = { limit: 100, remaining: 50, reset: resetTime };
      const headers = getRateLimitHeaders(rateLimitInfo);
      expect(headers["X-RateLimit-Reset"]).toBe(String(resetTime));
    });

    it("should include X-RateLimit-Window when provided", () => {
      const rateLimitInfo: RateLimitInfo = {
        limit: 100,
        remaining: 50,
        reset: 1234567890,
        window: 3600,
      };
      const headers = getRateLimitHeaders(rateLimitInfo);
      expect(headers["X-RateLimit-Window"]).toBe("3600");
    });

    it("should not include X-RateLimit-Window when not provided", () => {
      const rateLimitInfo: RateLimitInfo = { limit: 100, remaining: 50, reset: 1234567890 };
      const headers = getRateLimitHeaders(rateLimitInfo);
      expect(headers["X-RateLimit-Window"]).toBeUndefined();
    });
  });

  describe("createRateLimitErrorResponse", () => {
    const rateLimitInfo: RateLimitInfo = { limit: 100, remaining: 0, reset: 1234567890 };

    it("should return 429 status code", async () => {
      const response = createRateLimitErrorResponse(
        ErrorCodes.AUTH_006,
        "test-request-id",
        rateLimitInfo
      );
      expect(response.status).toBe(429);
    });

    it("should include rate limit headers", async () => {
      const response = createRateLimitErrorResponse(
        ErrorCodes.AUTH_006,
        "test-request-id",
        rateLimitInfo
      );
      expect(response.headers.get("X-RateLimit-Limit")).toBe("100");
      expect(response.headers.get("X-RateLimit-Remaining")).toBe("0");
    });

    it("should include Retry-After header when provided", async () => {
      const response = createRateLimitErrorResponse(
        ErrorCodes.AUTH_006,
        "test-request-id",
        rateLimitInfo,
        60
      );
      expect(response.headers.get("Retry-After")).toBe("60");
    });

    it("should include limit and resetAt in response body", async () => {
      const response = createRateLimitErrorResponse(
        ErrorCodes.AUTH_006,
        "test-request-id",
        rateLimitInfo
      );
      const body = await response.json();
      expect(body.extensions.limit).toBe(100);
      expect(body.extensions.resetAt).toBeDefined();
    });
  });

  describe("createValidationErrorResponse", () => {
    const validationErrors: ValidationError[] = [
      { field: "email", message: "Invalid email format" },
      {
        field: "password",
        message: "Password too short",
        expected: "8 characters",
        actual: "5 characters",
      },
    ];

    it("should include validation errors in response", async () => {
      const response = createValidationErrorResponse(
        ErrorCodes.AUTH_007,
        "test-request-id",
        validationErrors
      );
      const body = await response.json();
      expect(body.extensions.validationErrors).toEqual(validationErrors);
    });

    it("should include error count in response", async () => {
      const response = createValidationErrorResponse(
        ErrorCodes.AUTH_007,
        "test-request-id",
        validationErrors
      );
      const body = await response.json();
      expect(body.extensions.count).toBe(2);
    });

    it("should return 400 status for AUTH_007", async () => {
      const response = createValidationErrorResponse(
        ErrorCodes.AUTH_007,
        "test-request-id",
        validationErrors
      );
      expect(response.status).toBe(400);
    });

    it("should handle single validation error", async () => {
      const singleError: ValidationError[] = [{ field: "name", message: "Name is required" }];
      const response = createValidationErrorResponse(
        ErrorCodes.AUTH_007,
        "test-request-id",
        singleError
      );
      const body = await response.json();
      expect(body.extensions.count).toBe(1);
    });

    it("should handle empty validation errors array", async () => {
      const response = createValidationErrorResponse(ErrorCodes.AUTH_007, "test-request-id", []);
      const body = await response.json();
      expect(body.extensions.count).toBe(0);
      expect(body.extensions.validationErrors).toEqual([]);
    });
  });
});
