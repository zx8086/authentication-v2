/* src/services/kong.service.ts */

// Kong service for consumer management using Gateway Admin API
import { recordKongOperation, recordError, recordException } from '../telemetry/simple-metrics';
export interface ConsumerSecret {
  id: string;
  key: string;
  secret: string;
  consumer: {
    id: string;
  };
}

export interface ConsumerResponse {
  data: ConsumerSecret[];
  total: number;
}

export interface Consumer {
  id: string;
  username: string;
  custom_id?: string;
  tags?: string[];
  created_at: number;
}

interface CacheEntry {
  data: ConsumerSecret;
  expires: number;
}

export class KongService {
  private readonly gatewayAdminUrl: string;
  private readonly consumerAdminUrl: string;
  private readonly adminToken: string;
  private readonly controlPlaneId: string;
  private readonly realmId: string;
  private readonly cache = new Map<string, CacheEntry>();
  private readonly cacheTimeoutMs = 300000; // 5 minutes

  constructor(adminUrl: string, adminToken: string) {
    const url = new URL(adminUrl);
    
    if (url.hostname.includes('konghq.com')) {
      // Kong Konnect - extract control plane ID
      const pathMatch = url.pathname.match(/\/v2\/control-planes\/([a-f0-9-]+)/);
      if (!pathMatch) {
        throw new Error('Invalid Kong Konnect URL format. Expected: https://region.api.konghq.com/v2/control-planes/{id}');
      }
      
      this.controlPlaneId = pathMatch[1];
      // For Konnect, use the control-planes/core-entities path for consumers
      this.gatewayAdminUrl = adminUrl.replace(/\/$/, ""); // Keep original control-planes URL
      this.consumerAdminUrl = `${url.protocol}//${url.hostname}/v1`;
      this.realmId = `auth-realm-${this.controlPlaneId.substring(0, 8)}`;
      
    } else {
      // Self-hosted Kong Gateway
      this.gatewayAdminUrl = adminUrl.replace(/\/$/, "");
      this.consumerAdminUrl = adminUrl.replace(/\/$/, "");
      this.controlPlaneId = 'self-hosted';
      this.realmId = 'default';
      
    }
    
    this.adminToken = adminToken;
  }

  async getConsumerSecret(consumerId: string): Promise<ConsumerSecret | null> {
    const cached = this.cache.get(consumerId);
    if (cached && Date.now() < cached.expires) {
      return cached.data;
    }

    try {
      // First ensure realm and consumer exist
      await this.ensureRealmExists();
      const consumerUuid = await this.ensureConsumerExists(consumerId);
      
      // Check if JWT credentials exist via Control Planes API
      const keysUrl = `${this.gatewayAdminUrl}/core-entities/consumers/${consumerUuid}/jwt`;
      

      const response = await fetch(keysUrl, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${this.adminToken}`,
          "Content-Type": "application/json",
          "User-Agent": "PVH-Authentication-Service/1.0",
        },
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }

        const errorText = await response.text();
        throw new Error(
          `Kong API error: ${response.status} ${response.statusText}`,
        );
      }

      const data = (await response.json()) as ConsumerResponse;

      if (!data.data || data.data.length === 0) {
        return null;
      }

      const secret = data.data[0]; // Take the first secret

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

  async createConsumerSecret(
    consumerId: string,
  ): Promise<ConsumerSecret | null> {
    try {
      // First, ensure the consumer exists and get UUID
      const consumerUuid = await this.ensureConsumerExists(consumerId);

      const key = crypto.randomUUID().replace(/-/g, "");
      const secret = this.generateSecureSecret();

      // Create JWT credentials using Control Planes core-entities API
      const url = `${this.gatewayAdminUrl}/core-entities/consumers/${consumerUuid}/jwt`;


      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.adminToken}`,
          "Content-Type": "application/json",
          "User-Agent": "PVH-Authentication-Service/1.0",
        },
        body: JSON.stringify({
          key: key,
          secret: secret,
        }),
        signal: AbortSignal.timeout(10000), // 10 second timeout for create operations
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Kong API error: ${response.status} ${response.statusText}`,
        );
      }

      const createdSecret = (await response.json()) as ConsumerSecret;

      this.cache.set(consumerId, {
        data: createdSecret,
        expires: Date.now() + this.cacheTimeoutMs,
      });

      return createdSecret;
    } catch (error) {
      return null;
    }
  }


  private async ensureRealmExists(): Promise<void> {
    try {
      // Check if realm already exists
      const checkUrl = `${this.consumerAdminUrl}/realms/${this.realmId}`;
      
      const checkResponse = await fetch(checkUrl, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${this.adminToken}`,
          "User-Agent": "PVH-Authentication-Service/1.0",
        },
        signal: AbortSignal.timeout(5000),
      });

      if (checkResponse.ok) {
        return;
      }

      if (checkResponse.status !== 404) {
        throw new Error(`Unexpected error checking realm: ${checkResponse.status}`);
      }

      // Create the realm using Consumer Admin API
      const createUrl = `${this.consumerAdminUrl}/realms`;
      

      const createRealmRequest = {
        name: this.realmId,
        allowed_control_planes: [this.controlPlaneId]
      };

      const createResponse = await fetch(createUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.adminToken}`,
          "Content-Type": "application/json",
          "User-Agent": "PVH-Authentication-Service/1.0",
        },
        body: JSON.stringify(createRealmRequest),
        signal: AbortSignal.timeout(10000),
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        
        // If realm name is already taken, that's fine - it exists
        if (createResponse.status === 400 && errorText.includes('realm name must be unique')) {
          return;
        }
        
        throw new Error(`Failed to create realm: ${createResponse.status} ${errorText}`);
      }

    } catch (error) {
      throw error;
    }
  }

  private async ensureConsumerExists(consumerId: string): Promise<string> {
    try {
      // Check if consumer already exists using Control Planes API
      const checkUrl = `${this.gatewayAdminUrl}/core-entities/consumers/${consumerId}`;
      
      const checkResponse = await fetch(checkUrl, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${this.adminToken}`,
          "User-Agent": "PVH-Authentication-Service/1.0",
        },
        signal: AbortSignal.timeout(5000),
      });

      if (checkResponse.ok) {
        const existingConsumer = await checkResponse.json() as Consumer;
        return existingConsumer.id;
      }

      if (checkResponse.status !== 404) {
        throw new Error(`Unexpected error checking consumer: ${checkResponse.status}`);
      }

      // Create the consumer using Control Planes core-entities API
      const createUrl = `${this.gatewayAdminUrl}/core-entities/consumers`;
      

      const createConsumerRequest = {
        username: consumerId,
        custom_id: consumerId,
        tags: ['auth-service']
      };

      const createResponse = await fetch(createUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.adminToken}`,
          "Content-Type": "application/json",
          "User-Agent": "PVH-Authentication-Service/1.0",
        },
        body: JSON.stringify(createConsumerRequest),
        signal: AbortSignal.timeout(10000),
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        throw new Error(`Failed to create consumer: ${createResponse.status} ${errorText}`);
      }

      const createdConsumer = await createResponse.json() as Consumer;
      return createdConsumer.id;
    } catch (error) {
      throw error;
    }
  }

  private generateSecureSecret(): string {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
      "",
    );
  }

  clearCache(consumerId?: string): void {
    if (consumerId) {
      this.cache.delete(consumerId);
    } else {
      this.cache.clear();
    }
  }

  getCacheStats(): { size: number; entries: any[]; activeEntries: number; hitRate: string } {
    const totalEntries = this.cache.size;
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      consumerId: key,
      expires: new Date(entry.expires).toISOString(),
      expiresIn: Math.max(0, entry.expires - Date.now()),
      isActive: Date.now() < entry.expires
    }));
    
    const activeEntries = entries.filter(entry => entry.isActive).length;
    
    return {
      size: totalEntries,
      entries: entries,
      activeEntries,
      hitRate: totalEntries > 0 ? (activeEntries / totalEntries * 100).toFixed(2) + '%' : '0%'
    };
  }

  async healthCheck(): Promise<{
    healthy: boolean;
    responseTime: number;
    error?: string;
  }> {
    const startTime = Bun.nanoseconds();

    try {
      const response = await fetch(`${this.gatewayAdminUrl}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${this.adminToken}`,
          "User-Agent": "PVH-Authentication-Service/1.0",
        },
        signal: AbortSignal.timeout(5000),
      });

      const responseTime = (Bun.nanoseconds() - startTime) / 1_000_000;

      if (response.ok) {
        // Record successful health check
        recordKongOperation('health_check', responseTime, true);
        return { healthy: true, responseTime };
      } else {
        const errorMsg = `HTTP ${response.status}`;
        
        // Record failed health check
        recordKongOperation('health_check', responseTime, false);
        recordError('kong_health_check_failed', {
          status: response.status,
          statusText: response.statusText || 'Unknown'
        });
        
        return {
          healthy: false,
          responseTime,
          error: errorMsg,
        };
      }
    } catch (error) {
      const responseTime = (Bun.nanoseconds() - startTime) / 1_000_000;
      
      // Record health check exception
      recordKongOperation('health_check', responseTime, false);
      recordException(error as Error, {
        operation: 'kong_health_check'
      });
      
      return {
        healthy: false,
        responseTime,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
