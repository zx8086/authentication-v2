/* src/services/kong-api-gateway.service.ts */

import type {
  ConsumerResponse,
  ConsumerSecret,
  IKongService,
  KongHealthCheckResult,
} from "../config";
import { recordError, recordException, recordKongOperation } from "../telemetry/metrics";
import { winstonTelemetryLogger } from "../telemetry/winston-logger";

export class KongApiGatewayService implements IKongService {
  private readonly baseUrl: string;
  private readonly adminToken: string;

  constructor(adminUrl: string, adminToken: string) {
    this.baseUrl = adminUrl.replace(/\/$/, "");
    this.adminToken = adminToken;
  }

  async getConsumerSecret(consumerId: string): Promise<ConsumerSecret | null> {
    try {
      const url = `${this.baseUrl}/consumers/${consumerId}/jwt`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Kong-Admin-Token": this.adminToken,
          "Content-Type": "application/json",
          "User-Agent": "Authentication-Service/1.0",
        },
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }

        const _errorText = await response.text();
        throw new Error(`Kong API error: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as ConsumerResponse;

      if (!data.data || data.data.length === 0) {
        return null;
      }

      const secret = data.data[0];

      return secret;
    } catch (_error) {
      return null;
    }
  }

  async createConsumerSecret(consumerId: string): Promise<ConsumerSecret | null> {
    try {
      const key = crypto.randomUUID().replace(/-/g, "");
      const secret = this.generateSecureSecret();

      const url = `${this.baseUrl}/consumers/${consumerId}/jwt`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Kong-Admin-Token": this.adminToken,
          "Content-Type": "application/json",
          "User-Agent": "Authentication-Service/1.0",
        },
        body: JSON.stringify({
          key: key,
          secret: secret,
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        const errorText = await response.text();

        if (response.status === 404) {
          winstonTelemetryLogger.warn("Consumer not found in Kong", {
            consumerId,
            message: "Consumer must be created in Kong before JWT credentials can be provisioned",
            operation: "create_consumer_secret",
          });
        } else {
          winstonTelemetryLogger.error("Failed to create JWT credentials in Kong", {
            consumerId,
            status: response.status,
            statusText: response.statusText,
            error: errorText,
            operation: "create_jwt_credentials",
          });
        }
        throw new Error(`Kong API error: ${response.status} ${response.statusText}`);
      }

      const createdSecret = (await response.json()) as ConsumerSecret;

      return createdSecret;
    } catch (err) {
      winstonTelemetryLogger.error("Error creating consumer secret", {
        consumerId,
        error: err instanceof Error ? err.message : "Unknown error",
        operation: "create_consumer_secret",
      });
      return null;
    }
  }

  private generateSecureSecret(): string {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  async healthCheck(): Promise<KongHealthCheckResult> {
    const startTime = Bun.nanoseconds();

    try {
      const response = await fetch(`${this.baseUrl}/status`, {
        method: "GET",
        headers: {
          "Kong-Admin-Token": this.adminToken,
          "User-Agent": "Authentication-Service/1.0",
        },
        signal: AbortSignal.timeout(5000),
      });

      const responseTime = (Bun.nanoseconds() - startTime) / 1_000_000;

      if (response.ok) {
        recordKongOperation("health_check", responseTime, true);
        winstonTelemetryLogger.debug("Kong health check successful", {
          responseTime,
          operation: "health_check",
        });
        return { healthy: true, responseTime };
      } else {
        const errorMsg = `HTTP ${response.status}`;
        let detailedError = errorMsg;

        if (response.status === 401) {
          detailedError = "Authentication failed - invalid Kong admin token";
          winstonTelemetryLogger.error("Kong authentication failed", {
            status: response.status,
            message: "Invalid or expired Kong admin token",
            operation: "health_check",
          });
        } else if (response.status === 403) {
          detailedError = "Permission denied - insufficient Kong admin privileges";
          winstonTelemetryLogger.error("Kong permission denied", {
            status: response.status,
            message: "Admin token lacks necessary permissions",
            operation: "health_check",
          });
        } else if (response.status === 404) {
          detailedError = "Kong admin API endpoint not found - check URL configuration";
          winstonTelemetryLogger.error("Kong endpoint not found", {
            status: response.status,
            url: `${this.baseUrl}/status`,
            message: "Kong admin URL may be incorrect",
            operation: "health_check",
          });
        } else {
          winstonTelemetryLogger.error("Kong health check failed", {
            status: response.status,
            statusText: response.statusText || "Unknown",
            operation: "health_check",
          });
        }

        recordKongOperation("health_check", responseTime, false);
        recordError("kong_health_check_failed", {
          status: response.status,
          statusText: response.statusText || "Unknown",
        });

        return {
          healthy: false,
          responseTime,
          error: detailedError,
        };
      }
    } catch (err) {
      const responseTime = (Bun.nanoseconds() - startTime) / 1_000_000;

      if (err instanceof Error && err.message.includes("fetch failed")) {
        winstonTelemetryLogger.error("Kong connection failed", {
          url: `${this.baseUrl}/status`,
          error: err.message,
          message: "Unable to connect to Kong admin API - check network and URL",
          operation: "health_check",
        });
      } else {
        winstonTelemetryLogger.error("Kong health check error", {
          error: err instanceof Error ? err.message : "Unknown error",
          operation: "health_check",
        });
      }

      recordKongOperation("health_check", responseTime, false);
      recordException(err as Error, {
        operation: "kong_health_check",
      });

      return {
        healthy: false,
        responseTime,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }
}
