# JWT Token Specification

## JWT Token Structure

The Authentication Service generates JWT tokens using the HS256 algorithm with standardized claims for Kong Gateway integration.

### Token Header
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

### Token Payload
```json
{
  "sub": "consumer-username",
  "key": "consumer-jwt-key",
  "jti": "550e8400-e29b-41d4-a716-446655440000",
  "iat": 1634567890,
  "name": "consumer-username",
  "unique_name": "example.com#consumer-username",
  "exp": 1634568790,
  "iss": "https://sts-api.example.com/",
  "aud": "http://api.example.com/"
}
```

### JWT Claims Reference

#### Standard Claims
| Claim | Type | Description | Example |
|-------|------|-------------|---------|
| `sub` | String | Subject (consumer username) | `"example-consumer"` |
| `iss` | String | Issuer (token authority) | `"https://sts-api.example.com/"` |
| `aud` | String | Audience (target API) | `"http://api.example.com/"` |
| `exp` | Integer | Expiration time (Unix timestamp) | `1634568790` |
| `iat` | Integer | Issued at time (Unix timestamp) | `1634567890` |
| `jti` | String | JWT ID (unique token identifier) | `"550e8400-e29b-41d4-a716-446655440000"` |

#### Kong-Specific Claims
| Claim | Type | Description | Example |
|-------|------|-------------|---------|
| `key` | String | Kong consumer JWT key | `"abc123def456"` |
| `name` | String | Consumer display name | `"example-consumer"` |
| `unique_name` | String | Globally unique consumer identifier | `"example.com#example-consumer"` |

## Token Generation Process

### 1. Consumer Authentication
The service receives Kong consumer headers after API key validation:
```http
X-Consumer-ID: 98765432-9876-5432-1098-765432109876
X-Consumer-Username: example-consumer
X-Anonymous-Consumer: false
```

### 2. Consumer Secret Retrieval
The service retrieves or creates JWT credentials in Kong:
```typescript
// Kong API call to get/create consumer JWT credentials
const secret = await kongService.getOrCreateConsumerSecret(consumerId);
// Returns: { key: "abc123def456", secret: "super-secret-signing-key" }
```

### 3. JWT Generation
Token is generated using the Web Crypto API:
```typescript
const payload = {
  sub: username,
  key: secret.key,
  jti: crypto.randomUUID(),
  iat: Math.floor(Date.now() / 1000),
  name: username,
  unique_name: `${domain}#${username}`,
  exp: Math.floor(Date.now() / 1000) + (15 * 60), // 15 minutes
  iss: config.kong.jwt.authority,
  aud: config.kong.jwt.audience,
};

const token = await jwtService.generateToken(payload, secret.secret);
```

### 4. Response Format
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 900
}
```

## Token Validation

### Kong JWT Plugin Validation
When the token is used with Kong Gateway:

1. **Header Extraction**: Token extracted from `Authorization: Bearer <token>`
2. **Signature Validation**: Kong validates using the consumer's secret
3. **Claims Verification**:
   - `exp`: Token not expired
   - `key`: Matches consumer's JWT key
   - `iss`/`aud`: Match configured values (optional)

### Manual Validation
For services that need to validate tokens independently:

```typescript
import { jwtVerify } from 'jose';

async function validateToken(token: string, secret: string) {
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));

    // Verify required claims
    if (!payload.sub || !payload.key || !payload.exp) {
      throw new Error('Missing required claims');
    }

    // Check expiration
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      throw new Error('Token expired');
    }

    return payload;
  } catch (error) {
    throw new Error(`Token validation failed: ${error.message}`);
  }
}
```

## Token Security

### Expiration Strategy
- **Default TTL**: 15 minutes (900 seconds)
- **Configurable**: Via `JWT_EXPIRATION_MINUTES` environment variable
- **Range**: 1-60 minutes (enforced by configuration validation)
- **Rationale**: Balances security with user experience

### Clock Skew Handling
Tokens include both `iat` (issued at) and `exp` (expires) claims to handle clock synchronization issues between services.

### Secret Management
- **Secrets stored in Kong**: JWT signing secrets never leave the Kong Admin API
- **Automatic provisioning**: Secrets created automatically for new consumers
- **Rotation support**: Secrets can be rotated through Kong Admin API
- **No client storage**: Client applications never see or store secrets

## Token Usage Patterns

### Standard API Call
```http
GET /api/protected-resource HTTP/1.1
Host: gateway.example.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

### Token Refresh Pattern
Since tokens are short-lived, applications should implement token refresh:

```typescript
class AuthClient {
  private token: string | null = null;
  private tokenExpiry: number = 0;

  async getValidToken(): Promise<string> {
    if (!this.token || this.isTokenExpired()) {
      await this.refreshToken();
    }
    return this.token!;
  }

  private isTokenExpired(): boolean {
    return Date.now() >= (this.tokenExpiry - 60000); // Refresh 1 minute early
  }

  private async refreshToken(): Promise<void> {
    const response = await fetch('/tokens', {
      headers: { 'apikey': this.apiKey }
    });

    const data = await response.json();
    this.token = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in * 1000);
  }
}
```

## Token Debugging

### Decode Token Payload
For debugging purposes, you can decode the token payload (without validation):

```bash
# Extract payload (base64url decode the middle section)
echo "eyJhbGci..." | cut -d. -f2 | base64 -d | jq .
```

```typescript
// JavaScript/TypeScript
function decodeTokenPayload(token: string) {
  const [header, payload, signature] = token.split('.');
  return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
}
```

### Common Issues

#### Invalid Signature
- **Cause**: Secret mismatch between Auth Service and Kong
- **Solution**: Verify Kong consumer JWT credentials

#### Token Expired
- **Cause**: Token used after expiration time
- **Solution**: Implement token refresh logic

#### Invalid Key Claim
- **Cause**: `key` claim doesn't match Kong consumer JWT key
- **Solution**: Ensure consumer exists and has valid JWT credentials

#### Clock Skew
- **Cause**: Time differences between systems
- **Solution**: Synchronize system clocks or adjust token validation tolerances

## Integration Examples

### Frontend Application
```javascript
// React/Vue/Angular example
class ApiClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.authToken = null;
  }

  async makeRequest(url, options = {}) {
    const token = await this.getAuthToken();

    return fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
  }

  async getAuthToken() {
    if (!this.authToken || this.isTokenExpired()) {
      await this.refreshToken();
    }
    return this.authToken;
  }

  async refreshToken() {
    const response = await fetch('/tokens', {
      headers: { 'apikey': this.apiKey }
    });

    if (!response.ok) {
      throw new Error('Failed to get auth token');
    }

    const data = await response.json();
    this.authToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in * 1000);
  }
}
```

### Backend Service
```typescript
// Express.js middleware example
import { jwtVerify } from 'jose';

function createJwtMiddleware(secret: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7);

    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
      req.user = payload;
      next();
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };
}
```

### Python Application
```python
import time
import requests

class AuthClient:
    """Authentication client for obtaining and managing JWT tokens."""

    def __init__(self, gateway_url: str, api_key: str):
        self.gateway_url = gateway_url.rstrip('/')
        self.api_key = api_key
        self._token: str | None = None
        self._token_expiry: float = 0

    def get_token(self) -> str:
        """Fetch a new JWT token from the authentication service."""
        response = requests.get(
            f"{self.gateway_url}/tokens",
            headers={"apikey": self.api_key}
        )
        response.raise_for_status()

        data = response.json()
        self._token = data["access_token"]
        self._token_expiry = time.time() + data["expires_in"]
        return self._token

    def get_valid_token(self) -> str:
        """Get a valid token, refreshing if necessary."""
        if not self._token or self._is_token_expired():
            self.get_token()
        return self._token

    def _is_token_expired(self) -> bool:
        """Check if token is expired or will expire within 60 seconds."""
        return time.time() >= (self._token_expiry - 60)

    def make_authenticated_request(
        self,
        method: str,
        endpoint: str,
        **kwargs
    ) -> requests.Response:
        """Make an authenticated request to a protected API endpoint."""
        token = self.get_valid_token()
        headers = kwargs.pop("headers", {})
        headers["Authorization"] = f"Bearer {token}"

        return requests.request(
            method,
            f"{self.gateway_url}{endpoint}",
            headers=headers,
            **kwargs
        )


# Usage example
if __name__ == "__main__":
    client = AuthClient(
        gateway_url="https://gateway.example.com",
        api_key="your-api-key"
    )

    # Get a token
    token = client.get_token()
    print(f"Token obtained: {token[:50]}...")

    # Make authenticated requests
    response = client.make_authenticated_request("GET", "/api/protected-resource")
    print(f"Response: {response.json()}")
```

### Java Application
```java
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Authentication client for obtaining and managing JWT tokens.
 */
public class AuthClient {
    private final String gatewayUrl;
    private final String apiKey;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    private String token;
    private Instant tokenExpiry;

    public AuthClient(String gatewayUrl, String apiKey) {
        this.gatewayUrl = gatewayUrl.replaceAll("/$", "");
        this.apiKey = apiKey;
        this.httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Fetch a new JWT token from the authentication service.
     */
    public String getToken() throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(gatewayUrl + "/tokens"))
            .header("apikey", apiKey)
            .GET()
            .build();

        HttpResponse<String> response = httpClient.send(
            request,
            HttpResponse.BodyHandlers.ofString()
        );

        if (response.statusCode() != 200) {
            throw new RuntimeException("Failed to get token: " + response.statusCode());
        }

        JsonNode json = objectMapper.readTree(response.body());
        this.token = json.get("access_token").asText();
        int expiresIn = json.get("expires_in").asInt();
        this.tokenExpiry = Instant.now().plusSeconds(expiresIn);

        return this.token;
    }

    /**
     * Get a valid token, refreshing if necessary.
     */
    public String getValidToken() throws Exception {
        if (token == null || isTokenExpired()) {
            getToken();
        }
        return token;
    }

    /**
     * Check if token is expired or will expire within 60 seconds.
     */
    private boolean isTokenExpired() {
        return Instant.now().isAfter(tokenExpiry.minusSeconds(60));
    }

    /**
     * Make an authenticated GET request to a protected API endpoint.
     */
    public HttpResponse<String> makeAuthenticatedRequest(String endpoint) throws Exception {
        String validToken = getValidToken();

        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(gatewayUrl + endpoint))
            .header("Authorization", "Bearer " + validToken)
            .header("Content-Type", "application/json")
            .GET()
            .build();

        return httpClient.send(request, HttpResponse.BodyHandlers.ofString());
    }

    /**
     * Make an authenticated POST request to a protected API endpoint.
     */
    public HttpResponse<String> makeAuthenticatedPostRequest(
        String endpoint,
        String body
    ) throws Exception {
        String validToken = getValidToken();

        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(gatewayUrl + endpoint))
            .header("Authorization", "Bearer " + validToken)
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(body))
            .build();

        return httpClient.send(request, HttpResponse.BodyHandlers.ofString());
    }

    // Usage example
    public static void main(String[] args) throws Exception {
        AuthClient client = new AuthClient(
            "https://gateway.example.com",
            "your-api-key"
        );

        // Get a token
        String token = client.getToken();
        System.out.println("Token obtained: " + token.substring(0, 50) + "...");

        // Make authenticated requests
        HttpResponse<String> response = client.makeAuthenticatedRequest(
            "/api/protected-resource"
        );
        System.out.println("Response: " + response.body());
    }
}
```

## Performance Considerations

### Token Size
- **Typical size**: ~400-600 bytes
- **Network overhead**: Minimal for most applications
- **Compression**: Tokens compress well with gzip

### Generation Performance
- **Algorithm**: HS256 (fast symmetric encryption)
- **Native implementation**: Uses Web Crypto API for optimal performance
- **Throughput**: 100,000+ tokens/second capability

### Caching Strategy
- **Consumer secrets cached**: Reduces Kong API calls
- **Cache TTL**: 5 minutes default
- **Cache invalidation**: Manual via cache management API
- **High availability**: Redis cache for multi-instance deployments