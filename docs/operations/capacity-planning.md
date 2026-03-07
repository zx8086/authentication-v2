# Capacity Planning Guide

This guide provides scaling recommendations based on throughput targets, resource requirements, and deployment topology for the Authentication Service.

## Resource Baseline

### Single Instance

| Resource | Idle | Light Load (<100 RPS) | Moderate Load (1K RPS) | Heavy Load (10K RPS) |
|----------|------|-----------------------|------------------------|----------------------|
| **Memory (RSS)** | 50MB | 60MB | 70-80MB | 80-120MB |
| **CPU** | <1% | 2-5% | 10-20% | 30-50% |
| **Network (egress)** | Minimal | ~100KB/s | ~1MB/s | ~10MB/s |

**Notes:**
- Memory includes OpenTelemetry SDK overhead (~20MB at startup, ~57MB under sustained load)
- CPU measured on a single core; Bun utilizes multiple cores for I/O
- Network depends on token payload size (~400-600 bytes per token response)

### Container Specification

| Setting | Recommended | Notes |
|---------|-------------|-------|
| Memory Request | 128MB | Covers baseline + headroom |
| Memory Limit | 256MB | Allows for load spikes |
| CPU Request | 100m | Sufficient for moderate load |
| CPU Limit | 500m | Prevents CPU starvation of neighbors |

## Scaling Guidelines

### Horizontal Scaling (Recommended)

The Authentication Service is stateless, making horizontal scaling the primary strategy.

| Target RPS | Recommended Replicas | HPA Metric | Notes |
|-----------|---------------------|------------|-------|
| < 1,000 | 2 (minimum for HA) | CPU 60% | Sufficient with caching |
| 1,000 - 5,000 | 3-5 | CPU 60% | Enable Redis HA for shared cache |
| 5,000 - 20,000 | 5-10 | CPU 60% | Ensure Kong Admin API can handle secret lookups |
| 20,000 - 50,000 | 10-20 | CPU 60%, custom RPS metric | Cache hit rate critical; tune TTL |
| 50,000+ | 20+ | Custom RPS metric | Consider dedicated Kong Admin API instances |

### HPA Configuration

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: authentication-service
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: authentication-service
  minReplicas: 2
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 60
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 30
      policies:
        - type: Percent
          value: 100
          periodSeconds: 30
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 25
          periodSeconds: 60
```

### Vertical Scaling

Vertical scaling has diminishing returns beyond moderate resource increases due to Bun's efficient memory usage.

| Scenario | Memory Limit | CPU Limit | When to Use |
|----------|-------------|-----------|-------------|
| Default | 256MB | 500m | Standard deployments |
| Memory pressure | 512MB | 500m | High cache entry counts or telemetry backlog |
| CPU bound | 256MB | 1000m | High RPS with complex JWT payloads |

## Dependency Scaling

### Kong Admin API

The Auth Service calls Kong Admin API for consumer secret lookups. Cache hits reduce this load significantly.

| Auth Service RPS | Cache Hit Rate | Kong Admin API RPS | Action Required |
|-----------------|----------------|--------------------|-----------------|
| 1,000 | 90% | ~100 | No scaling needed |
| 10,000 | 95% | ~500 | Monitor Kong response times |
| 50,000 | 98% | ~1,000 | Consider Kong Admin API scaling |
| 100,000 | 99% | ~1,000 | Increase cache TTL, Kong scaling |

**Cache tuning for high throughput:**
```bash
# Increase cache TTL to reduce Kong API calls
CACHING_TTL_SECONDS=600        # 10 minutes (default: 300)
STALE_DATA_TOLERANCE_MINUTES=120  # 2 hours (default: 30)
```

### Redis/Valkey (HA Mode)

When running in high-availability mode, Redis handles cache operations.

| Auth Service Replicas | Redis Operations/s | Redis Memory | Recommendation |
|----------------------|-------------------|--------------|-----------------|
| 2-5 | < 1,000 | < 50MB | Single Redis instance |
| 5-10 | 1,000 - 5,000 | 50-200MB | Redis with read replicas |
| 10+ | 5,000+ | 200MB+ | Redis Cluster or managed service |

### OpenTelemetry Collector

Telemetry volume scales linearly with request volume.

| Auth Service RPS | Spans/s | Metrics Points/s | Collector Sizing |
|-----------------|---------|-------------------|------------------|
| < 1,000 | ~3,000 | ~500 | Single collector |
| 1,000 - 10,000 | 3K - 30K | 500 - 5K | Collector with scaling |
| 10,000+ | 30K+ | 5K+ | Collector cluster with load balancing |

## Topology Recommendations

### Small Deployment (< 1K RPS)

```
                          +------------------+
                          |  Load Balancer   |
                          +--------+---------+
                                   |
                          +--------v---------+
                          | Auth Service x2  |
                          | (2 replicas)     |
                          +--------+---------+
                                   |
                    +--------------+--------------+
                    |                              |
           +--------v---------+          +--------v---------+
           |  Kong Admin API  |          | OTel Collector   |
           +------------------+          +------------------+
```

### Medium Deployment (1K - 10K RPS)

```
                          +------------------+
                          |  Load Balancer   |
                          +--------+---------+
                                   |
                          +--------v---------+
                          | Auth Service x5  |
                          | (HPA: 3-10)     |
                          +--------+---------+
                                   |
                    +--------------+--------------+---------+
                    |              |              |          |
           +--------v------+  +---v------+  +---v------+  +v-----------+
           | Kong Admin    |  | Redis    |  | OTel     |  | OTel       |
           | API           |  | Primary  |  | Collector|  | Collector  |
           +---------------+  +---+------+  +----------+  +------------+
                                  |
                             +----v-----+
                             | Redis    |
                             | Replica  |
                             +----------+
```

### Large Deployment (10K+ RPS)

```
                          +------------------+
                          |  Load Balancer   |
                          +--------+---------+
                                   |
                          +--------v---------+
                          | Auth Service x15 |
                          | (HPA: 10-20)    |
                          +--------+---------+
                                   |
                    +--------------+--------------+---------+
                    |              |              |          |
           +--------v------+  +---v----------+  +--v------+
           | Kong Admin    |  | Redis Cluster|  | OTel    |
           | API (scaled)  |  | (3+ nodes)   |  | Cluster |
           +---------------+  +--------------+  +---------+
```

## Monitoring for Scaling Decisions

### Key Metrics to Watch

| Metric | Scale Up Trigger | Scale Down Trigger |
|--------|------------------|-------------------|
| CPU utilization | > 60% sustained (5 min) | < 20% sustained (15 min) |
| Memory usage | > 80% of limit | N/A (memory doesn't recover) |
| P95 latency (tokens) | > 100ms | < 25ms sustained |
| Cache hit rate | < 85% | N/A |
| Kong API errors | > 5% rate | < 0.1% rate |
| Circuit breaker opens | > 1/hour | 0 for 1 hour |

### Alerting for Capacity

| Alert | Condition | Action |
|-------|-----------|--------|
| **HPA at max replicas** | replicas == maxReplicas for > 10 min | Increase maxReplicas or add resources |
| **Memory pressure** | RSS > 80% limit on > 50% pods | Increase memory limit |
| **Kong API latency** | P95 > 200ms | Scale Kong or increase cache TTL |
| **Cache miss storm** | Hit rate drops below 70% | Check cache TTL, verify Redis connectivity |

## Cost Estimation

| Deployment Size | Replicas | Estimated Monthly Cost (Cloud) |
|----------------|----------|-------------------------------|
| Small (< 1K RPS) | 2 | ~$50-100 (compute only) |
| Medium (1K-10K RPS) | 3-10 + Redis | ~$200-500 |
| Large (10K+ RPS) | 10-20 + Redis Cluster | ~$500-2000 |

**Notes:** Costs are approximate and depend on cloud provider, region, and reserved instance pricing. Excludes Kong, OTel Collector, and networking costs.

## Related Documentation

| Document | Description |
|----------|-------------|
| [SLA Documentation](sla.md) | Performance targets and error budgets |
| [Configuration Guide](../configuration/environment.md) | Cache TTL, circuit breaker, and resource tuning |
| [Kubernetes Deployment](../deployment/kubernetes.md) | HPA, PDB, and resource configuration |
| [Monitoring Guide](monitoring.md) | Metrics for capacity monitoring |
| [Incident Response](incident-response.md) | Procedures when capacity limits are hit |
