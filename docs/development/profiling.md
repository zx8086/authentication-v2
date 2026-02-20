# Profiling Guide

Complete guide to profiling workflows and network workarounds for the authentication service.

## Quick Start

### Profile Token Generation
```bash
bun run profile:scenario:tokens
```

### Profile During K6 Tests
```bash
ENABLE_PROFILING=true bun run test:k6:smoke:health
```

### View Analysis After Profiling
Enhanced analysis with actionable recommendations is automatically displayed.

---

## Profiling Scenarios

### Available Commands

```bash
# Token generation scenario
bun run profile:scenario:tokens

# Health check endpoint
bun run profile:scenario:health

# Token validation
bun run profile:scenario:validate

# Mixed workload
bun run profile:scenario:mixed

# Profile during K6 smoke tests
ENABLE_PROFILING=true bun run test:k6:smoke:health

# Profile during K6 load tests
ENABLE_PROFILING=true bun run test:k6:load
```

---

## Profile Types

### CPU Profile (`CPU.*.md`)

Shows which functions consume the most CPU time:
- Identifies computational bottlenecks
- Includes "Hot Functions" table sorted by self time
- Best for: Optimization of CPU-intensive operations

### Heap Profile (`Heap.*.md`)

Shows memory allocation patterns:
- Identifies memory leaks
- Tracks heap growth over time
- Best for: Memory optimization and leak detection

---

## Analysis Reports

After profiling, you'll see an enhanced analysis report with:

1. **Performance Summary**: SLA compliance status
2. **Top CPU Consumers**: Table of hottest functions
3. **Memory Usage**: Heap statistics and growth
4. **Optimization Opportunities**: Severity-ranked recommendations

Example recommendation:
```markdown
### HIGH: Kong Cache
**Issue**: Kong consumer lookups consuming 23.1% CPU time (target: <15%)
**Expected Impact**: -10-15ms P95 latency, -20% Kong API calls
**Action Items**:
1. Increase CACHING_TTL_SECONDS from 300 to 600 in .env
2. Review cache invalidation logic in src/services/kong/consumer.service.ts
3. Monitor metric: kong_cache_hits_total / kong_operations_total
```

---

## Common Workflows

### Workflow 1: Optimizing Token Generation

**Goal**: Reduce token generation latency from P95 100ms to <80ms

```bash
# Step 1: Create baseline profile
bun run profile:scenario:tokens

# Step 2: Review analysis and identify bottlenecks

# Step 3: Implement optimization

# Step 4: Profile after optimization
bun run profile:scenario:tokens

# Step 5: Compare results

# Step 6: Archive baseline
bun scripts/profiling/archive-profile.ts \
  --profile=profiles/current/tokens-old.cpu-prof.md \
  --label="baseline-v1.0"
```

### Workflow 2: Investigating Production Slowness

**Scenario**: Production experiencing elevated P95 latency

```bash
# Step 1: Enable continuous profiling (in production .env)
CONTINUOUS_PROFILING_ENABLED=true
CONTINUOUS_PROFILING_AUTO_TRIGGER_ON_SLA=true
CONTINUOUS_PROFILING_THROTTLE_MINUTES=60

# Step 2: Wait for automatic SLA violation trigger
# System will automatically profile when thresholds exceeded

# Step 3: Review auto-generated profiles
ls -lh profiles/auto/

# Step 4: Analyze the profile
cat profiles/auto/tokens-*.cpu-prof.md
```

### Workflow 3: K6 Performance Testing with Profiling

```bash
# Step 1: Run K6 test with profiling enabled
ENABLE_PROFILING=true K6_SMOKE_VUS=10 K6_SMOKE_DURATION=30s \
  bun run test:k6:smoke:health

# Step 2: Review profile in test/results/profiling/

# Step 3: Optimize based on recommendations

# Step 4: Re-run to validate improvement
```

### Workflow 4: Memory Leak Investigation

```bash
# Step 1: Profile with longer duration for heap analysis
bun run profile:scenario:mixed --duration=300  # 5 minutes

# Step 2: Check for heap growth in analysis

# Step 3: If leak detected, run detailed heap profiling
bun --heap-prof-md --heap-prof-dir=profiles/heap src/server.ts &
SERVER_PID=$!

# Generate load for 10 minutes
sleep 600

# Stop server to capture heap profile
kill -SIGTERM $SERVER_PID

# Step 4: Analyze heap profile
ls -lh profiles/heap/Heap.*.md
```

---

## Configuration

### Environment Variables

```bash
# Continuous Profiling (SLA Monitor)
CONTINUOUS_PROFILING_ENABLED=false              # Enable automatic profiling
CONTINUOUS_PROFILING_AUTO_TRIGGER_ON_SLA=true   # Trigger on SLA violations
CONTINUOUS_PROFILING_THROTTLE_MINUTES=60        # Min minutes between triggers
CONTINUOUS_PROFILING_OUTPUT_DIR=profiles/auto   # Output directory
CONTINUOUS_PROFILING_MAX_CONCURRENT=1           # Max concurrent sessions

# SLA Thresholds (configured in src/config/defaults.ts)
# /tokens: P95 100ms, P99 200ms
# /tokens/validate: P95 50ms, P99 100ms
# /health: P95 400ms, P99 500ms
```

### Production Safety Controls

1. **CPU Overhead Monitoring**: Max 2% overhead from profiling
2. **Concurrent Session Limit**: Max 1 profiling session at a time
3. **Storage Quota**: Max 1GB of profile data
4. **Automatic Throttling**: Min 60 minutes between auto-triggered profiles
5. **Graceful Degradation**: Profiling disabled if overhead exceeds limits

---

## Performance Targets

### SLA Thresholds

| Endpoint | P95 Target | P99 Target |
|----------|-----------|------------|
| POST /tokens | <100ms | <200ms |
| POST /tokens/validate | <50ms | <100ms |
| GET /health | <400ms | <500ms |

### CPU Budget

| Operation | Target |
|-----------|--------|
| JWT signing | <40% CPU time |
| Kong operations | <15% CPU time |
| JSON serialization | <8% CPU time |
| HTTP overhead | <12% CPU time |

### Memory Budget

| Metric | Target |
|--------|--------|
| Heap usage | <200MB steady state |
| Heap growth | <50MB per hour |
| Peak heap | <300MB under load |

---

## Profiling API Endpoints

All profiling endpoints are restricted to development and staging environments only.

### POST /debug/profiling/start

Start a profiling session.

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Profiling session started",
  "sessionId": "prof-12345",
  "devToolsUrl": "chrome-devtools://devtools/bundled/inspector.html?ws=localhost:9229/12345"
}
```

### POST /debug/profiling/stop

Stop the current profiling session.

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Profiling session stopped",
  "sessionId": "prof-12345",
  "duration": "45.2s",
  "artifacts": [
    "profiling/profile-12345.cpuprofile",
    "profiling/heap-12345.heapsnapshot"
  ]
}
```

### GET /debug/profiling/status

Check profiling system status.

### GET /debug/profiling/reports

List available profiling reports.

### DELETE /debug/profiling/cleanup

Clean up profiling artifacts and sessions.

---

## Storage Management

```bash
# Check current storage usage
du -sh profiles/

# Dry run cleanup (see what would be deleted)
bun scripts/profiling/cleanup-profiles.ts --dry-run

# Clean profiles (24h current, 7d archive)
bun scripts/profiling/cleanup-profiles.ts

# Clean with custom retention
bun scripts/profiling/cleanup-profiles.ts \
  --current-retention-hours=12 \
  --archive-retention-days=3

# Enforce storage quota
bun scripts/profiling/cleanup-profiles.ts --max-storage-gb=0.5
```

---

## Bun Fetch Curl Fallback (SIO-288)

### Problem

Bun v1.3.x has known networking bugs that cause `fetch()` to fail when connecting to services on local/private IP addresses (e.g., `192.168.x.x`, `10.x.x.x`), even when the service is reachable via curl.

**Symptoms:**
- `fetch()` throws `FailedToOpenSocket: Was there a typo in the url or port?` errors
- `fetch()` throws `ConnectionRefused` errors
- Same URL works perfectly with `curl` command
- Affects Kong Admin API and OTEL collector connections on private IPs
- Error occurs almost immediately (~12ms) rather than timing out

**Known Bun Issues:**
- https://github.com/oven-sh/bun/issues/3327 - Socket pooling bug (CLOSE_WAIT accumulation)
- https://github.com/oven-sh/bun/issues/10731 - DNS/IPv4 vs IPv6 issues (fixed in v1.1.9)
- https://github.com/oven-sh/bun/issues/9917 - Windows/Docker FailedToOpenSocket
- https://github.com/oven-sh/bun/issues/24001 - Proxy/Unix socket options bug
- https://github.com/oven-sh/bun/issues/1425 - ConnectionRefused on localhost
- https://github.com/oven-sh/bun/issues/6885 - Bun doesn't understand "localhost"

### Solution: fetchWithFallback()

We've implemented automatic curl fallback when Bun's native fetch fails.

```typescript
import { fetchWithFallback } from './utils/bun-fetch-fallback';

// Use exactly like native fetch
const response = await fetchWithFallback('http://192.168.178.3:30001/status');
const data = await response.json();
```

**Behavior:**
1. Try native `fetch()` first (preferred for performance)
2. If fetch fails, automatically retry via `curl` subprocess
3. Return standard Response object in both cases
4. Check AbortSignal before and after curl execution (proper abort handling)

### AbortSignal Support

The curl fallback properly supports `AbortSignal` for request cancellation:

```typescript
// Abortable request with timeout
const response = await fetchWithFallback(url, {
  signal: AbortSignal.timeout(5000)
});
```

**Features:**
- Pre-check: Throws `AbortError` immediately if already aborted before curl starts
- Post-check: Throws `AbortError` if aborted during curl execution
- Prevents unnecessary curl subprocess when request is already cancelled
- Uses curl's own timeout (`-m 3`, `--connect-timeout 2`) instead of passing signal to subprocess

**Reference:** Commit e42d824 (2026-02-14) - Fix fetch polyfill recursive call and add AbortSignal support

### HEAD Request Handling

The curl fallback uses `-I` flag for HEAD requests instead of `-X HEAD`:

```bash
# Correct (returns exit code 0)
curl -s -I -m 3 http://192.168.178.3:4318/v1/traces

# Incorrect (returns exit code 28 timeout even with valid response)
curl -s -i -X HEAD -m 3 http://192.168.178.3:4318/v1/traces
```

**Why this matters:**
- `-X HEAD` waits for connection to fully close, causing timeouts
- `-I` properly handles HEAD semantics and exits immediately
- Health checks to OTEL endpoints return 405 (Method Not Allowed) which is < 500, so treated as healthy

**Implementation Details:**
```typescript
// In fetchViaCurl()
if (method === "HEAD") {
  args.push("-I");  // Use -I for HEAD requests
} else {
  args.push("-i", "-X", method);  // Use -X for other methods
}
```

**Reference:** 2026-02-20 - Fix HEAD request handling and signal timeout issues

### Performance Impact

| Scenario | Latency | Notes |
|----------|---------|-------|
| Successful fetch | ~5-10ms | No fallback needed |
| Failed fetch + curl success | ~40-60ms | Acceptable for fallback |
| Failed fetch + curl timeout | ~3000ms | Curl timeout limit |
| Both fail | ~3050ms | Operation fails with original error |

**Key Points:**
- Zero overhead when native fetch succeeds (happy path)
- Curl fallback only activates on fetch failure
- Curl uses its own 3-second timeout, not the AbortSignal (prevents 5s+ waits)
- Health handler tests: 81s reduced to 2.3s after fixes

### When to Use

**Use `fetchWithFallback()` for:**
- Kong Admin API requests (already integrated)
- External service calls to local IPs
- Integration tests connecting to remote services

**Use native `fetch()` for:**
- Public internet URLs
- Localhost URLs
- Performance-critical paths

### Verification

```bash
# Test curl fallback is working
LOG_LEVEL=debug bun run dev

# Make request to Kong on local IP
curl -X POST http://localhost:3000/tokens \
  -H "X-Consumer-ID: test-consumer" \
  -H "X-Consumer-Username: test-consumer"

# Look for logs showing:
# - "Fetch failed, trying curl fallback"
# - "Curl fallback successful"
```

---

## Troubleshooting

### Profile Not Generated

**Symptom**: No .md files in profiles/ after running profile command

**Solutions**:
1. Check server started successfully: `curl http://localhost:3000/health`
2. Verify Bun version: `bun --version` (requires 1.3+)
3. Check for permission errors: `ls -la profiles/`
4. Increase profile duration: `bun run profile:scenario:tokens --duration=60`

### Empty or Incomplete Profile

**Solutions**:
1. Ensure load was generated during profiling window
2. Check server didn't crash
3. Verify SIGTERM was sent correctly (not SIGKILL)

### Storage Quota Exceeded

```bash
# Check current usage
du -sh profiles/

# Clean old profiles
bun scripts/profiling/cleanup-profiles.ts

# Increase quota
CONTINUOUS_PROFILING_MAX_STORAGE_GB=2
```

### SLA Monitor Not Triggering

1. Verify configuration: `curl http://localhost:3000/health | jq .slaMonitor`
2. Check latency actually exceeds thresholds
3. Verify throttling hasn't blocked trigger

### Curl Fallback Issues

**Tests still failing with local IP:**
```bash
# Verify curl is available
which curl

# Test curl directly
curl -I http://192.168.178.3:30001/status

# Check .env has correct Kong URL
grep KONG_ADMIN_URL .env
```

**Fallback seems slow:**
- Expected: 50-100ms latency (acceptable for error recovery)
- Consider SSH tunnel for faster localhost access

---

## Best Practices

1. **Always baseline before optimizing**: Create a baseline profile before making changes
2. **Profile production-like load**: Use realistic request rates and patterns
3. **Profile for sufficient duration**: Minimum 30 seconds for meaningful data
4. **Review full reports**: Check recommendations, not just top functions
5. **Archive important profiles**: Keep baselines and key optimization milestones
6. **Monitor overhead**: Check that profiling itself doesn't impact performance
7. **Clean up regularly**: Run cleanup script weekly to manage storage
8. **Use SLA monitoring**: Enable continuous profiling for automatic detection
9. **Compare before/after**: Always validate optimizations with new profiles
10. **Document findings**: Note what you changed and why in commit messages

---

## Related Documentation

- [Getting Started](./getting-started.md) - Development setup
- [Testing Guide](./testing.md) - Test execution
- [Monitoring](../operations/monitoring.md) - OpenTelemetry observability
- [SLA Guide](../operations/sla.md) - Performance targets
- [Troubleshooting](../operations/troubleshooting.md) - Runbook
