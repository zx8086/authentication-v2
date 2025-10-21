/* src/handlers/v2/health.ts */

import { getApiV2Config } from "../../config/index";
import { jwtAuditService } from "../../services/jwt-audit.service";
import type { IKongService } from "../../services/kong.service";
import { securityHeadersService } from "../../services/security-headers.service";
import { log } from "../../utils/logger";
import { handleHealthCheck } from "../v1/health";

const v2Config = getApiV2Config();

if (!v2Config) {
  throw new Error("V2 configuration not available");
}

export async function handleV2HealthCheck(
  req: Request,
  kongService: IKongService
): Promise<Response> {
  const requestId = crypto.randomUUID();
  const startTime = performance.now();

  log("Processing v2 health check with V1 compatibility", {
    component: "health-v2",
    operation: "handle_v2_health_check",
    endpoint: "/health",
    version: "v2",
    requestId,
  });

  try {
    // Call V1 health check to get comprehensive health data
    const v1Response = await handleHealthCheck(kongService);

    // Parse V1 response to get health data
    const v1ResponseText = await v1Response.text();
    const v1HealthData = JSON.parse(v1ResponseText);

    // Get the status code from V1 response to maintain health logic
    const v1StatusCode = v1Response.status;
    const duration = performance.now() - startTime;

    // Enhance V1 response with V2 security features while preserving ALL V1 data
    const v2EnhancedHealthData = {
      ...v1HealthData,
      apiVersion: "v2", // Update apiVersion to indicate V2 endpoint
      // Add V2 security enhancements
      security: {
        headersEnabled: v2Config?.securityHeaders.enabled,
        auditLoggingEnabled: v2Config?.auditLogging.enabled,
        auditLevel: v2Config?.auditLogging.level,
      },
      audit: {
        enabled: v2Config?.auditLogging.enabled,
        metrics: jwtAuditService.isEnabled() ? jwtAuditService.getMetrics() : null,
      },
      performance: {
        responseTime: Math.round(duration), // V2 response time as numeric value for compatibility
        ...(v1HealthData.performance || {}), // Include any existing V1 performance data
      },
      service: "authentication-service", // V2 enhancement
    };

    // Audit the health check if enabled
    if (jwtAuditService.isEnabled()) {
      jwtAuditService.auditSecurityEvent({
        requestId,
        type: "anomaly_detected",
        severity: "low",
        description: "V2 health check accessed with V1 compatibility",
        details: {
          endpoint: "/health",
          version: "v2",
          v1Status: v1HealthData.status,
          v1Dependencies: Object.keys(v1HealthData.dependencies || {}),
          responseTime: duration,
        },
        userAgent: req.headers.get("User-Agent") || undefined,
        clientIp: req.headers.get("X-Forwarded-For") || req.headers.get("X-Real-IP") || undefined,
        remediation: "Normal V2 health check with V1 compatibility - no action required",
        riskScore: 5,
      });
    }

    log("V2 health check completed with V1 compatibility", {
      component: "health-v2",
      operation: "handle_v2_health_check",
      status: v1HealthData.status,
      version: "v2",
      duration: `${duration.toFixed(2)}ms`,
      v1Fields: Object.keys(v1HealthData).length,
      v2Enhancements: ["security", "audit", "service"],
      requestId,
    });

    const response = new Response(JSON.stringify(v2EnhancedHealthData, null, 2), {
      status: v1StatusCode, // Use V1 status code to maintain health check logic
      headers: {
        "Content-Type": "application/json",
        "X-Request-Id": requestId,
        "X-API-Version": "v2",
      },
    });

    return securityHeadersService.applyToResponse(response, requestId);
  } catch (error) {
    const duration = performance.now() - startTime;

    // Audit health check failure
    if (jwtAuditService.isEnabled()) {
      jwtAuditService.auditSecurityEvent({
        requestId,
        type: "anomaly_detected",
        severity: "medium",
        description: "V2 health check failed",
        details: {
          endpoint: "/health",
          version: "v2",
          error: error instanceof Error ? error.message : "Unknown error",
          responseTime: duration,
        },
        userAgent: req.headers.get("User-Agent") || undefined,
        clientIp: req.headers.get("X-Forwarded-For") || req.headers.get("X-Real-IP") || undefined,
        remediation: "Investigate service health and dependencies",
        riskScore: 30,
      });
    }

    // Create error response with V1 compatibility - Kong exceptions result in degraded status
    const errorResponse = {
      status: "degraded", // V1 logic: Kong exceptions result in degraded status, not unhealthy
      error: error instanceof Error ? error.message : "Unknown error",
      message: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
      apiVersion: "v2", // Use consistent field naming
      service: "authentication-service", // V2 enhancement
      requestId,
      // V2 security context in error
      security: {
        headersEnabled: v2Config?.securityHeaders.enabled,
        auditLoggingEnabled: v2Config?.auditLogging.enabled,
      },
    };

    log("V2 health check failed", {
      component: "health-v2",
      operation: "handle_v2_health_check",
      status: "unhealthy",
      version: "v2",
      error: error instanceof Error ? error.message : "Unknown error",
      duration: `${duration.toFixed(2)}ms`,
      requestId,
    });

    const response = new Response(JSON.stringify(errorResponse, null, 2), {
      status: 500, // Use 500 for unexpected errors, V1 would handle 503 for service issues
      headers: {
        "Content-Type": "application/json",
        "X-Request-Id": requestId,
        "X-API-Version": "v2",
      },
    });

    return securityHeadersService.applyToResponse(response, requestId);
  }
}
