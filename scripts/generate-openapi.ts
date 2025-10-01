#!/usr/bin/env bun

/* scripts/generate-openapi.ts */

import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
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

    // Set default config for generation
    apiDocGenerator.setConfig({
      server: {
        port: 3000,
        nodeEnv: "development",
      },
    });

    // Register all routes
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

    console.log(`✅ Generated OpenAPI specifications:`);
    console.log(`   📄 ${jsonPath}`);
    console.log(`   📄 ${yamlPath}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ OpenAPI generation failed:", error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main().catch(console.error);
}