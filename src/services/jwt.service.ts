/* src/services/jwt.service.ts */

import { trace } from "@opentelemetry/api";
import type { JWTPayload, TokenResponse } from "../config";

export class NativeBunJWT {
  private static readonly encoder = new TextEncoder();

  // Pre-computed and cached JWT header (base64URL encoded)
  private static readonly CACHED_HEADER = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"; // {"alg":"HS256","typ":"JWT"}

  static async createToken(
    username: string,
    consumerKey: string,
    consumerSecret: string,
    authority: string,
    audience: string,
    issuer?: string,
    expirationSeconds = 900 // Default 15 minutes, can be overridden by config
  ): Promise<TokenResponse> {
    const startTime = Bun.nanoseconds();

    const tracer = trace.getTracer("authentication-service");
    const span = tracer.startSpan("jwt_create", {
      attributes: {
        "jwt.username": username,
        "jwt.operation": "create",
      },
    });

    try {
      const key = await crypto.subtle.importKey(
        "raw",
        NativeBunJWT.encoder.encode(consumerSecret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );

      const now = Math.floor(Date.now() / 1000);
      const expirationTime = now + expirationSeconds;

      const audiences = audience.split(",").map((a) => a.trim());
      const issuers = (issuer || authority).split(",").map((i) => i.trim());

      const payload: JWTPayload = {
        sub: username,
        key: consumerKey,
        jti: crypto.randomUUID(),
        iat: now,
        nbf: now, // Not Before - backward compatibility with .NET format
        exp: expirationTime,
        iss: issuers[0],
        aud: audiences.length === 1 ? audiences[0] : audiences, // RFC 7519 compliant: string for single, array for multiple
        name: username,
        unique_name: `pvhcorp.com#${username}`,
      };

      const payloadB64 = NativeBunJWT.base64urlEncode(JSON.stringify(payload));
      const message = `${NativeBunJWT.CACHED_HEADER}.${payloadB64}`;

      const signature = await crypto.subtle.sign("HMAC", key, NativeBunJWT.encoder.encode(message));

      const signatureB64 = NativeBunJWT.base64urlEncodeBuffer(new Uint8Array(signature));

      const token = `${message}.${signatureB64}`;
      const duration = (Bun.nanoseconds() - startTime) / 1_000_000;

      span.setAttributes({
        "jwt.token_id": payload.jti,
        "jwt.authority": authority,
        "jwt.audience": audience,
        "jwt.duration_ms": duration,
        "jwt.expires_in": expirationSeconds,
      });

      return {
        access_token: token,
        expires_in: expirationSeconds,
      };
    } catch (error) {
      const duration = (Bun.nanoseconds() - startTime) / 1_000_000;

      span.setAttributes({
        "error.type": "jwt_creation_error",
        "error.message": (error as Error).message,
        "jwt.duration_ms": duration,
      });

      throw new Error("Failed to create JWT token");
    } finally {
      span.end();
    }
  }

  private static base64urlEncode(data: string): string {
    // Bun always has native Buffer support
    const buffer = Buffer.from(data, "utf8");
    return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  }

  private static base64urlEncodeBuffer(buffer: Uint8Array): string {
    // Bun always has native Buffer support - directly encode Uint8Array
    return Buffer.from(buffer)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
  }

  private static base64urlDecode(data: string): Uint8Array {
    // Add padding if necessary
    let base64 = data.replace(/-/g, "+").replace(/_/g, "/");
    // Stryker disable next-line ConditionalExpression: Base64 padding is required by spec
    while (base64.length % 4) {
      base64 += "=";
    }
    // Bun always has native Buffer support
    return new Uint8Array(Buffer.from(base64, "base64"));
  }

  static async validateToken(
    token: string,
    secret: string
  ): Promise<{
    valid: boolean;
    payload?: JWTPayload;
    error?: string;
    expired?: boolean;
  }> {
    const startTime = Bun.nanoseconds();

    const tracer = trace.getTracer("authentication-service");
    const span = tracer.startSpan("jwt_validate", {
      attributes: {
        "jwt.operation": "validate",
      },
    });

    try {
      const parts = token.split(".");

      if (parts.length !== 3) {
        span.setAttributes({
          "jwt.validation_error": "invalid_format",
          "jwt.parts_count": parts.length,
        });
        return { valid: false, error: "Invalid token format: expected 3 parts" };
      }

      const [headerB64, payloadB64, signatureB64] = parts;

      // Verify signature using crypto.subtle
      const message = NativeBunJWT.encoder.encode(`${headerB64}.${payloadB64}`);
      const key = await crypto.subtle.importKey(
        "raw",
        NativeBunJWT.encoder.encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["verify"]
      );

      const signatureBytes = NativeBunJWT.base64urlDecode(signatureB64);
      const isValid = await crypto.subtle.verify(
        "HMAC",
        key,
        new Uint8Array(signatureBytes).buffer as ArrayBuffer,
        message
      );

      if (!isValid) {
        span.setAttributes({
          "jwt.validation_error": "invalid_signature",
        });
        return { valid: false, error: "Invalid signature" };
      }

      // Decode payload
      let payloadJson: string;
      try {
        payloadJson = atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/"));
      } catch {
        span.setAttributes({
          "jwt.validation_error": "invalid_payload_encoding",
        });
        return { valid: false, error: "Invalid payload encoding" };
      }

      let payload: JWTPayload;
      try {
        payload = JSON.parse(payloadJson);
      } catch {
        span.setAttributes({
          "jwt.validation_error": "invalid_payload_json",
        });
        return { valid: false, error: "Invalid payload JSON" };
      }

      // Check expiration (RFC 7519 Section 4.1.4)
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        const duration = (Bun.nanoseconds() - startTime) / 1_000_000;
        span.setAttributes({
          "jwt.validation_error": "token_expired",
          "jwt.token_id": payload.jti,
          "jwt.expired_at": payload.exp,
          "jwt.duration_ms": duration,
        });
        return {
          valid: false,
          error: "Token has expired",
          payload,
          expired: true,
        };
      }

      // Check not-before (RFC 7519 Section 4.1.5)
      if (payload.nbf && payload.nbf > now) {
        const duration = (Bun.nanoseconds() - startTime) / 1_000_000;
        span.setAttributes({
          "jwt.validation_error": "token_not_yet_valid",
          "jwt.token_id": payload.jti,
          "jwt.not_before": payload.nbf,
          "jwt.duration_ms": duration,
        });
        return {
          valid: false,
          error: "Token is not yet valid",
          payload,
        };
      }

      const duration = (Bun.nanoseconds() - startTime) / 1_000_000;
      span.setAttributes({
        "jwt.valid": true,
        "jwt.token_id": payload.jti,
        "jwt.subject": payload.sub,
        "jwt.duration_ms": duration,
      });

      return { valid: true, payload };
    } catch (err) {
      const duration = (Bun.nanoseconds() - startTime) / 1_000_000;
      span.setAttributes({
        "error.type": "jwt_validation_error",
        "error.message": (err as Error).message,
        "jwt.duration_ms": duration,
      });
      return {
        valid: false,
        error: `Token validation failed: ${(err as Error).message}`,
      };
    } finally {
      span.end();
    }
  }
}
