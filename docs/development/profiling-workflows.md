# Profiling Workflows Guide

Complete guide to profiling workflows for the authentication service using Bun's native profiling features.

## Quick Start

### Profile Token Generation
```bash
bun run profile:scenario:tokens
```

### Profile Health Check Endpoint
```bash
bun run profile:scenario:health
```

### Profile Token Validation
```bash
bun run profile:scenario:validate
```

### Profile Mixed Workload
```bash
bun run profile:scenario:mixed
```

### Profile During K6 Tests
```bash
# Smoke test with profiling
ENABLE_PROFILING=true bun run test:k6:smoke:health

# Load test with profiling
ENABLE_PROFILING=true bun run test:k6:load
```

## Understanding Profiling Output

### Profile Types

**CPU Profile** (`CPU.*.md`):
- Shows which functions consume the most CPU time
- Identifies computational bottlenecks
- Includes "Hot Functions" table sorted by self time
- Best for: Optimization of CPU-intensive operations

**Heap Profile** (`Heap.*.md`):
- Shows memory allocation patterns
- Identifies memory leaks
- Tracks heap growth over time
- Best for: Memory optimization and leak detection

### Profile Analysis Reports

After profiling, you'll see an enhanced analysis report with:

1. **Performance Summary**: SLA compliance status
2. **Top CPU Consumers**: Table of hottest functions
3. **Memory Usage**: Heap statistics and growth
4. **Optimization Opportunities**: Severity-ranked recommendations

Example recommendation:
```markdown
### ⚠️ HIGH: Kong Cache
**Issue**: Kong consumer lookups consuming 23.1% CPU time (target: <15%)
**Expected Impact**: -10-15ms P95 latency, -20% Kong API calls
**Action Items**:
1. Increase CACHING_TTL_SECONDS from 300 to 600 in .env
2. Review cache invalidation logic in src/services/kong/consumer.service.ts
3. Monitor metric: kong_cache_hits_total / kong_operations_total
```

## Common Workflows

### Workflow 1: Optimizing Token Generation

**Goal**: Reduce token generation latency from P95 100ms to <80ms

```bash
# Step 1: Create baseline profile
bun run profile:scenario:tokens
# Note the output file: profiles/current/tokens-timestamp.cpu-prof.md

# Step 2: Review analysis and identify bottlenecks
# Look for recommendations in the output

# Step 3: Implement optimization
# Example: Increase cache TTL or optimize JWT signing

# Step 4: Profile after optimization
bun run profile:scenario:tokens

# Step 5: Compare results
# Review new analysis - look for improved metrics

# Step 6: Archive baseline for future reference
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
# System will automatically profile when P95 exceeds thresholds:
# - /tokens: P95 >100ms, P99 >200ms
# - /tokens/validate: P95 >50ms, P99 >100ms
# - /health: P95 >400ms, P99 >500ms

# Step 3: Review auto-generated profiles
ls -lh profiles/auto/

# Step 4: Analyze the profile
cat profiles/auto/tokens-*.cpu-prof.md

# Step 5: Implement fix based on recommendations

# Step 6: Verify in staging with manual profiling
ENABLE_PROFILING=true bun run test:k6:load
```

### Workflow 3: K6 Performance Testing with Profiling

**Goal**: Validate performance under load

```bash
# Step 1: Run K6 test with profiling enabled
ENABLE_PROFILING=true K6_SMOKE_VUS=10 K6_SMOKE_DURATION=30s \
  bun run test:k6:smoke:health

# Step 2: Review profile automatically generated in test/results/profiling/

# Step 3: Identify bottlenecks from analysis report

# Step 4: Optimize based on recommendations

# Step 5: Re-run K6 test to validate improvement
ENABLE_PROFILING=true K6_SMOKE_VUS=10 K6_SMOKE_DURATION=30s \
  bun run test:k6:smoke:health

# Step 6: Compare metrics (RPS, P95, P99)
```

### Workflow 4: Memory Leak Investigation

**Scenario**: Memory usage growing over time in production

```bash
# Step 1: Profile with longer duration for heap analysis
bun run profile:scenario:mixed --duration=300  # 5 minutes

# Step 2: Check for heap growth in analysis
# Look for "Memory Leak" warnings in recommendations

# Step 3: If leak detected, run detailed heap profiling
bun --heap-prof-md --heap-prof-dir=profiles/heap src/server.ts &
SERVER_PID=$!

# Generate load for 10 minutes
sleep 600

# Stop server to capture heap profile
kill -SIGTERM $SERVER_PID

# Step 4: Analyze heap profile
ls -lh profiles/heap/Heap.*.md

# Step 5: Review object allocation patterns
# Look for growing allocations in specific functions

# Step 6: Implement fix (e.g., cache eviction, connection cleanup)
```

## Advanced Usage

### Manual Profiling with Custom Load

```bash
# Start server with profiling
bun --cpu-prof-md --cpu-prof-dir=profiles/manual \
  --heap-prof-md --heap-prof-dir=profiles/manual \
  src/server.ts &

SERVER_PID=$!

# Generate custom load pattern
# (Your custom load script here)

# Stop server after desired duration
sleep 60
kill -SIGTERM $SERVER_PID

# Analyze profiles
ls -lh profiles/manual/
```

### Profile Comparison

```bash
# Compare two CPU profiles
diff -u profiles/baselines/baseline-v1.cpu-prof.md \
  profiles/current/latest.cpu-prof.md

# Look for changes in:
# - Top function rankings
# - CPU percentage shifts
# - New hot functions appearing
```

### Baseline Management

```bash
# Archive current profile as baseline
bun scripts/profiling/archive-profile.ts \
  --profile=profiles/current/tokens-123.cpu-prof.md \
  --label="baseline-v1.2-pre-optimization"

# List all baselines
ls -lh profiles/baselines/

# Restore baseline for comparison
cp profiles/baselines/baseline-v1.2.cpu-prof.md \
  profiles/current/baseline-compare.cpu-prof.md
```

### Storage Management

```bash
# Check current storage usage
du -sh profiles/

# Dry run cleanup (see what would be deleted)
bun scripts/profiling/cleanup-profiles.ts --dry-run

# Clean profiles older than 24 hours (current/) and 7 days (archive/)
bun scripts/profiling/cleanup-profiles.ts

# Clean with custom retention
bun scripts/profiling/cleanup-profiles.ts \
  --current-retention-hours=12 \
  --archive-retention-days=3

# Enforce storage quota
bun scripts/profiling/cleanup-profiles.ts --max-storage-gb=0.5
```

## Profiling Configuration

### Environment Variables

```bash
# Continuous Profiling (SLA Monitor)
CONTINUOUS_PROFILING_ENABLED=false              # Enable automatic profiling
CONTINUOUS_PROFILING_AUTO_TRIGGER_ON_SLA=true   # Trigger on SLA violations
CONTINUOUS_PROFILING_THROTTLE_MINUTES=60        # Min minutes between triggers
CONTINUOUS_PROFILING_OUTPUT_DIR=profiles/auto   # Output directory
CONTINUOUS_PROFILING_MAX_CONCURRENT=1           # Max concurrent sessions
CONTINUOUS_PROFILING_BUFFER_SIZE=100            # Rolling buffer for P95/P99

# SLA Thresholds (configured in src/config/defaults.ts)
# /tokens: P95 100ms, P99 200ms
# /tokens/validate: P95 50ms, P99 100ms
# /health: P95 400ms, P99 500ms
```

### Production Safety Controls

The profiling system includes production-safe guards:

1. **CPU Overhead Monitoring**: Max 2% overhead from profiling
2. **Concurrent Session Limit**: Max 1 profiling session at a time
3. **Storage Quota**: Max 1GB of profile data
4. **Automatic Throttling**: Min 60 minutes between auto-triggered profiles
5. **Graceful Degradation**: Profiling disabled if overhead exceeds limits

## Troubleshooting

### Profile Not Generated

**Symptom**: No .md files in profiles/ after running profile command

**Solutions**:
1. Check server started successfully: `curl http://localhost:3000/health`
2. Verify Bun version: `bun --version` (requires 1.3+)
3. Check for permission errors: `ls -la profiles/`
4. Increase profile duration: `bun run profile:scenario:tokens --duration=60`

### Empty or Incomplete Profile

**Symptom**: Profile file exists but has no data or incomplete data

**Solutions**:
1. Ensure load was generated during profiling window
2. Check server didn't crash: Review console output
3. Verify SIGTERM was sent correctly (not SIGKILL)
4. Try manual profiling to isolate the issue

### Storage Quota Exceeded

**Symptom**: "Storage quota exceeded" warning in logs

**Solutions**:
```bash
# Check current usage
du -sh profiles/

# Clean old profiles
bun scripts/profiling/cleanup-profiles.ts

# Increase quota (in .env or code)
CONTINUOUS_PROFILING_MAX_STORAGE_GB=2
```

### SLA Monitor Not Triggering

**Symptom**: Continuous profiling enabled but no auto-generated profiles

**Solutions**:
1. Verify configuration:
   ```bash
   curl http://localhost:3000/health | jq .slaMonitor
   ```
2. Check latency actually exceeds thresholds
3. Verify throttling hasn't blocked trigger (check logs)
4. Ensure overhead monitor allows profiling (check CPU usage)

### Profile Analysis Errors

**Symptom**: "Failed to parse CPU profile" error

**Solutions**:
1. Verify profile format is Bun markdown (not Chrome JSON)
2. Check profile file isn't corrupted: `head -20 profile.md`
3. Ensure profile generation completed fully
4. Try with a fresh profile

## Best Practices

1. **Always baseline before optimizing**: Create a baseline profile before making changes
2. **Profile production-like load**: Use realistic request rates and patterns
3. **Profile for sufficient duration**: Minimum 30 seconds for meaningful data
4. **Review full reports**: Don't just look at top functions - check recommendations
5. **Archive important profiles**: Keep baselines and key optimization milestones
6. **Monitor overhead**: Check that profiling itself doesn't impact performance
7. **Clean up regularly**: Run cleanup script weekly to manage storage
8. **Use SLA monitoring**: Enable continuous profiling for automatic detection
9. **Compare before/after**: Always validate optimizations with new profiles
10. **Document findings**: Note what you changed and why in commit messages

## Performance Targets

### SLA Thresholds

| Endpoint | P95 Target | P99 Target |
|----------|-----------|------------|
| POST /tokens | <100ms | <200ms |
| POST /tokens/validate | <50ms | <100ms |
| GET /health | <400ms | <500ms |

### CPU Budget

- JWT signing: <40% CPU time
- Kong operations: <15% CPU time
- JSON serialization: <8% CPU time
- HTTP overhead: <12% CPU time

### Memory Budget

- Heap usage: <200MB steady state
- Heap growth: <50MB per hour
- Peak heap: <300MB under load

## Profiling API Endpoints

All profiling endpoints are restricted to development and staging environments only.

### POST /debug/profiling/start
Start a profiling session for performance analysis.

**Request**
```http
POST /debug/profiling/start HTTP/1.1
Host: localhost:3000
```

**Response - Success (200 OK)**
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

**Response - Success (200 OK)**
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

**Response - Success (200 OK)**
```json
{
  "enabled": true,
  "active": false,
  "lastSession": {
    "id": "prof-12345",
    "startTime": "2025-01-15T11:30:00.000Z",
    "endTime": "2025-01-15T11:35:00.000Z",
    "duration": "5m"
  },
  "reports": [
    {
      "id": "prof-12345",
      "type": "cpu",
      "size": "2.4MB",
      "created": "2025-01-15T11:35:00.000Z"
    }
  ]
}
```

### GET /debug/profiling/reports
List available profiling reports.

**Response - Success (200 OK)**
```json
{
  "reports": [
    {
      "sessionId": "prof-12345",
      "type": "cpu",
      "filename": "profile-12345.cpuprofile",
      "size": "2.4MB",
      "created": "2025-01-15T11:35:00.000Z"
    },
    {
      "sessionId": "prof-12345",
      "type": "heap",
      "filename": "heap-12345.heapsnapshot",
      "size": "8.1MB",
      "created": "2025-01-15T11:35:00.000Z"
    }
  ]
}
```

### DELETE /debug/profiling/cleanup
Clean up profiling artifacts and sessions.

**Response - Success (200 OK)**
```json
{
  "success": true,
  "message": "Profiling cleanup completed",
  "cleaned": {
    "reports": 3,
    "sessions": 2
  }
}
```

## Related Documentation

- [Getting Started](./getting-started.md) - Development setup
- [Testing Guide](../../test/README.md) - Test execution
- [Monitoring](../operations/monitoring.md) - OpenTelemetry observability
- [SLA Guide](../operations/SLA.md) - Performance targets

## Support

For issues or questions about profiling:
1. Check [TROUBLESHOOTING.md](../operations/TROUBLESHOOTING.md)
2. Review profile analysis recommendations
3. Create a Linear issue with profile attached
