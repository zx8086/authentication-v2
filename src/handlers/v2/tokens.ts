/* src/handlers/v2/tokens.ts */

import { getApiV2Config, loadConfig } from "../../config/index";
import { NativeBunJWT } from "../../services/jwt.service";
import { jwtAuditService } from "../../services/jwt-audit.service";
import type { IKongService } from "../../services/kong.service";
import { securityHeadersService } from "../../services/security-headers.service";
import { getVolumeBucket, incrementConsumerRequest } from "../../telemetry/consumer-volume";
import {
  recordAuthenticationAttempt,
  recordConsumerError,
  recordConsumerLatency,
  recordConsumerRequest,
  recordError,
  recordException,
  recordJwtTokenIssued,
  recordOperationDuration,
} from "../../telemetry/metrics";
import { telemetryTracer } from "../../telemetry/tracer";
import { error, log } from "../../utils/logger";
import {
  createInternalErrorResponse,
  createTokenResponse,
  createUnauthorizedResponse,
} from "../../utils/response";

const config = loadConfig();
const v2Config = getApiV2Config();

if (!v2Config) {
  throw new Error("V2 configuration not available");
}

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

function extractClientInfo(req: Request) {
  const userAgent = req.headers.get("User-Agent") || undefined;
  const clientIp = req.headers.get("X-Forwarded-For") || req.headers.get("X-Real-IP") || undefined;
  const geoLocation = req.headers.get("X-Geo-Location") || undefined;

  return {
    userAgent,
    clientIp,
    geoLocation,
  };
}

function extractJWTPayload(token: string, key: string, _secret: string): any {
  try {
    // Parse JWT token to extract payload for audit logging
    const parts = token.split(".");
    if (parts.length !== 3) {
      throw new Error("Invalid JWT format");
    }

    // Decode base64url payload
    const payload = parts[1];
    const decodedPayload = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decodedPayload);
  } catch (_error) {
    // Return minimal payload if parsing fails
    return {
      sub: "unknown",
      iss: config.jwt.issuer || config.jwt.authority,
      aud: config.jwt.audience,
      exp: Math.floor(Date.now() / 1000) + config.jwt.expirationMinutes * 60,
      iat: Math.floor(Date.now() / 1000),
      jti: crypto.randomUUID(),
      key,
    };
  }
}

async function lookupConsumerSecret(
  consumerId: string,
  _username: string,
  kongService: IKongService,
  requestId: string
): Promise<{ key: string; secret: string } | null> {
  const secretStartTime = Bun.nanoseconds();

  try {
    const secretResult = await telemetryTracer.createKongSpan(
      "getConsumerSecret",
      `${config.kong.adminUrl}/consumers/${consumerId}/jwt`,
      "GET",
      () => kongService.getConsumerSecret(consumerId)
    );
    const secretDuration = (Bun.nanoseconds() - secretStartTime) / 1_000_000;
    recordOperationDuration("kong_get_consumer_secret", secretDuration, true);

    return secretResult;
  } catch (kongError) {
    // Audit Kong service unavailability as a security event
    jwtAuditService.auditSecurityEvent({
      requestId,
      type: "anomaly_detected",
      severity: "medium",
      description: "Kong Admin API unavailable during consumer lookup",
      details: {
        consumerId,
        error: kongError instanceof Error ? kongError.message : "Unknown Kong error",
        operation: "getConsumerSecret",
      },
      remediation: "Check Kong Admin API connectivity and credentials",
      riskScore: 40,
    });

    throw kongError;
  }
}

async function generateJWTToken(
  username: string,
  key: string,
  secret: string,
  requestId: string,
  consumerId: string,
  clientInfo: { userAgent?: string; clientIp?: string; geoLocation?: string }
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

  // Extract JWT payload from the token for audit logging
  const jwtPayload = extractJWTPayload(tokenResponse.access_token, key, secret);

  // Audit JWT token issuance for v2
  jwtAuditService.auditTokenIssuance({
    requestId,
    consumerId,
    consumerUsername: username,
    jwtPayload,
    userAgent: clientInfo.userAgent,
    clientIp: clientInfo.clientIp,
    geoLocation: clientInfo.geoLocation,
  });

  return {
    access_token: tokenResponse.access_token,
    expires_in: config.jwt.expirationMinutes * 60,
  };
}

export async function handleV2TokenRequest(
  req: Request,
  kongService: IKongService
): Promise<Response> {
  log("Processing v2 token request with enhanced security", {
    component: "tokens-v2",
    operation: "handle_v2_token_request",
    endpoint: "/tokens",
    version: "v2",
    securityHeaders: v2Config?.securityHeaders.enabled,
    auditLogging: v2Config?.auditLogging.enabled,
  });

  const requestId = crypto.randomUUID();
  const url = new URL(req.url);
  const startTime = Bun.nanoseconds();
  const clientInfo = extractClientInfo(req);

  return telemetryTracer.createHttpSpan(req.method, url.pathname, 200, async () => {
    log("V2 token request started", {
      method: req.method,
      url: url.pathname,
      requestId,
      version: "v2",
    });

    const headerValidation = validateKongHeaders(req);

    // Extract consumer ID for volume tracking
    const consumerId = req.headers.get(config.kong.consumerIdHeader);

    if ("error" in headerValidation) {
      const duration = (Bun.nanoseconds() - startTime) / 1_000_000;
      recordAuthenticationAttempt("header_validation_failed", false);
      recordError("kong_header_validation_failed", {
        error: headerValidation.error,
        version: "v2",
        headers: {
          consumerId: req.headers.get(config.kong.consumerIdHeader) || "missing",
          username: req.headers.get(config.kong.consumerUsernameHeader) || "missing",
          isAnonymous: req.headers.get(config.kong.anonymousHeader) || "false",
        },
      });

      // Audit authentication failure
      jwtAuditService.auditAuthenticationAttempt({
        requestId,
        result: "failure",
        failureReason: headerValidation.error,
        userAgent: clientInfo.userAgent,
        clientIp: clientInfo.clientIp,
      });

      // Audit as security event if suspicious pattern detected
      if (headerValidation.error.includes("Anonymous consumers")) {
        jwtAuditService.auditSecurityEvent({
          requestId,
          type: "policy_violation",
          severity: "low",
          description: "Anonymous consumer attempted authentication",
          details: {
            reason: headerValidation.error,
            headers: {
              isAnonymous: req.headers.get(config.kong.anonymousHeader),
            },
          },
          userAgent: clientInfo.userAgent,
          clientIp: clientInfo.clientIp,
          geoLocation: clientInfo.geoLocation,
          remediation: "Ensure client is properly authenticated before accessing API",
          riskScore: 20,
        });
      }

      // Record consumer error metrics if consumer ID available
      if (consumerId) {
        const volume = getVolumeBucket(consumerId);
        recordConsumerError(volume);
        recordConsumerLatency(volume, duration);
      }

      log("V2 HTTP request processed", {
        method: req.method,
        url: url.pathname,
        statusCode: 401,
        duration,
        requestId,
        version: "v2",
        error: headerValidation.error,
      });

      const response = createUnauthorizedResponse(headerValidation.error, requestId);
      return securityHeadersService.applyToResponse(response, requestId);
    }

    try {
      const { consumerId, username } = headerValidation;

      // Track consumer request and get volume bucket
      incrementConsumerRequest(consumerId);
      const volume = getVolumeBucket(consumerId);
      recordConsumerRequest(volume);

      let secretResult: { key: string; secret: string } | null;
      try {
        secretResult = await lookupConsumerSecret(consumerId, username, kongService, requestId);
      } catch (kongError) {
        const duration = (Bun.nanoseconds() - startTime) / 1_000_000;
        recordAuthenticationAttempt("kong_unavailable", false, username);
        recordError("kong_service_unavailable", {
          consumerId,
          username,
          version: "v2",
          error: kongError instanceof Error ? kongError.message : "Kong service unavailable",
        });

        // Audit authentication failure
        jwtAuditService.auditAuthenticationAttempt({
          requestId,
          result: "failure",
          consumerId,
          consumerUsername: username,
          failureReason: "Kong service unavailable",
          userAgent: clientInfo.userAgent,
          clientIp: clientInfo.clientIp,
        });

        // Record consumer error metrics
        recordConsumerError(volume);
        recordConsumerLatency(volume, duration);

        error("Kong service unavailable during v2 token request", {
          consumerId,
          username,
          version: "v2",
          error: kongError instanceof Error ? kongError.message : "Unknown Kong error",
          requestId,
        });

        log("V2 HTTP request processed", {
          method: req.method,
          url: url.pathname,
          statusCode: 503,
          duration,
          requestId,
          version: "v2",
          error: "Service temporarily unavailable",
        });

        const response = new Response(
          JSON.stringify({
            error: "Service Unavailable",
            message: "Authentication service is temporarily unavailable. Please try again later.",
            details: "Kong gateway connectivity issues",
            timestamp: new Date().toISOString(),
            version: "v2",
          }),
          {
            status: 503,
            headers: {
              "Content-Type": "application/json",
              "X-Request-Id": requestId,
              "Retry-After": "30",
              "X-API-Version": "v2",
            },
          }
        );

        return securityHeadersService.applyToResponse(response, requestId);
      }

      if (!secretResult) {
        const duration = (Bun.nanoseconds() - startTime) / 1_000_000;
        recordAuthenticationAttempt("consumer_lookup_failed", false, username);
        recordError("kong_consumer_lookup_failed", {
          consumerId,
          username,
          version: "v2",
          error: "Consumer not found or no JWT credentials",
        });

        // Audit authentication failure
        jwtAuditService.auditAuthenticationAttempt({
          requestId,
          result: "failure",
          consumerId,
          consumerUsername: username,
          failureReason: "Consumer not found or no JWT credentials",
          userAgent: clientInfo.userAgent,
          clientIp: clientInfo.clientIp,
        });

        // Audit as potential security event
        jwtAuditService.auditSecurityEvent({
          requestId,
          type: "authentication_failure",
          severity: "low",
          description: "Consumer lookup failed - invalid or non-existent consumer",
          details: {
            consumerId,
            username,
            reason: "Consumer not found or no JWT credentials",
          },
          userAgent: clientInfo.userAgent,
          clientIp: clientInfo.clientIp,
          geoLocation: clientInfo.geoLocation,
          remediation: "Verify consumer exists and has valid JWT credentials in Kong",
          riskScore: 25,
        });

        // Record consumer error metrics
        recordConsumerError(volume);
        recordConsumerLatency(volume, duration);

        log("V2 consumer not found or has no JWT credentials", {
          consumerId,
          username,
          version: "v2",
          error: "Invalid consumer credentials",
          requestId,
        });

        log("V2 HTTP request processed", {
          method: req.method,
          url: url.pathname,
          statusCode: 401,
          duration,
          requestId,
          version: "v2",
          error: "Invalid consumer credentials",
        });

        const response = createUnauthorizedResponse("Invalid consumer credentials", requestId);
        return securityHeadersService.applyToResponse(response, requestId);
      }

      // Use original username for JWT claims
      const effectiveUsername = username;

      const tokenData = await generateJWTToken(
        effectiveUsername,
        secretResult.key,
        secretResult.secret,
        requestId,
        consumerId,
        clientInfo
      );

      const duration = (Bun.nanoseconds() - startTime) / 1_000_000;
      recordAuthenticationAttempt("success", true, username);

      // Audit successful authentication
      jwtAuditService.auditAuthenticationAttempt({
        requestId,
        result: "success",
        consumerId,
        consumerUsername: username,
        userAgent: clientInfo.userAgent,
        clientIp: clientInfo.clientIp,
      });

      // Record successful consumer metrics
      recordConsumerLatency(volume, duration);

      log("V2 JWT token generated successfully", {
        consumerId,
        username,
        version: "v2",
        totalDuration: duration,
        requestId,
        securityEnhanced: true,
      });

      log("V2 HTTP request processed", {
        method: req.method,
        url: url.pathname,
        statusCode: 200,
        duration,
        requestId,
        version: "v2",
      });

      const response = createTokenResponse(tokenData.access_token, tokenData.expires_in, requestId);

      // Add v2 version header before applying security headers
      response.headers.set("X-API-Version", "v2");

      return securityHeadersService.applyToResponse(response, requestId);
    } catch (err) {
      const duration = (Bun.nanoseconds() - startTime) / 1_000_000;
      recordAuthenticationAttempt("exception", false, headerValidation.username);
      recordException(err as Error);

      // Audit the exception as a security event
      jwtAuditService.auditSecurityEvent({
        requestId,
        type: "anomaly_detected",
        severity: "medium",
        description: "Unexpected exception during token generation",
        details: {
          consumerId: headerValidation.consumerId,
          username: headerValidation.username,
          error: err instanceof Error ? err.message : "Unknown error",
          stack: err instanceof Error ? err.stack : undefined,
        },
        userAgent: clientInfo.userAgent,
        clientIp: clientInfo.clientIp,
        geoLocation: clientInfo.geoLocation,
        remediation: "Investigate system health and error patterns",
        riskScore: 50,
      });

      // Record consumer error metrics for exceptions
      if (consumerId) {
        const volume = getVolumeBucket(consumerId);
        recordConsumerError(volume);
        recordConsumerLatency(volume, duration);
      }

      error("Unexpected error during v2 token generation", {
        error: err instanceof Error ? err.message : "Unknown error",
        stack: err instanceof Error ? err.stack : undefined,
        consumerId: headerValidation.consumerId,
        username: headerValidation.username,
        version: "v2",
        requestId,
      });

      log("V2 HTTP request processed", {
        method: req.method,
        url: url.pathname,
        statusCode: 500,
        duration,
        requestId,
        version: "v2",
        error: "Unexpected error",
      });

      const response = createInternalErrorResponse(
        "An unexpected error occurred during token generation",
        requestId
      );

      return securityHeadersService.applyToResponse(response, requestId);
    }
  });
}
