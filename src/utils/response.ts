/* src/utils/response.ts */

import { loadConfig } from "../config/index";

const config = loadConfig();

interface ErrorResponseData {
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
  requestId: string;
}

interface SuccessResponseData {
  [key: string]: any;
}

export function getDefaultHeaders(requestId: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "X-Request-Id": requestId,
    "Access-Control-Allow-Origin": config.apiInfo.cors,
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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
  const errorData: ErrorResponseData = {
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
  requestId: string
): Response {
  const tokenData = {
    access_token: accessToken,
    expires_in: expiresIn,
  };

  const headers = {
    ...getDefaultHeaders(requestId),
    ...getCacheHeaders(),
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
