# Authentication Service

## Table of Contents
1. [Purpose](#purpose)
2. [Architecture Overview](#architecture-overview)
3. [Kong Gateway Integration Context](#kong-gateway-integration-context)
4. [Authentication Flow](#authentication-flow)
5. [Technical Implementation](#technical-implementation)
6. [Configuration Guide](#configuration-guide)
7. [API Reference](#api-reference)
8. [Observability & Monitoring](#observability--monitoring)
9. [Deployment & Operations](#deployment--operations)
10. [CPU and Memory Profiling](#cpu-and-memory-profiling)
11. [Security Considerations](#security-considerations)
12. [Testing Strategy](#testing-strategy)
13. [Practical Usage Examples](#practical-usage-examples)

---

## Purpose
The Authentication Service is a high-performance microservice built with Bun runtime and TypeScript that bridges Kong API Gateway's consumer management system with JWT token generation. It serves as the central authentication authority for an API ecosystem - issuing secure short-lived JWT tokens to authenticated consumers.

**Important**: This service is NOT a proxy - it's purely a JWT token issuer. Applications obtain a JWT token from this service once, then use that token directly with backend services through Kong Gateway.

### Key Responsibilities
- **JWT Token Generation**: Creates signed JWT tokens using native crypto.subtle Web API
- **Consumer Secret Management**: Interfaces with Kong Admin API to retrieve or create consumer secrets
- **Security Enforcement**: Validates consumer authentication status and blocks anonymous access
- **Token Standardization**: Ensures consistent JWT structure and claims across the platform
- **Observability**: Provides comprehensive OpenTelemetry instrumentation for monitoring and debugging

### Core Capabilities
- Issues JWT tokens with configurable expiration (default 15 minutes)
- Automatically provisions JWT secrets for consumers
- Integrates with both Kong API Gateway and Kong Konnect
- Provides distributed tracing via OpenTelemetry
- Supports CORS for browser-based applications
- Offers multiple health check endpoints for monitoring
- Serves dynamic OpenAPI documentation
- Provides debug endpoints for metrics testing

### Performance Characteristics
- **Throughput**: 100,000+ requests/second capability with native Bun Routes API
- **Memory Usage**: ~50-80MB baseline with optimized telemetry
- **Cold Start**: <100ms initialization time with hybrid caching
- **Response Time**: <10ms p99 for token generation (crypto.subtle + response builders)
- **Container Size**: <100MB with all dependencies (multi-stage Alpine build)
- **Cache Performance**: 90%+ hit rate with memory-first hybrid strategy
- **Resilience**: Circuit breaker protection with Kong Admin API resilience and stale cache fallback

---

## Architecture Overview

### System Architecture

```
┌─────────────────┐      ┌─────────────────┐      ┌──────────────────┐
│   Client App    │─────▶│  Kong Gateway   │─────▶│  Auth Service    │
└─────────────────┘      └─────────────────┘      └──────────────────┘
                                  │                         │
                                  │                         │
                          ┌───────▼────────┐        ┌───────▼────────┐
                          │ Kong Admin API │        │ Unified Cache  │
                          │   (Consumers)  │◀───────│  Architecture  │
                          └────────────────┘        └────────────────┘
                                  │                         │
                           ┌──────▼──────┐         ┌────────▼────────┐
                           │ Circuit     │         │  Redis Cache    │
                           │ Breaker     │         │  (HA Mode)      │
                           └─────────────┘         └─────────────────┘
                                                             │
                                                    ┌────────▼────────┐
                                                    │  OpenTelemetry  │
                                                    │ & Profiling     │
                                                    └─────────────────┘
```

### Component Dependencies

#### External Dependencies
- **Kong Gateway**: Provides consumer authentication and request routing
- **Kong Admin API**: Manages consumer secrets and JWT configurations
- **Redis Cache**: Optional high-availability cache backend for enhanced resilience
- **OpenTelemetry Collector**: Receives distributed tracing, metrics, and logs

#### Internal Components
- **HTTP Server**: Native Bun.serve() Routes API for maximum performance (100k+ req/sec)
- **JWT Service**: Token generation using crypto.subtle Web API with response builders
- **API Gateway Adapter**: Unified Kong adapter supporting both API Gateway and Konnect modes
  - `kong.adapter.ts`: Consolidated Kong integration with strategy pattern
  - Mode-specific strategies for different Kong deployments
- **Unified Cache Architecture**: Pluggable cache backends with intelligent fallback
  - `cache-factory.ts`: Cache backend selection and initialization
  - In-memory cache with configurable Redis backend
  - Automatic failover and stale data tolerance
- **Response Builders**: Standardized response patterns for consistency and type safety
- **Handler Layer**: Dedicated request handlers (`src/handlers/`) for focused business logic
  - `tokens.ts`: JWT token generation with Kong integration and caching
  - `health.ts`: Health checks with dependency monitoring and circuit breaker status
  - `metrics.ts`: Consolidated performance metrics and debugging endpoints
  - `openapi.ts`: Dynamic OpenAPI specification generation
  - `profiling.ts`: Chrome DevTools profiling integration
- **Middleware Layer**: Cross-cutting concerns (`src/middleware/`)
  - `error-handler.ts`: Centralized error handling with structured responses
  - `cors.ts`: CORS preflight request handling
- **Router Layer**: Native Bun Routes API integration (`src/routes/router.ts`)
- **Circuit Breaker**: Opossum-based resilience protection for Kong Admin API with stale cache fallback
- **Shared Circuit Breaker Service**: Centralized circuit breaker management with cache integration
- **Stale Cache Resilience**: Extended service availability (up to 2 hours) during Kong outages
- **Telemetry System**: Optimized OpenTelemetry instrumentation with cost reduction
- **Profiling Service**: Chrome DevTools integration for performance analysis
- **Configuration Manager**: 4-pillar configuration pattern with security validation
- **Health Monitors**: Enhanced health checks with circuit breaker and cache status

### Technology Stack
- **Runtime**: Bun v1.2.23+ (native JavaScript runtime)
- **Language**: TypeScript
- **HTTP Server**: Native Bun.serve() with built-in performance optimizations
- **JWT Generation**: Web Crypto API (crypto.subtle) with HMAC-SHA256
- **Caching**: Redis with in-memory fallback using unified cache architecture
- **Circuit Breakers**: Opossum library for Kong API resilience
- **Container**: Docker with Alpine Linux base (oven/bun:1.2.23-alpine)
- **Monitoring**: OpenTelemetry with OTLP protocol
- **Profiling**: Chrome DevTools integration via Bun inspector
- **API Documentation**: Dynamic OpenAPI generation
- **Code Quality**: Biome for linting and formatting with performance optimization
- **Testing**: Bun test runner, Playwright E2E, K6 performance testing
- **CI/CD**: GitHub Actions with parallel job execution and Docker Cloud Builders

---

## Why Use an Authentication Service?

### Understanding the Alternative: Direct Kong JWT

To appreciate the value of this authentication service, it's important to understand how JWT authentication would work without it.

#### Without Authentication Service (Direct Kong JWT)

**Manual Process Required:**

1. **Create Consumer and JWT Credentials**:
```bash
# Create consumer
curl -X POST http://kong:8001/consumers \
  -d "username=example-consumer"

# Create JWT credential with secret
curl -X POST http://kong:8001/consumers/example-consumer/jwt \
  -d '{
    "key": "example-issuer-key",
    "secret": "example-super-secret-signing-key-123456"
  }'
```

2. **Client Must Generate Their Own JWT**:
```javascript
// Client needs JWT library and secret management
import jwt from 'jsonwebtoken';

class ClientWithoutAuthService {
  constructor(private jwtSecret: string, private jwtKey: string) {
    // Client MUST store and manage the secret!
  }

  generateToken() {
    // Client implements JWT generation
    return jwt.sign(
      {
        iss: this.jwtKey,
        exp: Math.floor(Date.now() / 1000) + 900,
        // Must include all required claims
      },
      this.jwtSecret,  // Client manages the secret!
      { algorithm: 'HS256' }
    );
  }
}
```

**Major Problems:**
- **Secret Distribution**: How to securely distribute JWT secrets to all clients?
- **Client Complexity**: Every client needs JWT generation logic
- **Security Risk**: Secrets stored in client applications
- **No Central Control**: Difficult to rotate secrets or revoke access
- **Inconsistent Implementation**: Each client might implement differently

#### With Authentication Service (Current Architecture)

**Simple Client Implementation:**
```typescript
// Client only needs API key - NO SECRET MANAGEMENT!
class ClientWithAuthService {
  constructor(private apiKey: string) {
    // No secret needed!
  }

  async getToken() {
    const response = await fetch('/tokens', {
      headers: { 'apikey': this.apiKey }
    });
    return (await response.json()).access_token;
  }
}
```

### Architectural Comparison

| Aspect | Without Auth Service | With Auth Service |
|--------|---------------------|-------------------|
| **Secret Management** | Distributed to all clients | Centralized in Kong |
| **Client Security** | Secrets in client code/config | Only API key needed |
| **Implementation** | Complex JWT logic required | Simple HTTP call |
| **Token Consistency** | Varies by implementation | Standardized tokens |
| **Secret Rotation** | Update all client applications | Single Kong update |
| **Access Revocation** | Difficult and slow | Instant via Kong |
| **Audit Trail** | Distributed across clients | Centralized logging |
| **Client Dependencies** | JWT libraries required | Just HTTP client |
| **Operational Overhead** | High (manage many secrets) | Low (manage API keys) |

### Real-World Impact

**Scenario: 50 Client Applications**

Without Auth Service:
- 50 different places storing JWT secrets
- Secret rotation requires updating 50 applications
- Security breach means secrets compromised everywhere
- Each client team implements JWT generation

With Auth Service:
- Zero JWT secrets in client code
- Secret rotation with one Kong API call
- Security breach contained to central service
- Consistent token generation for all clients

### Security Benefits

The authentication service acts as a **secure token vending machine**:

1. **Clients Never See Secrets**: JWT signing secrets remain server-side
2. **Centralized Security**: One hardened service vs many client implementations
3. **Instant Revocation**: Disable access immediately through Kong
4. **Audit Compliance**: Complete audit trail of token issuance
5. **Secret Rotation**: Rotate secrets without client updates

This architecture provides enterprise-grade security while simplifying client implementation - clients trade their API key for a JWT without ever handling signing secrets.

---

## Kong Gateway Integration Context

### Role in the Kong Ecosystem

The authentication service operates as a critical component within the Kong Gateway architecture, serving as the JWT token issuer for the entire API ecosystem. It supports both traditional Kong API Gateway and modern Kong Konnect deployments.

#### Kong Mode Support
The service supports two Kong deployment modes via the `KONG_MODE` environment variable:

1. **API_GATEWAY Mode**: Traditional self-hosted Kong
   - Direct access to Kong Admin API
   - URL format: `http://kong-admin:8001`
   - Consumer management at `/consumers/{id}/jwt`

2. **KONNECT Mode**: Kong's cloud-native platform
   - Control plane based management
   - URL format: `https://region.api.konghq.com/v2/control-planes/{id}`
   - Consumer management with realm support

#### Phase 1: Initial Authentication (Getting JWT)
1. **Client authenticates with Kong** using API key (`key-auth` plugin)
2. **Kong validates credentials** and identifies the consumer
3. **Kong forwards request** to authentication service with consumer headers
4. **Authentication service issues JWT** valid for configured duration
5. **Client receives JWT** for subsequent API calls

#### Phase 2: API Access (Using JWT)
1. **Client includes JWT** in Authorization header
2. **Kong validates JWT** using `jwt` plugin
3. **Kong forwards request** to backend services
4. **Backend services trust** Kong's validation

### Kong Plugin Architecture

#### Key-Auth Plugin (for `/tokens` endpoint)
```yaml
plugins:
- name: key-auth
  config:
    hide_credentials: true
    key_in_body: false
    key_in_header: true
    key_in_query: true
    key_names:
    - apikey
    run_on_preflight: true
```

**Purpose**: Protects the `/tokens` endpoint, requiring API key authentication before JWT issuance.

#### JWT Plugin (for protected services)
```yaml
plugins:
- name: jwt
  config:
    anonymous: 12345678-1234-1234-1234-123456789abc  # Anonymous consumer UUID
    claims_to_verify:
    - exp  # Expiration time
    - nbf  # Not before time
    cookie_names: []
    header_names:
    - authorization
    key_claim_name: key  # Must match authentication service configuration
    maximum_expiration: 0
    run_on_preflight: true
    secret_is_base64: false
    uri_param_names:
    - jwt
```

**Purpose**: Validates JWT tokens issued by the authentication service for backend API access.

### Anonymous Consumer Handling

#### Anonymous Consumer Configuration
- **UUID**: `12345678-1234-1234-1234-123456789abc`
- **Purpose**: Allows certain endpoints to be accessed without authentication
- **Behavior**: When JWT validation fails, Kong falls back to anonymous consumer

#### Service Behavior with Anonymous Consumers

**Authentication Service** (`/tokens` endpoint):
- **Blocks anonymous consumers**: Returns 401 Unauthorized
- **Requires valid consumer**: Must have authenticated consumer ID
- **No fallback**: Anonymous access explicitly denied

**Protected Services** (with JWT plugin):
- **Allows fallback**: Can configure anonymous consumer for public endpoints
- **Granular control**: Services decide whether to allow anonymous access
- **Rate limiting**: Anonymous consumers can have different rate limits

---

## Authentication Flow

### Complete Authentication Flow with Kong Plugins

#### Phase 1: Obtaining JWT Token

##### 1. Client Requests JWT Token
```http
GET /tokens HTTP/1.1
Host: gateway.example.com
apikey: consumer-api-key-12345
```

##### 2. Kong Key-Auth Plugin Processing
- Validates API key against consumer database
- Identifies consumer: `example-consumer`
- Adds upstream headers for authentication service

##### 3. Kong Adds Upstream Headers
After successful authentication, Kong adds headers to the upstream request:
```
X-Consumer-ID: 98765432-9876-5432-1098-765432109876
X-Consumer-Username: example-consumer
X-Anonymous-Consumer: false
```

##### 4. Request Reaches Authentication Service
```http
GET /tokens HTTP/1.1
Host: auth.example.com
X-Consumer-ID: 98765432-9876-5432-1098-765432109876
X-Consumer-Username: example-consumer
X-Anonymous-Consumer: false
```

##### 5. Authentication Service Validates Headers
```typescript
// Header validation in server.ts
if (!request.headers.get("x-consumer-id") ||
    !request.headers.get("x-consumer-username") ||
    request.headers.get("x-anonymous-consumer") === "true") {
  return new Response("Unauthorized", { status: 401 });
}
```

##### 6. Retrieve/Create Consumer Secret via Kong Admin API
```typescript
// Kong service interaction
const secret = await kongService.getOrCreateConsumerSecret(consumerId);
```

##### 7. Generate and Return JWT Token
```typescript
// JWT generation using crypto.subtle
const token = await jwtService.generateToken(username, secret.key, secret.secret);
```

Response:
```json
{
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 900
}
```

#### Phase 2: Using JWT for API Access

##### 1. Client Calls Protected Service
```http
GET /customer-assignments/123 HTTP/1.1
Host: gateway.example.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

##### 2. Kong JWT Plugin Validation
- Extracts JWT from Authorization header
- Validates signature using consumer's secret from Kong
- Verifies claims (exp, nbf)
- Checks `key` claim matches consumer's key

##### 3. Validation Success Path
- Kong adds consumer headers to upstream request
- Request forwarded to backend service
- Backend receives validated consumer information

##### 4. Validation Failure Path
- If JWT invalid/expired: Falls back to anonymous consumer (if configured)
- If no anonymous fallback: Returns 401 Unauthorized
- Anonymous consumer has UUID: `12345678-1234-1234-1234-123456789abc`

##### 5. Backend Service Processing
- Backend service receives validated request with consumer headers
- Processes business logic based on authenticated consumer identity
- Returns response data to Kong Gateway

##### 6. Response to Client
- Kong Gateway forwards backend response to client
- Response includes any headers set by backend service
- Client receives final response with requested data

### Phase 1 Flow Diagram (Getting JWT)
```
┌──────────┐     ┌─────────┐     ┌───────────┐     ┌──────────┐
│  Client  │────▶│  Kong   │────▶│   Auth    │────▶│  Kong    │
│          │◀────│ Gateway │◀────│  Service  │◀────│  Admin   │
└──────────┘     └─────────┘     └───────────┘     └──────────┘
     │                │                │                 │
     │ 1. API Key     │ 2. Add Headers │ 3. Get Secret  │
     │                │                │                 │
     │ 7. JWT Token   │ 6. JWT Response│ 4. Secret      │
     ▼                ▼                ▼                 ▼
```

### Phase 2 Flow Diagram (Using JWT)
```
┌──────────┐     ┌─────────┐     ┌───────────┐
│  Client  │────▶│  Kong   │────▶│  Backend  │
│          │◀────│ Gateway │◀────│  Service  │
└──────────┘     └─────────┘     └───────────┘
     │                │                │
     │ 1. JWT Token   │ 2. Validate    │ 3. Process
     │                │    & Forward   │    Request
     │                │                │
     │ 6. Response    │ 5. Response    │ 4. Data
     ▼                ▼                ▼
```

---

## Technical Implementation

### JWT Token Structure

#### Token Header
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

#### Token Claims
```typescript
{
  sub: username,                              // Consumer username
  iss: authority,                             // Token issuer (from KONG_JWT_AUTHORITY)
  aud: audience,                              // Token audience (from KONG_JWT_AUDIENCE)
  jti: crypto.randomUUID(),                   // Unique token ID
  iat: Math.floor(Date.now() / 1000),        // Issued at (Unix timestamp)
  exp: Math.floor((Date.now() + expirationMs) / 1000), // Expires at
  nbf: Math.floor(Date.now() / 1000),        // Not before
  name: username,                             // Consumer name claim
  unique_name: `example.com#${username}`,    // Unique identifier
  key: consumerKey                           // Kong consumer key (from KONG_JWT_KEY_CLAIM_NAME)
}
```

#### Token Signature
- Algorithm: HMAC SHA-256 using Web Crypto API
- Secret: Consumer-specific secret from Kong
- Implementation: Native crypto.subtle.sign()

### Consumer Secret Management

#### Secret Structure
```typescript
interface ConsumerSecret {
  id: string;           // Secret ID from Kong
  key: string;          // Public key identifier (e.g., "abc123...")
  secret: string;       // HMAC signing secret (e.g., "x8f3k9dm...")
  algorithm: string;    // Always "HS256"
  consumer: {
    id: string;         // Kong consumer ID
  };
}
```

#### Secret Lifecycle
1. **Creation**: Automatically created when consumer first requests token
2. **Storage**: Managed by Kong Admin API
3. **Hybrid Caching**: Memory-first with Redis fallback for high performance
4. **Retrieval**: Fetched with connection pooling and circuit breaker protection
5. **Rotation**: Can be rotated via Kong Admin API with cache invalidation
6. **Revocation**: Deleted through Kong Admin API with immediate cache cleanup

### Core Services Implementation

#### JWT Service (src/services/jwt.service.ts)
```typescript
export class JWTService {
  async generateToken(username: string, consumerKey: string, secret: string): Promise<string> {
    // Build JWT header
    const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));

    // Build JWT payload with claims
    const payload = base64url(JSON.stringify({
      sub: username,
      key: consumerKey,
      jti: crypto.randomUUID(),
      iat: now,
      exp: expiration,
      iss: this.authority,
      aud: this.audience,
      name: username,
      unique_name: `example.com#${username}`
    }));

    // Sign with HMAC SHA-256
    const signature = await this.sign(`${header}.${payload}`, secret);

    return `${header}.${payload}.${signature}`;
  }

  private async sign(data: string, secret: string): Promise<string> {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signature = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(data)
    );

    return base64url(signature);
  }
}
```

#### API Gateway Adapter (src/adapters/kong.adapter.ts)

The service now uses a unified adapter pattern for Kong integration, supporting both Kong API Gateway and Kong Konnect with mode-specific strategies.

```typescript
export class KongAdapter implements IAPIGatewayAdapter {
  private readonly strategy: IKongModeStrategy;
  private cache: IKongCacheService | null = null;
  private circuitBreaker: SharedCircuitBreakerService;

  constructor(
    private readonly mode: KongModeType,
    private readonly adminUrl: string,
    private readonly adminToken: string
  ) {
    // Create mode-specific strategy for Kong API Gateway vs Konnect
    this.strategy = createKongModeStrategy(mode, adminUrl, adminToken);

    // Initialize shared circuit breaker with configuration
    this.circuitBreaker = SharedCircuitBreakerService.getInstance(
      circuitBreakerConfig,
      cachingConfig,
      undefined
    );

    // Initialize unified cache asynchronously
    this.initializeCache();
  }

  async getConsumerSecret(consumerId: string): Promise<ConsumerSecret | null> {
    await this.ensureCacheInitialized();

    const cacheKey = generateCacheKey(consumerId);

    // Check unified cache first (Redis or in-memory)
    const cached = await this.cache?.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Use circuit breaker for Kong operations with stale cache fallback
    return await this.circuitBreaker.wrapKongConsumerOperation(
      "getConsumerSecret",
      consumerId,
      async () => {
        // Ensure prerequisites (realm for Konnect)
        if (this.strategy.ensurePrerequisites) {
          await this.strategy.ensurePrerequisites();
        }

        // Build consumer URL using mode-specific strategy
        const url = await this.strategy.buildConsumerUrl(this.adminUrl, consumerId);

        const response = await withRetry(() =>
          fetch(url, {
            method: "GET",
            headers: this.strategy.createAuthHeaders(this.adminToken),
            signal: createRequestTimeout(5000),
          }),
          { maxAttempts: 2, baseDelayMs: 100 }
        );

        if (!isSuccessResponse(response)) {
          if (isConsumerNotFound(response)) {
            return null;
          }
          const errorMessage = await parseKongApiError(response);
          throw new Error(errorMessage);
        }

        const data = (await response.json()) as ConsumerResponse;
        const secret = extractConsumerSecret(data);

        if (secret) {
          // Store in unified cache after successful retrieval
          await this.cache?.set(cacheKey, secret);
        }

        return secret;
      }
    );
  }

  private async initializeCache(): Promise<void> {
    try {
      // Use cache factory to create appropriate backend (Redis or in-memory)
      this.cache = await CacheFactory.createKongCache();

      // Update circuit breaker with cache service for HA mode
      if (getKongConfig().highAvailability) {
        SharedCircuitBreakerService.updateCacheService(this.cache);
      }
    } catch (error) {
      // Graceful degradation - service continues without cache
      winstonTelemetryLogger.error("Failed to initialize Kong adapter cache", {
        error: error instanceof Error ? error.message : "Unknown error",
        mode: this.mode,
        operation: "cache_initialization",
      });
    }
  }
}
```

#### Circuit Breaker Service (src/services/circuit-breaker.service.ts)

The service implements comprehensive circuit breaker protection for Kong Admin API calls using the Opossum library, providing resilience against Kong failures with graceful degradation.

**Key Features:**
- **Kong API Protection**: Wraps all Kong Admin API operations with circuit breaker
- **Stale Cache Fallback**: Serves cached data when Kong is unavailable
- **Adaptive Caching Strategy**: Supports both HA (Redis) and non-HA (in-memory) modes
- **OpenTelemetry Integration**: Comprehensive metrics and observability

```typescript
export class SharedCircuitBreakerService {
  private static instance: SharedCircuitBreakerService | null = null;
  private circuitBreaker: CircuitBreaker;
  private staleCache: Map<string, { data: any; timestamp: number }> | undefined;
  private cacheService?: IKongCacheService;

  // Singleton pattern for consistent state across Kong services
  static getInstance(
    config: CircuitBreakerConfig & { highAvailability?: boolean },
    cachingConfig: CachingConfig,
    cacheService?: IKongCacheService
  ): SharedCircuitBreakerService {
    if (!this.instance) {
      this.instance = new SharedCircuitBreakerService(config, cachingConfig, cacheService);
    }
    return this.instance;
  }

  // Wrap Kong consumer operations with circuit breaker and stale cache fallback
  async wrapKongConsumerOperation<T>(
    operation: string,
    consumerId: string,
    fn: () => Promise<T>
  ): Promise<T | null> {
    const cacheKey = `${operation}:${consumerId}`;

    try {
      // Execute operation through circuit breaker
      const result = await this.circuitBreaker.fire();

      if (result !== null) {
        // Cache successful result
        this.setCachedData(cacheKey, result);
        recordCircuitBreakerRequest(operation, true, false);
        return result;
      }
    } catch (error) {
      // Circuit breaker rejected or operation failed
      recordCircuitBreakerRequest(operation, false, false);
    }

    // Fallback to stale cache with adaptive strategy
    return await this.getFallbackData(cacheKey, operation);
  }

  // Adaptive caching strategy: Redis stale cache (HA mode) -> In-memory cache
  private async getFallbackData<T>(cacheKey: string, operation: string): Promise<T | null> {
    // HA Mode: Try Redis stale cache first (2-hour tolerance)
    if (this.config.highAvailability && this.cacheService) {
      try {
        const extractedKey = this.extractKeyFromCacheKey(cacheKey);
        const redisStale = await this.cacheService.getStale?.(extractedKey);
        if (redisStale) {
          recordCacheTierUsage("redis-stale", operation);
          recordCircuitBreakerFallback(operation, "redis_stale_cache");
          return redisStale;
        }
      } catch (error) {
        recordCacheTierError("redis-stale", operation, "access_error");
      }
    }

    // Non-HA Mode or Redis fallback: Try in-memory stale cache (30-minute tolerance)
    const inMemoryStale = this.getStaleData(cacheKey);
    if (inMemoryStale) {
      recordCacheTierUsage("in-memory", operation);
      recordCircuitBreakerFallback(operation, "in_memory_stale_cache");
      return inMemoryStale.data;
    }

    // No fallback available
    recordCircuitBreakerRequest(operation, false, true);
    return null;
  }
}
```

**Circuit Breaker Configuration:**
- **Timeout**: 500ms for Kong API calls
- **Error Threshold**: 50% failure rate over 10-second window
- **Reset Timeout**: 30 seconds for circuit recovery
- **Stale Data Tolerance**: 30 minutes (in-memory) or 2 hours (Redis HA mode)

**Benefits:**
- **Service Availability**: Continues operating during Kong outages using stale cache
- **Performance Protection**: Prevents cascading failures when Kong is slow
- **Observability**: Comprehensive metrics for circuit breaker state and cache tier usage
- **Adaptive Strategy**: Optimized caching approach for both simple and HA deployments

#### Unified Cache Architecture (src/services/cache/)

The service implements a pluggable cache architecture that supports multiple backends with intelligent failover and performance optimization.

```typescript
export class CacheFactory {
  static async createKongCache(): Promise<IKongCacheService> {
    const cachingConfig = getCachingConfig();

    // Try Redis backend for high-availability mode
    if (cachingConfig.redis.enabled) {
      try {
        const redisCache = new RedisCacheService(cachingConfig.redis);
        await redisCache.initialize();

        // Wrap with fallback to in-memory for resilience
        return new FallbackCacheService(redisCache, new InMemoryCacheService());
      } catch (error) {
        // Graceful degradation to in-memory cache
        winstonTelemetryLogger.warn("Redis unavailable, falling back to in-memory cache", {
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Default to in-memory cache
    return new InMemoryCacheService();
  }
}

// Unified cache interface supporting multiple implementations
interface IKongCacheService {
  get(key: string): Promise<ConsumerSecret | null>;
  set(key: string, value: ConsumerSecret): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  getStats(): Promise<KongCacheStats>;
  getStale?(key: string): Promise<ConsumerSecret | null>; // For HA mode
}
```

**Cache Backend Features:**

1. **In-Memory Cache** (Default)
   - Zero external dependencies
   - Microsecond access times
   - TTL-based expiration
   - Memory-efficient with LRU eviction
   - Stale data tolerance for circuit breaker fallback

2. **Redis Cache** (High-Availability Mode)
   - Persistent storage across service restarts
   - Shared cache between multiple service instances
   - Extended stale data tolerance (2 hours)
   - Automatic failover to in-memory when Redis unavailable
   - Connection pooling and retry logic

3. **Fallback Cache Service**
   - Automatic failover between cache backends
   - Intelligent retry with exponential backoff
   - Consistent interface regardless of backend failures
   - Performance metrics for each cache tier

**Cache Configuration:**
```typescript
interface CachingConfig {
  ttlSeconds: number;              // Default TTL (300 seconds)
  staleToleranceMinutes: number;   // Stale data tolerance (60 minutes)
  redis: {
    enabled: boolean;              // Enable Redis backend
    url: string;                   // Redis connection URL
    maxRetries: number;            // Connection retry attempts
    retryDelayMs: number;          // Retry delay
    commandTimeoutMs: number;      // Command timeout
  };
}
```

### Error Handling

#### HTTP Status Codes
| Status Code | Scenario | Response Body |
|------------|----------|---------------|
| 200 OK | Successful token generation | JWT token + expiry |
| 401 Unauthorized | Missing consumer ID or anonymous consumer | Empty |
| 404 Not Found | Consumer secret creation failed | Empty |
| 500 Internal Server Error | Unexpected errors | Error details |
| 503 Service Unavailable | Kong Admin API unreachable | Error details |

#### Error Scenarios and Handling
```typescript
// Scenario 1: Missing Kong headers
if (!request.headers.get("x-consumer-id")) {
  return new Response("Unauthorized", { status: 401 });
}

// Scenario 2: Anonymous consumer
if (request.headers.get("x-anonymous-consumer") === "true") {
  return new Response("Unauthorized", { status: 401 });
}

// Scenario 3: Kong API failure
try {
  const secret = await kongService.getOrCreateConsumerSecret(consumerId);
} catch (error) {
  logger.error("Kong API error", { error, consumerId });
  return new Response("Service Unavailable", { status: 503 });
}

// Scenario 4: JWT generation failure
try {
  const token = await jwtService.generateToken(username, secret.key, secret.secret);
} catch (error) {
  logger.error("JWT generation error", { error });
  return new Response("Internal Server Error", { status: 500 });
}
```

---

## Configuration Guide

### 4-Pillar Configuration Architecture

The authentication service implements a robust 4-pillar configuration pattern with comprehensive security validation and circuit breaker integration:

#### Configuration Structure
1. **Pillar 1**: Default Configuration Object - All baseline values with secure defaults
2. **Pillar 2**: Environment Variable Mapping - Explicit mapping with type safety
3. **Pillar 3**: Manual Configuration Loading - Controlled loading with proper fallbacks
4. **Pillar 4**: Validation at End - Comprehensive Zod v4 schema validation with top-level format functions

#### Enhanced Security Features
- **HTTPS Enforcement**: All telemetry endpoints must use HTTPS in production
- **Token Security Validation**: Minimum 32-character requirement for Kong admin tokens
- **Environment Validation**: Prevents localhost URLs and weak configurations in production
- **Configuration Immutability**: Runtime configuration changes are prevented
- **Circuit Breaker Configuration**: Resilience patterns with failure threshold management
- **4-Pillar Compliance**: Full compliance with enterprise configuration standards

### Required Environment Variables

#### Kong Integration
| Variable | Description | Example | Security Notes | Required |
|----------|-------------|---------|----------------|----------|
| `KONG_MODE` | Kong deployment mode | `API_GATEWAY` or `KONNECT` | Validated enum values | Yes |
| `KONG_ADMIN_URL` | Kong Admin API endpoint | `http://kong-admin:8001` or `https://us.api.konghq.com/v2/control-planes/abc123` | HTTPS required in production | Yes |
| `KONG_ADMIN_TOKEN` | Kong Admin API authentication token | `Bearer xyz789...` | Minimum 32 characters in production | Yes |
| `KONG_JWT_AUTHORITY` | JWT token issuer | `https://sts-api.example.com/` | HTTPS required in production | Yes |
| `KONG_JWT_AUDIENCE` | JWT token audience | `http://api.example.com/` | Domain validation enforced | Yes |
| `KONG_JWT_KEY_CLAIM_NAME` | Claim name for consumer key | `key` or `iss` | Validated against allowed values | No (default: `key`) |
| `KONG_JWT_ISSUER` | JWT issuer (optional) | `https://sts-api.example.com/` | Falls back to authority if not set, supports comma-separated values | No |
| `JWT_EXPIRATION_MINUTES` | Token expiration in minutes | `15` | Range: 1-60 minutes | No (default: `15`) |

#### Application Settings
| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `PORT` | Server port | `3000` | No (default: `3000`) |
| `NODE_ENV` | Runtime environment | `development`, `production`, `test` | No (default: `development`) |

#### OpenTelemetry Configuration
| Variable | Description | Example | Security Notes | Required |
|----------|-------------|---------|----------------|----------|
| `TELEMETRY_MODE` | Telemetry mode | `console`, `otlp`, `both` | Controls telemetry enablement | No (default: `console`) |
| `OTEL_SERVICE_NAME` | Service name for telemetry | `authentication-service` | No localhost/test in production | No |
| `OTEL_SERVICE_VERSION` | Service version | `1.0.0` | No dev/latest in production | No |
| `NODE_ENV` | Deployment environment | `production` | Maps to telemetry environment | No |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Base OTLP endpoint | `https://otel.example.com` | HTTPS required in production | No |
| `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` | OTLP traces endpoint | `https://otel.example.com/v1/traces` | HTTPS required in production | No |
| `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` | OTLP metrics endpoint | `https://otel.example.com/v1/metrics` | HTTPS required in production | No |
| `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT` | OTLP logs endpoint | `https://otel.example.com/v1/logs` | HTTPS required in production | No |
| `OTEL_EXPORTER_OTLP_TIMEOUT` | Export timeout in ms | `30000` | Range: 1000-60000ms | No |
| `OTEL_BSP_MAX_EXPORT_BATCH_SIZE` | Batch size for exports | `2048` | Range: 1-5000 | No |
| `OTEL_BSP_MAX_QUEUE_SIZE` | Maximum queue size | `10000` | Range: 1-50000 | No |

#### Circuit Breaker Configuration
| Variable | Description | Example | Security Notes | Required |
|----------|-------------|---------|----------------|----------|
| ~~`CIRCUIT_BREAKER_ENABLED`~~ | ~~Enable circuit breaker protection~~ | ~~`true`~~ | **Always enabled (KISS principle)** | ~~No~~ |
| `CIRCUIT_BREAKER_TIMEOUT` | Request timeout in milliseconds | `500` | Range: 100-10000ms | No (default: `500`) |
| `CIRCUIT_BREAKER_ERROR_THRESHOLD` | Error threshold percentage | `50` | Range: 1-100% | No (default: `50`) |
| `CIRCUIT_BREAKER_RESET_TIMEOUT` | Circuit reset timeout in milliseconds | `30000` | Range: 1000-300000ms | No (default: `30000`) |
| `STALE_DATA_TOLERANCE_MINUTES` | Stale cache tolerance in minutes | `60` | Range: 1-120 minutes | No (default: `60`) |
| `HIGH_AVAILABILITY` | Enable Redis stale cache integration | `true` | HA mode for extended resilience | No (default: `false`) |

#### Redis Cache Configuration (High-Availability Mode)
| Variable | Description | Example | Security Notes | Required |
|----------|-------------|---------|----------------|----------|
| `REDIS_ENABLED` | Enable Redis cache backend | `true` | Enables Redis for HA mode | No (default: `false`) |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` or `rediss://redis.example.com:6380` | REDISS (TLS) required in production | No |
| `REDIS_PASSWORD` | Redis authentication password | `secure-password-123` | Strong password required | No |
| `REDIS_DB` | Redis database number | `0` | Range: 0-15 | No (default: `0`) |
| `REDIS_MAX_RETRIES` | Connection retry attempts | `3` | Range: 1-10 | No (default: `3`) |
| `REDIS_RETRY_DELAY_MS` | Retry delay in milliseconds | `100` | Range: 50-5000ms | No (default: `100`) |
| `REDIS_COMMAND_TIMEOUT_MS` | Command timeout in milliseconds | `5000` | Range: 1000-30000ms | No (default: `5000`) |
| `REDIS_CONNECT_TIMEOUT_MS` | Connection timeout in milliseconds | `10000` | Range: 1000-30000ms | No (default: `10000`) |

#### API Documentation Configuration
| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `API_CORS` | CORS origin configuration | `*` or `https://example.com` | No (default: `*`) |
| `API_TITLE` | API title for OpenAPI spec | `Authentication Service API` | No |
| `API_DESCRIPTION` | API description | `High-performance authentication service with Kong integration` | No |
| `API_VERSION` | API version | `1.0.0` | No |
| `API_CONTACT_NAME` | Contact name | `Example Corp` | No |
| `API_CONTACT_EMAIL` | Contact email | `api-support@example.com` | No |
| `API_LICENSE_NAME` | License name | `Proprietary` | No |
| `API_LICENSE_IDENTIFIER` | License identifier | `UNLICENSED` | No |

### Configuration Architecture Implementation

#### Core Configuration Files
- **`src/config/schemas.ts`**: Zod v4.1.12 schema definitions with top-level format functions
- **`src/config/config.ts`**: 4-pillar configuration implementation with enhanced security validation
- **`src/config/index.ts`**: Re-export hub for clean module imports
- Circuit breaker thresholds and timeout configurations integrated throughout

#### Configuration Pattern Benefits
- **Type Safety**: Comprehensive Zod v4 validation with TypeScript integration
- **Security Validation**: Production-ready checks for HTTPS, token length, environment restrictions
- **Immutability**: Configuration locked at startup to prevent runtime mutations
- **Environment Flexibility**: Support for multiple deployment environments
- **Error Clarity**: Detailed validation messages for configuration issues
- **Resilience Integration**: Circuit breaker and timeout configuration management
- **4-Pillar Architecture**: Enterprise-grade configuration management pattern

#### Security Validation Features
```typescript
// Production environment validation
if (environment === "production") {
  // HTTPS endpoint validation
  if (endpoint && !endpoint.startsWith("https://")) {
    throw new Error("Production requires HTTPS endpoints");
  }

  // Service name validation
  if (serviceName.includes("localhost") || serviceName.includes("test")) {
    throw new Error("Production service name cannot contain localhost or test references");
  }

  // Version validation
  if (serviceVersion === "dev" || serviceVersion === "latest") {
    throw new Error("Production requires specific version, not dev or latest");
  }
}
```

### Package Dependencies

#### Core Dependencies (package.json)

**Runtime Dependencies:**
```json
{
  "dependencies": {
    // OpenTelemetry Observability Stack
    "@elastic/ecs-winston-format": "^1.5.3",
    "@opentelemetry/api": "^1.9.0",
    "@opentelemetry/api-logs": "^0.206.0",
    "@opentelemetry/auto-instrumentations-node": "^0.65.0",
    "@opentelemetry/core": "^2.1.0",
    "@opentelemetry/exporter-logs-otlp-http": "^0.206.0",
    "@opentelemetry/exporter-metrics-otlp-http": "^0.206.0",
    "@opentelemetry/exporter-otlp-http": "^0.26.0",
    "@opentelemetry/exporter-trace-otlp-http": "^0.206.0",
    "@opentelemetry/host-metrics": "^0.36.2",
    "@opentelemetry/instrumentation-fetch": "^0.206.0",
    "@opentelemetry/instrumentation-http": "^0.206.0",
    "@opentelemetry/instrumentation-redis": "^0.55.0",
    "@opentelemetry/instrumentation-winston": "^0.51.0",
    "@opentelemetry/resources": "^2.1.0",
    "@opentelemetry/sdk-logs": "^0.206.0",
    "@opentelemetry/sdk-metrics": "^2.1.0",
    "@opentelemetry/sdk-node": "^0.206.0",
    "@opentelemetry/sdk-trace-base": "^2.1.0",
    "@opentelemetry/semantic-conventions": "^1.37.0",
    "@opentelemetry/winston-transport": "^0.17.0",

    // Resilience and Caching
    "opossum": "^9.0.0",                    // Circuit breaker for Kong API protection
    "redis": "^5.8.3",                     // Redis cache backend for HA mode

    // Logging and Configuration
    "winston": "^3.18.3",                  // Structured logging with ECS format
    "winston-transport": "^4.9.0",         // Winston transport abstractions
    "zod": "^4.1.12"                       // Schema validation with v4 features
  },
  "devDependencies": {
    "@biomejs/biome": "^2.2.5",            // Code quality (linting + formatting)
    "@playwright/test": "^1.56.0",         // E2E testing framework
    "@types/bun": "1.2.23",                // Bun runtime types
    "@types/k6": "^1.3.1",                 // K6 performance testing types
    "@types/opossum": "^8.1.9",            // Circuit breaker types
    "@types/redis": "^4.0.11",             // Redis client types
    "typescript": "^5.9.3"                 // TypeScript compiler
  },
  "engines": {
    "bun": ">=1.1.35"                      // Minimum Bun version requirement
  }
}
```

**Key Dependency Categories:**

1. **OpenTelemetry Stack** - Comprehensive observability with OTLP protocol support
   - Metrics, traces, and logs instrumentation
   - Redis instrumentation for cache monitoring
   - Host metrics for system-level telemetry

2. **Resilience & Caching** - High-availability architecture components
   - `opossum`: Circuit breaker protection for Kong Admin API
   - `redis`: Cache backend with automatic failover support

3. **Configuration & Validation** - Enterprise-grade configuration management
   - `zod` v4.1.12: Advanced schema validation with format functions
   - Environment variable mapping with type safety

4. **Development Tools** - Optimized development workflow
   - `@biomejs/biome`: Code quality with .biomeignore performance optimization
   - `@playwright/test`: Cross-browser E2E testing
   - `@types/*`: TypeScript support for all runtime dependencies

### CORS Configuration

CORS support is built into the server with configurable origins:

```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": config.apiInfo.cors,  // Configurable via API_CORS
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Consumer-ID, X-Consumer-Username, X-Anonymous-Consumer",
  "Access-Control-Max-Age": "86400"
};
```

CORS Configuration:
- **Default**: `*` (wildcard - allows all origins)
- **Configurable**: Set `API_CORS` environment variable to specific origins
- **Security**: Use specific origins in production (e.g., `https://app.example.com`)

CORS is required when:
- Web browsers directly call the authentication service
- Frontend applications need cross-origin access
- Testing from local development environments
- SPA applications making direct API calls

---

## API Reference

### Endpoints

#### GET /
Returns the OpenAPI specification for the service.

**Request**
```http
GET / HTTP/1.1
Host: auth-service.example.com
Accept: application/json
```

**Response - JSON (200 OK)**
```json
{
  "openapi": "3.0.0",
  "info": {
    "title": "Authentication Service API",
    "version": "1.0.0",
    "description": "JWT token generation service for Kong consumers"
  },
  "servers": [...],
  "paths": {...}
}
```

**Response - YAML (200 OK)**
```yaml
openapi: 3.0.0
info:
  title: Authentication Service API
  version: 1.0.0
  description: JWT token generation service for Kong consumers
```

#### GET /tokens
Issues a new JWT token for authenticated consumers.

**Request**
```http
GET /tokens HTTP/1.1
Host: auth-service.example.com
X-Consumer-ID: 98765432-9876-5432-1098-765432109876
X-Consumer-Username: example-consumer
X-Anonymous-Consumer: false
```

**Required Headers**
| Header | Type | Description |
|--------|------|-------------|
| `X-Consumer-ID` | UUID | Kong consumer identifier |
| `X-Consumer-Username` | String | Kong consumer username |
| `X-Anonymous-Consumer` | Boolean | Must be "false" or absent |

**Response - Success (200 OK)**
```json
{
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJwdmgtY29uc3VtZXIiLCJrZXkiOiJhYmMxMjNkZWY0NTYiLCJqdGkiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJpYXQiOjE2MzQ1Njc4OTAsIm5hbWUiOiJwdmgtY29uc3VtZXIiLCJ1bmlxdWVfbmFtZSI6InB2aGNvcnAuY29tI3B2aC1jb25zdW1lciIsImV4cCI6MTYzNDU2ODc5MCwiaXNzIjoiaHR0cHM6Ly9zdHMtYXBpLnB2aGNvcnAuY29tLyIsImF1ZCI6Imh0dHA6Ly9hcGkucHZoY29ycC5jb20vIn0.x8f3k9dmvR2K1nP5mX7Q9Z3yL4wB6",
    "expires_in": 900
}
```

**Response Fields**
| Field | Type | Description |
|-------|------|-------------|
| `access_token` | String | JWT token string |
| `expires_in` | Integer | Token lifetime in seconds |

**Response - Unauthorized (401)**
- Missing `X-Consumer-ID` header
- `X-Anonymous-Consumer` is "true"
- No response body

**Response - Service Unavailable (503)**
- Kong Admin API unreachable
- Consumer secret creation failed

#### GET /health
Main health check endpoint with dependency status.

**Request**
```http
GET /health HTTP/1.1
Host: auth-service.example.com
```

**Response - Healthy (200 OK)**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T12:00:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "environment": "production",
  "dependencies": {
    "kong": {
      "status": "healthy",
      "mode": "KONNECT",
      "url": "https://us.api.konghq.com/v2/control-planes/abc123"
    },
    "telemetry": {
      "status": "healthy",
      "mode": "otlp",
      "endpoints": {
        "traces": "https://otel.example.com/v1/traces",
        "metrics": "https://otel.example.com/v1/metrics",
        "logs": "https://otel.example.com/v1/logs"
      }
    }
  }
}
```

**Response - Unhealthy (503)**
```json
{
  "status": "unhealthy",
  "timestamp": "2025-01-15T12:00:00.000Z",
  "dependencies": {
    "kong": {
      "status": "unhealthy",
      "error": "Connection timeout"
    }
  }
}
```

#### GET /health/telemetry
Telemetry system health check.

**Request**
```http
GET /health/telemetry HTTP/1.1
Host: auth-service.example.com
```

**Response - Success (200 OK)**
```json
{
  "status": "healthy",
  "mode": "otlp",
  "endpoints": {
    "traces": "https://otel.example.com/v1/traces",
    "metrics": "https://otel.example.com/v1/metrics",
    "logs": "https://otel.example.com/v1/logs"
  },
  "exporters": {
    "traces": "active",
    "metrics": "active",
    "logs": "active"
  }
}
```

#### GET /health/metrics
Metrics system health and debugging information.

**Request**
```http
GET /health/metrics HTTP/1.1
Host: auth-service.example.com
```

**Response - Success (200 OK)**
```json
{
  "status": "healthy",
  "metricsEnabled": true,
  "exportInterval": 10000,
  "lastExport": "2025-01-15T12:00:00.000Z",
  "counters": {
    "http_requests_total": 1000,
    "jwt_tokens_generated": 500,
    "kong_operations": 600,
    "cache_hits": 450,
    "cache_misses": 150
  }
}
```

#### GET /metrics
Performance metrics and cache statistics.

**Request**
```http
GET /metrics HTTP/1.1
Host: auth-service.example.com
```

**Response - Success (200 OK)**
```json
{
  "uptime": 3600,
  "requests": {
    "total": 10000,
    "success": 9950,
    "errors": 50,
    "rate": 2.78
  },
  "tokens": {
    "generated": 5000,
    "failed": 10,
    "averageTime": 8.5
  },
  "cache": {
    "hits": 4500,
    "misses": 500,
    "hitRate": 0.9,
    "size": 100,
    "ttl": 300000
  },
  "memory": {
    "rss": 67108864,
    "heapTotal": 16777216,
    "heapUsed": 8388608,
    "external": 1048576,
    "arrayBuffers": 524288
  }
}
```

#### POST /debug/metrics/test
Record test metrics for verification (development only).

**Request**
```http
POST /debug/metrics/test HTTP/1.1
Host: auth-service.example.com
Content-Type: application/json

{
  "count": 10,
  "type": "test"
}
```

**Response - Success (200 OK)**
```json
{
  "success": true,
  "metrics": {
    "counters": ["test_counter"],
    "histograms": ["test_histogram"],
    "values": {
      "counter": 10,
      "histogram": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    }
  }
}
```

#### POST /debug/metrics/export
Force immediate metrics export to OTLP endpoint (development only).

**Request**
```http
POST /debug/metrics/export HTTP/1.1
Host: auth-service.example.com
```

**Response - Success (200 OK)**
```json
{
  "success": true,
  "exported": {
    "metrics": 50,
    "timestamp": "2025-01-15T12:00:00.000Z"
  }
}
```

#### GET /debug/metrics/stats
Export statistics and success rates (development only).

**Request**
```http
GET /debug/metrics/stats HTTP/1.1
Host: auth-service.example.com
```

**Response - Success (200 OK)**
```json
{
  "exports": {
    "total": 360,
    "successful": 358,
    "failed": 2,
    "successRate": 0.9944
  },
  "lastExport": {
    "timestamp": "2025-01-15T12:00:00.000Z",
    "metrics": 50,
    "duration": 125
  },
  "errors": [
    {
      "timestamp": "2025-01-15T11:45:00.000Z",
      "error": "Export timeout"
    }
  ]
}
```

---

## Observability & Monitoring

### OpenTelemetry Integration

The service implements cost-optimized observability using vendor-neutral OpenTelemetry standards, compatible with Elastic APM, Datadog, New Relic, and other OTLP-compliant platforms. Recent improvements include consolidated metrics endpoints and reduced telemetry overhead.

### Telemetry Features

#### Distributed Tracing
- HTTP request tracing with automatic span correlation
- Request ID generation for end-to-end tracing
- Kong API call instrumentation
- JWT generation timing

#### Consolidated Metrics Collection
- **Runtime Metrics**: Event loop delay, memory usage, CPU utilization
- **System Metrics**: Host-level CPU, memory, disk, network via HostMetrics
- **HTTP Metrics**: Request counts, response times, error rates
- **Business Metrics**: JWT tokens generated, Kong operations, hybrid cache performance
- **Custom Metrics**: Extensible metric collection for business KPIs
- **Unified Endpoints**: Consolidated metrics collection with reduced overhead
- **Cost Optimization**: Intelligent sampling and batch processing for reduced costs

#### Structured Logging
- ECS-formatted logs for Elastic Stack compatibility
- Winston transport with OpenTelemetry correlation
- Request context propagation
- Error tracking with stack traces

### Consolidated Metrics

| Metric Name | Type | Description |
|------------|------|-------------|
| `nodejs.eventloop.delay` | Gauge | Event loop utilization percentage |
| `process.memory.usage` | Gauge | Memory usage by type |
| `process.cpu.usage` | Gauge | CPU utilization percentage |
| `nodejs.active_handles` | Gauge | Active handle count |
| `nodejs.active_requests` | Gauge | Active request count |
| `system.cpu.utilization` | Gauge | System CPU usage by core |
| `system.memory.usage` | Gauge | System memory metrics |
| `http_requests_total` | Counter | HTTP requests by method/status |
| `http_response_time_seconds` | Histogram | Response time distribution |
| `jwt_tokens_generated` | Counter | JWT generation count |
| `kong_operations` | Counter | Kong API operations with circuit breaker status |
| `hybrid_cache_operations` | Counter | Memory and Redis cache statistics |
| `circuit_breaker_state` | Gauge | Circuit breaker state (0=closed, 1=open, 2=half-open) |
| `circuit_breaker_requests_total` | Counter | Circuit breaker requests by operation and result |
| `circuit_breaker_rejected_total` | Counter | Circuit breaker rejections by operation |
| `circuit_breaker_fallback_total` | Counter | Circuit breaker fallback usage by operation |
| `circuit_breaker_state_transitions_total` | Counter | Circuit breaker state transitions |
| `cache_tier_operations` | Counter | Cache tier usage (redis-stale, in-memory) |
| `cache_tier_latency` | Histogram | Cache tier access latency by operation |
| `unified_metrics_collection` | Counter | Consolidated metrics endpoint usage |

### Telemetry Modes

Configure via `TELEMETRY_MODE` environment variable:

| Mode | Description | Use Case |
|------|-------------|----------|
| `console` | Logs only to console | Development |
| `otlp` | Exports only to OTLP endpoints | Production |
| `both` | Console logs + OTLP export | Debugging |

### Debugging Telemetry

```bash
# Test metrics collection
curl -X POST http://localhost:3000/debug/metrics/test

# Force immediate export
curl -X POST http://localhost:3000/debug/metrics/export

# View export statistics
curl http://localhost:3000/debug/metrics/stats

# Check telemetry health
curl http://localhost:3000/health/telemetry

# Monitor metrics
curl http://localhost:3000/metrics
```

### Monitoring Best Practices

#### Recommended Alerts
- Event loop delay >100ms sustained for 5 minutes
- Memory usage >80% of container limit
- HTTP error rate >5%
- Kong API failures >1%
- Cache miss rate >50%
- OTLP export failures >10%
- JWT generation p99 latency >50ms
- Circuit breaker state transitions to "open"
- Circuit breaker rejection rate >10%
- Stale data fallback usage >5%

#### Dashboard Metrics
- Request throughput (req/sec)
- Response time percentiles (p50, p95, p99)
- Error rate by status code
- Token generation rate
- Cache hit ratio
- Memory and CPU utilization
- Active connections
- Circuit breaker state and transitions
- Circuit breaker rejection and fallback rates
- Kong API operation success/failure rates

---

## Deployment & Operations

### Docker Build Process

#### Dockerfile
```dockerfile
FROM oven/bun:1.2.23-alpine AS deps-base
WORKDIR /app
RUN apk add --no-cache dumb-init ca-certificates && \
    apk upgrade curl openssl

FROM deps-base AS deps-prod
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile --production

FROM oven/bun:1.2.23-alpine AS production
RUN apk add --no-cache dumb-init curl && \
    apk upgrade curl openssl && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 bunuser && \
    mkdir -p /app && \
    chown bunuser:nodejs /app

WORKDIR /app
COPY --from=deps-prod --chown=bunuser:nodejs /app/node_modules ./node_modules
COPY --from=deps-prod --chown=bunuser:nodejs /app/package.json ./
COPY --chown=bunuser:nodejs /app/src ./src

USER bunuser
ENV NODE_ENV=production PORT=3000 HOST=0.0.0.0 TELEMETRY_MODE=console
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1
ENTRYPOINT ["dumb-init", "--"]
CMD ["bun", "src/server.ts"]
```

### CI/CD Pipeline

The service includes enterprise-grade CI/CD automation with comprehensive security and quality checks, enhanced with Docker Cloud Builders for improved build performance.

#### Pipeline Features
- **Parallel Job Execution**: 6-job parallel architecture for optimized pipeline performance
- **Automated Testing**: 260 tests (100% pass rate) executed in CI with live server validation
- **Docker Cloud Builders**: Enhanced build infrastructure with dedicated cloud resources
- **Multi-platform Builds**: Linux AMD64 and ARM64 with optimized cloud-native compilation
- **Security Scanning Suite**:
  - **Snyk**: Dependency and container vulnerability scanning with SARIF reports
  - **Trivy**: Filesystem and container security analysis with CVE detection
  - **Docker Scout**: Supply chain and base image vulnerability assessment
- **Code Quality Enforcement**: Biome linting, formatting, and TypeScript type checking with optimized file discovery
- **Supply Chain Security**:
  - SBOM (Software Bill of Materials) generation for transparency
  - Build provenance attestations for integrity verification
  - License compliance validation with automated allowlist checking
- **Performance Validation**: K6 performance tests with configurable thresholds
- **Environment Deployment**: Automated deployment to staging and production environments
- **Build Performance**: Enhanced CI/CD performance with Docker Cloud Builders endpoint `zx8086/cldbuild`

#### Security Scanning Results
All builds include comprehensive security reports:
- Vulnerability assessments uploaded as SARIF to GitHub Security tab
- Dependency license compliance with allowlist validation
- Container image integrity verification with signed attestations
- Supply chain transparency through generated SBOM artifacts

#### Docker Cloud Builders Integration
The CI/CD pipeline leverages Docker Cloud Builders for enhanced performance:

**Configuration**:
```yaml
- name: Set up Docker Buildx
  uses: docker/setup-buildx-action@v3
  with:
    driver: cloud
    endpoint: "zx8086/cldbuild"
```

**Benefits**:
- **Enhanced Build Infrastructure**: Dedicated cloud resources for Docker builds
- **Improved ARM64 Performance**: Better cross-platform build support
- **Resource Efficiency**: Reduced GitHub Actions minutes usage
- **Enhanced Caching**: Cloud-native caching for improved build times
- **Scalability**: Better handling of multi-platform builds

**Implementation Approach**:
- **KISS Principle Applied**: Minimal 3-line addition to existing workflow
- **Preserved Features**: All existing security scanning, multi-platform builds, and supply chain security maintained
- **Authentication**: Seamless integration with existing Docker Hub credentials
- **Backwards Compatibility**: Easy rollback available if needed

#### Parallel Job Architecture

The CI/CD pipeline uses a 6-job parallel architecture for optimized performance and resource utilization:

**Job Architecture:**
```yaml
jobs:
  setup:                    # Dependency setup and artifact preparation
  unit-tests:              # Bun test framework with service orchestration
  e2e-tests:              # Playwright cross-browser testing
  code-quality:           # Biome linting and TypeScript checking
  build-and-deploy:       # Docker multi-platform builds with Cloud Builders
  supply-chain-verification: # Security scanning and compliance validation
```

**Parallel Execution Features:**
- **Artifact Sharing**: Efficient dependency and build artifact distribution
- **Service Orchestration**: Automated service startup for unit and E2E tests
- **Command Resolution**: Native Bun command execution (`bunx` vs `bun run`)
- **Environment Isolation**: Each job runs in isolated environment with required dependencies
- **Failure Isolation**: Job failures are contained without affecting parallel jobs

**Performance Optimizations:**
- **Concurrent Test Execution**: `--concurrent --max-concurrency=10` for unit tests
- **Dependency Caching**: Shared `node_modules` and `bun.lockb` across jobs
- **Service Health Checks**: Automated service readiness validation
- **Resource Efficiency**: Optimized resource allocation across parallel jobs

**Configuration Requirements:**
- All jobs require access to shared dependency artifacts
- Service-dependent tests include automatic server startup and health validation
- Environment variables properly configured for each job's requirements
- Proper cleanup and shutdown handling for service orchestration

### Build Commands

#### Local Development
```bash
# Install dependencies
bun install

# Start development server with hot reload
bun run dev

# Start with specific environments
bun run dev:development    # Development environment
bun run dev:staging        # Staging environment
bun run dev:production     # Production environment

# Clean development restart
bun run dev:clean          # Kill existing processes and start fresh
bun run kill-server        # Kill processes on port 3000

# Run with specific telemetry mode
TELEMETRY_MODE=both bun run dev

# Run tests
bun run bun:test           # Run all Bun tests
bun run bun:test:watch     # Watch mode for TDD
bun run bun:test:coverage  # Test with coverage
bun run test:clean         # Clean test result directories

# Code quality checks
bun run typecheck          # TypeScript type checking
bun run biome:check        # Biome linting and formatting (optimized with .biomeignore)
bun run biome:check:write  # Fix linting/formatting issues
bun run biome:check:unsafe # Fix with unsafe transformations

# Generate OpenAPI documentation
bun run generate-docs        # Generate docs before server start
bun run generate-docs:json   # Generate JSON format
bun run generate-docs:yaml   # Generate YAML format
bun run generate-docs:verbose # Verbose output

# E2E and Performance Tests
bun run playwright:test    # Run Playwright E2E tests
bun run playwright:ui      # Interactive Playwright UI
bun run k6:info           # Display all available K6 tests

# Health and debugging
bun run health-check       # Quick health check via curl
```

#### Redis Cache Setup (High-Availability Mode)

The service includes comprehensive Redis integration for high-availability caching with automatic failover support.

```bash
# Redis Container Management
bun run redis:setup         # Complete Redis setup (stop, remove, start)
bun run redis:start         # Start Redis container with optimized configuration
bun run redis:stop          # Stop Redis container
bun run redis:remove        # Remove Redis container
bun run redis:restart       # Restart Redis (stop, remove, start)

# Redis Monitoring and Status
bun run redis:status        # Check Redis container status
bun run redis:logs          # View Redis container logs (follow mode)
bun run redis:stats         # Real-time Redis statistics
bun run redis:cli           # Access Redis CLI for debugging

# Cache Analysis and Debugging
bun run redis:bigkeys       # Analyze Redis memory usage by key size
bun run redis:memkeys       # Memory usage analysis by keys
bun run redis:scan          # Scan first 10 keys in Redis
bun run redis:scan:auth     # Scan authentication service keys only
```

**Redis Configuration:**
- **Version**: Redis 7 Alpine (optimized for containers)
- **Port**: 6379 (localhost)
- **Persistence**: AOF (Append Only File) enabled for durability
- **Memory**: 128MB limit with LRU eviction policy
- **Restart Policy**: Always restart unless stopped manually

**High-Availability Cache Integration:**
```bash
# Enable Redis cache in .env
REDIS_ENABLED=true
REDIS_URL=redis://localhost:6379
HIGH_AVAILABILITY=true

# Start Redis and authentication service with HA caching
bun run redis:setup
REDIS_ENABLED=true HIGH_AVAILABILITY=true bun run dev

# Monitor cache performance
curl http://localhost:3000/metrics | grep cache
```

**Redis Service Features:**
- **Automatic Failover**: Falls back to in-memory cache if Redis unavailable
- **Stale Data Tolerance**: 2-hour cache tolerance during Redis outages
- **Connection Pooling**: Optimized Redis connections with retry logic
- **OpenTelemetry Integration**: Redis instrumentation and cache tier metrics
- **Security**: Optional password authentication and TLS support

#### Code Quality Optimization

The service includes performance-optimized code quality tooling:

**Biome Performance Optimization (.biomeignore)**
- **Target Performance**: ~30% improvement in file discovery and analysis
- **Excluded Patterns**: Dependencies, build artifacts, temporary files, IDE files
- **Benefits**: Faster CI/CD pipelines, improved developer experience, reduced memory usage

**Performance Improvement:**
```bash
# Before optimization: 38 files in 21-51ms
# After optimization: 38 files in 15-35ms (~30% improvement)
bun run biome:check  # Optimized file discovery
```

**Key Exclusions:**
- `node_modules/`, `dist/`, `build/`, `coverage/` (build artifacts)
- `.env.*` files (except examples: `!.env.example`, `!.env.*.example`)
- Cache directories: `.cache/`, `.npm/`, `.yarn/`
- IDE files: `.vscode/`, `.idea/`, `*.swp`
- OS files: `.DS_Store`, `Thumbs.db`
- Logs and temporary files: `*.log`, `tmp/`, `temp/`

#### Docker Operations
```bash
# Build Docker image
bun run docker:build
# OR manually:
docker build -t authentication-service:latest .

# Run container
docker run -p 3000:3000 \
  -e KONG_MODE=KONNECT \
  -e KONG_ADMIN_URL=https://us.api.konghq.com/v2/control-planes/abc123 \
  -e KONG_ADMIN_TOKEN=secret123 \
  -e KONG_JWT_AUTHORITY=https://sts-api.example.com/ \
  -e KONG_JWT_AUDIENCE=http://api.example.com/ \
  -e TELEMETRY_MODE=otlp \
  -e OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=https://otel.example.com/v1/traces \
  authentication-service:latest

# Health check
bun run health-check
# OR manually:
docker exec <container> curl -f http://localhost:3000/health

# Kill server processes if needed
bun run kill-server  # Kill processes on port 3000
bun run dev:clean    # Kill server and start fresh
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: authentication-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: authentication-service
  template:
    metadata:
      labels:
        app: authentication-service
    spec:
      containers:
      - name: authentication-service
        image: example/authentication-service:latest
        ports:
        - containerPort: 3000
        env:
        - name: KONG_MODE
          value: "KONNECT"
        - name: KONG_ADMIN_URL
          valueFrom:
            secretKeyRef:
              name: kong-secrets
              key: admin-url
        - name: KONG_ADMIN_TOKEN
          valueFrom:
            secretKeyRef:
              name: kong-secrets
              key: admin-token
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            memory: "64Mi"
            cpu: "100m"
          limits:
            memory: "128Mi"
            cpu: "500m"
```

### Health Monitoring

#### Health Check Endpoints
```bash
# Main health check
curl http://auth-service.example.com/health

# Telemetry health
curl http://auth-service.example.com/health/telemetry

# Metrics health
curl http://auth-service.example.com/health/metrics

# Performance metrics
curl http://auth-service.example.com/metrics
```

### Performance Tuning

#### Environment Variables for Performance
```bash
# Connection pooling
KONG_CONNECTION_POOL_SIZE=10
KONG_CONNECTION_TIMEOUT=5000

# Cache settings
CACHE_TTL_SECONDS=300
CACHE_MAX_SIZE=1000

# Rate limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=1000

# Circuit breaker settings (always enabled by default)
CIRCUIT_BREAKER_TIMEOUT=500
CIRCUIT_BREAKER_ERROR_THRESHOLD=50
CIRCUIT_BREAKER_RESET_TIMEOUT=30000
STALE_DATA_TOLERANCE_MINUTES=60
```

#### Scaling Recommendations
- **Horizontal Scaling**: Service is stateless, scale horizontally as needed
- **Memory**: 64-128MB per instance (128-256MB with full telemetry)
- **CPU**: 0.1-0.5 CPU cores per instance
- **Replicas**: Minimum 2 for HA, 3-5 for production load
- **Container Resources**: Request 100m CPU, 64Mi memory; Limit 500m CPU, 128Mi memory
- **Autoscaling**: Target 70% CPU utilization for optimal performance

---

## CPU and Memory Profiling

The authentication service includes comprehensive CPU and memory profiling capabilities using Bun's native profiling infrastructure with Chrome DevTools integration for performance analysis and debugging.

### Profiling Implementation Overview

The service implements a **native Bun profiling solution** that leverages Bun's built-in `--inspect` functionality with Chrome DevTools integration, providing enterprise-grade performance analysis without external dependencies.

**Key Features:**
- **Native Bun Integration**: Uses Bun's native profiling capabilities with `--inspect` flags
- **Chrome DevTools Integration**: Interactive profiling through Chrome's Performance and Memory tabs
- **Current Process Profiling**: Profiles the running service process for real-world performance data
- **Zero External Dependencies**: No additional libraries required for core profiling functionality
- **Environment-Based Security**: Production disabled with comprehensive safety controls
- **API Control**: RESTful endpoints for programmatic profiling session management

### Architecture and Design

#### Security-First Design
- **Production Safety**: Profiling NEVER enabled in production environment
- **Environment Checks**: Only works in development, staging, and local environments
- **Safe Defaults**: Disabled by default, must be explicitly enabled via environment variables
- **Clean Shutdown**: Automatic cleanup on server shutdown and graceful session management

#### Implementation Approach
The service originally planned to use `@platformatic/flame` but encountered fundamental compatibility issues with Bun's TypeScript runtime. The implementation was successfully pivoted to use **Bun's native profiling capabilities**, providing superior integration with the existing runtime.

**What Changed:**
- **Before (Non-Working)**: `@platformatic/flame` external dependency with module resolution errors
- **After (Working Solution)**: Native Bun profiling using `--inspect` flags with Chrome DevTools integration

### Available Profiling Scripts

```bash
# Core profiling commands
bun run profile:start         # Start server with profiling enabled
bun run profile:status        # Check profiling status
bun run profile:start-session # Start profiling session
bun run profile:stop-session  # Stop profiling session
bun run profile:reports       # List available reports
bun run profile:clean         # Clean profiling artifacts
bun run profile:dev           # Development server with profiling
bun run profile:load-test     # Profile during K6 load testing
bun run profile:k6            # Quick K6 + profiling
bun run profile:help          # Display all profiling commands
```

### Available API Endpoints

All profiling endpoints are restricted to development and staging environments only:

```bash
POST /debug/profiling/start    # Start profiling session
POST /debug/profiling/stop     # Stop profiling session
GET  /debug/profiling/status   # Current profiling status
GET  /debug/profiling/reports  # List available reports
POST /debug/profiling/cleanup  # Clean profiling artifacts
```

### How to Use the Profiling System

#### 1. Basic Profiling Session

**Step 1: Start server with profiling enabled**
```bash
PROFILING_ENABLED=true NODE_ENV=development bun src/server.ts
```

**Step 2: Start a profiling session**
```bash
curl -X POST http://localhost:3000/debug/profiling/start
```

**Step 3: Generate load on your service**
```bash
# Make API calls to generate performance data
curl http://localhost:3000/health
curl http://localhost:3000/tokens -H "x-consumer-id: test-consumer" -H "x-consumer-username: test-user"
```

**Step 4: Stop profiling session**
```bash
curl -X POST http://localhost:3000/debug/profiling/stop
```

**Step 5: Check status and available reports**
```bash
curl http://localhost:3000/debug/profiling/status
curl http://localhost:3000/debug/profiling/reports
```

#### 2. Chrome DevTools Interactive Profiling

**Most Powerful Method for Interactive Analysis:**

```bash
# Start server with profiling
bun run profile:start

# Open Chrome and navigate to: chrome://inspect
# Click "Open dedicated DevTools for Node"
# Use the Performance and Memory tabs for interactive profiling
```

**Chrome DevTools Workflow:**
1. **Start profiling-enabled server**: `PROFILING_ENABLED=true bun src/server.ts`
2. **Open Chrome**: Navigate to `chrome://inspect`
3. **Connect to Node**: Click "Open dedicated DevTools for Node"
4. **Use Performance tab**: Record CPU profiles during load
5. **Use Memory tab**: Take heap snapshots and analyze memory usage
6. **Use API endpoints**: Start/stop sessions programmatically

#### 3. Automated Load Testing with Profiling

```bash
# Profile during K6 load testing
bun run profile:load-test

# Quick smoke test with profiling
bun run profile:k6
```

### Environment Configuration

Add to your `.env` file to enable profiling:

```bash
PROFILING_ENABLED=true                      # Enable profiling (dev/staging only)
PROFILING_OUTPUT_DIR=profiling             # Output directory for artifacts
PROFILING_AUTO_GENERATE=false             # Auto-generate reports
```

### Performance Impact and Characteristics

#### When Disabled (Default State)
- **Zero Performance Impact**: Profiling checks are performed only at startup
- **No Memory Overhead**: No profiling infrastructure loaded
- **Production Safe**: Multiple environment checks prevent accidental activation

#### When Enabled (Development/Staging)
- **Minimal Overhead**: Uses Bun's native `--inspect` with minimal performance impact
- **Current Process Profiling**: Profile data collected in the running service process
- **Automatic Cleanup**: Artifact management and cleanup procedures handle disk usage

### Integration Status

All profiling integrations are working and tested:

- ✅ **Server startup/shutdown integration**: Profiling service initializes with the main server
- ✅ **OpenTelemetry tracing**: All profiling endpoints include distributed tracing
- ✅ **Environment-based security controls**: Production environment completely blocked
- ✅ **Graceful error handling**: Comprehensive error handling and session management
- ✅ **TypeScript compilation**: Zero TypeScript errors with full type safety
- ✅ **Code quality validation**: All Biome checks passed with proper formatting

### Advanced Usage Scenarios

#### Development Workflow Integration
```bash
# Start development server with profiling enabled
PROFILING_ENABLED=true bun run dev

# In another terminal, perform profiling workflow
curl -X POST http://localhost:3000/debug/profiling/start
# ... run your development tests ...
curl -X POST http://localhost:3000/debug/profiling/stop
```

#### Performance Testing Integration
```bash
# Combined performance testing with profiling
bun run profile:load-test

# This will:
# 1. Start server with profiling enabled
# 2. Start a profiling session
# 3. Run K6 load tests
# 4. Stop profiling session
# 5. Generate performance reports
```

#### CI/CD Integration Potential
The profiling infrastructure is designed to support future CI/CD integration for performance regression detection:

- **Automated Performance Baselines**: Profile key operations during CI builds
- **Regression Detection**: Compare profiling results between releases
- **Performance Artifacts**: Store profiling reports as build artifacts

### Troubleshooting

#### Common Issues and Solutions

**Issue: Profiling endpoints return 404 or 401**
- **Cause**: Service not started with profiling enabled or wrong environment
- **Solution**: Ensure `PROFILING_ENABLED=true` and `NODE_ENV` is development/staging/local

**Issue: Chrome DevTools not connecting**
- **Cause**: Server not started with `--inspect` flags or firewall blocking
- **Solution**: Use `bun run profile:start` script which includes proper inspect flags

**Issue: No profiling artifacts generated**
- **Cause**: Profiling session not properly started or insufficient load
- **Solution**: Verify session status via `/debug/profiling/status` endpoint

#### Debug Commands
```bash
# Check profiling status
curl http://localhost:3000/debug/profiling/status

# List available reports
curl http://localhost:3000/debug/profiling/reports

# Clean up artifacts
curl -X POST http://localhost:3000/debug/profiling/cleanup

# Display help with all commands
bun run profile:help
```

### Future Enhancements

The core profiling infrastructure is complete and ready for advanced features:

- **Advanced OpenTelemetry Integration**: Export profiling metadata to APM systems
- **Automated Performance Regression Detection**: Compare profiles between deployments
- **Integration with Existing Metrics Dashboards**: Correlate profiling data with operational metrics
- **Profile Comparison and Analysis Automation**: Automated analysis of performance changes

### Important Notes

- **Chrome DevTools Method Recommended**: For most analysis tasks, Chrome DevTools provides the best interactive experience
- **API Endpoints for Automation**: Use REST endpoints for automated testing and CI/CD integration
- **Production Safety**: Multiple layers of environment checks ensure profiling never runs in production
- **Performance Focus**: Designed specifically for the high-performance requirements of the authentication service (100k+ req/sec capability)

This native Bun implementation provides superior integration with the existing runtime while maintaining all essential profiling capabilities needed for performance analysis and debugging of the authentication service.

---

## Security Considerations

### Token Security

#### Token Expiration Strategy
- **Default TTL**: 15 minutes (configurable via JWT_EXPIRATION_MINUTES)
- **Rationale**: Balances security with user experience
- **Clock Skew**: Uses `notBefore` claim to handle time synchronization
- **No Refresh Tokens**: Clients must re-authenticate for new tokens

#### Secret Management
- **Storage**: Secrets never stored in application code or configuration
- **Transmission**: Secrets retrieved over secure Kong Admin API
- **Rotation**: Support for secret rotation through Kong Admin API
- **Isolation**: Each consumer has unique secrets
- **Caching**: In-memory cache with configurable TTL

### Network Security

#### Transport Security
- **HTTPS Required**: Production deployments must use TLS
- **Certificate Validation**: Proper certificate chains for Kong Admin API
- **Header Validation**: Strict validation of Kong upstream headers
- **Request ID**: Unique ID for request tracing

#### CORS Security
- **Specific Origins**: Configure exact allowed origins, avoid wildcards
- **Credential Support**: CORS configuration allows credentials if needed
- **Method Restrictions**: Limited to GET, POST, OPTIONS
- **Header Restrictions**: Only necessary headers allowed

### Authentication Chain

#### Defense in Depth
1. **Kong Gateway**: First line of defense with authentication plugins
2. **Header Validation**: Service validates Kong-provided headers
3. **Anonymous Blocking**: Explicit rejection of anonymous consumers
4. **Secret Verification**: Consumer must have valid secret in Kong
5. **Token Validation**: JWT claims verification (exp, nbf, iat)

#### Security Headers
The service relies on Kong to provide security headers:
- Kong strips original authorization headers
- Kong adds authenticated consumer information
- Service trusts only Kong-provided headers
- Request ID added for tracing

### Operational Security

#### Monitoring & Alerting
- **Failed Authentication**: Monitor 401 responses for attack patterns
- **Secret Creation Failures**: Alert on 503 responses indicating issues
- **Token Generation Rate**: Monitor for unusual token generation patterns
- **OpenTelemetry Traces**: Track authentication flow for anomalies
- **Rate Limiting**: Built-in rate limiting for DoS protection

#### Secret Rotation Process
1. Create new secret in Kong Admin API
2. Update consumer with new secret
3. Existing tokens remain valid until expiration
4. Delete old secret after transition period

#### Incident Response
- **Compromised Secret**: Immediately delete in Kong Admin API
- **Suspicious Activity**: Review OpenTelemetry traces and logs
- **Service Unavailability**: Health checks trigger alerts
- **Token Abuse**: Kong rate limiting on consumer level
- **DoS Attack**: Built-in rate limiting and connection pooling

### Best Practices

#### Configuration Security
- Never commit secrets to version control
- Use environment variables for all sensitive configuration
- Implement least-privilege access for Kong Admin API token
- Regular audit of consumer secrets
- Use secrets management systems in production

#### Deployment Security
- Use minimal Docker base images (Alpine Linux)
- Regular security updates for base images
- Non-root user in container (UID 1001)
- Read-only root filesystem where possible
- Multi-layer security scanning in CI/CD pipeline:
  - **Snyk**: Vulnerability scanning with SARIF reports
  - **Trivy**: Container and filesystem security scanning
  - **Docker Scout**: Supply chain vulnerability analysis
- Container image signing with provenance attestations
- **Supply Chain Security**:
  - SBOM (Software Bill of Materials) generation
  - Provenance attestations for build integrity
  - License compliance automation with allowlist validation
  - Multi-platform build security (Linux AMD64/ARM64)

#### Development Security
- Separate development/production Kong instances
- Mock Kong services in unit tests
- No production secrets in development
- Security scanning with Snyk or similar
- Dependency vulnerability scanning
- Regular dependency updates

---

## Testing Strategy

### Three-Tier Testing Approach

The authentication service implements a comprehensive testing strategy with automatic test consumer setup across all frameworks. Recent improvements include enhanced test coverage (80.78% overall) and modular test architecture with proper isolation.

#### Test Coverage Achievements
- **Overall Coverage**: 80.78% line coverage (+16.21% improvement)
- **Total Test Count**: 260 tests (100% pass rate) across all frameworks
- **Integration Tests**: 124 tests executing in CI with live server validation
- **Kong Service Test Suite**: 83 comprehensive test cases across 4 service files (100% coverage)
  - **Kong API Gateway Service**: 33 test cases (100% coverage)
  - **Kong Konnect Service**: 24 test cases covering cloud and self-hosted environments
  - **Circuit Breaker Service**: 26 test cases for Kong Admin API resilience and stale cache fallback
  - **Shared Circuit Breaker**: Comprehensive testing with real endpoint integration
- **Kong Factory Pattern**: 100% coverage with mode validation
- **Logger Utility**: 46.58% coverage with error-free execution validation
- **Server Integration**: Complete HTTP endpoint testing with proper mock isolation
- **CI/CD Execution**: All tests passing in automated pipeline with performance validation
- **Circuit Breaker Testing**: Complete coverage of Kong failure scenarios and fallback mechanisms

#### 1. Bun Unit & Integration Tests
Located in `test/bun/` directory:

```bash
# Run all tests
bun run bun:test

# Run specific test files
bun test test/bun/config.test.ts
bun test test/bun/jwt.service.test.ts
bun test test/bun/kong.service.test.ts
bun test test/bun/kong-api-gateway.service.test.ts
bun test test/bun/kong-konnect.service.test.ts
bun test test/bun/circuit-breaker.service.test.ts
bun test test/bun/kong.factory.test.ts
bun test test/bun/logger.test.ts
bun test test/bun/server.test.ts

# Run with coverage
bun run bun:test:coverage

# Watch mode for TDD
bun run bun:test:watch
```

Test Coverage Areas:
- **Configuration validation**: 4-pillar configuration pattern with Zod schema testing (`config.test.ts`)
- **JWT token generation and signing**: Native crypto.subtle validation (`jwt.service.test.ts`)
- **Kong API integration**: Complete mocking with factory pattern testing (`kong.service.test.ts`)
- **Kong API Gateway Service**: 100% coverage with 33 test cases (`kong-api-gateway.service.test.ts`)
- **Kong Konnect Service**: Comprehensive 24 test cases covering cloud and self-hosted environments with circuit breaker integration (`kong-konnect.service.test.ts`)
- **Circuit Breaker Service**: Complete 26 test cases for Kong Admin API resilience with stale cache fallback testing (`circuit-breaker.service.test.ts`)
- **Shared Circuit Breaker**: Singleton pattern testing with adaptive caching strategy validation
- **Kong Factory Pattern**: 100% coverage with mode validation (`kong.factory.test.ts`)
- **Logger Utility**: Error-free execution validation (`logger.test.ts`)
- **HTTP endpoint behavior**: Modular handler testing with proper isolation (`server.test.ts`)

#### 2. Playwright E2E Tests
Located in `test/playwright/` directory with automatic consumer setup:

```bash
# Run all E2E tests (consumers auto-provisioned)
bun run playwright:test

# Interactive UI mode
bun run playwright:ui

# Run specific test
bunx playwright test test/playwright/business-requirements.e2e.ts
bunx playwright test test/playwright/comprehensive-business.e2e.ts

# With specific configuration
API_BASE_URL=https://staging.example.com bun run playwright:test
```

**Current Test Suite (32 tests across 2 files - 100% pass rate):**

**business-requirements.e2e.ts (16 tests):**
- Service Health & Availability
- JWT Token Generation
- Security Requirements (401 status for invalid consumers)
- Error Handling
- CORS Support
- Caching Behavior

**comprehensive-business.e2e.ts (16 tests):**
- Service Health & Dependencies
- JWT Token Generation Core Flow
- Security Enforcement (401 status for authentication failures)
- Cache Management
- Telemetry & Observability
- Error Handling & Resilience

**Automatic Setup Features:**
- **Global Setup**: Automatically provisions standardized test consumers before all tests
- **Idempotent Creation**: Safe to run multiple times - detects existing consumers
- **Shared Configuration**: Uses centralized test consumer definitions from `test/shared/test-consumers.ts`
- **Environment Loading**: Automatically loads `.env` file for Kong Admin API access

**Recent Improvements (Linear Issues SIO-5 to SIO-9 - All Completed):**
- Applied KISS principle - reduced from 176 to 32 essential tests (100% pass rate)
- Fixed critical HTTP status code bug (401 vs 500 for invalid consumers)
- Improved test reliability with consistent consumer management
- Enhanced error response structure validation
- Integrated CI/CD execution with live server validation
- Achieved 10/10 testing strategy score with enterprise-grade coverage

#### 3. K6 Performance Tests
Located in `test/k6/` directory with intelligent consumer management:

**Test Categories with Automatic Setup:**
```bash
# Smoke tests (endpoints only - no Kong setup needed)
bun run k6:smoke:health      # Health endpoint only
bun run k6:smoke:metrics     # Metrics endpoint only
bun run k6:smoke:openapi     # OpenAPI endpoint only
bun run k6:smoke:all-endpoints # Basic health smoke test

# Authentication tests (automatic consumer setup)
bun run k6:smoke:tokens      # JWT generation with consumer provisioning
bun run k6:load              # Load testing (70% tokens, 20% user journey, 10% metrics)
bun run k6:stress            # Stress testing (primarily tokens with mixed traffic)
bun run k6:spike             # Spike testing (primarily tokens with mixed traffic)

# Test information
bun run k6:info              # Display all available tests

# Convenience scripts for test suites
bun run k6:quick             # Quick smoke tests (6 minutes) - health + tokens only
bun run k6:full              # Full test suite (30-40 minutes) - smoke tests + performance tests (tokens-focused) and configuration
```

**Unified K6 Test Execution:**
All K6 tests now use a standardized shell script wrapper (`scripts/run-k6.sh`) that provides:
- **Automatic Environment Loading**: Loads `.env` file for Kong Admin API credentials
- **Conditional Kong Variables**: Only passes Kong credentials to tests that need them
- **Result Output Management**: Automatically creates `test/results/k6/` directory
- **Cloud-Native Compatibility**: Enhanced environment variable handling for containerized deployments

**Intelligent Consumer Management:**
- **Automatic Setup**: Tests that need Kong consumers automatically provision them before execution
- **No Unnecessary Dependencies**: Simple endpoint tests (health, metrics, openapi) run without Kong setup
- **Environment Variables**: Kong Admin API credentials automatically loaded from `.env` file
- **Idempotent Operations**: Consumer setup is safe to run repeatedly
- **Shared Consumers**: All K6 tests use the same standardized test consumer set

**Test File Structure:**
- `test/shared/test-consumers.ts` - Centralized test consumer definitions (TypeScript)
- `test/bun/` - Unit and integration tests
  - `config.test.ts` - Configuration validation with Zod schemas
  - `jwt.service.test.ts` - JWT generation and validation
  - `kong.service.test.ts` - Kong service integration testing
  - `kong-api-gateway.service.test.ts` - Kong API Gateway service (100% coverage)
  - `kong-konnect.service.test.ts` - Kong Konnect service (24 comprehensive test cases)
  - `circuit-breaker.service.test.ts` - Circuit breaker service (26 test cases for Kong API resilience)
  - `kong.factory.test.ts` - Kong factory pattern (100% coverage)
  - `logger.test.ts` - Logger utility testing
  - `server.test.ts` - HTTP server integration testing
- `test/playwright/` - E2E tests
  - `business-requirements.e2e.ts` - Core business requirement tests (16 tests)
  - `comprehensive-business.e2e.ts` - Comprehensive business logic tests (16 tests)
  - `utils/test-helpers.ts` - Playwright test utilities
- `test/k6/` - Performance tests
  - `smoke/` - Individual endpoint smoke tests
  - `load/auth-load.ts` - Load testing with mixed traffic patterns
  - `stress/system-stress.ts` - Stress testing scenarios
  - `spike/spike-test.ts` - Spike testing scenarios
  - `utils/config.ts` - Test configuration
  - `utils/helpers.ts` - Test helper functions
  - `utils/metrics.ts` - Custom metrics handling
  - `utils/setup.js` - Consumer provisioning
  - `utils/test-consumers.js` - K6-compatible consumer definitions
- `test/k6/run-k6.sh` - Unified K6 test execution wrapper

**Test Consumer Configuration:**
- **5 Standard Test Consumers**: `test-user-001` through `test-user-005`
- **1 Anonymous Consumer**: For testing anonymous rejection scenarios
- **Consistent Across Frameworks**: Same consumers used in Playwright and K6 tests
- **Kong Admin API Integration**: Automatically creates missing consumers via Kong Admin API

**Custom Configurations:**
```bash
# Quick smoke tests with minimal load
K6_SMOKE_VUS=1 K6_SMOKE_DURATION=3s bun run k6:smoke:tokens

# Load testing against different environments
TARGET_HOST=staging.example.com TARGET_PORT=443 TARGET_PROTOCOL=https bun run k6:load

# Non-blocking thresholds for CI/CD
K6_THRESHOLDS_NON_BLOCKING=true bun run k6:stress

# Direct shell script usage for advanced scenarios
scripts/run-k6.sh test/k6/smoke/health-only-smoke.ts test/results/custom-health.json false
scripts/run-k6.sh test/k6/load/auth-load.ts test/results/custom-load.json true
```

**Performance Thresholds:**
- Health endpoint: p95 < 400ms, p99 < 500ms
- Token endpoint: p95 < 50ms, p99 < 100ms
- Metrics endpoint: p95 < 30ms, p99 < 50ms
- OpenAPI endpoint: p95 < 50ms, p99 < 100ms
- Error rate: < 1% (normal), < 5% (stress)
- Configurable via environment variables (K6_*_THRESHOLD)
- Non-blocking mode available (K6_THRESHOLDS_NON_BLOCKING=true)

### Test Environment Configuration

#### Playwright E2E Tests
```bash
# Base URL for Playwright E2E tests
API_BASE_URL=http://localhost:3000
```

#### K6 Performance Testing
```bash
# Target service configuration
TARGET_HOST=localhost
TARGET_PORT=3000
TARGET_PROTOCOL=http
K6_TIMEOUT=30s

# Test execution parameters
K6_SMOKE_VUS=3
K6_SMOKE_DURATION=3m
K6_LOAD_INITIAL_VUS=10
K6_LOAD_TARGET_VUS=20
K6_LOAD_RAMP_UP_DURATION=2m
K6_LOAD_STEADY_DURATION=5m
K6_LOAD_RAMP_DOWN_DURATION=2m
K6_STRESS_INITIAL_VUS=50
K6_STRESS_TARGET_VUS=100
K6_STRESS_PEAK_VUS=200
K6_STRESS_DURATION=5m
K6_SPIKE_BASELINE_VUS=10
K6_SPIKE_TARGET_VUS=100
K6_SPIKE_DURATION=3m

# Performance thresholds (in milliseconds)
K6_HEALTH_P95_THRESHOLD=50
K6_HEALTH_P99_THRESHOLD=100
K6_TOKENS_P95_THRESHOLD=50
K6_TOKENS_P99_THRESHOLD=100
K6_METRICS_P95_THRESHOLD=30
K6_METRICS_P99_THRESHOLD=50

# Error rate thresholds (as decimal)
K6_ERROR_RATE_THRESHOLD=0.01
K6_STRESS_ERROR_RATE_THRESHOLD=0.05
K6_THRESHOLDS_NON_BLOCKING=false

# Test consumer configuration (auto-generated from test/shared/test-consumers.ts)
TEST_CONSUMER_ID_1=test-user-001
TEST_CONSUMER_USERNAME_1=test-user-001
TEST_CONSUMER_ID_2=test-user-002
TEST_CONSUMER_USERNAME_2=test-user-002
TEST_CONSUMER_ID_3=test-user-003
TEST_CONSUMER_USERNAME_3=test-user-003
TEST_CONSUMER_ID_4=test-user-004
TEST_CONSUMER_USERNAME_4=test-user-004
TEST_CONSUMER_ID_5=test-user-005
TEST_CONSUMER_USERNAME_5=test-user-005
```

---

## Practical Usage Examples

### Complete Client Implementation Example

#### Step 1: Obtain JWT Token
```bash
# Get JWT token using API key
curl -X GET https://gateway.example.com/tokens \
  -H "apikey: your-consumer-api-key-12345"

# Response:
# {
#   "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
#   "expires_in": 900
# }
```

#### Step 2: Use JWT for Protected Services
```bash
# Call protected service with JWT
curl -X GET https://gateway.example.com/customer-assignments/123 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Call another protected service with same JWT
curl -X GET https://gateway.example.com/images/product/456 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Bun/TypeScript Example
```typescript
// Native Bun implementation - no external dependencies needed
class ApiClient {
  private token: string | null = null;
  private tokenExpiry: Date | null = null;
  private readonly baseUrl = 'https://gateway.example.com';

  constructor(private readonly apiKey: string) {}

  async getToken(): Promise<string> {
    // Check if token exists and is still valid
    if (this.token && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.token;
    }

    // Get new token using native fetch
    const response = await fetch(`${this.baseUrl}/tokens`, {
      headers: { 'apikey': this.apiKey }
    });

    if (!response.ok) {
      throw new Error(`Failed to get token: ${response.status}`);
    }

    const data = await response.json() as { access_token: string; expires_in: number };

    this.token = data.access_token;
    // Set expiry 30 seconds before actual expiry for safety
    this.tokenExpiry = new Date(Date.now() + (data.expires_in - 30) * 1000);

    return this.token;
  }

  async callApi<T = any>(endpoint: string): Promise<T> {
    const token = await this.getToken();

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status}`);
    }

    return response.json() as Promise<T>;
  }
}

// Usage with Bun
const client = new ApiClient('your-api-key-12345');
const customerData = await client.callApi('/customer-assignments/123');

// Can also run directly with: bun run client.ts
```

### Python Example
```python
import requests
from datetime import datetime, timedelta

class ApiClient:
    def __init__(self, api_key):
        self.api_key = api_key
        self.token = None
        self.token_expiry = None
        self.base_url = 'https://gateway.example.com'

    def get_token(self):
        # Check if token is still valid
        if self.token and self.token_expiry and datetime.now() < self.token_expiry:
            return self.token

        # Get new token
        response = requests.get(
            f'{self.base_url}/tokens',
            headers={'apikey': self.api_key}
        )
        response.raise_for_status()

        data = response.json()
        self.token = data['access_token']
        # Set expiry 30 seconds before actual expiry
        self.token_expiry = datetime.now() + timedelta(seconds=data['expires_in'] - 30)

        return self.token

    def call_api(self, endpoint):
        token = self.get_token()

        response = requests.get(
            f'{self.base_url}{endpoint}',
            headers={'Authorization': f'Bearer {token}'}
        )
        response.raise_for_status()
        return response.json()

# Usage
client = ApiClient('your-api-key-12345')
customer_data = client.call_api('/customer-assignments/123')
```

### Common Scenarios

#### Scenario 1: Public Endpoint (Anonymous Consumer)
```bash
# Some endpoints allow anonymous access
curl -X GET https://gateway.example.com/prices-api-v2/public/catalog
# Kong uses anonymous consumer: 12345678-1234-1234-1234-123456789abc
```

#### Scenario 2: Token Expiration Handling
```javascript
async function makeApiCallWithRetry(client, endpoint) {
  try {
    return await client.callApi(endpoint);
  } catch (error) {
    if (error.response && error.response.status === 401) {
      // Token might be expired, force refresh
      client.token = null;
      client.tokenExpiry = null;

      // Retry with new token
      return await client.callApi(endpoint);
    }
    throw error;
  }
}
```

#### Scenario 3: Parallel API Calls
```javascript
// Get token once, use for multiple parallel calls
async function fetchMultipleResources(client) {
  const token = await client.getToken();

  const [customers, products, prices] = await Promise.all([
    axios.get(`${client.baseUrl}/customer-assignments`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }),
    axios.get(`${client.baseUrl}/images/products`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }),
    axios.get(`${client.baseUrl}/prices-api-v2/current`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
  ]);

  return { customers, products, prices };
}
```

### Testing Different Authentication Scenarios

#### Test 1: Valid Consumer with API Key
```bash
# Should return JWT token
curl -X GET https://gateway.example.com/tokens \
  -H "apikey: valid-api-key" \
  -v
```

#### Test 2: Invalid API Key
```bash
# Should return 401 Unauthorized from Kong
curl -X GET https://gateway.example.com/tokens \
  -H "apikey: invalid-key" \
  -v
```

#### Test 3: Expired JWT
```bash
# Wait 15+ minutes after getting token, then try to use it
# Should return 401 or fall back to anonymous consumer
curl -X GET https://gateway.example.com/customer-assignments \
  -H "Authorization: Bearer expired-jwt-token" \
  -v
```

#### Test 4: No Authentication (Anonymous Fallback)
```bash
# Services with anonymous consumer configured will work
# Services without will return 401
curl -X GET https://gateway.example.com/prices-api-v2/catalog \
  -v
```

### Important Implementation Notes

1. **Token Caching**: Always cache JWT tokens until expiry to avoid unnecessary calls to `/tokens`
2. **Expiry Buffer**: Refresh tokens 30-60 seconds before actual expiry to avoid edge cases
3. **Error Handling**: Implement retry logic for 401 errors with token refresh
4. **Parallel Requests**: Use the same token for concurrent API calls
5. **Anonymous Fallback**: Be aware that some endpoints may work without authentication
6. **Rate Limiting**: Kong may apply different rate limits to authenticated vs anonymous consumers
7. **Connection Pooling**: The service uses connection pooling for Kong Admin API calls
8. **Circuit Breaking**: Implement circuit breakers for resilience in production

---

## Troubleshooting Guide

| Issue | Possible Cause | Solution |
|-------|---------------|----------|
| 401 Unauthorized | Missing Kong headers | Verify Kong authentication plugins are configured |
| 401 Unauthorized | Anonymous consumer | Check Kong consumer configuration |
| 503 Service Unavailable | Kong Admin API unreachable | Check KONG_ADMIN_URL and network connectivity |
| 503 Service Unavailable | Secret creation failed | Verify Kong Admin API permissions |
| Invalid token signature | Secret mismatch | Verify consumer secret in Kong matches signing secret |
| Token expired immediately | Clock skew | Synchronize time between services |
| High latency | Cache misses | Check cache configuration and TTL |
| Memory growth | Cache overflow | Adjust CACHE_MAX_SIZE setting |
| OTLP export failures | Network issues | Check OTLP endpoint connectivity |

## Support Resources

- **Kong Documentation**: https://docs.konghq.com
- **Bun Documentation**: https://bun.sh/docs
- **OpenTelemetry**: https://opentelemetry.io/docs/
- **JWT Specification**: https://jwt.io/introduction/

---

*Document Version: 3.1*
*Last Updated: October 2025*
*Service Version: Authentication v2.0 (Bun v1.2.23/TypeScript)*
*Architecture: Enhanced with Bun Routes API, hybrid caching, circuit breaker resilience, and response builders*
*Configuration: 4-pillar pattern with enhanced security validation and circuit breaker integration*
*Caching: Hybrid memory-first strategy with Redis fallback and stale cache resilience*
*Observability: Cost-optimized OpenTelemetry with consolidated metrics endpoints and circuit breaker monitoring*
*Testing: 80.78% coverage (260 tests, 100% pass rate) with comprehensive circuit breaker testing*
*CI/CD: Docker Cloud Builders integration for enhanced build performance*
*Recent Updates: Implemented SIO-45 to SIO-51 improvements including circuit breaker resilience, .biomeignore optimization, comprehensive testing, and Docker Cloud Builders migration*
