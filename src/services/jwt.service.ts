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

  static async verifyToken(
    token: string,
    consumerSecret: string,
    validateSignature: boolean = true,
    expectedAudiences?: string,
    expectedIssuers?: string
  ): Promise<JWTPayload | null> {
    const startTime = Bun.nanoseconds();

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

      if (validateSignature) {
        const key = await crypto.subtle.importKey(
          "raw",
          NativeBunJWT.encoder.encode(consumerSecret),
          { name: "HMAC", hash: "SHA-256" },
          false,
          ["verify"]
        );

        const decodedSig = NativeBunJWT.base64urlDecode(signatureB64);
        const signature = Uint8Array.from(decodedSig, (c) => c.charCodeAt(0));

        const isValid = await crypto.subtle.verify(
          "HMAC",
          key,
          signature,
          NativeBunJWT.encoder.encode(message)
        );

        if (!isValid) {
          throw new Error("Invalid token signature");
        }
      }

      const payloadJson = NativeBunJWT.base64urlDecode(payloadB64);
      const payload = JSON.parse(payloadJson) as JWTPayload;

      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        throw new Error("Token expired");
      }

      if (expectedAudiences) {
        const validAudiences = expectedAudiences.split(",").map((a) => a.trim());
        const tokenAudiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
        const hasValidAudience = tokenAudiences.some((aud) => validAudiences.includes(aud));

        if (!hasValidAudience) {
          throw new Error(`Invalid audience. Expected one of: ${validAudiences.join(", ")}`);
        }
      }

      if (expectedIssuers) {
        const validIssuers = expectedIssuers.split(",").map((i) => i.trim());
        if (!validIssuers.includes(payload.iss)) {
          throw new Error(`Invalid issuer. Expected one of: ${validIssuers.join(", ")}`);
        }
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
