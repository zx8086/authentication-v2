/* packages/stryker-bun-runner/src/output-parser.ts */

import type { TestResult, ParsedTestResult } from "./types";

/**
 * Parses Bun test output to extract test results
 * Supports dots reporter and summary parsing
 */
export class BunOutputParser {
  /**
   * Parse test execution result
   */
  parse(result: TestResult): ParsedTestResult {
    const { exitCode, stdout, stderr, duration, timedOut, error } = result;

    // Handle timeout
    if (timedOut) {
      return {
        status: "timeout",
        passed: 0,
        failed: 0,
        total: 0,
        duration,
        error: error || "Test execution timed out",
      };
    }

    // Handle process error
    if (exitCode === -1) {
      return {
        status: "error",
        passed: 0,
        failed: 0,
        total: 0,
        duration,
        error: error || stderr || "Unknown error",
      };
    }

    // Parse test results from output
    // Bun writes test output to both stdout and stderr, so check both
    const combinedOutput = stdout + "\n" + stderr;
    const summary = this.parseSummary(combinedOutput);

    // Determine status
    let status: ParsedTestResult["status"];
    if (summary.failed > 0 || exitCode !== 0) {
      status = "failed";
    } else if (summary.passed === 0 && summary.total === 0) {
      status = "empty";
    } else {
      status = "passed";
    }

    return {
      status,
      passed: summary.passed,
      failed: summary.failed,
      total: summary.total,
      duration,
      error: status === "failed" ? this.extractErrorMessage(stdout, stderr) : undefined,
    };
  }

  /**
   * Parse test summary from output
   * Looks for patterns like: "1523 pass" or "0 fail"
   */
  private parseSummary(output: string): { passed: number; failed: number; total: number } {
    let passed = 0;
    let failed = 0;

    // Match: "X pass" or "X passed"
    const passMatch = output.match(/(\d+)\s+pass(?:ed)?/i);
    if (passMatch) {
      passed = Number.parseInt(passMatch[1], 10);
    }

    // Match: "X fail" or "X failed"
    const failMatch = output.match(/(\d+)\s+fail(?:ed)?/i);
    if (failMatch) {
      failed = Number.parseInt(failMatch[1], 10);
    }

    // If no summary found, try to parse dots
    if (passed === 0 && failed === 0) {
      const dots = this.parseDots(output);
      passed = dots.passed;
      failed = dots.failed;
    }

    return {
      passed,
      failed,
      total: passed + failed,
    };
  }

  /**
   * Parse dots reporter output
   * Format: "..F...." where . = pass, F = fail
   */
  private parseDots(output: string): { passed: number; failed: number } {
    let passed = 0;
    let failed = 0;

    // Find lines with dots
    const lines = output.split("\n");
    for (const line of lines) {
      // Match dots pattern (lines with . or F characters)
      if (/^[.F\s]+$/.test(line)) {
        for (const char of line) {
          if (char === ".") {
            passed++;
          } else if (char === "F") {
            failed++;
          }
        }
      }
    }

    return { passed, failed };
  }

  /**
   * Extract error message from output
   */
  private extractErrorMessage(stdout: string, stderr: string): string {
    // First try stderr
    if (stderr.trim()) {
      return this.cleanErrorMessage(stderr);
    }

    // Then try to find error in stdout
    const lines = stdout.split("\n");
    const errorLines: string[] = [];
    let inError = false;

    for (const line of lines) {
      // Start of error (e.g., "error: ..." or "FAIL ...")
      if (line.match(/^(error|FAIL|✗)/i)) {
        inError = true;
        errorLines.push(line);
      } else if (inError) {
        // Continue collecting error lines
        if (line.trim() === "" || line.match(/^\d+\s+(pass|fail)/)) {
          // End of error section
          break;
        }
        errorLines.push(line);
      }
    }

    if (errorLines.length > 0) {
      return this.cleanErrorMessage(errorLines.join("\n"));
    }

    return "Tests failed";
  }

  /**
   * Clean error message (remove ANSI codes, trim)
   */
  private cleanErrorMessage(message: string): string {
    // Remove ANSI color codes
    // biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI codes use control characters
    const cleaned = message.replace(/\x1B\[[0-9;]*[JKmsu]/g, "");

    // Trim and limit length
    const trimmed = cleaned.trim();
    if (trimmed.length > 500) {
      return `${trimmed.substring(0, 500)}...`;
    }
    return trimmed;
  }
}
