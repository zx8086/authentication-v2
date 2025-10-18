/* test/bun/type-validation.test.ts */

import { describe, test, expect } from "bun:test";
import type { ConsumerSecret, ServerConfig, JwtConfig, KongConfig, TelemetryConfig } from "../../src/config/schemas";
import { SchemaRegistry } from "../../src/config/schemas";

describe.concurrent("TypeScript Type Validation", () => {
  describe.concurrent("Configuration Schema Types", () => {
    test.concurrent("ServerConfig should have correct properties", () => {
      const validServerConfig: ServerConfig = {
        port: 3000,
        nodeEnv: "test",
        host: "localhost"
      };

      expect(typeof validServerConfig.port).toBe("number");
      expect(typeof validServerConfig.nodeEnv).toBe("string");
      expect(typeof validServerConfig.host).toBe("string");

      // Test optional property
      const minimalServerConfig: ServerConfig = {
        port: 3000,
        nodeEnv: "test"
      };
      expect(typeof minimalServerConfig.port).toBe("number");
      expect(typeof minimalServerConfig.nodeEnv).toBe("string");
      expect(minimalServerConfig.host).toBeUndefined();
    });

    test.concurrent("JwtConfig should have correct properties", () => {
      const validJwtConfig: JwtConfig = {
        authority: "https://auth.example.com",
        audience: "api.example.com",
        issuer: "auth.example.com",
        keyClaimName: "key",
        expirationMinutes: 15
      };

      expect(typeof validJwtConfig.authority).toBe("string");
      expect(typeof validJwtConfig.audience).toBe("string");
      expect(typeof validJwtConfig.issuer).toBe("string");
      expect(typeof validJwtConfig.keyClaimName).toBe("string");
      expect(typeof validJwtConfig.expirationMinutes).toBe("number");
    });

    test.concurrent("KongConfig should have correct union types", () => {
      const apiGatewayConfig: KongConfig = {
        mode: "API_GATEWAY",
        adminUrl: "http://kong:8001",
        adminToken: "test-token"
      };

      const konnectConfig: KongConfig = {
        mode: "KONNECT",
        adminUrl: "https://api.konghq.com",
        adminToken: "konnect-token",
        realm: "default"
      };

      expect(apiGatewayConfig.mode).toBe("API_GATEWAY");
      expect(konnectConfig.mode).toBe("KONNECT");
      expect(typeof konnectConfig.realm).toBe("string");
    });

    test.concurrent("TelemetryConfig should have correct union types", () => {
      const consoleConfig: TelemetryConfig = {
        mode: "console",
        serviceName: "test-service",
        serviceVersion: "1.0.0"
      };

      const otlpConfig: TelemetryConfig = {
        mode: "otlp",
        serviceName: "test-service",
        serviceVersion: "1.0.0",
        endpoint: "http://otel-collector:4317"
      };

      const bothConfig: TelemetryConfig = {
        mode: "both",
        serviceName: "test-service",
        serviceVersion: "1.0.0",
        tracesEndpoint: "http://jaeger:14268",
        metricsEndpoint: "http://prometheus:9090",
        logsEndpoint: "http://loki:3100"
      };

      expect(consoleConfig.mode).toBe("console");
      expect(otlpConfig.mode).toBe("otlp");
      expect(bothConfig.mode).toBe("both");
    });

    test.concurrent("ConsumerSecret should have required string properties", () => {
      const consumerSecret: ConsumerSecret = {
        jwtKey: "test-key",
        jwtSecret: "test-secret",
        algorithm: "HS256",
        consumerId: "test-consumer-id",
        consumerUsername: "test-username"
      };

      expect(typeof consumerSecret.jwtKey).toBe("string");
      expect(typeof consumerSecret.jwtSecret).toBe("string");
      expect(typeof consumerSecret.algorithm).toBe("string");
      expect(typeof consumerSecret.consumerId).toBe("string");
      expect(typeof consumerSecret.consumerUsername).toBe("string");
    });
  });

  describe.concurrent("Schema Registry Validation", () => {
    test.concurrent("SchemaRegistry should have all required schemas", () => {
      expect(SchemaRegistry.Server).toBeDefined();
      expect(SchemaRegistry.Jwt).toBeDefined();
      expect(SchemaRegistry.Kong).toBeDefined();
      expect(SchemaRegistry.Telemetry).toBeDefined();
      expect(SchemaRegistry.ConsumerSecret).toBeDefined();
    });

    test.concurrent("Schema validation should work correctly", () => {
      const validServerData = {
        port: 3000,
        nodeEnv: "test"
      };

      const invalidServerData = {
        port: "invalid",
        nodeEnv: 123
      };

      const validResult = SchemaRegistry.Server.safeParse(validServerData);
      const invalidResult = SchemaRegistry.Server.safeParse(invalidServerData);

      expect(validResult.success).toBe(true);
      expect(invalidResult.success).toBe(false);

      if (validResult.success) {
        expect(validResult.data.port).toBe(3000);
        expect(validResult.data.nodeEnv).toBe("test");
      }
    });
  });

  describe.concurrent("Type Safety and Constraints", () => {
    test.concurrent("Union types should enforce valid values", () => {
      // These should compile without type errors
      const validKongModes: Array<KongConfig["mode"]> = ["API_GATEWAY", "KONNECT"];
      const validTelemetryModes: Array<TelemetryConfig["mode"]> = ["console", "otlp", "both"];

      expect(validKongModes).toContain("API_GATEWAY");
      expect(validKongModes).toContain("KONNECT");
      expect(validTelemetryModes).toContain("console");
      expect(validTelemetryModes).toContain("otlp");
      expect(validTelemetryModes).toContain("both");
    });

    test.concurrent("Optional properties should be handled correctly", () => {
      // Should compile - all required properties provided
      const minimalServerConfig: ServerConfig = {
        port: 3000,
        nodeEnv: "production"
      };

      // Should compile - optional host provided
      const fullServerConfig: ServerConfig = {
        port: 3000,
        nodeEnv: "production",
        host: "0.0.0.0"
      };

      expect(minimalServerConfig.host).toBeUndefined();
      expect(fullServerConfig.host).toBe("0.0.0.0");
    });

    test.concurrent("Async function types should be correctly inferred", async () => {
      const createConsumerSecret = async (): Promise<ConsumerSecret> => {
        return {
          jwtKey: "async-key",
          jwtSecret: "async-secret",
          algorithm: "HS256",
          consumerId: "async-consumer",
          consumerUsername: "async-user"
        };
      };

      const result = await createConsumerSecret();
      expect(typeof result).toBe("object");
      expect(result.jwtKey).toBe("async-key");
      expect(result.algorithm).toBe("HS256");
    });
  });

  describe.concurrent("Interface Compliance", () => {
    test.concurrent("Cache interface should be properly typed", () => {
      interface CacheInterface {
        get(key: string): Promise<ConsumerSecret | null>;
        set(key: string, value: ConsumerSecret, ttl?: number): Promise<void>;
        delete(key: string): Promise<void>;
        clear(): Promise<void>;
        getStats(): Promise<{ strategy: string; hitRate: string }>;
      }

      // Mock implementation for type checking
      const mockCache: CacheInterface = {
        async get(key: string): Promise<ConsumerSecret | null> {
          return key === "exists" ? {
            jwtKey: "mock-key",
            jwtSecret: "mock-secret",
            algorithm: "HS256",
            consumerId: "mock-consumer",
            consumerUsername: "mock-user"
          } : null;
        },
        async set(key: string, value: ConsumerSecret, ttl?: number): Promise<void> {
          // Mock implementation
        },
        async delete(key: string): Promise<void> {
          // Mock implementation
        },
        async clear(): Promise<void> {
          // Mock implementation
        },
        async getStats(): Promise<{ strategy: string; hitRate: string }> {
          return { strategy: "test", hitRate: "100%" };
        }
      };

      expect(typeof mockCache.get).toBe("function");
      expect(typeof mockCache.set).toBe("function");
      expect(typeof mockCache.delete).toBe("function");
      expect(typeof mockCache.clear).toBe("function");
      expect(typeof mockCache.getStats).toBe("function");
    });

    test.concurrent("Configuration types should work with actual schemas", () => {
      const serverConfigData = {
        port: 3000,
        nodeEnv: "test"
      };

      const jwtConfigData = {
        authority: "https://auth.test.com",
        audience: "test-api",
        issuer: "test-issuer",
        keyClaimName: "key",
        expirationMinutes: 15
      };

      const serverResult = SchemaRegistry.Server.safeParse(serverConfigData);
      const jwtResult = SchemaRegistry.Jwt.safeParse(jwtConfigData);

      expect(serverResult.success).toBe(true);
      expect(jwtResult.success).toBe(true);

      if (serverResult.success && jwtResult.success) {
        const serverConfig: ServerConfig = serverResult.data;
        const jwtConfig: JwtConfig = jwtResult.data;

        expect(serverConfig.port).toBe(3000);
        expect(jwtConfig.expirationMinutes).toBe(15);
      }
    });
  });
});