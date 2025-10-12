/* src/utils/memory-pressure.ts */

interface MemoryPressureConfig {
  criticalThreshold: number;
  warningThreshold: number;
  checkIntervalMs: number;
}

interface MemoryPressureState {
  isUnderPressure: boolean;
  isCritical: boolean;
  heapRatio: number;
  lastCheck: number;
}

class MemoryPressureMonitor {
  private config: MemoryPressureConfig;
  private state: MemoryPressureState;
  private checkInterval: Timer | null = null;

  constructor(config: Partial<MemoryPressureConfig> = {}) {
    this.config = {
      criticalThreshold: 0.85,
      warningThreshold: 0.75,
      checkIntervalMs: 30000,
      ...config,
    };

    this.state = {
      isUnderPressure: false,
      isCritical: false,
      heapRatio: 0,
      lastCheck: 0,
    };
  }

  start(): void {
    if (this.checkInterval) return;

    this.checkInterval = setInterval(() => {
      this.checkMemoryPressure();
    }, this.config.checkIntervalMs);

    this.checkMemoryPressure();
  }

  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  private checkMemoryPressure(): void {
    const memUsage = process.memoryUsage();
    const heapRatio = memUsage.heapUsed / memUsage.heapTotal;

    this.state = {
      isUnderPressure: heapRatio > this.config.warningThreshold,
      isCritical: heapRatio > this.config.criticalThreshold,
      heapRatio,
      lastCheck: Date.now(),
    };
  }

  getState(): MemoryPressureState {
    return { ...this.state };
  }

  shouldDropTelemetry(): boolean {
    return this.state.isCritical;
  }

  shouldDropNonCriticalMetrics(): boolean {
    return this.state.isUnderPressure;
  }

  getMemoryStats() {
    const memUsage = process.memoryUsage();
    return {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      rss: Math.round(memUsage.rss / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024),
      heapRatio: this.state.heapRatio,
      isUnderPressure: this.state.isUnderPressure,
      isCritical: this.state.isCritical,
    };
  }
}

export const memoryPressureMonitor = new MemoryPressureMonitor();

export function shouldDropTelemetry(): boolean {
  return memoryPressureMonitor.shouldDropTelemetry();
}

export function shouldDropNonCriticalMetrics(): boolean {
  return memoryPressureMonitor.shouldDropNonCriticalMetrics();
}

export function getMemoryPressureState(): MemoryPressureState {
  return memoryPressureMonitor.getState();
}

export function getMemoryStats() {
  return memoryPressureMonitor.getMemoryStats();
}

export function startMemoryPressureMonitoring(): void {
  memoryPressureMonitor.start();
}

export function stopMemoryPressureMonitoring(): void {
  memoryPressureMonitor.stop();
}
