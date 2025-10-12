#!/usr/bin/env bun

/* scripts/generate-openapi.ts */

import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { apiDocGenerator } from "../src/openapi-generator.js";

async function ensureDirectoryExists(dirPath: string): Promise<void> {
  if (!existsSync(dirPath)) {
    await mkdir(dirPath, { recursive: true });
  }
}

async function main(): Promise<void> {
  try {
    const outputDir = "public";
    await ensureDirectoryExists(outputDir);

    // Register all routes (config loaded automatically from 4-pillar system)
    apiDocGenerator.registerAllRoutes();

    // Generate the spec
    const openApiSpec = apiDocGenerator.generateSpec();

    // Write JSON version
    const jsonPath = path.join(outputDir, "openapi.json");
    await writeFile(jsonPath, JSON.stringify(openApiSpec, null, 2), "utf-8");

    // Write YAML version (simple format)
    const yamlPath = path.join(outputDir, "openapi-generated.yaml");
    const yamlContent = apiDocGenerator.convertToYaml(openApiSpec);
    await writeFile(yamlPath, yamlContent, "utf-8");

    console.log(`Generated OpenAPI specifications:`);
    console.log(`   ${jsonPath}`);
    console.log(`   ${yamlPath}`);

    process.exit(0);
  } catch (error) {
    console.error("OpenAPI generation failed:", error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main().catch(console.error);
}
