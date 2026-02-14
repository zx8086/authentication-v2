import { describe, expect, it } from "bun:test";
import {
  CachingConfigSchema,
  KongConfigSchema,
  ServerConfigSchema,
  TelemetryConfigSchema,
} from "../../../src/config/schemas";

describe("Schema Validation - New Configuration Properties", () => {
  describe("Kong Configuration - secretCreationMaxRetries", () => {
    const baseKongConfig = {
      mode: "API_GATEWAY" as const,
      adminUrl: "http://localhost:8001",
      adminToken: "",
      consumerIdHeader: "X-Consumer-ID",
      consumerUsernameHeader: "X-Consumer-Username",
      anonymousHeader: "X-Anonymous-Consumer",
      circuitBreaker: {
        enabled: true,
        timeout: 1000,
        errorThresholdPercentage: 50,
        resetTimeout: 30000,
        rollingCountTimeout: 10000,
        rollingCountBuckets: 10,
        volumeThreshold: 5,
      },
      maxHeaderLength: 256,
    };

    it("should accept valid secretCreationMaxRetries value", () => {
      const config = { ...baseKongConfig, secretCreationMaxRetries: 3 };
      const result = KongConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it("should reject secretCreationMaxRetries below minimum (1)", () => {
      const config = { ...baseKongConfig, secretCreationMaxRetries: 0 };
      const result = KongConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it("should reject secretCreationMaxRetries above maximum (10)", () => {
      const config = { ...baseKongConfig, secretCreationMaxRetries: 11 };
      const result = KongConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it("should reject non-integer secretCreationMaxRetries", () => {
      const config = { ...baseKongConfig, secretCreationMaxRetries: 3.5 };
      const result = KongConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });
  });

  describe("Kong Configuration - maxHeaderLength", () => {
    const baseKongConfig = {
      mode: "API_GATEWAY" as const,
      adminUrl: "http://localhost:8001",
      adminToken: "",
      consumerIdHeader: "X-Consumer-ID",
      consumerUsernameHeader: "X-Consumer-Username",
      anonymousHeader: "X-Anonymous-Consumer",
      circuitBreaker: {
        enabled: true,
        timeout: 1000,
        errorThresholdPercentage: 50,
        resetTimeout: 30000,
        rollingCountTimeout: 10000,
        rollingCountBuckets: 10,
        volumeThreshold: 5,
      },
      secretCreationMaxRetries: 3,
    };

    it("should accept valid maxHeaderLength value", () => {
      const config = { ...baseKongConfig, maxHeaderLength: 256 };
      const result = KongConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it("should reject maxHeaderLength below minimum (64)", () => {
      const config = { ...baseKongConfig, maxHeaderLength: 32 };
      const result = KongConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it("should reject maxHeaderLength above maximum (8192)", () => {
      const config = { ...baseKongConfig, maxHeaderLength: 10000 };
      const result = KongConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });
  });

  describe("Server Configuration - maxRequestBodySize", () => {
    const baseServerConfig = {
      port: 3000,
      nodeEnv: "test",
      requestTimeoutMs: 30000,
    };

    it("should accept valid maxRequestBodySize value", () => {
      const config = { ...baseServerConfig, maxRequestBodySize: 10 * 1024 * 1024 };
      const result = ServerConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it("should reject maxRequestBodySize below minimum (1024)", () => {
      const config = { ...baseServerConfig, maxRequestBodySize: 512 };
      const result = ServerConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it("should reject maxRequestBodySize above maximum (100MB)", () => {
      const config = { ...baseServerConfig, maxRequestBodySize: 200 * 1024 * 1024 };
      const result = ServerConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });
  });

  describe("Server Configuration - requestTimeoutMs", () => {
    const baseServerConfig = {
      port: 3000,
      nodeEnv: "test",
      maxRequestBodySize: 10 * 1024 * 1024,
    };

    it("should accept valid requestTimeoutMs value", () => {
      const config = { ...baseServerConfig, requestTimeoutMs: 30000 };
      const result = ServerConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it("should reject requestTimeoutMs below minimum (1000)", () => {
      const config = { ...baseServerConfig, requestTimeoutMs: 500 };
      const result = ServerConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it("should reject requestTimeoutMs above maximum (300000)", () => {
      const config = { ...baseServerConfig, requestTimeoutMs: 400000 };
      const result = ServerConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });
  });

  describe("Caching Configuration - healthCheckTtlMs", () => {
    const baseCachingConfig = {
      highAvailability: false,
      redisDb: 0,
      ttlSeconds: 300,
      staleDataToleranceMinutes: 60,
      redisMaxRetries: 3,
      redisConnectionTimeout: 5000,
    };

    it("should accept valid healthCheckTtlMs value", () => {
      const config = { ...baseCachingConfig, healthCheckTtlMs: 2000 };
      const result = CachingConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it("should reject healthCheckTtlMs below minimum (100)", () => {
      const config = { ...baseCachingConfig, healthCheckTtlMs: 50 };
      const result = CachingConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it("should reject healthCheckTtlMs above maximum (60000)", () => {
      const config = { ...baseCachingConfig, healthCheckTtlMs: 70000 };
      const result = CachingConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });
  });

  describe("Caching Configuration - redisMaxRetries", () => {
    const baseCachingConfig = {
      highAvailability: false,
      redisDb: 0,
      ttlSeconds: 300,
      staleDataToleranceMinutes: 60,
      healthCheckTtlMs: 2000,
      redisConnectionTimeout: 5000,
    };

    it("should accept valid redisMaxRetries value", () => {
      const config = { ...baseCachingConfig, redisMaxRetries: 3 };
      const result = CachingConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it("should reject redisMaxRetries below minimum (1)", () => {
      const config = { ...baseCachingConfig, redisMaxRetries: 0 };
      const result = CachingConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it("should reject redisMaxRetries above maximum (10)", () => {
      const config = { ...baseCachingConfig, redisMaxRetries: 15 };
      const result = CachingConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });
  });

  describe("Caching Configuration - redisConnectionTimeout", () => {
    const baseCachingConfig = {
      highAvailability: false,
      redisDb: 0,
      ttlSeconds: 300,
      staleDataToleranceMinutes: 60,
      healthCheckTtlMs: 2000,
      redisMaxRetries: 3,
    };

    it("should accept valid redisConnectionTimeout value", () => {
      const config = { ...baseCachingConfig, redisConnectionTimeout: 5000 };
      const result = CachingConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it("should reject redisConnectionTimeout below minimum (1000)", () => {
      const config = { ...baseCachingConfig, redisConnectionTimeout: 500 };
      const result = CachingConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it("should reject redisConnectionTimeout above maximum (30000)", () => {
      const config = { ...baseCachingConfig, redisConnectionTimeout: 40000 };
      const result = CachingConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });
  });

  describe("Telemetry Circuit Breaker Configuration", () => {
    const baseTelemetryConfig = {
      serviceName: "test-service",
      serviceVersion: "1.0.0",
      environment: "test" as const,
      mode: "console" as const,
      logLevel: "info" as const,
      exportTimeout: 5000,
      batchSize: 100,
      maxQueueSize: 1000,
      infrastructure: {
        isKubernetes: false,
        isEcs: false,
      },
    };

    it("should accept valid circuit breaker configuration", () => {
      const config = {
        ...baseTelemetryConfig,
        circuitBreaker: {
          failureThreshold: 5,
          recoveryTimeout: 30000,
          successThreshold: 3,
          monitoringInterval: 5000,
        },
      };
      const result = TelemetryConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it("should reject failureThreshold below minimum (1)", () => {
      const config = {
        ...baseTelemetryConfig,
        circuitBreaker: {
          failureThreshold: 0,
          recoveryTimeout: 30000,
          successThreshold: 3,
          monitoringInterval: 5000,
        },
      };
      const result = TelemetryConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it("should reject recoveryTimeout below minimum (1000)", () => {
      const config = {
        ...baseTelemetryConfig,
        circuitBreaker: {
          failureThreshold: 5,
          recoveryTimeout: 500,
          successThreshold: 3,
          monitoringInterval: 5000,
        },
      };
      const result = TelemetryConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it("should reject successThreshold above maximum (20)", () => {
      const config = {
        ...baseTelemetryConfig,
        circuitBreaker: {
          failureThreshold: 5,
          recoveryTimeout: 30000,
          successThreshold: 25,
          monitoringInterval: 5000,
        },
      };
      const result = TelemetryConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it("should reject monitoringInterval above maximum (60000)", () => {
      const config = {
        ...baseTelemetryConfig,
        circuitBreaker: {
          failureThreshold: 5,
          recoveryTimeout: 30000,
          successThreshold: 3,
          monitoringInterval: 70000,
        },
      };
      const result = TelemetryConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });
  });

  describe("Invalid Type Handling", () => {
    it("should reject string instead of number for secretCreationMaxRetries", () => {
      const config = {
        mode: "API_GATEWAY",
        adminUrl: "http://localhost:8001",
        adminToken: "",
        consumerIdHeader: "X-Consumer-ID",
        consumerUsernameHeader: "X-Consumer-Username",
        anonymousHeader: "X-Anonymous-Consumer",
        circuitBreaker: {
          enabled: true,
          timeout: 1000,
          errorThresholdPercentage: 50,
          resetTimeout: 30000,
          rollingCountTimeout: 10000,
          rollingCountBuckets: 10,
          volumeThreshold: 5,
        },
        secretCreationMaxRetries: "three",
        maxHeaderLength: 256,
      };
      const result = KongConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it("should reject string instead of number for healthCheckTtlMs", () => {
      const config = {
        highAvailability: false,
        redisDb: 0,
        ttlSeconds: 300,
        staleDataToleranceMinutes: 60,
        healthCheckTtlMs: "2000ms",
        redisMaxRetries: 3,
        redisConnectionTimeout: 5000,
      };
      const result = CachingConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });
  });
});
