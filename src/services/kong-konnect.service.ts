/* src/services/kong-konnect.service.ts */

import type {
  Consumer,
  ConsumerResponse,
  ConsumerSecret,
  IKongService,
  KongHealthCheckResult,
} from "../config";
import { recordError, recordException, recordKongOperation } from "../telemetry/metrics";
import { winstonTelemetryLogger } from "../telemetry/winston-logger";
import { withRetry } from "../utils/retry";

export class KongKonnectService implements IKongService {
  private readonly gatewayAdminUrl: string;
  private readonly consumerAdminUrl: string;
  private readonly adminToken: string;
  private readonly controlPlaneId: string;
  private readonly realmId: string;

  constructor(adminUrl: string, adminToken: string) {
    const url = new URL(adminUrl);

    if (url.hostname.includes("konghq.com")) {
      const pathMatch = url.pathname.match(/\/v2\/control-planes\/([a-f0-9-]+)/);
      if (!pathMatch) {
        throw new Error(
          "Invalid Kong Konnect URL format. Expected: https://region.api.konghq.com/v2/control-planes/{id}"
        );
      }

      this.controlPlaneId = pathMatch[1];
      this.gatewayAdminUrl = adminUrl.replace(/\/$/, "");
      this.consumerAdminUrl = `${url.protocol}//${url.hostname}/v1`;
      this.realmId = `auth-realm-${this.controlPlaneId.substring(0, 8)}`;
    } else {
      this.gatewayAdminUrl = adminUrl.replace(/\/$/, "");
      this.consumerAdminUrl = adminUrl.replace(/\/$/, "");
      this.controlPlaneId = "self-hosted";
      this.realmId = "default";
    }

    this.adminToken = adminToken;
  }

  async getConsumerSecret(consumerId: string): Promise<ConsumerSecret | null> {
    try {
      await this.ensureRealmExists();
      const consumerUuid = await this.getConsumerId(consumerId);

      if (!consumerUuid) {
        return null;
      }

      const keysUrl = `${this.gatewayAdminUrl}/core-entities/consumers/${consumerUuid}/jwt`;

      const response = await withRetry(
        () =>
          fetch(keysUrl, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${this.adminToken}`,
              "Content-Type": "application/json",
              "User-Agent": "Authentication-Service/1.0",
            },
            signal: AbortSignal.timeout(5000),
          }),
        { maxAttempts: 2, baseDelayMs: 100 }
      );

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
      const consumerUuid = await this.getConsumerId(consumerId);

      if (!consumerUuid) {
        return null;
      }

      const key = crypto.randomUUID().replace(/-/g, "");
      const secret = this.generateSecureSecret();

      const url = `${this.gatewayAdminUrl}/core-entities/consumers/${consumerUuid}/jwt`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.adminToken}`,
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
        winstonTelemetryLogger.error("Failed to create JWT credentials in Kong", {
          consumerId,
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          operation: "create_jwt_credentials",
        });
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

  private async ensureRealmExists(): Promise<void> {
    const checkUrl = `${this.consumerAdminUrl}/realms/${this.realmId}`;

    const checkResponse = await fetch(checkUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.adminToken}`,
        "User-Agent": "Authentication-Service/1.0",
      },
      signal: AbortSignal.timeout(5000),
    });

    if (checkResponse.ok) {
      return;
    }

    if (checkResponse.status !== 404) {
      throw new Error(`Unexpected error checking realm: ${checkResponse.status}`);
    }

    const createUrl = `${this.consumerAdminUrl}/realms`;

    const createRealmRequest = {
      name: this.realmId,
      allowed_control_planes: [this.controlPlaneId],
    };

    const createResponse = await fetch(createUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.adminToken}`,
        "Content-Type": "application/json",
        "User-Agent": "Authentication-Service/1.0",
      },
      body: JSON.stringify(createRealmRequest),
      signal: AbortSignal.timeout(10000),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();

      if (createResponse.status === 400 && errorText.includes("realm name must be unique")) {
        return;
      }

      throw new Error(`Failed to create realm: ${createResponse.status} ${errorText}`);
    }
  }

  private async getConsumerId(consumerId: string): Promise<string | null> {
    const checkUrl = `${this.gatewayAdminUrl}/core-entities/consumers/${consumerId}`;

    const checkResponse = await fetch(checkUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.adminToken}`,
        "User-Agent": "Authentication-Service/1.0",
      },
      signal: AbortSignal.timeout(5000),
    });

    if (checkResponse.ok) {
      const existingConsumer = (await checkResponse.json()) as Consumer;
      return existingConsumer.id;
    }

    if (checkResponse.status === 404) {
      winstonTelemetryLogger.warn("Consumer not found in Kong", {
        consumerId,
        message: "Consumer must be created in Kong before JWT credentials can be provisioned",
        operation: "consumer_not_found",
      });
      return null;
    }

    winstonTelemetryLogger.error("Unexpected error checking consumer existence", {
      consumerId,
      status: checkResponse.status,
      operation: "check_consumer",
    });
    throw new Error(`Unexpected error checking consumer: ${checkResponse.status}`);
  }

  private generateSecureSecret(): string {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  async healthCheck(): Promise<KongHealthCheckResult> {
    const startTime = Bun.nanoseconds();

    try {
      const response = await withRetry(
        () =>
          fetch(`${this.gatewayAdminUrl}`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${this.adminToken}`,
              "User-Agent": "Authentication-Service/1.0",
            },
            signal: AbortSignal.timeout(5000),
          }),
        { maxAttempts: 2, baseDelayMs: 50 }
      );

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
            url: this.gatewayAdminUrl,
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
          url: this.gatewayAdminUrl,
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
