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

  return telemetryTracer.createHttpSpan(
    req.method,
    url.pathname,
    200, // Will be updated based on actual response
    async () => {
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

        return new Response(
          JSON.stringify({
            error: "Unauthorized",
            message: headerValidation.error,
            statusCode: 401,
            timestamp: new Date().toISOString(),
            requestId,
          }),
          {
            status: 401,
            headers: {
              "Content-Type": "application/json",
              "X-Request-Id": requestId,
              "Access-Control-Allow-Origin": config.apiInfo.cors,
              "Access-Control-Allow-Headers": "Content-Type, Authorization",
              "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            },
          }
        );
      }

      try {
        const { consumerId, username } = headerValidation;

        const secretStartTime = Bun.nanoseconds();
        const secretResult = await telemetryTracer.createKongSpan(
          "getConsumerSecret",
          `${config.kong.adminUrl}/consumers/${consumerId}/jwt`,
          "GET",
          () => kongService.getConsumerSecret(consumerId)
        );
        const secretDuration = (Bun.nanoseconds() - secretStartTime) / 1_000_000;
        recordOperationDuration("kong_get_consumer_secret", secretDuration, true);

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

          return new Response(
            JSON.stringify({
              error: "Unauthorized",
              message: "Invalid consumer credentials",
              statusCode: 401,
              timestamp: new Date().toISOString(),
              requestId,
            }),
            {
              status: 401,
              headers: {
                "Content-Type": "application/json",
                "X-Request-Id": requestId,
                "Access-Control-Allow-Origin": config.apiInfo.cors,
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
              },
            }
          );
        }

        const jwtStartTime = Bun.nanoseconds();
        const tokenResponse = await telemetryTracer.createJWTSpan(
          "createToken",
          () =>
            NativeBunJWT.createToken(
              username,
              secretResult.key,
              secretResult.secret,
              config.jwt.authority,
              config.jwt.audience,
              config.jwt.issuer
            ),
          username
        );
        const jwtDuration = (Bun.nanoseconds() - jwtStartTime) / 1_000_000;
        recordOperationDuration("jwt_generation", jwtDuration, true);
        recordJwtTokenIssued(username, jwtDuration);

        const duration = (Bun.nanoseconds() - startTime) / 1_000_000;
        recordAuthenticationAttempt("success", true, username);

        log("JWT token generated successfully", {
          consumerId,
          username,
          jwtDuration,
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

        return new Response(
          JSON.stringify({
            access_token: tokenResponse.access_token,
            expires_in: config.jwt.expirationMinutes * 60,
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-store, no-cache, must-revalidate",
              Pragma: "no-cache",
              "X-Request-Id": requestId,
              "Access-Control-Allow-Origin": config.apiInfo.cors,
              "Access-Control-Allow-Headers": "Content-Type, Authorization",
              "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            },
          }
        );
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

        return new Response(
          JSON.stringify({
            error: "Internal Server Error",
            message: "An unexpected error occurred during token generation",
            statusCode: 500,
            timestamp: new Date().toISOString(),
            requestId,
          }),
          {
            status: 500,
            headers: {
              "Content-Type": "application/json",
              "X-Request-Id": requestId,
              "Access-Control-Allow-Origin": config.apiInfo.cors,
              "Access-Control-Allow-Headers": "Content-Type, Authorization",
              "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            },
          }
        );
      }
    }
  ); // Close HTTP span wrapper
}
