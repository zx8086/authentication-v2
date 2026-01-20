/* test/bun/defaults.test.ts */

/**
 * Unit tests for default configuration values
 * Tests the default configuration object to ensure all defaults are correct
 */

import { describe, expect, it } from "bun:test";
import { defaultConfig } from "../../../src/config/defaults";

describe("Default Configuration", () => {
  describe("server defaults", () => {
    it("should have correct default port", () => {
      expect(defaultConfig.server.port).toBe(3000);
      expect(typeof defaultConfig.server.port).toBe("number");
    });

    it("should have correct default nodeEnv", () => {
      expect(defaultConfig.server.nodeEnv).toBe("development");
      expect(typeof defaultConfig.server.nodeEnv).toBe("string");
    });
  });

  describe("jwt defaults", () => {
    it("should have correct default authority", () => {
      expect(defaultConfig.jwt.authority).toBe("https://api.example.com");
      expect(typeof defaultConfig.jwt.authority).toBe("string");
    });

    it("should have correct default audience", () => {
      expect(defaultConfig.jwt.audience).toBe("example-api");
      expect(typeof defaultConfig.jwt.audience).toBe("string");
    });

    it("should have correct default issuer", () => {
      expect(defaultConfig.jwt.issuer).toBe("https://api.example.com");
      expect(typeof defaultConfig.jwt.issuer).toBe("string");
    });

    it("should have correct default keyClaimName", () => {
      expect(defaultConfig.jwt.keyClaimName).toBe("key");
      expect(typeof defaultConfig.jwt.keyClaimName).toBe("string");
    });

    it("should have correct default expirationMinutes", () => {
      expect(defaultConfig.jwt.expirationMinutes).toBe(15);
      expect(typeof defaultConfig.jwt.expirationMinutes).toBe("number");
      expect(defaultConfig.jwt.expirationMinutes).toBeGreaterThan(0);
    });
  });

  describe("kong defaults", () => {
    it("should have correct default mode", () => {
      expect(defaultConfig.kong.mode).toBe("API_GATEWAY");
      expect(typeof defaultConfig.kong.mode).toBe("string");
    });

    it("should have correct default adminUrl", () => {
      expect(defaultConfig.kong.adminUrl).toBe("http://localhost:8001");
      expect(typeof defaultConfig.kong.adminUrl).toBe("string");
    });

    it("should have correct default adminToken", () => {
      expect(defaultConfig.kong.adminToken).toBe("example-token");
      expect(typeof defaultConfig.kong.adminToken).toBe("string");
    });

    it("should have correct default consumerIdHeader", () => {
      expect(defaultConfig.kong.consumerIdHeader).toBe("x-consumer-id");
      expect(typeof defaultConfig.kong.consumerIdHeader).toBe("string");
    });

    it("should have correct default consumerUsernameHeader", () => {
      expect(defaultConfig.kong.consumerUsernameHeader).toBe("x-consumer-username");
      expect(typeof defaultConfig.kong.consumerUsernameHeader).toBe("string");
    });

    it("should have correct default anonymousHeader", () => {
      expect(defaultConfig.kong.anonymousHeader).toBe("x-anonymous-consumer");
      expect(typeof defaultConfig.kong.anonymousHeader).toBe("string");
    });

    describe("circuitBreaker defaults", () => {
      it("should have correct default enabled", () => {
        expect(defaultConfig.kong.circuitBreaker.enabled).toBe(true);
        expect(typeof defaultConfig.kong.circuitBreaker.enabled).toBe("boolean");
      });

      it("should have correct default timeout", () => {
        expect(defaultConfig.kong.circuitBreaker.timeout).toBe(5000);
        expect(typeof defaultConfig.kong.circuitBreaker.timeout).toBe("number");
        expect(defaultConfig.kong.circuitBreaker.timeout).toBeGreaterThan(0);
      });

      it("should have correct default errorThresholdPercentage", () => {
        expect(defaultConfig.kong.circuitBreaker.errorThresholdPercentage).toBe(50);
        expect(typeof defaultConfig.kong.circuitBreaker.errorThresholdPercentage).toBe("number");
        expect(defaultConfig.kong.circuitBreaker.errorThresholdPercentage).toBeGreaterThan(0);
        expect(defaultConfig.kong.circuitBreaker.errorThresholdPercentage).toBeLessThanOrEqual(100);
      });

      it("should have correct default resetTimeout", () => {
        expect(defaultConfig.kong.circuitBreaker.resetTimeout).toBe(60000);
        expect(typeof defaultConfig.kong.circuitBreaker.resetTimeout).toBe("number");
        expect(defaultConfig.kong.circuitBreaker.resetTimeout).toBeGreaterThan(0);
      });

      it("should have correct default rollingCountTimeout", () => {
        expect(defaultConfig.kong.circuitBreaker.rollingCountTimeout).toBe(10000);
        expect(typeof defaultConfig.kong.circuitBreaker.rollingCountTimeout).toBe("number");
      });

      it("should have correct default rollingCountBuckets", () => {
        expect(defaultConfig.kong.circuitBreaker.rollingCountBuckets).toBe(10);
        expect(typeof defaultConfig.kong.circuitBreaker.rollingCountBuckets).toBe("number");
        expect(defaultConfig.kong.circuitBreaker.rollingCountBuckets).toBeGreaterThan(0);
      });

      it("should have correct default volumeThreshold", () => {
        expect(defaultConfig.kong.circuitBreaker.volumeThreshold).toBe(3);
        expect(typeof defaultConfig.kong.circuitBreaker.volumeThreshold).toBe("number");
        expect(defaultConfig.kong.circuitBreaker.volumeThreshold).toBeGreaterThan(0);
      });
    });
  });

  describe("caching defaults", () => {
    it("should have correct default highAvailability", () => {
      expect(defaultConfig.caching.highAvailability).toBe(false);
      expect(typeof defaultConfig.caching.highAvailability).toBe("boolean");
    });

    it("should have correct default redisUrl", () => {
      expect(defaultConfig.caching.redisUrl).toBe("");
      expect(typeof defaultConfig.caching.redisUrl).toBe("string");
    });

    it("should have correct default redisPassword", () => {
      expect(defaultConfig.caching.redisPassword).toBe("");
      expect(typeof defaultConfig.caching.redisPassword).toBe("string");
    });

    it("should have correct default redisDb", () => {
      expect(defaultConfig.caching.redisDb).toBe(0);
      expect(typeof defaultConfig.caching.redisDb).toBe("number");
      expect(defaultConfig.caching.redisDb).toBeGreaterThanOrEqual(0);
    });

    it("should have correct default ttlSeconds", () => {
      expect(defaultConfig.caching.ttlSeconds).toBe(300);
      expect(typeof defaultConfig.caching.ttlSeconds).toBe("number");
      expect(defaultConfig.caching.ttlSeconds).toBeGreaterThan(0);
    });

    it("should have correct default staleDataToleranceMinutes", () => {
      expect(defaultConfig.caching.staleDataToleranceMinutes).toBe(30);
      expect(typeof defaultConfig.caching.staleDataToleranceMinutes).toBe("number");
      expect(defaultConfig.caching.staleDataToleranceMinutes).toBeGreaterThan(0);
    });
  });

  describe("telemetry defaults", () => {
    it("should have correct default serviceName", () => {
      expect(defaultConfig.telemetry.serviceName).toBe("authentication-service");
      expect(typeof defaultConfig.telemetry.serviceName).toBe("string");
    });

    it("should have correct default serviceVersion", () => {
      expect(defaultConfig.telemetry.serviceVersion).toBe("1.0.0");
      expect(typeof defaultConfig.telemetry.serviceVersion).toBe("string");
    });

    it("should have correct default environment", () => {
      expect(defaultConfig.telemetry.environment).toBe("development");
      expect(typeof defaultConfig.telemetry.environment).toBe("string");
    });

    it("should have correct default mode", () => {
      expect(defaultConfig.telemetry.mode).toBe("both");
      expect(typeof defaultConfig.telemetry.mode).toBe("string");
    });

    it("should have correct default logLevel", () => {
      expect(defaultConfig.telemetry.logLevel).toBe("info");
      expect(typeof defaultConfig.telemetry.logLevel).toBe("string");
    });

    it("should have correct default logsEndpoint", () => {
      expect(defaultConfig.telemetry.logsEndpoint).toBe("");
      expect(typeof defaultConfig.telemetry.logsEndpoint).toBe("string");
    });

    it("should have correct default tracesEndpoint", () => {
      expect(defaultConfig.telemetry.tracesEndpoint).toBe("");
      expect(typeof defaultConfig.telemetry.tracesEndpoint).toBe("string");
    });

    it("should have correct default metricsEndpoint", () => {
      expect(defaultConfig.telemetry.metricsEndpoint).toBe("");
      expect(typeof defaultConfig.telemetry.metricsEndpoint).toBe("string");
    });

    it("should have correct default exportTimeout", () => {
      expect(defaultConfig.telemetry.exportTimeout).toBe(30000);
      expect(typeof defaultConfig.telemetry.exportTimeout).toBe("number");
      expect(defaultConfig.telemetry.exportTimeout).toBeGreaterThan(0);
    });

    it("should have correct default batchSize", () => {
      expect(defaultConfig.telemetry.batchSize).toBe(2048);
      expect(typeof defaultConfig.telemetry.batchSize).toBe("number");
      expect(defaultConfig.telemetry.batchSize).toBeGreaterThan(0);
    });

    it("should have correct default maxQueueSize", () => {
      expect(defaultConfig.telemetry.maxQueueSize).toBe(10000);
      expect(typeof defaultConfig.telemetry.maxQueueSize).toBe("number");
      expect(defaultConfig.telemetry.maxQueueSize).toBeGreaterThan(0);
    });

    it("should have correct default enableOpenTelemetry", () => {
      expect(defaultConfig.telemetry.enableOpenTelemetry).toBe(true);
      expect(typeof defaultConfig.telemetry.enableOpenTelemetry).toBe("boolean");
    });

    it("should have correct default enabled", () => {
      expect(defaultConfig.telemetry.enabled).toBe(true);
      expect(typeof defaultConfig.telemetry.enabled).toBe("boolean");
    });

    describe("infrastructure defaults", () => {
      it("should have correct default isKubernetes", () => {
        expect(defaultConfig.telemetry.infrastructure.isKubernetes).toBe(false);
        expect(typeof defaultConfig.telemetry.infrastructure.isKubernetes).toBe("boolean");
      });

      it("should have correct default isEcs", () => {
        expect(defaultConfig.telemetry.infrastructure.isEcs).toBe(false);
        expect(typeof defaultConfig.telemetry.infrastructure.isEcs).toBe("boolean");
      });

      it("should have correct default podName", () => {
        expect(defaultConfig.telemetry.infrastructure.podName).toBeUndefined();
      });

      it("should have correct default namespace", () => {
        expect(defaultConfig.telemetry.infrastructure.namespace).toBeUndefined();
      });
    });
  });

  describe("profiling defaults", () => {
    it("should have correct default enabled", () => {
      expect(defaultConfig.profiling.enabled).toBe(false);
      expect(typeof defaultConfig.profiling.enabled).toBe("boolean");
    });
  });

  describe("apiInfo defaults", () => {
    it("should have correct default title", () => {
      expect(defaultConfig.apiInfo.title).toBe("Authentication Service API");
      expect(typeof defaultConfig.apiInfo.title).toBe("string");
    });

    it("should have correct default description", () => {
      expect(defaultConfig.apiInfo.description).toContain("authentication service");
      expect(typeof defaultConfig.apiInfo.description).toBe("string");
      expect(defaultConfig.apiInfo.description.length).toBeGreaterThan(0);
    });

    it("should have correct default version", () => {
      expect(defaultConfig.apiInfo.version).toBe("1.0.0");
      expect(typeof defaultConfig.apiInfo.version).toBe("string");
    });

    it("should have correct default contactName", () => {
      expect(defaultConfig.apiInfo.contactName).toBe("Simon Owusu");
      expect(typeof defaultConfig.apiInfo.contactName).toBe("string");
    });

    it("should have correct default contactEmail", () => {
      expect(defaultConfig.apiInfo.contactEmail).toBe("simonowusu@pvh.com");
      expect(typeof defaultConfig.apiInfo.contactEmail).toBe("string");
      expect(defaultConfig.apiInfo.contactEmail).toContain("@");
    });

    it("should have correct default licenseName", () => {
      expect(defaultConfig.apiInfo.licenseName).toBe("Proprietary");
      expect(typeof defaultConfig.apiInfo.licenseName).toBe("string");
    });

    it("should have correct default licenseIdentifier", () => {
      expect(defaultConfig.apiInfo.licenseIdentifier).toBe("UNLICENSED");
      expect(typeof defaultConfig.apiInfo.licenseIdentifier).toBe("string");
    });

    it("should have correct default cors", () => {
      expect(defaultConfig.apiInfo.cors).toBe("*");
      expect(typeof defaultConfig.apiInfo.cors).toBe("string");
    });
  });

  describe("configuration structure", () => {
    it("should have all required top-level sections", () => {
      expect(defaultConfig.server).toBeDefined();
      expect(defaultConfig.jwt).toBeDefined();
      expect(defaultConfig.kong).toBeDefined();
      expect(defaultConfig.caching).toBeDefined();
      expect(defaultConfig.telemetry).toBeDefined();
      expect(defaultConfig.profiling).toBeDefined();
      expect(defaultConfig.apiInfo).toBeDefined();
    });

    it("should have correct number of top-level sections", () => {
      const sections = Object.keys(defaultConfig);
      expect(sections.length).toBe(7);
      expect(sections).toContain("server");
      expect(sections).toContain("jwt");
      expect(sections).toContain("kong");
      expect(sections).toContain("caching");
      expect(sections).toContain("telemetry");
      expect(sections).toContain("profiling");
      expect(sections).toContain("apiInfo");
    });

    it("should have object types for all sections", () => {
      expect(typeof defaultConfig.server).toBe("object");
      expect(typeof defaultConfig.jwt).toBe("object");
      expect(typeof defaultConfig.kong).toBe("object");
      expect(typeof defaultConfig.caching).toBe("object");
      expect(typeof defaultConfig.telemetry).toBe("object");
      expect(typeof defaultConfig.profiling).toBe("object");
      expect(typeof defaultConfig.apiInfo).toBe("object");
    });
  });
});
