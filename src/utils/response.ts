/* src/utils/response.ts */

/**
 * Response utilities implementing RFC 7807 Problem Details for HTTP APIs.
 * @see https://www.rfc-editor.org/rfc/rfc7807
 *
 * All error responses follow the Problem Details specification with:
 * - type: URI reference identifying the problem type
 * - title: Short, human-readable summary
 * - status: HTTP status code
 * - detail: Human-readable explanation
 * - instance: URI reference for the specific occurrence
 *
 * Extensions (beyond RFC 7807):
 * - code: Internal error code (AUTH_001, etc.)
 * - requestId: Correlation ID for tracing
 * - timestamp: ISO 8601 timestamp
 *
 * RFC 8594 Sunset Header Support:
 * @see https://www.rfc-editor.org/rfc/rfc8594
 * - Sunset: HTTP date when the API version will be retired
 * - Deprecation: Indicates the resource is deprecated
 * - Link: Points to migration documentation
 */

import { loadConfig } from "../config/index";
import { type ErrorCode, getErrorDefinition, getProblemTypeUri } from "../errors/error-codes";

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

/**
 * RFC 7807 Problem Details response structure.
 * @see https://www.rfc-editor.org/rfc/rfc7807#section-3.1
 */
interface ProblemDetailsResponse {
  /** URI reference that identifies the problem type */
  type: string;
  /** Short, human-readable summary of the problem type */
  title: string;
  /** HTTP status code */
  status: number;
  /** Human-readable explanation specific to this occurrence */
  detail: string;
  /** URI reference that identifies the specific occurrence */
  instance: string;
  /** Internal error code for programmatic handling */
  code: string;
  /** Correlation ID for distributed tracing */
  requestId: string;
  /** ISO 8601 timestamp of when the error occurred */
  timestamp: string;
  /** Additional context-specific details */
  extensions?: Record<string, unknown>;
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

/**
 * Get headers for RFC 7807 Problem Details error responses.
 * Uses application/problem+json content type as per RFC 7807.
 */
export function getProblemDetailsHeaders(
  requestId: string,
  apiVersion?: ApiVersion
): Record<string, string> {
  const headers = getDefaultHeaders(requestId, apiVersion);
  // RFC 7807 specifies application/problem+json for error responses
  headers["Content-Type"] = "application/problem+json";
  return headers;
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

/**
 * Create an RFC 7807 Problem Details error response.
 * @deprecated Use createStructuredErrorResponse with ErrorCodes for better type safety.
 */
export function createErrorResponse(
  statusCode: number,
  error: string,
  message: string,
  requestId: string,
  additionalHeaders?: Record<string, string>,
  instance?: string
): Response {
  const problemDetails: ProblemDetailsResponse = {
    type: "about:blank", // Generic type for legacy errors
    title: error,
    status: statusCode,
    detail: message,
    instance: instance || "/",
    code: "LEGACY_ERROR",
    requestId,
    timestamp: new Date().toISOString(),
  };

  const headers = {
    ...getProblemDetailsHeaders(requestId),
    ...additionalHeaders,
  };

  return new Response(JSON.stringify(problemDetails), {
    status: statusCode,
    headers,
  });
}

/**
 * Create an RFC 7807 Problem Details error response from a structured error code.
 *
 * @param errorCode - The error code (AUTH_001, etc.)
 * @param requestId - Correlation ID for tracing
 * @param details - Additional context-specific details
 * @param additionalHeaders - Extra headers to include
 * @param instance - The specific resource/endpoint that caused the error
 * @returns RFC 7807 compliant error response
 *
 * @example
 * ```typescript
 * return createStructuredErrorResponse(
 *   ErrorCodes.AUTH_001,
 *   requestId,
 *   { reason: "X-Consumer-ID header missing" },
 *   undefined,
 *   "/tokens"
 * );
 * ```
 */
export function createStructuredErrorResponse(
  errorCode: ErrorCode,
  requestId: string,
  details?: Record<string, unknown>,
  additionalHeaders?: Record<string, string>,
  instance?: string
): Response {
  const errorDef = getErrorDefinition(errorCode);

  const problemDetails: ProblemDetailsResponse = {
    type: getProblemTypeUri(errorCode),
    title: errorDef.title,
    status: errorDef.httpStatus,
    detail: errorDef.description,
    instance: instance || "/",
    code: errorDef.code,
    requestId,
    timestamp: new Date().toISOString(),
    ...(details && Object.keys(details).length > 0 && { extensions: details }),
  };

  const headers = {
    ...getProblemDetailsHeaders(requestId),
    ...additionalHeaders,
  };

  return new Response(JSON.stringify(problemDetails), {
    status: errorDef.httpStatus,
    headers,
  });
}

/**
 * Create an RFC 7807 Problem Details error response with a custom detail message.
 *
 * @param errorCode - The error code (AUTH_001, etc.)
 * @param customMessage - Custom detail message (overrides default description)
 * @param requestId - Correlation ID for tracing
 * @param details - Additional context-specific details
 * @param additionalHeaders - Extra headers to include
 * @param instance - The specific resource/endpoint that caused the error
 * @returns RFC 7807 compliant error response
 */
export function createStructuredErrorWithMessage(
  errorCode: ErrorCode,
  customMessage: string,
  requestId: string,
  details?: Record<string, unknown>,
  additionalHeaders?: Record<string, string>,
  instance?: string
): Response {
  const errorDef = getErrorDefinition(errorCode);

  const problemDetails: ProblemDetailsResponse = {
    type: getProblemTypeUri(errorCode),
    title: errorDef.title,
    status: errorDef.httpStatus,
    detail: customMessage,
    instance: instance || "/",
    code: errorDef.code,
    requestId,
    timestamp: new Date().toISOString(),
    ...(details && Object.keys(details).length > 0 && { extensions: details }),
  };

  const headers = {
    ...getProblemDetailsHeaders(requestId),
    ...additionalHeaders,
  };

  return new Response(JSON.stringify(problemDetails), {
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

/**
 * Create an unauthorized (401) RFC 7807 error response.
 * @deprecated Use createStructuredErrorResponse with specific ErrorCodes.
 */
export function createUnauthorizedResponse(
  message: string,
  requestId: string,
  instance?: string
): Response {
  return createErrorResponse(401, "Unauthorized", message, requestId, undefined, instance);
}

/**
 * Create an internal server error (500) RFC 7807 error response.
 * @deprecated Use createStructuredErrorResponse with ErrorCodes.AUTH_008.
 */
export function createInternalErrorResponse(
  message: string,
  requestId: string,
  instance?: string
): Response {
  return createErrorResponse(500, "Internal Server Error", message, requestId, undefined, instance);
}

/**
 * Create a service unavailable (503) RFC 7807 error response.
 * @deprecated Use createStructuredErrorResponse with ErrorCodes.AUTH_004 or AUTH_005.
 */
export function createServiceUnavailableResponse(
  message: string,
  requestId: string,
  instance?: string
): Response {
  return createErrorResponse(503, "Service Unavailable", message, requestId, undefined, instance);
}

/**
 * RFC 8594 Sunset header configuration for API deprecation.
 */
export interface DeprecationConfig {
  /** The date when the API version will be retired (RFC 7231 HTTP-date format) */
  sunsetDate: Date;
  /** URL to migration documentation */
  migrationUrl?: string;
  /** Additional deprecation message */
  message?: string;
}

/**
 * Version-specific deprecation configurations.
 * Set to undefined for non-deprecated versions.
 */
export type VersionDeprecationMap = Partial<Record<ApiVersion, DeprecationConfig>>;

/**
 * Add RFC 8594 deprecation headers to a Headers object.
 *
 * Implements the Sunset HTTP Header Field specification for communicating
 * API version deprecation to clients.
 *
 * @see https://www.rfc-editor.org/rfc/rfc8594
 *
 * Headers added:
 * - Sunset: HTTP-date when the resource will be removed (RFC 7231 format)
 * - Deprecation: "true" to indicate the resource is deprecated
 * - Link: Optional rel="sunset" pointing to migration documentation
 *
 * @param headers - The Headers object to add deprecation headers to
 * @param deprecationConfig - Configuration for the deprecation headers
 *
 * @example
 * ```typescript
 * const headers = new Headers();
 * addDeprecationHeaders(headers, {
 *   sunsetDate: new Date('2025-06-01T00:00:00Z'),
 *   migrationUrl: 'https://docs.example.com/api/v2-migration'
 * });
 * // Adds:
 * // Sunset: Sun, 01 Jun 2025 00:00:00 GMT
 * // Deprecation: true
 * // Link: <https://docs.example.com/api/v2-migration>; rel="sunset"
 * ```
 */
export function addDeprecationHeaders(
  headers: Headers,
  deprecationConfig: DeprecationConfig
): void {
  // RFC 8594: Sunset header uses RFC 7231 HTTP-date format
  headers.set("Sunset", deprecationConfig.sunsetDate.toUTCString());

  // Deprecation header indicates the resource is deprecated
  headers.set("Deprecation", "true");

  // Optional Link header with rel="sunset" pointing to migration docs
  if (deprecationConfig.migrationUrl) {
    const existingLink = headers.get("Link");
    const sunsetLink = `<${deprecationConfig.migrationUrl}>; rel="sunset"`;

    if (existingLink) {
      // Append to existing Link header with comma separation
      headers.set("Link", `${existingLink}, ${sunsetLink}`);
    } else {
      headers.set("Link", sunsetLink);
    }
  }
}

/**
 * Get deprecation headers as a record for use with response utilities.
 *
 * @param deprecationConfig - Configuration for the deprecation headers
 * @returns Record of deprecation headers
 */
export function getDeprecationHeaders(
  deprecationConfig: DeprecationConfig
): Record<string, string> {
  const headers: Record<string, string> = {
    Sunset: deprecationConfig.sunsetDate.toUTCString(),
    Deprecation: "true",
  };

  if (deprecationConfig.migrationUrl) {
    headers.Link = `<${deprecationConfig.migrationUrl}>; rel="sunset"`;
  }

  return headers;
}

/**
 * Check if an API version is deprecated based on a deprecation map.
 *
 * @param version - The API version to check
 * @param deprecationMap - Map of version-specific deprecation configs
 * @returns The deprecation config if deprecated, undefined otherwise
 */
export function getVersionDeprecation(
  version: ApiVersion,
  deprecationMap: VersionDeprecationMap
): DeprecationConfig | undefined {
  return deprecationMap[version];
}

/**
 * Check if a sunset date has passed (version is fully retired).
 *
 * @param deprecationConfig - The deprecation configuration
 * @returns true if the sunset date has passed
 */
export function isSunsetPassed(deprecationConfig: DeprecationConfig): boolean {
  return new Date() > deprecationConfig.sunsetDate;
}

/**
 * Rate limit information for RFC 6585 compliant responses.
 * @see https://www.rfc-editor.org/rfc/rfc6585#section-4
 */
export interface RateLimitInfo {
  /** Maximum requests allowed in the time window */
  limit: number;
  /** Remaining requests in current window */
  remaining: number;
  /** Time when the rate limit resets (Unix timestamp in seconds) */
  reset: number;
  /** Time window duration in seconds (optional) */
  window?: number;
}

/**
 * Get RFC 6585 compliant rate limit headers.
 * Uses standardized X-RateLimit-* headers for client visibility.
 *
 * @param rateLimitInfo - Rate limit information
 * @returns Record of rate limit headers
 *
 * @example
 * ```typescript
 * const headers = getRateLimitHeaders({
 *   limit: 100,
 *   remaining: 42,
 *   reset: Math.floor(Date.now() / 1000) + 3600
 * });
 * // Returns:
 * // {
 * //   "X-RateLimit-Limit": "100",
 * //   "X-RateLimit-Remaining": "42",
 * //   "X-RateLimit-Reset": "1234567890"
 * // }
 * ```
 */
export function getRateLimitHeaders(rateLimitInfo: RateLimitInfo): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(rateLimitInfo.limit),
    "X-RateLimit-Remaining": String(rateLimitInfo.remaining),
    "X-RateLimit-Reset": String(rateLimitInfo.reset),
  };

  if (rateLimitInfo.window) {
    headers["X-RateLimit-Window"] = String(rateLimitInfo.window);
  }

  return headers;
}

/**
 * Create a 429 Too Many Requests RFC 7807 error response with rate limit headers.
 *
 * @param errorCode - Should be ErrorCodes.AUTH_006
 * @param requestId - Correlation ID for tracing
 * @param rateLimitInfo - Rate limit information for headers
 * @param retryAfter - Seconds until client should retry (optional)
 * @param instance - The specific resource/endpoint that caused the error
 * @returns RFC 7807 compliant error response with rate limit headers
 */
export function createRateLimitErrorResponse(
  errorCode: ErrorCode,
  requestId: string,
  rateLimitInfo: RateLimitInfo,
  retryAfter?: number,
  instance?: string
): Response {
  const additionalHeaders: Record<string, string> = {
    ...getRateLimitHeaders(rateLimitInfo),
  };

  if (retryAfter) {
    additionalHeaders["Retry-After"] = String(retryAfter);
  }

  const details = {
    limit: rateLimitInfo.limit,
    resetAt: new Date(rateLimitInfo.reset * 1000).toISOString(),
  };

  return createStructuredErrorResponse(errorCode, requestId, details, additionalHeaders, instance);
}

/**
 * Generate an ETag for response content.
 * Uses SHA-256 hash for strong validation.
 *
 * @param content - Content to generate ETag for
 * @returns ETag header value (with quotes)
 */
export async function generateETag(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  // ETag should be quoted per RFC 7232
  return `"${hashHex.substring(0, 32)}"`;
}

/**
 * Check if request has matching ETag (for conditional requests).
 *
 * @param request - The incoming request
 * @param etag - The current ETag value
 * @returns true if ETags match (resource not modified)
 */
export function hasMatchingETag(request: Request, etag: string): boolean {
  const ifNoneMatch = request.headers.get("If-None-Match");
  return ifNoneMatch === etag;
}

/**
 * Create a 304 Not Modified response for conditional requests.
 *
 * @param requestId - Correlation ID for tracing
 * @param etag - ETag value for the resource
 * @param additionalHeaders - Extra headers to include
 * @returns 304 response with minimal headers
 */
export function createNotModifiedResponse(
  requestId: string,
  etag: string,
  additionalHeaders?: Record<string, string>
): Response {
  const headers = {
    "X-Request-Id": requestId,
    ETag: etag,
    ...additionalHeaders,
  };

  return new Response(null, {
    status: 304,
    headers,
  });
}

/**
 * Validation error detail for RFC 7807 responses.
 */
export interface ValidationError {
  /** Field name that failed validation */
  field: string;
  /** Validation error message */
  message: string;
  /** Expected value or format (optional) */
  expected?: string;
  /** Actual value received (optional, be careful with sensitive data) */
  actual?: string;
}

/**
 * Create an RFC 7807 error response for validation failures.
 * Returns 400 Bad Request with detailed field-level errors.
 *
 * @param errorCode - Should be ErrorCodes.AUTH_007
 * @param requestId - Correlation ID for tracing
 * @param validationErrors - Array of validation errors
 * @param instance - The specific resource/endpoint that caused the error
 * @returns RFC 7807 compliant error response with validation details
 */
export function createValidationErrorResponse(
  errorCode: ErrorCode,
  requestId: string,
  validationErrors: ValidationError[],
  instance?: string
): Response {
  const details = {
    validationErrors,
    count: validationErrors.length,
  };

  return createStructuredErrorResponse(errorCode, requestId, details, undefined, instance);
}

/**
 * Create a 405 Method Not Allowed RFC 7807 error response.
 * Includes Allow header with supported methods.
 *
 * @param requestId - Correlation ID for tracing
 * @param allowedMethods - Array of allowed HTTP methods
 * @param instance - The specific resource/endpoint that caused the error
 * @returns 405 response with Allow header
 */
export function createMethodNotAllowedResponse(
  requestId: string,
  allowedMethods: string[],
  instance?: string
): Response {
  const problemDetails = {
    type: "https://httpwg.org/specs/rfc9110.html#status.405",
    title: "Method Not Allowed",
    status: 405,
    detail: `The requested method is not allowed for this endpoint. Allowed methods: ${allowedMethods.join(", ")}`,
    instance: instance || "/",
    requestId,
    timestamp: new Date().toISOString(),
    extensions: {
      allowedMethods,
    },
  };

  const headers = {
    ...getProblemDetailsHeaders(requestId),
    Allow: allowedMethods.join(", "),
  };

  return new Response(JSON.stringify(problemDetails), {
    status: 405,
    headers,
  });
}
