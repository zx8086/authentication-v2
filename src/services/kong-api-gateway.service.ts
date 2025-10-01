/* src/services/kong-api-gateway.service.ts */

import type {
  CacheEntry,
  ConsumerResponse,
  ConsumerSecret,
  IKongService,
  KongCacheStats,
  KongHealthCheckResult,
} from "../config";
import { recordError, recordException, recordKongOperation } from "../telemetry/metrics";

export class KongApiGatewayService implements IKongService {
  private readonly baseUrl: string;
  private readonly adminToken: string;
  private readonly cache = new Map<string, CacheEntry>();
  private readonly cacheTimeoutMs = 300000;

  constructor(adminUrl: string, adminToken: string) {
    this.baseUrl = adminUrl.replace(/\/$/, "");
    this.adminToken = adminToken;
  }

  async getConsumerSecret(consumerId: string): Promise<ConsumerSecret | null> {
    const cached = this.cache.get(consumerId);
    if (cached && Date.now() < cached.expires) {
      return cached.data;
    }

    try {
      const url = `${this.baseUrl}/consumers/${consumerId}/jwt`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Kong-Admin-Token": this.adminToken,
          "Content-Type": "application/json",
          "User-Agent": "Authentication-Service/1.0",
        },
        signal: AbortSignal.timeout(5000),
      });

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

      this.cache.set(consumerId, {
        data: secret,
        expires: Date.now() + this.cacheTimeoutMs,
      });

      return secret;
    } catch (error) {
      if (error instanceof Error) {
        const staleCache = this.cache.get(consumerId);
        if (staleCache) {
          return staleCache.data;
        }
      }

      return null;
    }
  }

  async createConsumerSecret(consumerId: string): Promise<ConsumerSecret | null> {
    try {
      const key = crypto.randomUUID().replace(/-/g, "");
      const secret = this.generateSecureSecret();

      const url = `${this.baseUrl}/consumers/${consumerId}/jwt`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Kong-Admin-Token": this.adminToken,
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
        const _errorText = await response.text();
        throw new Error(`Kong API error: ${response.status} ${response.statusText}`);
      }

      const createdSecret = (await response.json()) as ConsumerSecret;

      this.cache.set(consumerId, {
        data: createdSecret,
        expires: Date.now() + this.cacheTimeoutMs,
      });

      return createdSecret;
    } catch (_error) {
      return null;
    }
  }

  private generateSecureSecret(): string {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  clearCache(consumerId?: string): void {
    if (consumerId) {
      this.cache.delete(consumerId);
    } else {
      this.cache.clear();
    }
  }

  getCacheStats(): KongCacheStats {
    const totalEntries = this.cache.size;
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      consumerId: key,
      expires: new Date(entry.expires).toISOString(),
      expiresIn: Math.max(0, entry.expires - Date.now()),
      isActive: Date.now() < entry.expires,
    }));

    const activeEntries = entries.filter((entry) => entry.isActive).length;

    return {
      size: totalEntries,
      entries: entries,
      activeEntries,
      hitRate: totalEntries > 0 ? `${((activeEntries / totalEntries) * 100).toFixed(2)}%` : "0%",
    };
  }

  async healthCheck(): Promise<KongHealthCheckResult> {
    const startTime = Bun.nanoseconds();

    try {
      const response = await fetch(`${this.baseUrl}/status`, {
        method: "GET",
        headers: {
          "Kong-Admin-Token": this.adminToken,
          "User-Agent": "Authentication-Service/1.0",
        },
        signal: AbortSignal.timeout(5000),
      });

      const responseTime = (Bun.nanoseconds() - startTime) / 1_000_000;

      if (response.ok) {
        recordKongOperation("health_check", responseTime, true);
        return { healthy: true, responseTime };
      } else {
        const errorMsg = `HTTP ${response.status}`;

        recordKongOperation("health_check", responseTime, false);
        recordError("kong_health_check_failed", {
          status: response.status,
          statusText: response.statusText || "Unknown",
        });

        return {
          healthy: false,
          responseTime,
          error: errorMsg,
        };
      }
    } catch (error) {
      const responseTime = (Bun.nanoseconds() - startTime) / 1_000_000;

      recordKongOperation("health_check", responseTime, false);
      recordException(error as Error, {
        operation: "kong_health_check",
      });

      return {
        healthy: false,
        responseTime,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
