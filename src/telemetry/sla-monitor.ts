/* src/telemetry/sla-monitor.ts */

import { existsSync, mkdirSync } from "node:fs";
import type { Subprocess } from "bun";
import { loadConfig } from "../config/index";
import type { ContinuousProfilingConfig, SlaThreshold } from "../config/schemas";
import { error, log, warn } from "../utils/logger";

interface PercentileMetrics {
  p95: number;
  p99: number;
  count: number;
}

interface ProfilingSession {
  endpoint: string;
  startedAt: number;
  subprocess: Subprocess;
  violationMetrics: PercentileMetrics;
}

export class SlaMonitor {
  private readonly config: ContinuousProfilingConfig;
  private readonly thresholds: Map<string, SlaThreshold>;
  private readonly latencyBuffers: Map<string, number[]>;
  private readonly lastProfilingTrigger: Map<string, number>;
  private activeProfiling: ProfilingSession | null = null;
  private isShuttingDown = false;

  constructor(config: ContinuousProfilingConfig) {
    this.config = config;
    this.thresholds = new Map();
    this.latencyBuffers = new Map();
    this.lastProfilingTrigger = new Map();

    for (const threshold of config.slaThresholds) {
      this.thresholds.set(threshold.endpoint, threshold);
      this.latencyBuffers.set(threshold.endpoint, []);
    }

    this.ensureOutputDirectory();

    if (config.enabled) {
      log("SLA Monitor initialized", {
        component: "sla-monitor",
        enabled: config.enabled,
        autoTrigger: config.autoTriggerOnSlaViolation,
        throttleMinutes: config.slaViolationThrottleMinutes,
        outputDir: config.outputDir,
        endpoints: config.slaThresholds.map((t) => t.endpoint),
      });
    }
  }

  private ensureOutputDirectory(): void {
    if (!existsSync(this.config.outputDir)) {
      mkdirSync(this.config.outputDir, { recursive: true });
      log("Created profiling output directory", {
        component: "sla-monitor",
        directory: this.config.outputDir,
      });
    }
  }

  async recordLatency(endpoint: string, latencyMs: number): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    const threshold = this.thresholds.get(endpoint);
    if (!threshold) {
      return;
    }

    const buffer = this.latencyBuffers.get(endpoint);
    if (!buffer) {
      return;
    }

    buffer.push(latencyMs);

    if (buffer.length > this.config.rollingBufferSize) {
      buffer.shift();
    }

    if (buffer.length >= Math.min(10, this.config.rollingBufferSize)) {
      await this.checkSlaViolation(endpoint, buffer, threshold);
    }
  }

  private async checkSlaViolation(
    endpoint: string,
    buffer: number[],
    threshold: SlaThreshold
  ): Promise<void> {
    const metrics = this.calculatePercentiles(buffer);

    const isViolation = metrics.p95 > threshold.p95 || metrics.p99 > threshold.p99;

    if (isViolation && this.config.autoTriggerOnSlaViolation) {
      const canTrigger = this.canTriggerProfiling(endpoint);

      if (canTrigger) {
        await this.triggerAutomaticProfiling(endpoint, metrics, threshold);
      } else {
        const lastTrigger = this.lastProfilingTrigger.get(endpoint);
        const minutesSinceLastTrigger = lastTrigger
          ? (Date.now() - lastTrigger) / 1000 / 60
          : Number.POSITIVE_INFINITY;

        warn("SLA violation detected but profiling throttled", {
          component: "sla-monitor",
          endpoint,
          currentP95: metrics.p95.toFixed(2),
          currentP99: metrics.p99.toFixed(2),
          thresholdP95: threshold.p95,
          thresholdP99: threshold.p99,
          minutesSinceLastTrigger: minutesSinceLastTrigger.toFixed(1),
          throttleMinutes: this.config.slaViolationThrottleMinutes,
          sampleSize: metrics.count,
        });
      }
    }
  }

  private calculatePercentiles(values: number[]): PercentileMetrics {
    const sorted = [...values].sort((a, b) => a - b);
    const count = sorted.length;

    const p95Index = Math.ceil(count * 0.95) - 1;
    const p99Index = Math.ceil(count * 0.99) - 1;

    return {
      p95: sorted[p95Index] || 0,
      p99: sorted[p99Index] || 0,
      count,
    };
  }

  private canTriggerProfiling(endpoint: string): boolean {
    if (this.isShuttingDown) {
      return false;
    }

    if (this.activeProfiling !== null) {
      return false;
    }

    const lastTrigger = this.lastProfilingTrigger.get(endpoint);
    if (!lastTrigger) {
      return true;
    }

    const minutesSinceLastTrigger = (Date.now() - lastTrigger) / 1000 / 60;
    return minutesSinceLastTrigger >= this.config.slaViolationThrottleMinutes;
  }

  private async triggerAutomaticProfiling(
    endpoint: string,
    metrics: PercentileMetrics,
    threshold: SlaThreshold
  ): Promise<void> {
    try {
      const timestamp = Date.now();
      const formattedEndpoint = endpoint.replace(/\//g, "_").replace(/^_/, "");

      log("Automatic profiling triggered by SLA violation", {
        component: "sla-monitor",
        endpoint,
        currentP95: metrics.p95.toFixed(2),
        currentP99: metrics.p99.toFixed(2),
        thresholdP95: threshold.p95,
        thresholdP99: threshold.p99,
        sampleSize: metrics.count,
        outputDir: this.config.outputDir,
      });

      const subprocess = Bun.spawn(
        [
          "bun",
          "--cpu-prof-md",
          `--cpu-prof-dir=${this.config.outputDir}`,
          "--heap-prof-md",
          `--heap-prof-dir=${this.config.outputDir}`,
          "src/server.ts",
        ],
        {
          stdout: "pipe",
          stderr: "pipe",
          env: {
            ...process.env,
            AUTO_PROFILING_TRIGGER: "true",
            AUTO_PROFILING_ENDPOINT: endpoint,
            AUTO_PROFILING_TIMESTAMP: timestamp.toString(),
          },
        }
      );

      this.activeProfiling = {
        endpoint,
        startedAt: timestamp,
        subprocess,
        violationMetrics: metrics,
      };

      this.lastProfilingTrigger.set(endpoint, timestamp);

      setTimeout(() => {
        this.stopAutomaticProfiling();
      }, 30000);
    } catch (err) {
      error("Failed to trigger automatic profiling", {
        component: "sla-monitor",
        endpoint,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  private async stopAutomaticProfiling(): Promise<void> {
    if (!this.activeProfiling) {
      return;
    }

    const session = this.activeProfiling;
    this.activeProfiling = null;

    try {
      session.subprocess.kill("SIGTERM");

      const durationSeconds = (Date.now() - session.startedAt) / 1000;

      log("Automatic profiling session completed", {
        component: "sla-monitor",
        endpoint: session.endpoint,
        durationSeconds: durationSeconds.toFixed(1),
        violationP95: session.violationMetrics.p95.toFixed(2),
        violationP99: session.violationMetrics.p99.toFixed(2),
        outputDir: this.config.outputDir,
      });
    } catch (err) {
      error("Failed to stop automatic profiling", {
        component: "sla-monitor",
        endpoint: session.endpoint,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  getStats(): {
    enabled: boolean;
    activeEndpoints: string[];
    bufferSizes: Record<string, number>;
    lastTriggers: Record<string, string>;
    activeSession: { endpoint: string; durationSeconds: number } | null;
  } {
    const bufferSizes: Record<string, number> = {};
    for (const [endpoint, buffer] of this.latencyBuffers.entries()) {
      bufferSizes[endpoint] = buffer.length;
    }

    const lastTriggers: Record<string, string> = {};
    for (const [endpoint, timestamp] of this.lastProfilingTrigger.entries()) {
      lastTriggers[endpoint] = new Date(timestamp).toISOString();
    }

    const activeSession = this.activeProfiling
      ? {
          endpoint: this.activeProfiling.endpoint,
          durationSeconds: (Date.now() - this.activeProfiling.startedAt) / 1000,
        }
      : null;

    return {
      enabled: this.config.enabled,
      activeEndpoints: Array.from(this.thresholds.keys()),
      bufferSizes,
      lastTriggers,
      activeSession,
    };
  }

  async shutdown(): Promise<void> {
    this.isShuttingDown = true;

    log("SLA Monitor shutting down", {
      component: "sla-monitor",
      hasActiveSession: this.activeProfiling !== null,
    });

    if (this.activeProfiling) {
      await this.stopAutomaticProfiling();
    }

    this.latencyBuffers.clear();
    this.latencyBuffers.clear();
    this.lastProfilingTrigger.clear();
  }
}

let slaMonitorInstance: SlaMonitor | null = null;

export function getSlaMonitor(): SlaMonitor {
  if (!slaMonitorInstance) {
    const config = loadConfig();
    slaMonitorInstance = new SlaMonitor(config.continuousProfiling);
  }
  return slaMonitorInstance;
}

export function resetSlaMonitor(): void {
  if (slaMonitorInstance) {
    slaMonitorInstance.shutdown();
    slaMonitorInstance = null;
  }
}
