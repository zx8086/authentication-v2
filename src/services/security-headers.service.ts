/* src/services/security-headers.service.ts */

import { recordSecurityHeadersApplied } from "../telemetry/metrics";
import { log } from "../utils/logger";

export interface SecurityHeadersResult {
  headers: Record<string, string>;
  applied: boolean;
  version: string;
}

export class SecurityHeadersService {
  private static instance: SecurityHeadersService | null = null;

  /**
   * Get singleton instance (for performance)
   */
  static getInstance(): SecurityHeadersService {
    if (!SecurityHeadersService.instance) {
      SecurityHeadersService.instance = new SecurityHeadersService();
    }
    return SecurityHeadersService.instance;
  }

  /**
   * Reset singleton for testing
   */
  static resetInstance(): void {
    SecurityHeadersService.instance = null;
  }

  /**
   * Generate security headers for v2 API responses
   * Based on OWASP security header recommendations
   */
  generateSecurityHeaders(requestId?: string): SecurityHeadersResult {
    const startTime = performance.now();
    const headers: Record<string, string> = {};

    // HSTS (HTTP Strict Transport Security) - 1 year, include subdomains, preload
    headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload";

    // Content Security Policy - strict policy for v2
    headers["Content-Security-Policy"] = "default-src 'self'; script-src 'none'; object-src 'none'";

    // X-Frame-Options (Clickjacking protection)
    headers["X-Frame-Options"] = "DENY";

    // X-Content-Type-Options (MIME sniffing protection)
    headers["X-Content-Type-Options"] = "nosniff";

    // X-XSS-Protection (XSS attack protection)
    headers["X-XSS-Protection"] = "1; mode=block";

    // Referrer Policy (Control referrer information)
    headers["Referrer-Policy"] = "strict-origin-when-cross-origin";

    // Permissions Policy (Feature access control)
    headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=(), payment=(), usb=()";

    // Custom security headers for API v2
    headers["X-Security-Version"] = "v2";
    headers["X-Content-Security"] = "enhanced";

    // Add audit correlation header if provided
    if (requestId) {
      headers["X-Request-Security-ID"] = requestId;
    }

    const duration = performance.now() - startTime;

    log("Security headers generated for v2 API", {
      component: "security-headers",
      operation: "generate_headers",
      requestId,
      headersApplied: Object.keys(headers).length,
      duration: `${duration.toFixed(2)}ms`,
      headers: Object.keys(headers),
    });

    // Record security headers metrics
    recordSecurityHeadersApplied("v2", Object.keys(headers).length);

    return {
      headers,
      applied: true,
      version: "v2",
    };
  }

  /**
   * Apply security headers to a Response object
   */
  applyToResponse(response: Response, requestId?: string): Response {
    const securityResult = this.generateSecurityHeaders(requestId);

    if (!securityResult.applied) {
      return response;
    }

    // Create new headers object with existing headers plus security headers
    const newHeaders = new Headers(response.headers);

    // Apply security headers
    for (const [key, value] of Object.entries(securityResult.headers)) {
      newHeaders.set(key, value);
    }

    log("Security headers applied to response", {
      component: "security-headers",
      operation: "apply_to_response",
      requestId,
      responseStatus: response.status,
      securityHeadersCount: Object.keys(securityResult.headers).length,
    });

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  }

  /**
   * Validate security headers configuration (always valid for v2)
   */
  validateConfiguration(): { valid: boolean; errors: string[] } {
    return {
      valid: true,
      errors: [],
    };
  }

  /**
   * Check if security headers are enabled (always true for v2)
   */
  isEnabled(): boolean {
    return true;
  }

  /**
   * Get security headers as a plain object (for testing/debugging)
   */
  getSecurityHeadersObject(requestId?: string): Record<string, string> {
    return this.generateSecurityHeaders(requestId).headers;
  }
}

// Export singleton instance for convenience
export const securityHeadersService = SecurityHeadersService.getInstance();

// Export factory function for testing
export const createSecurityHeadersService = () => new SecurityHeadersService();
