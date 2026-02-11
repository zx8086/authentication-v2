# DHI Staging Deployment & Validation Guide

## Overview

This guide provides step-by-step procedures for deploying the DHI-migrated authentication service to staging and production environments with comprehensive validation and rollback procedures.

---

## Pre-Deployment Checklist

### Phase 1-4 Validation

Ensure all previous phases are complete:

- [ ] **Phase 1**: DHI POC validated (0 CVEs, Bun 1.3.0 compatible)
- [ ] **Phase 2**: Production Dockerfile updated (12/12 security score)
- [ ] **Phase 3**: All tests passing (2972/2973 unit, 146 E2E, 4615 K6 checks)
- [ ] **Phase 4**: CVE monitoring active (6-hour scans configured)

### Image Preparation

- [ ] DHI production image built: `authentication-service:dhi-prod`
- [ ] Image size verified: ≤58MB
- [ ] Security score: 12/12
- [ ] SBOM extracted and uploaded
- [ ] VEX attestations verified

### Infrastructure Requirements

- [ ] Staging environment available
- [ ] Docker/Kubernetes runtime configured
- [ ] Environment variables configured (`.env.stg`)
- [ ] Network access to Kong API Gateway
- [ ] Redis instance available (optional, graceful fallback)
- [ ] OpenTelemetry collector endpoint configured

---

## Staging Deployment Procedure

### Step 1: Image Build and Push

```bash
# Build DHI production image
docker build -t authentication-service:dhi-staging .

# Tag for staging registry
docker tag authentication-service:dhi-staging <registry>/authentication-service:staging-dhi-$(date +%Y%m%d)

# Push to registry
docker push <registry>/authentication-service:staging-dhi-$(date +%Y%m%d)
```

### Step 2: Pre-Deployment Validation

```bash
# Verify image security
bun run docker:security:validate

# Expected output: 12/12 security score

# Extract and verify SBOM
bun run docker:dhi:extract-sbom

# Verify DHI base image provenance
bun run docker:dhi:verify-provenance
```

### Step 3: Deploy to Staging

**Docker Compose Deployment:**

```bash
# Stop existing staging container
docker stop auth-service-staging 2>/dev/null || true
docker rm auth-service-staging 2>/dev/null || true

# Start DHI container in staging
docker run -d \
  --name auth-service-staging \
  --env-file .env.stg \
  -p 3002:3000 \
  --user 65532:65532 \
  --read-only \
  --tmpfs /tmp:noexec,nosuid,size=100m \
  --tmpfs /app/profiles:noexec,nosuid,size=50m \
  --cap-drop=ALL \
  --security-opt=no-new-privileges:true \
  --restart=unless-stopped \
  <registry>/authentication-service:staging-dhi-$(date +%Y%m%d)
```

**Kubernetes Deployment:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: authentication-service-staging-dhi
  namespace: staging
spec:
  replicas: 2
  selector:
    matchLabels:
      app: authentication-service
      version: dhi
  template:
    metadata:
      labels:
        app: authentication-service
        version: dhi
    spec:
      securityContext:
        runAsUser: 65532
        runAsGroup: 65532
        fsGroup: 65532
        runAsNonRoot: true
        seccompProfile:
          type: RuntimeDefault
      containers:
      - name: authentication-service
        image: <registry>/authentication-service:staging-dhi-20260211
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "staging"
        - name: TELEMETRY_MODE
          value: "otlp"
        envFrom:
        - configMapRef:
            name: auth-service-config
        - secretRef:
            name: auth-service-secrets
        resources:
          requests:
            memory: "64Mi"
            cpu: "100m"
          limits:
            memory: "128Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 10
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL
        volumeMounts:
        - name: tmp
          mountPath: /tmp
        - name: profiles
          mountPath: /app/profiles
      volumes:
      - name: tmp
        emptyDir:
          sizeLimit: 100Mi
      - name: profiles
        emptyDir:
          sizeLimit: 50Mi
```

### Step 4: Deployment Verification

```bash
# Wait for container startup
sleep 10

# Check health endpoint
curl -s http://staging-host:3002/health | jq '.'

# Expected output:
# {
#   "status": "healthy",
#   "timestamp": "2026-02-11T12:00:00Z",
#   "dependencies": {
#     "kong": "healthy",
#     "telemetry": "healthy"
#   }
# }

# Verify Bun version
docker exec auth-service-staging /usr/local/bin/bun --version
# Expected: 1.3.0

# Check container security
docker inspect auth-service-staging | jq '.[0].HostConfig.SecurityOpt'
# Expected: ["no-new-privileges:true"]

# Verify nonroot user
docker exec auth-service-staging id
# Expected: uid=65532(nonroot) gid=65532(nonroot)
```

---

## 7-Day Monitoring Period

### Critical Metrics to Track

#### 1. Health Check Success Rate
**Target:** 100%

```bash
# Monitor health endpoint
watch -n 30 'curl -s http://staging-host:3002/health | jq ".status"'

# Log health checks
for i in {1..100}; do
  curl -s http://staging-host:3002/health | jq ".status" >> health-checks.log
  sleep 60
done

# Calculate success rate
SUCCESS=$(grep -c "healthy" health-checks.log)
TOTAL=$(wc -l < health-checks.log)
SUCCESS_RATE=$(echo "scale=2; $SUCCESS/$TOTAL*100" | bc)
echo "Health check success rate: $SUCCESS_RATE%"
```

**Rollback Trigger:** < 99% success rate sustained for 1 hour

#### 2. Error Rate
**Target:** < 0.01%

```bash
# Monitor error logs
docker logs -f auth-service-staging 2>&1 | grep -i "error"

# Count errors over 1 hour
ERRORS=$(docker logs auth-service-staging --since 1h 2>&1 | grep -c "error")
TOTAL_REQUESTS=$(curl -s http://staging-host:3002/metrics | grep "http_requests_total" | awk '{print $2}')
ERROR_RATE=$(echo "scale=4; $ERRORS/$TOTAL_REQUESTS*100" | bc)
echo "Error rate: $ERROR_RATE%"
```

**Rollback Trigger:** > 2% error rate sustained for 5 minutes

#### 3. P95 Latency
**Target:** ≤ 100ms

```bash
# Run K6 smoke test against staging
K6_SMOKE_VUS=2 K6_SMOKE_DURATION=60s k6 run \
  --env BASE_URL=http://staging-host:3002 \
  test/k6/smoke/health-smoke.ts

# Check P95 latency in results
# Expected: http_req_duration P95 < 100ms
```

**Rollback Trigger:** P95 > 150ms sustained for 5 minutes

#### 4. P99 Latency
**Target:** ≤ 200ms

```bash
# Run K6 load test against staging
K6_LOAD_TARGET_VUS=10 K6_LOAD_STEADY_DURATION=5m k6 run \
  --env BASE_URL=http://staging-host:3002 \
  test/k6/load/auth-load.ts

# Check P99 latency in results
# Expected: http_req_duration P99 < 200ms
```

**Rollback Trigger:** P99 > 500ms sustained for 5 minutes

#### 5. Memory Stability
**Target:** 50-80MB stable

```bash
# Monitor memory usage
watch -n 60 'docker stats auth-service-staging --no-stream --format "table {{.Name}}\t{{.MemUsage}}"'

# Check for memory leaks (should be stable)
for i in {1..100}; do
  docker stats auth-service-staging --no-stream --format "{{.MemUsage}}" >> memory-usage.log
  sleep 300  # 5 minutes
done

# Analyze trend
# Expected: Memory stays within 50-80MB range, no continuous growth
```

**Rollback Trigger:** Memory > 100MB or continuous growth pattern

---

## Continuous Validation Tests

### Daily E2E Tests

```bash
# Run full E2E test suite against staging
BASE_URL=http://staging-host:3002 bun run test:e2e

# Expected: 146/146 tests passing
```

### Daily K6 Performance Tests

```bash
# Smoke tests
bun run test:k6:smoke:basic --env BASE_URL=http://staging-host:3002

# Load tests (daily)
bun run test:k6:load --env BASE_URL=http://staging-host:3002

# Expected results:
# - P95 < 100ms
# - P99 < 200ms
# - 0% HTTP failures
```

### Security Monitoring

```bash
# DHI CVE monitoring runs automatically every 6 hours
# Check GitHub Security tab for any new CVE alerts

# Manual CVE check
bun run docker:dhi:cve-scan

# Verify no new HIGH/CRITICAL CVEs
```

---

## Rollback Procedures

### Immediate Rollback Triggers

Execute immediate rollback if ANY of these occur:

1. **Health check failure rate > 10%** for 5 minutes
2. **Error rate > 2%** for 5 minutes
3. **P99 latency > 500ms** for 5 minutes
4. **Memory usage > 150MB**
5. **Container crashes** (restart count > 3 in 10 minutes)
6. **CRITICAL CVE** discovered in DHI base image

### Rollback Procedure

**Docker Deployment:**

```bash
# Stop DHI container
docker stop auth-service-staging
docker rm auth-service-staging

# Restore baseline container
docker run -d \
  --name auth-service-staging \
  --env-file .env.stg \
  -p 3002:3000 \
  --user 65532:65532 \
  --read-only \
  --tmpfs /tmp:noexec,nosuid,size=100m \
  --tmpfs /app/profiles:noexec,nosuid,size=50m \
  --cap-drop=ALL \
  --security-opt=no-new-privileges:true \
  --restart=unless-stopped \
  <registry>/authentication-service:baseline-distroless

# Verify health
curl -s http://staging-host:3002/health | jq '.'

# Measure rollback time
# Target: < 30 seconds from decision to healthy baseline
```

**Kubernetes Deployment:**

```bash
# Rollback to previous deployment
kubectl rollout undo deployment/authentication-service-staging-dhi -n staging

# Monitor rollback progress
kubectl rollout status deployment/authentication-service-staging-dhi -n staging

# Verify pods running baseline image
kubectl get pods -n staging -l app=authentication-service -o jsonpath='{.items[*].spec.containers[0].image}'

# Rollback time target: < 60 seconds
```

### Post-Rollback Actions

1. **Document incident**: Create incident report with metrics, logs, timeline
2. **Notify team**: Alert via Slack/email with rollback reason
3. **Create GitHub issue**: Tag with `incident`, `rollback`, `dhi-migration`
4. **Root cause analysis**: Investigate why rollback was triggered
5. **Fix and re-test**: Address issues before retry

---

## Success Criteria for Production Promotion

Deploy to production ONLY if ALL criteria met:

### Stability Criteria (7-day monitoring)

- [ ] **Health check success rate**: 100% (zero failures in 7 days)
- [ ] **Error rate**: < 0.01% (sustained for 7 days)
- [ ] **P95 latency**: < 100ms (all daily tests)
- [ ] **P99 latency**: < 200ms (all daily tests)
- [ ] **Memory stable**: 50-80MB range, no leaks
- [ ] **Zero crashes**: No container restarts
- [ ] **Zero rollbacks**: No rollback events triggered

### Security Criteria

- [ ] **DHI CVE count**: 0 HIGH/CRITICAL CVEs
- [ ] **Security score**: 12/12 maintained
- [ ] **VEX attestations**: Available and verified
- [ ] **SBOM**: Generated and uploaded for all builds

### Testing Criteria

- [ ] **E2E tests**: 146/146 passing daily
- [ ] **K6 smoke tests**: 100% success rate
- [ ] **K6 load tests**: All SLA thresholds met
- [ ] **Integration tests**: All passing with live Kong

### Operational Criteria

- [ ] **Monitoring dashboards**: Configured and working
- [ ] **Alerting**: Configured for all rollback triggers
- [ ] **Rollback tested**: Successful rollback drill completed
- [ ] **Documentation**: All runbooks updated
- [ ] **Team trained**: Ops team familiar with DHI procedures

---

## Production Deployment (Post-Staging Validation)

**Only proceed after 7-day staging validation complete and all success criteria met.**

### Production Deployment Steps

1. **Schedule maintenance window** (if required)
2. **Notify stakeholders** (deployment timeline, rollback plan)
3. **Execute deployment** (same procedure as staging)
4. **Monitor intensively** (first 24 hours critical)
5. **Validate production metrics** (same criteria as staging)
6. **Document deployment** (completion report in Linear)

### Production Monitoring (First 24 Hours)

- **Hour 1-4**: Continuous monitoring (5-minute intervals)
- **Hour 4-12**: Frequent monitoring (15-minute intervals)
- **Hour 12-24**: Regular monitoring (30-minute intervals)
- **Day 2-7**: Standard monitoring (hourly checks)

### Production Rollback

Same procedure as staging, but with additional coordination:

1. **Executive approval** for production rollback
2. **Stakeholder notification** before rollback
3. **Customer communication** (if service impact)
4. **Post-incident review** (required for production rollbacks)

---

## Validation Summary Report Template

Use this template for daily staging validation reports:

```markdown
# DHI Staging Validation Report - Day X/7

**Date:** YYYY-MM-DD
**Environment:** Staging
**Image:** authentication-service:staging-dhi-YYYYMMDD

## Health Metrics

- Health Check Success Rate: XX.XX%
- Error Rate: X.XX%
- P95 Latency: XXms
- P99 Latency: XXms
- Memory Usage: XX-XXmB (stable/increasing/decreasing)
- Container Restarts: X

## Test Results

- E2E Tests: XXX/146 passing
- K6 Smoke Tests: Pass/Fail
- K6 Load Tests: Pass/Fail

## Security Status

- DHI CVE Count: X (CRITICAL: X, HIGH: X)
- VEX Suppressed: X
- Security Score: 12/12

## Issues

- [List any issues encountered]
- [Actions taken]

## Rollback Events

- Rollback triggered: Yes/No
- Reason: [if applicable]
- Duration: [time to restore]

## Recommendation

- [ ] Continue monitoring (Day X/7)
- [ ] Promote to production (all criteria met)
- [ ] Investigate issues (blockers identified)
- [ ] Rollback required (critical issues)

**Signed:** [Name]
**Date:** YYYY-MM-DD
```

---

## Appendix: Monitoring Commands

### Quick Health Check

```bash
#!/bin/bash
# staging-health-check.sh

STAGING_URL="http://staging-host:3002"

echo "=== Staging Health Check ==="
echo "Timestamp: $(date)"
echo ""

# Health endpoint
echo "Health Status:"
curl -s $STAGING_URL/health | jq '.'
echo ""

# Metrics snapshot
echo "Metrics Summary:"
curl -s $STAGING_URL/metrics | grep -E "(http_requests_total|http_request_duration)" | head -10
echo ""

# Container stats
echo "Container Resources:"
docker stats auth-service-staging --no-stream
echo ""

# Recent errors
echo "Recent Errors (last 10):"
docker logs auth-service-staging --since 1h 2>&1 | grep -i "error" | tail -10
```

### Performance Validation

```bash
#!/bin/bash
# staging-performance-test.sh

BASE_URL="http://staging-host:3002"

echo "=== Performance Validation ==="
echo "Running K6 smoke tests..."

K6_SMOKE_VUS=2 K6_SMOKE_DURATION=60s k6 run \
  --env BASE_URL=$BASE_URL \
  test/k6/smoke/health-smoke.ts

echo ""
echo "Running K6 load tests..."

K6_LOAD_TARGET_VUS=10 K6_LOAD_STEADY_DURATION=3m k6 run \
  --env BASE_URL=$BASE_URL \
  test/k6/load/auth-load.ts

echo ""
echo "Performance validation complete"
```

---

## Contacts & Escalation

**Primary Contact:** [Engineering Team Lead]
**Escalation Path:**
1. Team Lead → Engineering Manager
2. Engineering Manager → VP Engineering
3. VP Engineering → CTO

**Response Times:**
- Critical (P0): 15 minutes
- High (P1): 1 hour
- Medium (P2): 4 hours
- Low (P3): Next business day

---

## Related Documentation

- [Docker Deployment Guide](./docker.md)
- [DHI Migration Plan](../plans/dhi-migration-plan.md)
- [Security Validation](../security/PARALLEL-SECURITY-SCANNING.md)
- [Monitoring Guide](../operations/monitoring.md)
- [SLA Documentation](../operations/SLA.md)
- [Troubleshooting Guide](../operations/TROUBLESHOOTING.md)
