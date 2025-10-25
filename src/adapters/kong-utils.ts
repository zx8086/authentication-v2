/* src/adapters/kong-utils.ts */

import type { ConsumerSecret } from "../config";

/**
 * Shared Kong utility functions
 *
 * These utilities consolidate common operations that were duplicated
 * across KongApiGatewayService and KongKonnectService.
 */

/**
 * Custom error class that preserves HTTP status information
 * for proper circuit breaker error classification
 */
export class KongApiError extends Error {
  public readonly status: number;
  public readonly statusText: string;
  public readonly isInfrastructureError: boolean;

  constructor(message: string, status: number, statusText: string = "") {
    super(message);
    this.name = "KongApiError";
    this.status = status;
    this.statusText = statusText;

    // Determine if this is an infrastructure error that should trigger circuit breaker
    this.isInfrastructureError = this.determineIfInfrastructureError(status);
  }

  private determineIfInfrastructureError(status: number): boolean {
    // Infrastructure failures that should trigger circuit breaker
    if (status >= 500 && status < 600) return true; // 5xx server errors
    if (status === 429) return true; // Rate limiting (infrastructure constraint)
    if (status === 502) return true; // Bad gateway
    if (status === 503) return true; // Service unavailable
    if (status === 504) return true; // Gateway timeout

    // Business logic responses that should NOT trigger circuit breaker
    return false;
  }
}

/**
 * Generate cache key for consumer secrets
 * @param consumerId - Consumer identifier
 * @returns Standardized cache key
 */
export function generateCacheKey(consumerId: string): string {
  return `consumer_secret:${consumerId}`;
}

/**
 * Generate cryptographically secure secret for JWT credentials
 * @returns 64-character hexadecimal secret
 */
export function generateSecureSecret(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Generate random UUID for JWT key (without hyphens)
 * @returns UUID string without hyphens
 */
export function generateJwtKey(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

/**
 * Create a KongApiError from a failed Response
 * @param response - Failed HTTP response from Kong API
 * @returns KongApiError with status information preserved
 */
export async function createKongApiError(response: Response): Promise<KongApiError> {
  const status = response.status;
  const statusText = response.statusText || "Unknown";
  const message = await parseKongApiErrorMessage(response);

  return new KongApiError(message, status, statusText);
}

/**
 * Parse Kong API error response and extract meaningful error information
 * @param response - Failed HTTP response from Kong API
 * @returns Standardized error message
 */
export async function parseKongApiError(response: Response): Promise<string> {
  return parseKongApiErrorMessage(response);
}

/**
 * Internal function to parse error message from Kong API response
 * @param response - Failed HTTP response from Kong API
 * @returns Standardized error message
 */
async function parseKongApiErrorMessage(response: Response): Promise<string> {
  const status = response.status;
  const statusText = response.statusText || "Unknown";

  // Common Kong error patterns
  switch (status) {
    case 401:
      return "Authentication failed - invalid Kong admin token";
    case 403:
      return "Permission denied - insufficient Kong admin privileges";
    case 404:
      return "Kong admin API endpoint not found - check URL configuration";
    case 429:
      return "Rate limit exceeded - too many requests to Kong admin API";
    case 500:
      return "Kong internal server error - check Kong service health";
    case 502:
      return "Kong gateway error - upstream service unavailable";
    case 503:
      return "Kong service unavailable - check Kong admin API status";
    default:
      // Try to get detailed error from response body
      try {
        const errorText = await response.text();
        return `Kong API error: ${status} ${statusText}${errorText ? ` - ${errorText}` : ""}`;
      } catch {
        return `Kong API error: ${status} ${statusText}`;
      }
  }
}

/**
 * Create standard request headers for Kong API calls
 * @param baseHeaders - Additional headers to include
 * @returns Headers with User-Agent and other standard fields
 */
export function createStandardHeaders(
  baseHeaders: Record<string, string> = {}
): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "User-Agent": "Authentication-Service/1.0",
    ...baseHeaders,
  };
}

/**
 * Create AbortSignal with timeout for Kong API requests
 * @param timeoutMs - Timeout in milliseconds (default: 5000)
 * @returns AbortSignal that will timeout after specified duration
 */
export function createRequestTimeout(timeoutMs: number = 5000): AbortSignal {
  return AbortSignal.timeout(timeoutMs);
}

/**
 * Validate consumer secret response from Kong API
 * @param data - Response data from Kong API
 * @returns First valid consumer secret or null
 */
export function extractConsumerSecret(data: {
  data?: ConsumerSecret[];
  total?: number;
}): ConsumerSecret | null {
  if (!data.data || !Array.isArray(data.data) || data.data.length === 0) {
    return null;
  }

  const secret = data.data[0];

  // Validate required fields
  if (!secret || !secret.id || !secret.key || !secret.secret || !secret.consumer?.id) {
    return null;
  }

  return secret;
}

/**
 * Check if response indicates consumer not found (404 or empty result)
 * @param response - HTTP response from Kong API
 * @returns True if consumer was not found
 */
export function isConsumerNotFound(response: Response): boolean {
  return response.status === 404;
}

/**
 * Check if response indicates successful operation
 * @param response - HTTP response from Kong API
 * @returns True if operation was successful
 */
export function isSuccessResponse(response: Response): boolean {
  return response.ok && response.status >= 200 && response.status < 300;
}
