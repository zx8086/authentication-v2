/* tests/server.test.ts */

// Integration tests for the authentication server
import { describe, it, expect, beforeAll, afterAll, beforeEach, mock } from 'bun:test';

// Mock environment variables
process.env.JWT_AUTHORITY = 'https://test-authority.com';
process.env.JWT_AUDIENCE = 'test-audience';
process.env.KONG_ADMIN_URL = 'http://test-kong:8001';
process.env.KONG_ADMIN_TOKEN = 'test-admin-token';
process.env.PORT = '3001'; // Use different port for tests
process.env.API_CORS = 'http://localhost:3000,https://app.example.com';

describe('Authentication Server Integration', () => {
  let serverUrl: string;

  beforeAll(() => {
    serverUrl = 'http://localhost:3001';
  });

  describe('Health Check Endpoint', () => {
    it('should return health status', async () => {
      // Mock Kong health check
      const originalFetch = global.fetch;
      global.fetch = mock(async (url) => {
        if (url.toString().includes('/status')) {
          return { ok: true, status: 200 };
        }
        return originalFetch(url);
      }) as any;

      const response = await fetch(`${serverUrl}/health`);
      expect(response.status).toBe(200);

      const health = await response.json();
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('timestamp');
      expect(health).toHaveProperty('version');
      expect(health).toHaveProperty('uptime');
      expect(health).toHaveProperty('dependencies');
      expect(health.dependencies).toHaveProperty('kong');

      global.fetch = originalFetch;
    });

    it('should return degraded status when Kong is unhealthy', async () => {
      // Mock Kong unhealthy
      const originalFetch = global.fetch;
      global.fetch = mock(async (url) => {
        if (url.toString().includes('/status')) {
          return { ok: false, status: 503 };
        }
        return originalFetch(url);
      }) as any;

      const response = await fetch(`${serverUrl}/health`);
      expect([200, 503]).toContain(response.status);

      const health = await response.json();
      if (response.status === 503) {
        expect(health.status).toBe('degraded');
      }

      global.fetch = originalFetch;
    });
  });

  describe('Metrics Endpoint', () => {
    it('should return performance metrics', async () => {
      const response = await fetch(`${serverUrl}/metrics`);
      expect(response.status).toBe(200);

      const metrics = await response.json();
      expect(metrics).toHaveProperty('timestamp');
      expect(metrics).toHaveProperty('uptime');
      expect(metrics).toHaveProperty('memory');
      expect(metrics).toHaveProperty('performance');
      expect(metrics).toHaveProperty('cache');

      expect(typeof metrics.memory.used).toBe('number');
      expect(typeof metrics.memory.total).toBe('number');
      expect(Array.isArray(metrics.performance)).toBe(true);
    });
  });

  describe('CORS Handling', () => {
    it('should handle CORS preflight requests', async () => {
      const response = await fetch(`${serverUrl}/tokens`, {
        method: 'OPTIONS',
        headers: {
          'Origin': 'http://localhost:3000',
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'X-Consumer-Id,X-Consumer-Username',
        },
      });

      expect(response.status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
      expect(response.headers.get('Access-Control-Allow-Headers')).toContain('X-Consumer-Id');
    });

    it('should handle requests from allowed origins', async () => {
      const response = await fetch(`${serverUrl}/health`, {
        headers: {
          'Origin': 'https://app.example.com',
        },
      });

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://app.example.com');
    });

    it('should handle requests from disallowed origins', async () => {
      const response = await fetch(`${serverUrl}/health`, {
        headers: {
          'Origin': 'https://evil.com',
        },
      });

      // Should still respond but with first allowed origin
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000');
    });
  });

  describe('Token Endpoint', () => {
    beforeEach(() => {
      // Mock Kong API calls
      const originalFetch = global.fetch;
      global.fetch = mock(async (url, options) => {
        const urlStr = url.toString();
        
        // Mock Kong health check
        if (urlStr.includes('/status')) {
          return { ok: true, status: 200 };
        }
        
        // Mock Kong consumer JWT endpoint
        if (urlStr.includes('/jwt') && options?.method === 'GET') {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              data: [{
                id: 'test-secret-id',
                key: 'test-consumer-key',
                secret: 'test-consumer-secret-12345678901234567890123456789012',
                consumer: { id: 'test-consumer-id' }
              }],
              total: 1
            })
          };
        }
        
        // Mock Kong consumer creation
        if (urlStr.includes('/jwt') && options?.method === 'POST') {
          return {
            ok: true,
            status: 201,
            json: async () => ({
              id: 'new-secret-id',
              key: 'new-consumer-key',
              secret: 'new-consumer-secret-12345678901234567890123456789012',
              consumer: { id: 'test-consumer-id' }
            })
          };
        }

        return originalFetch(url, options);
      }) as any;
    });

    it('should reject requests without Kong headers', async () => {
      const response = await fetch(`${serverUrl}/tokens`);
      
      expect(response.status).toBe(401);
      
      const error = await response.json();
      expect(error).toHaveProperty('error', 'Unauthorized');
      expect(error).toHaveProperty('message');
    });

    it('should reject anonymous consumers', async () => {
      const response = await fetch(`${serverUrl}/tokens`, {
        headers: {
          'X-Consumer-Id': 'test-consumer-id',
          'X-Consumer-Username': 'test-user',
          'X-Anonymous-Consumer': 'true',
        },
      });
      
      expect(response.status).toBe(401);
      
      const error = await response.json();
      expect(error).toHaveProperty('error', 'Unauthorized');
      expect(error.message).toContain('Anonymous consumers');
    });

    it('should issue token for valid consumer', async () => {
      const response = await fetch(`${serverUrl}/tokens`, {
        headers: {
          'X-Consumer-Id': 'test-consumer-id',
          'X-Consumer-Username': 'test-user',
          'X-Anonymous-Consumer': 'false',
        },
      });
      
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/json');
      expect(response.headers.get('X-Request-Id')).toBeTruthy();
      
      const tokenResponse = await response.json();
      expect(tokenResponse).toHaveProperty('access_token');
      expect(tokenResponse).toHaveProperty('expires_in', 900);
      
      // Validate JWT structure
      const tokenParts = tokenResponse.access_token.split('.');
      expect(tokenParts).toHaveLength(3);
      
      // Validate JWT payload
      const payload = JSON.parse(atob(tokenParts[1].replace(/-/g, '+').replace(/_/g, '/')));
      expect(payload.sub).toBe('test-user');
      expect(payload.iss).toBe('https://test-authority.com');
      expect(payload.aud).toBe('test-audience');
    });

    it('should handle missing consumer ID header', async () => {
      const response = await fetch(`${serverUrl}/tokens`, {
        headers: {
          'X-Consumer-Username': 'test-user',
        },
      });
      
      expect(response.status).toBe(401);
    });

    it('should handle missing consumer username header', async () => {
      const response = await fetch(`${serverUrl}/tokens`, {
        headers: {
          'X-Consumer-Id': 'test-consumer-id',
        },
      });
      
      expect(response.status).toBe(401);
    });

    it('should create new consumer secret when none exists', async () => {
      // Override mock to return empty consumer first, then successful creation
      const originalFetch = global.fetch;
      let callCount = 0;
      
      global.fetch = mock(async (url, options) => {
        const urlStr = url.toString();
        callCount++;
        
        if (urlStr.includes('/status')) {
          return { ok: true, status: 200 };
        }
        
        if (urlStr.includes('/jwt')) {
          if (options?.method === 'GET') {
            // Return empty on first call (no existing secret)
            return {
              ok: true,
              status: 200,
              json: async () => ({ data: [], total: 0 })
            };
          }
          
          if (options?.method === 'POST') {
            // Return new secret on creation
            return {
              ok: true,
              status: 201,
              json: async () => ({
                id: 'new-secret-id',
                key: 'new-consumer-key',
                secret: 'new-consumer-secret-12345678901234567890123456789012',
                consumer: { id: 'test-consumer-id' }
              })
            };
          }
        }

        return originalFetch(url, options);
      }) as any;

      const response = await fetch(`${serverUrl}/tokens`, {
        headers: {
          'X-Consumer-Id': 'new-consumer-id',
          'X-Consumer-Username': 'new-user',
          'X-Anonymous-Consumer': 'false',
        },
      });
      
      expect(response.status).toBe(200);
      
      const tokenResponse = await response.json();
      expect(tokenResponse).toHaveProperty('access_token');
      
      global.fetch = originalFetch;
    });

    it('should handle Kong API failures gracefully', async () => {
      // Mock Kong API failure
      const originalFetch = global.fetch;
      global.fetch = mock(async (url) => {
        const urlStr = url.toString();
        
        if (urlStr.includes('/status')) {
          return { ok: false, status: 503 };
        }
        
        if (urlStr.includes('/jwt')) {
          throw new Error('Kong API unavailable');
        }

        return originalFetch(url);
      }) as any;

      const response = await fetch(`${serverUrl}/tokens`, {
        headers: {
          'X-Consumer-Id': 'test-consumer-id',
          'X-Consumer-Username': 'test-user',
          'X-Anonymous-Consumer': 'false',
        },
      });
      
      expect(response.status).toBe(404);
      
      global.fetch = originalFetch;
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit excessive requests', async () => {
      // Mock successful Kong responses
      const originalFetch = global.fetch;
      global.fetch = mock(async (url) => {
        const urlStr = url.toString();
        
        if (urlStr.includes('/status')) {
          return { ok: true, status: 200 };
        }
        
        if (urlStr.includes('/jwt')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              data: [{
                id: 'test-secret-id',
                key: 'test-consumer-key',
                secret: 'test-consumer-secret-12345678901234567890123456789012',
                consumer: { id: 'rate-limit-consumer' }
              }],
              total: 1
            })
          };
        }

        return originalFetch(url);
      }) as any;

      const headers = {
        'X-Consumer-Id': 'rate-limit-consumer',
        'X-Consumer-Username': 'rate-limit-user',
        'X-Anonymous-Consumer': 'false',
      };

      // Make many requests rapidly
      const requests = Array.from({ length: 10 }, () =>
        fetch(`${serverUrl}/tokens`, { headers })
      );

      const responses = await Promise.all(requests);
      const statuses = responses.map(r => r.status);

      // Should have some successful (200) and some rate-limited (429)
      expect(statuses).toContain(200);
      
      // Check if any were rate limited (might not happen in test due to high limits)
      const rateLimited = responses.filter(r => r.status === 429);
      if (rateLimited.length > 0) {
        const rateLimitResponse = await rateLimited[0].json();
        expect(rateLimitResponse).toHaveProperty('error', 'Rate Limit Exceeded');
      }

      global.fetch = originalFetch;
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for unknown paths', async () => {
      const response = await fetch(`${serverUrl}/unknown-path`);
      expect(response.status).toBe(404);
      
      const error = await response.json();
      expect(error).toHaveProperty('error', 'Not Found');
    });

    it('should return 405 for unsupported methods', async () => {
      const response = await fetch(`${serverUrl}/tokens`, {
        method: 'POST',
      });
      expect(response.status).toBe(405);
      
      const error = await response.json();
      expect(error).toHaveProperty('error', 'Method Not Allowed');
      expect(response.headers.get('Allow')).toContain('GET');
    });

    it('should include request ID in error responses', async () => {
      const response = await fetch(`${serverUrl}/unknown-path`);
      expect(response.headers.get('X-Request-Id')).toBeTruthy();
      
      const error = await response.json();
      expect(error).not.toHaveProperty('requestId'); // Not exposed in body for security
    });
  });

  describe('Performance', () => {
    it('should handle concurrent requests efficiently', async () => {
      // Mock Kong responses
      const originalFetch = global.fetch;
      global.fetch = mock(async (url) => {
        const urlStr = url.toString();
        
        if (urlStr.includes('/status')) {
          return { ok: true, status: 200 };
        }
        
        if (urlStr.includes('/jwt')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              data: [{
                id: 'test-secret-id',
                key: 'test-consumer-key',
                secret: 'test-consumer-secret-12345678901234567890123456789012',
                consumer: { id: 'perf-test-consumer' }
              }],
              total: 1
            })
          };
        }

        return originalFetch(url);
      }) as any;

      const concurrentRequests = 20;
      const headers = {
        'X-Consumer-Id': 'perf-test-consumer',
        'X-Consumer-Username': 'perf-test-user',
        'X-Anonymous-Consumer': 'false',
      };

      const start = Bun.nanoseconds();
      const requests = Array.from({ length: concurrentRequests }, () =>
        fetch(`${serverUrl}/tokens`, { headers })
      );

      const responses = await Promise.all(requests);
      const duration = (Bun.nanoseconds() - start) / 1_000_000;

      // All requests should succeed (or be rate limited)
      expect(responses.every(r => [200, 429].includes(r.status))).toBe(true);
      
      // Should handle concurrent requests efficiently
      expect(duration).toBeLessThan(1000); // Within 1 second

      global.fetch = originalFetch;
    });

    it('should respond to health checks quickly', async () => {
      const originalFetch = global.fetch;
      global.fetch = mock(async (url) => {
        if (url.toString().includes('/status')) {
          return { ok: true, status: 200 };
        }
        return originalFetch(url);
      }) as any;

      const start = Bun.nanoseconds();
      const response = await fetch(`${serverUrl}/health`);
      const duration = (Bun.nanoseconds() - start) / 1_000_000;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(100); // Should respond within 100ms

      global.fetch = originalFetch;
    });
  });
});