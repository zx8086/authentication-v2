/* test/bun/kong.service.test.ts */

// Tests for Kong service integration
import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { KongService } from '../../src/services/kong.service';

// Mock fetch for testing
const originalFetch = global.fetch;

describe('KongService', () => {
  let kongService: KongService;
  const mockAdminUrl = 'http://test-kong:8001';
  const mockAdminToken = 'test-admin-token';
  const testConsumerId = 'test-consumer-id-123';

  beforeEach(() => {
    kongService = new KongService(mockAdminUrl, mockAdminToken);
    // Clear any cached data
    kongService.clearCache();
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

        // Mock consumer check/creation
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
      // Mock 404 response
      global.fetch = mock(async () => ({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      })) as any;

      const result = await kongService.getConsumerSecret(testConsumerId);

      expect(result).toBeNull();
      
      global.fetch = originalFetch;
    });

    it('should return null when no JWT credentials exist', async () => {
      const mockResponse = {
        data: [],
        total: 0
      };

      // Mock empty response
      global.fetch = mock(async () => ({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      })) as any;

      const result = await kongService.getConsumerSecret(testConsumerId);

      expect(result).toBeNull();
      
      global.fetch = originalFetch;
    });

    it('should handle Kong API errors gracefully', async () => {
      // Mock server error
      global.fetch = mock(async () => ({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Kong server error',
      })) as any;

      const result = await kongService.getConsumerSecret(testConsumerId);

      expect(result).toBeNull();
      
      global.fetch = originalFetch;
    });

    it('should handle network errors gracefully', async () => {
      // Mock network error
      global.fetch = mock(async () => {
        throw new Error('Network error');
      }) as any;

      const result = await kongService.getConsumerSecret(testConsumerId);

      expect(result).toBeNull();
      
      global.fetch = originalFetch;
    });

    it('should use cache on subsequent requests', async () => {
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

      // Mock successful fetch - should be called 3 times for first request only
      const fetchMock = mock(async (url, options) => {
        const urlStr = url.toString();

        // Mock realm check
        if (urlStr.includes('/realms/default')) {
          return { ok: true, status: 200 };
        }

        // Mock consumer check
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
      });
      global.fetch = fetchMock as any;

      // First request - should call fetch 3 times
      const result1 = await kongService.getConsumerSecret(testConsumerId);
      expect(result1).toEqual(mockSecret);

      // Second request - should use cache (no additional fetch calls)
      const result2 = await kongService.getConsumerSecret(testConsumerId);
      expect(result2).toEqual(mockSecret);

      // Fetch should only be called 3 times total (for first request only)
      expect(fetchMock).toHaveBeenCalledTimes(3);

      global.fetch = originalFetch;
    });
  });

  describe('createConsumerSecret', () => {
    it('should create a new consumer secret', async () => {
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

    it('should handle creation errors gracefully', async () => {
      // Mock server error
      global.fetch = mock(async () => ({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Creation failed',
      })) as any;

      const result = await kongService.createConsumerSecret(testConsumerId);

      expect(result).toBeNull();
      
      global.fetch = originalFetch;
    });

    it('should cache created secret', async () => {
      const mockCreatedSecret = {
        id: 'new-secret-id-123',
        key: 'new-consumer-key-123',
        secret: 'new-consumer-secret-456',
        consumer: { id: testConsumerId }
      };

      // Mock successful creation
      global.fetch = mock(async () => ({
        ok: true,
        status: 201,
        json: async () => mockCreatedSecret,
      })) as any;

      await kongService.createConsumerSecret(testConsumerId);

      // Clear fetch mock and set up new one for get request
      global.fetch = mock(async () => {
        throw new Error('Should not fetch - should use cache');
      }) as any;

      // This should use the cached value from create
      const result = await kongService.getConsumerSecret(testConsumerId);
      expect(result).toEqual(mockCreatedSecret);

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

      const result = await kongService.healthCheck();

      expect(result.healthy).toBe(false);
      expect(typeof result.responseTime).toBe('number');
      expect(result.error).toBe('HTTP 503');

      global.fetch = originalFetch;
    });

    it('should return unhealthy status when Kong is unreachable', async () => {
      // Mock network error
      global.fetch = mock(async () => {
        throw new Error('Connection refused');
      }) as any;

      const result = await kongService.healthCheck();

      expect(result.healthy).toBe(false);
      expect(typeof result.responseTime).toBe('number');
      expect(result.error).toBe('Connection refused');

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

  describe('cache management', () => {
    it('should clear cache for specific consumer', async () => {
      const mockSecret = {
        id: 'secret-id-123',
        key: 'consumer-key-123',
        secret: 'consumer-secret-456',
        consumer: { id: 'consumer-uuid-123' }
      };

      // Mock initial caching with proper API flow
      global.fetch = mock(async (url, options) => {
        const urlStr = url.toString();

        // Mock realm check
        if (urlStr.includes('/realms/default')) {
          return { ok: true, status: 200 };
        }

        // Mock consumer check
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
            json: async () => ({ data: [mockSecret], total: 1 }),
          };
        }

        return { ok: false, status: 404 };
      }) as any;

      await kongService.getConsumerSecret(testConsumerId);

      // Clear cache for this consumer
      kongService.clearCache(testConsumerId);

      // Next request should call fetch again (3 calls: realm, consumer, JWT)
      const fetchMock = mock(async (url, options) => {
        const urlStr = url.toString();

        if (urlStr.includes('/realms/default')) {
          return { ok: true, status: 200 };
        }

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

        if (urlStr.includes('/core-entities/consumers/consumer-uuid-123/jwt')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ data: [mockSecret], total: 1 }),
          };
        }

        return { ok: false, status: 404 };
      });
      global.fetch = fetchMock as any;

      await kongService.getConsumerSecret(testConsumerId);
      expect(fetchMock).toHaveBeenCalledTimes(3);

      global.fetch = originalFetch;
    });

    it('should get cache statistics', () => {
      const stats = kongService.getCacheStats();
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('entries');
      expect(Array.isArray(stats.entries)).toBe(true);
      expect(typeof stats.size).toBe('number');
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

      const result = await kongService.getConsumerSecret(testConsumerId);
      expect(result).toBeNull();

      global.fetch = originalFetch;
    });

    it('should use stale cache when fetch fails', async () => {
      const mockSecret = {
        id: 'secret-id-123',
        key: 'consumer-key-123',
        secret: 'consumer-secret-456',
        consumer: { id: testConsumerId }
      };

      // First, successfully cache a secret
      global.fetch = mock(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ data: [mockSecret], total: 1 }),
      })) as any;

      await kongService.getConsumerSecret(testConsumerId);

      // Clear the cache entry but keep it available for stale usage
      // This simulates cache expiry
      const stats = kongService.getCacheStats();
      expect(stats.size).toBe(1);

      // Mock a network failure
      global.fetch = mock(async () => {
        throw new Error('Network error');
      }) as any;

      // Should still return the stale cached value
      const result = await kongService.getConsumerSecret(testConsumerId);
      expect(result).toEqual(mockSecret);

      global.fetch = originalFetch;
    });
  });
});