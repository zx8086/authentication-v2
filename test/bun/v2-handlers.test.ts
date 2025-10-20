/* test/bun/v2-handlers.test.ts */

import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test';
import { handleV2TokenRequest } from '../../src/handlers/v2/tokens';
import { handleV2HealthCheck } from '../../src/handlers/v2/health';
import type { IKongService } from '../../src/config/schemas';
import { TestConsumerSecretFactory } from '../shared/test-consumer-secrets';

describe('V2 API Handlers', () => {
  let mockKongService: IKongService;

  beforeEach(() => {
    mockKongService = {
      getConsumerSecret: mock(async () => TestConsumerSecretFactory.createNew()),
      createConsumerSecret: mock(async () => TestConsumerSecretFactory.createNew()),
      clearCache: mock(async () => {}),
      getCacheStats: mock(async () => ({
        strategy: 'local-memory' as const,
        size: 0,
        entries: [],
        activeEntries: 0,
        hitRate: '0%',
        averageLatencyMs: 0
      })),
      healthCheck: mock(async () => ({
        healthy: true,
        responseTime: 100
      })),
      getCircuitBreakerStats: mock(() => ({}))
    };
  });

  afterEach(() => {
    // Clean up any test state
  });

  describe('V2 Token Handler', () => {
    test('should generate JWT token with v2 security enhancements', async () => {
      const request = new Request('http://localhost:3000/tokens', {
        method: 'GET',
        headers: {
          'X-Consumer-Id': 'test-consumer-v2',
          'X-Consumer-Username': 'test-user-v2',
          'User-Agent': 'V2 Test Client',
          'X-Forwarded-For': '192.168.1.100'
        }
      });

      const response = await handleV2TokenRequest(request, mockKongService);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/json');

      // V2-specific headers should be present
      // Note: X-API-Version is added by versioning middleware, not handlers
      expect(response.headers.get('X-Request-Id')).toBeTruthy();
      expect(response.headers.get('X-Request-Security-ID')).toBeTruthy();

      // Security headers should be applied
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('Strict-Transport-Security')).toBeTruthy();

      const data = await response.json();
      expect(data.access_token).toBeTruthy();
      expect(data.expires_in).toBe(900);

      // Verify Kong service was called
      expect(mockKongService.getConsumerSecret).toHaveBeenCalledWith('test-consumer-v2');
    });

    test('should include backward compatible request ID headers', async () => {
      const request = new Request('http://localhost:3000/tokens', {
        method: 'GET',
        headers: {
          'X-Consumer-Id': 'compat-consumer',
          'X-Consumer-Username': 'compat-user'
        }
      });

      const response = await handleV2TokenRequest(request, mockKongService);

      // Both headers should be present for backward compatibility
      const requestId = response.headers.get('X-Request-Id');
      const securityId = response.headers.get('X-Request-Security-ID');

      expect(requestId).toBeTruthy();
      expect(securityId).toBeTruthy();
      expect(requestId).toBe(securityId); // Should be identical
    });

    test('should reject anonymous consumers with enhanced error response', async () => {
      const request = new Request('http://localhost:3000/tokens', {
        method: 'GET',
        headers: {
          'X-Consumer-Id': 'anonymous',
          'X-Consumer-Username': 'anonymous',
          'X-Anonymous-Consumer': 'true'
        }
      });

      const response = await handleV2TokenRequest(request, mockKongService);

      expect(response.status).toBe(401);

      // V2 error response should include security headers
      // Note: X-API-Version is added by versioning middleware, not handlers
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-Request-Id')).toBeTruthy();
      expect(response.headers.get('X-Request-Security-ID')).toBeTruthy();

      const errorData = await response.json();
      expect(errorData.error).toBe('Unauthorized');
      expect(errorData.message).toContain('Anonymous consumers');
    });

    test('should handle missing Kong headers with v2 error format', async () => {
      const request = new Request('http://localhost:3000/tokens', {
        method: 'GET',
        headers: {
          // Missing consumer headers
        }
      });

      const response = await handleV2TokenRequest(request, mockKongService);

      expect(response.status).toBe(401);
      // Note: X-API-Version is added by versioning middleware

      const errorData = await response.json();
      expect(errorData.error).toBe('Unauthorized');
      expect(errorData.message).toContain('Missing Kong consumer headers');
    });

    test('should handle Kong service errors with v2 resilience', async () => {
      // Mock Kong service to throw error
      mockKongService.getConsumerSecret = mock(async () => {
        throw new Error('Kong Admin API unavailable');
      });

      const request = new Request('http://localhost:3000/tokens', {
        method: 'GET',
        headers: {
          'X-Consumer-Id': 'error-consumer',
          'X-Consumer-Username': 'error-user'
        }
      });

      const response = await handleV2TokenRequest(request, mockKongService);

      expect(response.status).toBe(503);
      // Note: X-API-Version is added by versioning middleware
      expect(response.headers.get('Retry-After')).toBe('30');

      const errorData = await response.json();
      expect(errorData.error).toBe('Service Unavailable');
      expect(errorData.message).toContain('temporarily unavailable');
      expect(errorData.version).toBe('v2');
    });

    test('should handle Kong consumer not found with v2 security audit', async () => {
      // Mock Kong service to return null (consumer not found)
      mockKongService.getConsumerSecret = mock(async () => null);

      const request = new Request('http://localhost:3000/tokens', {
        method: 'GET',
        headers: {
          'X-Consumer-Id': 'nonexistent-consumer',
          'X-Consumer-Username': 'ghost-user'
        }
      });

      const response = await handleV2TokenRequest(request, mockKongService);

      expect(response.status).toBe(401);
      // Note: X-API-Version is added by versioning middleware, not handlers

      const errorData = await response.json();
      expect(errorData.error).toBe('Unauthorized');
      expect(errorData.message).toBe('Invalid consumer credentials');
    });

    test('should extract and audit client information', async () => {
      const request = new Request('http://localhost:3000/tokens', {
        method: 'GET',
        headers: {
          'X-Consumer-Id': 'audit-consumer',
          'X-Consumer-Username': 'audit-user',
          'User-Agent': 'Mozilla/5.0 Audit Browser',
          'X-Forwarded-For': '203.0.113.10',
          'X-Real-IP': '203.0.113.20',
          'X-Geo-Location': 'US-NY'
        }
      });

      const response = await handleV2TokenRequest(request, mockKongService);

      expect(response.status).toBe(200);
      // Client info should be extracted and used for audit logging
      // (audit logging is tested separately in v2-jwt-audit.test.ts)
    });

    test('should handle unexpected exceptions gracefully in v2', async () => {
      // Mock to throw unexpected error during token generation
      mockKongService.getConsumerSecret = mock(async () => {
        throw new TypeError('Unexpected internal error');
      });

      const request = new Request('http://localhost:3000/tokens', {
        method: 'GET',
        headers: {
          'X-Consumer-Id': 'exception-consumer',
          'X-Consumer-Username': 'exception-user'
        }
      });

      const response = await handleV2TokenRequest(request, mockKongService);

      expect(response.status).toBe(503);
      // Note: X-API-Version is added by versioning middleware, not handlers
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    });
  });

  describe('V2 Health Handler', () => {
    test('should return enhanced health status with v2 security context', async () => {
      const request = new Request('http://localhost:3000/health', {
        method: 'GET',
        headers: {
          'User-Agent': 'Health Check Monitor',
          'X-Forwarded-For': '10.0.0.1'
        }
      });

      const response = await handleV2HealthCheck(request, mockKongService);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/json');
      // Note: X-API-Version is added by versioning middleware, not handlers
      expect(response.headers.get('X-Request-Id')).toBeTruthy();

      // Security headers should be applied
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');

      const healthData = await response.json();

      // V2-specific health response structure
      expect(healthData.status).toBe('healthy');
      expect(healthData.version).toBe('v2');
      expect(healthData.service).toBe('authentication-service');
      expect(healthData.timestamp).toBeTruthy();

      // Security context in v2 health response
      expect(healthData.security).toHaveProperty('headersEnabled');
      expect(healthData.security).toHaveProperty('auditLoggingEnabled');
      expect(healthData.security).toHaveProperty('auditLevel');

      // Audit information
      expect(healthData.audit).toHaveProperty('enabled');
      if (healthData.audit.enabled) {
        expect(healthData.audit).toHaveProperty('metrics');
      }

      // Dependencies status
      expect(healthData.dependencies).toHaveProperty('kong');
      expect(healthData.dependencies.kong).toHaveProperty('status');
      expect(healthData.dependencies.kong.status).toBe('healthy');

      // Performance metrics
      expect(healthData.performance).toHaveProperty('responseTime');
      expect(healthData.requestId).toBeTruthy();
    });

    test('should handle Kong health check failure in v2', async () => {
      // Mock Kong service to be unhealthy
      mockKongService.healthCheck = mock(async () => ({
        healthy: false,
        responseTime: 5000,
        error: 'Connection timeout'
      }));

      const request = new Request('http://localhost:3000/health', {
        method: 'GET'
      });

      const response = await handleV2HealthCheck(request, mockKongService);

      expect(response.status).toBe(200); // Health endpoint still responds
      // Note: X-API-Version is added by versioning middleware, not handlers

      const healthData = await response.json();
      expect(healthData.status).toBe('healthy'); // Service itself is healthy
      expect(healthData.dependencies.kong.status).toBe('unhealthy');
      expect(healthData.dependencies.kong.error).toBe('Connection timeout');
    });

    test('should handle health check exceptions with v2 error format', async () => {
      // Mock Kong service to throw exception
      mockKongService.healthCheck = mock(async () => {
        throw new Error('Critical Kong failure');
      });

      const request = new Request('http://localhost:3000/health', {
        method: 'GET'
      });

      const response = await handleV2HealthCheck(request, mockKongService);

      expect(response.status).toBe(503);
      // Note: X-API-Version is added by versioning middleware, not handlers
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');

      const errorData = await response.json();
      expect(errorData.status).toBe('unhealthy');
      expect(errorData.version).toBe('v2');
      expect(errorData.service).toBe('authentication-service');
      expect(errorData.error).toBe('Critical Kong failure');
      expect(errorData.requestId).toBeTruthy();
    });

    test('should include request ID consistency in v2 health responses', async () => {
      const request = new Request('http://localhost:3000/health', {
        method: 'GET'
      });

      const response = await handleV2HealthCheck(request, mockKongService);

      const requestId = response.headers.get('X-Request-Id');
      const securityId = response.headers.get('X-Request-Security-ID');

      expect(requestId).toBeTruthy();
      expect(securityId).toBeTruthy();
      expect(requestId).toBe(securityId);

      const healthData = await response.json();
      expect(healthData.requestId).toBe(requestId);
    });

    test('should provide v2 audit metrics when audit logging is enabled', async () => {
      const request = new Request('http://localhost:3000/health', {
        method: 'GET'
      });

      const response = await handleV2HealthCheck(request, mockKongService);
      const healthData = await response.json();

      // If audit logging is enabled, metrics should be included
      if (healthData.audit.enabled) {
        expect(healthData.audit.metrics).toHaveProperty('totalEvents');
        expect(healthData.audit.metrics).toHaveProperty('eventsByType');
        expect(healthData.audit.metrics).toHaveProperty('securityEvents');
        expect(healthData.audit.metrics).toHaveProperty('criticalEvents');
      } else {
        expect(healthData.audit.metrics).toBeNull();
      }
    });
  });

  describe('V2 Handlers Common Features', () => {
    test('should apply consistent security headers across all v2 handlers', async () => {
      const tokenRequest = new Request('http://localhost:3000/tokens', {
        method: 'GET',
        headers: {
          'X-Consumer-Id': 'security-test',
          'X-Consumer-Username': 'security-user'
        }
      });

      const healthRequest = new Request('http://localhost:3000/health', {
        method: 'GET'
      });

      const [tokenResponse, healthResponse] = await Promise.all([
        handleV2TokenRequest(tokenRequest, mockKongService),
        handleV2HealthCheck(healthRequest, mockKongService)
      ]);

      const commonSecurityHeaders = [
        'X-Content-Type-Options',
        'X-Frame-Options',
        'Strict-Transport-Security',
        'X-Request-Id',
        'X-Request-Security-ID'
      ];

      for (const header of commonSecurityHeaders) {
        expect(tokenResponse.headers.get(header)).toBeTruthy();
        expect(healthResponse.headers.get(header)).toBeTruthy();
      }

      // Note: X-API-Version headers are added by versioning middleware, not individual handlers
    });

    test('should generate unique request IDs for each v2 request', async () => {
      const request1 = new Request('http://localhost:3000/health');
      const request2 = new Request('http://localhost:3000/health');

      const [response1, response2] = await Promise.all([
        handleV2HealthCheck(request1, mockKongService),
        handleV2HealthCheck(request2, mockKongService)
      ]);

      const requestId1 = response1.headers.get('X-Request-Id');
      const requestId2 = response2.headers.get('X-Request-Id');

      expect(requestId1).toBeTruthy();
      expect(requestId2).toBeTruthy();
      expect(requestId1).not.toBe(requestId2);
    });

    test('should maintain performance requirements in v2 handlers', async () => {
      const request = new Request('http://localhost:3000/health');

      const startTime = performance.now();
      const response = await handleV2HealthCheck(request, mockKongService);
      const endTime = performance.now();

      const duration = endTime - startTime;

      // V2 handlers should complete within reasonable time (500ms for health check)
      expect(duration).toBeLessThan(500);
      expect(response.status).toBe(200);
    });
  });
});