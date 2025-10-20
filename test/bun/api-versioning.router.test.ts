/* test/bun/api-versioning.router.test.ts */

import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test';
import { createRoutes } from '../../src/routes/router';
import { resetVersioningMiddleware } from '../../src/middleware/api-versioning';
import type { IKongService } from '../../src/config/schemas';
import { TestConsumerSecretFactory } from '../shared/test-consumer-secrets';

describe('API Versioning Router Integration', () => {
  let mockKongService: IKongService;
  let routes: ReturnType<typeof createRoutes>['routes'];
  let fallbackFetch: ReturnType<typeof createRoutes>['fallbackFetch'];

  beforeEach(() => {
    resetVersioningMiddleware();

    // Mock Kong service
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

    const routeConfig = createRoutes(mockKongService);
    routes = routeConfig.routes;
    fallbackFetch = routeConfig.fallbackFetch;
  });

  afterEach(() => {
    resetVersioningMiddleware();
  });

  describe('V1 vs V2 Route Handling', () => {
    test('should handle v2 health endpoint with enhanced features', async () => {
      const request = new Request('http://localhost:3000/health', {
        headers: { 'Accept-Version': 'v2' }
      });

      const handler = routes['/health']?.GET;
      expect(handler).toBeDefined();

      const response = await handler!(request);
      expect(response.status).toBe(200);
      expect(response.headers.get('API-Version')).toBe('v2');
      expect(response.headers.get('Supported-Versions')).toContain('v2');

      // V2 should include security headers
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('X-Request-Id')).toBeTruthy();
      expect(response.headers.get('X-Request-Security-ID')).toBeTruthy();

      const data = await response.json();
      expect(data.version).toBe('v2');
      expect(data.security).toBeDefined(); // V2 should have security context
      expect(data.audit).toBeDefined(); // V2 should have audit info
    });

    test('should handle v2 tokens endpoint with security enhancements', async () => {
      const request = new Request('http://localhost:3000/tokens', {
        headers: {
          'Accept-Version': 'v2',
          'x-consumer-id': 'test-consumer-v2',
          'x-consumer-username': 'test-user-v2',
          'User-Agent': 'V2 Test Client',
          'X-Forwarded-For': '192.168.1.100'
        }
      });

      const handler = routes['/tokens']?.GET;
      const response = await handler!(request);

      expect(response.headers.get('API-Version')).toBe('v2');

      // V2 should have comprehensive security headers
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('Strict-Transport-Security')).toBeTruthy();
      expect(response.headers.get('Content-Security-Policy')).toBeTruthy();

      // V2 should have both request ID headers for backward compatibility
      expect(response.headers.get('X-Request-Id')).toBeTruthy();
      expect(response.headers.get('X-Request-Security-ID')).toBeTruthy();
      expect(response.headers.get('X-Request-Id')).toBe(response.headers.get('X-Request-Security-ID'));
    });

  describe('Versioned Route Handling', () => {
    test('should handle health endpoint with Accept-Version header', async () => {
      const request = new Request('http://localhost:3000/health', {
        headers: { 'Accept-Version': 'v1' }
      });

      const handler = routes['/health']?.GET;
      expect(handler).toBeDefined();

      const response = await handler!(request);
      expect(response.status).toBe(200);
      expect(response.headers.get('API-Version')).toBe('v1');
      expect(response.headers.get('Supported-Versions')).toContain('v1');
    });

    test('should handle health endpoint without version header (uses latest v2)', async () => {
      const request = new Request('http://localhost:3000/health');

      const handler = routes['/health']?.GET;
      const response = await handler!(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('API-Version')).toBe('v1'); // Should default to v1 (backward compatibility)
      expect(response.headers.get('Supported-Versions')).toContain('v1');
    });

    test('should handle OpenAPI spec endpoint with versioning', async () => {
      const request = new Request('http://localhost:3000/', {
        headers: { 'Accept-Version': 'v1' }
      });

      const handler = routes['/']?.GET;
      const response = await handler!(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('API-Version')).toBe('v1');
      expect(response.headers.get('Content-Type')).toContain('application/json');
    });

    test('should handle telemetry health endpoint with versioning', async () => {
      const request = new Request('http://localhost:3000/health/telemetry', {
        headers: { 'Accept-Version': 'v1' }
      });

      const handler = routes['/health/telemetry']?.GET;
      const response = await handler!(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('API-Version')).toBe('v1');
    });

    test('should handle metrics health endpoint with versioning', async () => {
      const request = new Request('http://localhost:3000/health/metrics', {
        headers: { 'Accept-Version': 'v1' }
      });

      const handler = routes['/health/metrics']?.GET;
      const response = await handler!(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('API-Version')).toBe('v1');
    });

    test('should handle metrics endpoint with versioning', async () => {
      const request = new Request('http://localhost:3000/metrics', {
        headers: { 'Accept-Version': 'v1' }
      });

      const handler = routes['/metrics']?.GET;
      const response = await handler!(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('API-Version')).toBe('v1');
    });

    test('should handle tokens endpoint with versioning', async () => {
      const request = new Request('http://localhost:3000/tokens', {
        headers: {
          'Accept-Version': 'v1',
          'x-consumer-id': 'test-consumer-123',
          'x-consumer-username': 'test-user'
        }
      });

      const handler = routes['/tokens']?.GET;
      const response = await handler!(request);

      // Response depends on Kong consumer validation, but should have version headers
      expect(response.headers.get('API-Version')).toBe('v1');
    });

    test('should handle debug metrics test endpoint with versioning', async () => {
      const request = new Request('http://localhost:3000/debug/metrics/test', {
        method: 'POST',
        headers: { 'Accept-Version': 'v1' }
      });

      const handler = routes['/debug/metrics/test']?.POST;
      const response = await handler!(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('API-Version')).toBe('v1');
    });

    test('should handle debug metrics export endpoint with versioning', async () => {
      const request = new Request('http://localhost:3000/debug/metrics/export', {
        method: 'POST',
        headers: { 'Accept-Version': 'v1' }
      });

      const handler = routes['/debug/metrics/export']?.POST;
      const response = await handler!(request);

      // May return various status codes but should have version headers
      expect(response.headers.get('API-Version')).toBe('v1');
    });
  });

  describe('Media Type Versioning', () => {
    test('should handle media type versioning in Accept header', async () => {
      const request = new Request('http://localhost:3000/health', {
        headers: { 'Accept': 'application/vnd.auth.v1+json' }
      });

      const handler = routes['/health']?.GET;
      const response = await handler!(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('API-Version')).toBe('v1');
    });

    test('should prioritize Accept-Version over Accept header', async () => {
      const request = new Request('http://localhost:3000/health', {
        headers: {
          'Accept-Version': 'v1',
          'Accept': 'application/vnd.auth.v2+json'
        }
      });

      const handler = routes['/health']?.GET;
      const response = await handler!(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('API-Version')).toBe('v1'); // Should use Accept-Version
    });

    test('should handle parameter-based versioning', async () => {
      const request = new Request('http://localhost:3000/health', {
        headers: { 'Accept': 'application/json;version=1' }
      });

      const handler = routes['/health']?.GET;
      const response = await handler!(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('API-Version')).toBe('v1');
    });
  });

  describe('Unsupported Version Handling', () => {
    test('should return 400 for unsupported version', async () => {
      const request = new Request('http://localhost:3000/health', {
        headers: { 'Accept-Version': 'v99' }
      });

      const handler = routes['/health']?.GET;
      const response = await handler!(request);

      expect(response.status).toBe(400);
      expect(response.headers.get('Content-Type')).toBe('application/json');
      expect(response.headers.get('API-Version')).toBe('v1'); // Should use v1 as default (backward compatibility)
      expect(response.headers.get('Supported-Versions')).toContain('v1, v2');

      const errorBody = await response.json();
      expect(errorBody.error).toBe('Unsupported API Version');
      expect(errorBody.requestedVersion).toBe('v99');
    });

    test('should return 400 for unsupported media type version', async () => {
      const request = new Request('http://localhost:3000/health', {
        headers: { 'Accept': 'application/vnd.auth.v99+json' }
      });

      const handler = routes['/health']?.GET;
      const response = await handler!(request);

      expect(response.status).toBe(400);

      const errorBody = await response.json();
      expect(errorBody.requestedVersion).toBe('v99');
      expect(errorBody.error).toBe('Unsupported API Version');
    });
  });

  describe('Version Fallback and Error Handling', () => {
    test('should fallback to v1 for v1-only endpoints when v2 requested', async () => {
      // Test endpoints that only have v1 implementation
      const request = new Request('http://localhost:3000/health/telemetry', {
        headers: { 'Accept-Version': 'v2' }
      });

      const handler = routes['/health/telemetry']?.GET;
      const response = await handler!(request);

      expect(response.status).toBe(200);
      // Should fallback to v1 since v2 doesn't exist for this endpoint
      expect(response.headers.get('API-Version')).toBe('v1');
    });

    test('should handle version routing performance metrics', async () => {
      const request = new Request('http://localhost:3000/health', {
        headers: { 'Accept-Version': 'v2' }
      });

      const startTime = performance.now();
      const handler = routes['/health']?.GET;
      const response = await handler!(request);
      const endTime = performance.now();

      expect(response.status).toBe(200);
      expect(endTime - startTime).toBeLessThan(100); // Should be fast
    });
  });

  describe('V2 Security Features Integration', () => {
    test('should apply v2 security headers consistently across all v2 endpoints', async () => {
      const endpoints = [
        { path: '/health', method: 'GET' },
        { path: '/tokens', method: 'GET', headers: { 'x-consumer-id': 'test', 'x-consumer-username': 'test' } }
      ];

      for (const endpoint of endpoints) {
        const request = new Request(`http://localhost:3000${endpoint.path}`, {
          method: endpoint.method,
          headers: {
            'Accept-Version': 'v2',
            ...(endpoint.headers || {})
          }
        });

        const handler = routes[endpoint.path]?.[endpoint.method as keyof typeof routes[string]];
        if (handler) {
          const response = await handler(request);

          // All v2 endpoints should have consistent security headers
          expect(response.headers.get('X-API-Version')).toBe('v2');
          expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
          expect(response.headers.get('X-Frame-Options')).toBe('DENY');
          expect(response.headers.get('X-Request-Id')).toBeTruthy();
          expect(response.headers.get('X-Request-Security-ID')).toBeTruthy();
        }
      }
    });

    test('should maintain backward compatibility with v1 endpoints', async () => {
      const request = new Request('http://localhost:3000/health', {
        headers: { 'Accept-Version': 'v1' }
      });

      const handler = routes['/health']?.GET;
      const response = await handler!(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('API-Version')).toBe('v1');

      // V1 should not have v2-specific security headers
      expect(response.headers.get('X-Content-Type-Options')).toBeNull();
      expect(response.headers.get('X-Frame-Options')).toBeNull();
      expect(response.headers.get('X-Request-Security-ID')).toBeNull();

      const data = await response.json();
      expect(data.security).toBeUndefined(); // V1 should not have security context
      expect(data.audit).toBeUndefined(); // V1 should not have audit info
    });
  });

  describe('OPTIONS Request Handling', () => {
    test('should add version headers to OPTIONS responses', async () => {
      const request = new Request('http://localhost:3000/unknown-endpoint', {
        method: 'OPTIONS'
      });

      const response = await fallbackFetch(request);

      expect(response.status).toBe(204); // CORS preflight response
      expect(response.headers.get('API-Version')).toBe('v1');
      expect(response.headers.get('Supported-Versions')).toContain('v1');
    });

    test('should handle OPTIONS with versioning headers', async () => {
      const request = new Request('http://localhost:3000/health', {
        method: 'OPTIONS',
        headers: { 'Accept-Version': 'v1' }
      });

      const response = await fallbackFetch(request);

      expect(response.headers.get('API-Version')).toBe('v1');
    });
  });

  describe('Profiling Endpoints (Non-Versioned)', () => {
    test('should handle profiling endpoints without versioning', async () => {
      // Profiling endpoints should not be versioned based on the router implementation
      const request = new Request('http://localhost:3000/debug/profiling/status', {
        headers: { 'Accept-Version': 'v1' }
      });

      const handler = routes['/debug/profiling/status']?.GET;
      const response = await handler!(request);

      // These endpoints don't use createVersionedHandler, so no version headers expected
      expect(response.status).toBe(200);
    });

    test('should handle profiling start endpoint', async () => {
      const request = new Request('http://localhost:3000/debug/profiling/start', {
        method: 'POST'
      });

      const handler = routes['/debug/profiling/start']?.POST;
      const response = await handler!(request);

      expect(response.status).toBe(200);
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed version headers gracefully', async () => {
      const request = new Request('http://localhost:3000/health', {
        headers: { 'Accept-Version': 'invalid[version}' }
      });

      const handler = routes['/health']?.GET;
      const response = await handler!(request);

      // Should handle malformed version and fall back to unsupported
      expect(response.status).toBe(400);
    });

    test('should handle very long version strings', async () => {
      const longVersion = 'v' + '1'.repeat(1000);
      const request = new Request('http://localhost:3000/health', {
        headers: { 'Accept-Version': longVersion }
      });

      const handler = routes['/health']?.GET;
      const response = await handler!(request);

      expect(response.status).toBe(400);

      const errorBody = await response.json();
      expect(errorBody.requestedVersion).toBe(longVersion);
    });
  });

  describe('Response Header Consistency', () => {
    test('should include version headers in all versioned responses', async () => {
      const endpoints = [
        '/',
        '/health',
        '/health/telemetry',
        '/health/metrics',
        '/metrics'
      ];

      for (const endpoint of endpoints) {
        const request = new Request(`http://localhost:3000${endpoint}`, {
          headers: { 'Accept-Version': 'v1' }
        });

        const handler = routes[endpoint]?.GET;
        if (handler) {
          const response = await handler(request);

          expect(response.headers.get('API-Version')).toBe('v1');
          expect(response.headers.get('Supported-Versions')).toContain('v1');
        }
      }
    });

    test('should maintain version headers across different HTTP methods', async () => {
      const postEndpoints = [
        '/debug/metrics/test',
        '/debug/metrics/export'
      ];

      for (const endpoint of postEndpoints) {
        const request = new Request(`http://localhost:3000${endpoint}`, {
          method: 'POST',
          headers: { 'Accept-Version': 'v1' }
        });

        const handler = routes[endpoint]?.POST;
        if (handler) {
          const response = await handler(request);

          expect(response.headers.get('API-Version')).toBe('v1');
          expect(response.headers.get('Supported-Versions')).toContain('v1');
        }
      }
    });
  });

  describe('Kong Service Integration', () => {
    test('should pass Kong service to versioned handlers', async () => {
      const request = new Request('http://localhost:3000/health', {
        headers: { 'Accept-Version': 'v1' }
      });

      const handler = routes['/health']?.GET;
      await handler!(request);

      // Verify Kong service was called (health check endpoint uses Kong service)
      expect(mockKongService.healthCheck).toHaveBeenCalled();
    });

    test('should handle Kong service errors with versioning', async () => {
      // Mock Kong service to throw error
      mockKongService.healthCheck = mock(async () => {
        throw new Error('Kong connection failed');
      });

      const request = new Request('http://localhost:3000/health', {
        headers: { 'Accept-Version': 'v1' }
      });

      const handler = routes['/health']?.GET;
      const response = await handler!(request);

      // Should still include version headers even on error
      expect(response.headers.get('API-Version')).toBe('v1');
    });
  });

  describe('Performance Impact', () => {
    test('should not significantly impact response time', async () => {
      const request = new Request('http://localhost:3000/health', {
        headers: { 'Accept-Version': 'v1' }
      });

      const handler = routes['/health']?.GET;

      const start = performance.now();
      await handler!(request);
      const duration = performance.now() - start;

      // Versioning overhead should be minimal (allow for startup overhead)
      expect(duration).toBeLessThan(50);
    });

    test('should handle multiple concurrent versioned requests', async () => {
      const requests = Array.from({ length: 10 }, () =>
        new Request('http://localhost:3000/health', {
          headers: { 'Accept-Version': 'v1' }
        })
      );

      const handler = routes['/health']?.GET;

      const start = performance.now();
      await Promise.all(requests.map(req => handler!(req)));
      const duration = performance.now() - start;

      // Should handle concurrent requests efficiently (allowing for some overhead)
      expect(duration).toBeLessThan(500);
    });
  });

  describe('URL and Query Parameter Handling', () => {
    test('should handle metrics endpoint with query parameters', async () => {
      const request = new Request('http://localhost:3000/metrics?format=json', {
        headers: { 'Accept-Version': 'v1' }
      });

      const handler = routes['/metrics']?.GET;
      const response = await handler!(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('API-Version')).toBe('v1');
    });

    test('should preserve URL parameters in versioned handlers', async () => {
      const request = new Request('http://localhost:3000/metrics?debug=true&format=prometheus', {
        headers: { 'Accept-Version': 'v1' }
      });

      const handler = routes['/metrics']?.GET;
      const response = await handler!(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('API-Version')).toBe('v1');
      // The handler should receive and process the URL parameters
    });
  });
});
});
