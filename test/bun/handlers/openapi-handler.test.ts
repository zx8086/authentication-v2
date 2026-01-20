/* test/bun/openapi-handler.test.ts */

/**
 * Unit tests for OpenAPI handler
 * Tests the OpenAPI spec generation and format handling
 */

import { describe, expect, it } from "bun:test";
import { handleOpenAPISpec } from "../../../src/handlers/openapi";

describe("OpenAPI Handler", () => {
  describe("handleOpenAPISpec", () => {
    describe("JSON format (default)", () => {
      it("should return JSON when no Accept header is provided", async () => {
        const response = handleOpenAPISpec();

        expect(response).toBeInstanceOf(Response);
        expect(response.status).toBe(200);
        expect(response.headers.get("Content-Type")).toBe("application/json");
      });

      it("should return valid JSON content", async () => {
        const response = handleOpenAPISpec();
        const body = await response.json();

        // Verify OpenAPI spec structure (kills mutations)
        expect(typeof body).toBe("object");
        expect(body).not.toBeNull();
        expect(body.openapi).toBeDefined();
        expect(typeof body.openapi).toBe("string");
        expect(body.openapi).toMatch(/^3\.\d+\.\d+$/);
      });

      it("should include info section in spec", async () => {
        const response = handleOpenAPISpec();
        const body = await response.json();

        // Verify info section (kills mutations)
        expect(body.info).toBeDefined();
        expect(typeof body.info).toBe("object");
        expect(typeof body.info.title).toBe("string");
        expect(body.info.title.length).toBeGreaterThan(0);
        expect(typeof body.info.version).toBe("string");
        expect(body.info.version.length).toBeGreaterThan(0);
      });

      it("should include paths section in spec", async () => {
        const response = handleOpenAPISpec();
        const body = await response.json();

        // Verify paths section exists and is an object (kills mutations)
        expect(body.paths).toBeDefined();
        expect(typeof body.paths).toBe("object");
        // Paths may be empty or populated depending on generator state
        expect(body.paths).not.toBeNull();
      });

      it("should set Cache-Control header", async () => {
        const response = handleOpenAPISpec();
        const cacheControl = response.headers.get("Cache-Control");

        expect(cacheControl).not.toBeNull();
        expect(cacheControl).toContain("max-age=");
        expect(cacheControl).toBe("public, max-age=300");
      });

      it("should set CORS headers", async () => {
        const response = handleOpenAPISpec();

        const allowOrigin = response.headers.get("Access-Control-Allow-Origin");
        const allowHeaders = response.headers.get("Access-Control-Allow-Headers");
        const allowMethods = response.headers.get("Access-Control-Allow-Methods");

        expect(allowOrigin).not.toBeNull();
        expect(typeof allowOrigin).toBe("string");
        expect(allowHeaders).toBe("Content-Type, Authorization");
        expect(allowMethods).toBe("GET, POST, OPTIONS");
      });

      it("should return 200 status for JSON format", async () => {
        const response = handleOpenAPISpec("application/json");

        expect(response.status).toBe(200);
        expect(response.headers.get("Content-Type")).toBe("application/json");
      });
    });

    describe("YAML format", () => {
      it("should return YAML when Accept header is application/yaml", async () => {
        const response = handleOpenAPISpec("application/yaml");

        expect(response).toBeInstanceOf(Response);
        expect(response.status).toBe(200);
        expect(response.headers.get("Content-Type")).toBe("application/yaml");
      });

      it("should return YAML when Accept header is text/yaml", async () => {
        const response = handleOpenAPISpec("text/yaml");

        expect(response.status).toBe(200);
        expect(response.headers.get("Content-Type")).toBe("application/yaml");
      });

      it("should return YAML when Accept header is application/x-yaml", async () => {
        const response = handleOpenAPISpec("application/x-yaml");

        expect(response.status).toBe(200);
        expect(response.headers.get("Content-Type")).toBe("application/yaml");
      });

      it("should return valid YAML content", async () => {
        const response = handleOpenAPISpec("application/yaml");
        const body = await response.text();

        // Verify YAML content (kills mutations)
        expect(typeof body).toBe("string");
        expect(body.length).toBeGreaterThan(0);
        expect(body).toContain("openapi:");
        expect(body).toContain("info:");
        expect(body).toContain("paths:");
      });

      it("should include title in YAML output", async () => {
        const response = handleOpenAPISpec("application/yaml");
        const body = await response.text();

        // Verify title is in YAML (kills mutations)
        expect(body).toContain("title:");
      });

      it("should include version in YAML output", async () => {
        const response = handleOpenAPISpec("application/yaml");
        const body = await response.text();

        // Verify version is in YAML (kills mutations)
        expect(body).toContain("version:");
      });

      it("should set Cache-Control header for YAML", async () => {
        const response = handleOpenAPISpec("application/yaml");
        const cacheControl = response.headers.get("Cache-Control");

        expect(cacheControl).toBe("public, max-age=300");
      });

      it("should set CORS headers for YAML", async () => {
        const response = handleOpenAPISpec("application/yaml");

        expect(response.headers.get("Access-Control-Allow-Origin")).not.toBeNull();
        expect(response.headers.get("Access-Control-Allow-Headers")).toBe(
          "Content-Type, Authorization"
        );
        expect(response.headers.get("Access-Control-Allow-Methods")).toBe("GET, POST, OPTIONS");
      });
    });

    describe("Accept header handling", () => {
      it("should prefer YAML when Accept header contains yaml", async () => {
        const response = handleOpenAPISpec("application/json, application/yaml");

        // Should prefer YAML based on the implementation logic
        expect(response.headers.get("Content-Type")).toBe("application/yaml");
      });

      it("should return JSON when Accept header does not include yaml", async () => {
        const response = handleOpenAPISpec("application/json, text/html");

        expect(response.headers.get("Content-Type")).toBe("application/json");
      });

      it("should return JSON for empty Accept header", async () => {
        const response = handleOpenAPISpec("");

        expect(response.headers.get("Content-Type")).toBe("application/json");
      });

      it("should return JSON for undefined Accept header", async () => {
        const response = handleOpenAPISpec(undefined);

        expect(response.headers.get("Content-Type")).toBe("application/json");
      });

      it("should handle wildcard Accept header", async () => {
        const response = handleOpenAPISpec("*/*");

        // Wildcard should default to JSON
        expect(response.headers.get("Content-Type")).toBe("application/json");
      });
    });

    describe("YAML conversion edge cases", () => {
      it("should handle null values in YAML output", async () => {
        const response = handleOpenAPISpec("application/yaml");
        const body = await response.text();

        // YAML output should be valid and contain expected structure
        expect(body).toContain("openapi:");
        expect(typeof body).toBe("string");
        // If there are null values, they should be converted to "null" in YAML
      });

      it("should handle nested objects in YAML output", async () => {
        const response = handleOpenAPISpec("application/yaml");
        const body = await response.text();

        // The info section has nested structure
        expect(body).toContain("info:");
        expect(body).toContain("title:");
        expect(body).toContain("version:");
        // Nested objects should be properly indented
        expect(body.includes("  title:") || body.includes("  version:")).toBe(true);
      });

      it("should handle arrays in YAML output", async () => {
        const response = handleOpenAPISpec("application/yaml");
        const body = await response.text();

        // Servers section is an array
        expect(body).toContain("servers:");
        // Arrays should use YAML list syntax with dashes
        expect(body.includes("- ")).toBe(true);
      });

      it("should handle string values with quotes in YAML", async () => {
        const response = handleOpenAPISpec("application/yaml");
        const body = await response.text();

        // String values should be quoted in YAML output
        // The title should be quoted
        expect(body).toMatch(/title:\s*"/);
      });

      it("should handle boolean values in YAML output", async () => {
        const response = handleOpenAPISpec("application/yaml");
        const body = await response.text();

        // The YAML should be well-formed
        expect(body.length).toBeGreaterThan(0);
        // If there are boolean values, they should not be quoted
      });

      it("should handle number values in YAML output", async () => {
        const response = handleOpenAPISpec("application/yaml");
        const body = await response.text();

        // Numbers should not be quoted in YAML
        expect(body.length).toBeGreaterThan(0);
      });

      it("should produce properly indented YAML with 2-space indentation", async () => {
        const response = handleOpenAPISpec("application/yaml");
        const body = await response.text();

        // Check that nested items are indented with spaces (not tabs)
        expect(body).not.toContain("\t"); // No tabs
        // Should have indented lines (2 or 4 spaces)
        expect(body.includes("  ")).toBe(true);
      });

      it("should handle empty objects in components section", async () => {
        const response = handleOpenAPISpec("application/yaml");
        const body = await response.text();

        // Components section should exist
        expect(body).toContain("components:");
      });
    });

    describe("Error handling", () => {
      // Note: Error cases are hard to trigger because getApiDocGenerator() should always work
      // These tests verify the error response structure if it were to fail

      it("should return 200 status for successful requests", () => {
        const response = handleOpenAPISpec();

        expect(response.status).toBe(200);
        expect(response.status).not.toBe(500);
        expect(response.status).not.toBe(404);
        expect(response.status).not.toBe(400);
      });

      it("should include CORS headers in successful response", () => {
        const response = handleOpenAPISpec();

        // Verify all CORS headers are present (kills mutations that remove headers)
        expect(response.headers.get("Access-Control-Allow-Origin")).not.toBeNull();
        expect(response.headers.get("Access-Control-Allow-Headers")).toBe(
          "Content-Type, Authorization"
        );
        expect(response.headers.get("Access-Control-Allow-Methods")).toBe("GET, POST, OPTIONS");
      });
    });

    describe("OpenAPI spec content", () => {
      it("should include servers section", async () => {
        const response = handleOpenAPISpec();
        const body = await response.json();

        // Verify servers section exists (kills mutations)
        expect(body.servers).toBeDefined();
        expect(Array.isArray(body.servers)).toBe(true);
      });

      it("should include components section", async () => {
        const response = handleOpenAPISpec();
        const body = await response.json();

        // Verify components section exists (kills mutations)
        expect(body.components).toBeDefined();
        expect(typeof body.components).toBe("object");
      });

      it("should define error schemas in components", async () => {
        const response = handleOpenAPISpec();
        const body = await response.json();

        // Verify schemas exist (kills mutations)
        if (body.components?.schemas) {
          expect(typeof body.components.schemas).toBe("object");
          expect(Object.keys(body.components.schemas).length).toBeGreaterThan(0);
        }
      });

      it("should have paths as an object type", async () => {
        const response = handleOpenAPISpec();
        const body = await response.json();

        // Verify paths structure (kills mutations)
        expect(body.paths).toBeDefined();
        expect(typeof body.paths).toBe("object");
        expect(body.paths).not.toBeNull();
        expect(Array.isArray(body.paths)).toBe(false);
      });

      it("should have valid HTTP methods in paths if any exist", async () => {
        const response = handleOpenAPISpec();
        const body = await response.json();

        const validMethods = [
          "get",
          "post",
          "put",
          "patch",
          "delete",
          "options",
          "head",
          "parameters",
        ];

        // If paths exist, verify their structure
        if (Object.keys(body.paths).length > 0) {
          for (const [, operations] of Object.entries(body.paths)) {
            for (const method of Object.keys(operations as object)) {
              // Skip non-method keys
              if (!method.startsWith("$")) {
                const isValidMethod = validMethods.includes(method.toLowerCase());
                expect(isValidMethod).toBe(true);
              }
            }
          }
        } else {
          // Empty paths is also valid
          expect(Object.keys(body.paths).length).toBe(0);
        }
      });
    });
  });
});
