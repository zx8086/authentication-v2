/* test/bun/jwt.service.test.ts */

// Unit tests for native Bun JWT service implementation

import { describe, it, test, expect, beforeAll } from 'bun:test';
import { NativeBunJWT } from '../../src/services/jwt.service';

describe('NativeBunJWT', () => {
  const testUsername = process.env.TEST_JWT_USERNAME || 'mock-user';
  const testConsumerKey = process.env.TEST_JWT_CONSUMER_KEY || 'mock-key';
  const testSecret = process.env.TEST_JWT_SECRET || Array(45).fill('s').join('');
  const testAuthority = process.env.TEST_JWT_AUTHORITY || 'https://mock-authority.com';
  const testAudience = process.env.TEST_JWT_AUDIENCE || 'mock-audience';

  describe('createToken', () => {
    test.concurrent('should create a valid JWT token', async () => {
      const tokenResponse = await NativeBunJWT.createToken(
        testUsername,
        testConsumerKey,
        testSecret,
        testAuthority,
        testAudience
      );

      expect(tokenResponse).toHaveProperty('access_token');
      expect(tokenResponse).toHaveProperty('expires_in');
      expect(tokenResponse.expires_in).toBe(900);
      expect(typeof tokenResponse.access_token).toBe('string');

      const parts = tokenResponse.access_token.split('.');
      expect(parts).toHaveLength(3);
    });

    test.concurrent('should create tokens with correct header', async () => {
      const tokenResponse = await NativeBunJWT.createToken(
        testUsername,
        testConsumerKey,
        testSecret,
        testAuthority,
        testAudience
      );

      const [headerB64] = tokenResponse.access_token.split('.');
      const header = JSON.parse(atob(headerB64.replace(/-/g, '+').replace(/_/g, '/')));

      expect(header).toEqual({
        alg: 'HS256',
        typ: 'JWT'
      });
    });

    it('should create tokens with correct payload structure', async () => {
      const tokenResponse = await NativeBunJWT.createToken(
        testUsername,
        testConsumerKey,
        testSecret,
        testAuthority,
        testAudience
      );

      const [, payloadB64] = tokenResponse.access_token.split('.');
      const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));

      expect(payload).toHaveProperty('sub', testUsername);
      expect(payload).toHaveProperty('key', testConsumerKey);
      expect(payload).toHaveProperty('iss', testAuthority);
      expect(payload).toHaveProperty('aud', testAudience);
      expect(payload).toHaveProperty('name', testUsername);
      expect(payload).toHaveProperty('unique_name', `pvhcorp.com#${testUsername}`);
      expect(payload).toHaveProperty('jti');
      expect(payload).toHaveProperty('iat');
      expect(payload).toHaveProperty('exp');

      const now = Math.floor(Date.now() / 1000);
      expect(payload.exp).toBeGreaterThan(now + 890);
      expect(payload.exp).toBeLessThan(now + 910);
    });

    it('should create unique tokens', async () => {
      const token1 = await NativeBunJWT.createToken(
        testUsername,
        testConsumerKey,
        testSecret,
        testAuthority,
        testAudience
      );

      const token2 = await NativeBunJWT.createToken(
        testUsername,
        testConsumerKey,
        testSecret,
        testAuthority,
        testAudience
      );

      expect(token1.access_token).not.toBe(token2.access_token);
    });

    it('should handle different inputs correctly', async () => {
      const specialUsername = 'user@test.com';
      const tokenResponse = await NativeBunJWT.createToken(
        specialUsername,
        testConsumerKey,
        testSecret,
        testAuthority,
        testAudience
      );

      const [, payloadB64] = tokenResponse.access_token.split('.');
      const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));

      expect(payload.sub).toBe(specialUsername);
      expect(payload.unique_name).toBe(`pvhcorp.com#${specialUsername}`);
    });

    it('should complete within performance threshold', async () => {
      const start = Bun.nanoseconds();

      await NativeBunJWT.createToken(
        testUsername,
        testConsumerKey,
        testSecret,
        testAuthority,
        testAudience
      );

      const duration = (Bun.nanoseconds() - start) / 1_000_000;
      expect(duration).toBeLessThan(50);
    });
  });

  describe('concurrent token operations', () => {
    it('should handle concurrent token creation efficiently', async () => {
      const concurrentRequests = 10;
      const promises = Array.from({ length: concurrentRequests }, (_, i) =>
        NativeBunJWT.createToken(
          `user-${i}`,
          `key-${i}`,
          testSecret,
          testAuthority,
          testAudience
        )
      );

      const start = Bun.nanoseconds();
      const results = await Promise.all(promises);
      const duration = (Bun.nanoseconds() - start) / 1_000_000;

      expect(results).toHaveLength(concurrentRequests);
      expect(results.every(r => r.access_token && r.expires_in === 900)).toBe(true);
      expect(duration).toBeLessThan(200);
    });
  });
});