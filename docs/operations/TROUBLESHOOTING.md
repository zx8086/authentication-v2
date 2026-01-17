# Troubleshooting Guide

This runbook-style guide helps diagnose and resolve common operational issues with the Authentication Service.

## Quick Diagnostics

### Health Check Commands

```bash
# Basic health check
curl -s http://localhost:3000/health | jq .

# Health check with telemetry status
curl -s http://localhost:3000/health/telemetry | jq .

# Detailed metrics view
curl -s http://localhost:3000/metrics | jq .

# Full metrics with all subsystems
curl -s "http://localhost:3000/metrics?view=full" | jq .

# Debug info (non-production)
curl -s http://localhost:3000/debug/info | jq .
```

### Service Status Indicators

| Endpoint | Expected Response | Unhealthy Sign |
|----------|-------------------|----------------|
| `/health` | `{"status":"healthy"}` | Non-200 or timeout |
| `/health/telemetry` | `{"healthy":true}` | `{"healthy":false}` |
| `/metrics` | JSON with `circuitBreaker` | Missing or error |

---

## Common Issues

### 1. Token Generation Failures (AUTH_003)

**Error Code**: `AUTH_003` - JWT Creation Failed
**HTTP Status**: 500

**Symptoms**:
- POST `/tokens` returns 500 error
- Logs show "Failed to create JWT token"

**Diagnosis**:
```bash
# Check Kong connectivity
curl -s http://localhost:3000/health | jq '.dependencies.kong'

# Check circuit breaker state
curl -s "http://localhost:3000/metrics?view=operational" | jq '.circuitBreaker'

# Check consumer exists in Kong
curl -s http://localhost:3000/metrics | jq '.kong'
```

**Root Causes**:
1. Consumer doesn't exist in Kong
2. Consumer has no JWT credentials configured
3. Kong JWT plugin misconfigured

**Resolution**:
1. Verify consumer exists in Kong Admin API
2. Ensure consumer has JWT credentials provisioned
3. Check Kong JWT plugin configuration
4. Review logs for specific error details

---

### 2. Kong Unavailable (AUTH_004)

**Error Code**: `AUTH_004` - Kong API Unavailable
**HTTP Status**: 503

**Symptoms**:
- All token requests fail with 503
- Response includes `Retry-After: 30` header
- Logs show "Kong service unavailable"

**Diagnosis**:
```bash
# Check Kong health directly
curl -s ${KONG_ADMIN_URL}/status

# Check service health view
curl -s http://localhost:3000/health | jq '.dependencies'

# Check circuit breaker state
curl -s "http://localhost:3000/metrics?view=operational" | jq '.circuitBreaker.states'
```

**Root Causes**:
1. Kong Admin API is down
2. Network connectivity issues
3. Kong Admin Token expired/invalid
4. DNS resolution failure

**Resolution**:
1. Verify Kong Admin API is accessible
2. Check `KONG_ADMIN_URL` configuration
3. Validate `KONG_ADMIN_TOKEN` is correct
4. Check network/firewall rules
5. Wait for automatic retry after 30 seconds

---

### 3. Circuit Breaker Open (AUTH_005)

**Error Code**: `AUTH_005` - Circuit Breaker Open
**HTTP Status**: 503

**Symptoms**:
- Immediate 503 responses
- Logs show "Circuit breaker open"
- No Kong API calls being made

**Diagnosis**:
```bash
# Check circuit breaker states
curl -s "http://localhost:3000/metrics?view=operational" | jq '.circuitBreaker'

# Check recent failures
curl -s "http://localhost:3000/metrics?view=full" | jq '.circuitBreaker.failureCounts'
```

**Circuit Breaker States**:
| State | Meaning | Action |
|-------|---------|--------|
| `closed` | Normal operation | None needed |
| `open` | Failures exceeded threshold | Wait for recovery |
| `half-open` | Testing recovery | Monitor results |

**Resolution**:
1. Wait 30 seconds for half-open state
2. Fix underlying Kong issue (see AUTH_004)
3. If stale cache available, service continues with cached data
4. Monitor circuit breaker recovery in logs

---

### 4. High Memory Usage

**Symptoms**:
- Memory alerts triggered
- OOM kills in container
- Slow response times

**Diagnosis**:
```bash
# Check memory metrics
curl -s "http://localhost:3000/metrics?view=infrastructure" | jq '.memory'

# Check process stats
curl -s "http://localhost:3000/metrics?view=full" | jq '.process'

# Check GC metrics
curl -s "http://localhost:3000/metrics?view=full" | jq '.gc'
```

**Warning Thresholds**:
- Warning: >70% memory (>180MB of 256MB)
- Critical: >80% memory (>200MB of 256MB)

**Root Causes**:
1. Memory leak from uncleared intervals
2. Large cache size
3. High cardinality metrics
4. Uncollected GC objects

**Resolution**:
1. Verify graceful shutdown clears all intervals (fixed in recent update)
2. Check cache size and TTL configuration
3. Review cardinality guard bucket usage
4. Consider increasing memory limit
5. Restart service if memory leak suspected

---

### 5. Slow Response Times

**Symptoms**:
- P95/P99 latency exceeds SLA
- Health checks slow
- Token generation taking >500ms

**Diagnosis**:
```bash
# Check latency metrics
curl -s "http://localhost:3000/metrics?view=operational" | jq '.latency'

# Check Kong latency specifically
curl -s "http://localhost:3000/metrics?view=full" | jq '.kong.latency'

# Check event loop delay
curl -s "http://localhost:3000/metrics?view=infrastructure" | jq '.eventLoop'
```

**Root Causes**:
1. Kong Admin API slow
2. Cache misses
3. Event loop blocking
4. High CPU usage

**Resolution**:
1. Check Kong Admin API performance
2. Review cache hit rates, increase TTL if needed
3. Check for synchronous blocking operations
4. Review consumer volume classification
5. Consider scaling horizontally

---

### 6. Missing Trace Context

**Symptoms**:
- Distributed traces incomplete
- Kong requests not correlated
- No trace IDs in logs

**Diagnosis**:
```bash
# Check telemetry status
curl -s http://localhost:3000/health/telemetry | jq .

# Verify trace headers in response
curl -v http://localhost:3000/health 2>&1 | grep -i traceparent
```

**Root Causes**:
1. OpenTelemetry not initialized
2. OTLP endpoint unreachable
3. W3C trace context not propagated

**Resolution**:
1. Check `TELEMETRY_MODE` configuration
2. Verify OTLP endpoint URLs
3. Ensure W3C trace headers propagated (via `createStandardHeaders()`)
4. Check telemetry circuit breaker state

---

### 7. Missing Consumer Headers (AUTH_001)

**Error Code**: `AUTH_001` - Missing Consumer Headers
**HTTP Status**: 401

**Symptoms**:
- Token requests return 401
- Error message mentions missing headers

**Expected Headers**:
| Header | Description |
|--------|-------------|
| `X-Consumer-ID` | Kong consumer UUID |
| `X-Consumer-Username` | Kong consumer username |

**Resolution**:
1. Ensure requests come through Kong gateway
2. Verify Kong consumer authentication plugin configured
3. Check Kong is injecting consumer headers
4. Review Kong route configuration

---

### 8. Header Validation Errors (AUTH_007)

**Error Code**: `AUTH_007` - Invalid Request Format
**HTTP Status**: 400

**Symptoms**:
- Token requests return 400
- Error mentions "Header value exceeds maximum allowed length"

**Validation Rules**:
- Maximum header length: 256 characters
- Applies to `X-Consumer-ID` and `X-Consumer-Username`

**Resolution**:
1. Check consumer ID/username length in Kong
2. Truncate or reconfigure consumer identifiers
3. This is a security measure to prevent injection attacks

---

## Error Code Reference

| Code | HTTP | Title | Typical Action |
|------|------|-------|----------------|
| AUTH_001 | 401 | Missing Consumer Headers | Check Kong gateway configuration |
| AUTH_002 | 401 | Consumer Not Found | Create consumer in Kong |
| AUTH_003 | 500 | JWT Creation Failed | Check Kong JWT plugin |
| AUTH_004 | 503 | Kong API Unavailable | Verify Kong connectivity |
| AUTH_005 | 503 | Circuit Breaker Open | Wait for recovery |
| AUTH_006 | 429 | Rate Limit Exceeded | Reduce request rate |
| AUTH_007 | 400 | Invalid Request Format | Check header length |
| AUTH_008 | 500 | Internal Server Error | Check logs for details |
| AUTH_009 | 401 | Anonymous Consumer | Configure authenticated consumer |
| AUTH_010 | 401 | Token Expired | Request new token |
| AUTH_011 | 400 | Invalid Token | Check token format |
| AUTH_012 | 400 | Missing Authorization | Add Bearer token |

---

## Graceful Shutdown Verification

The service implements proper interval cleanup during shutdown:

### Shutdown Functions Called

| Function | Purpose |
|----------|---------|
| `shutdownGCMetrics()` | Stops GC monitoring interval |
| `shutdownConsumerVolume()` | Clears consumer tracking interval |
| `shutdownCardinalityGuard()` | Clears cardinality cleanup interval |
| `shutdownTelemetryCircuitBreakers()` | Clears circuit breaker intervals |
| `shutdownMetrics()` | Flushes final metrics |
| `shutdownSimpleTelemetry()` | Flushes traces and closes exporters |

### Verifying Clean Shutdown

```bash
# Send SIGTERM and check logs
kill -TERM <pid>

# Expected log sequence:
# - "Shutdown sequence initiated"
# - "Stopping HTTP server"
# - "Clearing intervals"
# - "Flushing telemetry"
# - "Shutdown complete"
```

### Timeout Behavior

- Graceful shutdown timeout: 10 seconds
- If exceeded, process force-exits with code 1
- Force exit logs: "Graceful shutdown timeout - forcing exit"

---

## Log Analysis

### Key Log Fields

| Field | Description |
|-------|-------------|
| `component` | Service component (server, kong, telemetry) |
| `event` | Event type (startup, shutdown, error) |
| `operation` | Specific operation (health_check, token_issue) |
| `requestId` | Request correlation ID |
| `errorCode` | Structured error code (AUTH_XXX) |
| `duration` | Operation duration in ms |

### Useful Log Queries

```bash
# Find all errors
grep '"level":"error"' logs.json | jq .

# Find Kong issues
grep '"component":"kong"' logs.json | jq .

# Find slow operations (>100ms)
grep -E '"duration":[1-9][0-9]{2,}' logs.json | jq .

# Find circuit breaker events
grep '"circuitBreaker"' logs.json | jq .
```

---

## Escalation Checklist

Before escalating, verify:

- [ ] Service health endpoint responding
- [ ] Kong Admin API accessible
- [ ] Circuit breaker state checked
- [ ] Recent logs reviewed
- [ ] Memory and CPU within limits
- [ ] OTLP endpoint connectivity verified
- [ ] Error codes documented in ticket

---

## Related Documentation

- [Performance SLA](SLA.md) - SLA definitions and thresholds
- [Monitoring Guide](monitoring.md) - Observability setup
- [API Endpoints](../api/endpoints.md) - Complete API reference
- [Environment Setup](../configuration/environment-setup.md) - Configuration options
