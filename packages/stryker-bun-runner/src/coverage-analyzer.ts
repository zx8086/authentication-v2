/* packages/stryker-bun-runner/src/coverage-analyzer.ts */

import * as fs from "node:fs";
import * as path from "node:path";
import type { CoverageMap, CoverageAnalyzerOptions, TestFileAnalysis } from "./types";

/**
 * Analyzes test files to build a static coverage map
 * Maps source files to the test files that import/cover them
 */
export class CoverageAnalyzer {
  private options: Required<CoverageAnalyzerOptions>;
  private coverageMap: CoverageMap = {};

  constructor(options: CoverageAnalyzerOptions) {
    this.options = {
      testDirectory: options.testDirectory,
      sourceDirectory: options.sourceDirectory,
      testFilePattern: options.testFilePattern ?? /\.test\.ts$/,
      cacheEnabled: options.cacheEnabled ?? true,
      cachePath: options.cachePath ?? ".stryker-coverage-cache.json",
    };
  }

  /**
   * Analyze all test files and build coverage map
   */
  async analyze(): Promise<CoverageMap> {
    // Try to load from cache first
    if (this.options.cacheEnabled) {
      const cached = this.loadCache();
      if (cached) {
        console.log(`[CoverageAnalyzer] Loaded coverage map from cache (${Object.keys(cached).length} source files)`);
        this.coverageMap = cached;
        return this.coverageMap;
      }
    }

    console.log(`[CoverageAnalyzer] Scanning test directory: ${this.options.testDirectory}`);

    // 1. Find all test files
    const testFiles = this.findTestFiles(this.options.testDirectory);
    console.log(`[CoverageAnalyzer] Found ${testFiles.length} test files`);

    // 2. Analyze each test file
    for (const testFile of testFiles) {
      const analysis = this.analyzeTestFile(testFile);
      if (analysis.isValid) {
        this.addToCoverageMap(analysis);
      }
    }

    console.log(`[CoverageAnalyzer] Coverage map built: ${Object.keys(this.coverageMap).length} source files`);

    // Save to cache
    if (this.options.cacheEnabled) {
      this.saveCache();
    }

    return this.coverageMap;
  }

  /**
   * Get test files that cover a specific source file
   */
  getTestsForSourceFile(sourceFile: string): string[] {
    const normalizedPath = this.normalizePath(sourceFile);
    return Array.from(this.coverageMap[normalizedPath] ?? []);
  }

  /**
   * Recursively find all test files in directory
   */
  private findTestFiles(dir: string): string[] {
    const testFiles: string[] = [];

    const traverse = (currentDir: string) => {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);

        if (entry.isDirectory()) {
          // Skip node_modules, dist, etc.
          if (!["node_modules", "dist", ".git"].includes(entry.name)) {
            traverse(fullPath);
          }
        } else if (entry.isFile() && this.options.testFilePattern.test(entry.name)) {
          testFiles.push(fullPath);
        }
      }
    };

    traverse(dir);
    return testFiles;
  }

  /**
   * Analyze a single test file to extract imported source files
   */
  private analyzeTestFile(testFilePath: string): TestFileAnalysis {
    try {
      const content = fs.readFileSync(testFilePath, "utf-8");
      const imports = this.extractImports(content);
      const sourceFiles = this.resolveImportsToSourceFiles(testFilePath, imports);

      return {
        testFilePath,
        importedSourceFiles: sourceFiles,
        isValid: true,
      };
    } catch (error) {
      return {
        testFilePath,
        importedSourceFiles: [],
        isValid: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Extract import statements from file content using regex
   * Simple approach: matches both ES6 imports and dynamic imports
   */
  private extractImports(content: string): string[] {
    const imports: string[] = [];

    // Match: import { ... } from "path" or import ... from 'path'
    const importRegex = /import\s+(?:[\w\s{},*]+\s+from\s+)?['"]([^'"]+)['"]/g;
    let match: RegExpExecArray | null;

    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }

    // Match: require("path") or require('path')
    const requireRegex = /require\(['"]([^'"]+)['"]\)/g;
    while ((match = requireRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }

    return imports;
  }

  /**
   * Resolve import paths to actual source file paths
   */
  private resolveImportsToSourceFiles(testFilePath: string, imports: string[]): string[] {
    const sourceFiles: string[] = [];
    const testDir = path.dirname(testFilePath);

    for (const importPath of imports) {
      // Skip node_modules and bun: imports
      if (importPath.startsWith("bun:") || !importPath.startsWith(".") && !importPath.startsWith("/")) {
        continue;
      }

      try {
        // Resolve relative path
        let resolvedPath = path.resolve(testDir, importPath);

        // Add .ts extension if missing
        if (!resolvedPath.endsWith(".ts") && !resolvedPath.endsWith(".js")) {
          resolvedPath += ".ts";
        }

        // Check if file exists
        if (fs.existsSync(resolvedPath)) {
          // Only include if it's in the source directory
          if (resolvedPath.includes(this.options.sourceDirectory)) {
            sourceFiles.push(this.normalizePath(resolvedPath));
          }
        }
      } catch (error) {
        // Silently skip unresolvable imports
        continue;
      }
    }

    return sourceFiles;
  }

  /**
   * Add test file analysis results to coverage map
   */
  private addToCoverageMap(analysis: TestFileAnalysis): void {
    for (const sourceFile of analysis.importedSourceFiles) {
      if (!this.coverageMap[sourceFile]) {
        this.coverageMap[sourceFile] = new Set();
      }
      this.coverageMap[sourceFile].add(analysis.testFilePath);
    }
  }

  /**
   * Normalize file path for consistent comparisons
   */
  private normalizePath(filePath: string): string {
    return path.normalize(filePath).replace(/\\/g, "/");
  }

  /**
   * Get coverage statistics
   */
  getStats() {
    const sourceFileCount = Object.keys(this.coverageMap).length;
    const testFileSet = new Set<string>();

    for (const testFiles of Object.values(this.coverageMap)) {
      for (const testFile of testFiles) {
        testFileSet.add(testFile);
      }
    }

    return {
      sourceFilesCovered: sourceFileCount,
      totalTestFiles: testFileSet.size,
      averageTestsPerSource: sourceFileCount > 0 ? testFileSet.size / sourceFileCount : 0,
    };
  }

  /**
   * Load coverage map from cache file
   */
  private loadCache(): CoverageMap | null {
    try {
      if (!fs.existsSync(this.options.cachePath)) {
        return null;
      }

      const content = fs.readFileSync(this.options.cachePath, "utf-8");
      const cache: import("./types").CoverageCache = JSON.parse(content);

      // Convert serialized format back to CoverageMap
      const coverageMap: CoverageMap = {};
      for (const [sourceFile, testFiles] of Object.entries(cache.coverageMap)) {
        coverageMap[sourceFile] = new Set(testFiles);
      }

      console.log(`[CoverageAnalyzer] Cache loaded from ${this.options.cachePath} (version: ${cache.version})`);
      return coverageMap;
    } catch (error) {
      console.warn(`[CoverageAnalyzer] Failed to load cache: ${error}`);
      return null;
    }
  }

  /**
   * Save coverage map to cache file
   */
  private saveCache(): void {
    try {
      // Convert CoverageMap to serializable format
      const serialized: Record<string, string[]> = {};
      for (const [sourceFile, testFiles] of Object.entries(this.coverageMap)) {
        serialized[sourceFile] = Array.from(testFiles);
      }

      const cache: import("./types").CoverageCache = {
        version: "1.0.0",
        timestamp: Date.now(),
        coverageMap: serialized,
      };

      fs.writeFileSync(this.options.cachePath, JSON.stringify(cache, null, 2), "utf-8");
      console.log(`[CoverageAnalyzer] Cache saved to ${this.options.cachePath}`);
    } catch (error) {
      console.warn(`[CoverageAnalyzer] Failed to save cache: ${error}`);
    }
  }
}
