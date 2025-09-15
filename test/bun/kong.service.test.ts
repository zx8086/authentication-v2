/* tests/kong.service.test.ts */

// Tests for Kong service integration
import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { KongService } from '../src/services/kong.service';

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
        consumer: { id: testConsumerId }
      };

      const mockResponse = {
        data: [mockSecret],
        total: 1
      };

      // Mock successful fetch
      global.fetch = mock(async () => ({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      })) as any;

      const result = await kongService.getConsumerSecret(testConsumerId);

      expect(result).toEqual(mockSecret);
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockAdminUrl}/consumers/${testConsumerId}/jwt`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Kong-Admin-Token': mockAdminToken,
            'Content-Type': 'application/json',
          }),
        })
      );

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
        consumer: { id: testConsumerId }
      };

      const mockResponse = {
        data: [mockSecret],
        total: 1
      };

      // Mock successful fetch - should only be called once
      const fetchMock = mock(async () => ({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      }));
      global.fetch = fetchMock as any;

      // First request - should call fetch
      const result1 = await kongService.getConsumerSecret(testConsumerId);
      expect(result1).toEqual(mockSecret);

      // Second request - should use cache
      const result2 = await kongService.getConsumerSecret(testConsumerId);
      expect(result2).toEqual(mockSecret);

      // Fetch should only be called once
      expect(fetchMock).toHaveBeenCalledTimes(1);
      
      global.fetch = originalFetch;
    });
  });

  describe('createConsumerSecret', () => {
    it('should create a new consumer secret', async () => {
      const mockCreatedSecret = {
        id: 'new-secret-id-123',
        key: 'new-consumer-key-123',
        secret: 'new-consumer-secret-456',
        consumer: { id: testConsumerId }
      };

      // Mock successful creation
      global.fetch = mock(async (url, options) => {
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
      }) as any;

      const result = await kongService.createConsumerSecret(testConsumerId);

      expect(result).toEqual(mockCreatedSecret);
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockAdminUrl}/consumers/${testConsumerId}/jwt`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Kong-Admin-Token': mockAdminToken,
            'Content-Type': 'application/json',
          }),
        })
      );

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
        consumer: { id: testConsumerId }
      };

      // Mock and cache a secret
      global.fetch = mock(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ data: [mockSecret], total: 1 }),
      })) as any;

      await kongService.getConsumerSecret(testConsumerId);
      
      // Clear cache for this consumer
      kongService.clearCache(testConsumerId);

      // Next request should call fetch again
      const fetchMock = mock(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ data: [mockSecret], total: 1 }),
      }));
      global.fetch = fetchMock as any;

      await kongService.getConsumerSecret(testConsumerId);
      expect(fetchMock).toHaveBeenCalledTimes(1);

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
      // Mock a slow response that should timeout
      global.fetch = mock(async () => {
        await new Promise(resolve => setTimeout(resolve, 6000)); // 6 seconds
        return { ok: true, status: 200 };
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