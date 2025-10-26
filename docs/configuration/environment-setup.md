# Configuration Guide

## 4-Pillar Configuration Architecture

The authentication service implements a robust 4-pillar configuration pattern with comprehensive security validation and circuit breaker integration:

### Configuration Structure
1. **Pillar 1**: Default Configuration Object - All baseline values with secure defaults
2. **Pillar 2**: Environment Variable Mapping - Explicit mapping with type safety
3. **Pillar 3**: Manual Configuration Loading - Controlled loading with proper fallbacks
4. **Pillar 4**: Validation at End - Comprehensive Zod v4 schema validation with top-level format functions

### Enhanced Security Features
- **HTTPS Enforcement**: All telemetry endpoints must use HTTPS in production
- **Token Security Validation**: Minimum 32-character requirement for Kong admin tokens
- **Environment Validation**: Prevents localhost URLs and weak configurations in production
- **Configuration Immutability**: Runtime configuration changes are prevented
- **Circuit Breaker Configuration**: Resilience patterns with failure threshold management
- **4-Pillar Compliance**: Full compliance with enterprise configuration standards

## Required Environment Variables

### Kong Integration
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

### Application Settings
| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `PORT` | Server port | `3000` | No (default: `3000`) |
| `NODE_ENV` | Runtime environment | `development`, `production`, `test` | No (default: `development`) |

### OpenTelemetry Configuration
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

### Circuit Breaker Configuration
| Variable | Description | Example | Security Notes | Required |
|----------|-------------|---------|----------------|----------|
| `CIRCUIT_BREAKER_TIMEOUT` | Request timeout in milliseconds | `500` | Range: 100-10000ms | No (default: `500`) |
| `CIRCUIT_BREAKER_ERROR_THRESHOLD` | Error threshold percentage | `50` | Range: 1-100% | No (default: `50`) |
| `CIRCUIT_BREAKER_RESET_TIMEOUT` | Circuit reset timeout in milliseconds | `30000` | Range: 1000-300000ms | No (default: `30000`) |
| `STALE_DATA_TOLERANCE_MINUTES` | Stale cache tolerance in minutes | `60` | Range: 1-120 minutes | No (default: `60`) |
| `HIGH_AVAILABILITY` | Enable Redis stale cache integration | `true` | HA mode for extended resilience | No (default: `false`) |

### Redis Cache Configuration (High-Availability Mode)
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

### API Documentation Configuration
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

## Configuration Architecture Implementation

### Core Configuration Files
- **`src/config/schemas.ts`**: Zod v4.1.12 schema definitions with top-level format functions
- **`src/config/config.ts`**: 4-pillar configuration implementation with enhanced security validation
- **`src/config/index.ts`**: Re-export hub for clean module imports
- Circuit breaker thresholds and timeout configurations integrated throughout

### Configuration Pattern Benefits
- **Type Safety**: Comprehensive Zod v4 validation with TypeScript integration
- **Security Validation**: Production-ready checks for HTTPS, token length, environment restrictions
- **Immutability**: Configuration locked at startup to prevent runtime mutations
- **Environment Flexibility**: Support for multiple deployment environments
- **Error Clarity**: Detailed validation messages for configuration issues
- **Resilience Integration**: Circuit breaker and timeout configuration management
- **4-Pillar Architecture**: Enterprise-grade configuration management pattern

### Security Validation Features
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

## CORS Configuration

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