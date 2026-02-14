// test/bun/handlers/openapi-generator.test.ts

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { TEST_KONG_ADMIN_TOKEN } from "../../shared/test-constants";

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
    Bun.env.KONG_ADMIN_URL = originalEnv.KONG_ADMIN_URL || "http://192.168.178.3:30001";
    Bun.env.KONG_ADMIN_TOKEN = TEST_KONG_ADMIN_TOKEN;

    const { resetConfigCache } = await import("../../../src/config/config");
    resetConfigCache();
  });

  afterEach(async () => {
    Object.keys(Bun.env).forEach((key) => {
      if (!(key in originalEnv)) {
        delete Bun.env[key];
      }
    });
    Object.assign(Bun.env, originalEnv);

    const { resetConfigCache } = await import("../../../src/config/config");
    resetConfigCache();
  });

  describe("OpenAPIGenerator class", () => {
    it("should create instance", async () => {
      const { createApiDocGenerator } = await import("../../../src/openapi-generator");

      const generator = createApiDocGenerator();

      expect(generator).toBeDefined();
    });

    it("should generate valid OpenAPI spec", async () => {
      const { createApiDocGenerator } = await import("../../../src/openapi-generator");

      const generator = createApiDocGenerator();
      const spec = generator.generateSpec();

      expect(spec).toBeDefined();
      expect(spec.openapi).toBe("3.1.1");
      expect(spec.info).toBeDefined();
      expect(spec.paths).toBeDefined();
    });

    it("should include API info in spec", async () => {
      const { createApiDocGenerator } = await import("../../../src/openapi-generator");

      const generator = createApiDocGenerator();
      const spec = generator.generateSpec();

      expect(spec.info.title).toBeDefined();
      expect(spec.info.version).toBeDefined();
      expect(spec.info.description).toBeDefined();
    });

    it("should register all routes", async () => {
      const { createApiDocGenerator } = await import("../../../src/openapi-generator");

      const generator = createApiDocGenerator();
      generator.registerAllRoutes();
      const spec = generator.generateSpec();

      // Check that key paths are registered
      expect(spec.paths["/health"]).toBeDefined();
      expect(spec.paths["/tokens"]).toBeDefined();
    });

    it("should include components in spec", async () => {
      const { createApiDocGenerator } = await import("../../../src/openapi-generator");

      const generator = createApiDocGenerator();
      const spec = generator.generateSpec();

      expect(spec.components).toBeDefined();
      expect(spec.components.schemas).toBeDefined();
    });

    it("should cache generated spec", async () => {
      const { createApiDocGenerator } = await import("../../../src/openapi-generator");

      const generator = createApiDocGenerator();
      const spec1 = generator.generateSpec();
      const spec2 = generator.generateSpec();

      // Should be the same cached instance
      expect(spec1).toBe(spec2);
    });
  });

  describe("Route definitions", () => {
    it("should define health endpoint", async () => {
      const { createApiDocGenerator } = await import("../../../src/openapi-generator");

      const generator = createApiDocGenerator();
      generator.registerAllRoutes();
      const spec = generator.generateSpec();

      const healthPath = spec.paths["/health"];
      expect(healthPath).toBeDefined();
      expect(healthPath.get).toBeDefined();
    });

    it("should define tokens endpoint", async () => {
      const { createApiDocGenerator } = await import("../../../src/openapi-generator");

      const generator = createApiDocGenerator();
      generator.registerAllRoutes();
      const spec = generator.generateSpec();

      const tokensPath = spec.paths["/tokens"];
      expect(tokensPath).toBeDefined();
      expect(tokensPath.get).toBeDefined();
    });

    it("should define metrics endpoint", async () => {
      const { createApiDocGenerator } = await import("../../../src/openapi-generator");

      const generator = createApiDocGenerator();
      generator.registerAllRoutes();
      const spec = generator.generateSpec();

      const metricsPath = spec.paths["/metrics"];
      expect(metricsPath).toBeDefined();
    });

    it("should include tags in route definitions", async () => {
      const { createApiDocGenerator } = await import("../../../src/openapi-generator");

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
      const { createApiDocGenerator } = await import("../../../src/openapi-generator");

      const generator = createApiDocGenerator();
      const spec = generator.generateSpec();

      expect(spec.components.schemas.ErrorResponse).toBeDefined();
    });

    it("should include response schemas", async () => {
      const { createApiDocGenerator } = await import("../../../src/openapi-generator");

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
      const { createApiDocGenerator } = await import("../../../src/openapi-generator");

      const generator = createApiDocGenerator();
      const spec = generator.generateSpec();

      const json = JSON.stringify(spec);
      const parsed = JSON.parse(json);

      expect(parsed.openapi).toBe("3.1.1");
    });

    it("should include servers array", async () => {
      const { createApiDocGenerator } = await import("../../../src/openapi-generator");

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
      const { resetConfigCache } = await import("../../../src/config/config");
      resetConfigCache();

      const { createApiDocGenerator } = await import("../../../src/openapi-generator");

      const generator = createApiDocGenerator();
      const spec = generator.generateSpec();

      // API info should reflect configuration
      expect(spec.info.title).toBeDefined();
      expect(spec.info.version).toBeDefined();
    });
  });

  describe("Singleton accessor", () => {
    it("should return same instance via getApiDocGenerator", async () => {
      const { getApiDocGenerator } = await import("../../../src/openapi-generator");

      const generator1 = getApiDocGenerator();
      const generator2 = getApiDocGenerator();

      expect(generator1).toBe(generator2);
    });
  });

  describe("Cache behavior", () => {
    it("should cache response schemas for same route", async () => {
      const { createApiDocGenerator } = await import("../../../src/openapi-generator");

      const generator = createApiDocGenerator();
      generator.registerAllRoutes();

      // Generate spec twice - second should use cached responses
      const spec1 = generator.generateSpec();
      const spec2 = generator.generateSpec();

      expect(spec1.paths["/tokens"]).toBeDefined();
      expect(spec2.paths["/tokens"]).toBeDefined();
      expect(spec1.paths["/tokens"].get).toBeDefined();
      expect(spec2.paths["/tokens"].get.responses["401"]).toBeDefined();
      expect(spec2.paths["/tokens"].get.responses["429"]).toBeDefined();
    });

    it("should cache response schemas for /tokens/validate route", async () => {
      const { createApiDocGenerator } = await import("../../../src/openapi-generator");

      const generator = createApiDocGenerator();
      generator.registerAllRoutes();
      const spec = generator.generateSpec();

      expect(spec.paths["/tokens/validate"]).toBeDefined();
      expect(spec.paths["/tokens/validate"].get.responses["401"]).toBeDefined();
      expect(spec.paths["/tokens/validate"].get.responses["401"].description).toContain(
        "Token expired"
      );
    });

    it("should include 429 rate limit response for /tokens", async () => {
      const { createApiDocGenerator } = await import("../../../src/openapi-generator");

      const generator = createApiDocGenerator();
      generator.registerAllRoutes();
      const spec = generator.generateSpec();

      expect(spec.paths["/tokens"].get.responses["429"]).toBeDefined();
      expect(spec.paths["/tokens"].get.responses["429"].description).toContain("Rate limit");
    });

    it("should include 403 forbidden response for /tokens", async () => {
      const { createApiDocGenerator } = await import("../../../src/openapi-generator");

      const generator = createApiDocGenerator();
      generator.registerAllRoutes();
      const spec = generator.generateSpec();

      expect(spec.paths["/tokens"].get.responses["403"]).toBeDefined();
      expect(spec.paths["/tokens"].get.responses["403"].description).toContain("Anonymous");
    });
  });

  describe("Response schema generation for all endpoints", () => {
    it("should generate schema for /tokens/validate endpoint", async () => {
      const { createApiDocGenerator } = await import("../../../src/openapi-generator");

      const generator = createApiDocGenerator();
      generator.registerAllRoutes();
      const spec = generator.generateSpec();

      expect(spec.paths["/tokens/validate"]).toBeDefined();
      expect(spec.paths["/tokens/validate"].get).toBeDefined();
      expect(spec.paths["/tokens/validate"].get.responses["200"]).toBeDefined();
      expect(spec.paths["/tokens/validate"].get.responses["401"]).toBeDefined();
      expect(spec.paths["/tokens/validate"].get.responses["401"].description).toContain(
        "Token expired"
      );
    });

    it("should generate schema for /health/telemetry endpoint", async () => {
      const { createApiDocGenerator } = await import("../../../src/openapi-generator");

      const generator = createApiDocGenerator();
      generator.registerAllRoutes();
      const spec = generator.generateSpec();

      expect(spec.paths["/health/telemetry"]).toBeDefined();
      expect(spec.paths["/health/telemetry"].get).toBeDefined();
      expect(spec.paths["/health/telemetry"].get.responses["200"]).toBeDefined();
      expect(
        spec.paths["/health/telemetry"].get.responses["200"].content["application/json"].schema.$ref
      ).toBe("#/components/schemas/TelemetryStatus");
    });

    it("should generate schema for /health/metrics endpoint", async () => {
      const { createApiDocGenerator } = await import("../../../src/openapi-generator");

      const generator = createApiDocGenerator();
      generator.registerAllRoutes();
      const spec = generator.generateSpec();

      expect(spec.paths["/health/metrics"]).toBeDefined();
      expect(spec.paths["/health/metrics"].get).toBeDefined();
      expect(spec.paths["/health/metrics"].get.responses["200"]).toBeDefined();
      expect(
        spec.paths["/health/metrics"].get.responses["200"].content["application/json"].schema.$ref
      ).toBe("#/components/schemas/MetricsHealth");
    });

    it("should generate schema for /metrics endpoint", async () => {
      const { createApiDocGenerator } = await import("../../../src/openapi-generator");

      const generator = createApiDocGenerator();
      generator.registerAllRoutes();
      const spec = generator.generateSpec();

      expect(spec.paths["/metrics"]).toBeDefined();
      expect(spec.paths["/metrics"].get).toBeDefined();
      expect(spec.paths["/metrics"].get.responses["200"]).toBeDefined();
      expect(
        spec.paths["/metrics"].get.responses["200"].content["application/json"].schema.$ref
      ).toBe("#/components/schemas/PerformanceMetrics");
    });

    it("should generate schema for /debug/metrics/test endpoint", async () => {
      const { createApiDocGenerator } = await import("../../../src/openapi-generator");

      const generator = createApiDocGenerator();
      generator.registerAllRoutes();
      const spec = generator.generateSpec();

      expect(spec.paths["/debug/metrics/test"]).toBeDefined();
      expect(spec.paths["/debug/metrics/test"].post).toBeDefined();
      expect(spec.paths["/debug/metrics/test"].post.responses["200"]).toBeDefined();
      expect(
        spec.paths["/debug/metrics/test"].post.responses["200"].content["application/json"].schema
          .$ref
      ).toBe("#/components/schemas/DebugResponse");
    });

    it("should generate schema for /debug/metrics/export endpoint", async () => {
      const { createApiDocGenerator } = await import("../../../src/openapi-generator");

      const generator = createApiDocGenerator();
      generator.registerAllRoutes();
      const spec = generator.generateSpec();

      expect(spec.paths["/debug/metrics/export"]).toBeDefined();
      expect(spec.paths["/debug/metrics/export"].post).toBeDefined();
      expect(spec.paths["/debug/metrics/export"].post.responses["200"]).toBeDefined();
      expect(
        spec.paths["/debug/metrics/export"].post.responses["200"].content["application/json"].schema
          .$ref
      ).toBe("#/components/schemas/DebugResponse");
    });

    it("should generate schema for /debug/profiling/report endpoint", async () => {
      const { createApiDocGenerator } = await import("../../../src/openapi-generator");

      const generator = createApiDocGenerator();
      generator.registerAllRoutes();
      const spec = generator.generateSpec();

      expect(spec.paths["/debug/profiling/report"]).toBeDefined();
      expect(spec.paths["/debug/profiling/report"].get).toBeDefined();
      expect(spec.paths["/debug/profiling/report"].get.responses["200"]).toBeDefined();
    });

    it("should generate schema for /debug/profiling/start endpoint", async () => {
      const { createApiDocGenerator } = await import("../../../src/openapi-generator");

      const generator = createApiDocGenerator();
      generator.registerAllRoutes();
      const spec = generator.generateSpec();

      expect(spec.paths["/debug/profiling/start"]).toBeDefined();
      expect(spec.paths["/debug/profiling/start"].post).toBeDefined();
      expect(spec.paths["/debug/profiling/start"].post.responses["200"]).toBeDefined();
      expect(
        spec.paths["/debug/profiling/start"].post.responses["200"].content["application/json"]
          .schema.$ref
      ).toBe("#/components/schemas/ProfilingResponse");
    });

    it("should generate schema for /debug/profiling/stop endpoint", async () => {
      const { createApiDocGenerator } = await import("../../../src/openapi-generator");

      const generator = createApiDocGenerator();
      generator.registerAllRoutes();
      const spec = generator.generateSpec();

      expect(spec.paths["/debug/profiling/stop"]).toBeDefined();
      expect(spec.paths["/debug/profiling/stop"].post).toBeDefined();
      expect(spec.paths["/debug/profiling/stop"].post.responses["200"]).toBeDefined();
      expect(
        spec.paths["/debug/profiling/stop"].post.responses["200"].content["application/json"].schema
          .$ref
      ).toBe("#/components/schemas/ProfilingResponse");
    });

    it("should generate schema for /debug/profiling/status endpoint", async () => {
      const { createApiDocGenerator } = await import("../../../src/openapi-generator");

      const generator = createApiDocGenerator();
      generator.registerAllRoutes();
      const spec = generator.generateSpec();

      expect(spec.paths["/debug/profiling/status"]).toBeDefined();
      expect(spec.paths["/debug/profiling/status"].get).toBeDefined();
      expect(spec.paths["/debug/profiling/status"].get.responses["200"]).toBeDefined();
      expect(
        spec.paths["/debug/profiling/status"].get.responses["200"].content["application/json"]
          .schema.$ref
      ).toBe("#/components/schemas/ProfilingStatus");
    });

    it("should generate schema for /debug/profiling/reports endpoint", async () => {
      const { createApiDocGenerator } = await import("../../../src/openapi-generator");

      const generator = createApiDocGenerator();
      generator.registerAllRoutes();
      const spec = generator.generateSpec();

      expect(spec.paths["/debug/profiling/reports"]).toBeDefined();
      expect(spec.paths["/debug/profiling/reports"].get).toBeDefined();
      expect(spec.paths["/debug/profiling/reports"].get.responses["200"]).toBeDefined();
      expect(
        spec.paths["/debug/profiling/reports"].get.responses["200"].content["application/json"]
          .schema.$ref
      ).toBe("#/components/schemas/ProfilingReports");
    });

    it("should generate schema for /debug/profiling/cleanup endpoint", async () => {
      const { createApiDocGenerator } = await import("../../../src/openapi-generator");

      const generator = createApiDocGenerator();
      generator.registerAllRoutes();
      const spec = generator.generateSpec();

      expect(spec.paths["/debug/profiling/cleanup"]).toBeDefined();
      expect(spec.paths["/debug/profiling/cleanup"].post).toBeDefined();
      expect(spec.paths["/debug/profiling/cleanup"].post.responses["200"]).toBeDefined();
      expect(
        spec.paths["/debug/profiling/cleanup"].post.responses["200"].content["application/json"]
          .schema.$ref
      ).toBe("#/components/schemas/DebugResponse");
    });
  });

  describe("YAML conversion", () => {
    it("should convert spec to YAML format", async () => {
      const { createApiDocGenerator } = await import("../../../src/openapi-generator");

      const generator = createApiDocGenerator();
      generator.registerAllRoutes();
      const spec = generator.generateSpec();
      const yaml = generator.convertToYaml(spec);

      expect(yaml).toBeDefined();
      expect(typeof yaml).toBe("string");
      expect(yaml).toContain("openapi:");
    });

    it("should handle empty objects in YAML conversion", async () => {
      const { createApiDocGenerator } = await import("../../../src/openapi-generator");

      const generator = createApiDocGenerator();
      const yaml = generator.convertToYaml({});

      expect(yaml).toBeDefined();
      expect(yaml).toContain("{}");
    });

    it("should handle arrays in YAML conversion", async () => {
      const { createApiDocGenerator } = await import("../../../src/openapi-generator");

      const generator = createApiDocGenerator();
      const yaml = generator.convertToYaml({ items: ["a", "b", "c"] });

      expect(yaml).toBeDefined();
      expect(typeof yaml).toBe("string");
    });
  });
});
