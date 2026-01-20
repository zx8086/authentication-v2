/* test/bun/winston-logger-methods.test.ts */

import { describe, it } from "bun:test";
import { winstonTelemetryLogger } from "../../../src/telemetry/winston-logger";

describe("Winston Logger Methods", () => {
  describe("logHttpRequest", () => {
    it("should log HTTP request with method, path, and status code", () => {
      winstonTelemetryLogger.logHttpRequest("GET", "/api/tokens", 200, 45.5);
      winstonTelemetryLogger.logHttpRequest("POST", "/api/users", 201, 123.7);
      winstonTelemetryLogger.logHttpRequest("DELETE", "/api/tokens/123", 204, 67.3);
    });

    it("should log HTTP request with additional context", () => {
      const context = {
        requestId: "req-12345",
        userId: "user-789",
        ip: "192.168.1.1",
      };

      winstonTelemetryLogger.logHttpRequest("PUT", "/api/profile", 200, 89.2, context);
    });

    it("should log HTTP request with error status codes", () => {
      winstonTelemetryLogger.logHttpRequest("GET", "/api/missing", 404, 12.3);
      winstonTelemetryLogger.logHttpRequest("POST", "/api/forbidden", 403, 5.6);
      winstonTelemetryLogger.logHttpRequest("GET", "/api/error", 500, 234.8);
    });

    it("should handle various HTTP methods", () => {
      winstonTelemetryLogger.logHttpRequest("GET", "/health", 200, 1.5);
      winstonTelemetryLogger.logHttpRequest("POST", "/tokens", 201, 45.0);
      winstonTelemetryLogger.logHttpRequest("PUT", "/tokens/123", 200, 67.2);
      winstonTelemetryLogger.logHttpRequest("PATCH", "/users/456", 200, 34.1);
      winstonTelemetryLogger.logHttpRequest("DELETE", "/sessions", 204, 23.4);
      winstonTelemetryLogger.logHttpRequest("OPTIONS", "/api", 200, 0.8);
    });
  });

  describe("logAuthenticationEvent", () => {
    it("should log successful authentication events", () => {
      winstonTelemetryLogger.logAuthenticationEvent("login", true);
      winstonTelemetryLogger.logAuthenticationEvent("token_validation", true);
      winstonTelemetryLogger.logAuthenticationEvent("session_created", true);
    });

    it("should log failed authentication events", () => {
      winstonTelemetryLogger.logAuthenticationEvent("login", false);
      winstonTelemetryLogger.logAuthenticationEvent("token_validation", false);
      winstonTelemetryLogger.logAuthenticationEvent("invalid_credentials", false);
    });

    it("should log authentication events with context", () => {
      const context = {
        userId: "user-123",
        method: "jwt",
        source: "api",
      };

      winstonTelemetryLogger.logAuthenticationEvent("oauth_login", true, context);
      winstonTelemetryLogger.logAuthenticationEvent("password_reset", false, context);
    });

    it("should handle various authentication event types", () => {
      winstonTelemetryLogger.logAuthenticationEvent("jwt_issued", true);
      winstonTelemetryLogger.logAuthenticationEvent("jwt_expired", false);
      winstonTelemetryLogger.logAuthenticationEvent("refresh_token", true);
      winstonTelemetryLogger.logAuthenticationEvent("logout", true);
      winstonTelemetryLogger.logAuthenticationEvent("session_timeout", false);
    });
  });

  describe("logKongOperation", () => {
    it("should log successful Kong operations", () => {
      winstonTelemetryLogger.logKongOperation("getConsumerSecret", 45.2, true);
      winstonTelemetryLogger.logKongOperation("createConsumer", 123.7, true);
      winstonTelemetryLogger.logKongOperation("healthCheck", 5.1, true);
    });

    it("should log failed Kong operations", () => {
      winstonTelemetryLogger.logKongOperation("getConsumerSecret", 2345.6, false);
      winstonTelemetryLogger.logKongOperation("createConsumer", 567.8, false);
      winstonTelemetryLogger.logKongOperation("updatePlugin", 89.3, false);
    });

    it("should log Kong operations with context", () => {
      const context = {
        consumerId: "consumer-123",
        endpoint: "/consumers",
        retries: 2,
      };

      winstonTelemetryLogger.logKongOperation("getConsumerSecret", 78.4, true, context);
      winstonTelemetryLogger.logKongOperation("deleteConsumer", 234.1, false, context);
    });

    it("should handle various response times", () => {
      winstonTelemetryLogger.logKongOperation("quick_operation", 1.2, true);
      winstonTelemetryLogger.logKongOperation("slow_operation", 5678.9, true);
      winstonTelemetryLogger.logKongOperation("timeout_operation", 30000.5, false);
    });

    it("should log different Kong operation types", () => {
      winstonTelemetryLogger.logKongOperation("list_consumers", 67.3, true);
      winstonTelemetryLogger.logKongOperation("update_consumer", 89.1, true);
      winstonTelemetryLogger.logKongOperation("delete_consumer", 45.6, true);
      winstonTelemetryLogger.logKongOperation("get_plugin", 23.4, true);
      winstonTelemetryLogger.logKongOperation("configure_route", 156.7, true);
    });
  });

  describe("flush", () => {
    it("should flush logger without errors", async () => {
      winstonTelemetryLogger.info("Test message before flush");
      await winstonTelemetryLogger.flush();
    });

    it("should handle multiple flushes", async () => {
      winstonTelemetryLogger.info("Message 1");
      await winstonTelemetryLogger.flush();

      winstonTelemetryLogger.info("Message 2");
      await winstonTelemetryLogger.flush();

      winstonTelemetryLogger.info("Message 3");
      await winstonTelemetryLogger.flush();
    });

    it("should flush after logging multiple messages", async () => {
      for (let i = 0; i < 10; i++) {
        winstonTelemetryLogger.info(`Test message ${i}`);
      }
      await winstonTelemetryLogger.flush();
    });
  });

  describe("reinitialize", () => {
    it("should reinitialize logger successfully", () => {
      winstonTelemetryLogger.info("Before reinitialize");
      winstonTelemetryLogger.reinitialize();
      winstonTelemetryLogger.info("After reinitialize");
    });

    it("should clear previous state on reinitialize", () => {
      winstonTelemetryLogger.warn("Warning before reinit");
      winstonTelemetryLogger.error("Error before reinit");

      winstonTelemetryLogger.reinitialize();

      winstonTelemetryLogger.info("Fresh message after reinit");
    });

    it("should handle multiple reinitializations", () => {
      for (let i = 0; i < 3; i++) {
        winstonTelemetryLogger.info(`Message cycle ${i}`);
        winstonTelemetryLogger.reinitialize();
      }
    });

    it("should maintain functionality after reinitialize", () => {
      winstonTelemetryLogger.reinitialize();

      winstonTelemetryLogger.info("Info after reinit");
      winstonTelemetryLogger.warn("Warn after reinit");
      winstonTelemetryLogger.error("Error after reinit");
      winstonTelemetryLogger.debug("Debug after reinit");
    });
  });

  describe("Combined Operations", () => {
    it("should handle all logging methods in sequence", () => {
      winstonTelemetryLogger.logHttpRequest("POST", "/api/login", 200, 45.3);
      winstonTelemetryLogger.logAuthenticationEvent("jwt_issued", true);
      winstonTelemetryLogger.logKongOperation("getConsumerSecret", 23.4, true);
      winstonTelemetryLogger.info("Operation completed successfully");
    });

    it("should handle error scenarios across methods", () => {
      winstonTelemetryLogger.logHttpRequest("POST", "/api/auth", 401, 12.5);
      winstonTelemetryLogger.logAuthenticationEvent("invalid_token", false);
      winstonTelemetryLogger.logKongOperation("validateToken", 234.6, false);
      winstonTelemetryLogger.error("Authentication failed");
    });

    it("should work with reinitialize and flush", async () => {
      winstonTelemetryLogger.logHttpRequest("GET", "/health", 200, 1.2);
      await winstonTelemetryLogger.flush();

      winstonTelemetryLogger.reinitialize();

      winstonTelemetryLogger.logAuthenticationEvent("health_check", true);
      await winstonTelemetryLogger.flush();
    });
  });
});
