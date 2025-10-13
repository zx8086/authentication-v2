/* src/handlers/tokens.ts */

import { loadConfig } from "../config/index";
import { NativeBunJWT } from "../services/jwt.service";
import type { IKongService } from "../services/kong.service";
import {
  recordAuthenticationAttempt,
  recordError,
  recordException,
  recordJwtTokenIssued,
  recordOperationDuration,
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
        config.jwt.authority ?? "https://api.example.com",
        config.jwt.audience ?? "example-api",
        config.jwt.issuer ?? "https://api.example.com"
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

      const secretResult = await lookupConsumerSecret(consumerId, username, kongService);

      if (!secretResult) {
        const duration = (Bun.nanoseconds() - startTime) / 1_000_000;
        recordAuthenticationAttempt("consumer_lookup_failed", false, username);
        recordError("kong_consumer_lookup_failed", {
          consumerId,
          username,
          error: "Consumer not found or no JWT credentials",
        });

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

      const tokenData = await generateJWTToken(username, secretResult.key, secretResult.secret);

      const duration = (Bun.nanoseconds() - startTime) / 1_000_000;
      recordAuthenticationAttempt("success", true, username);

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
