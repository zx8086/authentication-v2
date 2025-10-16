/* src/services/kong.factory.ts */

import { KongAdapter } from "../adapters/kong.adapter";
import type { IKongService, KongModeType } from "../config";
import { APIGatewayService } from "./api-gateway.service";

/**
 * Kong Service Factory
 *
 * Updated to use the new adapter pattern for creating Kong services.
 * This factory now creates a unified APIGatewayService that uses the
 * appropriate Kong adapter based on the mode configuration.
 *
 * The factory maintains backward compatibility with existing code while
 * internally using the new adapter pattern to eliminate code duplication
 * between Kong API Gateway and Kong Konnect implementations.
 */
export class KongServiceFactory {
  /**
   * Create Kong service instance using adapter pattern
   * @param mode - Kong deployment mode (API_GATEWAY or KONNECT)
   * @param adminUrl - Kong admin API URL
   * @param adminToken - Kong admin authentication token
   * @returns Unified Kong service instance
   */
  static create(mode: KongModeType, adminUrl: string, adminToken: string): IKongService {
    // Create Kong adapter with mode-specific strategy
    const kongAdapter = new KongAdapter(mode, adminUrl, adminToken);

    // Return unified service that delegates to adapter
    return new APIGatewayService(kongAdapter);
  }
}
