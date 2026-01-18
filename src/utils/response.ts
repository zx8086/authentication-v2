/* src/utils/response.ts */

import { loadConfig } from "../config/index";
import { type ErrorCode, getErrorDefinition } from "../errors/error-codes";

const config = loadConfig();

/**
 * API Versioning Constants and Functions
 * Supports header-based versioning via Accept-Version header
 */
export type ApiVersion = "v1" | "v2";

export const SUPPORTED_API_VERSIONS: ApiVersion[] = ["v1", "v2"];
export const DEFAULT_API_VERSION: ApiVersion = "v1";

/**
 * Check if a version string is a valid API version
 */
export function isValidApiVersion(version: string): version is ApiVersion {
  return SUPPORTED_API_VERSIONS.includes(version as ApiVersion);
}

/**
 * Extract API version from request Accept-Version header
 * Returns default version if header is missing or invalid
 */
export function getApiVersion(request: Request): ApiVersion {
  const acceptVersion = request.headers.get("Accept-Version");
  if (acceptVersion && isValidApiVersion(acceptVersion)) {
    return acceptVersion;
  }
  return DEFAULT_API_VERSION;
}

/**
 * Generate a unique request ID using crypto.randomUUID().
 * This is the standard format for request IDs across the service.
 */
export function generateRequestId(): string {
  return crypto.randomUUID();
}

/**
 * Generate a key ID without dashes (for Kong consumer keys).
 * Uses UUID with dashes stripped for compatibility.
 */
export function generateKeyId(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

interface ErrorResponseData {
  error: {
    code: string;
    title: string;
    message: string;
    details?: Record<string, unknown>;
  };
  statusCode: number;
  timestamp: string;
  requestId: string;
}

interface LegacyErrorResponseData {
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
  requestId: string;
}

interface SuccessResponseData {
  [key: string]: any;
}

export function getSecurityHeaders(): Record<string, string> {
  return {
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "0",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
  };
}

export function getDefaultHeaders(
  requestId: string,
  apiVersion?: ApiVersion
): Record<string, string> {
  const baseHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Request-Id": requestId,
    "Access-Control-Allow-Origin": config.apiInfo.cors,
    "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept-Version",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };

  // V2 includes security headers and API-Version response header
  if (apiVersion === "v2") {
    return {
      ...baseHeaders,
      ...getSecurityHeaders(),
      "API-Version": "v2",
    };
  }

  // V1 (default) - no security headers for backward compatibility
  return baseHeaders;
}

export function getCacheHeaders(): Record<string, string> {
  return {
    "Cache-Control": "no-store, no-cache, must-revalidate",
    Pragma: "no-cache",
  };
}

export function getNoCacheHeaders(): Record<string, string> {
  return {
    "Cache-Control": "no-cache",
  };
}

export function createSuccessResponse(
  data: SuccessResponseData,
  requestId: string,
  additionalHeaders?: Record<string, string>
): Response {
  const headers = {
    ...getDefaultHeaders(requestId),
    ...additionalHeaders,
  };

  return new Response(JSON.stringify(data), {
    status: 200,
    headers,
  });
}

export function createErrorResponse(
  statusCode: number,
  error: string,
  message: string,
  requestId: string,
  additionalHeaders?: Record<string, string>
): Response {
  const errorData: LegacyErrorResponseData = {
    error,
    message,
    statusCode,
    timestamp: new Date().toISOString(),
    requestId,
  };

  const headers = {
    ...getDefaultHeaders(requestId),
    ...additionalHeaders,
  };

  return new Response(JSON.stringify(errorData), {
    status: statusCode,
    headers,
  });
}

export function createStructuredErrorResponse(
  errorCode: ErrorCode,
  requestId: string,
  details?: Record<string, unknown>,
  additionalHeaders?: Record<string, string>
): Response {
  const errorDef = getErrorDefinition(errorCode);

  const errorData: ErrorResponseData = {
    error: {
      code: errorDef.code,
      title: errorDef.title,
      message: errorDef.description,
      ...(details && { details }),
    },
    statusCode: errorDef.httpStatus,
    timestamp: new Date().toISOString(),
    requestId,
  };

  const headers = {
    ...getDefaultHeaders(requestId),
    ...additionalHeaders,
  };

  return new Response(JSON.stringify(errorData), {
    status: errorDef.httpStatus,
    headers,
  });
}

export function createStructuredErrorWithMessage(
  errorCode: ErrorCode,
  customMessage: string,
  requestId: string,
  details?: Record<string, unknown>,
  additionalHeaders?: Record<string, string>
): Response {
  const errorDef = getErrorDefinition(errorCode);

  const errorData: ErrorResponseData = {
    error: {
      code: errorDef.code,
      title: errorDef.title,
      message: customMessage,
      ...(details && { details }),
    },
    statusCode: errorDef.httpStatus,
    timestamp: new Date().toISOString(),
    requestId,
  };

  const headers = {
    ...getDefaultHeaders(requestId),
    ...additionalHeaders,
  };

  return new Response(JSON.stringify(errorData), {
    status: errorDef.httpStatus,
    headers,
  });
}

export function createHealthResponse(data: any, statusCode: number, requestId: string): Response {
  const headers = {
    ...getDefaultHeaders(requestId),
    ...getNoCacheHeaders(),
  };

  return new Response(JSON.stringify(data, null, 2), {
    status: statusCode,
    headers,
  });
}

export function createTokenResponse(
  accessToken: string,
  expiresIn: number,
  requestId: string,
  apiVersion?: string
): Response {
  const tokenData = {
    access_token: accessToken,
    expires_in: expiresIn,
    ...(apiVersion && { apiVersion }),
  };

  const headers = {
    ...getDefaultHeaders(requestId),
    ...getCacheHeaders(),
    ...(apiVersion && { "API-Version": apiVersion }),
  };

  return new Response(JSON.stringify(tokenData), {
    status: 200,
    headers,
  });
}

export function createUnauthorizedResponse(message: string, requestId: string): Response {
  return createErrorResponse(401, "Unauthorized", message, requestId);
}

export function createInternalErrorResponse(message: string, requestId: string): Response {
  return createErrorResponse(500, "Internal Server Error", message, requestId);
}

export function createServiceUnavailableResponse(message: string, requestId: string): Response {
  return createErrorResponse(503, "Service Unavailable", message, requestId);
}
