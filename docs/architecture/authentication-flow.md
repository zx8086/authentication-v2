# Authentication Flow

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

### Security Benefits

The authentication service acts as a **secure token vending machine**:

1. **Clients Never See Secrets**: JWT signing secrets remain server-side
2. **Centralized Security**: One hardened service vs many client implementations
3. **Instant Revocation**: Disable access immediately through Kong
4. **Audit Compliance**: Complete audit trail of token issuance
5. **Secret Rotation**: Rotate secrets without client updates

## Kong Gateway Integration

### Kong Mode Support
The service supports two Kong deployment modes via the `KONG_MODE` environment variable:

1. **API_GATEWAY Mode**: Traditional self-hosted Kong
   - Direct access to Kong Admin API
   - URL format: `http://kong-admin:8001`
   - Consumer management at `/consumers/{id}/jwt`

2. **KONNECT Mode**: Kong's cloud-native platform
   - Control plane based management
   - URL format: `https://region.api.konghq.com/v2/control-planes/{id}`
   - Consumer management with realm support

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

#### JWT Plugin (for protected services)
```yaml
plugins:
- name: jwt
  config:
    anonymous: 12345678-1234-1234-1234-123456789abc
    claims_to_verify:
    - exp
    - nbf
    cookie_names: []
    header_names:
    - authorization
    key_claim_name: key
    maximum_expiration: 0
    run_on_preflight: true
    secret_is_base64: false
    uri_param_names:
    - jwt
```

## Complete Authentication Flow

### Phase 1: Obtaining JWT Token

#### 1. Client Requests JWT Token
```http
GET /tokens HTTP/1.1
Host: gateway.example.com
apikey: consumer-api-key-12345
```

#### 2. Kong Key-Auth Plugin Processing
- Validates API key against consumer database
- Identifies consumer: `example-consumer`
- Adds upstream headers for authentication service

#### 3. Kong Adds Upstream Headers
```
X-Consumer-ID: 98765432-9876-5432-1098-765432109876
X-Consumer-Username: example-consumer
X-Anonymous-Consumer: false
```

#### 4. Authentication Service Validates Headers
```typescript
// Header validation in server.ts
if (!request.headers.get("x-consumer-id") ||
    !request.headers.get("x-consumer-username") ||
    request.headers.get("x-anonymous-consumer") === "true") {
  return new Response("Unauthorized", { status: 401 });
}
```

#### 5. Generate and Return JWT Token
```json
{
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 900
}
```

### Phase 2: Using JWT for API Access

#### 1. Client Calls Protected Service
```http
GET /customer-assignments/123 HTTP/1.1
Host: gateway.example.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 2. Kong JWT Plugin Validation
- Extracts JWT from Authorization header
- Validates signature using consumer's secret from Kong
- Verifies claims (exp, nbf)
- Checks `key` claim matches consumer's key

#### 3. Validation Success Path
- Kong adds consumer headers to upstream request
- Request forwarded to backend service
- Backend receives validated consumer information

## Anonymous Consumer Handling

### Anonymous Consumer Configuration
- **UUID**: `12345678-1234-1234-1234-123456789abc`
- **Purpose**: Allows certain endpoints to be accessed without authentication
- **Behavior**: When JWT validation fails, Kong falls back to anonymous consumer

### Service Behavior with Anonymous Consumers

**Authentication Service** (`/tokens` endpoint):
- **Blocks anonymous consumers**: Returns 401 Unauthorized
- **Requires valid consumer**: Must have authenticated consumer ID
- **No fallback**: Anonymous access explicitly denied

**Protected Services** (with JWT plugin):
- **Allows fallback**: Can configure anonymous consumer for public endpoints
- **Granular control**: Services decide whether to allow anonymous access
- **Rate limiting**: Anonymous consumers can have different rate limits