/* src/services/kong.factory.ts */

import type { IKongService, KongModeType } from "../config";
import { KongApiGatewayService } from "./legacy/kong-api-gateway.service";
import { KongKonnectService } from "./legacy/kong-konnect.service";

/**
 * Kong Service Factory
 *
 * Creates appropriate Kong service based on deployment mode.
 * Maintains full backward compatibility with existing implementations.
 */
export class KongServiceFactory {
  /**
   * Create Kong service instance based on mode
   * @param mode - Kong deployment mode (API_GATEWAY or KONNECT)
   * @param adminUrl - Kong admin API URL
   * @param adminToken - Kong admin authentication token
   * @returns Kong service instance
   */
  static create(mode: KongModeType, adminUrl: string, adminToken: string): IKongService {
    switch (mode) {
      case "API_GATEWAY":
        return new KongApiGatewayService(adminUrl, adminToken);
      case "KONNECT":
        return new KongKonnectService(adminUrl, adminToken);
      default:
        throw new Error(`Unsupported Kong mode: ${mode}`);
    }
  }
}
