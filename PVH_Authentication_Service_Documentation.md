# PVH Authentication Service - Comprehensive Documentation

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Kong Gateway Integration Context](#kong-gateway-integration-context)
4. [Authentication Flow](#authentication-flow)
5. [Technical Implementation](#technical-implementation)
6. [Configuration Guide](#configuration-guide)
7. [API Reference](#api-reference)
8. [Deployment & Operations](#deployment--operations)
9. [Security Considerations](#security-considerations)
10. [Practical Usage Examples](#practical-usage-examples)

---

## Executive Summary

### Service Purpose
The PVH Authentication Service is a specialized microservice that bridges Kong API Gateway's consumer management system with JWT token generation. It serves as the central authentication authority for the PVH ecosystem, issuing secure, short-lived JWT tokens to authenticated consumers.

**Important**: This service is NOT a proxy - it's purely a JWT token issuer. Applications obtain a JWT token from this service once, then use that token directly with backend services through Kong Gateway.

### Key Responsibilities
- **JWT Token Generation**: Creates signed JWT tokens for authenticated Kong consumers
- **Consumer Secret Management**: Interfaces with Kong Admin API to retrieve or create consumer secrets
- **Security Enforcement**: Validates consumer authentication status and blocks anonymous access
- **Token Standardization**: Ensures consistent JWT structure and claims across the PVH platform

### Core Capabilities
- Issues JWT tokens with 15-minute expiration
- Automatically provisions JWT secrets for new consumers
- Integrates with Kong Gateway's consumer authentication
- Provides distributed tracing via OpenTelemetry
- Supports CORS for browser-based applications
- Offers health check endpoints for monitoring

---

## Architecture Overview

### System Architecture

```
┌─────────────────┐      ┌─────────────────┐      ┌──────────────────┐
│   Client App    │──────▶│  Kong Gateway   │──────▶│  Auth Service    │
└─────────────────┘      └─────────────────┘      └──────────────────┘
                                  │                          │
                                  │                          │
                          ┌───────▼────────┐        ┌───────▼────────┐
                          │ Kong Admin API │        │ Consumer Secret │
                          │   (Consumers)  │◀───────│   Management    │
                          └────────────────┘        └────────────────┘
```

### Component Dependencies

#### External Dependencies
- **Kong Gateway**: Provides consumer authentication and request routing
- **Kong Admin API**: Manages consumer secrets and JWT configurations
- **OpenTelemetry Collector**: Receives distributed tracing data

#### Internal Components
- **TokenController**: Main HTTP endpoint for token issuance
- **ConsumerService**: Kong Admin API client for secret management
- **Startup Configuration**: Service initialization and dependency injection
- **Health Checks**: Monitoring endpoints

### Technology Stack
- **Framework**: ASP.NET Core 3.1
- **Language**: C#
- **Container**: Docker with Alpine Linux base
- **Monitoring**: OpenTelemetry with OTLP exporter
- **API Documentation**: Swagger/OpenAPI
- **Testing**: xUnit with NSubstitute mocking

---

## Kong Gateway Integration Context

### Role in the Kong Ecosystem

The authentication service operates as a critical component within the Kong Gateway architecture, serving as the JWT token issuer for the entire API ecosystem. Understanding its role requires understanding Kong's two-phase authentication model:

#### Phase 1: Initial Authentication (Getting JWT)
1. **Client authenticates with Kong** using API key (`key-auth` plugin)
2. **Kong validates credentials** and identifies the consumer
3. **Kong forwards request** to authentication service with consumer headers
4. **Authentication service issues JWT** valid for 15 minutes
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
    anonymous: 871df7cc-79f8-4f3b-a195-265f2ecff22a  # Anonymous consumer UUID
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
- **UUID**: `871df7cc-79f8-4f3b-a195-265f2ecff22a`
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

### Service Configuration in Kong

#### Authentication Service Route
```yaml
services:
- name: authentication
  enabled: true
  host: authentication.prd.shared-services.eu.pvh.cloud
  port: 443
  protocol: https
  routes:
  - name: authentication
    hosts:
    - gateway.prd.shared-services.eu.pvh.cloud
    - api-europe.pvhcorp.com
    paths:
    - /tokens
    plugins:
    - name: key-auth  # Requires API key to get JWT
```

#### Protected Service Example
```yaml
services:
- name: customer-assignments
  host: customer-assignments.prd.shared-services.eu.pvh.cloud
  routes:
  - name: customer-assignments
    paths:
    - /customer-assignments
  plugins:
  - name: jwt  # Requires JWT from authentication service
    config:
      anonymous: 871df7cc-79f8-4f3b-a195-265f2ecff22a  # Fallback for public access
```

### Request Flow Comparison

#### Getting a JWT Token (via Authentication Service)
```
┌────────┐      ┌──────────────┐      ┌─────────────────┐
│ Client │─────▶│ Kong Gateway │─────▶│ Auth Service    │
│        │◀─────│ (key-auth)   │◀─────│ (/tokens)       │
└────────┘      └──────────────┘      └─────────────────┘
    │               │                        │
    │ API Key       │ X-Consumer-* Headers  │ JWT Secret
    ▼               ▼                        ▼
```

#### Using JWT for API Access (Direct to Services)
```
┌────────┐      ┌──────────────┐      ┌─────────────────┐
│ Client │─────▶│ Kong Gateway │─────▶│ Backend Service │
│        │◀─────│ (jwt plugin) │◀─────│ (protected)     │
└────────┘      └──────────────┘      └─────────────────┘
    │               │                        │
    │ JWT Token     │ Validated Claims      │ Business Logic
    ▼               ▼                        ▼
```

### Kong Consumer Management

#### Consumer Structure in Kong
```json
{
  "id": "6a864ae2-b635-4bcb-9362-1406879108b7",
  "username": "pvh-consumer",
  "custom_id": "external-system-id",
  "tags": ["production", "europe"],
  "jwt_secrets": [
    {
      "key": "abc123def456",
      "secret": "x8f3k9dm2p5v7q1w4e6r8t0y",
      "algorithm": "HS256"
    }
  ]
}
```

#### Consumer Secret Lifecycle
1. **Consumer Creation**: Admin creates consumer in Kong
2. **API Key Assignment**: Consumer gets API key for initial auth
3. **JWT Secret Generation**: Authentication service creates JWT secret on first token request
4. **Secret Storage**: Kong stores JWT secret for validation
5. **Token Issuance**: Authentication service uses secret to sign tokens
6. **Token Validation**: Kong uses same secret to validate tokens

---

## Authentication Flow

### Complete Authentication Flow with Kong Plugins

#### Phase 1: Obtaining JWT Token

##### 1. Client Requests JWT Token
```http
GET /tokens HTTP/1.1
Host: gateway.prd.shared-services.eu.pvh.cloud
apikey: consumer-api-key-12345
```

##### 2. Kong Key-Auth Plugin Processing
- Validates API key against consumer database
- Identifies consumer: `pvh-consumer`
- Adds upstream headers for authentication service

##### 3. Kong Adds Upstream Headers
After successful authentication, Kong adds headers to the upstream request:
```
X-Consumer-ID: 6a864ae2-b635-4bcb-9362-1406879108b7
X-Consumer-Username: pvh-consumer
X-Anonymous-Consumer: false
```

##### 4. Request Reaches Authentication Service
```http
GET /tokens HTTP/1.1
Host: authentication.prd.shared-services.eu.pvh.cloud
X-Consumer-ID: 6a864ae2-b635-4bcb-9362-1406879108b7
X-Consumer-Username: pvh-consumer
X-Anonymous-Consumer: false
```

##### 5. Authentication Service Validates Headers
- Checks for `X-Consumer-ID` presence
- Verifies `X-Anonymous-Consumer` is not "true"
- Returns 401 if validation fails

##### 6. Retrieve/Create Consumer Secret via Kong Admin API
- Fetches existing JWT secrets from Kong
- Creates new secret if none exists
- Uses secret to sign JWT token

##### 7. Generate and Return JWT Token
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
Host: gateway.prd.shared-services.eu.pvh.cloud
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
- Anonymous consumer has UUID: `871df7cc-79f8-4f3b-a195-265f2ecff22a`

### Flow Diagram
```
┌──────────┐     ┌─────────┐     ┌───────────┐     ┌──────────┐
│  Client  │────▶│  Kong   │────▶│   Auth    │────▶│  Kong    │
│          │◀────│ Gateway │◀────│  Service  │◀────│  Admin   │
└──────────┘     └─────────┘     └───────────┘     └──────────┘
     │                │                │                 │
     │ 1. Request     │ 2. Add Headers │ 3. Get Secret  │
     │                │                │                 │
     │ 8. JWT Token   │ 7. Response    │ 4. Secret      │
     ▼                ▼                ▼                 ▼
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
```json
{
  "sub": "pvh-consumer",                              // Consumer username
  "iss": "https://sts-api.pvhcorp.com/",             // Token issuer
  "aud": "http://api.pvhcorp.com/",                  // Token audience
  "jti": "550e8400-e29b-41d4-a716-446655440000",     // Unique token ID
  "iat": 1634567890,                                  // Issued at (Unix timestamp)
  "exp": 1634568790,                                  // Expires at (Unix timestamp)
  "nbf": 1634567890,                                  // Not before (Unix timestamp)
  "name": "pvh-consumer",                             // Consumer name claim
  "unique_name": "pvhcorp.com#pvh-consumer",         // Unique identifier
  "key": "abc123def456"                              // Kong consumer key
}
```

#### Token Signature
- Algorithm: HMAC SHA-256
- Secret: Consumer-specific secret from Kong
- Encoding: Base64URL

### Consumer Secret Management

#### Secret Structure
```csharp
public class ConsumerSecret {
    public string Secret { get; set; }     // HMAC signing secret (e.g., "x8f3k9dm...")
    public string Key { get; set; }        // Public key identifier (e.g., "abc123...")
    public string Algorithm { get; set; }  // Always "HS256"
    public string ConsumerId { get; set; } // Kong consumer ID
}
```

#### Secret Lifecycle
1. **Creation**: Automatically created when consumer first requests token
2. **Storage**: Managed by Kong Admin API
3. **Retrieval**: Fetched on each token request
4. **Rotation**: Can be rotated via Kong Admin API
5. **Revocation**: Deleted through Kong Admin API

### Error Handling

#### HTTP Status Codes
| Status Code | Scenario | Response Body |
|------------|----------|---------------|
| 200 OK | Successful token generation | JWT token + expiry |
| 401 Unauthorized | Missing consumer ID or anonymous consumer | Empty |
| 404 Not Found | Consumer secret creation failed | Empty |
| 500 Internal Server Error | Unexpected errors | Error details |

#### Error Scenarios and Handling
```csharp
// Scenario 1: Missing Kong headers
if (!Request.Headers.ContainsKey("X-Consumer-ID")) {
    return Unauthorized();  // 401
}

// Scenario 2: Anonymous consumer
if (Request.Headers["X-Anonymous-Consumer"] == "true") {
    return Unauthorized();  // 401
}

// Scenario 3: Secret creation failure
consumerSecret = await consumerService.New(consumerId);
if (consumerSecret == null) {
    return NotFound();  // 404
}
```

### Dependency Injection

```csharp
// Service registration in Startup.cs
public void ConfigureExternalServices(IServiceCollection services) {
    // Kong JWT settings
    services.AddSingleton(new KongJWTSettings {
        Authority = Configuration.GetValue<string>("KONG_JWT_AUTHORITY"),
        Audience = Configuration.GetValue<string>("KONG_JWT_AUDIENCE"),
        KeyClaimName = Configuration.GetValue<string>("KONG_JWT_KEY_CLAIM_NAME")
    });

    // Kong consumer service
    services.AddScoped<IConsumerService, ConsumerService>((p) =>
        new ConsumerService(
            Configuration.GetValue<string>("KONG_ADMIN_URL"),
            Configuration.GetValue<string>("KONG_ADMIN_TOKEN"),
            p.GetService<ILoggerFactory>()
        )
    );

    // OpenTelemetry tracing
    services.AddOpenTelemetryTracing(builder => builder
        .SetResourceBuilder(ResourceBuilder.CreateDefault()
            .AddService("authentication-api"))
        .AddAspNetCoreInstrumentation()
        .AddOtlpExporter(exp => {
            exp.Endpoint = new Uri(Configuration.GetValue<string>("OPEN_TELEMETRY_ENDPOINT"));
            exp.Protocol = OtlpExportProtocol.HttpProtobuf;
        })
    );
}
```

---

## Configuration Guide

### Required Environment Variables

#### Kong Integration
| Variable | Description | Example |
|----------|-------------|---------|
| `KONG_ADMIN_URL` | Kong Admin API endpoint | `http://kong-admin.pvhcorp.com:8001` |
| `KONG_ADMIN_TOKEN` | Kong Admin API authentication token | `Bearer xyz789...` |
| `KONG_JWT_AUTHORITY` | JWT token issuer | `https://sts-api.pvhcorp.com/` |
| `KONG_JWT_AUDIENCE` | JWT token audience | `http://api.pvhcorp.com/` |
| `KONG_JWT_KEY_CLAIM_NAME` | Claim name for consumer key | `key` or `iss` |

#### Application Settings
| Variable | Description | Example |
|----------|-------------|---------|
| `API_CORS` | Allowed CORS origins | `https://webapp.pvhcorp.com` |
| `OPEN_TELEMETRY_ENDPOINT` | OpenTelemetry collector URL | `http://otel.pvhcorp.com:4318/v1/traces` |
| `ASPNETCORE_URLS` | Kestrel listening URLs | `http://+:80` |
| `ASPNETCORE_ENVIRONMENT` | Runtime environment | `Development`, `Production` |

### Package Dependencies

#### Core Dependencies
```xml
<PackageReference Include="Microsoft.AspNetCore" Version="2.1.4" />
<PackageReference Include="Microsoft.AspNetCore.Authentication.JwtBearer" Version="2.1.2" />
<PackageReference Include="Microsoft.AspNetCore.Mvc" Version="2.1.3" />
```

#### Kong Integration
```xml
<PackageReference Include="PVH.Services.Security.Kong" Version="1.0.10" />
```

#### Monitoring & Telemetry
```xml
<PackageReference Include="OpenTelemetry.Exporter.OpenTelemetryProtocol" Version="1.3.1" />
<PackageReference Include="OpenTelemetry.Extensions.Hosting" Version="1.0.0-rc9.9" />
<PackageReference Include="OpenTelemetry.Instrumentation.AspNetCore" Version="1.0.0-rc9.9" />
```

#### API Documentation
```xml
<PackageReference Include="Swashbuckle.AspNetCore.Swagger" Version="6.4.0" />
<PackageReference Include="Swashbuckle.AspNetCore.SwaggerGen" Version="6.4.0" />
<PackageReference Include="Swashbuckle.AspNetCore.SwaggerUI" Version="6.4.0" />
```

### CORS Configuration

```csharp
services.AddCors(options => {
    options.AddPolicy("cors:default", policy => {
        var origins = Configuration.GetValue<string>("API_CORS");
        policy.WithOrigins(origins)
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});
```

CORS is required when:
- Web browsers directly call the authentication service
- Frontend applications need cross-origin access
- Testing from local development environments

---

## API Reference

### Endpoints

#### GET /tokens
Issues a new JWT token for authenticated consumers.

**Request**
```http
GET /tokens HTTP/1.1
Host: auth-service.pvhcorp.com
X-Consumer-ID: 6a864ae2-b635-4bcb-9362-1406879108b7
X-Consumer-Username: pvh-consumer
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
| `expires_in` | Integer | Token lifetime in seconds (900 = 15 minutes) |

**Response - Unauthorized (401)**
- Missing `X-Consumer-ID` header
- `X-Anonymous-Consumer` is "true"
- No response body

**Response - Not Found (404)**
- Consumer secret creation failed
- No response body

#### GET /health
Health check endpoint for monitoring.

**Request**
```http
GET /health HTTP/1.1
Host: auth-service.pvhcorp.com
```

**Response - Healthy (200 OK)**
```json
"Healthy"
```

### Swagger Documentation

The service exposes Swagger documentation at:
- **Swagger JSON**: `/authentication/v1/swagger.json`
- **Swagger UI**: `/authentication/v1/swagger-ui`

---

## Deployment & Operations

### Docker Build Process

#### Multi-Stage Dockerfile
```dockerfile
# Stage 1: Build environment
FROM mcr.microsoft.com/dotnet/core/sdk:3.1-alpine AS build-env
WORKDIR /app
COPY ./PVH.Services.Authentication.sln ./
COPY ./src/PVH.Services.Authentication.csproj ./src/
COPY ./tests/PVH.Services.Authentication.Tests.csproj ./tests/
RUN dotnet restore PVH.Services.Authentication.sln
COPY . ./

# Stage 2: Test target
FROM build-env as test
ENTRYPOINT ["dotnet", "test", "tests/PVH.Services.Authentication.Tests.csproj"]

# Stage 3: Publish
FROM build-env as publish
RUN dotnet publish src/PVH.Services.Authentication.csproj -c Release -o out

# Stage 4: Runtime
FROM mcr.microsoft.com/dotnet/core/sdk:3.1-alpine as release
WORKDIR /app
COPY --from=publish /app/out .
CMD ["dotnet", "PVH.Services.Authentication.dll"]
```

### Build Commands

#### Local Development
```bash
# Restore dependencies
dotnet restore PVH.Services.Authentication.sln

# Build the solution
dotnet build PVH.Services.Authentication.sln

# Run locally
dotnet run --project src/PVH.Services.Authentication.csproj

# Run tests
dotnet test tests/PVH.Services.Authentication.Tests.csproj
```

#### Docker Operations
```bash
# Build Docker image
make docker-build
# or
docker build -t api-authentication:latest .

# Run tests in Docker
make test
# or
docker build -t api-authentication-test --target test .
docker run --rm api-authentication-test

# Run service in Docker
make run
# or
docker run -p 5000:80 -d --rm api-authentication:latest

# Run with environment variables
docker run -p 5000:80 -d --rm \
  -e KONG_ADMIN_URL=http://kong-admin:8001 \
  -e KONG_ADMIN_TOKEN=secret123 \
  -e KONG_JWT_AUTHORITY=https://sts-api.pvhcorp.com/ \
  -e KONG_JWT_AUDIENCE=http://api.pvhcorp.com/ \
  -e KONG_JWT_KEY_CLAIM_NAME=key \
  -e API_CORS=https://webapp.pvhcorp.com \
  -e OPEN_TELEMETRY_ENDPOINT=http://otel:4318/v1/traces \
  api-authentication:latest
```

### Testing

#### Unit Tests
```bash
# Run tests with console output
dotnet test tests/PVH.Services.Authentication.Tests.csproj

# Run tests with NUnit XML output
dotnet test tests/PVH.Services.Authentication.Tests.csproj \
  --test-adapter-path:. \
  --logger:"nunit;LogFilePath=/test-reports/unit-tests.xml"

# Run tests in Docker
docker run -v $(pwd)/test-reports:/test-reports --rm api-authentication-test
```

#### Load Testing
```bash
# Run Taurus load tests
make test-load
# or
docker run \
  -v $(pwd)/tests/load-tests/scripts/:/bzt-configs \
  -v $(pwd)/tests/load-tests/artifacts/:/tmp/artifacts \
  blazemeter/taurus test.yml
```

### Health Monitoring

#### Health Check Endpoint
```bash
# Check service health
curl http://auth-service.pvhcorp.com/health

# Response when healthy
"Healthy"
```

#### OpenTelemetry Metrics
The service exports traces to OpenTelemetry collector:
- Service name: `authentication-api`
- Deployment environment: From `ASPNETCORE_ENVIRONMENT`
- Export protocol: HTTP/protobuf
- Traces include:
  - HTTP request/response metrics
  - Consumer service calls
  - JWT generation timing

### Deployment Pipeline

#### CI/CD with Bamboo
```yaml
# bamboo-specs/bamboo.yml configuration
- Build Docker image with commit SHA tag
- Run unit tests and collect results
- Push image to Docker registry
- Deploy using Ansible Tower
```

#### Makefile Targets
```bash
make run          # Build and run locally
make test         # Build and run tests
make test-load    # Run load tests
make publish      # Build and push Docker image
make deploy       # Deploy using Ansible
```

---

## Security Considerations

### Token Security

#### Token Expiration Strategy
- **Default TTL**: 15 minutes
- **Rationale**: Balances security with user experience
- **Clock Skew**: Uses `notBefore` claim to handle time synchronization
- **No Refresh Tokens**: Clients must re-authenticate for new tokens

#### Secret Management
- **Storage**: Secrets never stored in application code or configuration
- **Transmission**: Secrets retrieved over secure Kong Admin API
- **Rotation**: Support for secret rotation through Kong Admin API
- **Isolation**: Each consumer has unique secrets

### Network Security

#### Transport Security
- **HTTPS Required**: Production deployments must use TLS
- **Certificate Validation**: Proper certificate chains for Kong Admin API
- **Header Validation**: Strict validation of Kong upstream headers

#### CORS Security
- **Specific Origins**: Configure exact allowed origins, avoid wildcards
- **Credential Support**: CORS configuration allows credentials if needed
- **Method Restrictions**: Can be configured to limit HTTP methods

### Authentication Chain

#### Defense in Depth
1. **Kong Gateway**: First line of defense with authentication plugins
2. **Header Validation**: Service validates Kong-provided headers
3. **Anonymous Blocking**: Explicit rejection of anonymous consumers
4. **Secret Verification**: Consumer must have valid secret in Kong

#### Security Headers
The service relies on Kong to provide security headers:
- Kong strips original authorization headers
- Kong adds authenticated consumer information
- Service trusts only Kong-provided headers

### Operational Security

#### Monitoring & Alerting
- **Failed Authentication**: Monitor 401 responses for attack patterns
- **Secret Creation Failures**: Alert on 404 responses indicating issues
- **Token Generation Rate**: Monitor for unusual token generation patterns
- **OpenTelemetry Traces**: Track authentication flow for anomalies

#### Secret Rotation Process
1. Create new secret in Kong Admin API
2. Update consumer with new secret
3. Existing tokens remain valid until expiration
4. Delete old secret after transition period

#### Incident Response
- **Compromised Secret**: Immediately delete in Kong Admin API
- **Suspicious Activity**: Review OpenTelemetry traces
- **Service Unavailability**: Health checks trigger alerts
- **Token Abuse**: Kong rate limiting on consumer level

### Best Practices

#### Configuration Security
- Never commit secrets to version control
- Use environment variables for all sensitive configuration
- Implement least-privilege access for Kong Admin API token
- Regular audit of consumer secrets

#### Deployment Security
- Use minimal Docker base images (Alpine Linux)
- Regular security updates for base images
- Non-root user in container
- Read-only root filesystem where possible

#### Development Security
- Separate development/production Kong instances
- Mock Kong services in unit tests
- No production secrets in development
- Security scanning in CI/CD pipeline

---

## Appendix

### Troubleshooting Guide

| Issue | Possible Cause | Solution |
|-------|---------------|----------|
| 401 Unauthorized | Missing Kong headers | Verify Kong authentication plugins are configured |
| 401 Unauthorized | Anonymous consumer | Check Kong consumer configuration |
| 404 Not Found | Secret creation failed | Verify Kong Admin API connectivity and permissions |
| Connection refused | Wrong Kong Admin URL | Check KONG_ADMIN_URL environment variable |
| Invalid token signature | Secret mismatch | Verify consumer secret in Kong matches signing secret |
| Token expired immediately | Clock skew | Synchronize time between services |

### Migration Notes

When migrating to this service:
1. Ensure Kong Gateway is properly configured
2. Create JWT plugin configurations in Kong
3. Migrate existing consumer secrets to Kong
4. Update client applications to use new token endpoint
5. Plan for 15-minute token expiration
6. Implement token refresh logic in clients

### Support Resources

- **Kong Documentation**: https://docs.konghq.com
- **JWT Specification**: https://jwt.io/introduction/
- **OpenTelemetry**: https://opentelemetry.io/docs/
- **ASP.NET Core**: https://docs.microsoft.com/aspnet/core/

---

## Practical Usage Examples

### Complete Client Implementation Example

#### Step 1: Obtain JWT Token
```bash
# Get JWT token using API key
curl -X GET https://gateway.prd.shared-services.eu.pvh.cloud/tokens \
  -H "apikey: your-consumer-api-key-12345"

# Response:
# {
#   "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJwdmgtY29uc3VtZXIiLCJrZXkiOiJhYmMxMjNkZWY0NTYiLCJqdGkiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJpYXQiOjE2MzQ1Njc4OTAsIm5hbWUiOiJwdmgtY29uc3VtZXIiLCJ1bmlxdWVfbmFtZSI6InB2aGNvcnAuY29tI3B2aC1jb25zdW1lciIsImV4cCI6MTYzNDU2ODc5MCwiaXNzIjoiaHR0cHM6Ly9zdHMtYXBpLnB2aGNvcnAuY29tLyIsImF1ZCI6Imh0dHA6Ly9hcGkucHZoY29ycC5jb20vIn0.x8f3k9dmvR2K1nP5mX7Q9Z3yL4wB6",
#   "expires_in": 900
# }
```

#### Step 2: Use JWT for Protected Services
```bash
# Call protected service with JWT
curl -X GET https://gateway.prd.shared-services.eu.pvh.cloud/customer-assignments/123 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Call another protected service with same JWT
curl -X GET https://gateway.prd.shared-services.eu.pvh.cloud/images/product/456 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### JavaScript/Node.js Example
```javascript
const axios = require('axios');

class PVHApiClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.token = null;
    this.tokenExpiry = null;
    this.baseUrl = 'https://gateway.prd.shared-services.eu.pvh.cloud';
  }

  async getToken() {
    // Check if token exists and is still valid
    if (this.token && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.token;
    }

    // Get new token
    const response = await axios.get(`${this.baseUrl}/tokens`, {
      headers: { 'apikey': this.apiKey }
    });

    this.token = response.data.access_token;
    // Set expiry 30 seconds before actual expiry for safety
    this.tokenExpiry = new Date(Date.now() + (response.data.expires_in - 30) * 1000);

    return this.token;
  }

  async callApi(endpoint) {
    const token = await this.getToken();

    return axios.get(`${this.baseUrl}${endpoint}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
  }
}

// Usage
const client = new PVHApiClient('your-api-key-12345');
const customerData = await client.callApi('/customer-assignments/123');
```

### Python Example
```python
import requests
from datetime import datetime, timedelta

class PVHApiClient:
    def __init__(self, api_key):
        self.api_key = api_key
        self.token = None
        self.token_expiry = None
        self.base_url = 'https://gateway.prd.shared-services.eu.pvh.cloud'

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
client = PVHApiClient('your-api-key-12345')
customer_data = client.call_api('/customer-assignments/123')
```

### Common Scenarios

#### Scenario 1: Public Endpoint (Anonymous Consumer)
Some endpoints allow anonymous access via the configured anonymous consumer:

```bash
# This might work without authentication if anonymous consumer is configured
curl -X GET https://gateway.prd.shared-services.eu.pvh.cloud/prices-api-v2/public/catalog

# Kong will use anonymous consumer: 871df7cc-79f8-4f3b-a195-265f2ecff22a
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
curl -X GET https://gateway.prd.shared-services.eu.pvh.cloud/tokens \
  -H "apikey: valid-api-key" \
  -v
```

#### Test 2: Invalid API Key
```bash
# Should return 401 Unauthorized from Kong
curl -X GET https://gateway.prd.shared-services.eu.pvh.cloud/tokens \
  -H "apikey: invalid-key" \
  -v
```

#### Test 3: Expired JWT
```bash
# Wait 15+ minutes after getting token, then try to use it
# Should return 401 or fall back to anonymous consumer
curl -X GET https://gateway.prd.shared-services.eu.pvh.cloud/customer-assignments \
  -H "Authorization: Bearer expired-jwt-token" \
  -v
```

#### Test 4: No Authentication (Anonymous Fallback)
```bash
# Services with anonymous consumer configured will work
# Services without will return 401
curl -X GET https://gateway.prd.shared-services.eu.pvh.cloud/prices-api-v2/catalog \
  -v
```

### Important Implementation Notes

1. **Token Caching**: Always cache JWT tokens until expiry to avoid unnecessary calls to `/tokens`
2. **Expiry Buffer**: Refresh tokens 30-60 seconds before actual expiry to avoid edge cases
3. **Error Handling**: Implement retry logic for 401 errors with token refresh
4. **Parallel Requests**: Use the same token for concurrent API calls
5. **Anonymous Fallback**: Be aware that some endpoints may work without authentication
6. **Rate Limiting**: Kong may apply different rate limits to authenticated vs anonymous consumers

---

*Document Version: 1.1*
*Last Updated: October 2025*
*Service Version: PVH.Services.Authentication v1.0*