#!/usr/bin/env bun

/* scripts/generate-openapi.ts */

import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { apiDocGenerator } from "../src/openapi-generator.js";

interface GenerationOptions {
  outputDir?: string;
  format?: "json" | "yaml" | "both";
  verbose?: boolean;
}

interface GenerationStats {
  duration: number;
  filesGenerated: string[];
  totalSize: number;
  routeCount: number;
  schemaCount: number;
}

function convertToYaml(obj: any, indent = 0): string {
  const spaces = "  ".repeat(indent);

  if (obj === null || obj === undefined) {
    return "null";
  }

  if (typeof obj === "string") {
    if (obj.includes("\n") || obj.includes('"') || obj.includes("'")) {
      return `|\n${spaces}  ${obj.split("\n").join(`\n${spaces}  `)}`;
    }
    if (obj.includes(":") || obj.includes("[") || obj.includes("{") || /^\d/.test(obj)) {
      return `"${obj.replace(/"/g, '\\"')}"`;
    }
    return obj;
  }

  if (typeof obj === "number" || typeof obj === "boolean") {
    return obj.toString();
  }

  if (Array.isArray(obj)) {
    if (obj.length === 0) return "[]";
    return obj.map(item => `\n${spaces}- ${convertToYaml(item, indent + 1).replace(/\n/g, `\n${spaces}  `)}`).join("");
  }

  if (typeof obj === "object") {
    const entries = Object.entries(obj);
    if (entries.length === 0) return "{}";

    return entries
      .map(([key, value]) => {
        const yamlValue = convertToYaml(value, indent + 1);
        if (typeof value === "object" && !Array.isArray(value) && value !== null) {
          return `\n${spaces}${key}:${yamlValue.startsWith("\n") ? yamlValue : ` ${yamlValue}`}`;
        }
        return `\n${spaces}${key}: ${yamlValue}`;
      })
      .join("");
  }

  return obj.toString();
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function parseCommandLineArgs(): GenerationOptions {
  const args = process.argv.slice(2);
  const options: GenerationOptions = {
    outputDir: "public",
    format: "both",
    verbose: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case "-o":
      case "--output":
        if (i + 1 < args.length) {
          options.outputDir = args[i + 1];
          i++;
        } else {
          console.error("Error: --output requires a directory path");
          process.exit(1);
        }
        break;

      case "-f":
      case "--format":
        if (i + 1 < args.length) {
          const format = args[i + 1];
          if (["json", "yaml", "both"].includes(format)) {
            options.format = format as "json" | "yaml" | "both";
            i++;
          } else {
            console.error("Error: --format must be one of: json, yaml, both");
            process.exit(1);
          }
        } else {
          console.error("Error: --format requires a value");
          process.exit(1);
        }
        break;

      case "-v":
      case "--verbose":
        options.verbose = true;
        break;

      case "-h":
      case "--help":
        console.log(`
OpenAPI Specification Generator for PVH Authentication Service

Usage: bun scripts/generate-openapi.ts [OPTIONS]

Options:
  -o, --output <dir>     Output directory (default: public)
  -f, --format <format>  Output format: json, yaml, or both (default: both)
  -v, --verbose         Enable verbose output with generation statistics
  -h, --help            Show this help message

Examples:
  bun scripts/generate-openapi.ts
  bun scripts/generate-openapi.ts --format json --verbose
  bun scripts/generate-openapi.ts --output ./docs/api --format yaml
        `);
        process.exit(0);
        break;

      default:
        console.error(`Error: Unknown option '${arg}'`);
        console.error("Use --help for usage information");
        process.exit(1);
    }
  }

  return options;
}

async function ensureDirectoryExists(dirPath: string): Promise<void> {
  if (!existsSync(dirPath)) {
    await mkdir(dirPath, { recursive: true });
  }
}

async function generateOpenAPISpec(options: GenerationOptions = {}): Promise<GenerationStats> {
  const startTime = Date.now();
  const outputDir = options.outputDir || "public";
  const format = options.format || "both";
  const verbose = options.verbose || false;

  await ensureDirectoryExists(outputDir);

  const defaultConfig = {
    server: {
      port: 3000,
      nodeEnv: "development"
    }
  };
  apiDocGenerator.setConfig(defaultConfig);

  apiDocGenerator.registerAllRoutes();

  const openApiSpec = apiDocGenerator.generateSpec();

  const stats: GenerationStats = {
    duration: 0,
    filesGenerated: [],
    totalSize: 0,
    routeCount: Object.keys(openApiSpec.paths).length,
    schemaCount: Object.keys(openApiSpec.components.schemas).length
  };

  if (format === "json" || format === "both") {
    const jsonContent = JSON.stringify(openApiSpec, null, 2);
    const jsonPath = path.join(outputDir, "openapi.json");

    await writeFile(jsonPath, jsonContent, "utf-8");
    stats.filesGenerated.push(jsonPath);
    stats.totalSize += Buffer.byteLength(jsonContent, "utf-8");
  }

  if (format === "yaml" || format === "both") {
    const yamlContent = `# OpenAPI 3.0.3 specification for PVH Authentication Service
# Generated on: ${new Date().toISOString()}
# This file is auto-generated. Do not edit manually.
${convertToYaml(openApiSpec)}`;

    const yamlPath = path.join(outputDir, "openapi-generated.yaml");

    await writeFile(yamlPath, yamlContent, "utf-8");
    stats.filesGenerated.push(yamlPath);
    stats.totalSize += Buffer.byteLength(yamlContent, "utf-8");
  }

  stats.duration = Date.now() - startTime;

  return stats;
}

async function main(): Promise<void> {
  try {
    const options = parseCommandLineArgs();
    const stats = await generateOpenAPISpec(options);

    process.exit(0);
  } catch (error) {
    process.exit(1);
  }
}

export { generateOpenAPISpec, type GenerationOptions, type GenerationStats };

if (import.meta.main) {
  main().catch(console.error);
}