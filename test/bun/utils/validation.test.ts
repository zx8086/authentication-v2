// test/bun/utils/validation.test.ts

import { describe, expect, it } from "bun:test";
import { z } from "zod";
import {
  createValidatedCacheGetter,
  isValidData,
  validateArrayItems,
  validateExternalData,
  validateExternalDataStrict,
  validateJsonData,
} from "../../../src/utils/validation";

const TestSchema = z.object({
  id: z.string(),
  name: z.string(),
  value: z.number(),
});

const TestSchemaPassthrough = z
  .object({
    id: z.string(),
    name: z.string(),
  })
  .passthrough();

describe("validation utilities", () => {
  describe("validateExternalData", () => {
    it("should return success for valid data", () => {
      const data = { id: "123", name: "test", value: 42 };
      const result = validateExternalData(TestSchema, data, {
        source: "test",
        operation: "testOp",
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual(data);
    });

    it("should return failure with passthrough data for invalid data", () => {
      const data = { id: "123", name: "test", value: "not a number" };
      const result = validateExternalData(TestSchema, data, {
        source: "test",
        operation: "testOp",
      });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.data).toBeDefined(); // Passthrough mode returns data
    });

    it("should include issues in result for invalid data", () => {
      const data = { id: 123, name: "test", value: "invalid" };
      const result = validateExternalData(TestSchema, data, {
        source: "test",
        operation: "testOp",
      });
      expect(result.success).toBe(false);
      expect(result.issues).toBeDefined();
      expect(result.issues?.length).toBeGreaterThan(0);
    });

    it("should handle null data", () => {
      const result = validateExternalData(TestSchema, null, {
        source: "test",
        operation: "testOp",
      });
      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
    });

    it("should handle undefined data", () => {
      const result = validateExternalData(TestSchema, undefined, {
        source: "test",
        operation: "testOp",
      });
      expect(result.success).toBe(false);
    });

    it("should allow extra fields with passthrough schema", () => {
      const data = { id: "123", name: "test", extra: "field" };
      const result = validateExternalData(TestSchemaPassthrough, data, {
        source: "test",
        operation: "testOp",
      });
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("extra");
    });
  });

  describe("validateExternalDataStrict", () => {
    it("should return data for valid input", () => {
      const data = { id: "123", name: "test", value: 42 };
      const result = validateExternalDataStrict(TestSchema, data, {
        source: "test",
        operation: "testOp",
      });
      expect(result).toEqual(data);
    });

    it("should return null for invalid input", () => {
      const data = { id: "123", name: "test", value: "invalid" };
      const result = validateExternalDataStrict(TestSchema, data, {
        source: "test",
        operation: "testOp",
      });
      expect(result).toBeNull();
    });

    it("should return null for null input", () => {
      const result = validateExternalDataStrict(TestSchema, null, {
        source: "test",
        operation: "testOp",
      });
      expect(result).toBeNull();
    });
  });

  describe("validateJsonData", () => {
    it("should parse and validate valid JSON", () => {
      const json = '{"id": "123", "name": "test", "value": 42}';
      const result = validateJsonData(TestSchema, json, {
        source: "test",
        operation: "testOp",
      });
      expect(result.success).toBe(true);
      expect(result.data?.id).toBe("123");
    });

    it("should return failure for invalid JSON syntax", () => {
      const json = "{invalid json}";
      const result = validateJsonData(TestSchema, json, {
        source: "test",
        operation: "testOp",
      });
      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid JSON format");
    });

    it("should return failure for null JSON string", () => {
      const result = validateJsonData(TestSchema, null, {
        source: "test",
        operation: "testOp",
      });
      expect(result.success).toBe(false);
      expect(result.error).toBe("JSON string is null or undefined");
    });

    it("should return failure for undefined JSON string", () => {
      const result = validateJsonData(TestSchema, undefined, {
        source: "test",
        operation: "testOp",
      });
      expect(result.success).toBe(false);
    });

    it("should validate parsed JSON against schema", () => {
      const json = '{"id": 123, "name": "test", "value": "string"}';
      const result = validateJsonData(TestSchema, json, {
        source: "test",
        operation: "testOp",
      });
      expect(result.success).toBe(false);
      expect(result.issues).toBeDefined();
    });
  });

  describe("createValidatedCacheGetter", () => {
    it("should create a function that validates data", () => {
      const validator = createValidatedCacheGetter(TestSchema, "cache");
      const data = { id: "123", name: "test", value: 42 };
      const result = validator(data, "get", "consumer-123");
      expect(result.success).toBe(true);
      expect(result.data).toEqual(data);
    });

    it("should handle invalid data", () => {
      const validator = createValidatedCacheGetter(TestSchema, "cache");
      const data = { id: "123", name: "test", value: "invalid" };
      const result = validator(data, "get", "consumer-123");
      expect(result.success).toBe(false);
    });
  });

  describe("isValidData", () => {
    it("should return true for valid data", () => {
      const data = { id: "123", name: "test", value: 42 };
      expect(isValidData(TestSchema, data)).toBe(true);
    });

    it("should return false for invalid data", () => {
      const data = { id: 123, name: "test", value: "invalid" };
      expect(isValidData(TestSchema, data)).toBe(false);
    });

    it("should work as type guard", () => {
      const data: unknown = { id: "123", name: "test", value: 42 };
      if (isValidData(TestSchema, data)) {
        // Type should be narrowed here
        expect(data.id).toBe("123");
      }
    });
  });

  describe("validateArrayItems", () => {
    it("should filter out invalid items", () => {
      const items = [
        { id: "1", name: "a", value: 1 },
        { id: 2, name: "b", value: 2 }, // invalid: id is number
        { id: "3", name: "c", value: 3 },
      ];
      const result = validateArrayItems(TestSchema, items, {
        source: "test",
        operation: "testOp",
      });
      expect(result.length).toBe(2);
      expect(result[0]?.id).toBe("1");
      expect(result[1]?.id).toBe("3");
    });

    it("should return empty array for all invalid items", () => {
      const items = [
        { id: 1, name: "a", value: "x" },
        { id: 2, name: "b", value: "y" },
      ];
      const result = validateArrayItems(TestSchema, items, {
        source: "test",
        operation: "testOp",
      });
      expect(result.length).toBe(0);
    });

    it("should return all items if all valid", () => {
      const items = [
        { id: "1", name: "a", value: 1 },
        { id: "2", name: "b", value: 2 },
      ];
      const result = validateArrayItems(TestSchema, items, {
        source: "test",
        operation: "testOp",
      });
      expect(result.length).toBe(2);
    });

    it("should handle empty array", () => {
      const result = validateArrayItems(TestSchema, [], {
        source: "test",
        operation: "testOp",
      });
      expect(result.length).toBe(0);
    });
  });
});
