/* test/bun/error-codes.test.ts */

import { describe, expect, it } from "bun:test";
import {
  type ErrorCode,
  ErrorCodes,
  type ErrorDefinition,
  ErrorDefinitions,
  getErrorDefinition,
  isValidErrorCode,
} from "../../src/errors/error-codes";

describe("Error Codes Module", () => {
  describe("ErrorCodes", () => {
    it("should define all 12 error codes (AUTH_001 through AUTH_012)", () => {
      const expectedCodes = [
        "AUTH_001",
        "AUTH_002",
        "AUTH_003",
        "AUTH_004",
        "AUTH_005",
        "AUTH_006",
        "AUTH_007",
        "AUTH_008",
        "AUTH_009",
        "AUTH_010",
        "AUTH_011",
        "AUTH_012",
      ];

      for (const code of expectedCodes) {
        expect(ErrorCodes).toHaveProperty(code);
        expect(ErrorCodes[code as keyof typeof ErrorCodes]).toBe(code);
      }
    });

    it("should have unique error codes", () => {
      const values = Object.values(ErrorCodes);
      const uniqueValues = new Set(values);
      expect(values.length).toBe(uniqueValues.size);
    });

    it("should follow AUTH_XXX naming convention", () => {
      const authPattern = /^AUTH_\d{3}$/;

      for (const [key, value] of Object.entries(ErrorCodes)) {
        expect(key).toMatch(authPattern);
        expect(value).toMatch(authPattern);
        expect(key).toBe(value);
      }
    });

    it("should have exactly 12 error codes", () => {
      expect(Object.keys(ErrorCodes).length).toBe(12);
    });
  });

  describe("ErrorDefinitions", () => {
    it("should have definition for every error code", () => {
      for (const code of Object.values(ErrorCodes)) {
        expect(ErrorDefinitions).toHaveProperty(code);
        expect(ErrorDefinitions[code]).toBeDefined();
      }
    });

    it("should have correct HTTP status for AUTH_001 (401 - Missing Consumer Headers)", () => {
      const def = ErrorDefinitions[ErrorCodes.AUTH_001];
      expect(def.httpStatus).toBe(401);
      expect(def.title).toBe("Missing Consumer Headers");
    });

    it("should have correct HTTP status for AUTH_002 (401 - Consumer Not Found)", () => {
      const def = ErrorDefinitions[ErrorCodes.AUTH_002];
      expect(def.httpStatus).toBe(401);
      expect(def.title).toBe("Consumer Not Found");
    });

    it("should have correct HTTP status for AUTH_003 (500 - JWT Creation Failed)", () => {
      const def = ErrorDefinitions[ErrorCodes.AUTH_003];
      expect(def.httpStatus).toBe(500);
      expect(def.title).toBe("JWT Creation Failed");
    });

    it("should have correct HTTP status for AUTH_004 (503 - Kong API Unavailable)", () => {
      const def = ErrorDefinitions[ErrorCodes.AUTH_004];
      expect(def.httpStatus).toBe(503);
      expect(def.title).toBe("Kong API Unavailable");
    });

    it("should have correct HTTP status for AUTH_005 (503 - Circuit Breaker Open)", () => {
      const def = ErrorDefinitions[ErrorCodes.AUTH_005];
      expect(def.httpStatus).toBe(503);
      expect(def.title).toBe("Circuit Breaker Open");
    });

    it("should have correct HTTP status for AUTH_006 (429 - Rate Limit Exceeded)", () => {
      const def = ErrorDefinitions[ErrorCodes.AUTH_006];
      expect(def.httpStatus).toBe(429);
      expect(def.title).toBe("Rate Limit Exceeded");
    });

    it("should have correct HTTP status for AUTH_007 (400 - Invalid Request Format)", () => {
      const def = ErrorDefinitions[ErrorCodes.AUTH_007];
      expect(def.httpStatus).toBe(400);
      expect(def.title).toBe("Invalid Request Format");
    });

    it("should have correct HTTP status for AUTH_008 (500 - Internal Server Error)", () => {
      const def = ErrorDefinitions[ErrorCodes.AUTH_008];
      expect(def.httpStatus).toBe(500);
      expect(def.title).toBe("Internal Server Error");
    });

    it("should have correct HTTP status for AUTH_009 (401 - Anonymous Consumer)", () => {
      const def = ErrorDefinitions[ErrorCodes.AUTH_009];
      expect(def.httpStatus).toBe(401);
      expect(def.title).toBe("Anonymous Consumer");
    });

    it("should have correct HTTP status for AUTH_010 (401 - Token Expired)", () => {
      const def = ErrorDefinitions[ErrorCodes.AUTH_010];
      expect(def.httpStatus).toBe(401);
      expect(def.title).toBe("Token Expired");
    });

    it("should have correct HTTP status for AUTH_011 (400 - Invalid Token)", () => {
      const def = ErrorDefinitions[ErrorCodes.AUTH_011];
      expect(def.httpStatus).toBe(400);
      expect(def.title).toBe("Invalid Token");
    });

    it("should have correct HTTP status for AUTH_012 (400 - Missing Authorization)", () => {
      const def = ErrorDefinitions[ErrorCodes.AUTH_012];
      expect(def.httpStatus).toBe(400);
      expect(def.title).toBe("Missing Authorization");
    });

    it("should include title and description for each code", () => {
      for (const code of Object.values(ErrorCodes)) {
        const def = ErrorDefinitions[code];
        expect(def.title).toBeDefined();
        expect(def.title.length).toBeGreaterThan(0);
        expect(def.description).toBeDefined();
        expect(def.description.length).toBeGreaterThan(0);
      }
    });

    it("should have valid HTTP status codes in standard ranges", () => {
      const validStatusRanges = {
        400: [400, 499], // Client errors
        500: [500, 599], // Server errors
      };

      for (const def of Object.values(ErrorDefinitions)) {
        expect(def.httpStatus).toBeGreaterThanOrEqual(400);
        expect(def.httpStatus).toBeLessThan(600);
      }
    });

    it("should have matching code in definition and key", () => {
      for (const [key, def] of Object.entries(ErrorDefinitions)) {
        expect(def.code).toBe(key);
      }
    });
  });

  describe("getErrorDefinition", () => {
    it("should return correct definition for valid code", () => {
      const def = getErrorDefinition(ErrorCodes.AUTH_001);
      expect(def).toEqual(ErrorDefinitions[ErrorCodes.AUTH_001]);
    });

    it("should return definition with all required fields", () => {
      const def = getErrorDefinition(ErrorCodes.AUTH_005);

      expect(def).toHaveProperty("code");
      expect(def).toHaveProperty("httpStatus");
      expect(def).toHaveProperty("title");
      expect(def).toHaveProperty("description");

      expect(def.code).toBe(ErrorCodes.AUTH_005);
      expect(typeof def.httpStatus).toBe("number");
      expect(typeof def.title).toBe("string");
      expect(typeof def.description).toBe("string");
    });

    it("should return definitions for all error codes", () => {
      for (const code of Object.values(ErrorCodes)) {
        const def = getErrorDefinition(code);
        expect(def).toBeDefined();
        expect(def.code).toBe(code);
      }
    });
  });

  describe("isValidErrorCode", () => {
    it("should return true for valid error codes", () => {
      for (const code of Object.values(ErrorCodes)) {
        expect(isValidErrorCode(code)).toBe(true);
      }
    });

    it("should return false for invalid codes", () => {
      expect(isValidErrorCode("AUTH_000")).toBe(false);
      expect(isValidErrorCode("AUTH_013")).toBe(false);
      expect(isValidErrorCode("INVALID")).toBe(false);
      expect(isValidErrorCode("")).toBe(false);
      expect(isValidErrorCode("auth_001")).toBe(false); // Case sensitive
    });

    it("should return false for partial matches", () => {
      expect(isValidErrorCode("AUTH")).toBe(false);
      expect(isValidErrorCode("AUTH_")).toBe(false);
      expect(isValidErrorCode("AUTH_00")).toBe(false);
      expect(isValidErrorCode("AUTH_0011")).toBe(false);
    });

    it("should return false for non-string-like values coerced to string", () => {
      expect(isValidErrorCode("null")).toBe(false);
      expect(isValidErrorCode("undefined")).toBe(false);
      expect(isValidErrorCode("123")).toBe(false);
    });
  });

  describe("Error Code HTTP Status Groupings", () => {
    it("should have client errors (4xx) for authentication/validation failures", () => {
      const clientErrorCodes = [
        ErrorCodes.AUTH_001, // Missing headers (401)
        ErrorCodes.AUTH_002, // Consumer not found (401)
        ErrorCodes.AUTH_006, // Rate limit (429)
        ErrorCodes.AUTH_007, // Invalid request (400)
        ErrorCodes.AUTH_009, // Anonymous (401)
        ErrorCodes.AUTH_010, // Token expired (401)
        ErrorCodes.AUTH_011, // Invalid token (400)
        ErrorCodes.AUTH_012, // Missing auth (400)
      ];

      for (const code of clientErrorCodes) {
        const def = ErrorDefinitions[code];
        expect(def.httpStatus).toBeGreaterThanOrEqual(400);
        expect(def.httpStatus).toBeLessThan(500);
      }
    });

    it("should have server errors (5xx) for infrastructure failures", () => {
      const serverErrorCodes = [
        ErrorCodes.AUTH_003, // JWT creation (500)
        ErrorCodes.AUTH_004, // Kong unavailable (503)
        ErrorCodes.AUTH_005, // Circuit breaker (503)
        ErrorCodes.AUTH_008, // Internal error (500)
      ];

      for (const code of serverErrorCodes) {
        const def = ErrorDefinitions[code];
        expect(def.httpStatus).toBeGreaterThanOrEqual(500);
        expect(def.httpStatus).toBeLessThan(600);
      }
    });
  });

  describe("Type Safety", () => {
    it("should enforce ErrorCode type for valid codes", () => {
      // This test verifies the type system works correctly
      const validCode: ErrorCode = ErrorCodes.AUTH_001;
      expect(typeof validCode).toBe("string");
      expect(validCode).toBe("AUTH_001");
    });

    it("should provide ErrorDefinition interface compliance", () => {
      const def: ErrorDefinition = ErrorDefinitions[ErrorCodes.AUTH_001];

      // Verify all interface properties exist and have correct types
      expect(typeof def.code).toBe("string");
      expect(typeof def.httpStatus).toBe("number");
      expect(typeof def.title).toBe("string");
      expect(typeof def.description).toBe("string");
    });
  });
});
