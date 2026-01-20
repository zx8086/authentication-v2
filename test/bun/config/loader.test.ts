/* test/bun/config/loader.test.ts */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { initializeConfig } from "../../../src/config/loader";

describe("Config Loader", () => {
  let originalEnv: Record<string, string | undefined>;

  // All env vars that the config loader checks
  const ENV_VARS = [
    "PORT",
    "NODE_ENV",
    "KONG_JWT_AUTHORITY",
    "KONG_JWT_AUDIENCE",
    "KONG_JWT_ISSUER",
    "KONG_JWT_KEY_CLAIM_NAME",
    "JWT_EXPIRATION_MINUTES",
    "KONG_MODE",
    "KONG_ADMIN_URL",
    "KONG_ADMIN_TOKEN",
    "CIRCUIT_BREAKER_ENABLED",
    "CIRCUIT_BREAKER_TIMEOUT",
    "CIRCUIT_BREAKER_ERROR_THRESHOLD",
    "CIRCUIT_BREAKER_RESET_TIMEOUT",
    "CIRCUIT_BREAKER_VOLUME_THRESHOLD",
    "CIRCUIT_BREAKER_ROLLING_COUNT_TIMEOUT",
    "CIRCUIT_BREAKER_ROLLING_COUNT_BUCKETS",
    "STALE_DATA_TOLERANCE_MINUTES",
    "OTEL_SERVICE_NAME",
    "OTEL_SERVICE_VERSION",
    "TELEMETRY_MODE",
    "OTEL_EXPORTER_OTLP_ENDPOINT",
    "OTEL_EXPORTER_OTLP_LOGS_ENDPOINT",
    "OTEL_EXPORTER_OTLP_TRACES_ENDPOINT",
    "OTEL_EXPORTER_OTLP_METRICS_ENDPOINT",
    "OTEL_EXPORTER_OTLP_TIMEOUT",
    "OTEL_BSP_MAX_EXPORT_BATCH_SIZE",
    "OTEL_BSP_MAX_QUEUE_SIZE",
    "HIGH_AVAILABILITY",
    "REDIS_URL",
    "REDIS_PASSWORD",
    "REDIS_DB",
    "PROFILING_ENABLED",
    "API_TITLE",
    "API_DESCRIPTION",
    "API_VERSION",
    "API_CONTACT_NAME",
    "API_CONTACT_EMAIL",
    "API_LICENSE_NAME",
    "API_LICENSE_IDENTIFIER",
    "API_CORS",
  ];

  beforeEach(() => {
    // Save original environment
    originalEnv = {};
    ENV_VARS.forEach((key) => {
      originalEnv[key] = Bun.env[key];
    });

    // Clear all env vars for clean slate
    ENV_VARS.forEach((key) => {
      delete Bun.env[key];
    });
  });

  afterEach(() => {
    // Restore original environment
    Object.entries(originalEnv).forEach(([key, value]) => {
      if (value === undefined) {
        delete Bun.env[key];
      } else {
        Bun.env[key] = value;
      }
    });
  });

  describe("initializeConfig", () => {
    it("should throw error when KONG_JWT_AUTHORITY is missing", () => {
      delete Bun.env.KONG_JWT_AUTHORITY;
      Bun.env.KONG_JWT_AUDIENCE = "test-audience";
      Bun.env.KONG_ADMIN_URL = "https://kong.example.com";
      Bun.env.KONG_ADMIN_TOKEN = "test-token";

      expect(() => initializeConfig()).toThrow("Invalid environment configuration");
    });

    it("should throw error when KONG_JWT_AUDIENCE is missing", () => {
      Bun.env.KONG_JWT_AUTHORITY = "test-authority";
      delete Bun.env.KONG_JWT_AUDIENCE;
      Bun.env.KONG_ADMIN_URL = "https://kong.example.com";
      Bun.env.KONG_ADMIN_TOKEN = "test-token";

      expect(() => initializeConfig()).toThrow("Invalid environment configuration");
    });

    it("should throw error when KONG_ADMIN_URL is missing", () => {
      Bun.env.KONG_JWT_AUTHORITY = "test-authority";
      Bun.env.KONG_JWT_AUDIENCE = "test-audience";
      delete Bun.env.KONG_ADMIN_URL;
      Bun.env.KONG_ADMIN_TOKEN = "test-token";

      expect(() => initializeConfig()).toThrow("Invalid environment configuration");
    });

    it("should throw error for missing KONG_ADMIN_TOKEN in KONNECT mode", () => {
      Bun.env.KONG_JWT_AUTHORITY = "test-authority";
      Bun.env.KONG_JWT_AUDIENCE = "test-audience";
      Bun.env.KONG_ADMIN_URL = "https://kong.example.com";
      Bun.env.KONG_MODE = "KONNECT";
      delete Bun.env.KONG_ADMIN_TOKEN;

      expect(() => initializeConfig()).toThrow("Invalid environment configuration");
    });

    it("should throw error for empty KONG_JWT_AUTHORITY", () => {
      Bun.env.KONG_JWT_AUTHORITY = "";
      Bun.env.KONG_JWT_AUDIENCE = "test-audience";
      Bun.env.KONG_ADMIN_URL = "https://kong.example.com";
      Bun.env.KONG_ADMIN_TOKEN = "test-token";

      expect(() => initializeConfig()).toThrow("Invalid environment configuration");
    });

    it("should throw error for empty KONG_JWT_AUDIENCE", () => {
      Bun.env.KONG_JWT_AUTHORITY = "test-authority";
      Bun.env.KONG_JWT_AUDIENCE = "";
      Bun.env.KONG_ADMIN_URL = "https://kong.example.com";
      Bun.env.KONG_ADMIN_TOKEN = "test-token";

      expect(() => initializeConfig()).toThrow("Invalid environment configuration");
    });

    it("should throw error for invalid PORT (out of range)", () => {
      Bun.env.KONG_JWT_AUTHORITY = "test-authority";
      Bun.env.KONG_JWT_AUDIENCE = "test-audience";
      Bun.env.KONG_ADMIN_URL = "https://kong.example.com";
      Bun.env.KONG_ADMIN_TOKEN = "test-token";
      Bun.env.PORT = "70000";

      expect(() => initializeConfig()).toThrow("Invalid environment configuration");
    });

    it("should throw error for invalid PORT (negative)", () => {
      Bun.env.KONG_JWT_AUTHORITY = "test-authority";
      Bun.env.KONG_JWT_AUDIENCE = "test-audience";
      Bun.env.KONG_ADMIN_URL = "https://kong.example.com";
      Bun.env.KONG_ADMIN_TOKEN = "test-token";
      Bun.env.PORT = "-1";

      expect(() => initializeConfig()).toThrow("Invalid environment configuration");
    });

    it("should accept HTTP URLs in non-production environments", () => {
      Bun.env.KONG_JWT_AUTHORITY = "test-authority";
      Bun.env.KONG_JWT_AUDIENCE = "test-audience";
      Bun.env.KONG_ADMIN_URL = "http://kong.example.com";
      Bun.env.KONG_ADMIN_TOKEN = "test-token";
      Bun.env.NODE_ENV = "development";

      const config = initializeConfig();

      expect(config.kong.adminUrl).toBe("http://kong.example.com");
    });

    it("should throw error for invalid NODE_ENV", () => {
      Bun.env.KONG_JWT_AUTHORITY = "test-authority";
      Bun.env.KONG_JWT_AUDIENCE = "test-audience";
      Bun.env.KONG_ADMIN_URL = "https://kong.example.com";
      Bun.env.KONG_ADMIN_TOKEN = "test-token";
      Bun.env.NODE_ENV = "invalid-env";

      expect(() => initializeConfig()).toThrow("Invalid environment configuration");
    });

    it("should throw error for invalid KONG_MODE", () => {
      Bun.env.KONG_JWT_AUTHORITY = "test-authority";
      Bun.env.KONG_JWT_AUDIENCE = "test-audience";
      Bun.env.KONG_ADMIN_URL = "https://kong.example.com";
      Bun.env.KONG_ADMIN_TOKEN = "test-token";
      Bun.env.KONG_MODE = "INVALID_MODE";

      expect(() => initializeConfig()).toThrow("Invalid environment configuration");
    });

    it("should throw error for invalid TELEMETRY_MODE", () => {
      Bun.env.KONG_JWT_AUTHORITY = "test-authority";
      Bun.env.KONG_JWT_AUDIENCE = "test-audience";
      Bun.env.KONG_ADMIN_URL = "https://kong.example.com";
      Bun.env.KONG_ADMIN_TOKEN = "test-token";
      Bun.env.TELEMETRY_MODE = "invalid-mode";

      expect(() => initializeConfig()).toThrow("Invalid environment configuration");
    });

    it("should throw error for invalid JWT_EXPIRATION_MINUTES (too high)", () => {
      Bun.env.KONG_JWT_AUTHORITY = "test-authority";
      Bun.env.KONG_JWT_AUDIENCE = "test-audience";
      Bun.env.KONG_ADMIN_URL = "https://kong.example.com";
      Bun.env.KONG_ADMIN_TOKEN = "test-token";
      Bun.env.JWT_EXPIRATION_MINUTES = "100";

      expect(() => initializeConfig()).toThrow("Invalid environment configuration");
    });

    it("should throw error for invalid JWT_EXPIRATION_MINUTES (too low)", () => {
      Bun.env.KONG_JWT_AUTHORITY = "test-authority";
      Bun.env.KONG_JWT_AUDIENCE = "test-audience";
      Bun.env.KONG_ADMIN_URL = "https://kong.example.com";
      Bun.env.KONG_ADMIN_TOKEN = "test-token";
      Bun.env.JWT_EXPIRATION_MINUTES = "0";

      expect(() => initializeConfig()).toThrow("Invalid environment configuration");
    });

    it("should throw error for invalid CIRCUIT_BREAKER_TIMEOUT (too low)", () => {
      Bun.env.KONG_JWT_AUTHORITY = "test-authority";
      Bun.env.KONG_JWT_AUDIENCE = "test-audience";
      Bun.env.KONG_ADMIN_URL = "https://kong.example.com";
      Bun.env.KONG_ADMIN_TOKEN = "test-token";
      Bun.env.CIRCUIT_BREAKER_TIMEOUT = "50";

      expect(() => initializeConfig()).toThrow("Invalid environment configuration");
    });

    it("should throw error for invalid CIRCUIT_BREAKER_TIMEOUT (too high)", () => {
      Bun.env.KONG_JWT_AUTHORITY = "test-authority";
      Bun.env.KONG_JWT_AUDIENCE = "test-audience";
      Bun.env.KONG_ADMIN_URL = "https://kong.example.com";
      Bun.env.KONG_ADMIN_TOKEN = "test-token";
      Bun.env.CIRCUIT_BREAKER_TIMEOUT = "20000";

      expect(() => initializeConfig()).toThrow("Invalid environment configuration");
    });

    it("should throw error for invalid REDIS_DB (too high)", () => {
      Bun.env.KONG_JWT_AUTHORITY = "test-authority";
      Bun.env.KONG_JWT_AUDIENCE = "test-audience";
      Bun.env.KONG_ADMIN_URL = "https://kong.example.com";
      Bun.env.KONG_ADMIN_TOKEN = "test-token";
      Bun.env.REDIS_DB = "20";

      expect(() => initializeConfig()).toThrow("Invalid environment configuration");
    });

    it("should throw error for invalid REDIS_DB (negative)", () => {
      Bun.env.KONG_JWT_AUTHORITY = "test-authority";
      Bun.env.KONG_JWT_AUDIENCE = "test-audience";
      Bun.env.KONG_ADMIN_URL = "https://kong.example.com";
      Bun.env.KONG_ADMIN_TOKEN = "test-token";
      Bun.env.REDIS_DB = "-1";

      expect(() => initializeConfig()).toThrow("Invalid environment configuration");
    });

    it("should successfully load config with minimal required environment variables", () => {
      Bun.env.KONG_JWT_AUTHORITY = "test-authority";
      Bun.env.KONG_JWT_AUDIENCE = "test-audience";
      Bun.env.KONG_ADMIN_URL = "https://kong.example.com";
      Bun.env.KONG_ADMIN_TOKEN = "test-token";

      const config = initializeConfig();

      expect(config).toBeDefined();
      expect(config.jwt.authority).toBe("test-authority");
      expect(config.jwt.audience).toBe("test-audience");
      expect(config.kong.adminUrl).toBe("https://kong.example.com");
    });

    it("should successfully load config in API_GATEWAY mode without KONG_ADMIN_TOKEN", () => {
      Bun.env.KONG_JWT_AUTHORITY = "test-authority";
      Bun.env.KONG_JWT_AUDIENCE = "test-audience";
      Bun.env.KONG_ADMIN_URL = "https://kong.example.com";
      Bun.env.KONG_MODE = "API_GATEWAY";
      Bun.env.KONG_ADMIN_TOKEN = "";

      const config = initializeConfig();

      expect(config).toBeDefined();
      expect(config.kong.mode).toBe("API_GATEWAY");
    });

    it("should apply default values when optional environment variables are missing", () => {
      Bun.env.KONG_JWT_AUTHORITY = "test-authority";
      Bun.env.KONG_JWT_AUDIENCE = "test-audience";
      Bun.env.KONG_ADMIN_URL = "https://kong.example.com";
      Bun.env.KONG_ADMIN_TOKEN = "test-token";
      delete Bun.env.PORT;
      delete Bun.env.NODE_ENV;

      const config = initializeConfig();

      expect(config.server.port).toBeDefined();
      expect(config.server.nodeEnv).toBeDefined();
    });

    it("should derive OTLP endpoints from base endpoint", () => {
      Bun.env.KONG_JWT_AUTHORITY = "test-authority";
      Bun.env.KONG_JWT_AUDIENCE = "test-audience";
      Bun.env.KONG_ADMIN_URL = "https://kong.example.com";
      Bun.env.KONG_ADMIN_TOKEN = "test-token";
      Bun.env.OTEL_EXPORTER_OTLP_ENDPOINT = "https://otel.example.com";

      const config = initializeConfig();

      expect(config.telemetry.logsEndpoint).toContain("/v1/logs");
      expect(config.telemetry.tracesEndpoint).toContain("/v1/traces");
      expect(config.telemetry.metricsEndpoint).toContain("/v1/metrics");
    });

    it("should use explicit OTLP endpoints when provided", () => {
      Bun.env.KONG_JWT_AUTHORITY = "test-authority";
      Bun.env.KONG_JWT_AUDIENCE = "test-audience";
      Bun.env.KONG_ADMIN_URL = "https://kong.example.com";
      Bun.env.KONG_ADMIN_TOKEN = "test-token";
      Bun.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT = "https://logs.example.com/custom";
      Bun.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT = "https://traces.example.com/custom";
      Bun.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT = "https://metrics.example.com/custom";

      const config = initializeConfig();

      expect(config.telemetry.logsEndpoint).toBe("https://logs.example.com/custom");
      expect(config.telemetry.tracesEndpoint).toBe("https://traces.example.com/custom");
      expect(config.telemetry.metricsEndpoint).toBe("https://metrics.example.com/custom");
    });

    it("should handle HIGH_AVAILABILITY flag correctly", () => {
      Bun.env.KONG_JWT_AUTHORITY = "test-authority";
      Bun.env.KONG_JWT_AUDIENCE = "test-audience";
      Bun.env.KONG_ADMIN_URL = "https://kong.example.com";
      Bun.env.KONG_ADMIN_TOKEN = "test-token";
      Bun.env.HIGH_AVAILABILITY = "true";

      const config = initializeConfig();

      expect(config.caching.highAvailability).toBe(true);
    });

    it("should fallback issuer to authority when not provided", () => {
      Bun.env.KONG_JWT_AUTHORITY = "test-authority";
      Bun.env.KONG_JWT_AUDIENCE = "test-audience";
      Bun.env.KONG_ADMIN_URL = "https://kong.example.com";
      Bun.env.KONG_ADMIN_TOKEN = "test-token";
      delete Bun.env.KONG_JWT_ISSUER;

      const config = initializeConfig();

      expect(config.jwt.issuer).toBe(config.jwt.authority);
    });

    it("should use explicit issuer when provided", () => {
      Bun.env.KONG_JWT_AUTHORITY = "test-authority";
      Bun.env.KONG_JWT_AUDIENCE = "test-audience";
      Bun.env.KONG_ADMIN_URL = "https://kong.example.com";
      Bun.env.KONG_ADMIN_TOKEN = "test-token";
      Bun.env.KONG_JWT_ISSUER = "custom-issuer";

      const config = initializeConfig();

      expect(config.jwt.issuer).toBe("custom-issuer");
    });
  });
});
