/* test/playwright/core-functionality.e2e.ts */

// E2E tests for authentication service core functionality

import { test, expect } from '@playwright/test';

test.describe('Authentication Service Core Functionality', () => {

  test('Health Check Endpoint', async ({ request }) => {
    const response = await request.get('/health');

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('status', 'healthy');
    expect(data).toHaveProperty('version');
    expect(data).toHaveProperty('timestamp');
    expect(data).toHaveProperty('uptime');
    expect(data).toHaveProperty('dependencies');
    expect(data.dependencies).toHaveProperty('kong');
  });

  test('OpenAPI Specification Serving', async ({ request }) => {
    const response = await request.get('/');

    expect(response.status()).toBe(200);

    const spec = await response.json();
    expect(spec).toHaveProperty('openapi', '3.0.3');
    expect(spec).toHaveProperty('info');
    expect(spec).toHaveProperty('paths');
    expect(spec.paths).toHaveProperty('/tokens');
    expect(spec.paths).toHaveProperty('/health');
    expect(spec.paths).toHaveProperty('/metrics');
  });

  test('Performance Metrics Endpoint', async ({ request }) => {
    const response = await request.get('/metrics');

    expect(response.status()).toBe(200);

    const metrics = await response.json();
    expect(metrics).toHaveProperty('timestamp');
    expect(metrics).toHaveProperty('uptime');
    expect(metrics).toHaveProperty('memory');
    expect(metrics).toHaveProperty('cache');
    expect(metrics).toHaveProperty('telemetry');
  });

  test('JWT Token Generation - Valid Kong Headers', async ({ request }) => {
    const response = await request.get('/tokens', {
      headers: {
        'X-Consumer-Id': 'test-consumer',
        'X-Consumer-Username': 'test-user',
        'X-Anonymous-Consumer': 'false',
      }
    });

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('access_token');
    expect(data).toHaveProperty('expires_in', 900);

    // Validate JWT structure
    const token = data.access_token;
    const parts = token.split('.');
    expect(parts).toHaveLength(3);

    // Decode and validate payload
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    expect(payload).toHaveProperty('sub', 'test-user');
    expect(payload).toHaveProperty('iss');
    expect(payload).toHaveProperty('aud');
    expect(payload).toHaveProperty('exp');
    expect(payload).toHaveProperty('iat');

    // Token should expire in 15 minutes
    expect(payload.exp - payload.iat).toBe(900);
  });

  test('JWT Token Generation - Anonymous Consumer Rejection', async ({ request }) => {
    const response = await request.get('/tokens', {
      headers: {
        'X-Consumer-Id': 'anonymous',
        'X-Consumer-Username': 'anonymous',
        'X-Anonymous-Consumer': 'true',
      }
    });

    expect(response.status()).toBe(401);

    const data = await response.json();
    expect(data).toHaveProperty('error', 'Unauthorized');
    expect(data.message).toContain('Anonymous consumers');
  });

  test('JWT Token Generation - Missing Headers', async ({ request }) => {
    // No headers at all
    const noHeaders = await request.get('/tokens');
    expect(noHeaders.status()).toBe(401);

    // Missing Consumer ID
    const missingId = await request.get('/tokens', {
      headers: {
        'X-Consumer-Username': 'test-user',
        'X-Anonymous-Consumer': 'false',
      }
    });
    expect(missingId.status()).toBe(401);

    // Missing Consumer Username
    const missingUsername = await request.get('/tokens', {
      headers: {
        'X-Consumer-Id': 'test-consumer',
        'X-Anonymous-Consumer': 'false',
      }
    });
    expect(missingUsername.status()).toBe(401);
  });

  test('Multiple Users Get Unique Tokens', async ({ request }) => {
    const users = [
      { id: 'user1', username: 'alice' },
      { id: 'user2', username: 'bob' },
      { id: 'user3', username: 'charlie' }
    ];

    const tokenResponses = await Promise.all(
      users.map(user =>
        request.get('/tokens', {
          headers: {
            'X-Consumer-Id': user.id,
            'X-Consumer-Username': user.username,
            'X-Anonymous-Consumer': 'false',
          }
        })
      )
    );

    // All should succeed
    tokenResponses.forEach(response => {
      expect(response.status()).toBe(200);
    });

    const tokens = await Promise.all(tokenResponses.map(r => r.json()));

    // Each token should be unique
    const accessTokens = tokens.map(t => t.access_token);
    const uniqueTokens = new Set(accessTokens);
    expect(uniqueTokens.size).toBe(users.length);

    // Each token should have correct subject
    tokens.forEach((token, index) => {
      const payload = JSON.parse(Buffer.from(token.access_token.split('.')[1], 'base64url').toString());
      expect(payload.sub).toBe(users[index].username);
    });
  });

  test('Unknown Endpoints Return 404', async ({ request }) => {
    const unknownEndpoints = [
      '/nonexistent',
      '/unknown/path',
      '/api/v1/something'
    ];

    for (const endpoint of unknownEndpoints) {
      const response = await request.get(endpoint);
      expect(response.status()).toBe(404);

      const data = await response.json();
      expect(data).toHaveProperty('error', 'Not Found');
      expect(data).toHaveProperty('message');
    }
  });

  test('Service Monitoring - All Endpoints Available', async ({ request }) => {
    const endpoints = [
      { path: '/', name: 'OpenAPI' },
      { path: '/health', name: 'Health' },
      { path: '/metrics', name: 'Metrics' }
    ];

    const responses = await Promise.all(
      endpoints.map(endpoint =>
        request.get(endpoint.path).then(r => ({ ...endpoint, response: r }))
      )
    );

    responses.forEach(({ name, response }) => {
      expect(response.status()).toBe(200);
    });
  });
});