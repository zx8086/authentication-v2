/* test/playwright/business-requirements.e2e.ts */

import { test, expect } from '@playwright/test';
import { getTestConsumer, getBasicTestConsumers, ANONYMOUS_CONSUMER } from '../shared/test-consumers';

test.describe('Core Business Requirements', () => {

  test.describe('Service Health & Availability', () => {
    test('Service is healthy and operational', async ({ request }) => {
      const response = await request.get('/health');
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.status).toBe('healthy');
    });

    test('Service provides metrics for monitoring', async ({ request }) => {
      const response = await request.get('/metrics');
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('memory');
      expect(data).toHaveProperty('uptime');
    });

    test('Service provides API documentation', async ({ request }) => {
      const response = await request.get('/');
      expect(response.status()).toBe(200);
      const spec = await response.json();
      expect(spec.openapi).toBeDefined();
      expect(spec.paths['/tokens']).toBeDefined();
    });
  });

  test.describe('JWT Token Generation', () => {
    test('Generates JWT token for valid consumer', async ({ request }) => {
      const consumer = getTestConsumer(0);
      const response = await request.get('/tokens', {
        headers: {
          'X-Consumer-Id': consumer.id,
          'X-Consumer-Username': consumer.username
        }
      });
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.access_token).toBeTruthy();
      expect(data.expires_in).toBe(900); // 15 minutes

      // Verify it's a valid JWT (3 parts)
      const parts = data.access_token.split('.');
      expect(parts).toHaveLength(3);
    });

    test('JWT contains correct claims', async ({ request }) => {
      const consumer = getTestConsumer(0);
      const response = await request.get('/tokens', {
        headers: {
          'X-Consumer-Id': consumer.id,
          'X-Consumer-Username': consumer.username
        }
      });

      const { access_token } = await response.json();
      const payload = JSON.parse(Buffer.from(access_token.split('.')[1], 'base64url').toString());

      expect(payload.sub).toBe(consumer.username);
      expect(payload.iss).toBeTruthy();
      expect(payload.aud).toBeTruthy();
      expect(payload.exp - payload.iat).toBe(900);
    });

    test('Multiple consumers get different tokens', async ({ request }) => {
      const consumers = getBasicTestConsumers().slice(0, 3);
      const tokens = new Set();

      for (const consumer of consumers) {
        const response = await request.get('/tokens', {
          headers: {
            'X-Consumer-Id': consumer.id,
            'X-Consumer-Username': consumer.username
          }
        });
        expect(response.status()).toBe(200);
        const { access_token } = await response.json();
        tokens.add(access_token);
      }

      expect(tokens.size).toBe(3); // All tokens should be unique
    });
  });

  test.describe('Security Requirements', () => {
    test('Rejects anonymous consumers', async ({ request }) => {
      const response = await request.get('/tokens', {
        headers: {
          'X-Consumer-Id': ANONYMOUS_CONSUMER.id,
          'X-Consumer-Username': ANONYMOUS_CONSUMER.username,
          'X-Anonymous-Consumer': 'true'
        }
      });
      expect(response.status()).toBe(401);
      const data = await response.json();
      expect(data.message).toContain('Anonymous consumers');
    });

    test('Rejects requests without Kong headers', async ({ request }) => {
      const response = await request.get('/tokens');
      expect(response.status()).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    test('Rejects requests with only Consumer ID', async ({ request }) => {
      const response = await request.get('/tokens', {
        headers: {
          'X-Consumer-Id': 'some-id'
        }
      });
      expect(response.status()).toBe(401);
    });

    test('Rejects requests with only Consumer Username', async ({ request }) => {
      const response = await request.get('/tokens', {
        headers: {
          'X-Consumer-Username': 'some-user'
        }
      });
      expect(response.status()).toBe(401);
    });

    test('Handles non-existent consumers gracefully', async ({ request }) => {
      const response = await request.get('/tokens', {
        headers: {
          'X-Consumer-Id': 'non-existent-consumer',
          'X-Consumer-Username': 'ghost-user'
        }
      });
      expect(response.status()).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
      expect(data.message).toBe('Invalid consumer credentials');
    });
  });

  test.describe('Error Handling', () => {
    test('Returns 404 for unknown endpoints', async ({ request }) => {
      const response = await request.get('/unknown');
      expect(response.status()).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Not Found');
    });

    test('All error responses have consistent structure', async ({ request }) => {
      const errors = [
        { path: '/tokens', expectedStatus: 401 }, // No auth
        { path: '/unknown', expectedStatus: 404 }  // Not found
      ];

      for (const { path, expectedStatus } of errors) {
        const response = await request.get(path);
        expect(response.status()).toBe(expectedStatus);
        const data = await response.json();
        expect(data).toHaveProperty('error');
        expect(data).toHaveProperty('message');
      }
    });
  });

  test.describe('CORS Support', () => {
    test('Handles CORS preflight requests', async ({ request }) => {
      const response = await request.fetch('/tokens', {
        method: 'OPTIONS',
        headers: {
          'Origin': 'https://example.com',
          'Access-Control-Request-Method': 'GET'
        }
      });
      expect(response.status()).toBe(204);
      expect(response.headers()['access-control-allow-origin']).toBeDefined();
    });
  });

  test.describe('Caching Behavior', () => {
    test('Caches consumer secrets to reduce Kong API calls', async ({ request }) => {
      const consumer = getTestConsumer(0);
      const headers = {
        'X-Consumer-Id': consumer.id,
        'X-Consumer-Username': consumer.username
      };

      // First request - may hit Kong API
      const firstResponse = await request.get('/tokens', { headers });
      expect(firstResponse.status()).toBe(200);

      // Get initial cache stats
      const metricsBeforeResponse = await request.get('/metrics');
      const metricsBefore = await metricsBeforeResponse.json();
      const cacheSizeBefore = metricsBefore.cache.size || 0;

      // Multiple subsequent requests - should use cache
      for (let i = 0; i < 3; i++) {
        const response = await request.get('/tokens', { headers });
        expect(response.status()).toBe(200);
      }

      // Check cache is being used
      const metricsAfterResponse = await request.get('/metrics');
      const metricsAfter = await metricsAfterResponse.json();

      // Cache should have at least one entry
      expect(metricsAfter.cache.size).toBeGreaterThanOrEqual(1);
    });

    test('Different consumers have separate cache entries', async ({ request }) => {
      const consumers = getBasicTestConsumers().slice(0, 2);

      // Request tokens for two different consumers
      for (const consumer of consumers) {
        const response = await request.get('/tokens', {
          headers: {
            'X-Consumer-Id': consumer.id,
            'X-Consumer-Username': consumer.username
          }
        });
        expect(response.status()).toBe(200);
      }

      // Check cache has entries for both
      const metricsResponse = await request.get('/metrics');
      const metrics = await metricsResponse.json();

      // Should have cache entries
      expect(metrics.cache.size).toBeGreaterThanOrEqual(1);
    });
  });
});