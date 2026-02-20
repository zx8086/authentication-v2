// test/bun/utils/null-safety.test.ts

import { describe, expect, it } from "bun:test";
import {
  assertDefined,
  isDefined,
  isNonEmptyString,
  safeArrayAccess,
  safeGet,
  safeJsonParse,
  safeRegexGroup,
  withDefault,
} from "../../../src/utils/null-safety";

describe("null-safety utilities", () => {
  describe("safeArrayAccess", () => {
    it("should return element at valid index", () => {
      const arr = ["a", "b", "c"];
      expect(safeArrayAccess(arr, 0)).toBe("a");
      expect(safeArrayAccess(arr, 1)).toBe("b");
      expect(safeArrayAccess(arr, 2)).toBe("c");
    });

    it("should return undefined for out-of-bounds index", () => {
      const arr = ["a", "b", "c"];
      expect(safeArrayAccess(arr, 3)).toBeUndefined();
      expect(safeArrayAccess(arr, 100)).toBeUndefined();
    });

    it("should return undefined for negative index", () => {
      const arr = ["a", "b", "c"];
      expect(safeArrayAccess(arr, -1)).toBeUndefined();
    });

    it("should return undefined for null array", () => {
      expect(safeArrayAccess(null, 0)).toBeUndefined();
    });

    it("should return undefined for undefined array", () => {
      expect(safeArrayAccess(undefined, 0)).toBeUndefined();
    });

    it("should work with readonly arrays", () => {
      const arr: readonly string[] = ["a", "b", "c"];
      expect(safeArrayAccess(arr, 1)).toBe("b");
    });

    it("should work with empty arrays", () => {
      const arr: string[] = [];
      expect(safeArrayAccess(arr, 0)).toBeUndefined();
    });
  });

  describe("safeRegexGroup", () => {
    it("should return matched group at valid index", () => {
      const match = "test123".match(/test(\d+)/);
      expect(safeRegexGroup(match, 0)).toBe("test123");
      expect(safeRegexGroup(match, 1)).toBe("123");
    });

    it("should return undefined for out-of-bounds group index", () => {
      const match = "test123".match(/test(\d+)/);
      expect(safeRegexGroup(match, 2)).toBeUndefined();
      expect(safeRegexGroup(match, 10)).toBeUndefined();
    });

    it("should return undefined for null match", () => {
      const match = "test".match(/\d+/);
      expect(match).toBeNull();
      expect(safeRegexGroup(match, 0)).toBeUndefined();
    });

    it("should return undefined for negative index", () => {
      const match = "test123".match(/test(\d+)/);
      expect(safeRegexGroup(match, -1)).toBeUndefined();
    });
  });

  describe("isDefined", () => {
    it("should return true for defined values", () => {
      expect(isDefined("string")).toBe(true);
      expect(isDefined(0)).toBe(true);
      expect(isDefined(false)).toBe(true);
      expect(isDefined({})).toBe(true);
      expect(isDefined([])).toBe(true);
    });

    it("should return false for null", () => {
      expect(isDefined(null)).toBe(false);
    });

    it("should return false for undefined", () => {
      expect(isDefined(undefined)).toBe(false);
    });
  });

  describe("assertDefined", () => {
    it("should not throw for defined values", () => {
      expect(() => assertDefined("value", "error")).not.toThrow();
      expect(() => assertDefined(0, "error")).not.toThrow();
      expect(() => assertDefined(false, "error")).not.toThrow();
    });

    it("should throw for null with custom message", () => {
      expect(() => assertDefined(null, "Value is null")).toThrow("Value is null");
    });

    it("should throw for undefined with custom message", () => {
      expect(() => assertDefined(undefined, "Value is undefined")).toThrow("Value is undefined");
    });
  });

  describe("withDefault", () => {
    it("should return value when defined", () => {
      expect(withDefault("value", "default")).toBe("value");
      expect(withDefault(0, 10)).toBe(0);
      expect(withDefault(false, true)).toBe(false);
    });

    it("should return default for null", () => {
      expect(withDefault(null, "default")).toBe("default");
    });

    it("should return default for undefined", () => {
      expect(withDefault(undefined, "default")).toBe("default");
    });
  });

  describe("safeGet", () => {
    it("should get nested value at valid path", () => {
      const obj = { a: { b: { c: "value" } } };
      expect(safeGet(obj, ["a", "b", "c"])).toBe("value");
    });

    it("should return undefined for invalid path", () => {
      const obj = { a: { b: { c: "value" } } };
      expect(safeGet(obj, ["a", "x", "c"])).toBeUndefined();
    });

    it("should return undefined for null object", () => {
      expect(safeGet(null, ["a", "b"])).toBeUndefined();
    });

    it("should return undefined for undefined object", () => {
      expect(safeGet(undefined, ["a", "b"])).toBeUndefined();
    });

    it("should return undefined for empty path", () => {
      const obj = { a: 1 };
      expect(safeGet(obj, [])).toBeUndefined();
    });

    it("should handle arrays in object", () => {
      const obj = { items: [1, 2, 3] };
      const items = safeGet<number[]>(obj, ["items"]);
      expect(items).toEqual([1, 2, 3]);
    });
  });

  describe("isNonEmptyString", () => {
    it("should return true for non-empty strings", () => {
      expect(isNonEmptyString("hello")).toBe(true);
      expect(isNonEmptyString("a")).toBe(true);
    });

    it("should return false for whitespace-only string", () => {
      expect(isNonEmptyString(" ")).toBe(false);
      expect(isNonEmptyString("   ")).toBe(false);
    });

    it("should return false for empty string", () => {
      expect(isNonEmptyString("")).toBe(false);
    });

    it("should return false for null", () => {
      expect(isNonEmptyString(null)).toBe(false);
    });

    it("should return false for undefined", () => {
      expect(isNonEmptyString(undefined)).toBe(false);
    });
  });

  describe("safeJsonParse", () => {
    it("should parse valid JSON", () => {
      expect(safeJsonParse('{"a": 1}')).toEqual({ a: 1 });
      expect(safeJsonParse("[1, 2, 3]")).toEqual([1, 2, 3]);
      expect(safeJsonParse('"string"')).toBe("string");
      expect(safeJsonParse("123")).toBe(123);
    });

    it("should return undefined for invalid JSON", () => {
      expect(safeJsonParse("{invalid}")).toBeUndefined();
      expect(safeJsonParse("not json")).toBeUndefined();
    });

    it("should return undefined for null", () => {
      expect(safeJsonParse(null)).toBeUndefined();
    });

    it("should return undefined for undefined", () => {
      expect(safeJsonParse(undefined)).toBeUndefined();
    });

    it("should return undefined for empty string", () => {
      expect(safeJsonParse("")).toBeUndefined();
    });
  });
});
