/* src/handlers/tokens.ts */

import { loadConfig } from "../config/index";
import { NativeBunJWT } from "../services/jwt.service";
import type { IKongService } from "../services/kong.service";
import { incrementConsumerRequest, getVolumeBucket } from "../telemetry/consumer-volume";
import {
  recordAuthenticationAttempt,
  recordError,
  recordException,
  recordJwtTokenIssued,
  recordOperationDuration,
  recordConsumerRequest,
  recordConsumerError,
  recordConsumerLatency,
} from "../telemetry/metrics";
import { telemetryTracer } from "../telemetry/tracer";
import { error, log } from "../utils/logger";
import {
  createInternalErrorResponse,
  createTokenResponse,
  createUnauthorizedResponse,
} from "../utils/response";

const config = loadConfig();

function validateKongHeaders(
  req: Request
): { consumerId: string; username: string } | { error: string } {
  const consumerId = req.headers.get(config.kong.consumerIdHeader);
  const username = req.headers.get(config.kong.consumerUsernameHeader);
  const isAnonymous = req.headers.get(config.kong.anonymousHeader);

  if (!consumerId || !username) {
    return { error: "Missing Kong consumer headers" };
  }

  if (isAnonymous === "true") {
    return { error: "Anonymous consumers are not allowed" };
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
  const url = new URL(req.url);
  const startTime = Bun.nanoseconds();

  return telemetryTracer.createHttpSpan(req.method, url.pathname, 200, async () => {
    log("Token request started", {
      method: req.method,
      url: url.pathname,
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
        url: url.pathname,
        statusCode: 401,
        duration,
        requestId,
        error: headerValidation.error,
      });

      return createUnauthorizedResponse(headerValidation.error, requestId);
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
        });

        // Record consumer error metrics
        recordConsumerError(volume);
        recordConsumerLatency(volume, duration);

        error("Kong service unavailable during token request", {
          consumerId,
          username,
          error: kongError instanceof Error ? kongError.message : "Unknown Kong error",
          requestId,
        });

        log("HTTP request processed", {
          method: req.method,
          url: url.pathname,
          statusCode: 503,
          duration,
          requestId,
          error: "Service temporarily unavailable",
        });

        return new Response(
          JSON.stringify({
            error: "Service Unavailable",
            message: "Authentication service is temporarily unavailable. Please try again later.",
            details: "Kong gateway connectivity issues",
            timestamp: new Date().toISOString(),
          }),
          {
            status: 503,
            headers: {
              "Content-Type": "application/json",
              "X-Request-Id": requestId,
              "Retry-After": "30",
            },
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
        });

        // Record consumer error metrics
        recordConsumerError(volume);
        recordConsumerLatency(volume, duration);

        log("Consumer not found or has no JWT credentials", {
          consumerId,
          username,
          error: "Invalid consumer credentials",
          requestId,
        });

        log("HTTP request processed", {
          method: req.method,
          url: url.pathname,
          statusCode: 401,
          duration,
          requestId,
          error: "Invalid consumer credentials",
        });

        return createUnauthorizedResponse("Invalid consumer credentials", requestId);
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
        url: url.pathname,
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
        requestId,
      });

      log("HTTP request processed", {
        method: req.method,
        url: url.pathname,
        statusCode: 500,
        duration,
        requestId,
        error: "Unexpected error",
      });

      return createInternalErrorResponse(
        "An unexpected error occurred during token generation",
        requestId
      );
    }
  });
}
