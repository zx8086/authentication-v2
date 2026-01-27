# Mutation Testing Optimization Guide

## Overview

This document explains the optimizations made to Stryker mutation testing to maximize parallel execution and reduce test times.

## System Configuration

**CPU Cores Detected**: 10 cores
**Optimal Concurrency**: 8 workers (leaves 2 cores for OS and other processes)

## Optimizations Implemented

### 1. Increased Concurrency (2x Performance Boost)

**Before**: `concurrency: 4` (4 parallel workers)
**After**: `concurrency: 8` (8 parallel workers)
**Impact**: ~2x faster mutation testing

### 2. Coverage Analysis Configuration

**Setting**: `coverageAnalysis: "off"`
**Reason**: Command runner (Bun wrapper script) cannot provide per-test coverage data
**Impact**: Runs ALL tests for EVERY mutant (thorough but slower)

**Why "off" instead of "perTest"**:
- With `testRunner: "command"`, Stryker cannot instrument test code
- "perTest" mode shows false "covered 0" negatives (tests exist but not detected)
- "off" mode ensures all mutants are properly tested by running full test suite
- Trade-off: 2-3x slower execution, but 100% accuracy

### 3. Timeout Optimization

**Before**:
- `timeoutMS: 60000` (60 seconds per mutant)
- `timeoutFactor: 2.5`

**After**:
- `timeoutMS: 30000` (30 seconds per mutant)
- `timeoutFactor: 1.5`

**Impact**: Faster failure for hanging mutants, more aggressive timeout handling

## Performance Comparison

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Workers | 2 | 8 | 4x parallelism |
| Est. Runtime | 25 min | ~6-8 min | 3-4x faster |
| Timeout per mutant | 60s | 30s | 2x faster failure |
| Coverage analysis | Off | Per-test | Better incremental |

**Expected overall speedup**: ~3-5x faster mutation testing

## Available Commands

### Standard Incremental (RECOMMENDED)
```bash
bun run test:mutation
```
Uses config defaults: 8 workers with incremental mode. Best for regular development workflow.

### Fresh Run (No Incremental Cache)
```bash
bun run test:mutation:fresh
```
Clears incremental cache and runs from scratch. Use for CI or when you want to verify everything.

### Quick Smoke Test
```bash
bun run test:mutation:quick
```
Tests only services directory with 2 workers. Good for quick validation during development.

### Targeted Testing
Run mutation testing on specific directories for faster feedback:

```bash
bun run test:mutation:handlers    # Only handlers
bun run test:mutation:services    # Only services
bun run test:mutation:telemetry   # Only telemetry
bun run test:mutation:config      # Only config
bun run test:mutation:adapters    # Only adapters
bun run test:mutation:cache       # Only cache
bun run test:mutation:utils       # Only utils
bun run test:mutation:errors      # Only errors
```

### Debug Commands
```bash
bun run test:mutation:dry         # Dry run (validate tests work)
bun run test:mutation:dry:debug   # Dry run with debug output
```

## Coverage Analysis

### What Gets Tested

The full mutation testing run (`test:mutation` or `test:mutation:fresh`) covers the entire codebase based on `stryker.config.json`:

**Included directories:**
- `src/adapters/` - API gateway adapters
- `src/cache/` - Cache implementations
- `src/config/` - Configuration management
- `src/errors/` - Error definitions
- `src/handlers/` - Request handlers (except profiling.ts)
- `src/middleware/` - CORS, error handling (2 files)
- `src/routes/` - Route definitions (1 file)
- `src/services/` - Business logic (except legacy/, profiling.service.ts)
- `src/telemetry/` - Observability
- `src/utils/` - Utilities (except logger.ts, performance.ts)

**Excluded from mutation testing:**
- `src/types/` - Type definitions only
- `src/server.ts` - Entry point (bootstrapping code)
- `src/index.ts` - Entry point (bootstrapping code)
- `src/services/legacy/` - Legacy code (deprecated)
- `src/handlers/profiling.ts` - Profiling utilities
- `src/services/profiling.service.ts` - Profiling service
- `src/utils/logger.ts` - Logging infrastructure
- `src/utils/performance.ts` - Performance utilities

### Targeted Scripts Coverage

The 8 targeted mutation scripts intentionally cover **business logic directories only**:

```
[COMPLETE] test:mutation:handlers    → src/handlers/**/*.ts
[COMPLETE] test:mutation:services    → src/services/**/*.ts
[COMPLETE] test:mutation:telemetry   → src/telemetry/**/*.ts
[COMPLETE] test:mutation:config      → src/config/**/*.ts
[COMPLETE] test:mutation:adapters    → src/adapters/**/*.ts
[COMPLETE] test:mutation:cache       → src/cache/**/*.ts
[COMPLETE] test:mutation:utils       → src/utils/**/*.ts
[COMPLETE] test:mutation:errors      → src/errors/**/*.ts

[FAIL] middleware/               → NOT covered by targeted scripts
[FAIL] routes/                   → NOT covered by targeted scripts
```

**Design Decision:** Middleware and routes are intentionally excluded from targeted scripts because:
1. They are thin infrastructure wrappers with minimal business logic
2. They are covered by the full mutation run (`test:mutation`)
3. Targeted scripts are for fast iteration on critical business logic
4. Adding more targeted scripts increases complexity for minimal benefit

**Recommendation:** Use targeted scripts for focused development work, but **always run `test:mutation` or `test:mutation:fresh` before releases** to ensure complete coverage including middleware and routes.

## Configuration Details

**IMPORTANT**: See [SIO-287 Workaround](../workarounds/SIO-287-strykerjs-bun-output-parser.md) for critical Stryker/Bun compatibility fixes including:
- Dots reporter for clean output parsing
- Silent logging to prevent test failures
- Integration test exclusion (mutation testing runs unit tests only)

See `stryker.config.json` for full configuration:

```json
{
  "concurrency": 8,
  "timeoutMS": 30000,
  "timeoutFactor": 1.5,
  "coverageAnalysis": "off",
  "incremental": true,
  "incrementalFile": "test/results/mutation/stryker-incremental.json"
}
```

**Note**: `coverageAnalysis: "off"` is required when using `testRunner: "command"` (Bun wrapper script). The "perTest" mode cannot instrument external command runners, resulting in false "covered 0" negatives.

## Best Practices

### When to Run Mutation Tests

1. **During Development** (Incremental):
   ```bash
   bun run test:mutation
   ```
   - Quick iterations with incremental mode (8 workers)
   - First run: ~6-8 minutes (creates cache)
   - Subsequent runs: ~1-3 minutes (only changed code)
   - Re-uses cache for unchanged code
   - 99% accuracy (cache-dependent)

2. **Quick Validation** (Targeted):
   ```bash
   bun run test:mutation:quick
   ```
   - Tests only services with 2 workers
   - Fastest feedback for service changes
   - Typically 2-3 minutes

3. **Before Releases** (Fresh):
   ```bash
   bun run test:mutation:fresh
   ```
   - Complete validation from scratch
   - Always takes ~6-8 minutes (deletes cache)
   - Ensures no stale cache issues
   - 100% accuracy (no cache assumptions)
   - Use in CI pipelines

### Incremental vs Fresh: When to Use Each

| Scenario | Command | Reason |
|----------|---------|--------|
| Daily development work | `test:mutation` | Fast incremental testing (1-3 min) |
| After small changes | `test:mutation` | Only tests modified code |
| Before commits | `test:mutation` | Quick validation before push |
| Before releases | `test:mutation:fresh` | Complete validation, no cache |
| In CI/CD pipelines | `test:mutation:fresh` | Ensures accuracy, no cache assumptions |
| After major refactoring | `test:mutation:fresh` | Cache may be stale |
| Suspected cache corruption | `test:mutation:fresh` | Start clean |
| After config changes | `test:mutation:fresh` | Config affects all code |

**Key Difference:**
- `test:mutation` = Git-like incremental (shows what changed)
- `test:mutation:fresh` = Full validation (tests everything from scratch)

### Monitoring Performance

Watch for these indicators in output:
```
Creating 8 checker process(es) and 8 test runner process(es)
```

If you see fewer workers, check:
- CPU availability
- Memory constraints
- Bun/Node.js process limits

### Troubleshooting

**If mutation tests hang:**
- Check for infinite loops in test code
- Verify timeout settings aren't too aggressive
- Consider increasing `timeoutMS` for specific slow tests

**If memory issues occur:**
- Reduce `concurrency` to 6 or 4
- Increase Node.js heap: `NODE_OPTIONS=--max-old-space-size=8192`

**If Bun compatibility issues:**
- Monitor for ENOEXEC errors in output
- Known issue: Stryker (Node.js) + Bun process spawning
- Fallback: Use Node.js for mutation testing only

## Advanced Tuning

### Dynamic Concurrency Based on CPU Cores

To automatically adjust concurrency based on available cores:

```bash
# In .bashrc or .zshrc
alias mutation-test="bun run test:mutation:fast"
```

### CI/CD Integration

For CI environments with limited resources:

```json
{
  "concurrency": 2,
  "timeoutMS": 45000,
  "coverageAnalysis": "perTest"
}
```

Override in CI:
```bash
stryker run --incremental --concurrency 2 --timeoutMS 45000
```

## Mutation Testing Thresholds

Current thresholds in `stryker.config.json`:

```json
{
  "thresholds": {
    "high": 80,
    "low": 60,
    "break": null
  }
}
```

- **High**: 80% - Excellent mutation score
- **Low**: 60% - Minimum acceptable
- **Break**: null - Tests won't fail on low score (informational only)

## Excluded Mutations

These mutations are excluded for performance and practical reasons:

- `StringLiteral` - Low value for log messages
- `ObjectLiteral` - Often causes false positives
- `ArithmeticOperator` - Low practical value
- `BlockStatement` - Can be very slow
- `UpdateOperator` - Low practical value
- `OptionalChaining` - Low practical value

## Results Location

Mutation test results are saved to:
- Console Output: Detailed text-based report with mutation scores per file
- Incremental Cache: `test/results/mutation/stryker-incremental.json`

**Note**: HTML and JSON reporters have been disabled due to large report size (8000+ mutants) causing `RangeError: Invalid string length` during JSON serialization. The `clear-text` reporter provides comprehensive results in the console output.

## Further Optimization Ideas

If you need even faster mutation testing:

1. **Selective Mutation**:
   - Focus on critical paths only
   - Exclude utility functions
   - Test complex business logic first

2. **Parallel Sharding** (Future Enhancement):
   - Split mutation testing across multiple machines
   - Use CI/CD matrix strategy

3. **Progressive Mutation**:
   - Run quick mutations first (conditionals)
   - Run slow mutations last (block statements)

## CI/CD Integration

### GitHub Actions Configuration

**Example workflow for mutation testing in CI:**

```yaml
name: Mutation Testing

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  mutation-test:
    runs-on: ubuntu-latest
    timeout-minutes: 120  # Allow sufficient time for mutation testing

    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: 1.3.6

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Run mutation testing
        env:
          BUN_BE_BUN: 1              # Enable bundled Bun workaround
          LOG_LEVEL: silent          # Suppress Winston logs
          TELEMETRY_MODE: console    # Valid telemetry config
        run: |
          # Use fresh run for CI (no cache across builds)
          bun run test:mutation:fresh

      - name: Upload mutation report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: mutation-report
          path: .stryker-tmp/
          retention-days: 30

      - name: Comment mutation score on PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const report = JSON.parse(fs.readFileSync('.stryker-tmp/mutation-report.json'));
            const score = report.mutationScore.toFixed(2);

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.name,
              body: `## Mutation Testing Results\n\n- Mutation Score: ${score}%\n- Mutants Killed: ${report.killed}\n- Mutants Survived: ${report.survived}\n- Mutants Timeout: ${report.timeout}`
            });
```

### Performance Expectations in CI

| Environment | CPU Cores | RAM | Expected Duration | Recommendation |
|-------------|-----------|-----|-------------------|----------------|
| GitHub Actions (ubuntu-latest) | 2 | 7GB | 120-150 min | Use for nightly builds |
| GitHub Actions (ubuntu-latest-4-cores) | 4 | 16GB | 60-80 min | Recommended for PRs |
| Self-hosted (4 cores) | 4 | 8GB | 60-80 min | Good balance |
| Self-hosted (8 cores) | 8 | 16GB | 30-40 min | Ideal for fast feedback |

### CI/CD Best Practices

1. **Use Fresh Runs in CI**
   ```bash
   # Always use fresh run in CI (no incremental cache)
   bun run test:mutation:fresh
   ```

   **Why:** Incremental cache is not portable across CI builds

2. **Set Appropriate Timeout**
   ```yaml
   timeout-minutes: 120  # 2 hours for 2-core runner
   ```

   **Why:** Mutation testing is slow, avoid premature timeouts

3. **Enable Required Workarounds**
   ```yaml
   env:
     BUN_BE_BUN: 1
     LOG_LEVEL: silent
     TELEMETRY_MODE: console
   ```

   **Why:** SIO-276 and SIO-287 fixes required for Bun mutation testing

4. **Upload Artifacts**
   ```yaml
   - name: Upload mutation report
     uses: actions/upload-artifact@v4
     with:
       name: mutation-report
       path: .stryker-tmp/
   ```

   **Why:** Preserve mutation reports for debugging and historical analysis

5. **Branch Strategy**
   - **main/develop**: Run mutation testing on every push
   - **feature branches**: Run mutation testing on PR creation
   - **release branches**: Run comprehensive mutation testing before release

### Incremental CI Strategy

For faster PR feedback, consider running mutation testing only on changed files:

```yaml
- name: Get changed files
  id: changed-files
  uses: tj-actions/changed-files@v40
  with:
    files: |
      src/**/*.ts

- name: Run mutation testing (changed files only)
  if: steps.changed-files.outputs.any_changed == 'true'
  run: |
    # Use incremental run for faster feedback
    bun run test:mutation
```

**Trade-off:** Faster feedback but less comprehensive coverage

### Mutation Score Enforcement

Enforce mutation score thresholds in CI:

```yaml
- name: Check mutation score threshold
  run: |
    SCORE=$(cat .stryker-tmp/mutation-report.json | jq '.mutationScore')
    THRESHOLD=75

    if (( $(echo "$SCORE < $THRESHOLD" | bc -l) )); then
      echo "Mutation score $SCORE% is below threshold $THRESHOLD%"
      exit 1
    fi

    echo "Mutation score: $SCORE% (threshold: $THRESHOLD%)"
```

### Caching Strategy

**DO NOT cache `.stryker-tmp/incremental.json` in CI:**

```yaml
# BAD - Don't do this
- name: Cache Stryker incremental
  uses: actions/cache@v4
  with:
    path: .stryker-tmp/incremental.json
    key: stryker-${{ hashFiles('src/**/*.ts') }}
```

**Why:** Incremental cache is machine-specific and can cause false results across CI runs

**OK to cache node_modules and bun cache:**

```yaml
# GOOD - Cache dependencies
- name: Cache dependencies
  uses: actions/cache@v4
  with:
    path: |
      ~/.bun/install/cache
      node_modules
    key: ${{ runner.os }}-bun-${{ hashFiles('bun.lockb') }}
```

### Troubleshooting CI Failures

#### Issue: "Failed tests in initial run"

**Cause:** Missing SIO-287 environment variables

**Fix:**
```yaml
env:
  LOG_LEVEL: silent
  TELEMETRY_MODE: console
```

#### Issue: ENOEXEC error

**Cause:** Missing SIO-276 environment variable

**Fix:**
```yaml
env:
  BUN_BE_BUN: 1
```

#### Issue: Timeout after 60 minutes

**Cause:** Default CI timeout too low for mutation testing

**Fix:**
```yaml
jobs:
  mutation-test:
    timeout-minutes: 120  # Increase timeout
```

#### Issue: Out of memory

**Cause:** Insufficient RAM for mutation testing

**Fix:**
```yaml
# Use larger runner
runs-on: ubuntu-latest-4-cores  # 16GB RAM
```

Or reduce concurrency:

```json
{
  "concurrency": 2  // Reduce from default 4
}
```

### Example: Nightly Mutation Testing Build

For comprehensive mutation testing without blocking PRs:

```yaml
name: Nightly Mutation Testing

on:
  schedule:
    - cron: '0 2 * * *'  # Run at 2 AM UTC daily
  workflow_dispatch:      # Allow manual trigger

jobs:
  mutation-test:
    runs-on: ubuntu-latest-4-cores
    timeout-minutes: 120

    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Run comprehensive mutation testing
        env:
          BUN_BE_BUN: 1
          LOG_LEVEL: silent
          TELEMETRY_MODE: console
        run: bun run test:mutation:fresh

      - name: Upload results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: mutation-report-${{ github.run_id }}
          path: .stryker-tmp/

      - name: Send Slack notification
        if: failure()
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "Mutation testing failed in nightly build",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "FAILED: Nightly mutation testing failed\n*Run:* ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
                  }
                }
              ]
            }
```

## References

- [Stryker Configuration Docs](https://stryker-mutator.io/docs/stryker-js/configuration/)
- [Incremental Mode](https://stryker-mutator.io/docs/stryker-js/incremental/)
- [Parallel Workers](https://stryker-mutator.io/docs/stryker-js/parallel-workers/)
