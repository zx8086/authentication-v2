/* test/playwright/comprehensive-business.e2e.ts */

import { test, expect } from '@playwright/test';
import { getTestConsumer, getBasicTestConsumers, ANONYMOUS_CONSUMER } from '../shared/test-consumers';

test.describe('Comprehensive Business Requirements', () => {

  test.describe('Service Health & Dependencies', () => {
    test('Health endpoint reports service and Kong status', async ({ request }) => {
      const response = await request.get('/health');
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.status).toBe('healthy');
      expect(data).toHaveProperty('version');
      expect(data).toHaveProperty('uptime');

      // Kong dependency status
      expect(data.dependencies).toHaveProperty('kong');
      expect(data.dependencies.kong).toHaveProperty('status');
      expect(['healthy', 'unhealthy']).toContain(data.dependencies.kong.status);
      expect(data.dependencies.kong).toHaveProperty('responseTime');
    });

    test('Metrics endpoint provides monitoring data', async ({ request }) => {
      const response = await request.get('/metrics');
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('memory');
      expect(data).toHaveProperty('uptime');
      expect(data).toHaveProperty('telemetry');
    });

    test('OpenAPI documentation is available', async ({ request }) => {
      const response = await request.get('/');
      expect(response.status()).toBe(200);

      const spec = await response.json();
      expect(spec.openapi).toBeDefined();
      expect(spec.paths['/tokens']).toBeDefined();
      expect(spec.paths['/health']).toBeDefined();
      expect(spec.paths['/metrics']).toBeDefined();
    });
  });

  test.describe('JWT Token Generation Core Flow', () => {
    test('Generates valid JWT token for authenticated consumer', async ({ request }) => {
      const consumer = getTestConsumer(0);
      const response = await request.get('/tokens', {
        headers: {
          'X-Consumer-Id': consumer.id,
          'X-Consumer-Username': consumer.username
        }
      });
      expect(response.status()).toBe(200);

      const data = await response.json();

      // Token structure
      expect(data.access_token).toBeTruthy();
      expect(data.expires_in).toBe(900); // 15 minutes

      // JWT format validation (header.payload.signature)
      const parts = data.access_token.split('.');
      expect(parts).toHaveLength(3);

      // Decode and validate JWT claims
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      expect(payload.sub).toBe(consumer.username);
      expect(payload.iss).toBeTruthy(); // Issuer
      expect(payload.aud).toBeTruthy(); // Audience
      expect(payload.key).toBeTruthy(); // Kong key claim
      expect(payload.exp - payload.iat).toBe(900); // 15 minute expiration
    });

    test('Same consumer gets consistent tokens (same secret)', async ({ request }) => {
      const consumer = getTestConsumer(0);
      const headers = {
        'X-Consumer-Id': consumer.id,
        'X-Consumer-Username': consumer.username
      };

      // Get two tokens
      const response1 = await request.get('/tokens', { headers });
      const response2 = await request.get('/tokens', { headers });

      expect(response1.status()).toBe(200);
      expect(response2.status()).toBe(200);

      const token1 = (await response1.json()).access_token;
      const token2 = (await response2.json()).access_token;

      // Decode payloads
      const payload1 = JSON.parse(Buffer.from(token1.split('.')[1], 'base64url').toString());
      const payload2 = JSON.parse(Buffer.from(token2.split('.')[1], 'base64url').toString());

      // Same consumer should have same 'key' claim (uses same secret)
      expect(payload1.key).toBe(payload2.key);
      expect(payload1.sub).toBe(payload2.sub);
      expect(payload1.iss).toBe(payload2.iss);
      expect(payload1.aud).toBe(payload2.aud);
    });

    test('Different consumers get different tokens', async ({ request }) => {
      const consumers = getBasicTestConsumers().slice(0, 2);
      const tokens = [];

      for (const consumer of consumers) {
        const response = await request.get('/tokens', {
          headers: {
            'X-Consumer-Id': consumer.id,
            'X-Consumer-Username': consumer.username
          }
        });
        expect(response.status()).toBe(200);

        const data = await response.json();
        tokens.push(data.access_token);
      }

      // Tokens should be unique
      expect(tokens[0]).not.toBe(tokens[1]);

      // Decode and verify different subjects
      const payload1 = JSON.parse(Buffer.from(tokens[0].split('.')[1], 'base64url').toString());
      const payload2 = JSON.parse(Buffer.from(tokens[1].split('.')[1], 'base64url').toString());

      expect(payload1.sub).not.toBe(payload2.sub);
      expect(payload1.key).not.toBe(payload2.key); // Different secrets
    });
  });

  test.describe('Security Enforcement', () => {
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
      expect(data.error).toBe('Unauthorized');
      expect(data.message).toContain('Anonymous consumers');
    });

    test('Requires both consumer headers', async ({ request }) => {
      // Missing both headers
      let response = await request.get('/tokens');
      expect(response.status()).toBe(401);

      // Only consumer ID
      response = await request.get('/tokens', {
        headers: { 'X-Consumer-Id': 'test-id' }
      });
      expect(response.status()).toBe(401);

      // Only consumer username
      response = await request.get('/tokens', {
        headers: { 'X-Consumer-Username': 'test-user' }
      });
      expect(response.status()).toBe(401);
    });

    test('Handles non-existent consumers', async ({ request }) => {
      const response = await request.get('/tokens', {
        headers: {
          'X-Consumer-Id': 'non-existent-' + Date.now(),
          'X-Consumer-Username': 'ghost-user-' + Date.now()
        }
      });
      expect(response.status()).toBe(401);

      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
      expect(data.message).toBe('Invalid consumer credentials');
      expect(data).toHaveProperty('requestId');
    });
  });

  test.describe('Service Performance', () => {
    test('Handles multiple requests efficiently without caching', async ({ request }) => {
      const consumer = getTestConsumer(0);
      const headers = {
        'X-Consumer-Id': consumer.id,
        'X-Consumer-Username': consumer.username
      };

      // Multiple requests should all succeed - service relies on Kong Gateway proxy caching
      const startTime = Date.now();
      for (let i = 0; i < 5; i++) {
        const response = await request.get('/tokens', { headers });
        expect(response.status()).toBe(200);

        const data = await response.json();
        expect(data.access_token).toBeTruthy();
        expect(data.expires_in).toBe(900);
      }
      const endTime = Date.now();

      // Should complete reasonably quickly (within 10 seconds for 5 requests)
      expect(endTime - startTime).toBeLessThan(10000);
    });
  });

  test.describe('Telemetry & Observability', () => {
    test('Health telemetry endpoint provides telemetry status', async ({ request }) => {
      const response = await request.get('/health/telemetry');
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('telemetry');
      expect(data.telemetry).toHaveProperty('mode');
      expect(data.telemetry).toHaveProperty('status');
    });

    test('Unified metrics endpoint provides infrastructure view', async ({ request }) => {
      const response = await request.get('/metrics?view=infrastructure');
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('infrastructure');
      expect(data.infrastructure).toHaveProperty('metrics');
      expect(data.infrastructure.metrics).toHaveProperty('status');
    });

    test('Debug metrics test endpoint records test metrics', async ({ request }) => {
      const response = await request.post('/debug/metrics/test');
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toContain('Test metrics recorded');
      expect(data).toHaveProperty('metricsRecorded');
    });
  });

  test.describe('Error Handling & Resilience', () => {
    test('404 for unknown endpoints', async ({ request }) => {
      const response = await request.get('/unknown-endpoint');
      expect(response.status()).toBe(404);

      const data = await response.json();
      expect(data.error).toBe('Not Found');
      expect(data).toHaveProperty('message');
    });

    test('Consistent error response structure', async ({ request }) => {
      const errors = [
        { path: '/tokens', expectedStatus: 401 },
        { path: '/unknown', expectedStatus: 404 }
      ];

      for (const { path, expectedStatus } of errors) {
        const response = await request.get(path);
        expect(response.status()).toBe(expectedStatus);

        const data = await response.json();
        expect(data).toHaveProperty('error');
        expect(data).toHaveProperty('message');

        // 404 responses only have error and message
        // 401 responses have timestamp and requestId
        if (expectedStatus === 401) {
          expect(data).toHaveProperty('timestamp');
          expect(data).toHaveProperty('requestId');
        }
      }
    });

    test('CORS support for browser applications', async ({ request }) => {
      const response = await request.fetch('/tokens', {
        method: 'OPTIONS',
        headers: {
          'Origin': 'https://example.com',
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'X-Consumer-Id,X-Consumer-Username'
        }
      });

      expect(response.status()).toBe(204);
      expect(response.headers()['access-control-allow-origin']).toBeDefined();
      expect(response.headers()['access-control-allow-methods']).toContain('GET');
    });
  });
});