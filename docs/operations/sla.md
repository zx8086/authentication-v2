# Performance SLA Documentation

This document defines the Service Level Agreements (SLAs) for the Authentication Service, providing explicit performance expectations for SRE teams and stakeholders.

## Response Time SLAs

| Endpoint Category | P50 | P95 | P99 | Max |
|-------------------|-----|-----|-----|-----|
| Health Check (`/health`) | <100ms | <400ms | <500ms | <1000ms |
| Token Generation (`/tokens`) | <50ms | <100ms | <200ms | <500ms |
| Token Validation (`/tokens/validate`) | <25ms | <50ms | <100ms | <200ms |
| Metrics (`/metrics`) | <10ms | <25ms | <50ms | <100ms |
| OpenAPI Spec (`/`) | <20ms | <50ms | <100ms | <200ms |

**Note on Health Endpoint Performance:**

The `/health` endpoint performs active OTLP connectivity validation, testing all configured OpenTelemetry endpoints (traces, metrics, logs) in parallel with a 5-second timeout per endpoint. This adds network latency to health check response times:

- **Without OTLP checks**: p95 ~10ms, p99 ~25ms
- **With OTLP checks**: p95 ~400ms, p99 ~500ms

For lightweight liveness checks without OTLP validation, use `/health/ready` which only validates Kong connectivity (p95 <10ms, p99 <25ms).

### Measurement Methodology

- Response times measured from request receipt to response sent
- Excludes network latency between client and service
- Measured at application level via OpenTelemetry instrumentation
- K6 performance tests validate these SLAs in CI/CD pipeline

## Availability SLA

| Metric | Target | Measurement |
|--------|--------|-------------|
| Service Availability | 99.9% | Health endpoint responding with 200 |
| Token Issuance Availability | 99.5% | Successful token generation rate |

### Exclusions

- Planned maintenance windows (communicated 24h in advance)
- Kong API Gateway dependency failures
- Infrastructure-level outages (network, compute)
- Force majeure events

### Degraded Mode Operation

The service supports degraded mode when Kong is unavailable:
- Health checks continue to respond
- Metrics collection continues
- Token generation returns `AUTH_004` or `AUTH_005` errors
- Circuit breaker provides stale cache fallback when enabled

### Health response interpretation for SLA monitoring

A `200 + status: "degraded"` response is a **passing** /health response for SLA purposes — the service is still authenticating consumers. SLA monitoring should treat:

- `200 + healthy` and `200 + degraded` as **available**
- `503 + unhealthy` as **unavailable**

If monitoring tools assert specifically on `status: "healthy"`, they will trigger spurious incidents during telemetry or Kong partial outages. Update assertions to either check `response.status === 200` or accept both `healthy` and `degraded` as success states.

## Throughput Targets

| Endpoint | Target RPS | Notes |
|----------|-----------|-------|
| Health Check | 100,000+ | Bun native performance |
| Token Generation | 10,000+ | With Kong caching enabled |
| Token Validation | 15,000+ | Local validation only |
| Metrics | 50,000+ | Aggregated metrics |

### Concurrent Connection Limits

- Maximum concurrent connections: 10,000+
- Connection keep-alive: Enabled
- Request timeout: 30 seconds

## Resource Limits

| Resource | Baseline | Warning | Critical | Max |
|----------|----------|---------|----------|-----|
| Memory (RSS) | 50-80MB | >180MB (70%) | >200MB (80%) | 256MB |
| CPU Usage | <1% idle | >50% | >80% | - |
| Event Loop Delay | <10ms | >50ms | >100ms | - |
| Heap Usage | 30-50MB | >70% | >85% | - |

### Cold Start Performance

- Target cold start time: <100ms
- Includes telemetry initialization
- Measured from process spawn to first request handled

## Circuit Breaker SLAs

The service implements circuit breaker patterns for Kong API calls (via Opossum).

> For circuit breaker architecture, state transitions, and failure scenario matrix, see **[Architecture Overview - Circuit Breaker](../architecture/overview.md#resilience-circuit-breaker)**.
>
> For circuit breaker environment variable configuration, see **[Configuration Guide - Kong Circuit Breaker](../configuration/environment.md#kong-circuit-breaker)**.

**Key SLA-relevant parameters:**

| Parameter | Default | SLA Impact |
|-----------|---------|------------|
| Request Timeout | 5s | Determines max token generation latency during Kong issues |
| Error Threshold | 50% | Lower = faster protection, higher = more tolerance for transient errors |
| Reset Timeout | 60s | Time before recovery attempt; affects degraded mode duration |
| Volume Threshold | 3 | Minimum requests before circuit can trip; prevents false positives |

## Monitoring Thresholds

### Alert Definitions

| Metric | Warning Threshold | Critical Threshold | Window |
|--------|-------------------|-------------------|--------|
| Event Loop Delay | >50ms | >100ms | 1 min |
| Memory Usage | >70% | >80% | 1 min |
| HTTP Error Rate (5xx) | >2% | >5% | 5 min |
| Kong Latency (P95) | >200ms | >500ms | 5 min |
| Circuit Breaker Opens | >1/hour | >3/hour | 1 hour |
| Token Generation Errors | >1% | >5% | 5 min |

### Metric Collection

- Collection interval: 15 seconds (default)
- Export interval: 60 seconds (OTLP)
- Cardinality guard: Max 1000 unique consumers tracked

## Error Budget

| SLA Target | Monthly Downtime Budget |
|------------|------------------------|
| 99.9% | 43.2 minutes |
| 99.5% | 3.6 hours |
| 99.0% | 7.2 hours |

### Error Budget Policy

1. **Green Zone (>50% remaining)**: Normal development velocity
2. **Yellow Zone (25-50% remaining)**: Increased focus on reliability
3. **Red Zone (<25% remaining)**: Feature freeze, reliability focus only

## Disaster Recovery

### Recovery Objectives

| Objective | Target | Description |
|-----------|--------|-------------|
| RTO (Recovery Time Objective) | <5 minutes | Maximum time to restore service after failure |
| RPO (Recovery Point Objective) | N/A | Stateless service - no persistent data to lose |

**Rationale:**
- Service is stateless (JWT tokens generated on-demand, no persistent state)
- Consumer secrets are stored in Kong (external dependency)
- Redis cache is ephemeral and non-critical (rebuilt on startup)
- Fast container startup (<100ms cold start) enables rapid recovery

### Recovery Procedures

| Failure Scenario | Recovery Mechanism | Expected Recovery Time |
|------------------|-------------------|----------------------|
| Pod Failure | Kubernetes auto-restart (liveness probe) | ~30 seconds |
| Node Failure | Kubernetes pod rescheduling | <2 minutes |
| Zone Failure | Pod anti-affinity ensures cross-zone distribution | <2 minutes |
| Kong Dependency Failure | Circuit breaker with stale cache fallback | Immediate (degraded) |
| Redis Cache Failure | Fallback to in-memory cache | Immediate (degraded) |
| Complete Cluster Failure | Kubernetes deployment rollout | <5 minutes |

### Dependency Failure Scenarios

#### Kong API Gateway Unavailable

1. Circuit breaker opens when error rate exceeds 50% (with minimum 3 requests in rolling window)
2. Stale cache serves cached consumer secrets (if available)
3. New token requests return `AUTH_004` (Kong Unavailable) or `AUTH_005` (Circuit Breaker Open)
4. Health check reports degraded status
5. Automatic recovery when Kong becomes available (half-open state)

#### Redis Cache Unavailable

1. Service detects Redis connection failure
2. Falls back to in-memory cache (local to each pod)
3. Cache hit rate may decrease temporarily
4. No impact on correctness (cache is optimization only)
5. Automatic reconnection when Redis recovers

#### Telemetry Collector Unavailable

1. Telemetry export failures are logged
2. Metrics buffered in-memory (up to max queue size)
3. No impact on service functionality
4. Automatic retry with exponential backoff

### Recovery Verification

After any recovery event, verify:

1. **Health Check**: `GET /health` returns 200 with `status: healthy`
2. **Token Generation**: `GET /tokens` successfully issues tokens
3. **Metrics**: `GET /metrics` shows metrics being collected
4. **Dependencies**: Health check shows Kong connectivity restored

```bash
# Quick recovery verification
curl -s http://localhost:3000/health | jq '.status'
# Expected: "healthy"

curl -s http://localhost:3000/health | jq '.dependencies.kong.status'
# Expected: "healthy"
```

## Dependency SLAs

### Kong API Gateway

| Metric | Expectation |
|--------|-------------|
| Admin API Availability | 99.9% |
| Admin API Latency (P95) | <100ms |
| Consumer Secret Retrieval | <50ms |

### Cache (Redis/Memory)

| Metric | Expectation |
|--------|-------------|
| Cache Availability | 99.99% |
| Cache Latency (P95) | <5ms |
| Cache Hit Rate | >80% |

## Validation

### Chaos Engineering Tests

Resilience patterns are validated via chaos engineering tests in `test/chaos/`:

```bash
# Run all chaos tests
bun test test/chaos/ --timeout 60000

# Individual test suites
bun test test/chaos/kong-failure.test.ts      # 19 tests - Kong API failures
bun test test/chaos/redis-failure.test.ts     # 14 tests - Redis cache failures
bun test test/chaos/resource-exhaustion.test.ts  # 14 tests - Memory/CPU pressure
bun test test/chaos/network-partition.test.ts # 10 tests - Network partitions
```

### Chaos Test Coverage

| Scenario | Tests | Validates |
|----------|-------|-----------|
| Kong API Timeout | 2 | Circuit breaker opens after timeout |
| Kong 500 Errors | 2 | Error threshold triggers circuit |
| Connection Refused | 1 | Fast rejection when Kong unreachable |
| Stale Cache Fallback | 3 | Cache serves during circuit open |
| Circuit Recovery | 2 | Half-open to closed transition |
| Intermittent Connectivity | 3 | Flapping prevention |
| High Latency | 3 | Timeout boundary handling |
| Redis READONLY | 1 | Graceful degradation |
| Memory Pressure | 3 | Large payload handling |
| Event Loop Blocking | 3 | CPU-intensive operation limits |

### K6 Performance Tests

SLAs are validated via K6 tests in CI/CD:

```bash
# Smoke test (quick validation)
bun run test:k6:smoke:health
bun run test:k6:smoke:tokens

# Load test (sustained load)
bun run test:k6:load

# Stress test (breaking point)
bun run test:k6:stress
```

### K6 Threshold Configuration

```javascript
// From test/k6/utils/config.ts
export const healthThresholds = {
  http_req_duration: ['p(95)<300', 'p(99)<600'],
  http_req_failed: ['rate<0.01'],
};

export const tokenThresholds = {
  http_req_duration: ['p(95)<50', 'p(99)<100'],
  http_req_failed: ['rate<0.05'],
};
```

## Incident Response

### Severity Levels

| Level | Definition | Response Time | Resolution Time |
|-------|------------|---------------|-----------------|
| P1 - Critical | Service unavailable | 15 min | 1 hour |
| P2 - High | Degraded performance | 30 min | 4 hours |
| P3 - Medium | Non-critical issue | 2 hours | 24 hours |
| P4 - Low | Minor issue | 24 hours | 1 week |

### Escalation Path

1. On-call engineer investigates
2. Team lead notified if P1/P2
3. Engineering manager if >1 hour P1
4. VP Engineering if >2 hours P1

## Related Documentation

- [Monitoring Guide](monitoring.md) - Detailed observability setup
- [Troubleshooting Guide](troubleshooting.md) - Common issues and resolutions
- [API Endpoints](../api/endpoints.md) - Complete API reference
