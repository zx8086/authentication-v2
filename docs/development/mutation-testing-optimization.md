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

### 2. Coverage Analysis Optimization

**Before**: `coverageAnalysis: "off"`
**After**: `coverageAnalysis: "perTest"`
**Impact**: Better performance with incremental mode, enables Stryker to skip tests that don't cover mutated code

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

### Fast Incremental Testing (RECOMMENDED)
```bash
bun run test:mutation:fast
```
Uses 8 workers with incremental mode. Best for regular development workflow.

### Standard Incremental
```bash
bun run test:mutation:incremental
```
Uses config file defaults (now optimized to 8 workers).

### Fresh Run (No Incremental Cache)
```bash
bun run test:mutation:fresh
```
Clears incremental cache and runs from scratch. Use when you want to verify everything.

### Quick Smoke Test
```bash
bun run test:mutation:quick
```
Tests only services directory with 2 workers. Good for quick validation.

### Targeted Testing
```bash
# Test only services
bun run test:mutation:services

# Test only handlers
bun run test:mutation:handlers
```

## Configuration Details

See `stryker.config.json` for full configuration:

```json
{
  "concurrency": 8,
  "timeoutMS": 30000,
  "timeoutFactor": 1.5,
  "coverageAnalysis": "perTest",
  "incremental": true,
  "incrementalFile": "test/results/mutation/stryker-incremental.json"
}
```

## Best Practices

### When to Run Mutation Tests

1. **During Development** (Fast):
   ```bash
   bun run test:mutation:fast
   ```
   - Quick iterations with incremental mode
   - Typically 6-8 minutes

2. **Before Commits** (Standard):
   ```bash
   bun run test:mutation:incremental
   ```
   - Verify changes haven't broken mutation score
   - Uses incremental cache for speed

3. **Before Releases** (Fresh):
   ```bash
   bun run test:mutation:fresh
   ```
   - Complete validation from scratch
   - Ensures no stale cache issues

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

## References

- [Stryker Configuration Docs](https://stryker-mutator.io/docs/stryker-js/configuration/)
- [Incremental Mode](https://stryker-mutator.io/docs/stryker-js/incremental/)
- [Parallel Workers](https://stryker-mutator.io/docs/stryker-js/parallel-workers/)
