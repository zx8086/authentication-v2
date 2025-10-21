/* src/services/jwt-audit.service.ts */

import { recordAuditEvent, recordSecurityEvent } from "../telemetry/metrics";
import { audit, error, log } from "../utils/logger";

export interface AuditEventBase {
  component: string;
  version: string;
  event: string;
  requestId: string;
  timestamp: string;
  auditLevel: "basic" | "detailed" | "comprehensive";
}

export interface TokenIssuanceAuditEvent extends AuditEventBase {
  event: "token_issued";
  security: {
    consumerId: string;
    consumerUsername: string;
    tokenClaims: {
      sub: string;
      iss: string;
      aud: string | string[];
      exp: number;
      iat: number;
      jti: string;
      [key: string]: any;
    };
    expirationTime: string;
    issuedTime: string;
    securityLevel: "enhanced";
    tokenType: "access_token";
  };
  client?: {
    userAgent?: string;
    ipAddress?: string;
    geoLocation?: string;
  };
  compliance: {
    auditLevel: "detailed" | "comprehensive";
    retentionRequired: boolean;
    dataClassification: "authentication";
    privacyLevel: "anonymized" | "pseudonymized" | "identified";
  };
}

export interface SecurityEventAuditEvent extends AuditEventBase {
  event: "security_event";
  severity: "low" | "medium" | "high" | "critical";
  securityEvent: {
    type: "authentication_failure" | "anomaly_detected" | "policy_violation" | "suspicious_pattern";
    description: string;
    details: Record<string, any>;
    remediation?: string;
    riskScore?: number;
  };
  client?: {
    userAgent?: string;
    ipAddress?: string;
    geoLocation?: string;
  };
  compliance: {
    alertRequired: boolean;
    escalationLevel: "none" | "low" | "medium" | "high";
    regulatoryImpact: boolean;
  };
}

export interface AuthenticationAttemptAuditEvent extends AuditEventBase {
  event: "authentication_attempt";
  authentication: {
    result: "success" | "failure";
    method: "kong_consumer";
    consumerId?: string;
    consumerUsername?: string;
    failureReason?: string;
    attemptCount?: number;
  };
  client?: {
    userAgent?: string;
    ipAddress?: string;
    geoLocation?: string;
  };
  compliance: {
    suspicious: boolean;
    rateLimit: boolean;
    blockRequired: boolean;
  };
}

export type AuditEvent =
  | TokenIssuanceAuditEvent
  | SecurityEventAuditEvent
  | AuthenticationAttemptAuditEvent;

export interface AuditMetrics {
  totalEvents: number;
  eventsByType: Record<string, number>;
  securityEvents: number;
  criticalEvents: number;
  lastEventTime?: string;
}

export class JWTAuditService {
  private static instance: JWTAuditService | null = null;
  private metrics: AuditMetrics = {
    totalEvents: 0,
    eventsByType: {},
    securityEvents: 0,
    criticalEvents: 0,
  };

  /**
   * Get singleton instance
   */
  static getInstance(): JWTAuditService {
    if (!JWTAuditService.instance) {
      JWTAuditService.instance = new JWTAuditService();
    }
    return JWTAuditService.instance;
  }

  /**
   * Reset singleton for testing
   */
  static resetInstance(): void {
    JWTAuditService.instance = null;
  }

  /**
   * Audit JWT token issuance event
   */
  auditTokenIssuance(params: {
    requestId: string;
    consumerId: string;
    consumerUsername: string;
    jwtPayload: any;
    userAgent?: string;
    clientIp?: string;
    geoLocation?: string;
  }): void {
    const auditEvent: TokenIssuanceAuditEvent = {
      component: "jwt-audit",
      version: "v2",
      event: "token_issued",
      requestId: params.requestId,
      timestamp: new Date().toISOString(),
      auditLevel: "detailed",
      security: {
        consumerId: params.consumerId,
        consumerUsername: params.consumerUsername,
        tokenClaims: {
          sub: params.jwtPayload.sub,
          iss: params.jwtPayload.iss,
          aud: params.jwtPayload.aud,
          exp: params.jwtPayload.exp,
          iat: params.jwtPayload.iat,
          jti: params.jwtPayload.jti,
        },
        expirationTime: new Date(params.jwtPayload.exp * 1000).toISOString(),
        issuedTime: new Date(params.jwtPayload.iat * 1000).toISOString(),
        securityLevel: "enhanced",
        tokenType: "access_token",
      },
      client: {
        userAgent: params.userAgent,
        ipAddress: this.anonymizeIpAddress(params.clientIp),
        geoLocation: params.geoLocation ? this.anonymizeGeoLocation(params.geoLocation) : undefined,
      },
      compliance: {
        auditLevel: "detailed",
        retentionRequired: true,
        dataClassification: "authentication",
        privacyLevel: "anonymized",
      },
    };

    this.logAuditEvent(auditEvent);
    this.updateMetrics(auditEvent);

    // Record audit event metrics
    recordAuditEvent("token_issued", "detailed", "v2");
  }

  /**
   * Audit security event
   */
  auditSecurityEvent(params: {
    requestId: string;
    type: "authentication_failure" | "anomaly_detected" | "policy_violation" | "suspicious_pattern";
    severity: "low" | "medium" | "high" | "critical";
    description: string;
    details: Record<string, any>;
    userAgent?: string;
    clientIp?: string;
    geoLocation?: string;
    remediation?: string;
    riskScore?: number;
  }): void {
    const auditEvent: SecurityEventAuditEvent = {
      component: "jwt-audit",
      version: "v2",
      event: "security_event",
      requestId: params.requestId,
      timestamp: new Date().toISOString(),
      auditLevel: "detailed",
      severity: params.severity,
      securityEvent: {
        type: params.type,
        description: params.description,
        details: params.details,
        remediation: params.remediation,
        riskScore: params.riskScore,
      },
      client: {
        userAgent: params.userAgent,
        ipAddress: this.anonymizeIpAddress(params.clientIp),
        geoLocation: params.geoLocation ? this.anonymizeGeoLocation(params.geoLocation) : undefined,
      },
      compliance: {
        alertRequired: params.severity === "high" || params.severity === "critical",
        escalationLevel: this.mapSeverityToEscalation(params.severity),
        regulatoryImpact: params.severity === "critical" || params.type === "policy_violation",
      },
    };

    this.logAuditEvent(auditEvent);
    this.updateMetrics(auditEvent);

    // Record security event metrics (map types to match function signature)
    const mappedType =
      params.type === "authentication_failure"
        ? "jwt_anomaly"
        : params.type === "suspicious_pattern"
          ? "suspicious_activity"
          : params.type === "policy_violation"
            ? "header_validation"
            : "suspicious_activity";
    recordSecurityEvent(mappedType, params.severity);
    recordAuditEvent("security_event", "detailed", "v2");

    // Check for security event thresholds
    this.checkSecurityThresholds(auditEvent);
  }

  /**
   * Audit authentication attempt
   */
  auditAuthenticationAttempt(params: {
    requestId: string;
    result: "success" | "failure";
    consumerId?: string;
    consumerUsername?: string;
    failureReason?: string;
    userAgent?: string;
    clientIp?: string;
    attemptCount?: number;
  }): void {
    const auditEvent: AuthenticationAttemptAuditEvent = {
      component: "jwt-audit",
      version: "v2",
      event: "authentication_attempt",
      requestId: params.requestId,
      timestamp: new Date().toISOString(),
      auditLevel: "detailed",
      authentication: {
        result: params.result,
        method: "kong_consumer",
        consumerId: params.consumerId,
        consumerUsername: params.consumerUsername,
        failureReason: params.failureReason,
        attemptCount: params.attemptCount,
      },
      client: {
        userAgent: params.userAgent,
        ipAddress: this.anonymizeIpAddress(params.clientIp),
      },
      compliance: {
        suspicious: (params.attemptCount || 0) > 5,
        rateLimit: (params.attemptCount || 0) > 10,
        blockRequired: (params.attemptCount || 0) > 15,
      },
    };

    this.logAuditEvent(auditEvent);
    this.updateMetrics(auditEvent);

    // Record audit event metrics
    recordAuditEvent("authentication_attempt", "detailed", "v2");

    // Check for suspicious patterns - always enabled for v2
    if (auditEvent.compliance.suspicious) {
      this.auditSecurityEvent({
        requestId: params.requestId,
        type: "suspicious_pattern",
        severity: auditEvent.compliance.blockRequired ? "critical" : "medium",
        description: `Suspicious authentication pattern detected: ${params.attemptCount} attempts`,
        details: {
          consumerId: params.consumerId,
          consumerUsername: params.consumerUsername,
          attemptCount: params.attemptCount,
          failureReason: params.failureReason,
        },
        userAgent: params.userAgent,
        clientIp: params.clientIp,
        remediation: auditEvent.compliance.blockRequired ? "Block client IP" : "Monitor closely",
        riskScore: Math.min((params.attemptCount || 0) * 10, 100),
      });
    }
  }

  /**
   * Get audit metrics
   */
  getMetrics(): AuditMetrics {
    return { ...this.metrics };
  }

  /**
   * Check if audit logging is enabled (always true for v2)
   */
  isEnabled(): boolean {
    return true;
  }

  private logAuditEvent(event: AuditEvent): void {
    try {
      // Use audit log function for structured compliance logging
      audit(event.event, event);

      // Additional detailed logging for v2
      log(`V2 audit: ${event.event}`, {
        component: "jwt-audit",
        operation: "v2_audit",
        auditId: event.requestId,
        eventType: event.event,
        timestamp: event.timestamp,
      });
    } catch (err) {
      error("Failed to log audit event", {
        component: "jwt-audit",
        operation: "log_audit_event",
        error: err instanceof Error ? err.message : "Unknown error",
        eventType: event.event,
        requestId: event.requestId,
      });
    }
  }

  private updateMetrics(event: AuditEvent): void {
    this.metrics.totalEvents++;
    this.metrics.eventsByType[event.event] = (this.metrics.eventsByType[event.event] || 0) + 1;
    this.metrics.lastEventTime = event.timestamp;

    if (event.event === "security_event") {
      this.metrics.securityEvents++;
      const securityEvent = event as SecurityEventAuditEvent;
      if (securityEvent.severity === "critical") {
        this.metrics.criticalEvents++;
      }
    }
  }

  private checkSecurityThresholds(event: SecurityEventAuditEvent): void {
    // Check for critical security events that require immediate attention
    if (event.severity === "critical") {
      log("Critical security event detected - immediate attention required", {
        component: "jwt-audit",
        operation: "critical_alert",
        eventType: event.securityEvent.type,
        severity: event.severity,
        requestId: event.requestId,
        alertRequired: true,
        escalationLevel: "high",
      });
    }

    // Check for anomaly patterns - always enabled for v2
    const recentEvents = this.metrics.securityEvents;
    const criticalEvents = this.metrics.criticalEvents;

    if (criticalEvents > 5) {
      log("Anomaly detected: Multiple critical security events", {
        component: "jwt-audit",
        operation: "anomaly_detection",
        criticalEventCount: criticalEvents,
        totalSecurityEvents: recentEvents,
        requestId: event.requestId,
        anomalyType: "critical_event_spike",
      });
    }
  }

  private anonymizeIpAddress(ip?: string): string | undefined {
    if (!ip) {
      return ip;
    }

    // Always anonymize IP addresses for v2 privacy compliance
    if (ip.includes(".")) {
      // IPv4
      const parts = ip.split(".");
      return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
    } else if (ip.includes(":")) {
      // IPv6
      const parts = ip.split(":");
      return `${parts.slice(0, 4).join(":")}::xxxx`;
    }

    return "xxx.xxx.xxx.xxx";
  }

  private anonymizeGeoLocation(geo: string): string {
    // Always anonymize geo data for v2 privacy compliance
    // Only return country-level information for privacy
    return geo.split(",")[0] || geo;
  }

  private mapSeverityToEscalation(
    severity: "low" | "medium" | "high" | "critical"
  ): "none" | "low" | "medium" | "high" {
    switch (severity) {
      case "low":
        return "none";
      case "medium":
        return "low";
      case "high":
        return "medium";
      case "critical":
        return "high";
      default:
        return "none";
    }
  }
}

// Export singleton instance for convenience
export const jwtAuditService = JWTAuditService.getInstance();

// Export factory function for testing
export const createJWTAuditService = () => new JWTAuditService();
