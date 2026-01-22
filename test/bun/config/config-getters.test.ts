/* test/bun/config-getters.test.ts */

/**
 * Mutation-resistant tests for config getter functions.
 * These tests verify that getter functions return the correct config sections,
 * catching Stryker mutations that might change return values or property access.
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";

describe("Config Getter Functions - Mutation Testing", () => {
  const originalEnv = { ...Bun.env };

  beforeEach(async () => {
    // Clear environment for predictable config loading
    Object.keys(Bun.env).forEach((key) => {
      if (!["PATH", "HOME", "USER", "SHELL", "TERM"].includes(key)) {
        delete Bun.env[key];
      }
    });
    Bun.env.NODE_ENV = "test";
    Bun.env.KONG_JWT_AUTHORITY = "https://auth.test.com";
    Bun.env.KONG_JWT_AUDIENCE = "https://api.test.com";
    // Use original Kong URL from .env to avoid polluting environment
    Bun.env.KONG_ADMIN_URL = originalEnv.KONG_ADMIN_URL || "http://192.168.178.3:30001";
    Bun.env.KONG_ADMIN_TOKEN = "test-token-123456789012345678901234567890";
    Bun.env.PORT = "4000";
    Bun.env.JWT_EXPIRATION_MINUTES = "30";
    Bun.env.OTEL_SERVICE_NAME = "test-auth-service";
    Bun.env.OTEL_SERVICE_VERSION = "2.0.0";

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

  describe("getServerConfig", () => {
    it("should return server config with correct port value", async () => {
      const { getServerConfig } = await import("../../../src/config/config");
      const serverConfig = getServerConfig();

      // Verify exact value - catches mutations to return statement
      expect(serverConfig.port).toBe(4000);
      expect(serverConfig.port).not.toBe(3000);
      expect(serverConfig.port).toBeGreaterThan(0);
    });

    it("should return server config with correct nodeEnv value", async () => {
      const { getServerConfig } = await import("../../../src/config/config");
      const serverConfig = getServerConfig();

      // Verify exact string - catches string literal mutations
      expect(serverConfig.nodeEnv).toBe("test");
      expect(serverConfig.nodeEnv).not.toBe("development");
      expect(serverConfig.nodeEnv).not.toBe("production");
    });

    it("should return correct object structure", async () => {
      const { getServerConfig } = await import("../../../src/config/config");
      const serverConfig = getServerConfig();

      // Verify structure - catches mutations that return wrong config section
      expect(serverConfig).toHaveProperty("port");
      expect(serverConfig).toHaveProperty("nodeEnv");
      expect(serverConfig).not.toHaveProperty("authority");
      expect(serverConfig).not.toHaveProperty("adminUrl");
    });
  });

  describe("getJwtConfig", () => {
    it("should return JWT config with correct authority value", async () => {
      const { getJwtConfig } = await import("../../../src/config/config");
      const jwtConfig = getJwtConfig();

      expect(jwtConfig.authority).toBe("https://auth.test.com");
      expect(jwtConfig.authority).not.toBe("https://auth.example.com");
    });

    it("should return JWT config with correct audience value", async () => {
      const { getJwtConfig } = await import("../../../src/config/config");
      const jwtConfig = getJwtConfig();

      expect(jwtConfig.audience).toBe("https://api.test.com");
      expect(jwtConfig.audience).not.toBe("https://api.example.com");
    });

    it("should return JWT config with correct expiration value", async () => {
      const { getJwtConfig } = await import("../../../src/config/config");
      const jwtConfig = getJwtConfig();

      expect(jwtConfig.expirationMinutes).toBe(30);
      expect(jwtConfig.expirationMinutes).not.toBe(15);
      expect(jwtConfig.expirationMinutes).toBeGreaterThan(0);
    });

    it("should return correct object structure - not server config", async () => {
      const { getJwtConfig } = await import("../../../src/config/config");
      const jwtConfig = getJwtConfig();

      // Verify we got JWT config, not another config section
      expect(jwtConfig).toHaveProperty("authority");
      expect(jwtConfig).toHaveProperty("audience");
      expect(jwtConfig).toHaveProperty("expirationMinutes");
      expect(jwtConfig).not.toHaveProperty("port");
      expect(jwtConfig).not.toHaveProperty("adminUrl");
    });
  });

  describe("getKongConfig", () => {
    it("should return Kong config with correct adminUrl value", async () => {
      const { getKongConfig } = await import("../../../src/config/config");
      const kongConfig = getKongConfig();

      const expectedUrl = originalEnv.KONG_ADMIN_URL || "http://192.168.178.3:30001";
      expect(kongConfig.adminUrl).toBe(expectedUrl);
      expect(kongConfig.adminUrl).not.toBe("");
    });

    it("should return Kong config with correct mode value", async () => {
      const { getKongConfig } = await import("../../../src/config/config");
      const kongConfig = getKongConfig();

      expect(kongConfig.mode).toBe("API_GATEWAY");
      expect(kongConfig.mode).not.toBe("KONNECT");
    });

    it("should return Kong config with circuit breaker settings", async () => {
      const { getKongConfig } = await import("../../../src/config/config");
      const kongConfig = getKongConfig();

      expect(kongConfig.circuitBreaker).toBeDefined();
      expect(typeof kongConfig.circuitBreaker.enabled).toBe("boolean");
      expect(typeof kongConfig.circuitBreaker.timeout).toBe("number");
      expect(kongConfig.circuitBreaker.timeout).toBeGreaterThan(0);
    });

    it("should return correct object structure - not JWT config", async () => {
      const { getKongConfig } = await import("../../../src/config/config");
      const kongConfig = getKongConfig();

      expect(kongConfig).toHaveProperty("adminUrl");
      expect(kongConfig).toHaveProperty("mode");
      expect(kongConfig).toHaveProperty("circuitBreaker");
      expect(kongConfig).not.toHaveProperty("authority");
      expect(kongConfig).not.toHaveProperty("port");
    });
  });

  describe("getTelemetryConfig", () => {
    it("should return telemetry config with correct serviceName value", async () => {
      const { getTelemetryConfig } = await import("../../../src/config/config");
      const telemetryConfig = getTelemetryConfig();

      expect(telemetryConfig.serviceName).toBe("test-auth-service");
      expect(telemetryConfig.serviceName).not.toBe("authentication-service");
    });

    it("should return telemetry config with correct serviceVersion value", async () => {
      const { getTelemetryConfig } = await import("../../../src/config/config");
      const telemetryConfig = getTelemetryConfig();

      expect(telemetryConfig.serviceVersion).toBe("2.0.0");
      expect(telemetryConfig.serviceVersion).not.toBe("1.0.0");
    });

    it("should return correct object structure", async () => {
      const { getTelemetryConfig } = await import("../../../src/config/config");
      const telemetryConfig = getTelemetryConfig();

      expect(telemetryConfig).toHaveProperty("serviceName");
      expect(telemetryConfig).toHaveProperty("serviceVersion");
      expect(telemetryConfig).toHaveProperty("mode");
      expect(telemetryConfig).not.toHaveProperty("port");
      expect(telemetryConfig).not.toHaveProperty("adminUrl");
    });
  });

  describe("getCachingConfig", () => {
    it("should return caching config with default values", async () => {
      const { getCachingConfig } = await import("../../../src/config/config");
      const cachingConfig = getCachingConfig();

      expect(cachingConfig).toHaveProperty("ttlSeconds");
      expect(typeof cachingConfig.ttlSeconds).toBe("number");
      expect(cachingConfig.ttlSeconds).toBeGreaterThan(0);
    });

    it("should return caching config with stale data tolerance", async () => {
      const { getCachingConfig } = await import("../../../src/config/config");
      const cachingConfig = getCachingConfig();

      expect(cachingConfig).toHaveProperty("staleDataToleranceMinutes");
      expect(typeof cachingConfig.staleDataToleranceMinutes).toBe("number");
    });

    it("should return correct object structure - not telemetry config", async () => {
      const { getCachingConfig } = await import("../../../src/config/config");
      const cachingConfig = getCachingConfig();

      expect(cachingConfig).toHaveProperty("ttlSeconds");
      expect(cachingConfig).not.toHaveProperty("serviceName");
      expect(cachingConfig).not.toHaveProperty("adminUrl");
    });
  });

  describe("getProfilingConfig", () => {
    it("should return profiling config with enabled property", async () => {
      const { getProfilingConfig } = await import("../../../src/config/config");
      const profilingConfig = getProfilingConfig();

      expect(profilingConfig).toHaveProperty("enabled");
      expect(typeof profilingConfig.enabled).toBe("boolean");
    });

    it("should return correct object structure", async () => {
      const { getProfilingConfig } = await import("../../../src/config/config");
      const profilingConfig = getProfilingConfig();

      expect(profilingConfig).not.toHaveProperty("port");
      expect(profilingConfig).not.toHaveProperty("serviceName");
    });
  });

  describe("getApiInfoConfig", () => {
    it("should return API info config with title", async () => {
      const { getApiInfoConfig } = await import("../../../src/config/config");
      const apiInfoConfig = getApiInfoConfig();

      expect(apiInfoConfig).toHaveProperty("title");
      expect(typeof apiInfoConfig.title).toBe("string");
      expect(apiInfoConfig.title.length).toBeGreaterThan(0);
    });

    it("should return API info config with version", async () => {
      const { getApiInfoConfig } = await import("../../../src/config/config");
      const apiInfoConfig = getApiInfoConfig();

      expect(apiInfoConfig).toHaveProperty("version");
      expect(typeof apiInfoConfig.version).toBe("string");
    });

    it("should return correct object structure", async () => {
      const { getApiInfoConfig } = await import("../../../src/config/config");
      const apiInfoConfig = getApiInfoConfig();

      expect(apiInfoConfig).toHaveProperty("title");
      expect(apiInfoConfig).toHaveProperty("description");
      expect(apiInfoConfig).not.toHaveProperty("port");
      expect(apiInfoConfig).not.toHaveProperty("adminUrl");
    });
  });

  describe("Legacy Proxy Exports", () => {
    it("serverConfig proxy should return correct port", async () => {
      const { serverConfig } = await import("../../../src/config/config");

      expect(serverConfig.port).toBe(4000);
      expect(serverConfig.nodeEnv).toBe("test");
    });

    it("jwtConfig proxy should return correct values", async () => {
      const { jwtConfig } = await import("../../../src/config/config");

      expect(jwtConfig.authority).toBe("https://auth.test.com");
      expect(jwtConfig.expirationMinutes).toBe(30);
    });

    it("kongConfig proxy should return correct values", async () => {
      const { kongConfig } = await import("../../../src/config/config");

      const expectedUrl = originalEnv.KONG_ADMIN_URL || "http://192.168.178.3:30001";
      expect(kongConfig.adminUrl).toBe(expectedUrl);
      expect(kongConfig.mode).toBe("API_GATEWAY");
    });

    it("telemetryConfig proxy should return correct values", async () => {
      const { telemetryConfig } = await import("../../../src/config/config");

      expect(telemetryConfig.serviceName).toBe("test-auth-service");
      expect(telemetryConfig.serviceVersion).toBe("2.0.0");
    });

    it("cachingConfig proxy should return correct values", async () => {
      const { cachingConfig } = await import("../../../src/config/config");

      expect(cachingConfig.ttlSeconds).toBeGreaterThan(0);
      expect(typeof cachingConfig.staleDataToleranceMinutes).toBe("number");
    });

    it("profilingConfig proxy should return correct values", async () => {
      const { profilingConfig } = await import("../../../src/config/config");

      expect(typeof profilingConfig.enabled).toBe("boolean");
    });

    it("apiInfoConfig proxy should return correct values", async () => {
      const { apiInfoConfig } = await import("../../../src/config/config");

      expect(typeof apiInfoConfig.title).toBe("string");
      expect(typeof apiInfoConfig.version).toBe("string");
    });
  });

  describe("configMetadata", () => {
    it("should have correct version", async () => {
      const { configMetadata } = await import("../../../src/config/config");

      expect(configMetadata.version).toBe("4.0.0");
      expect(configMetadata.version).not.toBe("3.0.0");
    });

    it("should have correct pattern", async () => {
      const { configMetadata } = await import("../../../src/config/config");

      expect(configMetadata.pattern).toBe("4-pillar");
      expect(configMetadata.pattern).not.toBe("3-pillar");
    });

    it("should have correct zodVersion", async () => {
      const { configMetadata } = await import("../../../src/config/config");

      expect(configMetadata.zodVersion).toBe("v4");
      expect(configMetadata.zodVersion).not.toBe("v3");
    });

    it("should return dynamic environment from getter", async () => {
      const { configMetadata } = await import("../../../src/config/config");

      // Dynamic getter should return actual environment
      expect(configMetadata.environment).toBe("test");
    });

    it("should return dynamic serviceName from getter", async () => {
      const { configMetadata } = await import("../../../src/config/config");

      expect(configMetadata.serviceName).toBe("test-auth-service");
    });

    it("should return dynamic serviceVersion from getter", async () => {
      const { configMetadata } = await import("../../../src/config/config");

      expect(configMetadata.serviceVersion).toBe("2.0.0");
    });

    it("should return loadedAt as valid ISO timestamp", async () => {
      const { configMetadata } = await import("../../../src/config/config");

      const loadedAt = configMetadata.loadedAt;
      expect(typeof loadedAt).toBe("string");
      expect(() => new Date(loadedAt)).not.toThrow();
      expect(new Date(loadedAt).toISOString()).toBe(loadedAt);
    });

    it("should have optimizations array with expected items", async () => {
      const { configMetadata } = await import("../../../src/config/config");

      expect(Array.isArray(configMetadata.optimizations)).toBe(true);
      expect(configMetadata.optimizations).toContain("type-only-imports");
      expect(configMetadata.optimizations).toContain("schema-memoization");
      expect(configMetadata.optimizations.length).toBe(4);
    });

    it("should have performance settings", async () => {
      const { configMetadata } = await import("../../../src/config/config");

      expect(configMetadata.performance.cacheEnabled).toBe(true);
      expect(configMetadata.performance.lazyInitialization).toBe(true);
      expect(configMetadata.performance.proxyPattern).toBe(true);
    });

    it("should have pillars configuration", async () => {
      const { configMetadata } = await import("../../../src/config/config");

      expect(configMetadata.pillars.defaults).toBe("./defaults.ts");
      expect(configMetadata.pillars.envMapping).toBe("./envMapping.ts");
      expect(configMetadata.pillars.validation).toBe("./schemas.ts");
      expect(configMetadata.pillars.loader).toBe("./loader.ts");
    });

    it("should return envVarMapping from getter", async () => {
      const { configMetadata } = await import("../../../src/config/config");

      expect(configMetadata.envVarMapping).toBeDefined();
      expect(typeof configMetadata.envVarMapping).toBe("object");
    });

    it("should return defaultConfig from getter", async () => {
      const { configMetadata } = await import("../../../src/config/config");

      expect(configMetadata.defaultConfig).toBeDefined();
      expect(typeof configMetadata.defaultConfig).toBe("object");
      expect(configMetadata.defaultConfig).toHaveProperty("server");
    });
  });

  describe("validateConfiguration", () => {
    it("should validate correct configuration", async () => {
      const { validateConfiguration, loadConfig } = await import("../../../src/config/config");

      const config = loadConfig();
      expect(() => validateConfiguration(config)).not.toThrow();
    });

    it("should throw on invalid configuration", async () => {
      const { validateConfiguration } = await import("../../../src/config/config");

      expect(() => validateConfiguration({})).toThrow();
      expect(() => validateConfiguration({ invalid: true })).toThrow();
    });

    it("should return validated data on success", async () => {
      const { validateConfiguration, loadConfig } = await import("../../../src/config/config");

      const config = loadConfig();
      const validated = validateConfiguration(config);

      expect(validated.server.port).toBe(4000);
      expect(validated.jwt.authority).toBe("https://auth.test.com");
    });
  });

  describe("getConfigJSONSchema", () => {
    it("should return a valid schema object", async () => {
      const { getConfigJSONSchema } = await import("../../../src/config/config");

      const schema = getConfigJSONSchema();
      expect(schema).toBeDefined();
      expect(typeof schema).toBe("object");
    });

    it("should return schema with parse method", async () => {
      const { getConfigJSONSchema } = await import("../../../src/config/config");

      const schema = getConfigJSONSchema();
      expect(typeof schema.parse).toBe("function");
      expect(typeof schema.safeParse).toBe("function");
    });
  });
});
