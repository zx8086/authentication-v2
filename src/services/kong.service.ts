/* src/services/kong.service.ts */

export type {
  Consumer,
  ConsumerResponse,
  ConsumerSecret,
  IKongService,
  KongHealthCheckResult,
  KongMode,
} from "../config";
export { KongServiceFactory } from "./kong.factory";
export { APIGatewayService } from "./api-gateway.service";

// Legacy exports for backward compatibility during transition
export { KongAdapter } from "../adapters/kong.adapter";
export type { IAPIGatewayAdapter } from "../adapters/api-gateway-adapter.interface";
