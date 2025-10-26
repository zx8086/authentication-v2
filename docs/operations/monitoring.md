# Observability & Monitoring

## OpenTelemetry Integration

The service implements cost-optimized observability using vendor-neutral OpenTelemetry standards, compatible with Elastic APM, Datadog, New Relic, and other OTLP-compliant platforms. Recent improvements include consolidated metrics endpoints and reduced telemetry overhead.

### Telemetry Features

#### Distributed Tracing
- HTTP request tracing with automatic span correlation
- Request ID generation for end-to-end tracing
- Kong API call instrumentation
- JWT generation timing
- Circuit breaker state transitions
- Cache tier usage tracking

#### Consolidated Metrics Collection
- **Runtime Metrics**: Event loop delay, memory usage, CPU utilization
- **System Metrics**: Host-level CPU, memory, disk, network via HostMetrics
- **Business Metrics**: JWT generation, Kong operations, cache performance
- **Circuit Breaker Metrics**: Failure rates, state transitions, stale cache usage
- **Cache Metrics**: Hit rates, tier usage, operations by backend
- **Unified Metrics Endpoint**: Single endpoint with multiple views for different operational needs

#### Structured Logging
- ECS (Elastic Common Schema) format
- Winston transport with OpenTelemetry correlation
- Request context propagation
- Error tracking with stack traces

## Telemetry Modes

Configure via `TELEMETRY_MODE` environment variable:

| Mode | Description | Use Case |
|------|-------------|----------|
| `console` | Logs only to console | Development |
| `otlp` | Exports only to OTLP endpoints | Production |
| `both` | Console logs + OTLP export | Debugging |

## Key Metrics

### Consolidated Metrics
| Metric Name | Type | Description |
|------------|------|-------------|
| `nodejs.eventloop.delay` | Gauge | Event loop utilization percentage |
| `process.memory.usage` | Gauge | Memory usage by type |
| `process.cpu.usage` | Gauge | CPU utilization percentage |
| `http_requests_total` | Counter | Total HTTP requests by status |
| `http_request_duration` | Histogram | Request duration distribution |
| `jwt_tokens_generated` | Counter | JWT tokens issued |
| `kong_admin_requests` | Counter | Kong Admin API calls |
| `cache_operations` | Counter | Cache hits/misses by operation |
| `circuit_breaker_state` | Gauge | Circuit breaker state (0=closed, 1=open, 2=half-open) |
| `circuit_breaker_requests` | Counter | Circuit breaker requests by result |
| `cache_tier_operations` | Counter | Cache tier usage (redis-stale, in-memory) |
| `cache_tier_latency` | Histogram | Cache tier access latency by operation |
| `unified_metrics_collection` | Counter | Consolidated metrics endpoint usage |

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
  "uptime": 3600,
  "version": "1.0.0",
  "environment": "production",
  "dependencies": {
    "kong": {
      "status": "healthy",
      "mode": "KONNECT",
      "url": "https://us.api.konghq.com/v2/control-planes/abc123",
      "responseTime": 45
    },
    "telemetry": {
      "status": "healthy",
      "mode": "otlp",
      "endpoints": {
        "traces": "https://otel.example.com/v1/traces",
        "metrics": "https://otel.example.com/v1/metrics"
      }
    }
  }
}
```

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

#### Metrics Health Check - `/health/metrics`
```bash
curl http://localhost:3000/health/metrics
```

Returns metrics system status:
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
  "uptime": 3600,
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

### OpenTelemetry Configuration
```bash
# Production telemetry configuration
TELEMETRY_MODE=otlp
OTEL_SERVICE_NAME=authentication-service
OTEL_SERVICE_VERSION=1.0.0
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=https://otel.example.com/v1/traces
OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=https://otel.example.com/v1/metrics
OTEL_EXPORTER_OTLP_LOGS_ENDPOINT=https://otel.example.com/v1/logs
OTEL_EXPORTER_OTLP_TIMEOUT=30000
OTEL_BSP_MAX_EXPORT_BATCH_SIZE=2048
OTEL_BSP_MAX_QUEUE_SIZE=10000
```

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
    path: /health
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
```

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
```

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