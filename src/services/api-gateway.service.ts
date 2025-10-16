/* src/services/api-gateway.service.ts */

import type { IAPIGatewayAdapter } from "../adapters/api-gateway-adapter.interface";
import type {
  ConsumerSecret,
  IKongService,
  KongCacheStats,
  KongHealthCheckResult,
} from "../config";
import type { CircuitBreakerStats } from "./shared-circuit-breaker.service";

/**
 * Unified API Gateway Service
 *
 * This service provides a unified interface for API gateway operations using the adapter pattern.
 * It maintains backward compatibility with the existing IKongService interface while delegating
 * all actual operations to the underlying adapter implementation.
 *
 * This approach allows us to:
 * - Consolidate Kong API Gateway and Kong Konnect logic into a single adapter
 * - Maintain existing service contracts for handlers and other consumers
 * - Enable easy testing by mocking the adapter interface
 * - Support future API gateway implementations without changing service consumers
 */
export class APIGatewayService implements IKongService {
  constructor(private readonly adapter: IAPIGatewayAdapter) {}

  /**
   * Retrieve consumer JWT secret from the API gateway
   * @param consumerId - The consumer identifier
   * @returns Consumer secret or null if not found
   */
  async getConsumerSecret(consumerId: string): Promise<ConsumerSecret | null> {
    return await this.adapter.getConsumerSecret(consumerId);
  }

  /**
   * Create new JWT credentials for a consumer
   * @param consumerId - The consumer identifier
   * @returns Created consumer secret or null if consumer doesn't exist
   */
  async createConsumerSecret(consumerId: string): Promise<ConsumerSecret | null> {
    return await this.adapter.createConsumerSecret(consumerId);
  }

  /**
   * Perform health check against the API gateway
   * @returns Health check result with status and response time
   */
  async healthCheck(): Promise<KongHealthCheckResult> {
    return await this.adapter.healthCheck();
  }

  /**
   * Clear cache for specific consumer or all consumers
   * @param consumerId - Optional consumer ID to clear specific cache entry
   */
  async clearCache(consumerId?: string): Promise<void> {
    return await this.adapter.clearCache(consumerId);
  }

  /**
   * Get current cache statistics
   * @returns Cache performance metrics and status
   */
  async getCacheStats(): Promise<KongCacheStats> {
    return await this.adapter.getCacheStats();
  }

  /**
   * Get circuit breaker statistics for all operations
   * @returns Circuit breaker metrics by operation name
   */
  getCircuitBreakerStats(): Record<string, CircuitBreakerStats> {
    return this.adapter.getCircuitBreakerStats();
  }
}
