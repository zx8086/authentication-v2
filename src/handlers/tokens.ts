/* src/handlers/tokens.ts */

import { loadConfig } from "../config/index";
import { ErrorCodes } from "../errors/error-codes";
import { NativeBunJWT } from "../services/jwt.service";
import type { IKongService } from "../services/kong.service";
import { getVolumeBucket, incrementConsumerRequest } from "../telemetry/consumer-volume";
import {
  recordAuthenticationAttempt,
  recordConsumerError,
  recordConsumerLatency,
  recordConsumerRequest,
  recordError,
  recordException,
  recordJwtTokenIssued,
  recordOperationDuration,
} from "../telemetry/metrics";
import { telemetryTracer } from "../telemetry/tracer";
import { error, log } from "../utils/logger";
import {
  createErrorResponse,
  createInternalErrorResponse,
  createStructuredErrorResponse,
  createStructuredErrorWithMessage,
  createSuccessResponse,
  createTokenResponse,
  createUnauthorizedResponse,
} from "../utils/response";

const config = loadConfig();

// Simple URL parsing cache for performance optimization
class RequestContext {
  private _url: URL | null = null;
  private _pathname: string | null = null;

  constructor(private req: Request) {}

  get url(): URL {
    if (!this._url) {
      this._url = new URL(this.req.url);
    }
    return this._url;
  }

  get pathname(): string {
    if (!this._pathname) {
      this._pathname = this.url.pathname;
    }
    return this._pathname;
  }
}

type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

interface HeaderValidationSuccess {
  consumerId: string;
  username: string;
}

interface HeaderValidationError {
  error: string;
  errorCode: ErrorCode;
}

function validateKongHeaders(req: Request): HeaderValidationSuccess | HeaderValidationError {
  const consumerId = req.headers.get(config.kong.consumerIdHeader);
  const username = req.headers.get(config.kong.consumerUsernameHeader);
  const isAnonymous = req.headers.get(config.kong.anonymousHeader);

  if (!consumerId || !username) {
    return {
      error: "Missing Kong consumer headers",
      errorCode: ErrorCodes.AUTH_001,
    };
  }

  if (isAnonymous === "true") {
    return {
      error: "Anonymous consumers are not allowed",
      errorCode: ErrorCodes.AUTH_009,
    };
  }

  return { consumerId, username };
}

async function lookupConsumerSecret(
  consumerId: string,
  _username: string,
  kongService: IKongService
): Promise<{ key: string; secret: string } | null> {
  const secretStartTime = Bun.nanoseconds();
  const secretResult = await telemetryTracer.createKongSpan(
    "getConsumerSecret",
    `${config.kong.adminUrl}/consumers/${consumerId}/jwt`,
    "GET",
    () => kongService.getConsumerSecret(consumerId)
  );
  const secretDuration = (Bun.nanoseconds() - secretStartTime) / 1_000_000;
  recordOperationDuration("kong_get_consumer_secret", secretDuration, true);

  return secretResult;
}

async function generateJWTToken(
  username: string,
  key: string,
  secret: string
): Promise<{ access_token: string; expires_in: number }> {
  const jwtStartTime = Bun.nanoseconds();
  const tokenResponse = await telemetryTracer.createJWTSpan(
    "createToken",
    () =>
      NativeBunJWT.createToken(
        username,
        key,
        secret,
        config.jwt.authority,
        config.jwt.audience,
        config.jwt.issuer
      ),
    username
  );
  const jwtDuration = (Bun.nanoseconds() - jwtStartTime) / 1_000_000;
  recordOperationDuration("jwt_generation", jwtDuration, true);
  recordJwtTokenIssued(username, jwtDuration);

  return {
    access_token: tokenResponse.access_token,
    expires_in: config.jwt.expirationMinutes * 60,
  };
}

export async function handleTokenRequest(
  req: Request,
  kongService: IKongService
): Promise<Response> {
  log("Processing token request", {
    component: "tokens",
    operation: "handle_token_request",
    endpoint: "/tokens",
  });

  const requestId = crypto.randomUUID();
  const ctx = new RequestContext(req);
  const startTime = Bun.nanoseconds();

  return telemetryTracer.createHttpSpan(req.method, ctx.pathname, 200, async () => {
    log("Token request started", {
      method: req.method,
      url: ctx.pathname,
      requestId,
    });

    const headerValidation = validateKongHeaders(req);

    // Extract consumer ID for volume tracking
    const consumerId = req.headers.get(config.kong.consumerIdHeader);

    if ("error" in headerValidation) {
      const duration = (Bun.nanoseconds() - startTime) / 1_000_000;
      recordAuthenticationAttempt("header_validation_failed", false);
      recordError("kong_header_validation_failed", {
        error: headerValidation.error,
        errorCode: headerValidation.errorCode,
        headers: {
          consumerId: req.headers.get(config.kong.consumerIdHeader) || "missing",
          username: req.headers.get(config.kong.consumerUsernameHeader) || "missing",
          isAnonymous: req.headers.get(config.kong.anonymousHeader) || "false",
        },
      });

      // Record consumer error metrics if consumer ID available
      if (consumerId) {
        const volume = getVolumeBucket(consumerId);
        recordConsumerError(volume);
        recordConsumerLatency(volume, duration);
      }

      log("HTTP request processed", {
        method: req.method,
        url: ctx.pathname,
        statusCode: 401,
        duration,
        requestId,
        error: headerValidation.error,
        errorCode: headerValidation.errorCode,
      });

      return createStructuredErrorResponse(headerValidation.errorCode, requestId, {
        reason: headerValidation.error,
      });
    }

    try {
      const { consumerId, username } = headerValidation;

      // Track consumer request and get volume bucket
      incrementConsumerRequest(consumerId);
      const volume = getVolumeBucket(consumerId);
      recordConsumerRequest(volume);

      let secretResult: { key: string; secret: string } | null;
      try {
        secretResult = await lookupConsumerSecret(consumerId, username, kongService);
      } catch (kongError) {
        const duration = (Bun.nanoseconds() - startTime) / 1_000_000;
        recordAuthenticationAttempt("kong_unavailable", false, username);
        recordError("kong_service_unavailable", {
          consumerId,
          username,
          error: kongError instanceof Error ? kongError.message : "Kong service unavailable",
          errorCode: ErrorCodes.AUTH_004,
        });

        // Record consumer error metrics
        recordConsumerError(volume);
        recordConsumerLatency(volume, duration);

        error("Kong service unavailable during token request", {
          consumerId,
          username,
          error: kongError instanceof Error ? kongError.message : "Unknown Kong error",
          errorCode: ErrorCodes.AUTH_004,
          requestId,
        });

        log("HTTP request processed", {
          method: req.method,
          url: ctx.pathname,
          statusCode: 503,
          duration,
          requestId,
          error: "Service temporarily unavailable",
          errorCode: ErrorCodes.AUTH_004,
        });

        return createStructuredErrorResponse(
          ErrorCodes.AUTH_004,
          requestId,
          {
            reason: "Kong gateway connectivity issues",
            retryAfter: 30,
          },
          {
            "Retry-After": "30",
          }
        );
      }

      if (!secretResult) {
        const duration = (Bun.nanoseconds() - startTime) / 1_000_000;
        recordAuthenticationAttempt("consumer_lookup_failed", false, username);
        recordError("kong_consumer_lookup_failed", {
          consumerId,
          username,
          error: "Consumer not found or no JWT credentials",
          errorCode: ErrorCodes.AUTH_002,
        });

        // Record consumer error metrics
        recordConsumerError(volume);
        recordConsumerLatency(volume, duration);

        log("Consumer not found or has no JWT credentials", {
          consumerId,
          username,
          error: "Invalid consumer credentials",
          errorCode: ErrorCodes.AUTH_002,
          requestId,
        });

        log("HTTP request processed", {
          method: req.method,
          url: ctx.pathname,
          statusCode: 401,
          duration,
          requestId,
          error: "Invalid consumer credentials",
          errorCode: ErrorCodes.AUTH_002,
        });

        return createStructuredErrorResponse(ErrorCodes.AUTH_002, requestId, {
          consumerId,
        });
      }

      // Use original username for JWT claims
      const effectiveUsername = username;

      const tokenData = await generateJWTToken(
        effectiveUsername,
        secretResult.key,
        secretResult.secret
      );

      const duration = (Bun.nanoseconds() - startTime) / 1_000_000;
      recordAuthenticationAttempt("success", true, username);

      // Record successful consumer metrics
      recordConsumerLatency(volume, duration);

      log("JWT token generated successfully", {
        consumerId,
        username,
        totalDuration: duration,
        requestId,
      });

      log("HTTP request processed", {
        method: req.method,
        url: ctx.pathname,
        statusCode: 200,
        duration,
        requestId,
      });

      return createTokenResponse(tokenData.access_token, tokenData.expires_in, requestId);
    } catch (err) {
      const duration = (Bun.nanoseconds() - startTime) / 1_000_000;
      recordAuthenticationAttempt("exception", false, headerValidation.username);
      recordException(err as Error);

      // Record consumer error metrics for exceptions
      if (consumerId) {
        const volume = getVolumeBucket(consumerId);
        recordConsumerError(volume);
        recordConsumerLatency(volume, duration);
      }

      error("Unexpected error during token generation", {
        error: err instanceof Error ? err.message : "Unknown error",
        stack: err instanceof Error ? err.stack : undefined,
        consumerId: headerValidation.consumerId,
        username: headerValidation.username,
        errorCode: ErrorCodes.AUTH_008,
        requestId,
      });

      log("HTTP request processed", {
        method: req.method,
        url: ctx.pathname,
        statusCode: 500,
        duration,
        requestId,
        error: "Unexpected error",
        errorCode: ErrorCodes.AUTH_008,
      });

      return createStructuredErrorWithMessage(
        ErrorCodes.AUTH_008,
        "An unexpected error occurred during token generation",
        requestId
      );
    }
  });
}

export async function handleTokenValidation(
  req: Request,
  kongService: IKongService
): Promise<Response> {
  log("Processing token validation request", {
    component: "tokens",
    operation: "handle_token_validation",
    endpoint: "/tokens/validate",
  });

  const requestId = crypto.randomUUID();
  const startTime = Bun.nanoseconds();

  return telemetryTracer.createHttpSpan(req.method, "/tokens/validate", 200, async () => {
    // Extract token from Authorization header
    const authHeader = req.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      const duration = (Bun.nanoseconds() - startTime) / 1_000_000;
      log("Token validation failed: missing Authorization header", {
        duration,
        requestId,
        errorCode: ErrorCodes.AUTH_012,
      });
      return createStructuredErrorResponse(ErrorCodes.AUTH_012, requestId);
    }

    const token = authHeader.substring(7);

    if (!token || token.trim() === "") {
      const duration = (Bun.nanoseconds() - startTime) / 1_000_000;
      log("Token validation failed: empty token", {
        duration,
        requestId,
        errorCode: ErrorCodes.AUTH_011,
      });
      return createStructuredErrorWithMessage(
        ErrorCodes.AUTH_011,
        "Token cannot be empty",
        requestId
      );
    }

    // Validate Kong headers for consumer identification
    const headerValidation = validateKongHeaders(req);

    if ("error" in headerValidation) {
      const duration = (Bun.nanoseconds() - startTime) / 1_000_000;
      log("Token validation failed: missing Kong headers", {
        duration,
        requestId,
        error: headerValidation.error,
        errorCode: headerValidation.errorCode,
      });
      return createStructuredErrorResponse(headerValidation.errorCode, requestId, {
        reason: headerValidation.error,
      });
    }

    const { consumerId, username } = headerValidation;

    try {
      // Get consumer secret to validate signature
      const secretResult = await lookupConsumerSecret(consumerId, username, kongService);

      if (!secretResult) {
        const duration = (Bun.nanoseconds() - startTime) / 1_000_000;
        log("Token validation failed: consumer not found", {
          consumerId,
          username,
          duration,
          requestId,
          errorCode: ErrorCodes.AUTH_002,
        });
        return createStructuredErrorResponse(ErrorCodes.AUTH_002, requestId, {
          consumerId,
        });
      }

      // Validate the token
      const validationResult = await NativeBunJWT.validateToken(token, secretResult.secret);
      const duration = (Bun.nanoseconds() - startTime) / 1_000_000;

      if (validationResult.valid && validationResult.payload) {
        log("Token validation successful", {
          consumerId,
          username,
          tokenId: validationResult.payload.jti,
          duration,
          requestId,
        });

        return createSuccessResponse(
          {
            valid: true,
            tokenId: validationResult.payload.jti,
            subject: validationResult.payload.sub,
            issuer: validationResult.payload.iss,
            audience: validationResult.payload.aud,
            issuedAt: new Date(validationResult.payload.iat * 1000).toISOString(),
            expiresAt: new Date(validationResult.payload.exp * 1000).toISOString(),
            expiresIn: validationResult.payload.exp - Math.floor(Date.now() / 1000),
          },
          requestId
        );
      }

      // Token is invalid
      const errorCode = validationResult.expired ? ErrorCodes.AUTH_010 : ErrorCodes.AUTH_011;
      log("Token validation failed", {
        consumerId,
        username,
        error: validationResult.error,
        expired: validationResult.expired,
        duration,
        requestId,
        errorCode,
      });

      const details: Record<string, unknown> = {};
      if (validationResult.expired && validationResult.payload) {
        details.expiredAt = new Date(validationResult.payload.exp * 1000).toISOString();
      }
      if (validationResult.error) {
        details.reason = validationResult.error;
      }

      return createStructuredErrorResponse(errorCode, requestId, details);
    } catch (err) {
      const duration = (Bun.nanoseconds() - startTime) / 1_000_000;
      recordException(err as Error);

      error("Unexpected error during token validation", {
        error: err instanceof Error ? err.message : "Unknown error",
        stack: err instanceof Error ? err.stack : undefined,
        consumerId,
        username,
        errorCode: ErrorCodes.AUTH_008,
        requestId,
      });

      return createStructuredErrorWithMessage(
        ErrorCodes.AUTH_008,
        "An unexpected error occurred during token validation",
        requestId
      );
    }
  });
}
