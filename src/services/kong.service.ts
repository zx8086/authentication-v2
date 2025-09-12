/* src/services/kong.service.ts */

// Kong service for consumer management using native fetch
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

interface CacheEntry {
  data: ConsumerSecret;
  expires: number;
}

export class KongService {
  private readonly baseUrl: string;
  private readonly adminToken: string;
  private readonly cache = new Map<string, CacheEntry>();
  private readonly cacheTimeoutMs = 300000; // 5 minutes

  constructor(adminUrl: string, adminToken: string) {
    this.baseUrl = adminUrl.replace(/\/$/, ''); // Remove trailing slash
    this.adminToken = adminToken;
    
    console.log(`🔗 Kong service initialized: ${this.baseUrl}`);
  }

  async getConsumerSecret(consumerId: string): Promise<ConsumerSecret | null> {
    const cached = this.cache.get(consumerId);
    if (cached && Date.now() < cached.expires) {
      console.log(`Cache hit for consumer: ${consumerId}`);
      return cached.data;
    }

    try {
      const url = `${this.baseUrl}/consumers/${consumerId}/jwt`;
      
      console.log(`Fetching consumer secrets from Kong: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Kong-Admin-Token': this.adminToken,
          'Content-Type': 'application/json',
          'User-Agent': 'PVH-Authentication-Service/1.0',
        },
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.log(`Consumer not found: ${consumerId}`);
          return null;
        }
        
        const errorText = await response.text();
        console.error(`Kong API error ${response.status}: ${errorText}`);
        throw new Error(`Kong API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as ConsumerResponse;
      
      if (!data.data || data.data.length === 0) {
        console.log(`No JWT credentials found for consumer: ${consumerId}`);
        return null;
      }

      const secret = data.data[0]; // Take the first secret
      
      this.cache.set(consumerId, {
        data: secret,
        expires: Date.now() + this.cacheTimeoutMs,
      });

      console.log(`Retrieved secret for consumer: ${consumerId}`);
      return secret;
      
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Failed to get consumer secrets for ${consumerId}:`, error.message);
        
        const staleCache = this.cache.get(consumerId);
        if (staleCache) {
          console.log(`Using stale cache for consumer: ${consumerId}`);
          return staleCache.data;
        }
      } else {
        console.error(`Unexpected error getting consumer secrets:`, error);
      }
      
      return null;
    }
  }

  async createConsumerSecret(consumerId: string): Promise<ConsumerSecret | null> {
    try {
      const key = crypto.randomUUID().replace(/-/g, '');
      const secret = this.generateSecureSecret();
      
      const url = `${this.baseUrl}/consumers/${consumerId}/jwt`;
      
      console.log(`Creating new consumer secret in Kong: ${url}`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Kong-Admin-Token': this.adminToken,
          'Content-Type': 'application/json',
          'User-Agent': 'PVH-Authentication-Service/1.0',
        },
        body: JSON.stringify({
          key: key,
          secret: secret,
        }),
        signal: AbortSignal.timeout(10000), // 10 second timeout for create operations
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Kong API error ${response.status}: ${errorText}`);
        throw new Error(`Kong API error: ${response.status} ${response.statusText}`);
      }

      const createdSecret = await response.json() as ConsumerSecret;
      
      this.cache.set(consumerId, {
        data: createdSecret,
        expires: Date.now() + this.cacheTimeoutMs,
      });

      console.log(`Created new secret for consumer: ${consumerId}`);
      return createdSecret;
      
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Failed to create consumer secret for ${consumerId}:`, error.message);
      } else {
        console.error(`Unexpected error creating consumer secret:`, error);
      }
      return null;
    }
  }

  private generateSecureSecret(): string {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, byte => 
      byte.toString(16).padStart(2, '0')
    ).join('');
  }

  clearCache(consumerId?: string): void {
    if (consumerId) {
      this.cache.delete(consumerId);
      console.log(`Cleared cache for consumer: ${consumerId}`);
    } else {
      this.cache.clear();
      console.log('Cleared all consumer cache');
    }
  }

  getCacheStats(): { size: number; entries: string[] } {
    const entries = Array.from(this.cache.keys());
    return {
      size: this.cache.size,
      entries: entries,
    };
  }

  async healthCheck(): Promise<{ healthy: boolean; responseTime: number; error?: string }> {
    const startTime = Bun.nanoseconds();
    
    try {
      const response = await fetch(`${this.baseUrl}/status`, {
        method: 'GET',
        headers: {
          'Kong-Admin-Token': this.adminToken,
          'User-Agent': 'PVH-Authentication-Service/1.0',
        },
        signal: AbortSignal.timeout(5000),
      });

      const responseTime = (Bun.nanoseconds() - startTime) / 1_000_000;
      
      if (response.ok) {
        return { healthy: true, responseTime };
      } else {
        return { 
          healthy: false, 
          responseTime, 
          error: `HTTP ${response.status}` 
        };
      }
    } catch (error) {
      const responseTime = (Bun.nanoseconds() - startTime) / 1_000_000;
      return { 
        healthy: false, 
        responseTime, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}