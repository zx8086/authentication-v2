/* packages/stryker-bun-runner/src/types.ts */

/**
 * Map of source files to the test files that cover them
 * Key: Source file path (e.g., 'src/errors/error-codes.ts')
 * Value: Set of test file paths that import/cover this source file
 */
export interface CoverageMap {
  [sourceFilePath: string]: Set<string>;
}

/**
 * Result of analyzing a single test file
 */
export interface TestFileAnalysis {
  testFilePath: string;
  importedSourceFiles: string[];
  isValid: boolean;
  error?: string;
}

/**
 * Configuration for coverage analysis
 */
export interface CoverageAnalyzerOptions {
  testDirectory: string;
  sourceDirectory: string;
  testFilePattern?: RegExp;
  cacheEnabled?: boolean;
  cachePath?: string;
}

/**
 * Cached coverage analysis result
 */
export interface CoverageCache {
  version: string;
  timestamp: number;
  coverageMap: Record<string, string[]>; // Serialized version of CoverageMap
}

/**
 * Configuration for process manager
 */
export interface ProcessManagerOptions {
  bunExecutable?: string;
  testDirectory: string;
  projectRoot: string;
  reporter?: "dots" | "junit";
  timeout?: number;
  logLevel?: string;
}

/**
 * Result of test execution
 */
export interface TestResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  duration: number;
  timedOut: boolean;
  error?: string;
  mutantId?: string;
}

/**
 * Parsed test result with structured data
 */
export interface ParsedTestResult {
  status: "passed" | "failed" | "timeout" | "error" | "empty";
  passed: number;
  failed: number;
  total: number;
  duration: number;
  error?: string;
}

/**
 * Configuration for BunTestRunner
 */
export interface BunTestRunnerOptions {
  testDirectory?: string;
  sourceDirectory?: string;
  projectRoot?: string;
  bunExecutable?: string;
  timeout?: number;
  logLevel?: string;
  cacheEnabled?: boolean;
  cachePath?: string;
}
