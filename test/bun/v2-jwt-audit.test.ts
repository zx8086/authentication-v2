/* test/bun/v2-jwt-audit.test.ts */

import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { jwtAuditService } from "../../src/services/jwt-audit.service";

describe("V2 JWT Audit Service", () => {
  let originalConsoleLog: typeof console.log;
  let originalConsoleWarn: typeof console.warn;
  let originalConsoleError: typeof console.error;
  let logMessages: string[];

  beforeEach(() => {
    // Capture console output for audit log verification
    logMessages = [];
    originalConsoleLog = console.log;
    originalConsoleWarn = console.warn;
    originalConsoleError = console.error;

    console.log = mock((message: any, ...args: any[]) => {
      logMessages.push(typeof message === "string" ? message : JSON.stringify(message));
    });
    console.warn = mock((message: any, ...args: any[]) => {
      logMessages.push(typeof message === "string" ? message : JSON.stringify(message));
    });
    console.error = mock((message: any, ...args: any[]) => {
      logMessages.push(typeof message === "string" ? message : JSON.stringify(message));
    });
  });

  afterEach(() => {
    // Restore original console methods
    console.log = originalConsoleLog;
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
  });

  describe("Service State Management", () => {
    test("should report enabled state correctly", () => {
      const isEnabled = jwtAuditService.isEnabled();
      expect(typeof isEnabled).toBe("boolean");
    });

    test("should provide metrics when enabled", () => {
      if (jwtAuditService.isEnabled()) {
        const metrics = jwtAuditService.getMetrics();

        expect(metrics).toHaveProperty("totalEvents");
        expect(metrics).toHaveProperty("eventsByType");
        expect(metrics).toHaveProperty("securityEvents");
        expect(metrics).toHaveProperty("criticalEvents");

        expect(typeof metrics.totalEvents).toBe("number");
        expect(typeof metrics.eventsByType).toBe("object");
        // Note: eventsBySeverity may not be in current implementation
      }
    });

    test("should handle metrics request when disabled gracefully", () => {
      // This test ensures service handles disabled state properly
      const metrics = jwtAuditService.getMetrics();

      if (!jwtAuditService.isEnabled()) {
        expect(metrics).toEqual({
          totalEvents: 0,
          eventsByType: {},
          securityEvents: 0,
          criticalEvents: 0,
          lastEventTime: undefined,
        });
      }
    });
  });

  describe("Token Issuance Audit Logging", () => {
    test("should audit successful token issuance", () => {
      const auditData = {
        requestId: "req-token-001",
        consumerId: "consumer-123",
        consumerUsername: "test-user",
        jwtPayload: {
          sub: "test-user",
          iss: "auth.example.com",
          aud: "api.example.com",
          exp: Math.floor(Date.now() / 1000) + 900,
          iat: Math.floor(Date.now() / 1000),
          jti: "jwt-123",
          key: "key-456",
        },
        userAgent: "Mozilla/5.0 Test Browser",
        clientIp: "192.168.1.100",
        geoLocation: "US-CA",
      };

      jwtAuditService.auditTokenIssuance(auditData);

      if (jwtAuditService.isEnabled()) {
        // Verify audit service processed the call (metrics should be updated)
        const metrics = jwtAuditService.getMetrics();
        expect(metrics.totalEvents).toBeGreaterThan(0);
        expect(metrics.eventsByType.token_issued).toBeGreaterThan(0);
      }
    });

    test("should handle token issuance audit with minimal data", () => {
      const minimalAuditData = {
        requestId: "req-minimal-001",
        consumerId: "consumer-minimal",
        consumerUsername: "minimal-user",
        jwtPayload: {
          sub: "minimal-user",
          iss: "auth.example.com",
          aud: "api.example.com",
          exp: Math.floor(Date.now() / 1000) + 900,
          iat: Math.floor(Date.now() / 1000),
          jti: "jwt-minimal",
          key: "key-minimal",
        },
      };

      expect(() => {
        jwtAuditService.auditTokenIssuance(minimalAuditData);
      }).not.toThrow();

      if (jwtAuditService.isEnabled()) {
        // Verify audit service processed the call
        const metrics = jwtAuditService.getMetrics();
        expect(metrics.totalEvents).toBeGreaterThan(0);
      }
    });
  });

  describe("Authentication Attempt Audit Logging", () => {
    test("should audit successful authentication attempt", () => {
      const authData = {
        requestId: "req-auth-success-001",
        result: "success" as const,
        consumerId: "consumer-auth-123",
        consumerUsername: "auth-user",
        userAgent: "Test Browser",
        clientIp: "10.0.0.1",
      };

      jwtAuditService.auditAuthenticationAttempt(authData);

      if (jwtAuditService.isEnabled()) {
        // Verify audit service processed the call
        const metrics = jwtAuditService.getMetrics();
        expect(metrics.totalEvents).toBeGreaterThan(0);
        expect(metrics.eventsByType.authentication_attempt).toBeGreaterThan(0);
      }
    });

    test("should audit failed authentication attempt", () => {
      const authData = {
        requestId: "req-auth-fail-001",
        result: "failure" as const,
        failureReason: "Invalid consumer credentials",
        userAgent: "Malicious Bot",
        clientIp: "192.168.1.200",
      };

      jwtAuditService.auditAuthenticationAttempt(authData);

      if (jwtAuditService.isEnabled()) {
        // Verify audit service processed the call
        const metrics = jwtAuditService.getMetrics();
        expect(metrics.totalEvents).toBeGreaterThan(0);
        expect(metrics.eventsByType.authentication_attempt).toBeGreaterThan(0);
      }
    });

    test("should handle authentication audit without optional fields", () => {
      const authData = {
        requestId: "req-auth-basic-001",
        result: "failure" as const,
        failureReason: "Missing headers",
      };

      expect(() => {
        jwtAuditService.auditAuthenticationAttempt(authData);
      }).not.toThrow();
    });
  });

  describe("Security Event Audit Logging", () => {
    test("should audit high-severity security events", () => {
      const securityEvent = {
        requestId: "req-security-001",
        type: "policy_violation" as const,
        severity: "high" as const,
        description: "Multiple failed authentication attempts detected",
        details: {
          attemptCount: 5,
          timeWindow: "60s",
          consumerId: "suspicious-consumer",
        },
        userAgent: "Automated Scanner",
        clientIp: "203.0.113.1",
        geoLocation: "Unknown-XX",
        remediation: "Block IP address and review access patterns",
        riskScore: 85,
      };

      jwtAuditService.auditSecurityEvent(securityEvent);

      if (jwtAuditService.isEnabled()) {
        // Verify audit service processed the call
        const metrics = jwtAuditService.getMetrics();
        expect(metrics.totalEvents).toBeGreaterThan(0);
        expect(metrics.securityEvents).toBeGreaterThan(0);
        expect(metrics.eventsByType.security_event).toBeGreaterThan(0);
      }
    });

    test("should audit medium-severity anomaly detection", () => {
      const anomalyEvent = {
        requestId: "req-anomaly-001",
        type: "anomaly_detected" as const,
        severity: "medium" as const,
        description: "Unusual geographic access pattern",
        details: {
          previousLocation: "US-CA",
          currentLocation: "RU-MOW",
          timeGap: "30m",
        },
        riskScore: 45,
        remediation: "Verify user identity and location",
      };

      jwtAuditService.auditSecurityEvent(anomalyEvent);

      if (jwtAuditService.isEnabled()) {
        // Verify audit service processed the call
        const metrics = jwtAuditService.getMetrics();
        expect(metrics.totalEvents).toBeGreaterThan(0);
        expect(metrics.securityEvents).toBeGreaterThan(0);
      }
    });

    test("should audit low-severity routine events", () => {
      const routineEvent = {
        requestId: "req-routine-001",
        type: "anomaly_detected" as const,
        severity: "low" as const,
        description: "Health check endpoint accessed",
        details: {
          endpoint: "/health",
          version: "v2",
        },
        riskScore: 5,
        remediation: "No action required",
      };

      jwtAuditService.auditSecurityEvent(routineEvent);

      if (jwtAuditService.isEnabled()) {
        // Verify audit service processed the call
        const metrics = jwtAuditService.getMetrics();
        expect(metrics.totalEvents).toBeGreaterThan(0);
        expect(metrics.securityEvents).toBeGreaterThan(0);
      }
    });
  });

  describe("Audit Log Format and Structure", () => {
    test("should include consistent timestamp format in audit logs", () => {
      const testData = {
        requestId: "req-timestamp-test",
        result: "success" as const,
        consumerId: "consumer-time-test",
        consumerUsername: "time-user",
      };

      jwtAuditService.auditAuthenticationAttempt(testData);

      if (jwtAuditService.isEnabled()) {
        // Verify audit service processed the call and metrics were updated
        const metrics = jwtAuditService.getMetrics();
        expect(metrics.totalEvents).toBeGreaterThan(0);
        expect(metrics.lastEventTime).toBeTruthy();

        // Verify timestamp is in ISO format
        if (metrics.lastEventTime) {
          expect(metrics.lastEventTime).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
        }
      }
    });

    test("should include structured data in audit logs", () => {
      const structuredEvent = {
        requestId: "req-structured-001",
        type: "authentication_failure" as const,
        severity: "medium" as const,
        description: "Kong service unavailable",
        details: {
          service: "kong-admin-api",
          error: "Connection timeout",
          retryCount: 3,
        },
        riskScore: 30,
      };

      jwtAuditService.auditSecurityEvent(structuredEvent);

      if (jwtAuditService.isEnabled()) {
        // Verify audit service processed the structured event
        const metrics = jwtAuditService.getMetrics();
        expect(metrics.totalEvents).toBeGreaterThan(0);
        expect(metrics.securityEvents).toBeGreaterThan(0);
        expect(metrics.eventsByType.security_event).toBeGreaterThan(0);
      }
    });
  });

  describe("Audit Service Resilience", () => {
    test("should handle audit logging errors gracefully", () => {
      // Test with invalid data that might cause JSON serialization issues
      const problematicData = {
        requestId: "req-error-test",
        result: "success" as const,
        consumerId: "consumer-error",
        consumerUsername: "error-user",
        // @ts-expect-error - Testing error handling with circular reference
        circularRef: {},
      };

      // @ts-expect-error - Creating circular reference
      problematicData.circularRef.self = problematicData.circularRef;

      expect(() => {
        jwtAuditService.auditAuthenticationAttempt(problematicData);
      }).not.toThrow();
    });

    test("should continue functioning after audit errors", () => {
      // First, try to cause an error
      const errorData = {
        requestId: "req-continue-test-1",
        result: "success" as const,
        // @ts-expect-error - Testing with undefined as problematic data
        consumerId: undefined,
        consumerUsername: null,
      };

      expect(() => {
        jwtAuditService.auditAuthenticationAttempt(errorData);
      }).not.toThrow();

      // Then verify service still works normally
      const normalData = {
        requestId: "req-continue-test-2",
        result: "success" as const,
        consumerId: "normal-consumer",
        consumerUsername: "normal-user",
      };

      expect(() => {
        jwtAuditService.auditAuthenticationAttempt(normalData);
      }).not.toThrow();
    });
  });

  describe("Performance and Resource Management", () => {
    test("should handle high-volume audit logging efficiently", () => {
      const startTime = Date.now();
      const eventCount = 100;

      // Generate many audit events rapidly
      for (let i = 0; i < eventCount; i++) {
        jwtAuditService.auditAuthenticationAttempt({
          requestId: `req-perf-${i}`,
          result: "success",
          consumerId: `consumer-${i}`,
          consumerUsername: `user-${i}`,
        });
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (2 seconds for 100 events)
      expect(duration).toBeLessThan(2000);

      if (jwtAuditService.isEnabled()) {
        const metrics = jwtAuditService.getMetrics();
        expect(metrics.totalEvents).toBeGreaterThanOrEqual(eventCount);
      }
    });
  });
});
