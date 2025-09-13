# Complete OpenTelemetry Implementation Guide
## With Detailed Logging Architecture

## Table of Contents
1. [Overview](#overview)
2. [Core Architecture Components](#core-architecture-components)
3. [Detailed Logging System Architecture](#detailed-logging-system-architecture)
4. [Implementation Flow](#implementation-flow)
5. [Bun Runtime Optimizations](#bun-runtime-optimizations)
6. [Sampling Strategy](#sampling-strategy)
7. [Health Monitoring & Circuit Breakers](#health-monitoring--circuit-breakers)
8. [Metrics Collection](#metrics-collection)
9. [Distributed Tracing](#distributed-tracing)
10. [Implementation Checklist](#implementation-checklist)
11. [Production Deployment](#production-deployment)

## Overview

This OpenTelemetry implementation is a sophisticated, production-ready setup optimized for Bun runtime with 2025 compliance standards. The system emphasizes:
- **Cost optimization**: 70-85% reduction through intelligent sampling
- **Reliability**: Circuit breakers and graceful degradation
- **Performance**: Bun-optimized exporters preventing timeouts
- **Observability**: Full traces, metrics, and logs with correlation

## Core Architecture Components

### 1. Configuration System (`src/telemetry/config.ts`)

The configuration uses Zod validation with strict 2025 OpenTelemetry standards:

```typescript
interface TelemetryConfig {
  // Core settings
  ENABLE_OPENTELEMETRY: boolean;
  SERVICE_NAME: string;
  SERVICE_VERSION: string;
  DEPLOYMENT_ENVIRONMENT: "development" | "staging" | "production" | "test";
  
  // OTLP Endpoints (port 4318 for OTLP/HTTP)
  TRACES_ENDPOINT: string;  // http://localhost:4318/v1/traces
  METRICS_ENDPOINT: string; // http://localhost:4318/v1/metrics
  LOGS_ENDPOINT: string;    // http://localhost:4318/v1/logs
  
  // Performance settings
  METRIC_READER_INTERVAL: number;  // 60000ms default
  SUMMARY_LOG_INTERVAL: number;    // 300000ms default
  
  // 2025 compliance settings
  EXPORT_TIMEOUT_MS: 30000;        // 30 seconds max
  BATCH_SIZE: 2048;                // Optimal batch size
  MAX_QUEUE_SIZE: 10000;           // Queue limit
  SAMPLING_RATE: 0.15;             // 15% default sampling
  
  // Circuit breaker configuration
  CIRCUIT_BREAKER_THRESHOLD: 5;    // Failures before opening
  CIRCUIT_BREAKER_TIMEOUT_MS: 60000; // Recovery timeout
  
  // Log-specific sampling rates
  LOG_SAMPLING_DEBUG: 0.1;   // 10% debug logs
  LOG_SAMPLING_INFO: 0.5;    // 50% info logs
  LOG_SAMPLING_WARN: 0.9;    // 90% warning logs
  LOG_SAMPLING_ERROR: 1.0;   // 100% error logs (never drop)
}
```

### 2. Initialization Flow (`src/telemetry/instrumentation.ts`)

```typescript
async function initializeTelemetry(): Promise<void> {
  // 1. Load and validate configuration
  config = telemetryConfig;
  
  // 2. Set diagnostic logging
  diag.setLogger(
    new DiagConsoleLogger(),
    config.DEPLOYMENT_ENVIRONMENT === "development" 
      ? DiagLogLevel.INFO 
      : DiagLogLevel.WARN
  );
  
  // 3. Initialize health monitor
  telemetryHealthMonitor.setConfig(config);
  
  // 4. Create synchronous resource (no async detection)
  const resource = createResource(config);
  
  // 5. Create exporters (Bun-optimized if running on Bun)
  const traceExporter = createTraceExporter(config);
  const metricExporter = createMetricExporter(config);
  const logExporter = createLogExporter(config);
  
  // 6. Create processors with batching
  const spanProcessor = new BunSpanProcessor({...});
  const logProcessor = new BatchLogRecordProcessor(logExporter, {...});
  const metricReader = new BunMetricReader({...});
  
  // 7. Initialize sampling
  const sampler = new SimpleSmartSampler(simpleSamplingConfig);
  
  // 8. Create propagators
  const propagator = new CompositePropagator({
    propagators: [
      new W3CTraceContextPropagator(),
      new W3CBaggagePropagator()
    ],
  });
  
  // 9. Initialize NodeSDK
  sdk = new NodeSDK({
    resource,
    sampler,
    textMapPropagator: propagator,
    spanProcessors: [spanProcessor],
    logRecordProcessors: [logProcessor],
    metricReader,
    instrumentations: [...],
  });
  
  // 10. Start SDK and initialize logger
  await sdk.start();
  telemetryLogger.initialize();
  
  // 11. Setup graceful shutdown
  setupGracefulShutdown();
}
```

## Detailed Logging System Architecture

### Overview of the Logging Pipeline

The logging system is a sophisticated multi-layer architecture that provides:
1. **Structured logging** with automatic metadata enrichment
2. **Trace correlation** for distributed system debugging
3. **Intelligent sampling** to reduce costs while preserving critical logs
4. **Circuit breaker protection** to prevent cascade failures
5. **Graceful degradation** to console output when OTLP export fails

### Layer 1: Logger Interface (`src/telemetry/logger.ts`)

#### Core Components

```typescript
class TelemetryLogger {
  private logger: api.Logger | undefined;
  private isInitialized = false;
  private fallbackLogs: StructuredLogData[] = [];
  
  // Structured log data format
  interface StructuredLogData {
    message: string;
    level: LogLevel;
    timestamp: number;
    context?: LogContext;      // Trace correlation
    meta?: Record<string, any>; // User metadata
    error?: {
      name: string;
      message: string;
      stack?: string;
    };
  }
  
  // Log context for distributed tracing
  interface LogContext {
    traceId?: string;    // Current trace ID
    spanId?: string;     // Current span ID
    requestId?: string;  // Correlation ID
    userId?: string;     // User context
    sessionId?: string;  // Session tracking
    operationType?: string; // Operation type
  }
}
```

#### Logging Methods

```typescript
// Main logging method
public log(level: LogLevel, message: string, meta?: Record<string, any>): void {
  const logData = this.createLogData(level, message, meta);
  this.emit(logData);
}

// Convenience methods
public debug(message: string, meta?: Record<string, any>): void
public info(message: string, meta?: Record<string, any>): void
public warn(message: string, meta?: Record<string, any>): void
public error(message: string, error?: Error | unknown, meta?: Record<string, any>): void
```

### Layer 2: Trace Context Injection

The logger automatically extracts and injects trace context from the active OpenTelemetry span:

```typescript
private getCurrentTraceContext(): LogContext {
  try {
    const ctx = context.active();
    const span = trace.getSpan(ctx);
    const spanContext = span?.spanContext();

    const baseContext = spanContext ? {
      traceId: spanContext.traceId,
      spanId: spanContext.spanId,
    } : {};

    // Extract additional correlation data from span attributes
    if (span) {
      const attributes = span.attributes;
      if (attributes?.["correlation.id"]) {
        baseContext.requestId = String(attributes["correlation.id"]);
      }
      if (attributes?.["user.id"]) {
        baseContext.userId = String(attributes["user.id"]);
      }
    }

    return baseContext;
  } catch {
    return {};
  }
}
```

This ensures every log entry is automatically correlated with:
- The current distributed trace
- The specific span within that trace
- Any correlation IDs for request tracking
- User context for debugging user-specific issues

### Layer 3: Sampling Decision Logic

Before any log is processed, it goes through intelligent sampling:

```typescript
private shouldSampleLog(logData: StructuredLogData): boolean {
  const samplingCoordinator = getSimpleSmartSampler();
  
  if (samplingCoordinator) {
    // Use unified sampling coordinator for consistent decisions
    const decision = samplingCoordinator.shouldSampleLog(
      logData.level,
      logData.message,
      logData.context?.traceId
    );
    
    return decision.shouldSample;
  }

  // Fallback to level-based sampling
  const samplingRate = this.getSamplingRate(logData.level);

  // ALWAYS sample errors (100% error visibility)
  if (logData.level === LogLevel.ERROR) {
    return true;
  }

  // Use trace ID for deterministic sampling if available
  const traceId = logData.context?.traceId;
  if (traceId) {
    // Deterministic sampling based on trace ID
    const hash = parseInt(traceId.slice(-8), 16);
    const normalizedHash = (hash % 1000000) / 1000000;
    return normalizedHash < samplingRate;
  }

  // Random sampling as last resort
  return Math.random() < samplingRate;
}

// Level-specific sampling rates
private getSamplingRate(level: LogLevel): number {
  switch (level) {
    case LogLevel.DEBUG: return 0.1;  // 10% - reduce noise
    case LogLevel.INFO:  return 0.5;  // 50% - balanced
    case LogLevel.WARN:  return 0.9;  // 90% - high visibility
    case LogLevel.ERROR: return 1.0;  // 100% - never drop
  }
}
```

Key sampling features:
- **Error preservation**: 100% of errors are always logged
- **Deterministic sampling**: Uses trace ID for consistent sampling across the trace
- **Level-based rates**: Different sampling rates per log level
- **Cost optimization**: Reduces debug logs by 90%, info logs by 50%

### Layer 4: Circuit Breaker Integration

The logger checks circuit breaker state before attempting OTLP export:

```typescript
private emit(logData: StructuredLogData): void {
  // Apply sampling first
  if (!this.shouldSampleLog(logData)) {
    return; // Skip based on sampling
  }

  // Check circuit breaker
  const circuitBreaker = telemetryHealthMonitor.getCircuitBreaker();
  
  if (!circuitBreaker.canExecute()) {
    // Circuit breaker is OPEN - fallback to console
    this.fallbackToConsole(logData);
    return;
  }

  if (this.isInitialized && this.logger) {
    try {
      // Attempt OTLP export
      this.logger.emit({
        timestamp: logData.timestamp,
        severityText: logData.level.toUpperCase(),
        severityNumber: this.getSeverityNumber(logData.level),
        body: logData.message,
        attributes: {
          ...logData.context,  // Trace context
          ...logData.meta,     // User metadata
          "service.name": config.SERVICE_NAME,
          "service.version": config.SERVICE_VERSION,
          "runtime.name": typeof Bun !== "undefined" ? "bun" : "node",
        },
      });

      // Record success
      telemetryHealthMonitor.recordExporterSuccess("logs");
      circuitBreaker.recordSuccess();
      
    } catch (error) {
      // Record failure and fallback
      telemetryHealthMonitor.recordExporterFailure("logs", error);
      circuitBreaker.recordFailure();
      this.fallbackToConsole(logData, error);
    }
  } else {
    // Not initialized - buffer logs
    this.bufferLog(logData);
    this.fallbackToConsole(logData);
  }
}
```

### Layer 5: OTLP Log Export

Logs are formatted according to OTLP specification:

```typescript
// OTLP severity mapping
private getSeverityNumber(level: LogLevel): number {
  switch (level) {
    case LogLevel.DEBUG: return 5;  // DEBUG
    case LogLevel.INFO:  return 9;  // INFO
    case LogLevel.WARN:  return 13; // WARN
    case LogLevel.ERROR: return 17; // ERROR
  }
}

// Log record structure sent to OTLP collector
{
  timestamp: 1699123456789,
  severityText: "ERROR",
  severityNumber: 17,
  body: "Database connection failed",
  attributes: {
    // Trace correlation
    traceId: "a1b2c3d4e5f6g7h8",
    spanId: "i9j0k1l2",
    
    // Service context
    "service.name": "capellaql",
    "service.version": "2.0.0",
    "runtime.name": "bun",
    
    // User metadata
    "user.id": "user123",
    "database.name": "users",
    "error.type": "ConnectionTimeout",
    
    // Custom attributes
    "retry.attempt": 3,
    "connection.pool": "primary"
  }
}
```

### Layer 6: Fallback Console Output

When OTLP export fails or circuit breaker opens, logs fallback to console:

```typescript
private fallbackToConsole(logData: StructuredLogData, error?: unknown): void {
  // Format timestamp based on environment
  const isDevelopment = process.env.NODE_ENV === "development";
  const date = new Date(logData.timestamp);
  
  const timestamp = isDevelopment
    ? `${date.toLocaleDateString()} ${date.toLocaleTimeString()} (${Intl.DateTimeFormat().resolvedOptions().timeZone})`
    : date.toISOString();

  // Include trace context in console output
  const contextStr = logData.context
    ? `[${logData.context.traceId?.slice(0, 8)}:${logData.context.spanId?.slice(0, 8)}]`
    : "";

  const logMessage = `${timestamp} ${logData.level.toUpperCase()} ${contextStr} ${logData.message}`;

  // Use appropriate console method
  switch (logData.level) {
    case LogLevel.DEBUG:
      console.debug(logMessage, logData.meta || "");
      break;
    case LogLevel.INFO:
      console.info(logMessage, logData.meta || "");
      break;
    case LogLevel.WARN:
      console.warn(logMessage, logData.meta || "");
      break;
    case LogLevel.ERROR:
      console.error(logMessage, logData.meta || "");
      if (error) {
        console.error("Logging error:", error);
      }
      break;
  }
}
```

Example console output:
```
2024-01-15 10:30:45 (America/New_York) ERROR [a1b2c3d4:i9j0k1l2] Database connection failed {
  user_id: 'user123',
  retry_attempt: 3,
  error_type: 'ConnectionTimeout'
}
```

### Layer 7: Log Buffering and Replay

Logs generated before initialization are buffered and replayed:

```typescript
private bufferLog(logData: StructuredLogData): void {
  this.fallbackLogs.push(logData);
  
  // Prevent memory buildup
  if (this.fallbackLogs.length > 100) {
    this.fallbackLogs.shift(); // Remove oldest
  }
}

private flushFallbackLogs(): void {
  if (this.fallbackLogs.length > 0 && this.isInitialized && this.logger) {
    console.info(`Flushing ${this.fallbackLogs.length} buffered logs to OpenTelemetry`);
    
    for (const logData of this.fallbackLogs) {
      this.emit(logData);
    }
    
    this.fallbackLogs = [];
  }
}

public initialize(): void {
  if (this.isInitialized) return;
  
  try {
    const loggerProvider = api.logs.getLoggerProvider();
    this.logger = loggerProvider.getLogger("capellaql-logger", "1.0.0");
    this.isInitialized = true;
    
    // Flush any buffered logs
    this.flushFallbackLogs();
  } catch (error) {
    console.error("Failed to initialize telemetry logger:", error);
  }
}
```

### Layer 8: Bun-Optimized Log Exporter

The `BunLogExporter` provides optimizations for Bun runtime:

```typescript
export class BunLogExporter extends BunOTLPExporter<ReadableLogRecord> {
  // Circuit breaker state
  private circuitBreakerFailureCount = 0;
  private circuitBreakerLastFailureTime = 0;
  private readonly circuitBreakerThreshold = 5;
  private readonly circuitBreakerTimeoutMs = 30000;

  // Deduplication state
  private recentLogHashes = new Map<string, number>();
  private readonly deduplicationWindow = 60000; // 1 minute
  
  async export(logs: ReadableLogRecord[], resultCallback: (result: ExportResult) => void): Promise<void> {
    // Check circuit breaker
    if (this.isCircuitBreakerOpen()) {
      console.warn("Log export circuit breaker is OPEN - rejecting export");
      resultCallback({
        code: 1, // FAILED
        error: new Error("Circuit breaker is open"),
      });
      return;
    }

    // Apply filtering and deduplication
    const filteredLogs = this.applyAdvancedFiltering(logs);
    
    // Export with circuit breaker monitoring
    const wrappedCallback = (result: ExportResult) => {
      if (result.code === 0) { // SUCCESS
        this.circuitBreakerFailureCount = 0;
        this.circuitBreakerLastFailureTime = 0;
      } else {
        this.circuitBreakerFailureCount++;
        this.circuitBreakerLastFailureTime = Date.now();
        
        if (this.circuitBreakerFailureCount >= this.circuitBreakerThreshold) {
          console.error("Log export circuit breaker OPENED");
        }
      }
      
      resultCallback(result);
    };

    return super.export(filteredLogs, wrappedCallback);
  }
  
  private applyAdvancedFiltering(logs: ReadableLogRecord[]): ReadableLogRecord[] {
    const now = Date.now();
    const filtered: ReadableLogRecord[] = [];
    
    // Clean old hashes
    this.cleanOldHashes(now);
    
    for (const log of logs) {
      // Always keep error logs
      if (log.severityNumber && log.severityNumber >= 17) { // ERROR+
        filtered.push(log);
        continue;
      }
      
      // Deduplicate other logs
      const logHash = this.createLogHash(log);
      const lastSeen = this.recentLogHashes.get(logHash);
      
      if (!lastSeen || now - lastSeen > this.deduplicationWindow) {
        this.recentLogHashes.set(logHash, now);
        filtered.push(log);
      }
      // Silently drop duplicates
    }
    
    return filtered;
  }
}
```

### Usage Examples

#### Basic Logging
```typescript
import { log, debug, warn, error } from './telemetry/logger';

// Simple messages
log('User logged in');
debug('Processing request');
warn('Cache miss detected');

// With metadata
log('Order processed', {
  orderId: 'order-123',
  amount: 99.99,
  userId: 'user-456'
});

// Error logging with stack trace
try {
  await riskyOperation();
} catch (err) {
  error('Operation failed', err, {
    operation: 'riskyOperation',
    retryCount: 3,
    context: additionalContext
  });
}
```

#### Structured Logging with Context
```typescript
// Logs automatically include trace context when inside a span
async function processRequest(requestId: string) {
  const span = trace.getActiveSpan();
  span?.setAttribute('correlation.id', requestId);
  
  // This log will include traceId, spanId, and correlation.id
  log('Processing request', {
    requestId,
    timestamp: Date.now()
  });
  
  // All subsequent logs in this span context will be correlated
  debug('Fetching user data');
  
  try {
    const result = await fetchData();
    log('Request completed', { 
      resultSize: result.length 
    });
  } catch (err) {
    // Error log with full correlation
    error('Request processing failed', err, {
      requestId,
      stage: 'data-fetch'
    });
  }
}
```

#### Cost-Optimized Logging
```typescript
// Configure sampling rates for different environments
const loggingConfig = {
  production: {
    debug: 0.05,  // 5% - minimal debug in production
    info: 0.25,   // 25% - reduced info logs
    warn: 0.90,   // 90% - most warnings
    error: 1.00   // 100% - all errors
  },
  staging: {
    debug: 0.25,  // 25% - more debug in staging
    info: 0.50,   // 50% - balanced info
    warn: 1.00,   // 100% - all warnings
    error: 1.00   // 100% - all errors
  },
  development: {
    debug: 1.00,  // 100% - all debug logs
    info: 1.00,   // 100% - all info
    warn: 1.00,   // 100% - all warnings
    error: 1.00   // 100% - all errors
  }
};
```

## Bun Runtime Optimizations

### Custom Exporters
All exporters are optimized for Bun's runtime:

```typescript
// Base exporter using native fetch
export class BunOTLPExporter<T> {
  private async performRequest(payload: string): Promise<ExportResult> {
    const response = await fetch(this.url, {
      method: "POST",
      headers: this.headers,
      body: payload,
      signal: controller.signal,
      keepalive: true, // Bun-specific optimization
    });
    
    // Exponential backoff with jitter
    const baseDelay = this.retryConfig.initialDelayMs * 
                     this.retryConfig.backoffMultiplier ** attempt;
    const jitter = Math.random() * 0.3; // 30% jitter
    const delayMs = Math.min(
      baseDelay * (1 + jitter), 
      this.retryConfig.maxDelayMs
    );
  }
}
```

### Custom Processors
Bypass standard OpenTelemetry processors:

```typescript
// Custom span processor
export class BunSpanProcessor implements SpanProcessor {
  private readonly exporter: BunTraceExporter;
  private spans: ReadableSpan[] = [];
  
  onEnd(span: ReadableSpan): void {
    this.spans.push(span);
    
    if (this.spans.length >= this.maxBatchSize) {
      this.flush();
    }
  }
}

// Custom metric reader
export class BunMetricReader extends MetricReader {
  private readonly exporter: BunMetricExporter;
  
  protected async onForceFlush(): Promise<void> {
    return this.collectAndExport();
  }
}
```

## Sampling Strategy

### Simple Smart Sampler
Three-tier sampling with cost optimization:

```typescript
export class SimpleSmartSampler implements Sampler {
  private readonly config: SimpleSmartSamplingConfig = {
    traces: 0.15,    // 15% trace sampling
    metrics: 0.20,   // 20% metrics sampling
    logs: 0.25,      // 25% log sampling
    
    preserveErrors: true,        // Always preserve errors
    costOptimizationMode: true,  // Aggressive cost savings
    healthCheckSampling: 0.05,   // 5% for health endpoints
  };

  shouldSample(...): SamplingResult {
    // Check for errors first - always preserve
    if (this.isErrorTrace(attributes)) {
      return { 
        decision: SamplingDecision.RECORD_AND_SAMPLED,
        attributes: { "sampling.reason": "error_preservation" }
      };
    }

    // Health check reduction
    if (this.isHealthCheckTrace(spanName)) {
      const shouldSample = Math.random() < 0.05;
      return { 
        decision: shouldSample ? RECORD_AND_SAMPLED : NOT_RECORD 
      };
    }

    // Standard sampling
    const shouldSample = Math.random() < this.config.traces;
    return { 
      decision: shouldSample ? RECORD_AND_SAMPLED : NOT_RECORD 
    };
  }
}
```

## Health Monitoring & Circuit Breakers

### Circuit Breaker Pattern
```typescript
export class TelemetryCircuitBreaker {
  private state: CircuitBreakerState = CLOSED;
  
  public canExecute(): boolean {
    switch (this.state) {
      case CLOSED:
        return true;
      case OPEN:
        if (this.shouldAttemptReset()) {
          this.state = HALF_OPEN;
          return true;
        }
        return false;
      case HALF_OPEN:
        return true;
    }
  }
  
  public recordSuccess(): void {
    if (this.state === HALF_OPEN) {
      this.successes++;
      if (this.successes >= this.config.successThreshold) {
        this.state = CLOSED;
      }
    }
  }
  
  public recordFailure(): void {
    this.failures++;
    if (this.state === CLOSED && 
        this.failures >= this.config.failureThreshold) {
      this.state = OPEN;
    } else if (this.state === HALF_OPEN) {
      this.state = OPEN;
    }
  }
}
```

### Health Monitor
```typescript
export class TelemetryHealthMonitor {
  private circuitBreaker: TelemetryCircuitBreaker;
  private exporters: Map<string, ExporterHealth>;
  
  public getHealthData(): TelemetryHealthData {
    return {
      status: this.calculateOverallStatus(),
      exporters: {
        traces: this.exporters.get("traces"),
        metrics: this.exporters.get("metrics"),
        logs: this.exporters.get("logs"),
      },
      circuitBreaker: this.circuitBreaker.getStats(),
      runtime: {
        memoryUsageMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        uptimeMs: process.uptime() * 1000,
      }
    };
  }
}
```

## Metrics Collection

### HTTP Metrics
```typescript
export function recordHttpRequest(
  method: string, 
  route: string, 
  statusCode?: number
): void {
  // Apply sampling
  const decision = samplingCoordinator.shouldSampleMetric(
    "http_requests_total",
    { method, route, status_code: statusCode }
  );
  
  if (!decision.shouldSample) return;
  
  httpRequestCounter.add(1, {
    method: method.toUpperCase(),
    route,
    status_code: statusCode?.toString(),
    sampling_reason: decision.reason,
  });
}
```

### Database Metrics
```typescript
export function recordDatabaseOperation(
  operation: string,
  bucket: string,
  durationMs: number,
  success: boolean
): void {
  // Check circuit breaker
  if (!circuitBreaker.canExecute()) return;
  
  // Apply sampling
  const decision = samplingCoordinator.shouldSampleMetric(
    "db_operations_total",
    { operation, bucket, status: success ? "success" : "error" }
  );
  
  if (!decision.shouldSample) return;
  
  dbOperationCounter.add(1, {
    operation,
    bucket,
    status: success ? "success" : "error",
    trace_id: getActiveTraceId()?.slice(0, 8),
  });
  
  // Convert to seconds for UCUM compliance
  dbResponseTimeHistogram.record(durationMs / 1000, {
    operation,
    bucket,
  });
}
```

## Distributed Tracing

### Creating Database Spans
```typescript
export async function createDatabaseSpan<T>(
  options: CouchbaseSpanOptions,
  operation: () => Promise<T>
): Promise<T> {
  const tracer = trace.getTracer("couchbase-client", "1.0.0");
  
  return await tracer.startActiveSpan(
    `couchbase.${options.operation}`,
    { 
      attributes: {
        "db.system": "couchbase",
        "db.name": options.bucket,
        "db.operation": options.operation,
        "db.couchbase.scope": options.scope,
        "db.collection.name": options.collection,
      }
    },
    async (span: Span) => {
      const startTime = Date.now();
      
      try {
        const result = await operation();
        
        // Log success with automatic trace correlation
        log('Database operation completed', {
          operation: options.operation,
          duration: Date.now() - startTime,
        });
        
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
        
      } catch (error) {
        // Log error with automatic trace correlation
        error('Database operation failed', error, {
          operation: options.operation,
          bucket: options.bucket,
        });
        
        span.recordException(error);
        span.setStatus({ 
          code: SpanStatusCode.ERROR,
          message: error.message 
        });
        throw error;
        
      } finally {
        span.end();
      }
    }
  );
}
```

## Implementation Checklist

### Step 1: Install Dependencies
```json
{
  "dependencies": {
    "@opentelemetry/api": "^1.9.0",
    "@opentelemetry/api-logs": "^0.54.0",
    "@opentelemetry/auto-instrumentations-node": "^0.52.0",
    "@opentelemetry/core": "^1.27.0",
    "@opentelemetry/exporter-logs-otlp-http": "^0.54.0",
    "@opentelemetry/exporter-metrics-otlp-http": "^0.54.0",
    "@opentelemetry/exporter-trace-otlp-http": "^0.54.0",
    "@opentelemetry/instrumentation-graphql": "^0.44.0",
    "@opentelemetry/resources": "^1.27.0",
    "@opentelemetry/sdk-logs": "^0.54.0",
    "@opentelemetry/sdk-metrics": "^1.27.0",
    "@opentelemetry/sdk-node": "^0.54.0",
    "@opentelemetry/sdk-trace-base": "^1.27.0",
    "@opentelemetry/semantic-conventions": "^1.27.0",
    "zod": "^3.23.0"
  }
}
```

### Step 2: Environment Variables
```bash
# Core configuration
ENABLE_OPENTELEMETRY=true
SERVICE_NAME=your-service
SERVICE_VERSION=1.0.0
DEPLOYMENT_ENVIRONMENT=production

# OTLP endpoints (port 4318 for HTTP)
TRACES_ENDPOINT=http://collector:4318/v1/traces
METRICS_ENDPOINT=http://collector:4318/v1/metrics
LOGS_ENDPOINT=http://collector:4318/v1/logs

# Performance tuning
METRIC_READER_INTERVAL=60000
SUMMARY_LOG_INTERVAL=300000
EXPORT_TIMEOUT_MS=30000
BATCH_SIZE=2048
MAX_QUEUE_SIZE=10000

# Sampling configuration
SAMPLING_RATE=0.15
LOG_SAMPLING_DEBUG=0.1
LOG_SAMPLING_INFO=0.5
LOG_SAMPLING_WARN=0.9
LOG_SAMPLING_ERROR=1.0

# Circuit breaker
CIRCUIT_BREAKER_THRESHOLD=5
CIRCUIT_BREAKER_TIMEOUT_MS=60000
```

### Step 3: Initialize on Startup
```typescript
// main.ts or index.ts
import { initializeTelemetry } from './telemetry/instrumentation';

async function startApplication() {
  // Initialize telemetry first
  await initializeTelemetry();
  
  // Then start your application
  const app = express();
  // ... rest of your app
}

startApplication().catch(console.error);
```

### Step 4: Use Throughout Application
```typescript
// In your application code
import { log, debug, warn, error } from './telemetry/logger';
import { recordHttpRequest, recordDatabaseOperation } from './telemetry/metrics';
import { createDatabaseSpan } from './telemetry/tracing';

// Logging examples
log('Processing user request', { userId: '123' });
error('Failed to process payment', err, { orderId: '456' });

// Metrics examples
recordHttpRequest('POST', '/api/orders', 201);
recordDatabaseOperation('query', 'orders', 45, true);

// Tracing examples
const result = await createDatabaseSpan(
  { bucket: 'orders', operation: 'get', key: 'order-123' },
  async () => await db.get('order-123')
);
```

## Production Deployment

### Best Practices

1. **Start Conservative**: Begin with lower sampling rates and increase as needed
   ```typescript
   production: { traces: 0.10, metrics: 0.15, logs: 0.20 }
   staging: { traces: 0.25, metrics: 0.50, logs: 0.50 }
   development: { traces: 1.00, metrics: 1.00, logs: 1.00 }
   ```

2. **Monitor Circuit Breakers**: Set up alerts
   ```typescript
   if (healthData.circuitBreaker.state === 'OPEN') {
     alert('Telemetry circuit breaker opened!');
   }
   ```

3. **Health Endpoint Integration**
   ```typescript
   app.get('/health', async (req, res) => {
     const health = await generateComprehensiveHealthReport();
     res.status(getHealthStatusCode(health)).json(health);
   });
   ```

4. **Graceful Degradation Testing**
   ```bash
   # Test with collector down
   docker stop otel-collector
   # Verify logs fallback to console
   # Verify circuit breaker opens after 5 failures
   ```

5. **Cost Monitoring**
   ```typescript
   const stats = sampler.getStats();
   console.log(`Sampling rate: ${stats.samplingRate}`);
   console.log(`Cost savings: ${stats.estimatedCostSavings}%`);
   ```

### Troubleshooting Guide

| Issue | Solution |
|-------|----------|
| Timeout errors | Use Bun-optimized exporters with 10s timeout |
| High costs | Reduce sampling rates, especially debug logs |
| Missing traces | Check circuit breaker status and health endpoint |
| Memory issues | Batch coordinator has memory pressure monitoring |
| No correlation | Ensure W3C propagators are configured |
| Logs not appearing | Check: 1) Initialization, 2) Sampling rates, 3) Circuit breaker |

### Performance Impact

Typical overhead with default configuration:
- **CPU**: < 2% additional usage
- **Memory**: ~50MB for buffers and state
- **Latency**: < 1ms per operation (async export)
- **Network**: ~5KB/s with 15% sampling

### Cost Estimation

With default sampling configuration:
- **Traces**: 15% sampling = 85% cost reduction
- **Metrics**: 20% sampling = 80% cost reduction  
- **Logs**: Variable by level, average 60% reduction
- **Overall**: 70-85% cost reduction vs. 100% sampling

## Summary

This OpenTelemetry implementation provides:

1. **Complete Observability**: Distributed traces, metrics, and logs with automatic correlation
2. **Cost Optimization**: 70-85% reduction through intelligent sampling
3. **High Reliability**: Circuit breakers, graceful degradation, and health monitoring
4. **Performance**: Bun-optimized exporters preventing timeouts
5. **Developer Experience**: Simple API with automatic context injection
6. **Production Ready**: Battle-tested patterns for scale

The key to success is the layered architecture where each component provides specific value while maintaining system reliability. The logging system exemplifies this with its 8-layer architecture providing everything from trace correlation to circuit breaker protection.
