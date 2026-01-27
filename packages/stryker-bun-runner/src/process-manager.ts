/* packages/stryker-bun-runner/src/process-manager.ts */

import { spawn } from "node:child_process";
import type { TestResult, ProcessManagerOptions } from "./types";

/**
 * Manages Bun test process execution
 * Spawns Bun CLI as child process and captures output
 */
export class BunProcessManager {
  private options: Required<ProcessManagerOptions>;

  constructor(options: ProcessManagerOptions) {
    this.options = {
      bunExecutable: options.bunExecutable ?? "bun",
      testDirectory: options.testDirectory,
      projectRoot: options.projectRoot,
      reporter: options.reporter ?? "dots",
      timeout: options.timeout ?? 60000, // 60 seconds default
      logLevel: options.logLevel ?? "silent",
    };
  }

  /**
   * Run tests without mutant activation (dry run)
   */
  async runTests(testFiles?: string[]): Promise<TestResult> {
    return this.executeTests({
      testFiles,
      activeMutant: undefined,
    });
  }

  /**
   * Run tests with specific mutant activated
   */
  async runWithMutant(mutantId: string, testFiles?: string[]): Promise<TestResult> {
    return this.executeTests({
      testFiles,
      activeMutant: mutantId,
    });
  }

  /**
   * Execute Bun test command
   */
  private async executeTests(params: {
    testFiles?: string[];
    activeMutant?: string;
  }): Promise<TestResult> {
    const { testFiles, activeMutant } = params;

    // Build command arguments
    const args = ["test", `--reporter=${this.options.reporter}`];

    // Add test files or default to test directory
    if (testFiles && testFiles.length > 0) {
      args.push(...testFiles);
    } else {
      args.push(this.options.testDirectory);
    }

    // Build environment variables
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      LOG_LEVEL: this.options.logLevel,
      TELEMETRY_MODE: "console",
    };

    // Set mutant activation if provided
    if (activeMutant) {
      env.__STRYKER_ACTIVE_MUTANT__ = activeMutant;
      env.__STRYKER_MUTANT_COVERAGE__ = "true";
    }

    // Spawn Bun process
    const startTime = Date.now();
    const result = await this.spawnProcess(this.options.bunExecutable, args, env);
    const duration = Date.now() - startTime;

    return {
      ...result,
      duration,
      mutantId: activeMutant,
    };
  }

  /**
   * Spawn child process and capture output
   */
  private async spawnProcess(
    command: string,
    args: string[],
    env: NodeJS.ProcessEnv,
  ): Promise<Omit<TestResult, "duration" | "mutantId">> {
    return new Promise((resolve) => {
      let stdout = "";
      let stderr = "";
      let timedOut = false;

      const child = spawn(command, args, {
        env,
        stdio: ["ignore", "pipe", "pipe"],
        cwd: this.options.projectRoot,
      });

      // Set timeout
      const timeoutHandle = setTimeout(() => {
        timedOut = true;
        child.kill("SIGTERM");

        // Force kill after 1 second if still alive
        setTimeout(() => {
          if (!child.killed) {
            child.kill("SIGKILL");
          }
        }, 1000);
      }, this.options.timeout);

      // Capture stdout
      child.stdout?.on("data", (data) => {
        stdout += data.toString();
      });

      // Capture stderr
      child.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      // Handle process exit
      child.on("close", (code) => {
        clearTimeout(timeoutHandle);

        if (timedOut) {
          resolve({
            exitCode: -1,
            stdout,
            stderr,
            timedOut: true,
            error: `Test execution timed out after ${this.options.timeout}ms`,
          });
        } else if (code === null) {
          resolve({
            exitCode: -1,
            stdout,
            stderr,
            timedOut: false,
            error: "Process terminated by signal",
          });
        } else {
          resolve({
            exitCode: code,
            stdout,
            stderr,
            timedOut: false,
            error: code !== 0 ? stderr || "Tests failed" : undefined,
          });
        }
      });

      // Handle process error
      child.on("error", (err) => {
        clearTimeout(timeoutHandle);
        resolve({
          exitCode: -1,
          stdout,
          stderr,
          timedOut: false,
          error: `Failed to spawn process: ${err.message}`,
        });
      });
    });
  }
}
