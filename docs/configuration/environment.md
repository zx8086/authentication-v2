# Configuration Guide

## 4-Pillar Configuration Architecture

The authentication service implements a robust configuration pattern with comprehensive security validation:

| Pillar | Description |
|--------|-------------|
| **1. Defaults** | All baseline values with secure defaults |
| **2. Environment Mapping** | Explicit mapping with type safety |
| **3. Manual Loading** | Controlled loading with proper fallbacks |
| **4. Validation** | Zod v4 schema validation at end |

### Security Features
- **HTTPS Enforcement**: Kong Admin URL must use HTTPS in production
- **Token Validation**: Minimum 32-character requirement in production
- **Environment Validation**: Prevents localhost URLs in production
- **Immutability**: Runtime configuration changes prevented

---

## Required Environment Variables

### Kong Integration

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `KONG_MODE` | Deployment mode | `API_GATEWAY` or `KONNECT` | Yes |
| `KONG_ADMIN_URL` | Kong Admin API endpoint | `http://kong-admin:8001` | Yes |
| `KONG_ADMIN_TOKEN` | Admin API token | `Bearer xyz789...` | KONNECT only |
| `KONG_JWT_AUTHORITY` | JWT token issuer | `https://sts.example.com/` | Yes |
| `KONG_JWT_AUDIENCE` | JWT token audience | `http://api.example.com/` | Yes |
| `KONG_JWT_KEY_CLAIM_NAME` | Claim name for consumer key | `key` | No (default: `key`) |
| `JWT_EXPIRATION_MINUTES` | Token expiration | `15` | No (default: `15`) |

### Application Settings

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `PORT` | Server port | `3000` | No (default: `3000`) |
| `NODE_ENV` | Runtime environment | `development`, `production`, `test` | No |

**Port Notes**: Ports 1-1023 require special permissions. Use port mapping in Docker/K8s.

### OpenTelemetry

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `TELEMETRY_MODE` | Telemetry mode | `console`, `otlp`, `both` | No (default: `both`) |
| `OTEL_SERVICE_NAME` | Service name | `authentication-service` | No |
| `OTEL_SERVICE_VERSION` | Service version override | `1.0.0` | No |

**Version Sourcing:** The service version is automatically read from `package.json` at runtime. The `OTEL_SERVICE_VERSION` environment variable can override this for special deployments. This ensures version consistency between `telemetry.serviceVersion` and `apiInfo.version`.
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Base OTLP endpoint | `http://otel-collector:4318` | No |
| `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` | Traces endpoint | `https://otel.example.com/v1/traces` | No |
| `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` | Metrics endpoint | `https://otel.example.com/v1/metrics` | No |
| `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT` | Logs endpoint | `https://otel.example.com/v1/logs` | No |
| `OTEL_EXPORTER_OTLP_TIMEOUT` | Export timeout (ms) | `30000` | No |
| `OTEL_BSP_MAX_EXPORT_BATCH_SIZE` | Batch size | `2048` | No |
| `OTEL_BSP_MAX_QUEUE_SIZE` | Queue size | `10000` | No |

### Kong Circuit Breaker

| Variable | Description | Default | Range |
|----------|-------------|---------|-------|
| `CIRCUIT_BREAKER_ENABLED` | Enable circuit breaker | `true` | boolean |
| `CIRCUIT_BREAKER_TIMEOUT` | Request timeout (ms) | `5000` | 100-10000 |
| `CIRCUIT_BREAKER_ERROR_THRESHOLD` | Error threshold (%) | `50` | 1-100 |
| `CIRCUIT_BREAKER_RESET_TIMEOUT` | Reset timeout (ms) | `60000` | 1000-300000 |
| `CIRCUIT_BREAKER_VOLUME_THRESHOLD` | Min requests before tripping | `3` | 1-100 |
| `CIRCUIT_BREAKER_ROLLING_COUNT_TIMEOUT` | Rolling window (ms) | `10000` | 1000-60000 |
| `CIRCUIT_BREAKER_ROLLING_COUNT_BUCKETS` | Rolling window buckets | `10` | 1-20 |
| `STALE_DATA_TOLERANCE_MINUTES` | Stale cache window | `30` | 5-240 |
| `HIGH_AVAILABILITY` | Enable Redis stale cache | `false` | boolean |

### Kong Settings

| Variable | Description | Default | Range |
|----------|-------------|---------|-------|
| `KONG_SECRET_CREATION_MAX_RETRIES` | Secret creation retry attempts | `3` | 1-10 |
| `KONG_MAX_HEADER_LENGTH` | Maximum header length | `256` | 64-8192 |

### Telemetry Circuit Breaker

| Variable | Description | Default | Range |
|----------|-------------|---------|-------|
| `TELEMETRY_CB_FAILURE_THRESHOLD` | Failures before opening | `5` | 1-100 |
| `TELEMETRY_CB_RECOVERY_TIMEOUT` | Recovery timeout (ms) | `60000` | 1000-600000 |
| `TELEMETRY_CB_SUCCESS_THRESHOLD` | Successes to close | `3` | 1-20 |
| `TELEMETRY_CB_MONITORING_INTERVAL` | Monitoring interval (ms) | `10000` | 1000-60000 |

#### Per-Operation Overrides

Circuit breaker supports operation-specific settings:

```typescript
// Example: config.ts
operations: {
  getConsumerSecret: {
    timeout: 3000,                // 3s for secret retrieval
    errorThresholdPercentage: 40  // 40% threshold
  },
  healthCheck: {
    timeout: 2000,                // 2s for health checks
    errorThresholdPercentage: 60  // 60% threshold (tolerant)
  }
}
```

### Redis/Valkey Cache (High-Availability Mode)

The service supports both Redis and Valkey as cache backends. Server type is automatically detected at runtime using the `INFO server` command.

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `HIGH_AVAILABILITY` | Enable Redis/Valkey stale cache | `false` | No |
| `REDIS_URL` | Connection URL | `redis://localhost:6379` | No |
| `REDIS_PASSWORD` | Authentication password | - | No |
| `REDIS_DB` | Database number | `0` | No |
| `REDIS_MAX_RETRIES` | Retry attempts | `3` | No |
| `REDIS_CONNECTION_TIMEOUT` | Connection timeout (ms) | `5000` | No |
| `CACHE_HEALTH_TTL_MS` | Health check cache TTL (ms) | `2000` | No |

**Redis vs Valkey:**
- Both use the `redis://` protocol scheme
- Valkey is a Redis-compatible alternative (fork)
- The service auto-detects the server type and displays it in health endpoints
- DevContainer provides both: Redis on port 6379, Valkey on port 6380

### API Documentation

| Variable | Description | Required |
|----------|-------------|----------|
| `API_CORS` | CORS origin | No (default: `*`) |
| `API_TITLE` | OpenAPI title | No |
| `API_DESCRIPTION` | API description | No |
| `API_VERSION` | API version | No |
| `API_CONTACT_NAME` | Contact name | No |
| `API_CONTACT_EMAIL` | Contact email | No |

### Request Validation (API Best Practices)

| Variable | Description | Default | Range |
|----------|-------------|---------|-------|
| `MAX_REQUEST_BODY_SIZE` | Maximum request body size (bytes) | `10485760` (10MB) | 1KB-100MB |
| `REQUEST_TIMEOUT_MS` | Request processing timeout (ms) | `30000` (30s) | 1000-120000 |

These settings are part of the API best practices implementation. See [api-best-practices.md](../development/api-best-practices.md) for details.

---

## Example Configuration

### Development
```bash
# .env
PORT=3000
NODE_ENV=development
TELEMETRY_MODE=console

KONG_MODE=API_GATEWAY
KONG_ADMIN_URL=http://192.168.178.3:30001
KONG_JWT_AUTHORITY=http://sts.example.com/
KONG_JWT_AUDIENCE=http://api.example.com/
```

### Production
```bash
# .env.production
PORT=3000
NODE_ENV=production
TELEMETRY_MODE=otlp

KONG_MODE=KONNECT
KONG_ADMIN_URL=https://us.api.konghq.com/v2/control-planes/abc123
KONG_ADMIN_TOKEN=kpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
KONG_JWT_AUTHORITY=https://sts.example.com/
KONG_JWT_AUDIENCE=https://api.example.com/

# High Availability (Redis or Valkey)
HIGH_AVAILABILITY=true
REDIS_URL=rediss://redis.example.com:6380
STALE_DATA_TOLERANCE_MINUTES=120

# OpenTelemetry
OTEL_EXPORTER_OTLP_ENDPOINT=https://otel.example.com
```

---

## CORS Configuration

CORS headers are configurable via `API_CORS`:

```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": config.apiInfo.cors,  // API_CORS value
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Consumer-ID, X-Consumer-Username",
  "Access-Control-Max-Age": "86400"
};
```

- **Default**: `*` (allows all origins)
- **Production**: Use specific origins (e.g., `https://app.example.com`)

---

## Dependencies

### Runtime Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@opentelemetry/*` | Various | Observability stack (traces, metrics, logs) |
| `opossum` | ^9.0.0 | Circuit breaker for Kong API protection |
| `redis` | ^5.8.3 | Cache backend for HA mode |
| `winston` | ^3.18.3 | Structured logging with ECS format |
| `zod` | ^4.1.12 | Schema validation |

### Development Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@biomejs/biome` | ^2.2.5 | Linting and formatting |
| `@playwright/test` | ^1.56.0 | E2E testing |
| `@types/bun` | 1.2.23 | Bun runtime types |
| `typescript` | ^5.9.3 | TypeScript compiler |

### Minimum Requirements

| Requirement | Value |
|-------------|-------|
| Bun Runtime | >= 1.1.35 (recommended 1.3.9+) |
| Memory | 512MB min, 1GB recommended |
| CPU | Single core sufficient |
| Container Size | 58MB (distroless base) |

---

## Core Configuration Files

| File | Purpose |
|------|---------|
| `src/config/defaults.ts` | Pillar 1: Default configuration values |
| `src/config/envMapping.ts` | Pillar 2: Environment variable mappings |
| `src/config/loader.ts` | Pillar 3: Configuration loading and merging |
| `src/config/schemas.ts` | Pillar 4: Zod schema validation |
| `src/config/config.ts` | Configuration getters and cache |
| `src/config/index.ts` | Module exports |

## Type Definitions

| File | Purpose |
|------|---------|
| `src/types/circuit-breaker.types.ts` | Circuit breaker types (opossum + telemetry) |
