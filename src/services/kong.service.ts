/* src/services/kong.service.ts */

export type { IAPIGatewayAdapter } from "../adapters/api-gateway-adapter.interface";
// Legacy exports for backward compatibility during transition
export { KongAdapter } from "../adapters/kong.adapter";
export type {
  Consumer,
  ConsumerResponse,
  ConsumerSecret,
  IKongService,
  KongHealthCheckResult,
  KongMode,
} from "../config";
export { APIGatewayService } from "./api-gateway.service";
export { KongServiceFactory } from "./kong.factory";
