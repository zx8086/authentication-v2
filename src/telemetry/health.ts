/* src/telemetry/health.ts */

// Telemetry health monitoring and circuit breaker implementation
import { type BunTelemetryConfig } from './config';

export interface TelemetryHealthStatus {
  status: 'healthy' | 'degraded' | 'critical';
  circuitBreaker: {
    state: 'closed' | 'open' | 'half_open';
    failureCount: number;
    successCount: number;
    lastFailureTime?: number;
  };
  memory: {
    pressureLevel: 'normal' | 'warning' | 'high' | 'critical' | 'panic';
    usageMB: number;
    heapUsageRatio: number;
  };
  telemetryMode: {
    traces: string;
    logs: string;
    metrics: string;
  };
  otlp: {
    queueSize: number;
    totalSent: number;
    successfulBatches: number;
    failedBatches: number;
    failureRate: string;
  };
  lastHealthCheck: number;
}

enum CircuitBreakerState {
  CLOSED = 'closed',       // Normal operation
  OPEN = 'open',          // Blocking requests
  HALF_OPEN = 'half_open' // Testing recovery
}

class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private config: BunTelemetryConfig['circuitBreaker'];

  constructor(config: BunTelemetryConfig['circuitBreaker']) {
    this.config = config!;
  }

  public canExecute(): boolean {
    switch (this.state) {
      case CircuitBreakerState.CLOSED:
        return true;
      case CircuitBreakerState.OPEN:
        if (Date.now() - this.lastFailureTime >= this.config.timeout) {
          this.state = CircuitBreakerState.HALF_OPEN;
          return true;
        }
        return false;
      case CircuitBreakerState.HALF_OPEN:
        return true;
    }
  }

  public recordSuccess(): void {
    this.failureCount = 0;
    this.successCount++;

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.state = CircuitBreakerState.CLOSED;
    }
  }

  public recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.config.threshold) {
      this.state = CircuitBreakerState.OPEN;
    }
  }

  public getStatus() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime
    };
  }

  public forceReset(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = 0;
  }
}

class MemoryPressureManager {
  private config: BunTelemetryConfig['memory'];
  private currentPressureLevel: 'normal' | 'warning' | 'high' | 'critical' | 'panic' = 'normal';

  constructor(config: BunTelemetryConfig['memory']) {
    this.config = config!;
    
    // Monitor memory pressure every 30 seconds
    setInterval(() => this.checkMemoryPressure(), 30000);
  }

  private checkMemoryPressure(): void {
    const memUsage = process.memoryUsage();
    const heapRatio = memUsage.heapUsed / memUsage.heapTotal;

    if (heapRatio >= this.config.panicThreshold) {
      this.currentPressureLevel = 'panic';
      this.handlePanicPressure();
    } else if (heapRatio >= this.config.criticalThreshold) {
      this.currentPressureLevel = 'critical';
      this.handleCriticalPressure();
    } else if (heapRatio >= this.config.highThreshold) {
      this.currentPressureLevel = 'high';
      this.handleHighPressure();
    } else if (heapRatio >= this.config.warningThreshold) {
      this.currentPressureLevel = 'warning';
      this.handleWarningPressure();
    } else {
      this.currentPressureLevel = 'normal';
    }
  }

  private handlePanicPressure(): void {
    // In panic mode, we might temporarily disable telemetry
  }

  private handleCriticalPressure(): void {
    // Drop all non-error telemetry
  }

  private handleHighPressure(): void {
    // Reduce batch sizes by 50%
  }

  private handleWarningPressure(): void {
    // Begin graduated response
  }

  public getPressureLevel(): 'normal' | 'warning' | 'high' | 'critical' | 'panic' {
    return this.currentPressureLevel;
  }

  public getBatchSizeAdjustment(originalBatchSize: number): number {
    const adjustments = {
      normal: 1.0,
      warning: 0.8,    // 80% of original
      high: 0.5,       // 50% of original
      critical: 0.25,  // 25% of original  
      panic: 0.1       // 10% of original
    };

    return Math.floor(originalBatchSize * adjustments[this.currentPressureLevel]);
  }

  public shouldDropTelemetry(type: 'trace' | 'metric' | 'log', level?: string): boolean {
    // Always preserve errors regardless of memory pressure
    if (type === 'log' && level === 'error') return false;

    // Drop based on pressure level
    if (this.currentPressureLevel === 'critical' || this.currentPressureLevel === 'panic') {
      if (type === 'log' && level !== 'error') return true;
      if (type === 'trace') return Math.random() > 0.01; // Keep 1%
      if (type === 'metric') return Math.random() > 0.05; // Keep 5%
    }

    return false;
  }

  public getMemoryInfo() {
    const memUsage = process.memoryUsage();
    return {
      pressureLevel: this.currentPressureLevel,
      usageMB: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapUsageRatio: memUsage.heapUsed / memUsage.heapTotal,
      totalMemoryUsageMB: Math.round(memUsage.heapUsed / 1024 / 1024),
    };
  }
}

class BunTelemetryHealthMonitor {
  private circuitBreaker?: CircuitBreaker;
  private memoryManager?: MemoryPressureManager;
  private config?: BunTelemetryConfig;
  private statistics = {
    totalSent: 0,
    successfulBatches: 0,
    failedBatches: 0,
    queueSize: 0,
  };

  public initialize(config: BunTelemetryConfig): void {
    this.config = config;
    this.circuitBreaker = new CircuitBreaker(config.circuitBreaker!);
    this.memoryManager = new MemoryPressureManager(config.memory!);
  }

  public recordTelemetryExport(success: boolean, batchSize: number): void {
    this.statistics.totalSent += batchSize;
    
    if (success) {
      this.statistics.successfulBatches++;
      this.circuitBreaker?.recordSuccess();
    } else {
      this.statistics.failedBatches++;
      this.circuitBreaker?.recordFailure();
    }
  }

  public updateQueueSize(size: number): void {
    this.statistics.queueSize = size;
  }

  public getCircuitBreaker(): CircuitBreaker | undefined {
    return this.circuitBreaker;
  }

  public getBatchSizeAdjustment(originalBatchSize: number): number {
    return this.memoryManager?.getBatchSizeAdjustment(originalBatchSize) || originalBatchSize;
  }

  public shouldDropTelemetry(type: 'trace' | 'metric' | 'log', level?: string): boolean {
    return this.memoryManager?.shouldDropTelemetry(type, level) || false;
  }

  public getHealthStatus(): TelemetryHealthStatus {
    const circuitBreakerStatus = this.circuitBreaker?.getStatus();
    const memoryInfo = this.memoryManager?.getMemoryInfo();
    const failureRate = this.statistics.totalSent > 0 
      ? (this.statistics.failedBatches / (this.statistics.successfulBatches + this.statistics.failedBatches)) * 100 
      : 0;

    // Determine overall status
    let overallStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
    
    if (circuitBreakerStatus?.state === 'open' || memoryInfo?.pressureLevel === 'critical' || memoryInfo?.pressureLevel === 'panic') {
      overallStatus = 'critical';
    } else if (circuitBreakerStatus?.state === 'half_open' || memoryInfo?.pressureLevel === 'high' || failureRate > 20) {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      circuitBreaker: {
        state: circuitBreakerStatus?.state || 'closed',
        failureCount: circuitBreakerStatus?.failureCount || 0,
        successCount: circuitBreakerStatus?.successCount || 0,
        lastFailureTime: circuitBreakerStatus?.lastFailureTime,
      },
      memory: {
        pressureLevel: memoryInfo?.pressureLevel || 'normal',
        usageMB: memoryInfo?.usageMB || 0,
        heapUsageRatio: memoryInfo?.heapUsageRatio || 0,
      },
      telemetryMode: {
        traces: '100% - no sampling',
        logs: '100% - no sampling',
        metrics: '100% - no sampling',
      },
      otlp: {
        queueSize: this.statistics.queueSize,
        totalSent: this.statistics.totalSent,
        successfulBatches: this.statistics.successfulBatches,
        failedBatches: this.statistics.failedBatches,
        failureRate: `${failureRate.toFixed(1)}%`,
      },
      lastHealthCheck: Date.now(),
    };
  }

  // Admin endpoint to force reset circuit breaker (emergency use)
  public forceResetCircuitBreaker(): void {
    this.circuitBreaker?.forceReset();
  }
}

// Global health monitor instance
export const telemetryHealthMonitor = new BunTelemetryHealthMonitor();