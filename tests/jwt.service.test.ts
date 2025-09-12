/* tests/jwt.service.test.ts */

// Tests for JWT service using Bun's native test runner
import { describe, it, expect, beforeAll } from 'bun:test';
import { NativeBunJWT } from '../src/services/jwt.service';

describe('NativeBunJWT', () => {
  const testUsername = 'test-user';
  const testConsumerKey = 'test-key-123';
  const testSecret = 'test-secret-very-long-and-secure';
  const testAuthority = 'https://test-authority.com';
  const testAudience = 'test-audience';

  describe('createToken', () => {
    it('should create a valid JWT token', async () => {
      const tokenResponse = await NativeBunJWT.createToken(
        testUsername,
        testConsumerKey,
        testSecret,
        testAuthority,
        testAudience
      );

      expect(tokenResponse).toHaveProperty('access_token');
      expect(tokenResponse).toHaveProperty('expires_in');
      expect(tokenResponse.expires_in).toBe(900); // 15 minutes
      expect(typeof tokenResponse.access_token).toBe('string');
      
      // JWT should have 3 parts separated by dots
      const parts = tokenResponse.access_token.split('.');
      expect(parts).toHaveLength(3);
    });

    it('should create tokens with correct header', async () => {
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
      
      // Check expiration is approximately 15 minutes from now
      const now = Math.floor(Date.now() / 1000);
      expect(payload.exp).toBeGreaterThan(now + 890); // Allow some leeway
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
      expect(duration).toBeLessThan(50); // Should complete within 50ms
    });
  });

  describe('verifyToken', () => {
    let validToken: string;

    beforeAll(async () => {
      const tokenResponse = await NativeBunJWT.createToken(
        testUsername,
        testConsumerKey,
        testSecret,
        testAuthority,
        testAudience
      );
      validToken = tokenResponse.access_token;
    });

    it('should verify a valid token', async () => {
      const payload = await NativeBunJWT.verifyToken(validToken, testSecret);
      
      expect(payload).not.toBeNull();
      expect(payload!.sub).toBe(testUsername);
      expect(payload!.key).toBe(testConsumerKey);
      expect(payload!.iss).toBe(testAuthority);
      expect(payload!.aud).toBe(testAudience);
    });

    it('should reject token with wrong secret', async () => {
      const payload = await NativeBunJWT.verifyToken(validToken, 'wrong-secret');
      expect(payload).toBeNull();
    });

    it('should reject malformed tokens', async () => {
      const malformedTokens = [
        'invalid.token',
        'invalid.token.format.too.many.parts',
        '',
        'not-a-jwt-at-all',
        'header.payload', // Missing signature
      ];

      for (const token of malformedTokens) {
        const payload = await NativeBunJWT.verifyToken(token, testSecret);
        expect(payload).toBeNull();
      }
    });

    it('should reject expired token', async () => {
      // Create a token that's already expired
      const expiredPayload = {
        sub: testUsername,
        key: testConsumerKey,
        jti: crypto.randomUUID(),
        iat: Math.floor(Date.now() / 1000) - 1000,
        exp: Math.floor(Date.now() / 1000) - 500, // Expired 500 seconds ago
        iss: testAuthority,
        aud: testAudience,
        name: testUsername,
        unique_name: `pvhcorp.com#${testUsername}`
      };

      // Manually create an expired token for testing
      const header = { alg: 'HS256', typ: 'JWT' };
      const headerB64 = btoa(JSON.stringify(header)).replace(/[+/=]/g, (m) => ({'+':'-','/':'_','=':''}[m]));
      const payloadB64 = btoa(JSON.stringify(expiredPayload)).replace(/[+/=]/g, (m) => ({'+':'-','/':'_','=':''}[m]));
      const message = `${headerB64}.${payloadB64}`;

      // Sign it properly
      const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(testSecret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
      const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
        .replace(/[+/=]/g, (m) => ({'+':'-','/':'_','=':''}[m]));
      
      const expiredToken = `${message}.${signatureB64}`;

      const payload = await NativeBunJWT.verifyToken(expiredToken, testSecret);
      expect(payload).toBeNull();
    });

    it('should complete verification within performance threshold', async () => {
      const start = Bun.nanoseconds();
      
      await NativeBunJWT.verifyToken(validToken, testSecret);
      
      const duration = (Bun.nanoseconds() - start) / 1_000_000;
      expect(duration).toBeLessThan(20); // Should complete within 20ms
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
      expect(duration).toBeLessThan(200); // Should complete within 200ms
    });

    it('should handle concurrent token verification efficiently', async () => {
      // Create tokens first
      const tokens = await Promise.all(
        Array.from({ length: 5 }, (_, i) =>
          NativeBunJWT.createToken(
            `user-${i}`,
            `key-${i}`,
            testSecret,
            testAuthority,
            testAudience
          )
        )
      );

      // Verify them concurrently
      const start = Bun.nanoseconds();
      const results = await Promise.all(
        tokens.map(token => NativeBunJWT.verifyToken(token.access_token, testSecret))
      );
      const duration = (Bun.nanoseconds() - start) / 1_000_000;

      expect(results).toHaveLength(5);
      expect(results.every(r => r !== null)).toBe(true);
      expect(duration).toBeLessThan(100); // Should complete within 100ms
    });
  });
});