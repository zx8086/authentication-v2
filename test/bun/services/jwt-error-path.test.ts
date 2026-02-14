// test/bun/services/jwt-error-path.test.ts

import { describe, expect, it } from "bun:test";
import { NativeBunJWT } from "../../../src/services/jwt.service";

describe("NativeBunJWT Error Paths", () => {
  it("should handle JWT creation failure with invalid secret", async () => {
    // Empty secret should cause crypto operations to fail
    await expect(
      NativeBunJWT.createToken(
        "test-user",
        "test-key",
        "", // Empty secret
        "https://auth.test.com",
        "https://api.test.com"
      )
    ).rejects.toThrow("Failed to create JWT token");
  });

  it("should handle validation of malformed tokens", async () => {
    const result = await NativeBunJWT.validateToken("invalid.token", "secret");

    expect(result.valid).toBe(false);
    expect(result.error).toContain("expected 3 parts");
  });

  it("should handle validation with invalid base64 payload encoding", async () => {
    // Create a token with invalid base64 in payload position
    const result = await NativeBunJWT.validateToken(
      "header.!!!invalid-base64!!!.signature",
      "secret"
    );

    expect(result.valid).toBe(false);
    // This will fail at signature verification before reaching payload decode
  });

  it("should handle validation with non-JSON payload", async () => {
    // Create token with valid base64 but invalid JSON
    const validBase64 = Buffer.from("not json").toString("base64url");
    const result = await NativeBunJWT.validateToken(`header.${validBase64}.signature`, "secret");

    expect(result.valid).toBe(false);
  });

  it("should create token with multiple audiences", async () => {
    const result = await NativeBunJWT.createToken(
      "test-user",
      "test-key",
      "test-secret",
      "https://auth.test.com",
      "https://api1.test.com, https://api2.test.com"
    );

    expect(result).toBeDefined();
    expect(result.access_token).toBeDefined();
    expect(result.expires_in).toBe(900);
  });

  it("should create token with multiple issuers", async () => {
    const result = await NativeBunJWT.createToken(
      "test-user",
      "test-key",
      "test-secret",
      "https://auth1.test.com, https://auth2.test.com",
      "https://api.test.com",
      "https://issuer1.test.com, https://issuer2.test.com"
    );

    expect(result).toBeDefined();
    expect(result.access_token).toBeDefined();
  });

  it("should create token with custom expiration", async () => {
    const result = await NativeBunJWT.createToken(
      "test-user",
      "test-key",
      "test-secret",
      "https://auth.test.com",
      "https://api.test.com",
      undefined,
      3600 // 1 hour
    );

    expect(result).toBeDefined();
    expect(result.expires_in).toBe(3600);
  });

  it("should detect expired tokens", async () => {
    // Create a token with very short expiration
    const tokenResult = await NativeBunJWT.createToken(
      "test-user",
      "test-key",
      "test-secret",
      "https://auth.test.com",
      "https://api.test.com",
      undefined,
      -1 // Already expired
    );

    const validation = await NativeBunJWT.validateToken(tokenResult.access_token, "test-secret");

    expect(validation.valid).toBe(false);
    expect(validation.expired).toBe(true);
    expect(validation.error).toContain("expired");
  });

  it("should validate token payload structure", async () => {
    const tokenResult = await NativeBunJWT.createToken(
      "test-user",
      "test-key",
      "test-secret",
      "https://auth.test.com",
      "https://api.test.com"
    );

    const validation = await NativeBunJWT.validateToken(tokenResult.access_token, "test-secret");

    expect(validation.valid).toBe(true);
    expect(validation.payload).toBeDefined();
    expect(validation.payload?.sub).toBe("test-user");
    expect(validation.payload?.key).toBe("test-key");
    expect(validation.payload?.jti).toBeDefined();
    expect(validation.payload?.iat).toBeDefined();
    expect(validation.payload?.exp).toBeDefined();
  });
});
