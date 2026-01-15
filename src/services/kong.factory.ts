/* src/services/kong.factory.ts */

import type { IKongService, KongModeType } from "../config";
import { KongApiGatewayService } from "./legacy/kong-api-gateway.service";
import { KongKonnectService } from "./legacy/kong-konnect.service";

// Factory for creating Kong service instances based on deployment mode
export class KongServiceFactory {
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
