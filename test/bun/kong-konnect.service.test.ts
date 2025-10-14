/* test/bun/kong-konnect.service.test.ts */

import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { KongKonnectService } from '../../src/services/kong-konnect.service';
import { getTestConsumer } from '../shared/test-consumers';

const originalFetch = global.fetch;

describe('KongKonnectService', () => {
  let kongKonnectService: KongKonnectService;
  const testConsumer = getTestConsumer(0);
  const testConsumerId = testConsumer.id;

  describe('Kong Konnect Cloud Environment', () => {
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

    describe('constructor', () => {
      it('should parse Kong Konnect URL correctly', () => {
        expect(kongKonnectService).toBeInstanceOf(KongKonnectService);
      });

      it('should throw error for invalid Kong Konnect URL format', () => {
        expect(() => {
          new KongKonnectService('https://us.api.konghq.com/invalid/path', mockAdminToken);
        }).toThrow('Invalid Kong Konnect URL format');
      });

      it('should handle URL with trailing slash', () => {
        const serviceWithSlash = new KongKonnectService(mockKonnectUrl + '/', mockAdminToken);
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

          // Mock realm check for Konnect
          if (urlStr.includes('/v1/realms/auth-realm-12345678')) {
            return { ok: true, status: 200 };
          }

          // Mock consumer check in control plane
          if (urlStr.includes(`/v2/control-planes/12345678-1234-1234-1234-123456789012/core-entities/consumers/${testConsumerId}`) && !urlStr.includes('/jwt')) {
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
          if (urlStr.includes('/v2/control-planes/12345678-1234-1234-1234-123456789012/core-entities/consumers/consumer-uuid-123/jwt')) {
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
          if (urlStr.includes('/v1/realms/auth-realm-12345678')) {
            return { ok: true, status: 200 };
          }

          // Mock consumer not found in control plane
          if (urlStr.includes(`/v2/control-planes/12345678-1234-1234-1234-123456789012/core-entities/consumers/${testConsumerId}`)) {
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
          if (urlStr.includes('/v1/realms/auth-realm-12345678')) {
            return { ok: true, status: 200 };
          }

          // Mock consumer exists in control plane
          if (urlStr.includes(`/v2/control-planes/12345678-1234-1234-1234-123456789012/core-entities/consumers/${testConsumerId}`) && !urlStr.includes('/jwt')) {
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
          if (urlStr.includes('/v2/control-planes/12345678-1234-1234-1234-123456789012/core-entities/consumers/consumer-uuid-123/jwt')) {
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
        const mockCreatedSecret = {
          id: 'new-konnect-secret-id-123',
          key: 'new-konnect-consumer-key-123',
          secret: 'new-konnect-consumer-secret-456',
          consumer: { id: 'consumer-uuid-123' }
        };

        global.fetch = mock(async (url, options) => {
          const urlStr = url.toString();

          // Mock consumer check in control plane
          if (urlStr.includes(`/v2/control-planes/12345678-1234-1234-1234-123456789012/core-entities/consumers/${testConsumerId}`) && !urlStr.includes('/jwt')) {
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

          // Mock JWT credentials creation in control plane
          if (urlStr.includes('/v2/control-planes/12345678-1234-1234-1234-123456789012/core-entities/consumers/consumer-uuid-123/jwt') && options?.method === 'POST') {
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

        const result = await kongKonnectService.createConsumerSecret(testConsumerId);

        expect(result).toEqual(mockCreatedSecret);
        expect(global.fetch).toHaveBeenCalledTimes(2); // consumer check, JWT creation
      });

      it('should return null when consumer does not exist in Kong Konnect', async () => {
        global.fetch = mock(async (url) => {
          const urlStr = url.toString();

          // Mock consumer not found in control plane
          if (urlStr.includes(`/v2/control-planes/12345678-1234-1234-1234-123456789012/core-entities/consumers/${testConsumerId}`)) {
            return {
              ok: false,
              status: 404,
              statusText: 'Not Found',
            };
          }

          return { ok: false, status: 404 };
        }) as any;

        const result = await kongKonnectService.createConsumerSecret(testConsumerId);

        expect(result).toBeNull();
      });

      it('should handle creation errors gracefully in Kong Konnect', async () => {
        global.fetch = mock(async () => ({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          text: async () => 'Creation failed',
        })) as any;

        try {
          const result = await kongKonnectService.createConsumerSecret(testConsumerId);
          expect(result).toBeNull();
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toContain('Unexpected error checking consumer');
        }
      });
    });

    describe('healthCheck', () => {
      it('should return healthy status when Kong Konnect is accessible', async () => {
        global.fetch = mock(async () => ({
          ok: true,
          status: 200,
        })) as any;

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

          // Mock realm check - first call returns 404, after creation returns 200
          if (urlStr.includes('/v1/realms/auth-realm-12345678') && options?.method !== 'POST') {
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
            expect(body.name).toBe('auth-realm-12345678');
            expect(body.allowed_control_planes).toEqual(['12345678-1234-1234-1234-123456789012']);
            return { ok: true, status: 201 };
          }

          // Mock consumer check
          if (urlStr.includes(`/v2/control-planes/12345678-1234-1234-1234-123456789012/core-entities/consumers/${testConsumerId}`) && !urlStr.includes('/jwt')) {
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
          if (urlStr.includes('/v2/control-planes/12345678-1234-1234-1234-123456789012/core-entities/consumers/consumer-uuid-123/jwt')) {
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
          if (urlStr.includes('/v1/realms/auth-realm-12345678') && options?.method !== 'POST') {
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
          if (urlStr.includes(`/v2/control-planes/12345678-1234-1234-1234-123456789012/core-entities/consumers/${testConsumerId}`) && !urlStr.includes('/jwt')) {
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
          if (urlStr.includes('/v2/control-planes/12345678-1234-1234-1234-123456789012/core-entities/consumers/consumer-uuid-123/jwt')) {
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