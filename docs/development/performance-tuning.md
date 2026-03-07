# Performance Tuning Guide

This guide documents the configuration knobs available for optimizing Authentication Service performance under different load profiles.

## Quick Reference

| Scenario | Key Adjustments |
|----------|----------------|
| High throughput (> 10K RPS) | Increase cache TTL, tune circuit breaker, scale replicas |
| Low latency (P99 < 50ms) | Reduce circuit breaker timeout, ensure cache hit rate > 95% |
| Memory constrained (< 128MB) | Disable runtime metrics, reduce queue sizes |
| Telemetry heavy | Increase batch sizes, tune export intervals |

## Cache Tuning

Cache configuration has the highest impact on performance because cache hits avoid Kong Admin API round-trips entirely.

### Cache TTL

```bash
# Default: 300 seconds (5 minutes)
# Higher = fewer Kong API calls, staler data
CACHING_TTL_SECONDS=600   # 10 minutes for high-throughput

# Stale tolerance for circuit breaker fallback
# Default: 30 minutes
STALE_DATA_TOLERANCE_MINUTES=120   # 2 hours for maximum resilience
```

| TTL Setting | Kong API Calls | Data Freshness | Use Case |
|-------------|---------------|----------------|----------|
| 60s | High | Very fresh | Frequent secret rotation |
| 300s (default) | Moderate | Fresh | Standard operations |
| 600s | Low | Acceptable | High throughput |
| 1800s | Minimal | Potentially stale | Maximum performance |

### In-Memory Cache

```bash
# Max entries before LRU eviction (HA mode last-resort cache)
CACHE_MAX_MEMORY_ENTRIES=1000   # Default

# Increase for services with many unique consumers
CACHE_MAX_MEMORY_ENTRIES=5000
```

### Redis Performance

```bash
# Operation timeouts - tune based on Redis latency
CACHE_TIMEOUT_GET_MS=1000      # Default: 1000ms
CACHE_TIMEOUT_SET_MS=2000      # Default: 2000ms
CACHE_TIMEOUT_PING_MS=500      # Default: 500ms
CACHE_TIMEOUT_CONNECT_MS=5000  # Default: 5000ms

# For low-latency Redis (< 1ms RTT), reduce timeouts
CACHE_TIMEOUT_GET_MS=200
CACHE_TIMEOUT_SET_MS=500
CACHE_TIMEOUT_PING_MS=100
```

## Circuit Breaker Tuning

Circuit breaker settings affect how quickly the service detects and recovers from Kong Admin API issues.

### For Latency-Sensitive Deployments

```bash
# Faster failure detection
CIRCUIT_BREAKER_TIMEOUT=3000           # 3s (default: 5s)
CIRCUIT_BREAKER_VOLUME_THRESHOLD=2     # Trip faster (default: 3)
CIRCUIT_BREAKER_ROLLING_COUNT_TIMEOUT=5000  # 5s window (default: 10s)

# Faster recovery
CIRCUIT_BREAKER_RESET_TIMEOUT=30000    # 30s (default: 60s)
```

### For Resilience-Focused Deployments

```bash
# More tolerant of transient errors
CIRCUIT_BREAKER_ERROR_THRESHOLD=70     # 70% (default: 50%)
CIRCUIT_BREAKER_VOLUME_THRESHOLD=5     # Require more samples
CIRCUIT_BREAKER_ROLLING_COUNT_TIMEOUT=15000  # Wider window

# Longer stale cache window
STALE_DATA_TOLERANCE_MINUTES=120       # 2 hours
HIGH_AVAILABILITY=true                  # Enable Redis stale cache
```

## Telemetry Performance

Telemetry overhead can be tuned for different performance/visibility trade-offs.

### Minimal Overhead (Production)

```bash
# Disable runtime metrics to save ~10% CPU
OTEL_RUNTIME_METRICS_ENABLED=false     # Default

# Increase batch sizes for fewer exports
OTEL_BSP_MAX_EXPORT_BATCH_SIZE=2048    # Larger batches
OTEL_BSP_SCHEDULE_DELAY=5000           # Less frequent (default: 1000ms)
OTEL_METRIC_EXPORT_INTERVAL=60000      # 60s (default: 30s)
```

### Maximum Visibility (Debugging)

```bash
# Enable all metrics including event loop and memory
OTEL_RUNTIME_METRICS_ENABLED=true

# Smaller batches for more frequent exports
OTEL_BSP_MAX_EXPORT_BATCH_SIZE=128
OTEL_BSP_SCHEDULE_DELAY=500
OTEL_METRIC_EXPORT_INTERVAL=10000      # 10s

# Debug-level logging
LOG_LEVEL=debug
```

### Memory-Constrained Environments

```bash
# Reduce telemetry buffer sizes
OTEL_BSP_MAX_QUEUE_SIZE=512            # Default: 2048
OTEL_BSP_MAX_EXPORT_BATCH_SIZE=64      # Default: 512

# Lower memory guardian threshold
MEMORY_GUARDIAN_HEAP_LIMIT_MB=128      # Match container limit
```

## JWT Configuration

```bash
# Token expiration affects refresh frequency
# Shorter = more secure, more traffic
# Longer = less traffic, larger exposure window
JWT_EXPIRATION_MINUTES=15   # Default: 15

# For high-throughput APIs where token refresh is expensive
JWT_EXPIRATION_MINUTES=30

# For high-security APIs
JWT_EXPIRATION_MINUTES=5
```

## Request Handling

```bash
# Request timeout - prevent slow requests from consuming resources
REQUEST_TIMEOUT_MS=30000        # Default: 30s

# For APIs behind aggressive load balancers
REQUEST_TIMEOUT_MS=10000        # 10s

# Max request body size
MAX_REQUEST_BODY_SIZE=10485760  # Default: 10MB
```

## Profiling for Performance Issues

When SLA violations are detected, use the built-in profiling infrastructure.

### SLA-Triggered Profiling

```bash
# Enable automatic profiling on SLA violations
CONTINUOUS_PROFILING_ENABLED=true
CONTINUOUS_PROFILING_AUTO_TRIGGER_ON_SLA=true
CONTINUOUS_PROFILING_THROTTLE_MINUTES=60   # Max 1 profile per hour
```

### Manual Profiling

```bash
# Profile a specific scenario
bun run profile:scenario:tokens

# Profile during K6 load test
ENABLE_PROFILING=true bun run test:k6:smoke:health
```

See [Profiling Guide](profiling.md) for detailed profiling workflows.

## Performance Validation

After tuning, validate with the K6 performance tests:

```bash
# Quick smoke test
bun run test:k6:quick

# Full load test
bun run test:k6:smoke:basic

# Check against SLA thresholds
bun run test:suite
```

See [SLA Documentation](../operations/sla.md) for performance targets.

## Related Documentation

| Document | Description |
|----------|-------------|
| [Configuration Guide](../configuration/environment.md) | Complete environment variable reference |
| [SLA Documentation](../operations/sla.md) | Performance targets and thresholds |
| [Profiling Guide](profiling.md) | CPU/memory profiling workflows |
| [Capacity Planning](../operations/capacity-planning.md) | Scaling guidance for different load levels |
| [Monitoring Guide](../operations/monitoring.md) | Metrics for performance monitoring |
