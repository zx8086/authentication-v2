/* scripts/profiling/lib/markdown-parser.ts */

import { readFileSync } from "node:fs";

export interface CPUFunction {
  name: string;
  selfTime: number; // seconds
  totalTime: number; // seconds
  samples: number;
  cpuPercent: number;
}

export interface HeapStats {
  used: number; // bytes
  allocated: number; // bytes
  peak: number; // bytes
  growth: number; // bytes (growth during profile period)
}

export interface ProfileMetrics {
  type: "cpu" | "heap";
  duration: number; // seconds
  topFunctions: CPUFunction[];
  heapUsage?: HeapStats;
  timestamp: Date;
  profilePath: string;
}

export class MarkdownProfileParser {
  /**
   * Parse CPU profile markdown
   */
  parseCPUProfile(filePath: string): ProfileMetrics {
    const content = readFileSync(filePath, "utf-8");
    const lines = content.split("\n");

    const topFunctions: CPUFunction[] = [];
    let duration = 0;

    // Parse markdown table format from Bun
    // Bun's "Hot Functions (Self Time)" section format:
    // | Self% | Self | Total% | Total | Function | Location |
    // |------:|-----:|-------:|------:|----------|----------|
    // | 70.4% | 336.6ms | 100.0% | 1.81s | `anonymous` | `[native code]` |

    let inHotFunctionsTable = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Detect "Hot Functions (Self Time)" section
      if (line === "## Hot Functions (Self Time)") {
        inHotFunctionsTable = true;
        // Skip to table header
        i++;
        continue;
      }

      // Stop at next section (Call Tree or any other ##)
      if (inHotFunctionsTable && line.startsWith("##")) {
        break;
      }

      // Parse table rows (skip header and separator)
      if (inHotFunctionsTable && line.startsWith("|") && line.match(/^\|\s*\d+/)) {
        const parts = line
          .split("|")
          .map((p) => p.trim())
          .filter((p) => p);

        if (parts.length >= 5) {
          const cpuPercent = this.parsePercent(parts[0]); // Self%
          const selfTime = this.parseTime(parts[1]); // Self
          const totalTime = this.parseTime(parts[3]); // Total
          const name = parts[4].replace(/`/g, ""); // Function (remove backticks)

          if (cpuPercent > 0) {
            topFunctions.push({
              name,
              selfTime,
              totalTime,
              samples: 0, // Not directly available in Bun's format
              cpuPercent,
            });
          }
        }
      }

      // Extract duration from header table
      if (line.includes("Duration") || line.includes("Samples")) {
        const match = line.match(/(\d+\.?\d*)\s*(s|seconds|ms|milliseconds)/i);
        if (match) {
          duration = match[2].startsWith("m")
            ? Number.parseFloat(match[1]) / 1000
            : Number.parseFloat(match[1]);
        }
      }
    }

    // Sort by CPU percentage descending
    topFunctions.sort((a, b) => b.cpuPercent - a.cpuPercent);

    return {
      type: "cpu",
      duration,
      topFunctions: topFunctions.slice(0, 20), // Top 20 functions
      timestamp: new Date(),
      profilePath: filePath,
    };
  }

  /**
   * Parse heap profile markdown
   */
  parseHeapProfile(filePath: string): ProfileMetrics {
    const content = readFileSync(filePath, "utf-8");
    const lines = content.split("\n");

    const topFunctions: CPUFunction[] = [];
    const heapUsage: HeapStats = {
      used: 0,
      allocated: 0,
      peak: 0,
      growth: 0,
    };

    // Parse heap statistics
    for (const line of lines) {
      if (line.includes("Heap Used:") || line.includes("used")) {
        heapUsage.used = this.parseBytes(line);
      }
      if (line.includes("Heap Allocated:") || line.includes("allocated")) {
        heapUsage.allocated = this.parseBytes(line);
      }
      if (line.includes("Peak:") || line.includes("peak")) {
        heapUsage.peak = this.parseBytes(line);
      }
      if (line.includes("Growth:") || line.includes("growth")) {
        heapUsage.growth = this.parseBytes(line);
      }
    }

    return {
      type: "heap",
      duration: 0,
      topFunctions,
      heapUsage,
      timestamp: new Date(),
      profilePath: filePath,
    };
  }

  /**
   * Parse time string (e.g., "12.7s", "450ms")
   */
  private parseTime(timeStr: string): number {
    const match = timeStr.match(/(\d+\.?\d*)\s*(s|ms)?/i);
    if (!match) return 0;

    const value = Number.parseFloat(match[1]);
    const unit = match[2]?.toLowerCase();

    if (unit === "ms") {
      return value / 1000; // Convert to seconds
    }
    return value;
  }

  /**
   * Parse percentage string (e.g., "42.3%")
   */
  private parsePercent(percentStr: string): number {
    const match = percentStr.match(/(\d+\.?\d*)/);
    return match ? Number.parseFloat(match[1]) : 0;
  }

  /**
   * Parse byte string (e.g., "12.4 MB", "185MB")
   */
  private parseBytes(byteStr: string): number {
    const match = byteStr.match(/(\d+\.?\d*)\s*(KB|MB|GB|B)?/i);
    if (!match) return 0;

    const value = Number.parseFloat(match[1]);
    const unit = match[2]?.toUpperCase();

    switch (unit) {
      case "GB":
        return value * 1024 * 1024 * 1024;
      case "MB":
        return value * 1024 * 1024;
      case "KB":
        return value * 1024;
      default:
        return value;
    }
  }

  /**
   * Generate analysis summary
   */
  generateSummary(metrics: ProfileMetrics): string {
    let summary = "\nProfile Analysis:\n";
    summary += "================\n\n";

    if (metrics.type === "cpu") {
      summary += "TOP CPU CONSUMERS:\n";
      metrics.topFunctions.slice(0, 10).forEach((fn, index) => {
        summary += `${index + 1}. ${fn.name} - ${fn.cpuPercent.toFixed(1)}% (${fn.selfTime.toFixed(2)}s)\n`;
      });
    }

    if (metrics.heapUsage) {
      summary += "\nMEMORY USAGE:\n";
      summary += `Used:      ${this.formatBytes(metrics.heapUsage.used)}\n`;
      summary += `Allocated: ${this.formatBytes(metrics.heapUsage.allocated)}\n`;
      summary += `Peak:      ${this.formatBytes(metrics.heapUsage.peak)}\n`;
      if (metrics.heapUsage.growth > 0) {
        summary += `Growth:    ${this.formatBytes(metrics.heapUsage.growth)}\n`;
      }
    }

    return summary;
  }

  /**
   * Format bytes for display
   */
  private formatBytes(bytes: number): string {
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
    if (bytes >= 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`;
    }
    return `${bytes} B`;
  }
}
