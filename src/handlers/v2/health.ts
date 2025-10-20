/* src/handlers/v2/health.ts */

import { getApiV2Config } from "../../config/index";
import { jwtAuditService } from "../../services/jwt-audit.service";
import type { IKongService } from "../../services/kong.service";
import { securityHeadersService } from "../../services/security-headers.service";
import { log } from "../../utils/logger";

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

  log("Processing v2 health check", {
    component: "health-v2",
    operation: "handle_v2_health_check",
    endpoint: "/health",
    version: "v2",
    requestId,
  });

  try {
    // Perform basic Kong health check
    const kongHealth = await kongService.healthCheck();
    const duration = performance.now() - startTime;

    // Enhanced v2 health response with security context
    const healthData = {
      status: "healthy",
      version: "v2",
      timestamp: new Date().toISOString(),
      service: "authentication-service",
      dependencies: {
        kong: {
          status: kongHealth.healthy ? "healthy" : "unhealthy",
          responseTime: kongHealth.responseTime,
          error: kongHealth.error,
        },
      },
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
        responseTime: `${duration.toFixed(2)}ms`,
      },
      requestId,
    };

    // Audit the health check if enabled
    if (jwtAuditService.isEnabled()) {
      jwtAuditService.auditSecurityEvent({
        requestId,
        type: "anomaly_detected",
        severity: "low",
        description: "V2 health check accessed",
        details: {
          endpoint: "/health",
          version: "v2",
          kongStatus: kongHealth.healthy ? "healthy" : "unhealthy",
          responseTime: duration,
        },
        userAgent: req.headers.get("User-Agent") || undefined,
        clientIp: req.headers.get("X-Forwarded-For") || req.headers.get("X-Real-IP") || undefined,
        remediation: "Normal health check - no action required",
        riskScore: 5,
      });
    }

    log("V2 health check completed", {
      component: "health-v2",
      operation: "handle_v2_health_check",
      status: "healthy",
      version: "v2",
      duration: `${duration.toFixed(2)}ms`,
      kongHealthy: kongHealth.healthy,
      requestId,
    });

    const response = new Response(JSON.stringify(healthData, null, 2), {
      status: 200,
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

    const errorResponse = {
      status: "unhealthy",
      version: "v2",
      timestamp: new Date().toISOString(),
      service: "authentication-service",
      error: error instanceof Error ? error.message : "Unknown error",
      requestId,
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
      status: 503,
      headers: {
        "Content-Type": "application/json",
        "X-Request-Id": requestId,
        "X-API-Version": "v2",
      },
    });

    return securityHeadersService.applyToResponse(response, requestId);
  }
}
