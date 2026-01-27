/* packages/stryker-bun-runner/src/bun-test-runner.ts */

import * as fs from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";
import { CoverageAnalyzer } from "./coverage-analyzer";
import { BunProcessManager } from "./process-manager";
import { BunOutputParser } from "./output-parser";
import type { BunTestRunnerOptions } from "./types";
import type { CoverageMap } from "./types";

// Debug logging to file
function debugLog(message: string) {
  try {
    fs.appendFileSync("/tmp/bun-test-runner-debug.log", `[${new Date().toISOString()}] ${message}\n`);
  } catch {}
}

// Resolve bun executable to full path
function resolveBunExecutable(bunExecutable: string): string {
  debugLog(`Starting resolution for bunExecutable: ${bunExecutable}`);

  // If already an absolute path, check if it's valid
  if (path.isAbsolute(bunExecutable)) {
    // Resolve symlinks to check actual target
    try {
      const realPath = fs.realpathSync(bunExecutable);
      debugLog(`Resolved symlink to: ${realPath}`);
      // If it's a .exe file (Windows binary), try to find system bun instead
      if (realPath.endsWith('.exe')) {
        debugLog(`Detected .exe file (${realPath}), searching for system bun...`);
        // Don't return, fall through to alternative resolution
      } else if (fs.existsSync(realPath)) {
        debugLog(`Using absolute path: ${realPath}`);
        return realPath;
      }
    } catch (error) {
      debugLog(`Failed to resolve symlink for ${bunExecutable}: ${error}`);
    }
  }

  // Try common bun installation locations
  const commonLocations = [
    path.join(process.env.HOME || "~", ".bun/bin/bun"),
    "/usr/local/bin/bun",
    "/opt/homebrew/bin/bun",
  ];

  for (const location of commonLocations) {
    if (fs.existsSync(location)) {
      try {
        const realPath = fs.realpathSync(location);
        if (!realPath.endsWith('.exe')) {
          debugLog(`Found bun at common location: ${realPath}`);
          return realPath;
        }
      } catch (error) {
        debugLog(`Error checking ${location}: ${error}`);
      }
    }
  }

  // Try to resolve using 'which' (system PATH)
  try {
    const result = execSync(`which ${bunExecutable}`, { encoding: "utf-8" });
    const resolved = result.trim();
    debugLog(`'which' returned: ${resolved}`);
    if (resolved && fs.existsSync(resolved)) {
      const realPath = fs.realpathSync(resolved);
      if (!realPath.endsWith('.exe')) {
        debugLog(`Resolved bun executable via 'which': ${realPath}`);
        return realPath;
      }
    }
  } catch (error) {
    debugLog(`Failed to resolve bun with 'which': ${error}`);
  }

  // Fallback to the original value
  debugLog(`Falling back to original value: ${bunExecutable}`);
  return bunExecutable;
}

/**
 * Bun test runner for Stryker mutation testing
 * Implements the TestRunner interface from @stryker-mutator/api
 */
export class BunTestRunner {
  public static inject: string[] = [];

  private options: Required<BunTestRunnerOptions>;
  private coverageAnalyzer!: CoverageAnalyzer;
  private processManager!: BunProcessManager;
  private outputParser!: BunOutputParser;
  private coverageMap!: CoverageMap;
  private initialized = false;

  constructor(options?: BunTestRunnerOptions) {
    debugLog("BunTestRunner constructor called");
    debugLog(`Options: ${JSON.stringify(options)}`);
    debugLog(`Working directory: ${process.cwd()}`);

    // Find project root by detecting if we're in a Stryker sandbox
    let projectRoot = process.cwd();

    // If we're in a Stryker sandbox (.stryker-tmp), go up to the actual project root
    if (projectRoot.includes('.stryker-tmp')) {
      // Extract the actual project root path (everything before .stryker-tmp)
      const strykerTmpIndex = projectRoot.indexOf('.stryker-tmp');
      projectRoot = projectRoot.substring(0, strykerTmpIndex - 1); // -1 to remove trailing slash
    } else {
      // Normal case: look for package.json
      let currentDir = projectRoot;
      while (currentDir !== path.dirname(currentDir)) {
        if (fs.existsSync(path.join(currentDir, "package.json"))) {
          projectRoot = currentDir;
          break;
        }
        currentDir = path.dirname(currentDir);
      }
    }

    debugLog(`Project root: ${projectRoot}`);

    // Resolve paths relative to project root
    const testDir = options?.testDirectory ?? "./test/bun";
    const sourceDir = options?.sourceDirectory ?? "./src";

    const bunExecutable = resolveBunExecutable(options?.bunExecutable ?? "bun");

    this.options = {
      testDirectory: path.resolve(projectRoot, testDir),
      sourceDirectory: path.resolve(projectRoot, sourceDir),
      projectRoot,
      bunExecutable,
      timeout: options?.timeout ?? 60000,
      logLevel: options?.logLevel ?? "silent",
      cacheEnabled: options?.cacheEnabled ?? true,
      cachePath: path.resolve(projectRoot, options?.cachePath ?? ".stryker-coverage-cache.json"),
    };
    debugLog(`Resolved options: ${JSON.stringify(this.options)}`);
  }

  /**
   * Initialize the test runner
   * Called once by Stryker before any tests are run
   */
  async init(): Promise<void> {
    debugLog("init() called");
    if (this.initialized) {
      debugLog("Already initialized, skipping");
      return;
    }

    try {
      debugLog("Initializing...");

      // Initialize components
      debugLog("Creating CoverageAnalyzer");
      this.coverageAnalyzer = new CoverageAnalyzer({
        testDirectory: this.options.testDirectory,
        sourceDirectory: this.options.sourceDirectory,
        cacheEnabled: this.options.cacheEnabled,
        cachePath: this.options.cachePath,
      });

      debugLog("Creating BunProcessManager");
      this.processManager = new BunProcessManager({
        bunExecutable: this.options.bunExecutable,
        testDirectory: this.options.testDirectory,
        projectRoot: this.options.projectRoot,
        timeout: this.options.timeout,
        logLevel: this.options.logLevel,
      });

      debugLog("Creating BunOutputParser");
      this.outputParser = new BunOutputParser();

      // Build coverage map
      debugLog("Building coverage map...");
      this.coverageMap = await this.coverageAnalyzer.analyze();

      const stats = this.coverageAnalyzer.getStats();
      debugLog(
        `Coverage map ready: ${stats.sourceFilesCovered} source files, ${stats.totalTestFiles} test files`,
      );

      this.initialized = true;
      debugLog("Initialization complete");
    } catch (error) {
      debugLog(`init() error: ${error}`);
      throw error;
    }
  }

  /**
   * Run all tests to establish baseline
   * Called once by Stryker at the start of mutation testing
   */
  async dryRun(): Promise<DryRunResult> {
    debugLog("dryRun() called");
    try {
      await this.ensureInitialized();
      debugLog("Initialized successfully");

      debugLog("Running dry run (baseline tests)...");

      const result = await this.processManager.runTests();
      debugLog(`Process result - exitCode: ${result.exitCode}, stdout length: ${result.stdout.length}, stderr length: ${result.stderr.length}`);
      debugLog(`stdout: ${result.stdout.substring(0, 500)}`);
      if (result.stderr) {
        debugLog(`stderr: ${result.stderr.substring(0, 500)}`);
      }

      const parsed = this.outputParser.parse(result);
      debugLog(
        `Dry run complete: ${parsed.passed} passed, ${parsed.failed} failed, total: ${parsed.total} (${parsed.duration}ms)`,
      );
      debugLog(`Parsed status: ${parsed.status}`);

      // With coverageAnalysis: "off", return a single test representing all tests
      // Stryker will call mutantRun() for this test with each mutant
      const TEST_ID = "all-bun-tests";
      const tests: TestResult[] = [];
      if (parsed.total > 0 || parsed.status === "passed") {
        tests.push({
          id: TEST_ID,
          name: "All Bun Tests",
          status: parsed.failed === 0 ? TestStatus.Success : TestStatus.Failed,
          timeSpentMs: parsed.duration,
        });
        debugLog(`Created 1 synthetic test for ${parsed.total} actual tests`);
      } else {
        debugLog("No tests detected - returning empty array");
      }

      debugLog(`Returning ${tests.length} test result(s), coverage map has ${Object.keys(this.coverageMap).length} entries`);

      // With coverageAnalysis: "off", Stryker should run all tests for all mutants
      // without needing mutantCoverage
      const dryRunResult = {
        status: (parsed.status === "passed" || parsed.status === "empty" ? "complete" : "error") as "complete" | "error",
        tests,
      };

      debugLog(`dryRun() returning with status: ${dryRunResult.status}`);
      return dryRunResult;
    } catch (error) {
      debugLog(`dryRun() error: ${error}`);
      throw error;
    }
  }

  /**
   * Run tests for a specific mutant
   * Called by Stryker for each mutant that needs to be tested
   */
  async mutantRun(mutantId: string, mutatedFile: string): Promise<MutantRunResult> {
    // Add more visible logging
    debugLog(`mutantRun() called - mutantId: ${mutantId}, file: ${mutatedFile}`);
    console.error(`\n>>> MUTANT RUN CALLED: ${mutantId} in ${mutatedFile} <<<\n`);
    console.log(`[BunTestRunner] mutantRun called for mutant ${mutantId}, file: ${mutatedFile}`);
    await this.ensureInitialized();

    // Determine which tests cover this mutant
    const testFiles = this.coverageAnalyzer.getTestsForSourceFile(mutatedFile);
    console.log(`[BunTestRunner] Found ${testFiles.length} test file(s) for ${mutatedFile}`);

    if (testFiles.length === 0) {
      console.log(`[BunTestRunner] Mutant ${mutantId}: No tests found for ${mutatedFile}`);
      return {
        status: "noCoverage",
        reason: `No tests cover ${mutatedFile}`,
      };
    }

    console.log(
      `[BunTestRunner] Mutant ${mutantId}: Running ${testFiles.length} test(s)`,
    );

    // Run tests with mutant activated
    const result = await this.processManager.runWithMutant(mutantId, testFiles);
    const parsed = this.outputParser.parse(result);

    // Determine mutant status
    if (parsed.status === "timeout") {
      return {
        status: "timeout",
      };
    }

    if (parsed.status === "error") {
      return {
        status: "error",
        errorMessage: parsed.error || "Unknown error",
      };
    }

    if (parsed.status === "failed" || parsed.failed > 0) {
      // Tests failed - mutant was killed
      return {
        status: "killed",
        killedBy: testFiles,
        nrOfTests: parsed.total,
      };
    }

    // Tests passed - mutant survived
    return {
      status: "survived",
      nrOfTests: parsed.total,
    };
  }

  /**
   * Cleanup resources
   * Called by Stryker when done with this test runner
   */
  async dispose(): Promise<void> {
    console.log("[BunTestRunner] Disposing...");
    this.initialized = false;
  }

  /**
   * Report test runner capabilities to Stryker
   */
  capabilities(): TestRunnerCapabilities {
    return {
      reloadEnvironment: false, // Bun doesn't support environment reloading
    };
  }

  /**
   * Ensure the runner is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.init();
    }
  }

  // Note: buildMutantCoverage removed - static analysis cannot provide per-mutant coverage
  // Stryker will run all tests for each mutant (comprehensive but slower)
}

/**
 * Stryker TestRunner interface types
 * These match the @stryker-mutator/api/test-runner interface
 */
interface DryRunResult {
  status: "complete" | "error" | "timeout";
  tests: TestResult[];
  mutantCoverage?: MutantCoverage;
}

interface MutantRunResult {
  status: "killed" | "survived" | "timeout" | "error" | "noCoverage";
  killedBy?: string[];
  nrOfTests?: number;
  errorMessage?: string;
  reason?: string;
}

interface TestRunnerCapabilities {
  reloadEnvironment: boolean;
}

interface MutantCoverage {
  static: Record<string, number>;
  perTest: Record<string, Record<string, number>>;
}

enum TestStatus {
  Success = 0,
  Failed = 1,
  Skipped = 2,
}

interface TestResult {
  id: string;
  name: string;
  status: TestStatus;
  timeSpentMs: number;
  failureMessage?: string;
}
