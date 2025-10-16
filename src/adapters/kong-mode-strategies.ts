/* src/adapters/kong-mode-strategies.ts */

import { winstonTelemetryLogger } from "../telemetry/winston-logger";
import type { IKongModeStrategy } from "./api-gateway-adapter.interface";
import { createStandardHeaders } from "./kong-utils";

/**
 * Kong API Gateway Strategy
 *
 * Handles traditional self-hosted Kong with direct Admin API access.
 * Uses simple endpoint patterns and Kong-Admin-Token authentication.
 */
export class KongApiGatewayStrategy implements IKongModeStrategy {
  constructor(
    readonly baseUrl: string,
    readonly _adminToken: string
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, ""); // Remove trailing slash
  }

  async buildConsumerUrl(baseUrl: string, consumerId: string): Promise<string> {
    // Direct consumer ID usage for API Gateway mode
    return `${baseUrl}/consumers/${consumerId}/jwt`;
  }

  buildHealthUrl(baseUrl: string): string {
    return `${baseUrl}/status`;
  }

  createAuthHeaders(token: string): Record<string, string> {
    return createStandardHeaders({
      "Kong-Admin-Token": token,
    });
  }

  // API Gateway doesn't require prerequisites
  async ensurePrerequisites(): Promise<void> {
    // No prerequisites needed for API Gateway mode
  }

  // API Gateway uses consumer ID directly
  async resolveConsumerId(consumerId: string): Promise<string | null> {
    return consumerId;
  }
}

/**
 * Kong Konnect Strategy
 *
 * Handles cloud-native Kong Konnect with control planes and realm management.
 * Uses versioned API endpoints and Bearer token authentication.
 */
export class KongKonnectStrategy implements IKongModeStrategy {
  private readonly gatewayAdminUrl: string;
  private readonly consumerAdminUrl: string;
  private readonly controlPlaneId: string;
  private readonly realmId: string;

  constructor(
    readonly adminUrl: string,
    private readonly adminToken: string
  ) {
    const url = new URL(adminUrl);

    if (url.hostname.includes("konghq.com")) {
      // Parse Kong Konnect URL format
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
      // Self-hosted Kong with Konnect-style API (fallback)
      this.gatewayAdminUrl = adminUrl.replace(/\/$/, "");
      this.consumerAdminUrl = adminUrl.replace(/\/$/, "");
      this.controlPlaneId = "self-hosted";
      this.realmId = "default";
    }
  }

  async buildConsumerUrl(baseUrl: string, consumerId: string): Promise<string> {
    // Resolve consumer ID to UUID for Konnect
    const consumerUuid = await this.resolveConsumerId(consumerId);
    if (!consumerUuid) {
      throw new Error(`Consumer not found: ${consumerId}`);
    }
    return `${baseUrl}/core-entities/consumers/${consumerUuid}/jwt`;
  }

  buildHealthUrl(baseUrl: string): string {
    return baseUrl; // Konnect uses root endpoint for health
  }

  createAuthHeaders(token: string): Record<string, string> {
    return createStandardHeaders({
      Authorization: `Bearer ${token}`,
    });
  }

  async ensurePrerequisites(): Promise<void> {
    await this.ensureRealmExists();
  }

  async resolveConsumerId(consumerId: string): Promise<string | null> {
    const checkUrl = `${this.gatewayAdminUrl}/core-entities/consumers/${consumerId}`;

    try {
      const response = await fetch(checkUrl, {
        method: "GET",
        headers: this.createAuthHeaders(this.adminToken),
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        const consumer = await response.json();
        return consumer.id;
      }

      if (response.status === 404) {
        winstonTelemetryLogger.warn("Consumer not found in Kong Konnect", {
          consumerId,
          message: "Consumer must be created in Kong before JWT credentials can be provisioned",
          operation: "resolve_consumer_id",
        });
        return null;
      }

      winstonTelemetryLogger.error("Unexpected error resolving consumer ID", {
        consumerId,
        status: response.status,
        operation: "resolve_consumer_id",
      });
      throw new Error(`Unexpected error resolving consumer: ${response.status}`);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`Timeout resolving consumer: ${consumerId}`);
      }
      throw error;
    }
  }

  private async ensureRealmExists(): Promise<void> {
    const checkUrl = `${this.consumerAdminUrl}/realms/${this.realmId}`;

    try {
      const checkResponse = await fetch(checkUrl, {
        method: "GET",
        headers: this.createAuthHeaders(this.adminToken),
        signal: AbortSignal.timeout(5000),
      });

      if (checkResponse.ok) {
        return; // Realm already exists
      }

      if (checkResponse.status !== 404) {
        throw new Error(`Unexpected error checking realm: ${checkResponse.status}`);
      }

      // Create realm if it doesn't exist
      await this.createRealm();
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Timeout checking realm existence");
      }
      throw error;
    }
  }

  private async createRealm(): Promise<void> {
    const createUrl = `${this.consumerAdminUrl}/realms`;

    const createRealmRequest = {
      name: this.realmId,
      allowed_control_planes: [this.controlPlaneId],
    };

    try {
      const createResponse = await fetch(createUrl, {
        method: "POST",
        headers: this.createAuthHeaders(this.adminToken),
        body: JSON.stringify(createRealmRequest),
        signal: AbortSignal.timeout(10000),
      });

      if (createResponse.ok) {
        winstonTelemetryLogger.info("Created Kong Konnect realm", {
          realmId: this.realmId,
          controlPlaneId: this.controlPlaneId,
          operation: "create_realm",
        });
        return;
      }

      if (createResponse.status === 400) {
        const errorText = await createResponse.text();
        if (errorText.includes("realm name must be unique")) {
          // Realm already exists (race condition)
          return;
        }
      }

      const errorText = await createResponse.text();
      throw new Error(`Failed to create realm: ${createResponse.status} ${errorText}`);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Timeout creating realm");
      }
      throw error;
    }
  }
}

/**
 * Factory function to create appropriate Kong mode strategy
 * @param mode - Kong deployment mode
 * @param adminUrl - Kong admin URL
 * @param adminToken - Kong admin token
 * @returns Appropriate strategy instance
 */
export function createKongModeStrategy(
  mode: "API_GATEWAY" | "KONNECT",
  adminUrl: string,
  adminToken: string
): IKongModeStrategy {
  switch (mode) {
    case "API_GATEWAY":
      return new KongApiGatewayStrategy(adminUrl, adminToken);
    case "KONNECT":
      return new KongKonnectStrategy(adminUrl, adminToken);
    default:
      throw new Error(`Unsupported Kong mode: ${mode}`);
  }
}
