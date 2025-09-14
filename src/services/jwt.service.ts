/* src/services/jwt.service.ts */

// JWT Service using Bun's native crypto.subtle API with OpenTelemetry tracing

import { trace } from "@opentelemetry/api";
export interface TokenResponse {
  access_token: string;
  expires_in: number;
}

export interface JWTPayload {
  sub: string;
  key: string;
  jti: string;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
  name: string;
  unique_name: string;
}

export class NativeBunJWT {
  private static readonly encoder = new TextEncoder();

  static async createToken(
    username: string,
    consumerKey: string,
    consumerSecret: string,
    authority: string,
    audience: string
  ): Promise<TokenResponse> {
    const startTime = Bun.nanoseconds();

    // Create telemetry span
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

      const header = {
        alg: "HS256",
        typ: "JWT",
      };

      const now = Math.floor(Date.now() / 1000);
      const expirationTime = now + 900; // 15 minutes

      const payload: JWTPayload = {
        sub: username,
        key: consumerKey,
        jti: crypto.randomUUID(),
        iat: now,
        exp: expirationTime,
        iss: authority,
        aud: audience,
        name: username,
        unique_name: `pvhcorp.com#${username}`,
      };

      const headerB64 = NativeBunJWT.base64urlEncode(JSON.stringify(header));
      const payloadB64 = NativeBunJWT.base64urlEncode(JSON.stringify(payload));
      const message = `${headerB64}.${payloadB64}`;

      const signature = await crypto.subtle.sign("HMAC", key, NativeBunJWT.encoder.encode(message));

      const signatureB64 = NativeBunJWT.base64urlEncode(
        String.fromCharCode(...new Uint8Array(signature))
      );

      const token = `${message}.${signatureB64}`;
      const duration = (Bun.nanoseconds() - startTime) / 1_000_000;

      span.setAttributes({
        "jwt.token_id": payload.jti,
        "jwt.authority": authority,
        "jwt.audience": audience,
        "jwt.duration_ms": duration,
        "jwt.expires_in": 900,
      });

      return {
        access_token: token,
        expires_in: 900,
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

  static async verifyToken(token: string, consumerSecret: string): Promise<JWTPayload | null> {
    const startTime = Bun.nanoseconds();

    // Create telemetry span
    const tracer = trace.getTracer("authentication-service");
    const span = tracer.startSpan("jwt_verify", {
      attributes: {
        "jwt.operation": "verify",
      },
    });

    try {
      const parts = token.split(".");
      if (parts.length !== 3) {
        throw new Error("Invalid token format");
      }

      const [headerB64, payloadB64, signatureB64] = parts;
      const message = `${headerB64}.${payloadB64}`;

      const key = await crypto.subtle.importKey(
        "raw",
        NativeBunJWT.encoder.encode(consumerSecret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["verify"]
      );

      const signature = Uint8Array.from(atob(NativeBunJWT.base64urlDecode(signatureB64)), (c) =>
        c.charCodeAt(0)
      );

      const isValid = await crypto.subtle.verify(
        "HMAC",
        key,
        signature,
        NativeBunJWT.encoder.encode(message)
      );

      if (!isValid) {
        throw new Error("Invalid token signature");
      }

      const payloadJson = NativeBunJWT.base64urlDecode(payloadB64);
      const payload = JSON.parse(payloadJson) as JWTPayload;

      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        throw new Error("Token expired");
      }

      const duration = (Bun.nanoseconds() - startTime) / 1_000_000;

      span.setAttributes({
        "jwt.username": payload.sub,
        "jwt.token_id": payload.jti,
        "jwt.issuer": payload.iss,
        "jwt.audience": payload.aud,
        "jwt.expires_at": payload.exp,
        "jwt.duration_ms": duration,
      });

      return payload;
    } catch (error) {
      const duration = (Bun.nanoseconds() - startTime) / 1_000_000;

      span.setAttributes({
        "error.type": "jwt_verification_error",
        "error.message": (error as Error).message,
        "jwt.duration_ms": duration,
      });

      return null;
    } finally {
      span.end();
    }
  }

  private static base64urlEncode(data: string): string {
    return btoa(data).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  }

  private static base64urlDecode(data: string): string {
    const padded = data + "==".slice(0, (4 - (data.length % 4)) % 4);
    return atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  }
}
