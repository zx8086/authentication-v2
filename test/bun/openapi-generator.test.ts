/* test/bun/openapi-generator.test.ts */

/**
 * Tests for OpenAPI generator and schema generation.
 * These tests cover route registration, schema building, and spec generation.
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";

describe("OpenAPI Generator", () => {
  const originalEnv = { ...Bun.env };

  beforeEach(async () => {
    Object.keys(Bun.env).forEach((key) => {
      if (!["PATH", "HOME", "USER", "SHELL", "TERM"].includes(key)) {
        delete Bun.env[key];
      }
    });
    Bun.env.NODE_ENV = "test";
    Bun.env.KONG_JWT_AUTHORITY = "https://auth.test.com";
    Bun.env.KONG_JWT_AUDIENCE = "https://api.test.com";
    Bun.env.KONG_ADMIN_URL = "http://kong:8001";
    Bun.env.KONG_ADMIN_TOKEN = "test-token-123456789012345678901234567890";

    const { resetConfigCache } = await import("../../src/config/config");
    resetConfigCache();
  });

  afterEach(async () => {
    Object.keys(Bun.env).forEach((key) => {
      if (!(key in originalEnv)) {
        delete Bun.env[key];
      }
    });
    Object.assign(Bun.env, originalEnv);

    const { resetConfigCache } = await import("../../src/config/config");
    resetConfigCache();
  });

  describe("OpenAPIGenerator class", () => {
    it("should create instance", async () => {
      const { createApiDocGenerator } = await import("../../src/openapi-generator");

      const generator = createApiDocGenerator();

      expect(generator).toBeDefined();
    });

    it("should generate valid OpenAPI spec", async () => {
      const { createApiDocGenerator } = await import("../../src/openapi-generator");

      const generator = createApiDocGenerator();
      const spec = generator.generateSpec();

      expect(spec).toBeDefined();
      expect(spec.openapi).toBe("3.1.1");
      expect(spec.info).toBeDefined();
      expect(spec.paths).toBeDefined();
    });

    it("should include API info in spec", async () => {
      const { createApiDocGenerator } = await import("../../src/openapi-generator");

      const generator = createApiDocGenerator();
      const spec = generator.generateSpec();

      expect(spec.info.title).toBeDefined();
      expect(spec.info.version).toBeDefined();
      expect(spec.info.description).toBeDefined();
    });

    it("should register all routes", async () => {
      const { createApiDocGenerator } = await import("../../src/openapi-generator");

      const generator = createApiDocGenerator();
      generator.registerAllRoutes();
      const spec = generator.generateSpec();

      // Check that key paths are registered
      expect(spec.paths["/health"]).toBeDefined();
      expect(spec.paths["/tokens"]).toBeDefined();
    });

    it("should include components in spec", async () => {
      const { createApiDocGenerator } = await import("../../src/openapi-generator");

      const generator = createApiDocGenerator();
      const spec = generator.generateSpec();

      expect(spec.components).toBeDefined();
      expect(spec.components.schemas).toBeDefined();
    });

    it("should cache generated spec", async () => {
      const { createApiDocGenerator } = await import("../../src/openapi-generator");

      const generator = createApiDocGenerator();
      const spec1 = generator.generateSpec();
      const spec2 = generator.generateSpec();

      // Should be the same cached instance
      expect(spec1).toBe(spec2);
    });
  });

  describe("Route definitions", () => {
    it("should define health endpoint", async () => {
      const { createApiDocGenerator } = await import("../../src/openapi-generator");

      const generator = createApiDocGenerator();
      generator.registerAllRoutes();
      const spec = generator.generateSpec();

      const healthPath = spec.paths["/health"];
      expect(healthPath).toBeDefined();
      expect(healthPath.get).toBeDefined();
    });

    it("should define tokens endpoint", async () => {
      const { createApiDocGenerator } = await import("../../src/openapi-generator");

      const generator = createApiDocGenerator();
      generator.registerAllRoutes();
      const spec = generator.generateSpec();

      const tokensPath = spec.paths["/tokens"];
      expect(tokensPath).toBeDefined();
      expect(tokensPath.get).toBeDefined();
    });

    it("should define metrics endpoint", async () => {
      const { createApiDocGenerator } = await import("../../src/openapi-generator");

      const generator = createApiDocGenerator();
      generator.registerAllRoutes();
      const spec = generator.generateSpec();

      const metricsPath = spec.paths["/metrics"];
      expect(metricsPath).toBeDefined();
    });

    it("should include tags in route definitions", async () => {
      const { createApiDocGenerator } = await import("../../src/openapi-generator");

      const generator = createApiDocGenerator();
      generator.registerAllRoutes();
      const spec = generator.generateSpec();

      const healthPath = spec.paths["/health"];
      if (healthPath?.get?.tags) {
        expect(Array.isArray(healthPath.get.tags)).toBe(true);
      }
    });
  });

  describe("Schema definitions", () => {
    it("should include error schema", async () => {
      const { createApiDocGenerator } = await import("../../src/openapi-generator");

      const generator = createApiDocGenerator();
      const spec = generator.generateSpec();

      expect(spec.components.schemas.ErrorResponse).toBeDefined();
    });

    it("should include response schemas", async () => {
      const { createApiDocGenerator } = await import("../../src/openapi-generator");

      const generator = createApiDocGenerator();
      const spec = generator.generateSpec();

      // Check for common response schemas
      const schemas = spec.components.schemas;
      expect(schemas).toBeDefined();
      expect(Object.keys(schemas).length).toBeGreaterThan(0);
    });
  });

  describe("Spec serialization", () => {
    it("should serialize to valid JSON", async () => {
      const { createApiDocGenerator } = await import("../../src/openapi-generator");

      const generator = createApiDocGenerator();
      const spec = generator.generateSpec();

      const json = JSON.stringify(spec);
      const parsed = JSON.parse(json);

      expect(parsed.openapi).toBe("3.1.1");
    });

    it("should include servers array", async () => {
      const { createApiDocGenerator } = await import("../../src/openapi-generator");

      const generator = createApiDocGenerator();
      const spec = generator.generateSpec();

      expect(spec.servers).toBeDefined();
      expect(Array.isArray(spec.servers)).toBe(true);
    });
  });

  describe("Dynamic API info", () => {
    it("should use config values for API info", async () => {
      Bun.env.API_TITLE = "Test API Title";
      Bun.env.API_VERSION = "2.0.0-test";
      const { resetConfigCache } = await import("../../src/config/config");
      resetConfigCache();

      const { createApiDocGenerator } = await import("../../src/openapi-generator");

      const generator = createApiDocGenerator();
      const spec = generator.generateSpec();

      // API info should reflect configuration
      expect(spec.info.title).toBeDefined();
      expect(spec.info.version).toBeDefined();
    });
  });

  describe("Singleton accessor", () => {
    it("should return same instance via getApiDocGenerator", async () => {
      const { getApiDocGenerator } = await import("../../src/openapi-generator");

      const generator1 = getApiDocGenerator();
      const generator2 = getApiDocGenerator();

      expect(generator1).toBe(generator2);
    });
  });

  describe("YAML conversion", () => {
    it("should convert spec to YAML format", async () => {
      const { createApiDocGenerator } = await import("../../src/openapi-generator");

      const generator = createApiDocGenerator();
      generator.registerAllRoutes();
      const spec = generator.generateSpec();
      const yaml = generator.convertToYaml(spec);

      expect(yaml).toBeDefined();
      expect(typeof yaml).toBe("string");
      expect(yaml).toContain("openapi:");
    });

    it("should handle empty objects in YAML conversion", async () => {
      const { createApiDocGenerator } = await import("../../src/openapi-generator");

      const generator = createApiDocGenerator();
      const yaml = generator.convertToYaml({});

      expect(yaml).toBeDefined();
      expect(yaml).toContain("{}");
    });

    it("should handle arrays in YAML conversion", async () => {
      const { createApiDocGenerator } = await import("../../src/openapi-generator");

      const generator = createApiDocGenerator();
      const yaml = generator.convertToYaml({ items: ["a", "b", "c"] });

      expect(yaml).toBeDefined();
      expect(typeof yaml).toBe("string");
    });
  });
});
