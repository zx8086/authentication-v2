/* scripts/profiling/lib/profile-runner.ts */

import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { type Subprocess, spawn } from "bun";

export interface ProfileRunnerOptions {
  cpuProf: boolean;
  heapProf: boolean;
  outputDir: string;
  serverScript: string;
  duration: number; // seconds
}

export interface ProfileResult {
  success: boolean;
  cpuProfilePath?: string;
  heapProfilePath?: string;
  duration: number;
  error?: string;
}

export class ProfileRunner {
  private server?: Subprocess;
  private serverPid?: number;

  constructor(private options: ProfileRunnerOptions) {
    // Ensure output directory exists
    if (!existsSync(this.options.outputDir)) {
      mkdirSync(this.options.outputDir, { recursive: true });
    }
  }

  /**
   * Start server with profiling flags enabled
   */
  async startServer(): Promise<void> {
    const args: string[] = [];

    // Add profiling flags
    if (this.options.cpuProf) {
      args.push("--cpu-prof-md");
      args.push(`--cpu-prof-dir=${this.options.outputDir}`);
    }

    if (this.options.heapProf) {
      args.push("--heap-prof-md");
      args.push(`--heap-prof-dir=${this.options.outputDir}`);
    }

    // Add server script
    args.push(this.options.serverScript);

    console.log(`Starting server with profiling enabled...`);
    console.log(`Command: bun ${args.join(" ")}`);

    // Spawn server process
    this.server = spawn({
      cmd: ["bun", ...args],
      stdout: "pipe",
      stderr: "pipe",
    });

    this.serverPid = this.server.pid;
    console.log(`Server started with PID: ${this.serverPid}`);

    // Wait for server to be ready
    await this.waitForServerReady();
  }

  /**
   * Wait for server to be ready (health check)
   */
  private async waitForServerReady(maxAttempts = 30, intervalMs = 1000): Promise<void> {
    console.log("Waiting for server to be ready...");

    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await fetch("http://localhost:3000/health/ready");
        if (response.ok) {
          console.log("Server is ready!");
          return;
        }
      } catch (_error) {
        // Server not ready yet, continue waiting
      }

      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    throw new Error("Server failed to start within timeout period");
  }

  /**
   * Stop server gracefully to trigger profile generation
   */
  async stopServer(): Promise<void> {
    if (!this.server || !this.serverPid) {
      throw new Error("Server not running");
    }

    console.log(`Stopping server (PID: ${this.serverPid})...`);

    // Send SIGTERM for graceful shutdown
    this.server.kill("SIGTERM");

    // Wait for profile generation
    console.log("Waiting for profile generation...");
    await new Promise((resolve) => setTimeout(resolve, 2000));

    console.log("Server stopped successfully");
  }

  /**
   * Find generated profile files
   */
  async findProfileFiles(): Promise<{
    cpuProfile?: string;
    heapProfile?: string;
  }> {
    const { readdirSync } = await import("node:fs");

    try {
      const files = readdirSync(this.options.outputDir);

      // Find most recent profile files (Bun generates CPU.*.md and Heap.*.md)
      const cpuProfile = files
        .filter((f) => f.startsWith("CPU.") && f.endsWith(".md"))
        .sort()
        .reverse()[0];

      const heapProfile = files
        .filter((f) => f.startsWith("Heap.") && f.endsWith(".md"))
        .sort()
        .reverse()[0];

      return {
        cpuProfile: cpuProfile ? join(this.options.outputDir, cpuProfile) : undefined,
        heapProfile: heapProfile ? join(this.options.outputDir, heapProfile) : undefined,
      };
    } catch (error) {
      console.error("Error finding profile files:", error);
      return {};
    }
  }

  /**
   * Run complete profiling session
   */
  async run(): Promise<ProfileResult> {
    const startTime = Date.now();

    try {
      // Start server with profiling
      await this.startServer();

      // Wait for profiling duration
      console.log(`Profiling for ${this.options.duration} seconds (server is active)...`);
      await new Promise((resolve) => setTimeout(resolve, this.options.duration * 1000));

      // Stop server and generate profiles
      await this.stopServer();

      // Find generated profile files
      const { cpuProfile, heapProfile } = await this.findProfileFiles();

      const duration = (Date.now() - startTime) / 1000;

      return {
        success: true,
        cpuProfilePath: cpuProfile,
        heapProfilePath: heapProfile,
        duration,
      };
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      return {
        success: false,
        duration,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.server && this.serverPid) {
      try {
        this.server.kill("SIGKILL");
      } catch (_error) {
        // Ignore cleanup errors
      }
    }
  }
}
