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
    // Use RSS (Resident Set Size) as the total memory baseline instead of heapTotal
    // heapTotal can be misleading as it's just the heap size, not total available
    const heapRatio = memUsage.heapUsed / memUsage.rss;

    this.state = {
      isUnderPressure: heapRatio >= this.config.warningThreshold,
      isCritical: heapRatio >= this.config.criticalThreshold,
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
    const currentHeapRatio = memUsage.heapUsed / memUsage.rss;

    return {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      rss: memUsage.rss,
      external: memUsage.external,
      heapRatio: currentHeapRatio,
      isUnderPressure: this.state.isUnderPressure,
      isCritical: this.state.isCritical,
    };
  }
}

let memoryPressureMonitor = new MemoryPressureMonitor();

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

export function startMemoryPressureMonitoring(config?: Partial<MemoryPressureConfig>): void {
  if (config) {
    memoryPressureMonitor.stop();
    memoryPressureMonitor = new MemoryPressureMonitor(config);
  }
  memoryPressureMonitor.start();
}

export function stopMemoryPressureMonitoring(): void {
  memoryPressureMonitor.stop();
}
