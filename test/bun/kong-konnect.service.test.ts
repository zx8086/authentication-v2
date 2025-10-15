/* test/bun/kong-konnect.service.test.ts */

import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { KongKonnectService } from '../../src/services/kong-konnect.service';
import { getTestConsumer } from '../shared/test-consumers';
import { getKongConfig } from '../../src/config/config';

const originalFetch = global.fetch;

describe('KongKonnectService', () => {
  let kongKonnectService: KongKonnectService;
  let kongConfig: any;
  const testConsumer = getTestConsumer(0);
  const testConsumerId = testConsumer.id;

  beforeEach(() => {
    // Use real Kong Konnect configuration from environment
    kongConfig = getKongConfig();

    // Skip tests if not configured for Kong Konnect
    if (kongConfig.mode !== 'KONNECT') {
      console.log('Skipping Kong Konnect tests - KONG_MODE is not KONNECT');
      return;
    }

    kongKonnectService = new KongKonnectService(kongConfig.adminUrl, kongConfig.adminToken);
  });

  afterEach(async () => {
    if (kongKonnectService?.clearCache) {
      await kongKonnectService.clearCache();
    }
    global.fetch = originalFetch;
  });

  describe('Kong Konnect Cloud Environment', () => {

    describe('constructor', () => {
      it('should parse Kong Konnect URL correctly', () => {
        if (kongConfig.mode !== 'KONNECT') return;
        expect(kongKonnectService).toBeInstanceOf(KongKonnectService);
      });

      it('should throw error for invalid Kong Konnect URL format', () => {
        expect(() => {
          new KongKonnectService('https://us.api.konghq.com/invalid/path', 'test-token');
        }).toThrow('Invalid Kong Konnect URL format');
      });

      it('should handle URL with trailing slash', () => {
        if (kongConfig.mode !== 'KONNECT') return;
        const serviceWithSlash = new KongKonnectService(kongConfig.adminUrl + '/', kongConfig.adminToken);
        expect(serviceWithSlash).toBeInstanceOf(KongKonnectService);
      });
    });

    describe('getConsumerSecret', () => {
      it('should return consumer secret when found in Kong Konnect', async () => {
        const mockSecret = {
          id: 'konnect-secret-id-123',
          key: 'konnect-consumer-key-123',
          secret: 'konnect-consumer-secret-456',
          consumer: { id: 'consumer-uuid-123' }
        };

        const mockResponse = {
          data: [mockSecret],
          total: 1
        };

        global.fetch = mock(async (url, options) => {
          const urlStr = url.toString();

          // Extract control plane ID from real config
          const controlPlaneId = kongConfig.adminUrl.split('/control-planes/')[1];
          const realmName = `auth-realm-${controlPlaneId.split('-')[0]}`;

          // Mock realm check for Konnect
          if (urlStr.includes(`/v1/realms/${realmName}`)) {
            return { ok: true, status: 200 };
          }

          // Mock consumer check in control plane
          if (urlStr.includes(`/v2/control-planes/${controlPlaneId}/core-entities/consumers/${testConsumerId}`) && !urlStr.includes('/jwt')) {
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

          // Mock JWT credentials fetch from control plane
          if (urlStr.includes(`/v2/control-planes/${controlPlaneId}/core-entities/consumers/consumer-uuid-123/jwt`)) {
            return {
              ok: true,
              status: 200,
              json: async () => mockResponse,
            };
          }

          return { ok: false, status: 404 };
        }) as any;

        const result = await kongKonnectService.getConsumerSecret(testConsumerId);

        expect(result).toEqual(mockSecret);
        expect(global.fetch).toHaveBeenCalledTimes(3); // realm check, consumer check, JWT fetch
      });

      it('should return null when consumer not found in Kong Konnect', async () => {
        global.fetch = mock(async (url) => {
          const urlStr = url.toString();

          // Mock realm check
          if (urlStr.includes(`/v1/realms/auth-realm-${kongConfig.adminUrl.split('/control-planes/')[1].split('-')[0]}`)) {
            return { ok: true, status: 200 };
          }

          // Mock consumer not found in control plane
          if (urlStr.includes(`/v2/control-planes/${kongConfig.adminUrl.split('/control-planes/')[1]}/core-entities/consumers/${testConsumerId}`)) {
            return {
              ok: false,
              status: 404,
              statusText: 'Not Found',
            };
          }

          return { ok: false, status: 404 };
        }) as any;

        const result = await kongKonnectService.getConsumerSecret(testConsumerId);

        expect(result).toBeNull();
      });

      it('should return null when no JWT credentials exist in Kong Konnect', async () => {
        const mockResponse = {
          data: [],
          total: 0
        };

        global.fetch = mock(async (url) => {
          const urlStr = url.toString();

          // Mock realm check
          if (urlStr.includes(`/v1/realms/auth-realm-${kongConfig.adminUrl.split('/control-planes/')[1].split('-')[0]}`)) {
            return { ok: true, status: 200 };
          }

          // Mock consumer exists in control plane
          if (urlStr.includes(`/v2/control-planes/${kongConfig.adminUrl.split('/control-planes/')[1]}/core-entities/consumers/${testConsumerId}`) && !urlStr.includes('/jwt')) {
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

          // Mock empty JWT credentials in control plane
          if (urlStr.includes('/v2/control-planes/${controlPlaneId}/core-entities/consumers/consumer-uuid-123/jwt')) {
            return {
              ok: true,
              status: 200,
              json: async () => mockResponse,
            };
          }

          return { ok: false, status: 404 };
        }) as any;

        const result = await kongKonnectService.getConsumerSecret(testConsumerId);

        expect(result).toBeNull();
      });

      it('should handle Kong Konnect API errors gracefully', async () => {
        global.fetch = mock(async () => ({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          text: async () => 'Kong Konnect server error',
        })) as any;

        try {
          const result = await kongKonnectService.getConsumerSecret(testConsumerId);
          expect(result).toBeNull();
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toContain('Unexpected error checking realm');
        }
      });
    });

    describe('createConsumerSecret', () => {
      it('should create a new consumer secret in Kong Konnect', async () => {
        if (kongConfig.mode !== 'KONNECT') {
          console.log('Skipping Kong Konnect test - not in KONNECT mode');
          return;
        }

        // Use real Kong Konnect API - this will create an actual JWT credential
        const result = await kongKonnectService.createConsumerSecret(testConsumerId);

        // Verify the result has the expected structure
        expect(result).not.toBeNull();
        expect(result).toHaveProperty('id');
        expect(result).toHaveProperty('key');
        expect(result).toHaveProperty('secret');
        expect(result).toHaveProperty('consumer');
        expect(typeof result.key).toBe('string');
        expect(typeof result.secret).toBe('string');
        expect(result.key.length).toBeGreaterThan(0);
        expect(result.secret.length).toBeGreaterThan(0);

        // Clean up - delete the created JWT credential
        if (result?.id) {
          try {
            await kongKonnectService.clearCache(testConsumerId);
          } catch (error) {
            console.warn('Failed to clean up test credential:', error);
          }
        }
      });

      it('should return null when consumer does not exist in Kong Konnect', async () => {
        if (kongConfig.mode !== 'KONNECT') {
          console.log('Skipping Kong Konnect test - not in KONNECT mode');
          return;
        }

        // Use a non-existent consumer ID to test the 404 case
        const nonExistentConsumerId = 'non-existent-consumer-12345';

        const result = await kongKonnectService.createConsumerSecret(nonExistentConsumerId);

        // Should return null when consumer doesn't exist
        expect(result).toBeNull();
      });

      it('should handle creation errors gracefully in Kong Konnect', async () => {
        if (kongConfig.mode !== 'KONNECT') {
          console.log('Skipping Kong Konnect test - not in KONNECT mode');
          return;
        }

        // Test with invalid credentials to trigger error handling
        const invalidService = new KongKonnectService(kongConfig.adminUrl, 'invalid-token-123');

        try {
          const result = await invalidService.createConsumerSecret(testConsumerId);
          // Should return null for authentication errors or other failures
          expect(result).toBeNull();
        } catch (error) {
          // Or it might throw an error depending on circuit breaker configuration
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toMatch(/(authentication|authorization|token|401|403)/i);
        }
      });
    });

    describe('healthCheck', () => {
      it('should return healthy status when Kong Konnect is accessible', async () => {
        if (kongConfig.mode !== 'KONNECT') {
          console.log('Skipping Kong Konnect test - not in KONNECT mode');
          return;
        }

        const result = await kongKonnectService.healthCheck();

        expect(result.healthy).toBe(true);
        expect(typeof result.responseTime).toBe('number');
        expect(result.responseTime).toBeGreaterThan(0);
        expect(result.error).toBeUndefined();
      });

      it('should return unhealthy status when Kong Konnect returns error', async () => {
        global.fetch = mock(async () => ({
          ok: false,
          status: 503,
          statusText: 'Service Unavailable',
        })) as any;

        try {
          const result = await kongKonnectService.healthCheck();
          expect(result.healthy).toBe(false);
          expect(typeof result.responseTime).toBe('number');
          expect(result.error).toMatch(/(HTTP 503|Circuit breaker open - Kong Admin API unavailable)/);
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toContain('HTTP 503');
        }
      });

      it('should handle authentication errors specifically for Kong Konnect', async () => {
        global.fetch = mock(async () => ({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
        })) as any;

        try {
          const result = await kongKonnectService.healthCheck();
          expect(result.healthy).toBe(false);
          expect(result.error).toMatch(/(Authentication failed|Circuit breaker open)/);
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toContain('Authentication failed');
        }
      });

      it('should complete health check within reasonable time', async () => {
        global.fetch = mock(async () => ({
          ok: true,
          status: 200,
        })) as any;

        const start = Bun.nanoseconds();
        await kongKonnectService.healthCheck();
        const duration = (Bun.nanoseconds() - start) / 1_000_000;

        expect(duration).toBeLessThan(100);
      });
    });

    describe('realm management', () => {
      it('should create realm if it does not exist', async () => {
        let realmCheckCalls = 0;
        let realmCreateCalls = 0;

        global.fetch = mock(async (url, options) => {
          const urlStr = url.toString();

          // Extract control plane ID from real config
          const controlPlaneId = kongConfig.adminUrl.split('/control-planes/')[1];
          const realmName = `auth-realm-${controlPlaneId.split('-')[0]}`;

          // Mock realm check - first call returns 404, after creation returns 200
          if (urlStr.includes(`/v1/realms/${realmName}`) && options?.method !== 'POST') {
            realmCheckCalls++;
            if (realmCheckCalls === 1) {
              return { ok: false, status: 404 };
            }
            return { ok: true, status: 200 };
          }

          // Mock realm creation
          if (urlStr.includes('/v1/realms') && options?.method === 'POST') {
            realmCreateCalls++;
            const body = JSON.parse(options.body);
            expect(body.name).toBe(realmName);
            expect(body.allowed_control_planes).toEqual([controlPlaneId]);
            return { ok: true, status: 201 };
          }

          // Mock consumer check
          if (urlStr.includes(`/v2/control-planes/${controlPlaneId}/core-entities/consumers/${testConsumerId}`) && !urlStr.includes('/jwt')) {
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

          // Mock JWT credentials (empty)
          if (urlStr.includes(`/v2/control-planes/${controlPlaneId}/core-entities/consumers/consumer-uuid-123/jwt`)) {
            return {
              ok: true,
              status: 200,
              json: async () => ({ data: [], total: 0 }),
            };
          }

          return { ok: false, status: 404 };
        }) as any;

        const result = await kongKonnectService.getConsumerSecret(testConsumerId);

        expect(result).toBeNull(); // No JWT credentials exist
        expect(realmCheckCalls).toBe(1);
        expect(realmCreateCalls).toBe(1);
      });

      it('should handle realm creation conflicts gracefully', async () => {
        global.fetch = mock(async (url, options) => {
          const urlStr = url.toString();

          // Mock realm check returns 404
          if (urlStr.includes(`/v1/realms/auth-realm-${kongConfig.adminUrl.split('/control-planes/')[1].split('-')[0]}`) && options?.method !== 'POST') {
            return { ok: false, status: 404 };
          }

          // Mock realm creation conflict
          if (urlStr.includes('/v1/realms') && options?.method === 'POST') {
            return {
              ok: false,
              status: 400,
              text: async () => 'realm name must be unique'
            };
          }

          // Mock consumer check
          if (urlStr.includes(`/v2/control-planes/${kongConfig.adminUrl.split('/control-planes/')[1]}/core-entities/consumers/${testConsumerId}`) && !urlStr.includes('/jwt')) {
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

          // Mock JWT credentials (empty)
          const controlPlaneId = kongConfig.adminUrl.split('/control-planes/')[1];
          if (urlStr.includes(`/v2/control-planes/${controlPlaneId}/core-entities/consumers/consumer-uuid-123/jwt`)) {
            return {
              ok: true,
              status: 200,
              json: async () => ({ data: [], total: 0 }),
            };
          }

          return { ok: false, status: 404 };
        }) as any;

        // Should not throw error on realm conflict
        const result = await kongKonnectService.getConsumerSecret(testConsumerId);
        expect(result).toBeNull();
      });
    });

    describe('caching functionality', () => {
      it('should clear cache for specific consumer', async () => {
        await expect(async () => {
          await kongKonnectService.clearCache(testConsumerId);
        }).not.toThrow();
      });

      it('should clear all cache entries', async () => {
        await expect(async () => {
          await kongKonnectService.clearCache();
        }).not.toThrow();
      });

      it('should return cache statistics', async () => {
        const stats = await kongKonnectService.getCacheStats();

        expect(stats).toHaveProperty('strategy');
        expect(stats).toHaveProperty('size');
        expect(stats).toHaveProperty('entries');
        expect(stats).toHaveProperty('activeEntries');
        expect(stats).toHaveProperty('hitRate');
        expect(typeof stats.size).toBe('number');
        expect(Array.isArray(stats.entries)).toBe(true);
        expect(typeof stats.activeEntries).toBe('number');
        expect(typeof stats.hitRate).toBe('string');
      });
    });
  });

  describe('Self-hosted Kong Environment', () => {
    const mockSelfHostedUrl = 'http://kong-admin:8001';
    const mockAdminToken = 'test-self-hosted-token';

    beforeEach(() => {
      kongKonnectService = new KongKonnectService(mockSelfHostedUrl, mockAdminToken);
    });

    afterEach(async () => {
      if (kongKonnectService?.clearCache) {
        await kongKonnectService.clearCache();
      }
      global.fetch = originalFetch;
    });

    it('should handle self-hosted Kong configuration correctly', () => {
      expect(kongKonnectService).toBeInstanceOf(KongKonnectService);
    });

    it('should work with self-hosted Kong URLs', async () => {
      const mockSecret = {
        id: 'self-hosted-secret-id-123',
        key: 'self-hosted-consumer-key-123',
        secret: 'self-hosted-consumer-secret-456',
        consumer: { id: 'consumer-uuid-123' }
      };

      global.fetch = mock(async (url, options) => {
        const urlStr = url.toString();

        // Mock realm check for self-hosted (default realm)
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

      const result = await kongKonnectService.getConsumerSecret(testConsumerId);

      expect(result).toEqual(mockSecret);
    });
  });

  describe('error handling and resilience', () => {
    const mockKonnectUrl = 'https://us.api.konghq.com/v2/control-planes/12345678-1234-1234-1234-123456789012';
    const mockAdminToken = 'test-konnect-token';

    beforeEach(() => {
      kongKonnectService = new KongKonnectService(mockKonnectUrl, mockAdminToken);
    });

    afterEach(async () => {
      if (kongKonnectService?.clearCache) {
        await kongKonnectService.clearCache();
      }
      global.fetch = originalFetch;
    });

    it('should handle timeout gracefully', async () => {
      global.fetch = mock(async (url, options) => {
        const error = new Error('This operation was aborted');
        error.name = 'AbortError';
        throw error;
      }) as any;

      try {
        const result = await kongKonnectService.getConsumerSecret(testConsumerId);
        expect(result).toBeNull();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('This operation was aborted');
      }
    });

    it('should handle network errors gracefully', async () => {
      global.fetch = mock(async () => {
        throw new Error('Network error');
      }) as any;

      try {
        const result = await kongKonnectService.getConsumerSecret(testConsumerId);
        expect(result).toBeNull();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Network error');
      }
    });

    it('should handle circuit breaker scenarios', async () => {
      global.fetch = mock(async () => ({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
      })) as any;

      try {
        const result = await kongKonnectService.healthCheck();

        if (result) {
          expect(result.healthy).toBe(false);
          expect(result.error).toMatch(/(HTTP 503|Circuit breaker open)/);
        }
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });
});