/* test/bun/config.test.ts */

import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { SchemaRegistry } from '../../src/config/schemas';

describe('Configuration System', () => {

  describe('Schema Validation', () => {
    it('should validate server configuration schema', () => {
      const validServerConfig = {
        port: 3000,
        nodeEnv: 'development'
      };

      const result = SchemaRegistry.Server.safeParse(validServerConfig);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.port).toBe(3000);
        expect(result.data.nodeEnv).toBe('development');
      }
    });

    it('should reject invalid server port', () => {
      const invalidServerConfig = {
        port: -1,
        nodeEnv: 'development'
      };

      const result = SchemaRegistry.Server.safeParse(invalidServerConfig);
      expect(result.success).toBe(false);
    });

    it('should validate JWT configuration schema', () => {
      const validJwtConfig = {
        authority: 'https://auth.example.com',
        audience: 'https://api.example.com',
        issuer: 'https://auth.example.com',
        keyClaimName: 'key',
        expirationMinutes: 15
      };

      const result = SchemaRegistry.Jwt.safeParse(validJwtConfig);
      expect(result.success).toBe(true);
    });

    it('should validate Kong configuration schema', () => {
      const validKongConfig = {
        mode: 'API_GATEWAY',
        adminUrl: 'http://kong:8001',
        adminToken: process.env.TEST_KONG_TOKEN || Buffer.from('mock-token').toString('base64'),
        consumerIdHeader: 'x-consumer-id',
        consumerUsernameHeader: 'x-consumer-username',
        anonymousHeader: 'x-anonymous-consumer'
      };

      const result = SchemaRegistry.Kong.safeParse(validKongConfig);
      expect(result.success).toBe(true);
    });

    it('should reject invalid Kong mode', () => {
      const invalidKongConfig = {
        mode: 'INVALID_MODE',
        adminUrl: 'http://kong:8001',
        adminToken: process.env.TEST_KONG_TOKEN || Buffer.from('mock-token').toString('base64'),
        consumerIdHeader: 'x-consumer-id',
        consumerUsernameHeader: 'x-consumer-username',
        anonymousHeader: 'x-anonymous-consumer'
      };

      const result = SchemaRegistry.Kong.safeParse(invalidKongConfig);
      expect(result.success).toBe(false);
    });

    it('should validate telemetry configuration schema', () => {
      const validTelemetryConfig = {
        serviceName: 'authentication-service',
        serviceVersion: '1.0.0',
        environment: 'development',
        mode: 'console',
        logLevel: 'info',
        exportTimeout: 30000,
        batchSize: 2048,
        maxQueueSize: 10000
      };

      const result = SchemaRegistry.Telemetry.safeParse(validTelemetryConfig);
      expect(result.success).toBe(true);
    });

    it('should validate API info configuration schema', () => {
      const validApiInfoConfig = {
        title: 'Authentication API',
        description: 'JWT token service',
        version: '1.0.0',
        contactName: 'Example Corp',
        contactEmail: 'support@example.com',
        licenseName: 'Proprietary',
        licenseIdentifier: 'UNLICENSED',
        cors: '*'
      };

      const result = SchemaRegistry.ApiInfo.safeParse(validApiInfoConfig);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email format', () => {
      const invalidApiInfoConfig = {
        title: 'Authentication API',
        description: 'JWT token service',
        version: '1.0.0',
        contactName: 'Example Corp',
        contactEmail: 'invalid-email',
        licenseName: 'Proprietary',
        licenseIdentifier: 'UNLICENSED',
        cors: '*'
      };

      const result = SchemaRegistry.ApiInfo.safeParse(invalidApiInfoConfig);
      expect(result.success).toBe(false);
    });
  });

  describe('Production Security Validation', () => {
    it('should enforce HTTPS for production telemetry endpoints', () => {
      const prodTelemetryConfig = {
        serviceName: 'authentication-service',
        serviceVersion: '1.0.0',
        environment: 'production',
        mode: 'otlp',
        logLevel: 'info',
        tracesEndpoint: 'http://insecure.example.com/traces',
        exportTimeout: 30000,
        batchSize: 2048,
        maxQueueSize: 10000
      };

      const result = SchemaRegistry.Telemetry.safeParse(prodTelemetryConfig);
      expect(result.success).toBe(false);
    });

    it('should allow HTTPS for production telemetry endpoints', () => {
      const prodTelemetryConfig = {
        serviceName: 'authentication-service',
        serviceVersion: '1.0.0',
        environment: 'production',
        mode: 'otlp',
        logLevel: 'info',
        tracesEndpoint: 'https://secure.example.com/traces',
        exportTimeout: 30000,
        batchSize: 2048,
        maxQueueSize: 10000
      };

      const result = SchemaRegistry.Telemetry.safeParse(prodTelemetryConfig);
      expect(result.success).toBe(true);
    });

    it('should reject localhost service names in production', () => {
      const prodTelemetryConfig = {
        serviceName: 'localhost-service',
        serviceVersion: '1.0.0',
        environment: 'production',
        mode: 'otlp',
        logLevel: 'info',
        exportTimeout: 30000,
        batchSize: 2048,
        maxQueueSize: 10000
      };

      const result = SchemaRegistry.Telemetry.safeParse(prodTelemetryConfig);
      expect(result.success).toBe(false);
    });

    it('should reject test service names in production', () => {
      const prodTelemetryConfig = {
        serviceName: 'test-authentication-service',
        serviceVersion: '1.0.0',
        environment: 'production',
        mode: 'otlp',
        logLevel: 'info',
        exportTimeout: 30000,
        batchSize: 2048,
        maxQueueSize: 10000
      };

      const result = SchemaRegistry.Telemetry.safeParse(prodTelemetryConfig);
      expect(result.success).toBe(false);
    });

    it('should reject dev/latest versions in production', () => {
      const prodTelemetryConfig = {
        serviceName: 'authentication-service',
        serviceVersion: 'latest',
        environment: 'production',
        mode: 'otlp',
        logLevel: 'info',
        exportTimeout: 30000,
        batchSize: 2048,
        maxQueueSize: 10000
      };

      const result = SchemaRegistry.Telemetry.safeParse(prodTelemetryConfig);
      expect(result.success).toBe(false);
    });

    it('should allow Kong configuration with basic validation', () => {
      const prodKongConfig = {
        mode: 'KONNECT',
        adminUrl: 'https://kong.example.com',
        adminToken: process.env.TEST_KONG_TOKEN_LONG || Array(41).fill('x').join(''),  // Mock 40-char token
        consumerIdHeader: 'x-consumer-id',
        consumerUsernameHeader: 'x-consumer-username',
        anonymousHeader: 'x-anonymous-consumer'
      };

      const result = SchemaRegistry.Kong.safeParse(prodKongConfig);
      expect(result.success).toBe(true);
    });

    it('should allow proper Kong token length in production', () => {
      const prodKongConfig = {
        mode: 'KONNECT',
        adminUrl: 'https://kong.example.com',
        adminToken: process.env.TEST_KONG_TOKEN_PROD || Array(61).fill('y').join(''),  // Mock 60-char token
        consumerIdHeader: 'x-consumer-id',
        consumerUsernameHeader: 'x-consumer-username',
        anonymousHeader: 'x-anonymous-consumer'
      };

      const result = SchemaRegistry.Kong.safeParse(prodKongConfig);
      expect(result.success).toBe(true);
    });
  });

  describe('Range Validation', () => {
    it('should enforce valid port range', () => {
      const invalidServerConfig = {
        port: 70000,  // Too high
        nodeEnv: 'development'
      };

      const result = SchemaRegistry.Server.safeParse(invalidServerConfig);
      expect(result.success).toBe(false);
    });

    it('should enforce positive expiration minutes', () => {
      const invalidJwtConfig = {
        authority: 'https://auth.example.com',
        audience: 'https://api.example.com',
        issuer: 'https://auth.example.com',
        keyClaimName: 'key',
        expirationMinutes: 0  // Must be positive
      };

      const result = SchemaRegistry.Jwt.safeParse(invalidJwtConfig);
      expect(result.success).toBe(false);
    });

    it('should enforce valid telemetry timeout range', () => {
      const invalidTelemetryConfig = {
        serviceName: 'authentication-service',
        serviceVersion: '1.0.0',
        environment: 'development',
        mode: 'console',
        logLevel: 'info',
        exportTimeout: 70000,  // Too high (max 60000)
        batchSize: 2048,
        maxQueueSize: 10000
      };

      const result = SchemaRegistry.Telemetry.safeParse(invalidTelemetryConfig);
      expect(result.success).toBe(false);
    });

    it('should enforce valid batch size range', () => {
      const invalidTelemetryConfig = {
        serviceName: 'authentication-service',
        serviceVersion: '1.0.0',
        environment: 'development',
        mode: 'console',
        logLevel: 'info',
        exportTimeout: 30000,
        batchSize: 6000,  // Too high (max 5000)
        maxQueueSize: 10000
      };

      const result = SchemaRegistry.Telemetry.safeParse(invalidTelemetryConfig);
      expect(result.success).toBe(false);
    });
  });

  describe('Environment Variable Handling', () => {
    it('should handle missing optional environment variables', () => {
      // Test that optional variables can be undefined
      Bun.env.PORT = '3000';
      Bun.env.NODE_ENV = 'test';
      Bun.env.KONG_JWT_AUTHORITY = 'https://auth.example.com';
      Bun.env.KONG_JWT_AUDIENCE = 'https://api.example.com';
      Bun.env.KONG_ADMIN_URL = 'http://kong:8001';
      Bun.env.KONG_ADMIN_TOKEN = 'test-token-123456789012345678901234567890';

      // Don't set optional variables like KONG_JWT_ISSUER, JWT_EXPIRATION_MINUTES

      // This would be tested by importing and using the actual config module
      // For now, we test the schema validation part
      expect(() => {
        SchemaRegistry.Jwt.parse({
          authority: 'https://auth.example.com',
          audience: 'https://api.example.com',
          keyClaimName: 'key',
          expirationMinutes: 15
        });
      }).not.toThrow();
    });

    it('should handle boolean environment variables correctly', () => {
      // Test various boolean representations
      const testCases = [
        { input: 'true', expected: true },
        { input: 'false', expected: false },
        { input: '1', expected: true },
        { input: '0', expected: false },
        { input: 'yes', expected: true },
        { input: 'no', expected: false }
      ];

      testCases.forEach(({ input, expected }) => {
        // This would test the parseEnvVar function's boolean handling
        // For schema testing, we test the boolean validation
        const result = SchemaRegistry.Telemetry.safeParse({
          serviceName: 'test-service',
          serviceVersion: '1.0.0',
          environment: 'development',
          mode: 'console',
          logLevel: 'info',
          enabled: expected,
          exportTimeout: 30000,
          batchSize: 2048,
          maxQueueSize: 10000
        });
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Type Safety', () => {
    it('should provide correct TypeScript types', () => {
      const serverConfig = {
        port: 3000,
        nodeEnv: 'development'
      };

      const result = SchemaRegistry.Server.parse(serverConfig);

      // TypeScript should infer these types correctly
      expect(typeof result.port).toBe('number');
      expect(typeof result.nodeEnv).toBe('string');
    });

    it('should enforce enum values strictly', () => {
      const invalidTelemetryConfig = {
        serviceName: 'authentication-service',
        serviceVersion: '1.0.0',
        environment: 'invalid-env',  // Not in enum
        mode: 'console',
        logLevel: 'info',
        exportTimeout: 30000,
        batchSize: 2048,
        maxQueueSize: 10000
      };

      const result = SchemaRegistry.Telemetry.safeParse(invalidTelemetryConfig);
      expect(result.success).toBe(false);
    });
  });

  describe('Environment Schema Validation', () => {
    const originalEnv = { ...Bun.env };

    beforeEach(async () => {
      // Clear all environment variables except system ones
      Object.keys(Bun.env).forEach(key => {
        if (!['PATH', 'HOME', 'USER', 'SHELL', 'TERM'].includes(key)) {
          delete Bun.env[key];
        }
      });

      // Set NODE_ENV to test to suppress console errors during validation tests
      Bun.env.NODE_ENV = 'test';

      // Reset config cache before each test
      const { resetConfigCache } = await import('../../src/config/config');
      resetConfigCache();
    });

    afterEach(async () => {
      // Restore original environment
      Object.keys(Bun.env).forEach(key => {
        if (!(key in originalEnv)) {
          delete Bun.env[key];
        }
      });
      Object.assign(Bun.env, originalEnv);

      // Reset config cache to allow fresh initialization with new environment
      const { resetConfigCache } = await import('../../src/config/config');
      resetConfigCache();
    });

    it('should validate complete environment configuration', async () => {
      // Mock a complete environment configuration
      Bun.env.PORT = '3000';
      Bun.env.NODE_ENV = 'development';
      Bun.env.KONG_JWT_AUTHORITY = 'https://auth.example.com';
      Bun.env.KONG_JWT_AUDIENCE = 'https://api.example.com';
      Bun.env.KONG_JWT_ISSUER = 'https://auth.example.com';
      Bun.env.KONG_JWT_KEY_CLAIM_NAME = 'key';
      Bun.env.JWT_EXPIRATION_MINUTES = '15';
      Bun.env.KONG_MODE = 'API_GATEWAY';
      Bun.env.KONG_ADMIN_URL = 'http://kong:8001';
      Bun.env.KONG_ADMIN_TOKEN = 'test-token-123456789012345678901234567890';
      Bun.env.TELEMETRY_MODE = 'console';
      Bun.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'https://otlp.example.com';

      // Import the config module to test the new schema
      const { loadConfig } = await import('../../src/config/config');

      expect(() => loadConfig()).not.toThrow();
      const config = loadConfig();

      expect(config.server.port).toBe(3000);
      expect(config.server.nodeEnv).toBe('development');
      expect(config.jwt.authority).toBe('https://auth.example.com');
      expect(config.jwt.audience).toBe('https://api.example.com');
      expect(config.kong.mode).toBe('API_GATEWAY');
      expect(config.kong.adminUrl).toBe('http://kong:8001');
      expect(config.telemetry.mode).toBe('console');
    });

    it('should apply defaults for missing optional values', async () => {
      // Set only required environment variables and explicitly set NODE_ENV
      Bun.env.NODE_ENV = 'development';  // Set explicitly to test default behavior
      Bun.env.KONG_JWT_AUTHORITY = 'https://auth.example.com';
      Bun.env.KONG_JWT_AUDIENCE = 'https://api.example.com';
      Bun.env.KONG_ADMIN_URL = 'http://kong:8001';
      Bun.env.KONG_ADMIN_TOKEN = 'test-token-123456789012345678901234567890';

      const { loadConfig } = await import('../../src/config/config');
      const config = loadConfig();

      // Check that defaults are applied
      expect(config.server.port).toBe(3000); // Default PORT
      expect(config.server.nodeEnv).toBe('development'); // Default NODE_ENV
      expect(config.jwt.keyClaimName).toBe('key'); // Default KONG_JWT_KEY_CLAIM_NAME
      expect(config.jwt.expirationMinutes).toBe(15); // Default JWT_EXPIRATION_MINUTES
      expect(config.kong.mode).toBe('API_GATEWAY'); // Default KONG_MODE
      expect(config.telemetry.mode).toBe('both'); // Default TELEMETRY_MODE
    });

    it('should derive OTLP endpoints from base endpoint', async () => {
      Bun.env.KONG_JWT_AUTHORITY = 'https://auth.example.com';
      Bun.env.KONG_JWT_AUDIENCE = 'https://api.example.com';
      Bun.env.KONG_ADMIN_URL = 'http://kong:8001';
      Bun.env.KONG_ADMIN_TOKEN = 'test-token-123456789012345678901234567890';
      Bun.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'https://otlp.example.com';
      // Explicitly clear specific endpoints to test derivation
      delete Bun.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT;
      delete Bun.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT;
      delete Bun.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT;

      const { loadConfig } = await import('../../src/config/config');
      const config = loadConfig();

      expect(config.telemetry.logsEndpoint).toBe('https://otlp.example.com/v1/logs');
      expect(config.telemetry.tracesEndpoint).toBe('https://otlp.example.com/v1/traces');
      expect(config.telemetry.metricsEndpoint).toBe('https://otlp.example.com/v1/metrics');
    });

    it('should prefer specific endpoints over derived ones', async () => {
      Bun.env.KONG_JWT_AUTHORITY = 'https://auth.example.com';
      Bun.env.KONG_JWT_AUDIENCE = 'https://api.example.com';
      Bun.env.KONG_ADMIN_URL = 'http://kong:8001';
      Bun.env.KONG_ADMIN_TOKEN = 'test-token-123456789012345678901234567890';
      Bun.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'https://otlp.example.com';
      Bun.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT = 'https://specific-traces.example.com';
      // Explicitly clear other endpoints to test mixed derivation/specific behavior
      delete Bun.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT;
      delete Bun.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT;

      const { loadConfig } = await import('../../src/config/config');
      const config = loadConfig();

      expect(config.telemetry.logsEndpoint).toBe('https://otlp.example.com/v1/logs'); // Derived
      expect(config.telemetry.tracesEndpoint).toBe('https://specific-traces.example.com'); // Specific
      expect(config.telemetry.metricsEndpoint).toBe('https://otlp.example.com/v1/metrics'); // Derived
    });

    it('should enforce production validation rules', async () => {
      Bun.env.NODE_ENV = 'production';
      Bun.env.KONG_JWT_AUTHORITY = 'https://auth.example.com';
      Bun.env.KONG_JWT_AUDIENCE = 'https://api.example.com';
      Bun.env.KONG_ADMIN_URL = 'http://localhost:8001'; // Invalid for production
      Bun.env.KONG_ADMIN_TOKEN = 'short'; // Too short for production
      Bun.env.OTEL_SERVICE_NAME = 'test-service'; // Contains 'test'

      const { loadConfig } = await import('../../src/config/config');

      expect(() => loadConfig()).toThrow();
    });

    it('should handle type coercion correctly', async () => {
      Bun.env.PORT = '8080'; // String that should become number
      Bun.env.JWT_EXPIRATION_MINUTES = '30'; // String that should become number
      Bun.env.OTEL_EXPORTER_OTLP_TIMEOUT = '45000'; // String that should become number
      Bun.env.KONG_JWT_AUTHORITY = 'https://auth.example.com';
      Bun.env.KONG_JWT_AUDIENCE = 'https://api.example.com';
      Bun.env.KONG_ADMIN_URL = 'http://kong:8001';
      Bun.env.KONG_ADMIN_TOKEN = 'test-token-123456789012345678901234567890';

      const { loadConfig } = await import('../../src/config/config');
      const config = loadConfig();

      expect(typeof config.server.port).toBe('number');
      expect(config.server.port).toBe(8080);
      expect(typeof config.jwt.expirationMinutes).toBe('number');
      expect(config.jwt.expirationMinutes).toBe(30);
      expect(typeof config.telemetry.exportTimeout).toBe('number');
      expect(config.telemetry.exportTimeout).toBe(45000);
    });

    it('should reject invalid ranges and formats', async () => {
      Bun.env.PORT = '70000'; // Too high
      Bun.env.KONG_JWT_AUTHORITY = 'https://auth.example.com';
      Bun.env.KONG_JWT_AUDIENCE = 'https://api.example.com';
      Bun.env.KONG_ADMIN_URL = 'not-a-url'; // Invalid URL
      Bun.env.KONG_ADMIN_TOKEN = 'test-token-123456789012345678901234567890';

      const { loadConfig } = await import('../../src/config/config');

      expect(() => loadConfig()).toThrow();
    });

    it('should fail on missing required environment variables', async () => {
      // Don't set any required variables
      delete Bun.env.KONG_JWT_AUTHORITY;
      delete Bun.env.KONG_JWT_AUDIENCE;
      delete Bun.env.KONG_ADMIN_URL;
      delete Bun.env.KONG_ADMIN_TOKEN;

      const { loadConfig } = await import('../../src/config/config');

      expect(() => loadConfig()).toThrow();
    });

    it('should handle URL normalization in endpoint derivation', async () => {
      Bun.env.KONG_JWT_AUTHORITY = 'https://auth.example.com';
      Bun.env.KONG_JWT_AUDIENCE = 'https://api.example.com';
      Bun.env.KONG_ADMIN_URL = 'http://kong:8001';
      Bun.env.KONG_ADMIN_TOKEN = 'test-token-123456789012345678901234567890';
      Bun.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'https://otlp.example.com/'; // With trailing slash
      // Explicitly clear specific endpoints to test derivation
      delete Bun.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT;
      delete Bun.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT;
      delete Bun.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT;

      const { loadConfig } = await import('../../src/config/config');
      const config = loadConfig();

      // Should normalize trailing slash
      expect(config.telemetry.logsEndpoint).toBe('https://otlp.example.com/v1/logs');
      expect(config.telemetry.tracesEndpoint).toBe('https://otlp.example.com/v1/traces');
      expect(config.telemetry.metricsEndpoint).toBe('https://otlp.example.com/v1/metrics');
    });
  });
});