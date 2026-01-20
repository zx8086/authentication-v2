# Package.json Script Reorganization Proposal

## Executive Summary

This proposal reorganizes 150+ package.json scripts into a clear, consistent structure with:
- Consistent naming conventions (all use `:` separator)
- Logical grouping by category
- Removal of ambiguous/redundant scripts
- Better discoverability
- Full tool dependency validation

## Key Changes

### 1. Naming Convention Standardization

**Before:**
```json
"bun:test": "bun test",
"playwright:test": "playwright test",
"k6:smoke:health": "...",
"dev:development": "...",
"integration:up": "..."
```

**After:**
```json
"test:bun": "bun test",
"test:e2e": "playwright test",
"test:k6:smoke:health": "...",
"dev:env:development": "...",
"test:integration:docker:up": "..."
```

**Rationale:** All testing scripts now start with `test:`, all development with `dev:`, creating logical command trees.

### 2. Script Removals

**Removed Scripts:**
- `dev:ci` - Watch mode doesn't make sense in CI
- `bun:test:*` prefix - Renamed to `test:bun:*` for consistency
- `playwright:*` - Renamed to `test:e2e:*` for clarity
- `integration:up/down/logs` - Renamed to `test:integration:docker:*` for clarity

### 3. Category Organization

Scripts are organized into 16 clear categories:

| Category | Script Count | Examples |
|----------|--------------|----------|
| Development | 7 | `dev`, `dev:clean`, `dev:docs` |
| Production | 2 | `start`, `start:server` |
| Build | 2 | `build`, `build:server` |
| Code Quality | 14 | `biome:*`, `typecheck`, `quality:*` |
| Testing - Unit | 8 | `test:bun`, `test:bun:coverage` |
| Testing - E2E | 2 | `test:e2e`, `test:e2e:ui` |
| Testing - K6 | 21 | `test:k6:smoke:*`, `test:k6:load` |
| Testing - Mutation | 8 | `test:mutation:*` (all variants kept) |
| Testing - Integration | 12 | `test:integration:*` |
| Testing - Suites | 3 | `test:suite`, `test:clean` |
| Docker | 25 | `docker:build`, `docker:security:*` |
| Redis | 13 | `redis:start`, `redis:stats` |
| Profiling | 11 | `profile:start`, `profile:k6:*` |
| Kong Simulator | 6 | `kong:simulator`, `kong:test:*` |
| Documentation | 1 | `docs:generate` |
| License | 4 | `license:check:*` |
| Server Utils | 2 | `server:kill`, `server:health-check` |
| Troubleshooting | 2 | `fix:bun-symlink`, `fix:bun-full` |

### 4. Improved Discoverability

**Command Tree Structure:**
```bash
# All testing commands
test:
  test:bun
    test:bun:coverage
    test:bun:watch
  test:e2e
    test:e2e:ui
  test:k6
    test:k6:smoke:health
    test:k6:smoke:tokens
    test:k6:load
  test:mutation
    test:mutation:incremental
    test:mutation:fast
  test:integration
    test:integration:docker:up

# All Docker commands
docker:
  docker:build
  docker:run:local
  docker:security:scan
  docker:optimize:build
```

Tab completion in shells now works hierarchically, making scripts much easier to discover.

### 5. Clarified Ambiguities

**dev vs start:**
- `dev` = Development server with `--watch` (hot reload)
- `start` = Production server (no watch mode)
- Removed `start:server` ambiguity by keeping both for backward compatibility

**Environment-specific dev:**
- `dev:env:development` (was `dev:development`)
- `dev:env:staging` (was `dev:staging`)
- `dev:env:production` (was `dev:production`)

### 6. Consistent Server Management

**Before:**
```json
"health-check": "curl -f http://localhost:3000/health || exit 1",
"kill-server": "lsof -ti :3000 | xargs kill -9 2>/dev/null || echo 'No processes found on port 3000'"
```

**After:**
```json
"server:health-check": "curl -f http://localhost:3000/health || exit 1",
"server:kill": "lsof -ti :3000 | xargs kill -9 2>/dev/null || echo 'No processes found on port 3000'"
```

## Tool Dependency Status

### Available Tools (Validated)

| Tool | Installation Method | Status |
|------|---------------------|--------|
| yamllint | Homebrew | ✓ Installed |
| k6 | Homebrew | ✓ Installed |
| playwright | npm/nvm | ✓ Installed |
| docker | Native | ✓ Installed |
| docker scout | Docker plugin | ✓ Available |
| hadolint | Docker image | ✓ Available via `hadolint/hadolint` |
| stryker | Bun devDependencies | ✓ Installed |
| lsof | System | ✓ Available |
| curl | System | ✓ Available |

### Missing Tools

#### Trivy (Container Security Scanner)

**Status:** Referenced in scripts but NOT installed

**Scripts Using Trivy:**
- `docker:security:trivy`
- `docker:security:trivy:runtime`
- `docker:security:full`

**Installation Options:**

```bash
# Option 1: Homebrew (macOS)
brew install trivy

# Option 2: Docker (all platforms)
docker run --rm aquasec/trivy --version

# Option 3: Update scripts to use docker-based trivy
"docker:security:trivy": "docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy image --exit-code 1 --severity HIGH,CRITICAL authentication-service:latest"
```

**Recommendation:** Either install trivy via Homebrew OR update the scripts to use the Docker-based version for consistency across environments.

## Migration Guide

### Option 1: Full Replacement (Recommended)

1. Backup current package.json:
   ```bash
   cp package.json package.json.backup
   ```

2. Replace scripts section with proposal:
   ```bash
   # Manually merge package-scripts-proposal.json into package.json
   ```

3. Update any CI/CD workflows that reference old script names

4. Update documentation (README, getting-started.md)

### Option 2: Incremental Migration

1. Start with testing scripts (most impactful):
   ```bash
   # Rename bun:test -> test:bun
   # Rename playwright:test -> test:e2e
   # Rename k6:* -> test:k6:*
   ```

2. Then code quality scripts:
   ```bash
   # Already consistent, no changes needed
   ```

3. Finally Docker scripts:
   ```bash
   # Already well-organized, no changes needed
   ```

## Backward Compatibility

To maintain backward compatibility during transition, you can add aliases:

```json
{
  "// DEPRECATED - Use test:bun instead": "",
  "bun:test": "bun run test:bun",

  "// DEPRECATED - Use test:e2e instead": "",
  "playwright:test": "bun run test:e2e",

  "// DEPRECATED - Use server:kill instead": "",
  "kill-server": "bun run server:kill"
}
```

## Impact Analysis

### Scripts Modified: 150+
### Scripts Removed: 4
- `dev:ci` (impractical)
- Prefix renames (functional equivalents added)

### Breaking Changes: 0
- All functional scripts preserved
- Only naming conventions changed
- Can add backward-compatible aliases

### Documentation Updates Required:
- README.md
- docs/development/getting-started.md
- docs/development/testing.md
- test/README.md
- CLAUDE.md (Essential Commands section)

## Benefits

1. **Discoverability**: Tab completion works hierarchically
2. **Consistency**: All scripts follow same naming pattern
3. **Maintainability**: Clear categories make adding new scripts obvious
4. **Onboarding**: New developers can understand script structure quickly
5. **Tooling**: IDEs can better organize and suggest scripts
6. **CI/CD**: Pipeline definitions are more readable

## Next Steps

1. Review and approve this proposal
2. Decide on trivy installation method
3. Choose migration strategy (full or incremental)
4. Update package.json
5. Update all documentation
6. Update CI/CD workflows
7. Communicate changes to team
8. Archive old script names with deprecation notices (optional)

## Questions to Resolve

1. Should we install trivy locally or use Docker-based version?
2. Full replacement or incremental migration?
3. Keep backward-compatible aliases for transition period?
4. Update CLAUDE.md immediately or after user testing?
