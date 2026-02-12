# Architecture Overview

## System Architecture

```
                         Client Application
                                |
                         [API Key Header]
                                |
                                v
                      +-------------------+
                      |   Kong Gateway    |
                      | (Key-Auth Plugin) |
                      +--------+----------+
                               |
                  [X-Consumer-ID, X-Consumer-Username]
                               |
                               v
+---------------------------------------------------------------+
|                     Authentication Service                     |
|                                                               |
|  +------------------+    +------------------+                 |
|  | Router Layer     |--->| Handler Layer    |                 |
|  | (Bun Routes API) |    | (tokens, health) |                 |
|  +------------------+    +--------+---------+                 |
|                                   |                           |
|  +------------------+    +--------v---------+                 |
|  | Middleware       |    | Service Layer    |                 |
|  | (error, CORS)    |    | (JWT, cache)     |                 |
|  +------------------+    +--------+---------+                 |
|                                   |                           |
|  +------------------+    +--------v---------+                 |
|  | Circuit Breaker  |<-->| Adapter Layer    |                 |
|  | (Opossum)        |    | (Kong Admin API) |                 |
|  +------------------+    +------------------+                 |
+---------------------------------------------------------------+
         |                          |                    |
         v                          v                    v
+----------------+    +------------------+    +------------------+
| Kong Admin API |    |  Unified Cache   |    |  OpenTelemetry   |
| (Consumers)    |    | (Redis/Memory)   |    |   Collector      |
+----------------+    +------------------+    +------------------+
```

## Layered Architecture

The service implements a clean layered architecture for maintainability and testability:

| Layer | Responsibility | Key Components |
|-------|----------------|----------------|
| **Router** | Route matching, handler dispatch | `src/routes/router.ts` |
| **Middleware** | Cross-cutting concerns, error handling | `error-handler.ts`, `cors.ts` |
| **Handler** | HTTP request/response, business orchestration | `tokens.ts`, `health.ts`, `metrics.ts` |
| **Service** | Core business logic, domain operations | `jwt.service.ts`, `cache-manager.ts` |
| **Adapter** | External system integration | `kong.adapter.ts`, Redis client |

## Technology Stack

| Category | Technology | Purpose |
|----------|------------|---------|
| Runtime | Bun v1.3.9+ | Native JavaScript runtime with parallel execution |
| Language | TypeScript | Type safety and developer experience |
| HTTP Server | Bun.serve() Routes API | Maximum performance (100k+ req/sec) |
| JWT | crypto.subtle Web API | HMAC-SHA256 signing (RFC 7519) |
| Caching | Redis + in-memory | Unified cache architecture with failover |
| Circuit Breaker | Opossum | Kong Admin API resilience |
| Container | DHI distroless base | 0 CVEs, 12/12 security score |
| Monitoring | OpenTelemetry + OTLP | Distributed tracing, metrics, logs |
| Testing | Bun Test + Playwright + K6 | Unit, E2E, performance testing |
| CI/CD | GitHub Actions | Parallel job execution |

## Performance Characteristics

| Metric | Target | Description |
|--------|--------|-------------|
| Throughput | 100,000+ req/sec | Native Bun Routes API |
| Memory | 50-80MB baseline | Optimized telemetry |
| Cold Start | <100ms | Hybrid caching strategy |
| Response Time | <10ms p99 | Token generation latency |
| Container Size | 58MB | Distroless multi-stage build |
| Cache Hit Rate | 90%+ | Memory-first hybrid strategy |

---

## Authentication Flow

### Why Use This Service?

**Without Authentication Service** (Direct Kong JWT):
- Clients must store and manage JWT signing secrets
- Every client needs JWT generation logic
- Secret rotation requires updating all clients
- Security risk: secrets in client applications

**With Authentication Service**:
- Clients only need an API key (no secrets)
- Simple HTTP call to get tokens
- Centralized secret management in Kong
- Instant revocation via Kong

### Architectural Comparison

| Aspect | Without Auth Service | With Auth Service |
|--------|---------------------|-------------------|
| Secret Management | Distributed to all clients | Centralized in Kong |
| Client Security | Secrets in client code | Only API key needed |
| Implementation | Complex JWT logic required | Simple HTTP call |
| Secret Rotation | Update all clients | Single Kong update |
| Audit Trail | Distributed across clients | Centralized logging |

### Token Generation Flow

```
1. Client sends API key to Kong Gateway
   GET /tokens
   Header: apikey: consumer-api-key-12345

2. Kong validates API key, adds consumer headers
   X-Consumer-ID: 98765432-...
   X-Consumer-Username: example-consumer
   X-Anonymous-Consumer: false

3. Auth Service validates headers, fetches consumer secret from Kong Admin API

4. Auth Service generates JWT token
   {
     "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
     "expires_in": 900
   }

5. Client uses JWT for subsequent API calls
   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Kong Mode Support

| Mode | Description | URL Format |
|------|-------------|------------|
| API_GATEWAY | Traditional self-hosted Kong | `http://kong-admin:8001` |
| KONNECT | Kong's cloud-native platform | `https://region.api.konghq.com/v2/control-planes/{id}` |

---

## Resilience: Circuit Breaker

The service implements circuit breaker protection with stale cache fallback for Kong Admin API outages.

### Circuit Breaker Configuration

| Setting | Value | Description |
|---------|-------|-------------|
| Timeout | 5 seconds | Per Kong API call |
| Error Threshold | 50% | Failure rate to open circuit |
| Reset Timeout | 60 seconds | Before testing recovery |
| Stale Tolerance | 30 minutes | Default stale data window |

### Failure Scenarios

| Kong Status | Cache Status | Circuit State | Behavior |
|-------------|--------------|---------------|----------|
| Available | Fresh | Closed | Normal operation |
| Available | Stale | Closed | Refresh cache from Kong |
| Unavailable | Fresh | Open | Use cache |
| Unavailable | Stale (<tolerance) | Open | Use stale cache (degraded) |
| Unavailable | Stale (>tolerance) | Open | Return AUTH_005 error |
| Unavailable | No cache | Open | Return AUTH_005 error |

### High Availability Mode

```bash
HIGH_AVAILABILITY=true
REDIS_ENABLED=true
STALE_DATA_TOLERANCE_MINUTES=120  # 2-hour fallback window
```

---

## Observability

### Distributed Tracing

W3C Trace Context propagation through the entire flow:

```
Client Request (traceparent header)
    |
    v
Kong Gateway (trace context preserved)
    |
    v
Auth Service
    |-- Parent Span: http.server.request
    |       |-- http.method = GET
    |       |-- http.route = /tokens
    |       |-- http.status_code = 200
    |
    |-- Child Span: kong.getConsumerSecret
    |       |-- kong.consumer_id = uuid
    |       |-- duration_ms = 12.4
    |
    |-- Child Span: jwt_create
    |       |-- jwt.username = consumer
    |       |-- duration_ms = 0.342
    |
    |-- Child Span: redis.get (if HA mode)
            |-- trace_id correlated
```

### Key Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `http_request_duration_ms` | Histogram | Total request duration |
| `jwt_creation_duration_ms` | Histogram | JWT generation time |
| `kong_api_call_duration_ms` | Histogram | Kong Admin API latency |
| `cache_hit_rate` | Counter | Cache effectiveness |
| `circuit_breaker_state` | Gauge | Current circuit state |

---

## Internal Components

### Handler Layer (`src/handlers/`)
- `tokens.ts` - JWT token generation with Kong integration
- `health.ts` - Health checks with dependency monitoring
- `metrics.ts` - Performance metrics and debugging
- `openapi.ts` - Dynamic OpenAPI specification
- `profiling.ts` - Chrome DevTools integration

### Service Layer (`src/services/`)
- `jwt.service.ts` - Token generation using crypto.subtle
- `cache-manager.ts` - Unified cache with Redis/memory backends
- `circuit-breaker.service.ts` - Centralized circuit breaker management

### Adapter Layer
- `kong.adapter.ts` - Unified Kong adapter (API Gateway + Konnect)
- Redis client with automatic failover

### Key Features
- **Response Builders**: Standardized response patterns
- **Stale Cache Resilience**: Up to 2 hours during Kong outages
- **4-Pillar Configuration**: Enterprise-grade configuration management
- **Profiling Service**: Chrome DevTools integration for performance analysis
