/* test/bun/kong.service.test.ts */

// Tests for Kong service integration
import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { KongService } from '../../src/services/kong.service';
import { getTestConsumer } from '../shared/test-consumers';

// Mock fetch for testing
const originalFetch = global.fetch;

describe('KongService', () => {
  let kongService: KongService;
  const mockAdminUrl = 'http://test-kong:8001';
  const mockAdminToken = 'test-admin-token';
  const testConsumer = getTestConsumer(0);
  const testConsumerId = testConsumer.id;

  beforeEach(() => {
    kongService = new KongService(mockAdminUrl, mockAdminToken);
  });

  afterEach(async () => {
    // Clear Redis cache between tests to prevent pollution
    if (kongService?.clearCache) {
      await kongService.clearCache();
    }
  });

  describe('constructor', () => {
    it('should initialize with correct configuration', () => {
      expect(kongService).toBeInstanceOf(KongService);
    });

    it('should handle URL with trailing slash', () => {
      const serviceWithSlash = new KongService('http://kong:8001/', mockAdminToken);
      expect(serviceWithSlash).toBeInstanceOf(KongService);
    });
  });

  describe('getConsumerSecret', () => {
    it('should return consumer secret when found', async () => {
      const mockSecret = {
        id: 'secret-id-123',
        key: 'consumer-key-123',
        secret: 'consumer-secret-456',
        consumer: { id: 'consumer-uuid-123' }
      };

      const mockResponse = {
        data: [mockSecret],
        total: 1
      };

      // Mock the actual API calls made by KongService
      global.fetch = mock(async (url, options) => {
        const urlStr = url.toString();

        // Mock realm check
        if (urlStr.includes('/realms/default')) {
          return { ok: true, status: 200 };
        }

        // Mock consumer check (consumer must exist)
        if (urlStr.includes(`/core-entities/consumers/${testConsumerId}`) && !urlStr.includes('/jwt')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              id: 'consumer-uuid-123',
              username: testConsumerId,
              custom_id: testConsumerId,
            }),
          };
        }

        // Mock JWT credentials fetch
        if (urlStr.includes('/core-entities/consumers/consumer-uuid-123/jwt')) {
          return {
            ok: true,
            status: 200,
            json: async () => mockResponse,
          };
        }

        return { ok: false, status: 404 };
      }) as any;

      const result = await kongService.getConsumerSecret(testConsumerId);

      expect(result).toEqual(mockSecret);
      expect(global.fetch).toHaveBeenCalledTimes(3); // realm check, consumer check, JWT fetch

      // Restore original fetch
      global.fetch = originalFetch;
    });

    it('should return null when consumer not found', async () => {
      // Mock 404 response for consumer check
      global.fetch = mock(async (url) => {
        const urlStr = url.toString();

        // Mock realm check
        if (urlStr.includes('/realms/default')) {
          return { ok: true, status: 200 };
        }

        // Mock consumer not found (404)
        if (urlStr.includes(`/core-entities/consumers/${testConsumerId}`)) {
          return {
            ok: false,
            status: 404,
            statusText: 'Not Found',
          };
        }

        return { ok: false, status: 404 };
      }) as any;

      const result = await kongService.getConsumerSecret(testConsumerId);

      expect(result).toBeNull();

      global.fetch = originalFetch;
    });

    it('should return null when no JWT credentials exist', async () => {
      const mockResponse = {
        data: [],
        total: 0
      };

      // Mock consumer exists but no JWT credentials
      global.fetch = mock(async (url) => {
        const urlStr = url.toString();

        // Mock realm check
        if (urlStr.includes('/realms/default')) {
          return { ok: true, status: 200 };
        }

        // Mock consumer exists
        if (urlStr.includes(`/core-entities/consumers/${testConsumerId}`) && !urlStr.includes('/jwt')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              id: 'consumer-uuid-123',
              username: testConsumerId,
              custom_id: testConsumerId,
            }),
          };
        }

        // Mock empty JWT credentials
        if (urlStr.includes('/core-entities/consumers/consumer-uuid-123/jwt')) {
          return {
            ok: true,
            status: 200,
            json: async () => mockResponse,
          };
        }

        return { ok: false, status: 404 };
      }) as any;

      const result = await kongService.getConsumerSecret(testConsumerId);

      expect(result).toBeNull();

      global.fetch = originalFetch;
    });

    it('should handle Kong API errors gracefully', async () => {
      // Mock server error for all requests (realm check will fail first)
      global.fetch = mock(async () => ({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Kong server error',
      })) as any;

      // With circuit breaker, errors are caught and null is returned
      // Without circuit breaker, the service should handle errors gracefully
      try {
        const result = await kongService.getConsumerSecret(testConsumerId);
        // Either circuit breaker returned null, or service handled error gracefully
        expect(result).toBeNull();
      } catch (error) {
        // If error is thrown, it should be a proper Kong error
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Unexpected error checking realm');
      }

      global.fetch = originalFetch;
    });

    it('should handle network errors gracefully', async () => {
      // Mock network error
      global.fetch = mock(async () => {
        throw new Error('Network error');
      }) as any;

      // With circuit breaker, errors are caught and null is returned
      // Without circuit breaker, the service should handle errors gracefully
      try {
        const result = await kongService.getConsumerSecret(testConsumerId);
        // Either circuit breaker returned null, or service handled error gracefully
        expect(result).toBeNull();
      } catch (error) {
        // If error is thrown, it should be a proper network error
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Network error');
      }

      global.fetch = originalFetch;
    });

  });

  describe('createConsumerSecret', () => {
    it('should create a new consumer secret when consumer exists', async () => {
      const mockCreatedSecret = {
        id: 'new-secret-id-123',
        key: 'new-consumer-key-123',
        secret: 'new-consumer-secret-456',
        consumer: { id: 'consumer-uuid-123' }
      };

      // Mock successful creation with proper API flow
      global.fetch = mock(async (url, options) => {
        const urlStr = url.toString();

        // Mock consumer check (consumer exists)
        if (urlStr.includes(`/core-entities/consumers/${testConsumerId}`) && !urlStr.includes('/jwt')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              id: 'consumer-uuid-123',
              username: testConsumerId,
              custom_id: testConsumerId,
            }),
          };
        }

        // Mock JWT credentials creation
        if (urlStr.includes('/core-entities/consumers/consumer-uuid-123/jwt') && options?.method === 'POST') {
          // Verify the request body contains key and secret
          const body = JSON.parse(options.body);
          expect(body).toHaveProperty('key');
          expect(body).toHaveProperty('secret');
          expect(typeof body.key).toBe('string');
          expect(typeof body.secret).toBe('string');

          return {
            ok: true,
            status: 201,
            json: async () => mockCreatedSecret,
          };
        }

        return { ok: false, status: 404 };
      }) as any;

      const result = await kongService.createConsumerSecret(testConsumerId);

      expect(result).toEqual(mockCreatedSecret);
      expect(global.fetch).toHaveBeenCalledTimes(2); // consumer check, JWT creation

      global.fetch = originalFetch;
    });

    it('should return null when consumer does not exist', async () => {
      // Mock consumer not found
      global.fetch = mock(async (url) => {
        const urlStr = url.toString();

        // Mock consumer not found (404)
        if (urlStr.includes(`/core-entities/consumers/${testConsumerId}`)) {
          return {
            ok: false,
            status: 404,
            statusText: 'Not Found',
          };
        }

        return { ok: false, status: 404 };
      }) as any;

      const result = await kongService.createConsumerSecret(testConsumerId);

      expect(result).toBeNull();

      global.fetch = originalFetch;
    });

    it('should handle creation errors gracefully', async () => {
      // Mock server error for all requests
      global.fetch = mock(async () => ({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Creation failed',
      })) as any;

      // With circuit breaker, errors are caught and null is returned
      // Without circuit breaker, the service should handle errors gracefully
      try {
        const result = await kongService.createConsumerSecret(testConsumerId);
        // Either circuit breaker returned null, or service handled error gracefully
        expect(result).toBeNull();
      } catch (error) {
        // If error is thrown, it should be a proper Kong error
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Unexpected error checking consumer');
      }

      global.fetch = originalFetch;
    });

  });

  describe('healthCheck', () => {
    it('should return healthy status when Kong is accessible', async () => {
      // Mock successful health check
      global.fetch = mock(async () => ({
        ok: true,
        status: 200,
      })) as any;

      const result = await kongService.healthCheck();

      expect(result.healthy).toBe(true);
      expect(typeof result.responseTime).toBe('number');
      expect(result.responseTime).toBeGreaterThan(0);
      expect(result.error).toBeUndefined();

      global.fetch = originalFetch;
    });

    it('should return unhealthy status when Kong returns error', async () => {
      // Mock error response
      global.fetch = mock(async () => ({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
      })) as any;

      // Health check should handle errors gracefully or use circuit breaker fallback
      try {
        const result = await kongService.healthCheck();
        expect(result.healthy).toBe(false);
        expect(typeof result.responseTime).toBe('number');
        // Accept either direct error or circuit breaker fallback message
        expect(result.error).toMatch(/(HTTP 503|Circuit breaker open - Kong Admin API unavailable)/);
      } catch (error) {
        // If error is thrown, it should be a proper Kong error
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('HTTP 503');
      }

      global.fetch = originalFetch;
    });

    it('should return unhealthy status when Kong is unreachable', async () => {
      // Mock network error
      global.fetch = mock(async () => {
        throw new Error('Connection refused');
      }) as any;

      // Health check should handle errors gracefully or use circuit breaker fallback
      try {
        const result = await kongService.healthCheck();
        expect(result.healthy).toBe(false);
        expect(typeof result.responseTime).toBe('number');
        // Accept either direct error or circuit breaker fallback message
        expect(result.error).toMatch(/(Connection refused|Circuit breaker open - Kong Admin API unavailable)/);
      } catch (error) {
        // If error is thrown, it should be a proper network error
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Connection refused');
      }

      global.fetch = originalFetch;
    });

    it('should complete health check within reasonable time', async () => {
      global.fetch = mock(async () => ({
        ok: true,
        status: 200,
      })) as any;

      const start = Bun.nanoseconds();
      await kongService.healthCheck();
      const duration = (Bun.nanoseconds() - start) / 1_000_000;

      expect(duration).toBeLessThan(100); // Should complete within 100ms

      global.fetch = originalFetch;
    });
  });


  describe('error handling and resilience', () => {
    it('should handle timeout gracefully', async () => {
      // Mock AbortSignal timeout behavior
      global.fetch = mock(async (url, options) => {
        // Simulate timeout by throwing AbortError
        const error = new Error('This operation was aborted');
        error.name = 'AbortError';
        throw error;
      }) as any;

      // With circuit breaker, errors are caught and null is returned
      // Without circuit breaker, the service should handle errors gracefully
      try {
        const result = await kongService.getConsumerSecret(testConsumerId);
        // Either circuit breaker returned null, or service handled error gracefully
        expect(result).toBeNull();
      } catch (error) {
        // If error is thrown, it should be a proper abort error
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('This operation was aborted');
      }

      global.fetch = originalFetch;
    });

  });
});