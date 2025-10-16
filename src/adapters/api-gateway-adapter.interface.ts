/* src/adapters/api-gateway-adapter.interface.ts */

import type {
  ConsumerSecret,
  KongCacheStats,
  KongHealthCheckResult,
} from "../config";
import type { CircuitBreakerStats } from "../services/shared-circuit-breaker.service";

/**
 * API Gateway Adapter Interface
 *
 * Provides a unified interface for API gateway operations, abstracting away
 * implementation details of different gateway types (Kong API Gateway, Kong Konnect, etc.)
 *
 * This interface standardizes operations across different API gateway modes while
 * preserving the existing IKongService contract for backward compatibility.
 */
export interface IAPIGatewayAdapter {
  /**
   * Retrieve consumer JWT secret from the API gateway
   * @param consumerId - The consumer identifier
   * @returns Consumer secret or null if not found
   */
  getConsumerSecret(consumerId: string): Promise<ConsumerSecret | null>;

  /**
   * Create new JWT credentials for a consumer
   * @param consumerId - The consumer identifier
   * @returns Created consumer secret or null if consumer doesn't exist
   */
  createConsumerSecret(consumerId: string): Promise<ConsumerSecret | null>;

  /**
   * Perform health check against the API gateway
   * @returns Health check result with status and response time
   */
  healthCheck(): Promise<KongHealthCheckResult>;

  /**
   * Clear cache for specific consumer or all consumers
   * @param consumerId - Optional consumer ID to clear specific cache entry
   */
  clearCache(consumerId?: string): Promise<void>;

  /**
   * Get current cache statistics
   * @returns Cache performance metrics and status
   */
  getCacheStats(): Promise<KongCacheStats>;

  /**
   * Get circuit breaker statistics for all operations
   * @returns Circuit breaker metrics by operation name
   */
  getCircuitBreakerStats(): Record<string, CircuitBreakerStats>;
}

/**
 * Kong Mode Strategy Interface
 *
 * Defines mode-specific operations for different Kong deployment types.
 * Used internally by KongAdapter to handle API_GATEWAY vs KONNECT differences.
 */
export interface IKongModeStrategy {
  /**
   * Build URL for consumer JWT operations
   * @param baseUrl - Base Kong admin URL
   * @param consumerId - Consumer identifier (may need resolution for Konnect)
   * @returns Complete URL for consumer JWT endpoint
   */
  buildConsumerUrl(baseUrl: string, consumerId: string): Promise<string>;

  /**
   * Build URL for health check operations
   * @param baseUrl - Base Kong admin URL
   * @returns Complete URL for health check endpoint
   */
  buildHealthUrl(baseUrl: string): string;

  /**
   * Create authentication headers for Kong API requests
   * @param token - Admin token
   * @returns Headers object with appropriate authentication
   */
  createAuthHeaders(token: string): Record<string, string>;

  /**
   * Ensure any prerequisites are met before operations (realm creation for Konnect)
   * @returns Promise that resolves when prerequisites are satisfied
   */
  ensurePrerequisites?(): Promise<void>;

  /**
   * Resolve consumer ID to internal format if needed (UUID lookup for Konnect)
   * @param consumerId - External consumer identifier
   * @returns Internal consumer identifier for API calls
   */
  resolveConsumerId?(consumerId: string): Promise<string | null>;
}