/* test/bun/config/helpers-mutation-killers.test.ts
 * Mutation-killing tests for config/helpers.ts
 * These tests use EXACT value assertions to kill mutants
 */

import { describe, expect, it } from "bun:test";
import {
  deriveEndpoint,
  deriveOtlpEndpoint,
  OTLP_STANDARD_PATHS,
  toBool,
  validateOtlpEndpoints,
} from "../../../src/config/helpers";

describe("Config Helpers - Mutation Killers", () => {
  describe("deriveEndpoint - String mutations", () => {
    it("should return specificEndpoint when it's provided and not empty", () => {
      const result = deriveEndpoint("http://base.com", "http://specific.com", "/path");
      expect(result).toBe("http://specific.com"); // Kill: return baseEndpoint
    });

    it("should ignore baseEndpoint when specificEndpoint is provided", () => {
      const result = deriveEndpoint("http://ignored.com", "http://used.com", "/ignored");
      expect(result).toBe("http://used.com");
      expect(result).not.toBe("http://ignored.com");
    });

    it("should check specificEndpoint.trim() !== ''", () => {
      // Kill: .trim() !== "" mutations
      const result1 = deriveEndpoint("http://base.com", "  ", "/path");
      expect(result1).toBe("http://base.com/path"); // Empty after trim -> use base

      const result2 = deriveEndpoint("http://base.com", "", "/path");
      expect(result2).toBe("http://base.com/path");
    });

    it("should return just pathSuffix when baseEndpoint is empty string", () => {
      const result = deriveEndpoint("", undefined, "/logs");
      expect(result).toBe("/logs"); // Kill: return undefined
    });

    it("should check baseEndpoint.trim() === ''", () => {
      // Kill: .trim() === "" mutations
      const result1 = deriveEndpoint("  ", undefined, "/path");
      expect(result1).toBe("/path");

      const result2 = deriveEndpoint("", undefined, "/path");
      expect(result2).toBe("/path");
    });

    it("should add leading slash when pathSuffix doesn't start with /", () => {
      const result = deriveEndpoint("", undefined, "logs");
      expect(result).toBe("/logs"); // Kill: pathSuffix without modification
    });

    it("should not add slash when pathSuffix already starts with /", () => {
      const result = deriveEndpoint("", undefined, "/logs");
      expect(result).toBe("/logs");
      expect(result).not.toBe("//logs");
    });

    it("should return undefined when baseEndpoint is undefined", () => {
      const result = deriveEndpoint(undefined, undefined, "/path");
      expect(result).toBe(undefined); // Kill: return ""
      expect(result).not.toBe("");
      expect(result).not.toBe(null);
    });

    it("should remove trailing slash from baseEndpoint", () => {
      const result = deriveEndpoint("http://base.com/", undefined, "/path");
      expect(result).toBe("http://base.com/path"); // Kill: .replace(/\/$/, "") mutations
      expect(result).not.toBe("http://base.com//path");
    });

    it("should use replace(/\\/$/, '') regex exactly", () => {
      // Kill regex mutations
      const result1 = deriveEndpoint("http://base.com/", undefined, "/path");
      expect(result1).toBe("http://base.com/path");

      const result2 = deriveEndpoint("http://base.com//", undefined, "/path");
      expect(result2).toBe("http://base.com//path"); // Only removes last slash
    });

    it("should prepend slash to pathSuffix when it doesn't start with /", () => {
      const result = deriveEndpoint("http://base.com", undefined, "path");
      expect(result).toBe("http://base.com/path"); // Kill: pathSuffix mutations
    });

    it("should check pathSuffix.startsWith('/') exactly", () => {
      const result1 = deriveEndpoint("http://base.com", undefined, "/path");
      expect(result1).toBe("http://base.com/path");

      const result2 = deriveEndpoint("http://base.com", undefined, "path");
      expect(result2).toBe("http://base.com/path");
    });

    it("should concatenate normalizedBase and normalizedPath", () => {
      const result = deriveEndpoint("http://base.com", undefined, "/path");
      expect(result).toBe("http://base.com/path");
      expect(result).not.toBe("http://base.com");
      expect(result).not.toBe("/path");
    });
  });

  describe("deriveOtlpEndpoint - Delegation", () => {
    it("should delegate to deriveEndpoint exactly", () => {
      const result1 = deriveOtlpEndpoint("http://base.com", undefined, "/v1/logs");
      expect(result1).toBe("http://base.com/v1/logs");

      const result2 = deriveOtlpEndpoint("http://base.com", "http://specific.com", "/v1/logs");
      expect(result2).toBe("http://specific.com");

      const result3 = deriveOtlpEndpoint(undefined, undefined, "/v1/logs");
      expect(result3).toBe(undefined);
    });
  });

  describe("toBool - Boolean conversion", () => {
    it("should return defaultValue when value is undefined", () => {
      expect(toBool(undefined, false)).toBe(false); // Kill: return true
      expect(toBool(undefined, true)).toBe(true); // Kill: return false
    });

    it("should return value when it's already boolean", () => {
      expect(toBool(true, false)).toBe(true); // Kill: return false
      expect(toBool(false, true)).toBe(false); // Kill: return true
    });

    it("should return defaultValue when value is not string", () => {
      expect(toBool(123 as any, false)).toBe(false);
      expect(toBool({} as any, true)).toBe(true);
    });

    it("should convert 'true' to true", () => {
      expect(toBool("true", false)).toBe(true); // Kill: === "true" mutations
    });

    it("should convert 'TRUE' to true (case-insensitive)", () => {
      expect(toBool("TRUE", false)).toBe(true); // Kill: .toLowerCase() mutations
    });

    it("should convert 'TrUe' to true (mixed case)", () => {
      expect(toBool("TrUe", false)).toBe(true);
    });

    it("should convert '1' to true", () => {
      expect(toBool("1", false)).toBe(true); // Kill: === "1" mutations
    });

    it("should convert 'yes' to true", () => {
      expect(toBool("yes", false)).toBe(true); // Kill: === "yes" mutations
    });

    it("should convert 'YES' to true (case-insensitive)", () => {
      expect(toBool("YES", false)).toBe(true);
    });

    it("should convert 'on' to true", () => {
      expect(toBool("on", false)).toBe(true); // Kill: === "on" mutations
    });

    it("should convert 'ON' to true (case-insensitive)", () => {
      expect(toBool("ON", false)).toBe(true);
    });

    it("should convert 'false' to false", () => {
      expect(toBool("false", true)).toBe(false); // Kill: return true for "false"
    });

    it("should convert '0' to false", () => {
      expect(toBool("0", true)).toBe(false);
    });

    it("should convert 'no' to false", () => {
      expect(toBool("no", true)).toBe(false);
    });

    it("should convert 'off' to false", () => {
      expect(toBool("off", true)).toBe(false);
    });

    it("should convert empty string to false", () => {
      expect(toBool("", true)).toBe(false);
    });

    it("should trim whitespace before checking", () => {
      expect(toBool("  true  ", false)).toBe(true); // Kill: .trim() mutations
      expect(toBool("  false  ", true)).toBe(false);
    });

    it("should default to false when defaultValue not provided", () => {
      expect(toBool(undefined)).toBe(false); // Kill: default parameter !== false
    });

    it("should handle whitespace-only strings as false", () => {
      expect(toBool("   ", true)).toBe(false);
    });
  });

  describe("validateOtlpEndpoints - URL validation", () => {
    it("should return empty array for valid HTTPS endpoints in production", () => {
      const endpoints = {
        traces: "https://trace.example.com",
        metrics: "https://metrics.example.com",
        logs: "https://logs.example.com",
      };
      const errors = validateOtlpEndpoints(endpoints, true);
      expect(errors).toEqual([]); // Kill: return non-empty array
      expect(errors.length).toBe(0);
    });

    it("should return error for HTTP in production", () => {
      const endpoints = {
        traces: "http://trace.example.com",
      };
      const errors = validateOtlpEndpoints(endpoints, true);
      expect(errors.length).toBe(1); // Kill: errors.length !== 1
      expect(errors[0].endpoint).toBe("traces");
      expect(errors[0].error).toBe("Production endpoints must use HTTPS");
    });

    it("should check isProduction exactly", () => {
      const endpoints = {
        traces: "http://trace.example.com",
      };

      const errorsNonProd = validateOtlpEndpoints(endpoints, false);
      expect(errorsNonProd.length).toBe(0); // No error in non-production

      const errorsProd = validateOtlpEndpoints(endpoints, true);
      expect(errorsProd.length).toBe(1); // Error in production
    });

    it("should check .toLowerCase().startsWith('https://') exactly", () => {
      const endpoints = {
        traces: "HTTPS://trace.example.com",
      };
      const errors = validateOtlpEndpoints(endpoints, true);
      expect(errors.length).toBe(0); // HTTPS in uppercase should work
    });

    it("should return error for invalid URL format", () => {
      const endpoints = {
        traces: "not-a-url",
      };
      const errors = validateOtlpEndpoints(endpoints, false);
      expect(errors.length).toBe(1);
      expect(errors[0].endpoint).toBe("traces");
      expect(errors[0].error).toContain("Invalid URL format");
    });

    it("should skip undefined endpoints", () => {
      const endpoints = {
        traces: undefined,
        metrics: "https://metrics.example.com",
      };
      const errors = validateOtlpEndpoints(endpoints, true);
      expect(errors.length).toBe(0); // No error for undefined
    });

    it("should continue checking other endpoints after finding an error", () => {
      const endpoints = {
        traces: "invalid",
        metrics: "http://metrics.example.com",
        logs: "https://logs.example.com",
      };
      const errors = validateOtlpEndpoints(endpoints, true);
      expect(errors.length).toBe(2); // Two errors
    });

    it("should default isProduction to false", () => {
      const endpoints = {
        traces: "http://trace.example.com",
      };
      const errors = validateOtlpEndpoints(endpoints);
      expect(errors.length).toBe(0); // Kill: default !== false
    });
  });

  describe("OTLP_STANDARD_PATHS - Exact values", () => {
    it("should have traces path as '/v1/traces'", () => {
      expect(OTLP_STANDARD_PATHS.traces).toBe("/v1/traces"); // Kill: !== "/v1/traces"
      expect(OTLP_STANDARD_PATHS.traces).not.toBe("/v1/trace");
      expect(OTLP_STANDARD_PATHS.traces).not.toBe("/v2/traces");
    });

    it("should have metrics path as '/v1/metrics'", () => {
      expect(OTLP_STANDARD_PATHS.metrics).toBe("/v1/metrics"); // Kill: !== "/v1/metrics"
      expect(OTLP_STANDARD_PATHS.metrics).not.toBe("/v1/metric");
      expect(OTLP_STANDARD_PATHS.metrics).not.toBe("/v2/metrics");
    });

    it("should have logs path as '/v1/logs'", () => {
      expect(OTLP_STANDARD_PATHS.logs).toBe("/v1/logs"); // Kill: !== "/v1/logs"
      expect(OTLP_STANDARD_PATHS.logs).not.toBe("/v1/log");
      expect(OTLP_STANDARD_PATHS.logs).not.toBe("/v2/logs");
    });
  });

  describe("Edge cases and boundary values", () => {
    it("should handle baseEndpoint with multiple trailing slashes", () => {
      const result = deriveEndpoint("http://base.com///", undefined, "/path");
      // Only removes last slash
      expect(result).toBe("http://base.com///path");
    });

    it("should handle pathSuffix with multiple leading slashes", () => {
      const result = deriveEndpoint("http://base.com", undefined, "///path");
      expect(result).toBe("http://base.com///path");
    });

    it("should handle empty baseEndpoint with pathSuffix without slash", () => {
      const result = deriveEndpoint("", undefined, "logs");
      expect(result).toBe("/logs");
    });

    it("should handle whitespace in specificEndpoint", () => {
      const result1 = deriveEndpoint("http://base.com", "   http://specific.com   ", "/path");
      // specificEndpoint is used as-is if not empty after trim
      expect(result1).toBe("   http://specific.com   ");

      const result2 = deriveEndpoint("http://base.com", "   ", "/path");
      // Empty after trim -> use base
      expect(result2).toBe("http://base.com/path");
    });

    it("should handle toBool with leading/trailing spaces", () => {
      expect(toBool("  1  ")).toBe(true);
      expect(toBool("  yes  ")).toBe(true);
      expect(toBool("  on  ")).toBe(true);
      expect(toBool("  false  ")).toBe(false);
    });
  });

  describe("Conditional logic mutations", () => {
    it("should check specificEndpoint !== undefined and !== ''", () => {
      expect(deriveEndpoint("http://base.com", undefined, "/path")).toBe("http://base.com/path");
      expect(deriveEndpoint("http://base.com", "", "/path")).toBe("http://base.com/path");
      expect(deriveEndpoint("http://base.com", "http://specific.com", "/path")).toBe(
        "http://specific.com"
      );
    });

    it("should check baseEndpoint !== undefined", () => {
      expect(deriveEndpoint(undefined, undefined, "/path")).toBe(undefined);
      expect(deriveEndpoint("http://base.com", undefined, "/path")).toBe("http://base.com/path");
    });

    it("should check !value in validateOtlpEndpoints", () => {
      const endpoints1 = { traces: undefined };
      expect(validateOtlpEndpoints(endpoints1).length).toBe(0);

      const endpoints2 = { traces: "https://example.com" };
      expect(validateOtlpEndpoints(endpoints2).length).toBe(0);
    });

    it("should use typeof checks exactly", () => {
      expect(toBool(true)).toBe(true); // typeof value === "boolean"
      expect(toBool("true")).toBe(true); // typeof value === "string"
      expect(toBool(123 as any)).toBe(false); // typeof value !== "string"
    });
  });

  describe("Array operations", () => {
    it("should push errors to array", () => {
      const endpoints = {
        traces: "invalid1",
        metrics: "invalid2",
      };
      const errors = validateOtlpEndpoints(endpoints, false);
      expect(errors.length).toBe(2); // Kill: array push mutations
      expect(errors[0].endpoint).toBe("traces");
      expect(errors[1].endpoint).toBe("metrics");
    });

    it("should create error objects with exact structure", () => {
      const endpoints = {
        traces: "invalid",
      };
      const errors = validateOtlpEndpoints(endpoints, false);
      expect(errors[0]).toHaveProperty("endpoint");
      expect(errors[0]).toHaveProperty("error");
      expect(errors[0].endpoint).toBe("traces");
    });
  });

  describe("String concatenation mutations", () => {
    it("should use template literal ${normalizedBase}${normalizedPath}", () => {
      const result = deriveEndpoint("http://base.com", undefined, "/path");
      expect(result).toBe("http://base.com/path");
      expect(result).not.toBe("http://base.com");
      expect(result).not.toBe("/path");
      expect(result).not.toBe("pathhttp://base.com"); // Kill: order mutations
    });

    it("should construct error messages correctly", () => {
      const endpoints = {
        traces: "invalid-url",
      };
      const errors = validateOtlpEndpoints(endpoints, false);
      expect(errors[0].error).toBe("Invalid URL format: invalid-url");
      expect(errors[0].error).toContain("Invalid URL format");
      expect(errors[0].error).toContain("invalid-url");
    });

    it("should use exact HTTPS error message", () => {
      const endpoints = {
        traces: "http://example.com",
      };
      const errors = validateOtlpEndpoints(endpoints, true);
      expect(errors[0].error).toBe("Production endpoints must use HTTPS");
      expect(errors[0].error).not.toBe("Production endpoints must use HTTP");
    });
  });

  describe("Ternary operator mutations", () => {
    it("should use pathSuffix.startsWith('/') ? pathSuffix : `/${pathSuffix}`", () => {
      // When empty base
      expect(deriveEndpoint("", undefined, "/logs")).toBe("/logs");
      expect(deriveEndpoint("", undefined, "logs")).toBe("/logs");

      // When normal base
      expect(deriveEndpoint("http://base.com", undefined, "/logs")).toBe("http://base.com/logs");
      expect(deriveEndpoint("http://base.com", undefined, "logs")).toBe("http://base.com/logs");
    });

    it("should use correct boolean logic in toBool", () => {
      // normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on"
      expect(toBool("true")).toBe(true);
      expect(toBool("1")).toBe(true);
      expect(toBool("yes")).toBe(true);
      expect(toBool("on")).toBe(true);

      expect(toBool("false")).toBe(false);
      expect(toBool("0")).toBe(false);
      expect(toBool("no")).toBe(false);
      expect(toBool("off")).toBe(false);
      expect(toBool("random")).toBe(false);
    });
  });
});
