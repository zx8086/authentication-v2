# Incident Response Playbook

This playbook defines escalation paths, ownership, and procedures for operational incidents affecting the Authentication Service.

## Severity Levels

| Level | Definition | Examples | Response Time | Resolution Target |
|-------|------------|----------|---------------|-------------------|
| **P1 - Critical** | Service unavailable, no tokens issued | Complete Kong outage, all circuit breakers open, process crash loop | 15 min | 1 hour |
| **P2 - High** | Degraded performance or partial failure | High latency (P99 > 500ms), intermittent 503s, Redis down in HA mode | 30 min | 4 hours |
| **P3 - Medium** | Non-critical issue, workaround exists | Telemetry export failures, elevated error rate < 5%, single replica unhealthy | 2 hours | 24 hours |
| **P4 - Low** | Minor issue, no user impact | Log format anomalies, non-blocking warnings, stale cache entries | 24 hours | 1 week |

## Escalation Matrix

### Ownership by Component

| Component | Primary Owner | Secondary Owner | Escalation |
|-----------|---------------|-----------------|------------|
| **Authentication Service** | Backend Team | Platform Team | Engineering Manager |
| **Kong Gateway** | Platform Team | Backend Team | Infrastructure Lead |
| **Redis/Valkey Cache** | Platform Team | Backend Team | Infrastructure Lead |
| **OpenTelemetry Collector** | Observability Team | Platform Team | SRE Lead |
| **Kubernetes Infrastructure** | Platform Team | SRE Team | Infrastructure Lead |
| **DNS / Network** | Network Team | Platform Team | Infrastructure Lead |

### Escalation Path

```
On-Call Engineer (0 min)
    |
    +--> Team Lead (P1/P2: 15 min, P3: 2 hours)
            |
            +--> Engineering Manager (P1: 1 hour)
                    |
                    +--> VP Engineering (P1: 2 hours unresolved)
```

## Incident Procedures

### P1: Service Completely Unavailable

**Detection**: `/health` returns non-200 or times out; Kubernetes liveness probe failing.

**Immediate Actions (0-15 min)**:
1. Verify the outage scope: single pod, single node, or cluster-wide
   ```bash
   # Check pod status
   kubectl get pods -l app=authentication-service -o wide

   # Check recent events
   kubectl describe pod <pod-name> | tail -20

   # Check health endpoint directly
   curl -s http://localhost:3000/health | jq .
   ```

2. Check Kubernetes events for OOMKilled, CrashLoopBackOff, or scheduling failures
   ```bash
   kubectl get events --sort-by='.lastTimestamp' | grep authentication
   ```

3. Check Kong Gateway connectivity
   ```bash
   curl -s http://localhost:3000/health | jq '.dependencies.kong'
   ```

4. If pods are crash-looping, check logs for startup errors
   ```bash
   kubectl logs -l app=authentication-service --tail=50 --previous
   ```

**Mitigation**:
- If single pod: Kubernetes auto-restarts via liveness probe (recovery ~30s)
- If all pods: Check shared dependency (Kong, Redis) or configuration change
- If configuration error: Roll back to last known good deployment
  ```bash
  kubectl rollout undo deployment/authentication-service
  ```

**Resolution**: Identify root cause, apply fix, verify with recovery checklist (see below).

---

### P1: All Circuit Breakers Open

**Detection**: `/health` returns `circuitBreakerState: "open"` or `AUTH_005` errors.

**Immediate Actions**:
1. Check Kong Admin API health
   ```bash
   curl -s http://localhost:3000/health | jq '.dependencies.kong'
   ```

2. Check circuit breaker metrics
   ```bash
   curl -s "http://localhost:3000/metrics?view=operational" | jq '.circuitBreakers'
   ```

3. If Kong is healthy but circuit breakers are open, check for network partition between auth service and Kong

4. If stale cache is serving (HA mode), assess data freshness
   ```bash
   curl -s http://localhost:3000/health | jq '.dependencies.cache'
   ```

**Mitigation**:
- Circuit breakers auto-recover after `CIRCUIT_BREAKER_RESET_TIMEOUT` (default 60s)
- If HA mode: stale cache continues serving tokens during recovery
- If non-HA mode: token generation fails until Kong recovers

---

### P2: High Latency

**Detection**: P95 latency exceeds SLA thresholds (tokens > 100ms, health > 400ms).

**Diagnosis**:
1. Check which component is slow
   ```bash
   # Overall metrics
   curl -s "http://localhost:3000/metrics?view=operational" | jq .

   # Kong response times
   curl -s http://localhost:3000/health | jq '.dependencies.kong.responseTime'

   # Cache performance
   curl -s http://localhost:3000/health | jq '.dependencies.cache.performance'
   ```

2. If Kong is slow: escalate to Platform Team (Kong gateway issue)
3. If cache miss rate is high: check Redis connectivity and TTL configuration
4. If CPU is high: check for event loop blocking
   ```bash
   curl -s "http://localhost:3000/metrics?view=operational" | jq '.memory'
   ```

**Mitigation**:
- Increase `CIRCUIT_BREAKER_TIMEOUT` temporarily if Kong is transiently slow
- Scale horizontally via HPA if load-related
- Enable profiling for deep analysis: `CONTINUOUS_PROFILING_ENABLED=true`

---

### P2: Redis/Valkey Cache Unavailable

**Detection**: Health endpoint shows cache connection failure, or `cache.connection.connected: false`.

**Diagnosis**:
1. Check cache health
   ```bash
   curl -s http://localhost:3000/health | jq '.dependencies.cache'
   ```

2. Verify Redis connectivity from the pod
   ```bash
   kubectl exec <pod-name> -- redis-cli -h <redis-host> ping
   ```

**Impact**:
- **HA mode**: Falls back to in-memory stale cache (Layer 3), tokens still served for previously cached consumers
- **Non-HA mode**: No impact (in-memory cache is primary)

**Mitigation**:
- Service auto-reconnects when Redis recovers
- Cache circuit breaker prevents connection storms
- No manual intervention required unless Redis is permanently down

---

### P3: Telemetry Export Failures

**Detection**: `/health/telemetry` shows export failures, or Observability dashboards show data gaps.

**Diagnosis**:
1. Check telemetry health
   ```bash
   curl -s http://localhost:3000/health/telemetry | jq '.telemetry'
   ```

2. Check per-signal circuit breaker status
   ```bash
   curl -s http://localhost:3000/health | jq '.dependencies.telemetry'
   ```

**Impact**: No service impact. Telemetry is non-blocking. Observability data may be lost during the outage.

**Mitigation**:
- Telemetry circuit breakers auto-recover
- Console logging continues regardless of OTLP status
- Escalate to Observability Team if collector is down

---

## Recovery Verification Checklist

After any incident resolution, verify all of the following:

```bash
# 1. Health check returns healthy
curl -s http://localhost:3000/health | jq '.status'
# Expected: "healthy"

# 2. Kong dependency is healthy
curl -s http://localhost:3000/health | jq '.dependencies.kong.status'
# Expected: "healthy"

# 3. Token generation works
curl -s http://localhost:3000/tokens \
  -H "X-Consumer-ID: test-id" \
  -H "X-Consumer-Username: test-user" | jq .
# Expected: 200 with access_token (or 401 if consumer does not exist)

# 4. Metrics are being collected
curl -s http://localhost:3000/metrics | jq '.telemetry.exportStats'
# Expected: successfulExports incrementing

# 5. All pods are ready
kubectl get pods -l app=authentication-service
# Expected: all pods Running and Ready

# 6. Circuit breakers are closed
curl -s http://localhost:3000/health | jq '.circuitBreakerState'
# Expected: "closed"
```

## Communication Templates

### Initial Notification (P1/P2)

```
Subject: [P<level>] Authentication Service - <brief description>

Status: Investigating
Impact: <describe user-facing impact>
Start Time: <ISO-8601 timestamp>
On-Call: <engineer name>

Initial findings: <what is known so far>
Next update in: <time>
```

### Resolution Notification

```
Subject: [RESOLVED] Authentication Service - <brief description>

Status: Resolved
Duration: <total incident duration>
Impact: <final impact assessment>
Root Cause: <brief root cause>
Resolution: <what was done to fix it>
Follow-up: <any pending items or postmortem>
```

## Post-Incident Process

1. **Blameless postmortem** within 48 hours for P1/P2 incidents
2. **Timeline reconstruction** with relevant logs, metrics, and trace IDs
3. **Action items** tracked in Linear with deadlines
4. **SLA impact assessment** against error budget (see [SLA Documentation](sla.md))

## Related Documentation

| Document | Description |
|----------|-------------|
| [Troubleshooting Guide](troubleshooting.md) | Diagnosis and resolution for all 12 error codes |
| [SLA Documentation](sla.md) | Performance targets, error budgets, recovery objectives |
| [Monitoring Guide](monitoring.md) | Metrics catalog, health endpoints, alerting rules |
| [Configuration Guide](../configuration/environment.md) | Environment variables and circuit breaker tuning |
