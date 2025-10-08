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
10. [Security Considerations](#security-considerations)
11. [Testing Strategy](#testing-strategy)
12. [Practical Usage Examples](#practical-usage-examples)

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
- **Throughput**: 100,000+ requests/second capability with Bun v1.2.23
- **Memory Usage**: ~50-80MB baseline with full telemetry enabled
- **Cold Start**: <100ms initialization time
- **Response Time**: <10ms p99 for token generation (native crypto.subtle)
- **Container Size**: <100MB with all dependencies (multi-stage Alpine build)

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
                          │ Kong Admin API │        │ Consumer Secret│
                          │   (Consumers)  │◀───────│   Management   │
                          └────────────────┘        └────────────────┘
                                                             │
                                                    ┌────────▼────────┐
                                                    │  OpenTelemetry  │
                                                    │    Collector    │
                                                    └─────────────────┘
```

### Component Dependencies

#### External Dependencies
- **Kong Gateway**: Provides consumer authentication and request routing
- **Kong Admin API**: Manages consumer secrets and JWT configurations
- **OpenTelemetry Collector**: Receives distributed tracing, metrics, and logs

#### Internal Components
- **HTTP Server**: Native Bun.serve() high-performance HTTP server
- **JWT Service**: Token generation using crypto.subtle Web API
- **Kong Service**: Kong Admin API client with caching and connection pooling
- **Handler Layer**: Dedicated request handlers (`src/handlers/`) for focused business logic
  - `tokens.ts`: JWT token generation with Kong integration
  - `health.ts`: Health checks with dependency monitoring
  - `metrics.ts`: Performance metrics and debugging endpoints
  - `openapi.ts`: Dynamic OpenAPI specification generation
- **Middleware Layer**: Cross-cutting concerns (`src/middleware/`)
  - `error-handler.ts`: Centralized error handling and HTTP responses
  - `cors.ts`: CORS preflight request handling
- **Router Layer**: Request routing and telemetry integration (`src/routes/router.ts`)
- **Telemetry System**: OpenTelemetry instrumentation with OTLP export
- **Configuration Manager**: Environment-based configuration with validation
- **Health Monitors**: Multiple health check endpoints with dependency status

### Technology Stack
- **Runtime**: Bun v1.2.23+ (native JavaScript runtime)
- **Language**: TypeScript
- **HTTP Server**: Native Bun.serve() with built-in performance optimizations
- **JWT Generation**: Web Crypto API (crypto.subtle) with HMAC-SHA256
- **Container**: Docker with Alpine Linux base (oven/bun:1.2.23-alpine)
- **Monitoring**: OpenTelemetry with OTLP protocol
- **API Documentation**: Dynamic OpenAPI generation
- **Code Quality**: Biome for linting and formatting
- **Testing**: Bun test runner, Playwright E2E, K6 performance testing

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
3. **Caching**: In-memory cache with TTL for performance
4. **Retrieval**: Fetched with connection pooling
5. **Rotation**: Can be rotated via Kong Admin API
6. **Revocation**: Deleted through Kong Admin API

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

#### Kong Service (src/services/kong.service.ts)
```typescript
export class KongService {
  private cache = new Map<string, { secret: ConsumerSecret; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  async getOrCreateConsumerSecret(consumerId: string): Promise<ConsumerSecret> {
    // Check cache first
    const cached = this.cache.get(consumerId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.secret;
    }

    // Fetch from Kong Admin API
    const secrets = await this.fetchConsumerSecrets(consumerId);

    if (secrets.length === 0) {
      // Create new secret if none exists
      return await this.createConsumerSecret(consumerId);
    }

    // Cache and return
    this.cache.set(consumerId, { secret: secrets[0], timestamp: Date.now() });
    return secrets[0];
  }

  private getApiUrl(consumerId: string): string {
    if (this.mode === "KONNECT") {
      return `${this.adminUrl}/core-entities/consumers/${consumerId}/jwt`;
    }
    return `${this.adminUrl}/consumers/${consumerId}/jwt`;
  }
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

The authentication service implements a robust 4-pillar configuration pattern with comprehensive security validation:

#### Configuration Structure
1. **Pillar 1**: Default Configuration Object - All baseline values with secure defaults
2. **Pillar 2**: Environment Variable Mapping - Explicit mapping with type safety
3. **Pillar 3**: Manual Configuration Loading - Controlled loading with proper fallbacks
4. **Pillar 4**: Validation at End - Comprehensive Zod v4 schema validation

#### Production Security Features
- **HTTPS Enforcement**: All telemetry endpoints must use HTTPS in production
- **Token Security Validation**: Minimum 32-character requirement for Kong admin tokens
- **Environment Validation**: Prevents localhost URLs and weak configurations in production
- **Configuration Immutability**: Runtime configuration changes are prevented

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
- **`src/config/config.ts`**: 4-pillar configuration implementation with security validation
- **`src/config/index.ts`**: Re-export hub for clean module imports

#### Configuration Pattern Benefits
- **Type Safety**: Comprehensive Zod validation with TypeScript integration
- **Security Validation**: Production-ready checks for HTTPS, token length, environment restrictions
- **Immutability**: Configuration locked at startup to prevent runtime mutations
- **Environment Flexibility**: Support for multiple deployment environments
- **Error Clarity**: Detailed validation messages for configuration issues

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
```json
{
  "dependencies": {
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
    "@opentelemetry/instrumentation-winston": "^0.51.0",
    "@opentelemetry/resources": "^2.1.0",
    "@opentelemetry/sdk-logs": "^0.206.0",
    "@opentelemetry/sdk-metrics": "^2.1.0",
    "@opentelemetry/sdk-node": "^0.206.0",
    "@opentelemetry/sdk-trace-base": "^2.1.0",
    "@opentelemetry/semantic-conventions": "^1.37.0",
    "@opentelemetry/winston-transport": "^0.17.0",
    "winston": "^3.18.3",
    "winston-transport": "^4.9.0",
    "zod": "^4.1.12"
  },
  "devDependencies": {
    "@biomejs/biome": "^2.2.5",
    "@playwright/test": "^1.56.0",
    "@types/bun": "1.2.23",
    "@types/k6": "^1.3.1",
    "typescript": "^5.9.3"
  },
  "engines": {
    "bun": ">=1.1.35"
  }
}
```

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

The service implements comprehensive observability using vendor-neutral OpenTelemetry standards, compatible with Elastic APM, Datadog, New Relic, and other OTLP-compliant platforms.

### Telemetry Features

#### Distributed Tracing
- HTTP request tracing with automatic span correlation
- Request ID generation for end-to-end tracing
- Kong API call instrumentation
- JWT generation timing

#### Metrics Collection
- **Runtime Metrics**: Event loop delay, memory usage, CPU utilization
- **System Metrics**: Host-level CPU, memory, disk, network via HostMetrics
- **HTTP Metrics**: Request counts, response times, error rates
- **Business Metrics**: JWT tokens generated, Kong operations, cache performance
- **Custom Metrics**: Extensible metric collection for business KPIs

#### Structured Logging
- ECS-formatted logs for Elastic Stack compatibility
- Winston transport with OpenTelemetry correlation
- Request context propagation
- Error tracking with stack traces

### Available Metrics

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
| `kong_operations` | Counter | Kong API operations |
| `cache_operations` | Counter | Cache hit/miss statistics |

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

#### Dashboard Metrics
- Request throughput (req/sec)
- Response time percentiles (p50, p95, p99)
- Error rate by status code
- Token generation rate
- Cache hit ratio
- Memory and CPU utilization
- Active connections

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
bun run biome:check        # Biome linting and formatting
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
```

#### Scaling Recommendations
- **Horizontal Scaling**: Service is stateless, scale horizontally as needed
- **Memory**: 64-128MB per instance (128-256MB with full telemetry)
- **CPU**: 0.1-0.5 CPU cores per instance
- **Replicas**: Minimum 2 for HA, 3-5 for production load
- **Container Resources**: Request 100m CPU, 64Mi memory; Limit 500m CPU, 128Mi memory
- **Autoscaling**: Target 70% CPU utilization for optimal performance

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
- Security scanning in CI/CD pipeline
- Container image signing

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
- **Kong API Gateway Service**: 100% coverage (33 comprehensive test cases)
- **Kong Factory Pattern**: 100% coverage with mode validation
- **Logger Utility**: 46.58% coverage with error-free execution validation
- **Server Integration**: Complete HTTP endpoint testing with proper mock isolation

#### 1. Bun Unit & Integration Tests
Located in `test/bun/` directory:

```bash
# Run all tests
bun run bun:test

# Run specific test files
bun test test/bun/jwt.service.test.ts
bun test test/bun/kong.service.test.ts
bun test test/bun/server.test.ts

# Run with coverage
bun run bun:test:coverage

# Watch mode for TDD
bun run bun:test:watch
```

Test Coverage Areas:
- **JWT token generation and signing**: Native crypto.subtle validation
- **Kong API integration**: Complete mocking with factory pattern testing
- **HTTP endpoint behavior**: Modular handler testing with proper isolation
- **Error handling scenarios**: Centralized middleware error handling
- **Configuration validation**: 4-pillar configuration pattern validation
- **Test Consumer Management**: Standardized consumer setup across all frameworks
- **Mock Cleanup**: Proper fetch spy restoration to prevent test pollution

#### 2. Playwright E2E Tests
Located in `test/playwright/` directory with automatic consumer setup:

```bash
# Run all E2E tests (consumers auto-provisioned)
bun run playwright:test

# Interactive UI mode
bun run playwright:ui

# Run specific test
bunx playwright test test/playwright/core-functionality.e2e.ts

# With specific configuration
API_BASE_URL=https://staging.example.com bun run playwright:test
```

**Automatic Setup Features:**
- **Global Setup**: Automatically provisions standardized test consumers before all tests
- **Idempotent Creation**: Safe to run multiple times - detects existing consumers
- **Shared Configuration**: Uses centralized test consumer definitions from `test/shared/test-consumers.ts`
- **Environment Loading**: Automatically loads `.env` file for Kong Admin API access

E2E Test Scenarios:
- Health endpoint availability
- Token generation flow with real Kong consumers
- Error response validation
- CORS header verification
- Metrics endpoint functionality
- Anonymous consumer rejection
- Missing header validation

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
bun run k6:load              # Load testing with consumer setup
bun run k6:stress            # Stress testing with consumer setup
bun run k6:spike             # Spike testing with consumer setup

# Test information
bun run k6:info              # Display all available tests and configuration
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
- `test/shared/test-consumers.ts` - **Centralized test consumer definitions (TypeScript)**
- `test/bun/` - **Unit and integration tests**
  - `jwt.service.test.ts` - JWT generation and validation
  - `kong-api-gateway.service.test.ts` - **NEW: 100% coverage Kong API Gateway**
  - `kong.factory.test.ts` - **NEW: 100% coverage Kong factory pattern**
  - `kong.service.test.ts` - Kong service integration testing
  - `logger.test.ts` - **NEW: Logger utility testing**
  - `server.test.ts` - HTTP server integration testing
- `scripts/run-k6.sh` - **NEW: Unified K6 test execution wrapper with environment loading**
- `test/k6/utils/test-consumers.js` - **K6-compatible JavaScript version**
- `test/k6/utils/setup.js` - **K6 consumer provisioning with idempotent creation**
- `test/k6/smoke/` - Smoke tests for individual endpoints
- `test/k6/load/` - Load testing scenarios with automatic setup
- `test/k6/stress/` - Stress testing scenarios with automatic setup
- `test/k6/spike/` - Spike testing scenarios with automatic setup
- `test/k6/utils/config.ts` - Centralized test configuration with standardized consumer access
- `test/k6/utils/helpers.ts` - Test helper functions
- `test/k6/utils/metrics.ts` - Custom metrics handling

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

# Test consumer configuration
TEST_CONSUMER_ID_1=test-consumer-001
TEST_CONSUMER_USERNAME_1=loadtest-user-001
TEST_CONSUMER_ID_2=test-consumer-002
TEST_CONSUMER_USERNAME_2=loadtest-user-002
TEST_CONSUMER_ID_3=test-consumer-003
TEST_CONSUMER_USERNAME_3=loadtest-user-003
TEST_CONSUMER_ID_4=test-consumer-004
TEST_CONSUMER_USERNAME_4=loadtest-user-004
TEST_CONSUMER_ID_5=test-consumer-005
TEST_CONSUMER_USERNAME_5=loadtest-user-005
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

*Document Version: 2.3*
*Last Updated: October 2025*
*Service Version: Authentication v2.0 (Bun v1.2.23/TypeScript)*
*Architecture: Modular DRY/KISS implementation with 80.78% test coverage*
*Testing: Unified K6 execution with standardized consumer management and shell script wrapper*
*Codebase Synchronized: README.md updated to reflect K6 test execution improvements and consumer standardization*
