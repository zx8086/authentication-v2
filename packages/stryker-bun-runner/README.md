# @stryker-mutator/bun-runner

A Stryker test runner plugin for Bun with static coverage analysis.

## Overview

This plugin enables mutation testing with Bun by:
1. **Static Coverage Analysis**: Parses test files to build a coverage map at startup
2. **Process Spawning**: Executes Bun CLI as child process for each mutant
3. **Selective Testing**: Runs only tests that cover the mutated file
4. **Coverage Caching**: Caches coverage map for faster subsequent runs

## Why This Plugin?

Stryker's `testRunner: "command"` treats the entire test suite as a black box, preventing coverage detection. This results in all mutants marked as "covered 0" and no actual mutation testing.

This plugin solves that by using static analysis to understand test-to-source-file relationships.

## Installation

```bash
npm install @stryker-mutator/bun-runner
# or
bun add @stryker-mutator/bun-runner
```

## Configuration

Update your `stryker.config.json`:

```json
{
  "testRunner": "bun",
  "plugins": [
    "@stryker-mutator/bun-runner"
  ],
  "coverageAnalysis": "off",
  "mutate": [
    "src/**/*.ts",
    "!src/**/*.test.ts"
  ]
}
```

## Features

### Static Coverage Analysis
- Scans all test files at startup
- Extracts import statements using regex
- Resolves relative paths to absolute source files
- Builds bidirectional coverage map
- Caches results for faster subsequent runs

### Process Management
- Spawns Bun CLI for each mutant
- Sets environment variables for mutant activation:
  - `__STRYKER_ACTIVE_MUTANT__`: Mutant ID
  - `__STRYKER_MUTANT_COVERAGE__`: "true"
- Captures stdout/stderr
- Handles timeouts and errors

### Output Parsing
- Parses Bun's dots reporter output
- Extracts test counts from summary
- Determines mutant status (killed/survived/timeout/error)

## Architecture

```
┌─────────────────────────────────────────────┐
│  Stryker Core                               │
│  ├─ Instrumenter (creates mutants)          │
│  └─ Mutation Test Executor                  │
└─────────────────────┬───────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────┐
│  @stryker-mutator/bun-runner (THIS)         │
│  ├─ BunTestRunner (implements TestRunner)   │
│  ├─ Coverage Analyzer (static analysis)     │
│  ├─ Process Manager (spawn Bun CLI)         │
│  └─ Output Parser (parse dots/junit)        │
└─────────────────────┬───────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────┐
│  Bun CLI                                     │
│  └─ bun test --reporter=dots ./test/bun     │
└─────────────────────────────────────────────┘
```

## API

### BunTestRunner

Main class implementing Stryker's `TestRunner` interface:

```typescript
class BunTestRunner {
  async init(): Promise<void>
  async dryRun(): Promise<DryRunResult>
  async mutantRun(mutantId: string, mutatedFile: string): Promise<MutantRunResult>
  async dispose(): Promise<void>
  capabilities(): TestRunnerCapabilities
}
```

### Options

```typescript
interface BunTestRunnerOptions {
  testDirectory: string;        // Path to test directory
  sourceDirectory: string;      // Path to source directory
  bunExecutable?: string;       // Path to bun executable (default: "bun")
  timeout?: number;             // Test timeout in ms (default: 60000)
  logLevel?: string;            // Log level (default: "silent")
  cacheEnabled?: boolean;       // Enable coverage cache (default: true)
  cachePath?: string;           // Cache file path (default: ".stryker-coverage-cache.json")
}
```

## Limitations

- **No Programmatic API**: Bun has no programmatic test execution API, so we spawn CLI processes
- **Regex-based Import Parsing**: May miss dynamic imports or complex import patterns
- **Transitive Dependencies**: Currently only analyzes direct imports
- **Process Overhead**: Spawning processes for each mutant has some overhead

## Performance

- **Coverage Analysis**: Cached after first run (~1-2 seconds for 70 test files)
- **Per-Mutant Execution**: Only runs tests covering the mutated file
- **Typical Speed**: 1-2 seconds per mutant (vs 10-20 seconds for full suite)

## Troubleshooting

### No Coverage Detected

If all mutants show "covered 0":
1. Check test files are in configured `testDirectory`
2. Verify test files match pattern (default: `*.test.ts`)
3. Ensure tests import source files with relative paths

### Timeouts

If tests timeout:
1. Increase `timeout` in options
2. Check for hanging tests in your suite
3. Verify Bun is installed and accessible

### Cache Issues

If coverage seems outdated:
1. Delete `.stryker-coverage-cache.json`
2. Set `cacheEnabled: false` in options

## License

MIT

## Contributing

Pull requests welcome! Please ensure:
- All tests pass
- TypeScript compiles without errors
- Code follows project style
