# Mutation Testing Guide

## Overview

This guide provides a central hub for all mutation testing documentation, workflows, and best practices for the authentication service.

**Current Status:** 100% mutation score, 33 mutants killed, fully operational with dual workaround implementation.

## Quick Start

### First Run (Baseline)

```bash
# Full mutation testing with fresh cache (79 minutes)
bun run test:mutation:fresh
```

### Incremental Development

```bash
# After making code changes (26 seconds with cache)
bun run test:mutation

# Dry run to preview mutants without running tests
bun run test:mutation:dry
```

### Kong Integration Testing

```bash
# With Kong integration (live endpoints)
bun run test:mutation:with-kong

# With Kong integration, fresh cache
bun run test:mutation:with-kong:fresh
```

## Documentation Navigation

### Core Documentation

1. **[mutation-testing-optimization.md](mutation-testing-optimization.md)** (335 lines)
   - **Purpose**: Performance optimization and configuration guide
   - **Topics**: System config, incremental testing, targeted scripts, troubleshooting
   - **When to read**: Setting up mutation testing, optimizing performance

2. **[../workarounds/SIO-287-strykerjs-bun-output-parser.md](../workarounds/SIO-287-strykerjs-bun-output-parser.md)** (224 lines)
   - **Purpose**: Documents output parser incompatibility fix
   - **Topics**: Dots reporter, silent logging, validation steps
   - **When to read**: Debugging "failed tests in initial run" errors

3. **[../workarounds/SIO-276-bun-executable-workaround.md](../workarounds/SIO-276-bun-executable-workaround.md)** (303 lines)
   - **Purpose**: Documents ENOEXEC bug fix with bundled Bun executable
   - **Topics**: `BUN_BE_BUN=1`, platform builds, CI/CD integration
   - **When to read**: Setting up mutation testing on new systems

4. **[../plans/bun-test-runner-plugin.md](../plans/bun-test-runner-plugin.md)** (362 lines)
   - **Purpose**: Implementation plan for future @stryker-mutator/bun-runner plugin
   - **Topics**: Static analysis, coverage mapping, plugin architecture
   - **When to read**: Understanding long-term mutation testing roadmap
   - **Status**: PLANNING PHASE (not yet implemented)

5. **[testing.md](testing.md)** Section 4 (lines 386-531)
   - **Purpose**: Mutation testing concepts and best practices
   - **Topics**: Weak vs strong tests, mutation types, interpreting results
   - **When to read**: Learning mutation testing fundamentals

## Dependency Chain

The mutation testing infrastructure has dependencies between workarounds:

```
SIO-276 (Bundled Bun Executable)
  └─> SIO-287 (Output Parser Fix)
      └─> mutation-testing-optimization.md (Performance Tuning)
          └─> (FUTURE) bun-test-runner-plugin.md (Native Plugin)
```

**What this means:**
- **SIO-276** must be working (bundled Bun with `BUN_BE_BUN=1`)
- **SIO-287** depends on SIO-276 (dots reporter + silent logging)
- **Optimization** depends on both workarounds functioning
- **Future plugin** will replace both workarounds when implemented

## Common Workflows

### Development Workflow

```bash
# 1. Make code changes
vim src/services/jwt.service.ts

# 2. Run unit tests to verify functionality
bun test test/bun/jwt.service.test.ts

# 3. Run incremental mutation testing (only changed code)
bun run test:mutation

# 4. If mutations survive, add mutation killer tests
vim test/bun/services/jwt-mutation-killers.test.ts

# 5. Re-run mutation testing
bun run test:mutation
```

### CI/CD Workflow

```bash
# In GitHub Actions or local CI
export BUN_BE_BUN=1
export LOG_LEVEL=silent
export TELEMETRY_MODE=console

# Run full mutation testing
bun run test:mutation:fresh

# Check for mutation score threshold
# Expected: 100% mutation score
```

### Troubleshooting Workflow

```bash
# 1. Check if bundled Bun is working
BUN_BE_BUN=1 ./scripts/bundled-runtimes/bun-cli --version

# 2. Run dry run to see mutants without executing tests
bun run test:mutation:dry

# 3. Enable debug logging
bun run test:mutation:dry:debug

# 4. Check StrykerJS output for errors
cat .stryker-tmp/stryker.log
```

## Performance Characteristics

### Baseline Performance

| Metric | Fresh Run | Incremental Run | Improvement |
|--------|-----------|-----------------|-------------|
| **Duration** | 79 minutes | 26 seconds | 3-5x faster |
| **CPU Usage** | High | Low | 60-80% reduction |
| **Mutants** | All (33) | Changed only | Dynamic |
| **When to Use** | First run, after major changes | Development, quick validation | N/A |

### Hardware Requirements

**Minimum:**
- 4 CPU cores
- 8GB RAM
- 5GB disk space (for cache)

**Recommended:**
- 8+ CPU cores
- 16GB RAM
- 10GB disk space

**CI/CD:**
- GitHub Actions: `ubuntu-latest` (2-core) works but slower
- Self-hosted: 4+ cores recommended for acceptable performance

## Coverage Analysis

### What Gets Tested

Mutation testing targets these directories:

```
src/
├── adapters/        ✓ Included (Kong integration)
├── cache/           ✓ Included (cache backends)
├── config/          ✓ Included (configuration)
├── handlers/        ✓ Included (request handlers)
├── services/        ✓ Included (business logic)
├── telemetry/       ✓ Included (observability)
├── utils/           ✓ Included (utilities)
├── middleware/      ✗ Excluded (simple pass-through)
└── routes/          ✗ Excluded (routing only)
```

**Why Exclude Middleware/Routes?**
- Minimal business logic (mostly pass-through)
- Routing logic is framework-dependent
- Better tested via E2E/integration tests

### Test File Organization

Mutation killer tests follow naming convention:

```
test/bun/
├── services/
│   ├── jwt.service.test.ts              # Standard unit tests
│   └── jwt-mutation-killers.test.ts     # Mutation-resistant tests
├── adapters/
│   ├── kong.adapter.test.ts             # Standard unit tests
│   └── kong-adapter-mutation-killers.ts # Mutation-resistant tests
└── ...
```

## Mutation Testing Commands Reference

### Core Commands

```bash
# Fresh run (clears cache, full mutation testing)
bun run test:mutation:fresh        # 79 minutes

# Incremental run (uses cache)
bun run test:mutation              # 26 seconds

# Dry run (show mutants without running tests)
bun run test:mutation:dry          # Fast

# Debug mode (verbose output)
bun run test:mutation:dry:debug    # Fast
```

### Kong Integration Commands

```bash
# With live Kong (remote IP, uses curl fallback)
bun run test:mutation:with-kong

# With Kong, fresh cache
bun run test:mutation:with-kong:fresh
```

## When to Use Each Command

| Command | Use Case | Duration | Cache | Tests Run |
|---------|----------|----------|-------|-----------|
| `test:mutation:fresh` | Baseline, major changes | 79 min | Cleared | All |
| `test:mutation` | Development, quick feedback | 26 sec | Used | Changed only |
| `test:mutation:dry` | Preview mutants | Fast | N/A | None |
| `test:mutation:dry:debug` | Troubleshooting | Fast | N/A | None |
| `test:mutation:with-kong` | Kong integration testing | Variable | Used | All |
| `test:mutation:with-kong:fresh` | Kong baseline | 79+ min | Cleared | All |

## Troubleshooting Index

Common issues and where to find solutions:

| Issue | Documentation | Location |
|-------|---------------|----------|
| "Failed tests in initial run" | SIO-287 | `docs/workarounds/SIO-287-strykerjs-bun-output-parser.md` |
| ENOEXEC error | SIO-276 | `docs/workarounds/SIO-276-bun-executable-workaround.md` |
| Slow performance | Optimization guide | `docs/development/mutation-testing-optimization.md` |
| Mutation survivors | Testing concepts | `docs/development/testing.md` Section 4 |
| Memory pressure | Optimization guide | `docs/development/mutation-testing-optimization.md` |
| CI/CD integration | (Coming soon) | `docs/development/mutation-testing-optimization.md` |

## Advanced Topics

### Incremental Cache Management

The incremental cache is stored in `.stryker-tmp/incremental.json`:

```bash
# View incremental cache
cat .stryker-tmp/incremental.json

# Clear incremental cache (forces fresh run)
rm -rf .stryker-tmp/incremental.json

# Clear all Stryker artifacts
rm -rf .stryker-tmp/
```

### Mutation Thresholds

Current configuration (`stryker.config.json`):

```json
{
  "thresholds": {
    "high": 90,
    "low": 75,
    "break": 75
  }
}
```

**What this means:**
- **break: 75** - Build fails if mutation score < 75%
- **high: 90** - Green status if score >= 90%
- **low: 75** - Yellow status if score >= 75%

**Current Status:** 100% mutation score (33/33 mutants killed)

### Mutation Types

Enabled mutant types:

- **Arithmetic** - `+` ↔ `-`, `*` ↔ `/`
- **Comparison** - `>` ↔ `<`, `>=` ↔ `<=`
- **Logical** - `&&` ↔ `||`, remove `!`
- **Conditional** - `if (true)` ↔ `if (false)`
- **Assignment** - `+=` ↔ `-=`
- **Block** - Remove entire blocks
- **String** - `""` ↔ `"Stryker was here!"`

Disabled mutant types:
- **Object literals** - Too many false positives
- **Array elements** - Causes test instability

## Future Roadmap

### Short Term (Implemented)
- [COMPLETE] Bundled Bun executable workaround (SIO-276)
- [COMPLETE] Output parser fix (SIO-287)
- [COMPLETE] Performance optimization guide
- [COMPLETE] Comprehensive mutation killer tests

### Medium Term (Planned)
- ⏳ CI/CD integration documentation
- ⏳ Automated mutation report generation
- ⏳ Performance benchmarking on CI hardware

### Long Term (Future)
- 📋 Native @stryker-mutator/bun-runner plugin
- 📋 Per-test coverage analysis
- 📋 IDE integration for mutation testing
- 📋 HTML report generation

## Related Documentation

- **Test Documentation**: `test/README.md`
- **CLAUDE.md**: Mutation testing section (lines 257-273)
- **CI/CD**: `.github/workflows/build-and-deploy.yml`
- **Troubleshooting**: `docs/operations/TROUBLESHOOTING.md` (mutation testing runbook)

## Getting Help

If you encounter issues not covered in this guide:

1. Check troubleshooting index (above)
2. Review referenced documentation for your specific issue
3. Enable debug mode: `bun run test:mutation:dry:debug`
4. Check `.stryker-tmp/stryker.log` for StrykerJS errors
5. Verify bundled Bun is working: `BUN_BE_BUN=1 ./scripts/bundled-runtimes/bun-cli --version`
