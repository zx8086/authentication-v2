/* test/bun/openapi-yaml-converter.test.ts */

import { beforeEach, describe, expect, it, spyOn } from "bun:test";
import { handleOpenAPISpec, resetOpenAPICache } from "../../../src/handlers/openapi";
import { getApiDocGenerator } from "../../../src/openapi-generator";

// Helper to create a Request with optional Accept header
function createRequest(acceptHeader?: string): Request {
  const headers: Record<string, string> = {};
  if (acceptHeader) {
    headers.Accept = acceptHeader;
  }
  return new Request("http://localhost/", { headers });
}

describe("OpenAPI YAML Converter Edge Cases", () => {
  // Reset cache before each test to ensure mocks work correctly
  beforeEach(() => {
    resetOpenAPICache();
  });

  describe("convertToYaml with null/undefined values", () => {
    it("should handle object with null values in YAML conversion", async () => {
      const mockGenerator = getApiDocGenerator();
      const originalGenerateSpec = mockGenerator.generateSpec;

      spyOn(mockGenerator, "generateSpec").mockReturnValue({
        openapi: "3.0.0",
        info: {
          title: "Test API",
          version: "1.0.0",
          description: null,
        },
        paths: {},
      });

      const response = await handleOpenAPISpec(createRequest("application/yaml"));
      const yaml = await response.text();

      expect(yaml).toContain("description: null");

      mockGenerator.generateSpec = originalGenerateSpec;
    });

    it("should handle object with undefined values by converting to null", async () => {
      const mockGenerator = getApiDocGenerator();
      const originalGenerateSpec = mockGenerator.generateSpec;

      spyOn(mockGenerator, "generateSpec").mockReturnValue({
        openapi: "3.0.0",
        info: {
          title: "Test API",
          version: "1.0.0",
          contact: undefined,
        },
        paths: {},
      });

      const response = await handleOpenAPISpec(createRequest("application/yaml"));
      const yaml = await response.text();

      expect(yaml).toContain("contact: null");

      mockGenerator.generateSpec = originalGenerateSpec;
    });
  });

  describe("Error handling in handleOpenAPISpec", () => {
    it("should return 500 error when spec generation throws Error", async () => {
      const mockGenerator = getApiDocGenerator();
      const originalGenerateSpec = mockGenerator.generateSpec;

      spyOn(mockGenerator, "generateSpec").mockImplementation(() => {
        throw new Error("Spec generation failed");
      });

      const response = await handleOpenAPISpec(createRequest());

      expect(response.status).toBe(500);
      expect(response.headers.get("Content-Type")).toBe("application/json");

      const body = await response.json();
      expect(body.error).toBe("Failed to generate OpenAPI specification");
      expect(body.message).toBe("Spec generation failed");
      expect(body.timestamp).toBeDefined();
      expect(typeof body.timestamp).toBe("string");

      mockGenerator.generateSpec = originalGenerateSpec;
    });

    it("should include CORS headers in error response", async () => {
      const mockGenerator = getApiDocGenerator();
      const originalGenerateSpec = mockGenerator.generateSpec;

      spyOn(mockGenerator, "generateSpec").mockImplementation(() => {
        throw new Error("Test error");
      });

      const response = await handleOpenAPISpec(createRequest());

      expect(response.headers.get("Access-Control-Allow-Origin")).not.toBeNull();
      expect(response.headers.get("Access-Control-Allow-Headers")).toBe(
        "Content-Type, Authorization"
      );
      expect(response.headers.get("Access-Control-Allow-Methods")).toBe("GET, POST, OPTIONS");

      mockGenerator.generateSpec = originalGenerateSpec;
    });

    it("should handle unknown error type with fallback message", async () => {
      const mockGenerator = getApiDocGenerator();
      const originalGenerateSpec = mockGenerator.generateSpec;

      spyOn(mockGenerator, "generateSpec").mockImplementation(() => {
        throw "String error instead of Error object";
      });

      const response = await handleOpenAPISpec(createRequest());

      expect(response.status).toBe(500);

      const body = await response.json();
      expect(body.error).toBe("Failed to generate OpenAPI specification");
      expect(body.message).toBe("Unknown error");

      mockGenerator.generateSpec = originalGenerateSpec;
    });

    it("should return error with valid JSON structure", async () => {
      const mockGenerator = getApiDocGenerator();
      const originalGenerateSpec = mockGenerator.generateSpec;

      spyOn(mockGenerator, "generateSpec").mockImplementation(() => {
        throw new Error("Critical failure");
      });

      const response = await handleOpenAPISpec(createRequest());
      const body = await response.json();

      expect(typeof body).toBe("object");
      expect(body).toHaveProperty("error");
      expect(body).toHaveProperty("message");
      expect(body).toHaveProperty("timestamp");
      expect(typeof body.error).toBe("string");
      expect(typeof body.message).toBe("string");
      expect(typeof body.timestamp).toBe("string");

      mockGenerator.generateSpec = originalGenerateSpec;
    });

    it("should include valid ISO timestamp in error response", async () => {
      const mockGenerator = getApiDocGenerator();
      const originalGenerateSpec = mockGenerator.generateSpec;

      spyOn(mockGenerator, "generateSpec").mockImplementation(() => {
        throw new Error("Test");
      });

      const response = await handleOpenAPISpec(createRequest());
      const body = await response.json();

      const timestampRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
      expect(body.timestamp).toMatch(timestampRegex);
      expect(new Date(body.timestamp).getTime()).not.toBeNaN();

      mockGenerator.generateSpec = originalGenerateSpec;
    });

    it("should handle error during YAML conversion", async () => {
      const mockGenerator = getApiDocGenerator();
      const originalGenerateSpec = mockGenerator.generateSpec;

      spyOn(mockGenerator, "generateSpec").mockImplementation(() => {
        throw new TypeError("Cannot convert to YAML");
      });

      const response = await handleOpenAPISpec(createRequest("application/yaml"));

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.message).toBe("Cannot convert to YAML");

      mockGenerator.generateSpec = originalGenerateSpec;
    });
  });
});
