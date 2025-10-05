/* src/services/kong.factory.ts */

import type { IKongService, KongModeType } from "../config";
import { KongApiGatewayService } from "./kong-api-gateway.service";
import { KongKonnectService } from "./kong-konnect.service";

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
