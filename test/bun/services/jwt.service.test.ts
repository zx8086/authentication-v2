/* test/bun/jwt.service.test.ts */

// Unit tests for native Bun JWT service implementation

import { describe, expect, it, test } from "bun:test";
import { NativeBunJWT } from "../../../src/services/jwt.service";

describe("NativeBunJWT", () => {
  const testUsername = process.env.TEST_JWT_USERNAME || "mock-user";
  const testConsumerKey = process.env.TEST_JWT_CONSUMER_KEY || "mock-key";
  const testSecret = process.env.TEST_JWT_SECRET || Array(45).fill("s").join("");
  const testAuthority = process.env.TEST_JWT_AUTHORITY || "https://mock-authority.com";
  const testAudience = process.env.TEST_JWT_AUDIENCE || "mock-audience";

  describe("createToken", () => {
    test.concurrent("should create a valid JWT token", async () => {
      const tokenResponse = await NativeBunJWT.createToken(
        testUsername,
        testConsumerKey,
        testSecret,
        testAuthority,
        testAudience
      );

      expect(tokenResponse).toHaveProperty("access_token");
      expect(tokenResponse).toHaveProperty("expires_in");
      expect(tokenResponse.expires_in).toBe(900);
      expect(typeof tokenResponse.access_token).toBe("string");

      const parts = tokenResponse.access_token.split(".");
      expect(parts).toHaveLength(3);
    });

    test.concurrent("should create tokens with correct header", async () => {
      const tokenResponse = await NativeBunJWT.createToken(
        testUsername,
        testConsumerKey,
        testSecret,
        testAuthority,
        testAudience
      );

      const [headerB64] = tokenResponse.access_token.split(".");
      const header = JSON.parse(atob(headerB64.replace(/-/g, "+").replace(/_/g, "/")));

      expect(header).toEqual({
        alg: "HS256",
        typ: "JWT",
      });
    });

    it("should create tokens with correct payload structure", async () => {
      const tokenResponse = await NativeBunJWT.createToken(
        testUsername,
        testConsumerKey,
        testSecret,
        testAuthority,
        testAudience
      );

      const [, payloadB64] = tokenResponse.access_token.split(".");
      const payload = JSON.parse(atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/")));

      expect(payload).toHaveProperty("sub", testUsername);
      expect(payload).toHaveProperty("key", testConsumerKey);
      expect(payload).toHaveProperty("iss", testAuthority);
      expect(payload).toHaveProperty("aud", testAudience);
      expect(payload).toHaveProperty("name", testUsername);
      expect(payload).toHaveProperty("unique_name", `pvhcorp.com#${testUsername}`);
      expect(payload).toHaveProperty("jti");
      expect(payload).toHaveProperty("iat");
      expect(payload).toHaveProperty("exp");

      const now = Math.floor(Date.now() / 1000);
      expect(payload.exp).toBeGreaterThan(now + 890);
      expect(payload.exp).toBeLessThan(now + 910);
    });

    it("should create unique tokens", async () => {
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

    it("should handle different inputs correctly", async () => {
      const specialUsername = "user@test.com";
      const tokenResponse = await NativeBunJWT.createToken(
        specialUsername,
        testConsumerKey,
        testSecret,
        testAuthority,
        testAudience
      );

      const [, payloadB64] = tokenResponse.access_token.split(".");
      const payload = JSON.parse(atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/")));

      expect(payload.sub).toBe(specialUsername);
      expect(payload.unique_name).toBe(`pvhcorp.com#${specialUsername}`);
    });

    it("should complete within performance threshold", async () => {
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

  describe("concurrent token operations", () => {
    it("should handle concurrent token creation efficiently", async () => {
      const concurrentRequests = 10;
      const promises = Array.from({ length: concurrentRequests }, (_, i) =>
        NativeBunJWT.createToken(`user-${i}`, `key-${i}`, testSecret, testAuthority, testAudience)
      );

      const start = Bun.nanoseconds();
      const results = await Promise.all(promises);
      const duration = (Bun.nanoseconds() - start) / 1_000_000;

      expect(results).toHaveLength(concurrentRequests);
      expect(results.every((r) => r.access_token && r.expires_in === 900)).toBe(true);
      expect(duration).toBeLessThan(200);
    });
  });

  describe("validateToken", () => {
    test.concurrent("should validate a valid token", async () => {
      const tokenResponse = await NativeBunJWT.createToken(
        testUsername,
        testConsumerKey,
        testSecret,
        testAuthority,
        testAudience
      );

      const result = await NativeBunJWT.validateToken(tokenResponse.access_token, testSecret);

      expect(result.valid).toBe(true);
      expect(result.payload).toBeDefined();
      expect(result.payload?.sub).toBe(testUsername);
      expect(result.payload?.key).toBe(testConsumerKey);
      expect(result.payload?.iss).toBe(testAuthority);
      expect(result.payload?.aud).toBe(testAudience);
      expect(result.payload?.jti).toBeDefined();
    });

    test.concurrent("should reject token with invalid signature", async () => {
      const tokenResponse = await NativeBunJWT.createToken(
        testUsername,
        testConsumerKey,
        testSecret,
        testAuthority,
        testAudience
      );

      const wrongSecret = "wrong-secret-key-that-is-different";
      const result = await NativeBunJWT.validateToken(tokenResponse.access_token, wrongSecret);

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid signature");
    });

    test.concurrent("should reject token with invalid format - missing parts", async () => {
      const result = await NativeBunJWT.validateToken("invalid.token", testSecret);

      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid token format");
    });

    test.concurrent("should reject token with invalid format - no dots", async () => {
      const result = await NativeBunJWT.validateToken("invalidtoken", testSecret);

      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid token format");
    });

    test.concurrent("should detect expired tokens", async () => {
      const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");

      const expiredPayload = {
        sub: testUsername,
        key: testConsumerKey,
        jti: crypto.randomUUID(),
        iat: Math.floor(Date.now() / 1000) - 1800,
        exp: Math.floor(Date.now() / 1000) - 900,
        iss: testAuthority,
        aud: testAudience,
        name: testUsername,
        unique_name: `pvhcorp.com#${testUsername}`,
      };

      const payloadB64 = btoa(JSON.stringify(expiredPayload))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");

      const message = `${header}.${payloadB64}`;
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(testSecret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );

      const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
      const signatureB64 = Buffer.from(signature)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");

      const expiredToken = `${message}.${signatureB64}`;

      const result = await NativeBunJWT.validateToken(expiredToken, testSecret);

      expect(result.valid).toBe(false);
      expect(result.expired).toBe(true);
      expect(result.error).toBe("Token has expired");
      expect(result.payload).toBeDefined();
      expect(result.payload?.sub).toBe(testUsername);
    });

    test.concurrent("should complete validation within performance threshold", async () => {
      const tokenResponse = await NativeBunJWT.createToken(
        testUsername,
        testConsumerKey,
        testSecret,
        testAuthority,
        testAudience
      );

      const start = Bun.nanoseconds();
      await NativeBunJWT.validateToken(tokenResponse.access_token, testSecret);
      const duration = (Bun.nanoseconds() - start) / 1_000_000;

      expect(duration).toBeLessThan(50);
    });

    test.concurrent("should handle multiple audience values", async () => {
      const multiAudience = "audience1,audience2,audience3";
      const tokenResponse = await NativeBunJWT.createToken(
        testUsername,
        testConsumerKey,
        testSecret,
        testAuthority,
        multiAudience
      );

      const result = await NativeBunJWT.validateToken(tokenResponse.access_token, testSecret);

      expect(result.valid).toBe(true);
      expect(result.payload?.aud).toEqual(["audience1", "audience2", "audience3"]);
    });
  });
});
