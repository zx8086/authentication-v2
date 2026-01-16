/* src/utils/response.ts */

import { loadConfig } from "../config/index";
import {
  type ErrorCode,
  type ErrorDefinition,
  ErrorDefinitions,
  getErrorDefinition,
} from "../errors/error-codes";

const config = loadConfig();

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

export function getDefaultHeaders(requestId: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "X-Request-Id": requestId,
    "Access-Control-Allow-Origin": config.apiInfo.cors,
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    ...getSecurityHeaders(),
  };
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
