// src/services/profiling/overhead-monitor.ts

import { log, warn } from "../../utils/logger";

// Maximum duration for profiling measurement (5 minutes) - prevents runaway intervals
const MAX_PROFILE_DURATION_MS = 5 * 60 * 1000;

interface CpuMeasurement {
  timestamp: number;
  cpuUsagePercent: number;
}

interface OverheadMetrics {
  baselineCpu: number;
  currentCpu: number;
  overheadPercent: number;
  isAcceptable: boolean;
  measurementCount: number;
}

export class OverheadMonitor {
  private readonly maxOverheadPercent: number;
  private readonly measurementWindowMs: number;
  private readonly baselineMeasurements: CpuMeasurement[] = [];
  private readonly currentMeasurements: CpuMeasurement[] = [];
  private isProfilingActive = false;
  private baselineCpu = 0;
  private measurementInterval: Timer | null = null;
  private autoCleanupTimeout: Timer | null = null;

  constructor(maxOverheadPercent = 2, measurementWindowMs = 10000, baselineSampleCount = 30) {
    this.maxOverheadPercent = maxOverheadPercent;
    this.measurementWindowMs = measurementWindowMs;

    log("Overhead Monitor initialized", {
      event_name: "profiling.overhead_monitor.initialized",
      component: "overhead-monitor",
      max_overhead_percent: maxOverheadPercent,
      measurement_window_ms: measurementWindowMs,
      baseline_sample_count: baselineSampleCount,
    });

    this.startBaselineCollection(baselineSampleCount);
  }

  private startBaselineCollection(sampleCount: number): void {
    let samplesCollected = 0;

    const baselineInterval = setInterval(() => {
      const cpuUsage = this.getCurrentCpuUsage();
      this.baselineMeasurements.push({
        timestamp: Date.now(),
        cpuUsagePercent: cpuUsage,
      });

      samplesCollected++;

      if (samplesCollected >= sampleCount) {
        clearInterval(baselineInterval);
        this.baselineCpu = this.calculateAverageCpu(this.baselineMeasurements);

        log("Baseline CPU measurements complete", {
          event_name: "profiling.overhead_monitor.baseline_complete",
          component: "overhead-monitor",
          baseline_cpu: this.baselineCpu.toFixed(2),
          sample_count: sampleCount,
        });
      }
    }, 1000);
  }

  private getCurrentCpuUsage(): number {
    if (typeof process.cpuUsage !== "function") {
      return 0;
    }

    const cpuUsage = process.cpuUsage();
    const totalCpuTimeUs = cpuUsage.user + cpuUsage.system;
    const totalCpuTimeMs = totalCpuTimeUs / 1000;

    const elapsedMs = process.uptime() * 1000;

    const cpuPercent = (totalCpuTimeMs / elapsedMs) * 100;

    return Math.min(cpuPercent, 100);
  }

  private calculateAverageCpu(measurements: CpuMeasurement[]): number {
    if (measurements.length === 0) {
      return 0;
    }

    const sum = measurements.reduce((acc, m) => acc + m.cpuUsagePercent, 0);
    return sum / measurements.length;
  }

  private cleanOldMeasurements(measurements: CpuMeasurement[]): void {
    const cutoffTime = Date.now() - this.measurementWindowMs;
    const validIndex = measurements.findIndex((m) => m.timestamp >= cutoffTime);

    if (validIndex > 0) {
      measurements.splice(0, validIndex);
    }
  }

  startProfilingMeasurement(): void {
    if (this.isProfilingActive) {
      warn("Profiling measurement already active", {
        event_name: "profiling.overhead_monitor.already_active",
        component: "overhead-monitor",
      });
      return;
    }

    this.isProfilingActive = true;
    this.currentMeasurements.length = 0;

    this.measurementInterval = setInterval(() => {
      const cpuUsage = this.getCurrentCpuUsage();
      this.currentMeasurements.push({
        timestamp: Date.now(),
        cpuUsagePercent: cpuUsage,
      });

      this.cleanOldMeasurements(this.currentMeasurements);

      const metrics = this.getOverheadMetrics();
      if (!metrics.isAcceptable) {
        warn("Profiling overhead exceeds threshold", {
          event_name: "profiling.overhead_monitor.threshold_exceeded",
          component: "overhead-monitor",
          baseline_cpu: metrics.baselineCpu.toFixed(2),
          current_cpu: metrics.currentCpu.toFixed(2),
          overhead_percent: metrics.overheadPercent.toFixed(2),
          threshold: this.maxOverheadPercent,
        });
      }
    }, 1000);

    // Safety timeout to auto-stop profiling measurement if not stopped manually
    // This prevents runaway intervals from causing memory leaks
    this.autoCleanupTimeout = setTimeout(() => {
      if (this.isProfilingActive) {
        warn("Auto-stopping profiling measurement after max duration", {
          event_name: "profiling.overhead_monitor.auto_stop",
          component: "overhead-monitor",
          max_duration_ms: MAX_PROFILE_DURATION_MS,
          max_duration_minutes: MAX_PROFILE_DURATION_MS / 60000,
        });
        this.stopProfilingMeasurement();
      }
    }, MAX_PROFILE_DURATION_MS);

    log("Started profiling measurement", {
      event_name: "profiling.overhead_monitor.started",
      component: "overhead-monitor",
      baseline_cpu: this.baselineCpu.toFixed(2),
      max_duration_minutes: MAX_PROFILE_DURATION_MS / 60000,
    });
  }

  stopProfilingMeasurement(): OverheadMetrics {
    if (!this.isProfilingActive) {
      warn("No active profiling measurement to stop", {
        event_name: "profiling.overhead_monitor.not_active",
        component: "overhead-monitor",
      });
      return this.getOverheadMetrics();
    }

    this.isProfilingActive = false;

    if (this.measurementInterval) {
      clearInterval(this.measurementInterval);
      this.measurementInterval = null;
    }

    // Clear auto-cleanup timeout since we're stopping manually
    if (this.autoCleanupTimeout) {
      clearTimeout(this.autoCleanupTimeout);
      this.autoCleanupTimeout = null;
    }

    const metrics = this.getOverheadMetrics();

    log("Stopped profiling measurement", {
      event_name: "profiling.overhead_monitor.stopped",
      component: "overhead-monitor",
      baseline_cpu: metrics.baselineCpu.toFixed(2),
      current_cpu: metrics.currentCpu.toFixed(2),
      overhead_percent: metrics.overheadPercent.toFixed(2),
      is_acceptable: metrics.isAcceptable,
      measurement_count: metrics.measurementCount,
    });

    this.currentMeasurements.length = 0;

    return metrics;
  }

  getOverheadMetrics(): OverheadMetrics {
    const currentCpu =
      this.currentMeasurements.length > 0
        ? this.calculateAverageCpu(this.currentMeasurements)
        : this.getCurrentCpuUsage();

    const overheadPercent = currentCpu - this.baselineCpu;
    const isAcceptable = overheadPercent <= this.maxOverheadPercent;

    return {
      baselineCpu: this.baselineCpu,
      currentCpu,
      overheadPercent,
      isAcceptable,
      measurementCount: this.currentMeasurements.length,
    };
  }

  isOverheadAcceptable(): boolean {
    const metrics = this.getOverheadMetrics();
    return metrics.isAcceptable;
  }

  async shutdown(): Promise<void> {
    log("Overhead Monitor shutting down", {
      event_name: "profiling.overhead_monitor.shutdown",
      component: "overhead-monitor",
      is_profiling_active: this.isProfilingActive,
    });

    if (this.measurementInterval) {
      clearInterval(this.measurementInterval);
      this.measurementInterval = null;
    }

    if (this.autoCleanupTimeout) {
      clearTimeout(this.autoCleanupTimeout);
      this.autoCleanupTimeout = null;
    }

    this.isProfilingActive = false;
    this.baselineMeasurements.length = 0;
    this.currentMeasurements.length = 0;
  }
}

let overheadMonitorInstance: OverheadMonitor | null = null;

export function getOverheadMonitor(): OverheadMonitor {
  if (!overheadMonitorInstance) {
    overheadMonitorInstance = new OverheadMonitor();
  }
  return overheadMonitorInstance;
}

export function resetOverheadMonitor(): void {
  if (overheadMonitorInstance) {
    overheadMonitorInstance.shutdown();
    overheadMonitorInstance = null;
  }
}
