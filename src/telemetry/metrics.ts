/* src/telemetry/metrics.ts */

// OpenTelemetry metrics implementation for authentication service
import { metrics } from '@opentelemetry/api';

export interface MetricLabels {
  operation?: string;
  statusCode?: string;
  method?: string;
  endpoint?: string;
  consumerType?: string;
  errorType?: string;
  [key: string]: string | undefined;
}

class BunTelemetryMetrics {
  private meter = metrics.getMeter('pvh-authentication-service', '1.0.0');
  private config: any;

  // Counters
  private httpRequestsTotal = this.meter.createCounter('http_requests_total', {
    description: 'Total number of HTTP requests',
  });

  private authTokensIssuedTotal = this.meter.createCounter('auth_tokens_issued_total', {
    description: 'Total number of JWT tokens issued',
  });

  private kongOperationsTotal = this.meter.createCounter('kong_operations_total', {
    description: 'Total number of Kong API operations',
  });

  private authenticationEventsTotal = this.meter.createCounter('authentication_events_total', {
    description: 'Total number of authentication events',
  });

  private errorsTotal = this.meter.createCounter('errors_total', {
    description: 'Total number of errors by type',
  });

  // Histograms
  private httpRequestDuration = this.meter.createHistogram('http_request_duration_ms', {
    description: 'HTTP request duration in milliseconds',
  });

  private jwtCreationDuration = this.meter.createHistogram('jwt_creation_duration_ms', {
    description: 'JWT creation duration in milliseconds',
  });

  private kongOperationDuration = this.meter.createHistogram('kong_operation_duration_ms', {
    description: 'Kong operation duration in milliseconds',
  });

  // Gauges
  private activeConnections = this.meter.createUpDownCounter('active_connections', {
    description: 'Current number of active connections',
  });

  private memoryUsage = this.meter.createGauge('memory_usage_bytes', {
    description: 'Memory usage in bytes',
  });

  private cacheSize = this.meter.createGauge('cache_size', {
    description: 'Current cache size',
  });

  public initialize(config?: any): void {
    this.config = config || (globalThis as any).__appConfig?.telemetry;
    
    // Start background metric collection
    this.startBackgroundMetrics();
  }


  // HTTP Metrics
  public recordHttpRequest(method: string, endpoint: string, statusCode: number, duration: number): void {
    // Full telemetry - no sampling

    const labels: MetricLabels = {
      method: method.toUpperCase(),
      endpoint,
      statusCode: statusCode.toString(),
    };

    this.httpRequestsTotal.add(1, labels);
    this.httpRequestDuration.record(duration, labels);
  }

  // Authentication Metrics
  public recordTokenIssued(consumerType: string, success: boolean): void {
    // Full telemetry - no sampling

    const labels: MetricLabels = {
      consumerType,
      success: success.toString(),
    };

    this.authTokensIssuedTotal.add(1, labels);
  }

  public recordAuthenticationEvent(event: string, success: boolean): void {
    // Full telemetry - no sampling

    const labels: MetricLabels = {
      event,
      success: success.toString(),
    };

    this.authenticationEventsTotal.add(1, labels);
  }

  // Kong API Metrics
  public recordKongOperation(operation: string, success: boolean, duration: number): void {
    // Full telemetry - no sampling

    const labels: MetricLabels = {
      operation,
      success: success.toString(),
    };

    this.kongOperationsTotal.add(1, labels);
    this.kongOperationDuration.record(duration, labels);
  }

  // JWT Metrics
  public recordJWTOperation(operation: string, duration: number, success: boolean = true): void {
    // Full telemetry - no sampling

    const labels: MetricLabels = {
      operation,
      success: success.toString(),
    };

    this.jwtCreationDuration.record(duration, labels);
  }

  // Error Metrics
  public recordError(errorType: string, operation?: string): void {
    // Always record errors (no sampling)
    const labels: MetricLabels = {
      errorType,
      operation: operation || 'unknown',
    };

    this.errorsTotal.add(1, labels);
  }

  // Connection Metrics
  public incrementActiveConnections(): void {
    this.activeConnections.add(1);
  }

  public decrementActiveConnections(): void {
    this.activeConnections.add(-1);
  }

  // Cache Metrics
  public setCacheSize(size: number, cacheType: string): void {
    // Full telemetry - no sampling

    this.cacheSize.record(size, { cacheType });
  }

  // Business Metrics
  public recordBusinessMetric(metricName: string, value: number, labels?: MetricLabels): void {
    // Full telemetry - no sampling

    try {
      const counter = this.meter.createCounter(`business_${metricName}`, {
        description: `Business metric: ${metricName}`,
      });
      
      counter.add(value, labels || {});
    } catch (error) {
    }
  }

  // Background system metrics collection
  private startBackgroundMetrics(): void {
    // Collect system metrics every 30 seconds
    const collectSystemMetrics = () => {
      try {
        const memUsage = process.memoryUsage();
        
        this.memoryUsage.record(memUsage.heapUsed, { type: 'heap_used' });
        this.memoryUsage.record(memUsage.heapTotal, { type: 'heap_total' });
        this.memoryUsage.record(memUsage.rss, { type: 'rss' });
        this.memoryUsage.record(memUsage.external, { type: 'external' });
        
        // Record uptime as a business metric
        this.recordBusinessMetric('uptime_seconds', Math.floor(process.uptime()));
        
      } catch (error) {
      }
    };

    // Initial collection
    collectSystemMetrics();
    
    // Schedule periodic collection
    setInterval(collectSystemMetrics, 30000);
  }

  // Helper to get metric dimensions for filtering/aggregation
  public getDimensions(): {
    httpEndpoints: string[];
    kongOperations: string[];
    jwtOperations: string[];
    errorTypes: string[];
  } {
    return {
      httpEndpoints: ['/health', '/metrics', '/tokens'],
      kongOperations: ['jwt_credential_management', 'consumer_management', 'core_entities_api', 'realm_management', 'health_check'],
      jwtOperations: ['create', 'verify', 'refresh'],
      errorTypes: ['validation_error', 'kong_api_error', 'jwt_creation_error', 'authentication_error', 'internal_error']
    };
  }
}

// Global metrics instance
export const telemetryMetrics = new BunTelemetryMetrics();