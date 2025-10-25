# Enhanced Memory Monitoring Guide

## Overview

This guide covers the enhanced memory monitoring system implemented to address Bun v1.3.1 memory measurement issues and provide production-ready memory management for the authentication service.

## Problem Solved

**Issue**: Bun v1.3.1's JavaScriptCore engine reports impossible memory ratios where `heapUsed > heapTotal`, causing false memory pressure alerts.

**Root Cause**: JavaScriptCore's memory architecture differs from Node.js V8, creating measurement artifacts during garbage collection transitions.

**Solution**: Multi-layered memory monitoring using `bun:jsc` APIs as primary source with adaptive memory management.

## Architecture

### Core Components

1. **BunMemoryMonitor** - Primary memory measurement using `bun:jsc` APIs
2. **AdaptiveMemoryManager** - Progressive memory pressure management
3. **MemoryHealthEndpoints** - REST API for monitoring and control
4. **MemoryOpenTelemetryExporter** - Metrics export to observability stack
5. **MemoryBaselineEstablisher** - Baseline establishment for capacity planning

## Features

### ✅ Eliminates False Positives
- Validates `heapUsed > heapTotal` anomalies
- Uses `bun:jsc` APIs for accurate measurements
- Reliability scoring tracks measurement quality

### ✅ Adaptive Memory Management
- Progressive degradation: Normal → Warning → High → Critical → Emergency
- Automatic request queuing under memory pressure
- Smart garbage collection triggering

### ✅ Production Monitoring
- Real-time memory health dashboard
- Memory leak detection with evidence collection
- Baseline establishment for capacity planning
- OpenTelemetry metrics export

## API Endpoints

### Memory Health
```bash
# Basic health check
curl http://localhost:3000/memory/health

# Detailed health with leak detection
curl http://localhost:3000/memory/health?details=true
```

**Response**:
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

### Memory Metrics
```bash
# Current metrics
curl http://localhost:3000/memory/metrics

# Include object type breakdown
curl http://localhost:3000/memory/metrics?objectTypes=true

# Trigger GC and measure effect
curl http://localhost:3000/memory/metrics?gc=true
```

**Response**:
```json
{
  "timestamp": 1729648800000,
  "current": {
    "jsc": {
      "heapSize": 15728640,
      "heapCapacity": 67108864,
      "heapUtilization": 0.23,
      "objectCount": 5000,
      "protectedObjectCount": 150
    },
    "process": {
      "rss": 104857600,
      "heapTotal": 20971520,
      "heapUsed": 15728640,
      "external": 2097152
    },
    "state": "normal",
    "reliability": 95
  },
  "trends": {
    "heapUtilizationHistory": [...],
    "rssGrowthRate": 1024,
    "memoryLeakDetection": {
      "suspected": false,
      "evidence": [],
      "recommendations": []
    }
  }
}
```

### Memory Actions
```bash
# Force garbage collection
curl -X POST http://localhost:3000/memory/actions?action=gc

# Clear request queue
curl -X POST http://localhost:3000/memory/actions?action=clearQueue

# Reset monitoring history
curl -X POST http://localhost:3000/memory/actions?action=reset
```

### Memory Baseline
```bash
# Check baseline status
curl http://localhost:3000/memory/baseline?action=status

# Run baseline establishment
curl -X POST http://localhost:3000/memory/baseline?action=run

# Get full baseline report
curl http://localhost:3000/memory/baseline?action=report
```

## Configuration

### Memory Thresholds
```typescript
const config = {
  thresholds: {
    warning: 0.60,    // 60% - enhanced monitoring
    high: 0.75,       // 75% - performance reduction
    critical: 0.85,   // 85% - request queuing
    emergency: 0.95   // 95% - aggressive intervention
  }
};
```

### Adaptive Behavior
- **Normal/Warning**: Requests processed immediately
- **High**: Periodic garbage collection, reduced optimizations
- **Critical**: Request queuing, aggressive GC
- **Emergency**: Emergency protocols, low-priority request dropping

## Memory Leak Detection

### Automatic Detection
The system automatically detects several leak patterns:

1. **RSS Growth Without Heap Growth**: Indicates external memory leaks
2. **Excessive Promise Objects**: Unresolved promises accumulating
3. **Object Count Divergence**: Objects not being garbage collected
4. **Reliability Degradation**: Measurement system becoming unreliable

### Manual Investigation
```bash
# Get detailed metrics with object breakdown
curl http://localhost:3000/memory/metrics?objectTypes=true

# Check for specific object types
curl http://localhost:3000/memory/metrics | jq '.objectTypes[] | select(.type == "Promise")'
```

## Baseline Establishment

### Purpose
Establish reference memory consumption patterns for:
- Capacity planning
- Anomaly detection
- Performance regression testing
- Memory optimization validation

### Running Baselines
```bash
# Start baseline establishment (5-10 minutes)
curl -X POST http://localhost:3000/memory/baseline?action=run

# Monitor progress
curl http://localhost:3000/memory/baseline?action=status

# Get results
curl http://localhost:3000/memory/baseline?action=report
```

### Scenarios Tested
1. **Idle Baseline** - True idle memory consumption
2. **Light Load** - Normal HTTP request patterns
3. **Memory Intensive** - High allocation/deallocation rates
4. **Sustained Load** - Extended operation under load

## OpenTelemetry Integration

### Metrics Exported
```
# Gauge metrics
bun_auth_service.process.memory.heap.size
bun_auth_service.process.memory.heap.utilization
bun_auth_service.process.memory.reliability.score

# Counter metrics
bun_auth_service.process.memory.gc.detected.total
bun_auth_service.process.memory.anomalies.detected.total

# Histogram metrics
bun_auth_service.process.memory.allocation.rate
```

### Attributes
```
service.name: authentication-service
runtime.name: bun
memory.source: jsc|process|hybrid
memory.pressure.level: low|moderate|high|critical
memory.reliability.level: excellent|good|poor|critical
```

## Troubleshooting

### Common Issues

#### 1. "heapUsed > heapTotal" Errors
**Cause**: JavaScriptCore measurement artifact during GC
**Solution**: Automatically handled by validation layer
**Action**: Monitor reliability score - should remain >70%

#### 2. High Memory Pressure Alerts
**Cause**: Legitimate memory pressure or measurement anomaly
**Investigation**:
```bash
# Check reliability
curl http://localhost:3000/memory/health?details=true

# Force GC and remeasure
curl http://localhost:3000/memory/metrics?gc=true

# Check for leaks
curl http://localhost:3000/memory/metrics | jq '.trends.memoryLeakDetection'
```

#### 3. Request Queuing Under Load
**Cause**: Memory pressure triggering adaptive management
**Solutions**:
- Scale up resources
- Optimize memory allocation patterns
- Adjust pressure thresholds if needed

#### 4. Enhanced Mode Not Available
**Cause**: `bun:jsc` APIs not accessible
**Fallback**: Legacy monitoring with validation
**Check**: Bun version compatibility

### Emergency Procedures

#### Memory Crisis
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

#### Measurement Reliability Issues
```bash
# 1. Reset monitoring system
curl -X POST http://localhost:3000/memory/actions?action=reset

# 2. Check enhanced mode status
curl http://localhost:3000/memory/health?details=true | jq '.details.reliabilityStatus'

# 3. Consider Bun version upgrade if reliability < 50%
```

## Best Practices

### Development
1. **Run baselines** after major changes
2. **Monitor object types** during feature development
3. **Test under memory pressure** scenarios
4. **Use `/memory/health` in CI/CD** health checks

### Production
1. **Set up alerting** on memory health status
2. **Monitor reliability scores** - alert if <70%
3. **Regular baseline updates** for capacity planning
4. **Correlate with application metrics** for root cause analysis

### Performance
- Enhanced monitoring adds <0.1% CPU overhead
- Memory footprint: <5KB for monitoring infrastructure
- GC triggering respects 30-second minimum intervals
- Request queuing has 10ms processing delays

## Migration from Legacy

### Automatic Migration
The enhanced system provides backward compatibility:
- Existing APIs continue to work
- Legacy thresholds are preserved
- Gradual enhancement without breaking changes

### Verification
```bash
# Check enhanced mode status
curl http://localhost:3000/memory/health | jq '.memory.reliability'

# Compare with legacy method
curl http://localhost:3000/health/telemetry

# Verify OpenTelemetry export
curl http://localhost:3000/metrics | grep memory
```

## Monitoring Dashboard

### Key Metrics to Track
1. **Memory Health Status** - Overall system health
2. **Heap Utilization** - Trend over time
3. **Reliability Score** - Measurement quality
4. **Request Queue Size** - Memory pressure impact
5. **GC Frequency** - Garbage collection patterns
6. **Object Type Distribution** - Leak detection

### Alert Thresholds
- **Warning**: Reliability < 80% OR Health status = warning
- **Critical**: Reliability < 50% OR Health status = critical
- **Emergency**: Health status = critical + Queue size > 100

## Support

For issues or questions:
1. Check reliability score and enhanced mode status
2. Review memory health endpoint details
3. Collect baseline report for analysis
4. Monitor OpenTelemetry metrics for trends
5. Reference SIO-73 Linear issue for implementation details

## Technical Details

### Bun vs Node.js Memory Differences
- **Bun**: JavaScriptCore with dual-heap architecture
- **Node.js**: V8 with unified heap management
- **Impact**: Different measurement semantics require adapted monitoring

### `bun:jsc` API Advantages
- Direct access to JavaScriptCore heap statistics
- Object type breakdown for leak detection
- More accurate memory pressure detection
- Elimination of measurement artifacts

### Adaptive Management Benefits
- Proactive performance degradation prevention
- Automatic request queuing under pressure
- Smart garbage collection scheduling
- Zero-downtime memory pressure handling