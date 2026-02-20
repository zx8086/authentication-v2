// test/bun/utils/error-handling.test.ts

import { describe, expect, it } from "bun:test";
import {
  extractErrorDetails,
  extractErrorMessage,
  formatErrorForLog,
  isErrorType,
  tryCatch,
} from "../../../src/utils/error-handling";

describe("error-handling utilities", () => {
  describe("extractErrorMessage", () => {
    it("should extract message from Error object", () => {
      const error = new Error("Test error message");
      expect(extractErrorMessage(error)).toBe("Test error message");
    });

    it("should extract message from TypeError", () => {
      const error = new TypeError("Type error message");
      expect(extractErrorMessage(error)).toBe("Type error message");
    });

    it("should return string directly", () => {
      expect(extractErrorMessage("String error")).toBe("String error");
    });

    it("should handle null", () => {
      expect(extractErrorMessage(null)).toBe("Unknown error");
    });

    it("should handle undefined", () => {
      expect(extractErrorMessage(undefined)).toBe("Unknown error");
    });

    it("should handle number", () => {
      expect(extractErrorMessage(404)).toBe("Unknown error");
    });

    it("should handle object with message property", () => {
      expect(extractErrorMessage({ message: "Object error" })).toBe("Object error");
    });

    it("should handle object without message property", () => {
      expect(extractErrorMessage({ code: 500 })).toBe("Unknown error");
    });
  });

  describe("extractErrorDetails", () => {
    it("should extract full details from Error", () => {
      const error = new Error("Test error");
      const details = extractErrorDetails(error);
      expect(details.message).toBe("Test error");
      expect(details.name).toBe("Error");
      expect(details.stack).toBeDefined();
    });

    it("should extract details from TypeError", () => {
      const error = new TypeError("Type error");
      const details = extractErrorDetails(error);
      expect(details.message).toBe("Type error");
      expect(details.name).toBe("TypeError");
    });

    it("should handle error with code", () => {
      const error = new Error("Error with code");
      (error as Error & { code: string }).code = "ENOENT";
      const details = extractErrorDetails(error);
      expect(details.code).toBe("ENOENT");
    });

    it("should handle string error", () => {
      const details = extractErrorDetails("String error");
      expect(details.message).toBe("String error");
      expect(details.name).toBe("StringError");
      expect(details.stack).toBeUndefined();
    });

    it("should handle null", () => {
      const details = extractErrorDetails(null);
      expect(details.message).toBe("Unknown error");
      expect(details.name).toBe("UnknownError");
    });

    it("should handle undefined", () => {
      const details = extractErrorDetails(undefined);
      expect(details.message).toBe("Unknown error");
      expect(details.name).toBe("UnknownError");
    });
  });

  describe("isErrorType", () => {
    it("should identify TypeError", () => {
      const error = new TypeError("Type error");
      expect(isErrorType(error, "TypeError")).toBe(true);
      expect(isErrorType(error, "Error")).toBe(false);
    });

    it("should identify SyntaxError", () => {
      const error = new SyntaxError("Syntax error");
      expect(isErrorType(error, "SyntaxError")).toBe(true);
    });

    it("should identify RangeError", () => {
      const error = new RangeError("Range error");
      expect(isErrorType(error, "RangeError")).toBe(true);
    });

    it("should return false for non-Error values", () => {
      expect(isErrorType("string", "Error")).toBe(false);
      expect(isErrorType(null, "Error")).toBe(false);
      expect(isErrorType(undefined, "Error")).toBe(false);
    });
  });

  describe("tryCatch", () => {
    it("should return result on success", async () => {
      const [result, error] = await tryCatch(async () => "success");
      expect(result).toBe("success");
      expect(error).toBeUndefined();
    });

    it("should return error details on failure", async () => {
      const [result, error] = await tryCatch(async () => {
        throw new Error("Async error");
      });
      expect(result).toBeUndefined();
      expect(error).toBeDefined();
      expect(error?.message).toBe("Async error");
    });

    it("should handle rejected promise", async () => {
      const [result, error] = await tryCatch(async () => {
        return Promise.reject(new Error("Rejected"));
      });
      expect(result).toBeUndefined();
      expect(error?.message).toBe("Rejected");
    });

    it("should handle TypeError", async () => {
      const [result, error] = await tryCatch(async () => {
        throw new TypeError("Type issue");
      });
      expect(result).toBeUndefined();
      expect(error?.name).toBe("TypeError");
    });
  });

  describe("formatErrorForLog", () => {
    it("should format Error for logging", () => {
      const error = new Error("Log error");
      const formatted = formatErrorForLog(error);
      expect(formatted.errorMessage).toBe("Log error");
      expect(formatted.errorName).toBe("Error");
    });

    it("should include context in formatted output", () => {
      const error = new Error("Context error");
      const formatted = formatErrorForLog(error, { consumerId: "test-123", operation: "test" });
      expect(formatted.errorMessage).toBe("Context error");
      expect(formatted.consumerId).toBe("test-123");
      expect(formatted.operation).toBe("test");
    });

    it("should handle non-Error values", () => {
      const formatted = formatErrorForLog("String error");
      expect(formatted.errorMessage).toBe("String error");
    });

    it("should handle null", () => {
      const formatted = formatErrorForLog(null);
      expect(formatted.errorMessage).toBe("Unknown error");
    });
  });
});
