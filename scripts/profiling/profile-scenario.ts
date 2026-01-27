#!/usr/bin/env bun

/* scripts/profiling/profile-scenario.ts */

import { parseArgs } from "node:util";
import { MarkdownProfileParser, ProfileAnalyzer } from "./lib/markdown-parser";
import { ProfileRunner } from "./lib/profile-runner";
import { ScenarioGenerator, type ScenarioType } from "./lib/scenario-generator";

interface CliOptions {
  scenario: ScenarioType;
  duration?: number;
  outputDir?: string;
  noCpu?: boolean;
  noHeap?: boolean;
}

function printUsage() {
  console.log(`
Usage: bun scripts/profiling/profile-scenario.ts [options]

Options:
  --scenario <type>    Scenario to run: tokens, health, validate, mixed (required)
  --duration <seconds> Override default duration (optional)
  --output-dir <path>  Output directory for profiles (default: profiles/current)
  --no-cpu             Disable CPU profiling
  --no-heap            Disable heap profiling
  --help               Show this help message

Examples:
  bun scripts/profiling/profile-scenario.ts --scenario=tokens
  bun scripts/profiling/profile-scenario.ts --scenario=health --duration=15
  bun scripts/profiling/profile-scenario.ts --scenario=mixed --no-heap
`);
}

async function main() {
  try {
    // Parse command-line arguments
    const { values } = parseArgs({
      options: {
        scenario: { type: "string" },
        duration: { type: "string" },
        "output-dir": { type: "string" },
        "no-cpu": { type: "boolean" },
        "no-heap": { type: "boolean" },
        help: { type: "boolean" },
      },
      strict: true,
      allowPositionals: false,
    });

    if (values.help) {
      printUsage();
      process.exit(0);
    }

    if (!values.scenario) {
      console.error("Error: --scenario is required");
      printUsage();
      process.exit(1);
    }

    const scenario = values.scenario as ScenarioType;
    const validScenarios: ScenarioType[] = ["tokens", "health", "validate", "mixed"];
    if (!validScenarios.includes(scenario)) {
      console.error(
        `Error: Invalid scenario "${scenario}". Must be one of: ${validScenarios.join(", ")}`
      );
      process.exit(1);
    }

    // Setup options
    const scenarioGen = new ScenarioGenerator();
    const scenarioConfig = scenarioGen.getScenarioConfig(scenario);

    const options: CliOptions = {
      scenario,
      duration: values.duration ? Number.parseInt(values.duration, 10) : scenarioConfig.duration,
      outputDir: values["output-dir"] || "profiles/current",
      noCpu: values["no-cpu"] || false,
      noHeap: values["no-heap"] || false,
    };

    console.log(`
=========================================
  Profiling Scenario: ${scenarioConfig.name}
=========================================
`);

    // Create profile runner
    const runner = new ProfileRunner({
      cpuProf: !options.noCpu,
      heapProf: !options.noHeap,
      outputDir: options.outputDir,
      serverScript: "src/index.ts",
      duration: options.duration || 30,
    });

    // Start server with profiling
    console.log("Step 1: Starting server with profiling enabled...");
    await runner.startServer();

    // Run scenario
    console.log(`\nStep 2: Running ${scenarioConfig.name} scenario (${options.duration}s)...`);
    const scenarioResult = await scenarioGen.runScenario(scenario);

    // Stop server and generate profiles
    console.log("\nStep 3: Stopping server and capturing profiles...");
    const profileResult = await runner.run();

    // Cleanup
    await runner.cleanup();

    // Display scenario results
    console.log(scenarioGen.formatResult(scenarioResult));

    // Analyze profiles
    if (profileResult.success) {
      console.log("\nStep 4: Analyzing profiles...\n");

      const parser = new MarkdownProfileParser();
      const analyzer = new ProfileAnalyzer();

      if (profileResult.cpuProfilePath) {
        console.log(`CPU Profile: ${profileResult.cpuProfilePath}`);
        try {
          const cpuMetrics = parser.parseCPUProfile(profileResult.cpuProfilePath);
          const recommendations = analyzer.generateRecommendations(cpuMetrics);
          const report = analyzer.generateEnhancedReport(cpuMetrics, recommendations);
          console.log(`\n${report}`);
        } catch (error) {
          console.error("Failed to parse CPU profile:", error);
        }
      }

      if (profileResult.heapProfilePath) {
        console.log(`\nHeap Profile: ${profileResult.heapProfilePath}`);
        try {
          const heapMetrics = parser.parseHeapProfile(profileResult.heapProfilePath);
          const recommendations = analyzer.generateRecommendations(heapMetrics);
          const report = analyzer.generateEnhancedReport(heapMetrics, recommendations);
          console.log(`\n${report}`);
        } catch (error) {
          console.error("Failed to parse heap profile:", error);
        }
      }

      console.log("\n=========================================");
      console.log("  Profiling Complete!");
      console.log("=========================================\n");

      process.exit(0);
    } else {
      console.error("\nProfiling failed:", profileResult.error);
      process.exit(1);
    }
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.main) {
  main();
}
