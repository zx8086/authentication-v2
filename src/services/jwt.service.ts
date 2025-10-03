/* src/services/jwt.service.ts */

import { trace } from "@opentelemetry/api";
import type { JWTPayload, TokenResponse } from "../config";

export class NativeBunJWT {
  private static readonly encoder = new TextEncoder();

  static async createToken(
    username: string,
    consumerKey: string,
    consumerSecret: string,
    authority: string,
    audience: string,
    issuer?: string
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

      const header = {
        alg: "HS256",
        typ: "JWT",
      };

      const now = Math.floor(Date.now() / 1000);
      const expirationTime = now + 900;

      const audiences = audience.split(",").map((a) => a.trim());
      const issuers = (issuer || authority).split(",").map((i) => i.trim());

      const payload: JWTPayload = {
        sub: username,
        key: consumerKey,
        jti: crypto.randomUUID(),
        iat: now,
        exp: expirationTime,
        iss: issuers[0],
        aud: audiences.length === 1 ? audiences[0] : audiences,
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

  private static base64urlEncode(data: string): string {
    return btoa(data).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  }
}
