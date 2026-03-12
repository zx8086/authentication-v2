# Observability & Monitoring

## OpenTelemetry Integration

The service implements cost-optimized observability using vendor-neutral OpenTelemetry standards, compatible with Elastic APM, Datadog, New Relic, and other OTLP-compliant platforms. Recent improvements include consolidated metrics endpoints and reduced telemetry overhead.

### Telemetry Architecture

> For the complete telemetry architecture, including data flow diagram, SDK initialization, memory optimizations, circuit breakers, telemetry modes, and environment variable reference, see **[Telemetry Architecture](../architecture/telemetry.md)**.

### Telemetry Features

#### Distributed Tracing
- HTTP request tracing with automatic span correlation
- Request ID generation for end-to-end tracing
- Kong API call instrumentation with W3C Trace Context propagation
- JWT generation timing
- Circuit breaker state transitions
- Cache tier usage tracking

#### W3C Trace Context Propagation
All outbound HTTP requests (particularly to Kong Admin API) include W3C Trace Context headers for distributed tracing:
- `traceparent`: Trace ID, parent span ID, and trace flags
- `tracestate`: Vendor-specific trace information

This is implemented via `createStandardHeaders()` in `src/adapters/kong-utils.ts`, which automatically injects trace context from the active OpenTelemetry context.

#### Redis Trace Hierarchy

Redis cache operations are instrumented to appear as nested spans under HTTP request spans, providing full trace continuity across the entire request lifecycle:

**Trace Hierarchy:**
```
HTTP Request (root span)
├── Kong Consumer Lookup (child span)
├── JWT Generation (child span)
└── Redis Cache Operations (child spans)
    ├── redis.get (check for cached consumer)
    ├── redis.set (cache consumer data)
    └── redis.delete (invalidate cache entry)
```

**Implementation**: `src/telemetry/redis-instrumentation.ts:65-164`

The Redis instrumentation creates spans with the active OpenTelemetry context as parent, ensuring proper trace hierarchy. Each Redis operation is wrapped with `context.with()` to maintain trace continuity.

**Span Naming Conventions:**
- `redis.get` - Read operations (GET, HGET, etc.)
- `redis.set` - Write operations (SET, HSET, etc.)
- `redis.delete` - Delete operations (DEL, HDEL, etc.)
- `redis.list` - List operations (LPUSH, RPUSH, etc.)

**Span Attributes:**
Each Redis span includes:
- `redis.operation` - Operation type (get, set, delete, list)
- `redis.key` - Cache key being accessed
- `redis.result.type` - Result type (string, object, array, null)
- `redis.result.length` - Result size (for performance analysis)
- `redis.error` - Error message (if operation failed)

**Log Correlation:**
Redis operations automatically include trace context in logs, enabling span-to-log navigation in observability tools:

```json
{
  "@timestamp": "2026-01-27T20:58:32.000Z",
  "message": "Redis GET completed",
  "trace.id": "550e8400-e29b-41d4-a716-446655440000",
  "span.id": "redis-span-123",
  "redis.operation": "get",
  "redis.key": "consumer:98765432-9876-5432-1098-765432109876",
  "redis.result.type": "object",
  "redis.result.length": 245
}
```

**Observability Tool Navigation:**
In observability backends (Elastic APM, Datadog, Jaeger):
1. View HTTP request trace
2. Expand nested spans to see Kong and JWT operations
3. Click Redis spans to see cache access patterns
4. Navigate from spans to related logs using trace.id
5. Analyze Redis operation latencies in trace waterfall

**Testing:**
16 Redis instrumentation tests validate trace context propagation:
- `test/bun/telemetry/redis-instrumentation-utils.test.ts`
- Tests verify span creation, attributes, and parent-child relationships
- Cache integration tests validate end-to-end trace hierarchy

**Reference:** Commit f4bc0d5 (2026-01-27) - Fixed Redis instrumentation trace context propagation

#### Consolidated Metrics Collection
- **Runtime Metrics**: Event loop delay, memory usage, CPU utilization
- **System Metrics**: Host-level CPU, memory, disk, network via HostMetrics
- **Business Metrics**: JWT generation, Kong operations, cache performance
- **Circuit Breaker Metrics**: Failure rates, state transitions, stale cache usage
- **Cache Metrics**: Hit rates, tier usage, operations by backend
- **Unified Metrics Endpoint**: Single endpoint with multiple views for different operational needs

#### Structured Logging
- ECS (Elastic Common Schema) format
- Pino (default) or Winston backend via `LOGGING_BACKEND` env var
- OpenTelemetry trace context correlation
- Request context propagation
- Error tracking with stack traces

> For the complete logging architecture, public API, backend comparison, and developer quick start, see **[Logging Guide](../development/logging.md)**.

### ECS Field Mapping

The service automatically maps custom application fields to ECS (Elastic Common Schema) compliant field names, ensuring optimal Elasticsearch indexing and query performance.

**Implementation**: `src/telemetry/winston-logger.ts:108-135`

#### Field Mapping Table

| Custom Field | ECS Field | Type | Description |
|--------------|-----------|------|-------------|
| `consumerId` | `consumer.id` | string | Consumer identifier from Kong |
| `username` | `consumer.name` | string | Consumer username |
| `requestId` | `event.id` | string | Unique request identifier |
| `totalDuration` | `event.duration` | number | Duration in nanoseconds |

#### Benefits of ECS Mapping

1. **Top-Level Fields**: ECS fields appear at root level in Elasticsearch, not nested under `labels.*`
2. **Kibana Auto-Complete**: Standard ECS fields are recognized by Kibana for auto-completion
3. **Simpler Queries**: Direct field access (`consumer.id` instead of `labels.consumerId`)
4. **Standard Compliance**: Follows Elastic Common Schema conventions
5. **No Duplication**: Fields mapped once, not duplicated between top-level and labels

#### Example Log Output

**Before ECS Mapping (nested under labels):**
```json
{
  "@timestamp": "2026-01-20T12:00:00.000Z",
  "message": "Token generated successfully",
  "log.level": "info",
  "labels": {
    "consumerId": "consumer-123",
    "username": "user@example.com",
    "requestId": "req-456",
    "totalDuration": 1500000
  }
}
```

**After ECS Mapping (top-level fields):**
```json
{
  "@timestamp": "2026-01-20T12:00:00.000Z",
  "message": "Token generated successfully",
  "log.level": "info",
  "consumer.id": "consumer-123",
  "consumer.name": "user@example.com",
  "event.id": "req-456",
  "event.duration": 1500000,
  "trace.id": "trace-789",
  "span.id": "span-012"
}
```

#### Non-ECS Fields

Fields not mapped to ECS standards automatically appear under `labels.*`:
- Custom business metrics
- Service-specific identifiers
- Non-standard operational data

**Example:**
```json
{
  "consumer.id": "consumer-123",        // Mapped field
  "consumer.name": "user@example.com",  // Mapped field
  "labels.operationType": "create",     // Non-mapped field
  "labels.cacheHit": true               // Non-mapped field
}
```

#### Elasticsearch Query Examples

**Consumer Fields (Direct Access):**
```json
GET /logs-*/_search
{
  "query": {
    "term": { "consumer.id": "consumer-123" }
  }
}
```

**Non-ECS Fields (Nested Access):**
```json
GET /logs-*/_search
{
  "query": {
    "term": { "labels.operationType": "create" }
  }
}
```

### Tracer API, Span Events, and Cardinality Guard

> For the Tracer API (custom spans, specialized span methods, naming conventions), span events (TelemetryEmitter, SpanEvents constants, migration strategy), and cardinality guard, see **[Instrumentation Guide](../development/instrumentation.md)**.

### Winston Logger API

> **Note:** The default logging backend is now Pino (SIO-447). Winston remains available via `LOGGING_BACKEND=winston`. For the full logging architecture, backend comparison, and developer guide, see **[Logging Guide](../development/logging.md)**.

Structured logging with ECS format and OTLP transport integration.

**Implementation:** `src/telemetry/winston-logger.ts`

#### Basic Logging

```typescript
import { info, warn, error, debug } from '../telemetry/winston-logger';

// Simple messages
info('Operation completed');
warn('Cache miss, falling back to Kong');
error('Failed to generate token');
debug('Processing request details');

// With context
info('Token generated', {
  consumerId: 'abc-123',
  username: 'user@example.com',
  requestId: 'req-456',
  totalDuration: 45,
});
```

#### Specialized Logging Methods

```typescript
import {
  logHttpRequest,
  logAuthenticationEvent,
  logKongOperation
} from '../telemetry/winston-logger';

// HTTP request logging
logHttpRequest('POST', '/tokens', 200, 45, {
  consumerId: 'abc-123',
  cacheHit: true,
});

// Authentication events
logAuthenticationEvent('token_generation', true, {
  consumerId: 'abc-123',
  tokenType: 'jwt',
});

// Kong operations
logKongOperation('getConsumerSecret', 32, true, {
  consumerId: 'abc-123',
  cacheHit: false,
});
```

#### ECS Field Mapping

Fields are automatically mapped to ECS (Elastic Common Schema):

| Input Field | ECS Field | Type |
|-------------|-----------|------|
| `consumerId` | `consumer.id` | string |
| `username` | `consumer.name` | string |
| `requestId` | `event.id` | string |
| `totalDuration` | `event.duration` | number (ns) |

**Automatic Trace Correlation:**
```json
{
  "@timestamp": "2026-01-20T12:00:00.000Z",
  "message": "Token generated",
  "log.level": "info",
  "consumer.id": "abc-123",
  "consumer.name": "user@example.com",
  "event.id": "req-456",
  "trace.id": "550e8400-e29b-41d4-a716-446655440000",
  "span.id": "550e8400-e29b"
}
```

#### Logger Lifecycle

```typescript
import { winstonTelemetryLogger } from '../telemetry/winston-logger';

// Flush all transports (call before shutdown)
await winstonTelemetryLogger.flush();

// Reinitialize after telemetry SDK changes
winstonTelemetryLogger.reinitialize();
```

#### Log Levels

| Level | Use Case |
|-------|----------|
| `error` | Failures requiring attention |
| `warn` | Degraded operation, recoverable issues |
| `info` | Normal operations, business events |
| `debug` | Development debugging (disabled in production) |

**Configuration:**
```bash
LOG_LEVEL=info  # Minimum level to output (default: info)
```

## Telemetry Modes and SDK Compatibility

> For telemetry modes (console, otlp, both) and OpenTelemetry SDK 0.212.0 compatibility notes, see **[Telemetry Architecture](../architecture/telemetry.md#telemetry-modes)**.

## Key Metrics

### Complete Metrics Reference (77 Instruments)

The service exports 77 OpenTelemetry metric instruments organized by category. All metrics are defined in `src/telemetry/metrics/instruments.ts`.

#### HTTP Metrics (7 instruments)

| Metric Name | Type | Attributes | Description |
|-------------|------|------------|-------------|
| `http_requests_total` | Counter | method, path, status | Total HTTP requests |
| `http_requests_by_status_total` | Counter | method, path, status | Requests grouped by status code |
| `http_request_duration_seconds` | Histogram | method, path, status | Response time distribution (seconds) |
| `http_request_size_bytes` | Histogram | method, path | Request body size (bytes) |
| `http_response_size_bytes` | Histogram | method, path, status | Response body size (bytes) |
| `http_active_requests` | Gauge | method, path | Currently processing requests |
| `http_requests_in_flight` | Gauge | - | Total in-flight requests |

**Recording Functions:** `src/telemetry/metrics/http-metrics.ts`
```typescript
recordHttpRequest(method: string, path: string, statusCode: number)
recordHttpResponseTime(method: string, path: string, statusCode: number, durationMs: number)
recordHttpRequestSize(method: string, path: string, sizeBytes: number)
recordHttpResponseSize(method: string, path: string, statusCode: number, sizeBytes: number)
recordActiveRequests(method: string, path: string, delta: number)
```

#### Authentication Metrics (4 instruments)

| Metric Name | Type | Attributes | Description |
|-------------|------|------------|-------------|
| `jwt_token_creation_duration_seconds` | Histogram | consumer_id, operation, result | JWT generation latency (seconds) |
| `authentication_attempts_total` | Counter | consumer_id, operation, result | Total auth attempts |
| `authentication_success_total` | Counter | consumer_id, operation, result | Successful authentications |
| `authentication_failures_total` | Counter | consumer_id, operation, result | Failed authentications |

**Recording Functions:** `src/telemetry/metrics/auth-metrics.ts`
```typescript
recordJwtTokenCreation(durationMs: number, consumerId: string)
recordAuthenticationAttempt(username: string)
recordAuthenticationAttempt(type: string, success: boolean, username?: string)
recordAuthenticationSuccess(username?: string)
recordAuthenticationFailure(username?: string, reason?: string)
```

#### Kong Metrics (4 instruments)

| Metric Name | Type | Attributes | Description |
|-------------|------|------------|-------------|
| `kong_operations_total` | Counter | operation, cache_status | Kong Admin API operations |
| `kong_operation_duration_seconds` | Histogram | operation, cache_status | Kong API latency (seconds) |
| `kong_cache_hits_total` | Counter | operation, consumer_id, cache_status | Cache hits for Kong data |
| `kong_cache_misses_total` | Counter | operation, consumer_id, cache_status | Cache misses requiring Kong call |

**Recording Functions:** `src/telemetry/metrics/kong-metrics.ts`
```typescript
recordKongOperation(operation: string, durationMs: number, cacheHit?: boolean)
recordKongResponseTime(durationMs: number, operation: string, success?: boolean)
recordKongCacheHit(consumerId: string, operation: string)
recordKongCacheMiss(consumerId: string, operation: string)
```

#### Redis/Cache Metrics (6 instruments)

| Metric Name | Type | Attributes | Description |
|-------------|------|------------|-------------|
| `redis_operations_total` | Counter | operation, status | Redis command executions |
| `redis_operation_duration_seconds` | Histogram | operation | Redis latency (seconds) |
| `redis_connections_active` | Gauge | state | Active Redis connections |
| `redis_cache_hits_total` | Counter | key_prefix | Cache hits |
| `redis_cache_misses_total` | Counter | key_prefix | Cache misses |
| `redis_errors_total` | Counter | error_type | Redis errors |

**Recording Functions:** `src/telemetry/metrics/redis-metrics.ts`
```typescript
recordRedisOperation(operation: string, durationMs: number, success?: boolean)
recordRedisConnection(state: 'connected' | 'disconnected' | 'reconnecting')
recordCacheOperation(operation: string, hit: boolean, keyPrefix?: string)
```

#### Cache Tier Metrics (4 instruments)

| Metric Name | Type | Attributes | Description |
|-------------|------|------------|-------------|
| `cache_tier_usage_total` | Counter | tier, operation, result | Cache tier access patterns |
| `cache_tier_latency_seconds` | Histogram | tier, operation | Tier-specific latency |
| `cache_tier_errors_total` | Counter | tier, error_type | Cache tier failures |
| `operation_duration_seconds` | Histogram | - | Duration of various operations |

**Tier Values:** `redis-primary`, `redis-stale`, `memory-stale`, `kong-fallback`

**Recording Functions:** `src/telemetry/metrics/cache-metrics.ts`
```typescript
recordCacheTierUsage(tier: string, operation: string, result: 'hit' | 'miss' | 'error')
recordCacheTierLatency(tier: string, operation: string, latencyMs: number)
recordCacheTierError(tier: string, errorType: string)
```

#### Circuit Breaker Metrics (5 instruments)

| Metric Name | Type | Attributes | Description |
|-------------|------|------------|-------------|
| `circuit_breaker_state` | Gauge | name | State (0=closed, 1=open, 2=half-open) |
| `circuit_breaker_requests_total` | Counter | name, result | Requests through circuit breaker |
| `circuit_breaker_rejected_total` | Counter | name | Rejected due to open circuit |
| `circuit_breaker_fallback_total` | Counter | name, fallback_type | Fallback invocations |
| `circuit_breaker_state_transitions_total` | Counter | name, from_state, to_state | State changes |

**Recording Functions:** `src/telemetry/metrics/circuit-breaker-metrics.ts`
```typescript
recordCircuitBreakerState(name: string, state: CircuitBreakerStateEnum)
recordCircuitBreakerRequest(name: string, result: 'success' | 'failure' | 'timeout')
recordCircuitBreakerRejection(name: string)
recordCircuitBreakerFallback(name: string, fallbackType: string)
recordCircuitBreakerStateTransition(name: string, fromState: string, toState: string)
```

#### Process Metrics (27 instruments)

| Metric Name | Type | Description |
|-------------|------|-------------|
| `process_start_time_seconds` | Gauge | Process start timestamp |
| `process_uptime_seconds` | Gauge | Uptime in seconds |
| `process_memory_usage_bytes` | Gauge | Total memory usage |
| `process_heap_used_bytes` | Gauge | V8 heap used bytes |
| `process_heap_total_bytes` | Gauge | V8 heap total bytes |
| `process_resident_memory_bytes` | Gauge | Resident set size |
| `process_external_memory_bytes` | Gauge | External memory (C++ objects) |
| `process_cpu_usage_percent` | Gauge | CPU utilization percentage |
| `process_event_loop_delay_seconds` | Histogram | Event loop delay distribution |
| `process_event_loop_utilization_percent` | Gauge | Event loop utilization ratio |
| `system_memory_usage_bytes` | Gauge | System memory used |
| `system_memory_free_bytes` | Gauge | System memory free |
| `system_memory_total_bytes` | Gauge | System total memory |
| `system_cpu_usage_percent` | Gauge | System CPU percentage |
| `system_load_average` | Gauge | System load average |
| `gc_collections_total` | Counter | GC collection count by type |
| `gc_duration_seconds` | Histogram | GC pause duration |
| `gc_old_generation_size_before_bytes` | Gauge | Old gen size before GC |
| `gc_old_generation_size_after_bytes` | Gauge | Old gen size after GC |
| `gc_young_generation_size_before_bytes` | Gauge | Young gen size before GC |
| `gc_young_generation_size_after_bytes` | Gauge | Young gen size after GC |
| `file_descriptor_usage` | Gauge | Open file descriptors |
| `file_descriptor_limit` | Gauge | Maximum file descriptors |
| `network_bytes_received_total` | Counter | Total bytes received over the network |
| `network_bytes_sent_total` | Counter | Total bytes sent over the network |
| `thread_pool_pending_tasks` | Gauge | Pending tasks in thread pool |
| `thread_pool_active_threads` | Gauge | Active threads in thread pool |
| `thread_pool_idle_threads` | Gauge | Idle threads in thread pool |
| `handle_usage` | Gauge | Handles in use |

**Recording Functions:** `src/telemetry/metrics/process-metrics.ts`
```typescript
recordGCCollection(type: string)
recordGCDuration(durationMs: number)
recordGCHeapSizes(before: { old: number, young: number }, after: { old: number, young: number })
startSystemMetricsCollection(intervalMs?: number)
stopSystemMetricsCollection()
```

#### API Versioning Metrics (6 instruments)

| Metric Name | Type | Attributes | Description |
|-------------|------|------------|-------------|
| `api_version_requests_total` | Counter | version, path | Requests by API version |
| `api_version_header_source_total` | Counter | source, version | Version header source |
| `api_version_unsupported_total` | Counter | requested_version | Unsupported version requests |
| `api_version_fallback_total` | Counter | from_version, to_version | Version fallback events |
| `api_version_parsing_duration_seconds` | Histogram | version | Version parsing latency |
| `api_version_routing_duration_seconds` | Histogram | version | Version routing latency |

**Recording Functions:** `src/telemetry/metrics/api-version-metrics.ts`
```typescript
recordApiVersionRequest(version: string, path: string)
recordApiVersionHeaderSource(source: 'header' | 'query' | 'default', version: string)
recordApiVersionUnsupported(requestedVersion: string)
recordApiVersionFallback(fromVersion: string, toVersion: string)
```

#### Consumer Volume Metrics (3 instruments)

| Metric Name | Type | Attributes | Description |
|-------------|------|------------|-------------|
| `consumer_requests_by_volume` | Counter | volume_class, consumer_id | Requests by volume tier |
| `consumer_errors_by_volume` | Counter | volume_class, error_type | Errors by volume tier |
| `consumer_latency_by_volume` | Histogram | volume_class | Latency by volume tier |

**Volume Classes:** `high` (>5K req/hr), `medium` (100-5K req/hr), `low` (<100 req/hr)

#### Security Metrics (5 instruments)

| Metric Name | Type | Attributes | Description |
|-------------|------|------------|-------------|
| `security_events_total` | Counter | event_type, severity | Security events |
| `security_headers_applied_total` | Counter | header_set, version | Security headers applied |
| `audit_events_total` | Counter | event_type, consumer_id | Audit log events |
| `security_risk_score` | Histogram | consumer_id | Risk score distribution |
| `security_anomalies_total` | Counter | anomaly_type | Detected anomalies |

**Recording Functions:** `src/telemetry/metrics/security-metrics.ts`
```typescript
recordSecurityEvent(eventType: string, severity: 'low' | 'medium' | 'high' | 'critical')
recordSecurityHeaders(headerSet: string, version: string)
recordAuditEvent(eventType: string, consumerId: string)
```

#### Error Metrics (2 instruments)

| Metric Name | Type | Attributes | Description |
|-------------|------|------------|-------------|
| `application_errors_total` | Counter | error_code, path | Errors by code |
| `application_exceptions_total` | Counter | exception_type, handled | Exceptions caught |

**Recording Functions:** `src/telemetry/metrics/error-metrics.ts`
```typescript
recordError(errorCode: string, path: string)
recordException(exceptionType: string, handled: boolean)
```

#### Telemetry Self-Metrics (2 instruments)

| Metric Name | Type | Attributes | Description |
|-------------|------|------------|-------------|
| `telemetry_exports_total` | Counter | signal_type, status | Export attempts |
| `telemetry_export_errors_total` | Counter | signal_type, error_type | Export failures |

**Recording Functions:** `src/telemetry/metrics/telemetry-metrics.ts`
```typescript
recordTelemetryExport(signalType: 'traces' | 'metrics' | 'logs', success: boolean)
recordTelemetryExportError(signalType: string, errorType: string)
```

### Health Check Endpoints

#### Main Health Check - `/health`
```bash
curl http://localhost:3000/health
```

Returns service health with dependency status:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T12:00:00.000Z",
  "uptime": "1h",
  "version": "1.0.0",
  "environment": "production",
  "highAvailability": false,
  "circuitBreakerState": "closed",
  "dependencies": {
    "kong": {
      "status": "healthy",
      "mode": "ADMIN",
      "url": "http://192.168.178.3:30001",
      "responseTime": "45ms"
    },
    "telemetry": {
      "traces": {
        "status": "healthy",
        "endpoint": "https://otel.example.com/v1/traces",
        "responseTime": "10ms",
        "exports": {
          "successRate": "100%",
          "total": 50,
          "failures": 0,
          "lastExportTime": "2025-01-15T11:59:50.000Z",
          "lastFailureTime": null,
          "recentErrors": []
        }
      },
      "metrics": {
        "status": "healthy",
        "endpoint": "https://otel.example.com/v1/metrics",
        "responseTime": "8ms",
        "exports": {
          "successRate": "100%",
          "total": 100,
          "failures": 0,
          "lastExportTime": "2025-01-15T11:59:50.000Z",
          "lastFailureTime": null,
          "recentErrors": []
        }
      },
      "logs": {
        "status": "healthy",
        "endpoint": "https://otel.example.com/v1/logs",
        "responseTime": "12ms",
        "exports": {
          "successRate": "100%",
          "total": 200,
          "failures": 0,
          "lastExportTime": "2025-01-15T11:59:50.000Z",
          "lastFailureTime": null,
          "recentErrors": []
        }
      }
    }
  }
}
```

#### Telemetry Export Statistics

Each telemetry type (traces, metrics, logs) includes per-type export statistics in the `exports` object:

| Field | Type | Description |
|-------|------|-------------|
| `successRate` | String | Export success rate as percentage (e.g., "100%") |
| `total` | Integer | Total export attempts |
| `failures` | Integer | Failed exports |
| `lastExportTime` | String/null | ISO-8601 timestamp of last export attempt |
| `lastFailureTime` | String/null | ISO-8601 timestamp of last failure (null if no failures) |
| `recentErrors` | Array | Recent error messages with timestamps (max 10 entries) |

These statistics help diagnose telemetry export issues by showing success rates and recent errors per signal type.

#### Telemetry Health Check - `/health/telemetry`
```bash
curl http://localhost:3000/health/telemetry
```

Returns telemetry system status:
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

### OTLP Connectivity Validation

The `/health` endpoint performs active connectivity checks to all configured OTLP endpoints (traces, metrics, logs) to validate observability infrastructure.

#### How It Works

1. **Parallel Connectivity Tests**: All OTLP endpoints are tested concurrently for responsiveness
2. **5-Second Timeout**: Each endpoint check has a 5-second timeout to prevent health check delays
3. **Status Aggregation**: Overall telemetry status reflects the health of all endpoints
4. **Response Time Tracking**: Each endpoint reports its response time in human-readable format (e.g., "45ms", "1.5s")

#### Health Response with OTLP Status

```json
{
  "status": "healthy",
  "dependencies": {
    "telemetry": {
      "status": "healthy",
      "mode": "otlp",
      "endpoints": {
        "traces": {
          "url": "https://otel.example.com/v1/traces",
          "status": "reachable",
          "responseTime": "45ms"
        },
        "metrics": {
          "url": "https://otel.example.com/v1/metrics",
          "status": "reachable",
          "responseTime": "52ms"
        },
        "logs": {
          "url": "https://otel.example.com/v1/logs",
          "status": "reachable",
          "responseTime": "38ms"
        }
      }
    }
  }
}
```

#### Status Values

| Status | Meaning | Health Impact |
|--------|---------|---------------|
| `reachable` | Endpoint responded within 5 seconds | Healthy |
| `unreachable` | Endpoint timeout or connection error | Degraded |
| `disabled` | Telemetry mode is `console` only | N/A (expected) |

#### Fallback Behavior

When OTLP endpoints are unreachable:

1. **Telemetry continues**: Logs still output to console (if `TELEMETRY_MODE=both`)
2. **Health status**: Marked as "degraded" but not "unhealthy"
3. **No blocking**: Service continues processing requests normally
4. **Retry logic**: OpenTelemetry SDK handles automatic retries with exponential backoff

#### Performance Considerations

OTLP connectivity checks add network latency to health endpoint response times:

- **Without OTLP checks**: p95 ~50ms, p99 ~100ms
- **With OTLP checks**: p95 ~400ms, p99 ~500ms

**SLA Thresholds** have been adjusted to account for OTLP validation latency. See [sla.md](sla.md) for updated thresholds.

#### Use Cases

**Kubernetes Liveness Probe** (Use `/health/ready` instead):
```yaml
livenessProbe:
  httpGet:
    path: /health/ready
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
```

**Kubernetes Readiness Probe** (Includes OTLP validation):
```yaml
readinessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 5
  timeoutSeconds: 10
```

**Monitoring Alerts** (Check specific endpoints):
```bash
# Alert if telemetry endpoints are unreachable
curl http://localhost:3000/health/telemetry | jq '.status'
```

#### Troubleshooting OTLP Connectivity

**Symptom**: Health endpoint shows telemetry as "unreachable"

**Diagnosis:**
```bash
# Check telemetry endpoint connectivity
curl -I https://otel.example.com/v1/traces

# Verify environment variables
echo $OTEL_EXPORTER_OTLP_TRACES_ENDPOINT
echo $OTEL_EXPORTER_OTLP_METRICS_ENDPOINT
echo $OTEL_EXPORTER_OTLP_LOGS_ENDPOINT

# Test with increased timeout
curl -X GET "http://localhost:3000/health" --max-time 10
```

**Common Causes:**
1. OTLP collector is down or unreachable
2. Network connectivity issues (firewall, DNS)
3. OTLP endpoint URL misconfiguration
4. Authentication token expired (if required)

#### Metrics Health Check - `/health/metrics`
```bash
curl http://localhost:3000/health/metrics
```

Returns metrics system status:
```json
{
  "metrics": {
    "status": "healthy",
    "exports": {
      "traces": { "total": 100, "success": 98, "failure": 2 },
      "metrics": { "total": 50, "success": 50, "failure": 0 },
      "logs": { "total": 80, "success": 78, "failure": 2 }
    },
    "configuration": {
      "exportInterval": 10000,
      "batchTimeout": 30000,
      "endpoint": "https://otel.example.com/v1/metrics"
    }
  },
  "circuitBreakers": {
    "total": 3,
    "states": { "closed": 3, "open": 0, "halfOpen": 0 }
  },
  "timestamp": "2025-01-15T12:00:00.000Z"
}
```

### Unified Metrics Endpoint - `/metrics`

The service provides a unified metrics endpoint with multiple views:

#### Available Views
```bash
# Operational metrics (default)
curl http://localhost:3000/metrics

# Infrastructure view
curl http://localhost:3000/metrics?view=infrastructure

# Telemetry system status
curl http://localhost:3000/metrics?view=telemetry

# Export statistics
curl http://localhost:3000/metrics?view=exports

# Configuration summary
curl http://localhost:3000/metrics?view=config

# Complete metrics data
curl http://localhost:3000/metrics?view=full
```

#### Operational View Response
```json
{
  "timestamp": "2025-01-15T12:00:00.000Z",
  "uptime": "1h",
  "memory": {
    "used": 64,
    "total": 128,
    "rss": 80,
    "external": 16
  },
  "cache": {
    "strategy": "local-memory",
    "size": 150,
    "activeEntries": 45,
    "hitRate": "0.90",
    "operations": {
      "hits": 450,
      "misses": 50,
      "sets": 100
    }
  },
  "kong": {
    "mode": "KONNECT",
    "circuitBreaker": {
      "state": "CLOSED",
      "failures": 0,
      "successes": 500
    }
  }
}
```

## Debugging Telemetry

### Test Metrics Collection
```bash
# Test metrics collection
curl -X POST http://localhost:3000/debug/metrics/test

# Force immediate export
curl -X POST http://localhost:3000/debug/metrics/export

# View export statistics
curl http://localhost:3000/metrics?view=exports
```

### Development Debug Commands
```bash
# Test metrics recording
curl -X POST http://localhost:3000/debug/metrics/test \
  -H "Content-Type: application/json" \
  -d '{"count": 10, "type": "test-metric"}'

# Force metrics export
curl -X POST http://localhost:3000/debug/metrics/export
```

## Monitoring Best Practices

### Recommended Alerts

#### Performance Alerts
- Event loop delay >100ms sustained for 5 minutes
- Memory usage >80% of container limit
- HTTP error rate >5%
- JWT generation p99 latency >50ms

#### Service Health Alerts
- Kong API failures >1%
- Circuit breaker state transitions to "open"
- Cache miss rate >50%
- OTLP export failures >10%

#### Business Logic Alerts
- JWT token generation failures
- Anonymous consumer access attempts
- Consumer secret creation failures

### Monitoring Dashboards

#### Operational Dashboard Metrics
- Request rate and latency
- Memory and CPU utilization
- Error rates by endpoint
- Cache hit/miss ratios
- Circuit breaker status

#### Infrastructure Dashboard Metrics
- Host-level CPU, memory, disk, network
- Container resource usage
- Cache tier performance
- Circuit breaker metrics
- OpenTelemetry export health

#### Business Dashboard Metrics
- JWT tokens generated per minute
- Unique consumers served
- Kong operations by type
- Authentication success/failure rates

### Log Analysis

#### Request Tracing
All HTTP requests include trace IDs for correlation:
```json
{
  "timestamp": "2025-01-15T12:00:00.000Z",
  "level": "info",
  "message": "HTTP request completed",
  "traceId": "550e8400-e29b-41d4-a716-446655440000",
  "spanId": "550e8400-e29b",
  "method": "GET",
  "path": "/tokens",
  "statusCode": 200,
  "duration": 45,
  "consumerId": "98765432-9876-5432-1098-765432109876"
}
```

#### Error Tracking
Errors include full context and stack traces:
```json
{
  "timestamp": "2025-01-15T12:00:00.000Z",
  "level": "error",
  "message": "Kong API request failed",
  "traceId": "550e8400-e29b-41d4-a716-446655440000",
  "error": {
    "name": "ConnectionError",
    "message": "ECONNREFUSED localhost:8001",
    "stack": "..."
  },
  "context": {
    "operation": "getConsumerSecret",
    "consumerId": "98765432-9876-5432-1098-765432109876",
    "circuitBreakerState": "OPEN"
  }
}
```

## Production Monitoring Setup

> For complete environment variables, configuration examples, package dependencies, and initialization code, see **[Telemetry Architecture - SDK Configuration](../architecture/telemetry.md#sdk-configuration)**.

The sections below cover collector-side and Kubernetes integration.

### OTEL Collector Configuration (Required)

The service sends logs via OTLP to an OpenTelemetry Collector. To prevent duplicate fields in Elasticsearch (where ECS fields appear both at root level and in `labels.*` namespace), configure the collector's Transform Processor.

**Problem**: `@elastic/ecs-winston-format` outputs dot-notation fields which the OTLP transport converts to `labels.*` namespace, causing duplicates like `service.name` AND `labels.service_name`.

**Solution**: Add to your `otel-collector.yaml`:

```yaml
processors:
  transform/remove-duplicate-labels:
    log_statements:
      - context: log
        statements:
          # Remove ECS metadata duplicates (already in resource attributes)
          - delete(attributes["service.name"])
          - delete(attributes["service.version"])
          - delete(attributes["service.environment"])
          - delete(attributes["log.level"])
          - delete(attributes["ecs.version"])
          - delete(attributes["event.dataset"])
          - delete(attributes["timestamp"])

service:
  pipelines:
    logs:
      receivers: [otlp]
      processors: [transform/remove-duplicate-labels, batch]
      exporters: [elasticsearch]
```

**Why application-level fix is not possible**: The `OpenTelemetryTransportV3` requires dot-notation fields to construct OTLP LogRecords. Deleting them in the Winston format pipeline breaks OTLP export entirely (see commit 60fa3c2 and revert 0256c43).

**Reference**: [SIO-319](https://linear.app/siobytes/issue/SIO-319)

### Health Check Integration
```yaml
# Kubernetes health checks
livenessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health/ready    # Dedicated readiness probe checking Kong connectivity
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
```

**Note**: Use `/health` for liveness (service is running) and `/health/ready` for readiness (service can accept traffic). The readiness probe verifies Kong connectivity before allowing traffic.

### Prometheus Integration
```yaml
# ServiceMonitor for Prometheus
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: authentication-service
spec:
  selector:
    matchLabels:
      app: authentication-service
  endpoints:
  - port: http
    path: /metrics
    interval: 30s
    params:
      view: ["infrastructure"]
```

## Graceful Shutdown

The service implements proper resource cleanup during shutdown to prevent memory leaks and ensure telemetry data is flushed.

### Shutdown Sequence

When receiving SIGTERM or SIGINT:

1. **Log shutdown sequence** - Batch log all shutdown steps to OTLP
2. **Stop HTTP server** - Stop accepting new requests
3. **Clear intervals** - Clean up all background intervals:
   - `shutdownGCMetrics()` - GC monitoring interval
   - `shutdownConsumerVolume()` - Consumer tracking interval
   - `shutdownCardinalityGuard()` - Cardinality cleanup interval
   - `shutdownTelemetryCircuitBreakers()` - Circuit breaker intervals
4. **Flush telemetry** - Export pending metrics, traces, logs
5. **Exit process** - Clean exit with code 0

### Shutdown Timeout

- **Grace period**: 10 seconds
- **Force exit**: If shutdown exceeds timeout, process exits with code 1

### Cardinality Guard

The service implements a cardinality guard to prevent metric explosion:

- **Max unique consumers**: 1000 tracked consumers
- **Hash buckets**: 256 buckets for overflow consumers
- **Cleanup interval**: Periodic cleanup of stale entries
- **Classification**: High (>5K/hr), Medium (100-5K/hr), Low (<100/hr)

### Related Documentation

- [Performance SLA](sla.md) - SLA definitions and monitoring thresholds
- [Troubleshooting Guide](troubleshooting.md) - Common issues and resolutions

---

## Troubleshooting

### Common Monitoring Issues

#### High Memory Usage
```bash
# Check memory metrics
curl http://localhost:3000/metrics?view=infrastructure

# Analyze memory breakdown
curl http://localhost:3000/health/metrics
```

#### Telemetry Export Failures
```bash
# Check telemetry health
curl http://localhost:3000/health/telemetry

# View export statistics
curl http://localhost:3000/metrics?view=exports
```

#### Circuit Breaker Issues
```bash
# Check circuit breaker status
curl http://localhost:3000/metrics | jq '.kong.circuitBreaker'

# View circuit breaker metrics
curl http://localhost:3000/metrics?view=full | jq '.circuitBreaker'
```

#### Cache Performance Issues
```bash
# Check cache hit rates
curl http://localhost:3000/metrics | jq '.cache'

# Analyze cache tier usage
curl http://localhost:3000/metrics?view=infrastructure | jq '.cache'

# Check cache server type (redis or valkey)
curl http://localhost:3000/health | jq '.dependencies.cache.type'
```

#### Cache Tier Architecture

The service implements a two-tier caching strategy for resilience and circuit breaker support:

**Cache Tiers:**

| Tier | Key Prefix | Default TTL | Purpose |
|------|------------|-------------|---------|
| **Primary** | `auth_service:` | 5 minutes | Active cache entries for fast lookups |
| **Stale** | `auth_service_stale:` | 30 minutes | Fallback entries for circuit breaker recovery |

**TTL Configuration:**

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `CACHING_TTL_SECONDS` | 300 | Primary cache TTL in seconds |
| `STALE_DATA_TOLERANCE_MINUTES` | 30 | Stale cache TTL in minutes |

**Lifecycle Example:**

```
Time    Primary Key                          Stale Key
T+0     auth_service:consumer:abc (TTL 300s)  auth_service_stale:consumer:abc (TTL 1800s)
T+5min  EXPIRED                               auth_service_stale:consumer:abc (TTL 1500s)
T+30min EXPIRED                               EXPIRED
```

**Health Endpoint Cache Section:**

```bash
curl http://localhost:3000/health | jq '.dependencies.cache'
```

```json
{
  "type": "redis",
  "connection": {
    "connected": true,
    "responseTime": "0.4ms"
  },
  "entries": {
    "primary": 5,
    "primaryActive": 5,
    "stale": 11,
    "staleCacheAvailable": true
  },
  "performance": {
    "hitRate": "62.50%",
    "avgLatencyMs": 0.54
  },
  "healthMonitor": { ... }
}
```

**Field Groups:**

| Group | Field | Description |
|-------|-------|-------------|
| `connection` | `connected` | Redis/Valkey connection status |
| `connection` | `responseTime` | Ping response time |
| `entries` | `primary` | Total primary cache entries |
| `entries` | `primaryActive` | Entries with TTL > 0 |
| `entries` | `stale` | Stale entries for circuit breaker fallback |
| `entries` | `staleCacheAvailable` | Whether stale fallback is available |
| `performance` | `hitRate` | Cache hit percentage |
| `performance` | `avgLatencyMs` | Average operation latency |

**Circuit Breaker Fallback:**

When Kong becomes unavailable and the circuit breaker opens:
1. Primary cache lookup fails (Kong unreachable)
2. Service falls back to stale tier (`auth_service_stale:*`)
3. Stale data served while circuit breaker recovers
4. After recovery, primary cache repopulates from Kong

#### Cache Health Monitor

The health endpoint exposes a `healthMonitor` object for cache resilience diagnostics. This is useful for SRE troubleshooting when cache health issues occur.

```bash
curl http://localhost:3000/health | jq '.dependencies.cache.healthMonitor'
```

**Response (Distributed Cache - Redis/Valkey):**
```json
{
  "status": "healthy",
  "isMonitoring": true,
  "consecutiveSuccesses": 47,
  "consecutiveFailures": 0,
  "lastStatusChange": "2026-02-21T12:00:17.489Z",
  "lastCheck": {
    "success": true,
    "timestamp": "2026-02-21T12:07:47.606Z",
    "responseTimeMs": 0.5
  }
}
```

**Response (Memory Cache):** `null` (no health monitor for in-memory cache)

**Health Monitor Fields:**

| Field | Description |
|-------|-------------|
| `status` | Health status: `healthy`, `degraded`, `unhealthy`, or `unknown` |
| `isMonitoring` | Whether the health monitor is actively running |
| `consecutiveSuccesses` | Consecutive successful PING checks (threshold: 2 for healthy) |
| `consecutiveFailures` | Consecutive failed PING checks (threshold: 3 for unhealthy) |
| `lastStatusChange` | ISO timestamp when status last transitioned |
| `lastCheck.success` | Whether the most recent PING check succeeded |
| `lastCheck.timestamp` | ISO timestamp of the last check |
| `lastCheck.responseTimeMs` | Response time of the last check |
| `lastCheck.error` | Error message (only when `success: false`) |

**Status Transitions:**

| From | To | Trigger |
|------|----|----|
| `unknown` | `healthy` | 2 consecutive successes |
| `healthy` | `degraded` | 1 failure |
| `degraded` | `healthy` | 2 consecutive successes |
| `degraded` | `unhealthy` | 3 total consecutive failures |
| `unhealthy` | `degraded` | 1 success |

#### Redis vs Valkey Detection

The service automatically detects whether Redis or Valkey is being used as the distributed cache backend. This enables accurate monitoring and server-specific optimizations.

```bash
# Health response includes server type
curl http://localhost:3000/health | jq '.dependencies.cache'
```

**Response (Redis):**
```json
{
  "type": "redis",
  "connection": {
    "connected": true,
    "responseTime": "0.4ms"
  },
  "entries": {
    "primary": 5,
    "primaryActive": 5,
    "stale": 11,
    "staleCacheAvailable": true
  },
  "performance": {
    "hitRate": "62.50%",
    "avgLatencyMs": 0.54
  },
  "healthMonitor": {
    "status": "healthy",
    "isMonitoring": true,
    "consecutiveSuccesses": 47,
    "consecutiveFailures": 0,
    "lastStatusChange": "2026-02-21T12:00:17.489Z",
    "lastCheck": {
      "success": true,
      "timestamp": "2026-02-21T12:07:47.606Z",
      "responseTimeMs": 0.5
    }
  }
}
```

**Response (Valkey):**
```json
{
  "type": "valkey",
  "connection": {
    "connected": true,
    "responseTime": "0.5ms"
  },
  "entries": {
    "primary": 5,
    "primaryActive": 5,
    "stale": 8,
    "staleCacheAvailable": true
  },
  "performance": {
    "hitRate": "75.00%",
    "avgLatencyMs": 0.48
  },
  "healthMonitor": {
    "status": "healthy",
    "isMonitoring": true,
    "consecutiveSuccesses": 32,
    "consecutiveFailures": 0,
    "lastStatusChange": "2026-02-21T12:00:17.489Z",
    "lastCheck": {
      "success": true,
      "timestamp": "2026-02-21T12:07:47.606Z",
      "responseTimeMs": 0.5
    }
  }
}
```

**Response (Memory Cache):**
```json
{
  "type": "memory",
  "connection": {
    "connected": true,
    "responseTime": "0.1ms"
  },
  "entries": {
    "primary": 10,
    "primaryActive": 10,
    "stale": 10,
    "staleCacheAvailable": true
  },
  "performance": {
    "hitRate": "95.00%",
    "avgLatencyMs": 0.1
  },
  "healthMonitor": null
}
```

**Detection Mechanism:**
- Uses `INFO server` Redis command which returns server identification
- Valkey servers return `server:valkey` in the INFO response
- Redis servers return `server:redis` in the INFO response
- Falls back to `redis` if server type cannot be determined
- Memory cache does not include `serverType` field (not applicable)

**Configuration:**
```bash
# Redis (port 6379)
REDIS_URL=redis://localhost:6379
CACHING_HIGH_AVAILABILITY=true

# Valkey (port 6380)
REDIS_URL=redis://localhost:6380
CACHING_HIGH_AVAILABILITY=true
```

**Implementation:** `src/services/cache-health.service.ts` uses `UnifiedCacheManager.getServerType()` which delegates to `SharedRedisCache.getServerType()`.

### Debug Mode
Enable detailed debug logging:
```bash
LOG_LEVEL=debug TELEMETRY_MODE=both bun run dev
```

### Performance Analysis
Use the built-in profiling system for detailed performance analysis:
```bash
# Start profiling session
curl -X POST http://localhost:3000/debug/profiling/start

# Run operations to profile
curl http://localhost:3000/tokens \
  -H "X-Consumer-ID: test-consumer" \
  -H "X-Consumer-Username: test-consumer"

# Stop profiling session
curl -X POST http://localhost:3000/debug/profiling/stop
```

---

## Enhanced Memory Monitoring

### Overview

The service implements enhanced memory monitoring to address Bun v1.3.1 memory measurement issues and provide production-ready memory management.

**Problem Solved:** Bun's JavaScriptCore engine reports impossible memory ratios where `heapUsed > heapTotal`, causing false memory pressure alerts.

**Solution:** Multi-layered memory monitoring using `bun:jsc` APIs as primary source with adaptive memory management.

### Memory Endpoints

#### Memory Health
```bash
# Basic health check
curl http://localhost:3000/memory/health

# Detailed health with leak detection
curl http://localhost:3000/memory/health?details=true
```

**Response:**
```json
{
  "status": "healthy|warning|unhealthy|critical",
  "timestamp": 1729648800000,
  "memory": {
    "state": "normal",
    "heapUtilization": 0.23,
    "memoryPressure": "low",
    "reliability": 95,
    "queuedRequests": 0
  },
  "recommendations": ["Enhanced monitoring active"],
  "alerts": []
}
```

#### Memory Metrics
```bash
# Current metrics
curl http://localhost:3000/memory/metrics

# Include object type breakdown
curl http://localhost:3000/memory/metrics?objectTypes=true

# Trigger GC and measure effect
curl http://localhost:3000/memory/metrics?gc=true
```

#### Memory Actions
```bash
# Force garbage collection
curl -X POST http://localhost:3000/memory/actions?action=gc

# Clear request queue
curl -X POST http://localhost:3000/memory/actions?action=clearQueue

# Reset monitoring history
curl -X POST http://localhost:3000/memory/actions?action=reset
```

#### Memory Baseline
```bash
# Check baseline status
curl http://localhost:3000/memory/baseline?action=status

# Run baseline establishment
curl -X POST http://localhost:3000/memory/baseline?action=run

# Get full baseline report
curl http://localhost:3000/memory/baseline?action=report
```

### Memory Thresholds

| Level | Threshold | Behavior |
|-------|-----------|----------|
| **Normal** | <60% | Requests processed immediately |
| **Warning** | 60% | Enhanced monitoring |
| **High** | 75% | Periodic GC, reduced optimizations |
| **Critical** | 85% | Request queuing, aggressive GC |
| **Emergency** | 95% | Emergency protocols, low-priority request dropping |

### Memory Leak Detection

The system automatically detects several leak patterns:

1. **RSS Growth Without Heap Growth**: Indicates external memory leaks
2. **Excessive Promise Objects**: Unresolved promises accumulating
3. **Object Count Divergence**: Objects not being garbage collected
4. **Reliability Degradation**: Measurement system becoming unreliable

**Manual Investigation:**
```bash
# Get detailed metrics with object breakdown
curl http://localhost:3000/memory/metrics?objectTypes=true

# Check for specific object types
curl http://localhost:3000/memory/metrics | jq '.objectTypes[] | select(.type == "Promise")'
```

### Memory Troubleshooting

#### "heapUsed > heapTotal" Errors
**Cause:** JavaScriptCore measurement artifact during GC
**Solution:** Automatically handled by validation layer
**Action:** Monitor reliability score - should remain >70%

#### High Memory Pressure Alerts
```bash
# Check reliability
curl http://localhost:3000/memory/health?details=true

# Force GC and remeasure
curl http://localhost:3000/memory/metrics?gc=true

# Check for leaks
curl http://localhost:3000/memory/metrics | jq '.trends.memoryLeakDetection'
```

#### Emergency Memory Crisis
```bash
# 1. Check current status
curl http://localhost:3000/memory/health

# 2. Force garbage collection
curl -X POST http://localhost:3000/memory/actions?action=gc

# 3. Clear request queue
curl -X POST http://localhost:3000/memory/actions?action=clearQueue

# 4. Check for leaks
curl http://localhost:3000/memory/metrics?objectTypes=true
```

### Memory Alert Thresholds

| Level | Condition |
|-------|-----------|
| **Warning** | Reliability < 80% OR Health = warning |
| **Critical** | Reliability < 50% OR Health = critical |
| **Emergency** | Health = critical + Queue size > 100 |

### OpenTelemetry Memory Metrics

```
# Gauge metrics
bun_auth_service.process.memory.heap.size
bun_auth_service.process.memory.heap.utilization
bun_auth_service.process.memory.reliability.score

# Counter metrics
bun_auth_service.process.memory.gc.detected.total
bun_auth_service.process.memory.anomalies.detected.total
```

**Attributes:**
- `service.name`: authentication-service
- `runtime.name`: bun
- `memory.source`: jsc|process|hybrid
- `memory.pressure.level`: low|moderate|high|critical