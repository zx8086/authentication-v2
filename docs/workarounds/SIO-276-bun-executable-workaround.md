# SIO-276: Bundled Bun Executable Workaround

## Issue Description

**SIO-276**: The `stryker-mutator-bun-runner` package has an ENOEXEC bug when Stryker (Node.js) spawns Bun processes.

**Root Cause**: Node.js `child_process` APIs struggle to spawn Bun executables, particularly when dealing with symlinks in `node_modules/.bin/bun`.

## Proposed Solution: Bundled Bun CLI with `BUN_BE_BUN=1`

Use Bun's bundler to create a standalone executable that acts as the Bun CLI, avoiding symlink and execution permission issues.

### Reference Documentation
- [Bun Bundler - Act as Bun CLI](https://bun.com/docs/bundler/executables#act-as-the-bun-cli)
- [Bun child_process.fork()](https://bun.com/reference/node/child_process/fork)

## Implementation Steps

### Step 1: Create Bundled Bun Executable

```bash
# Create directory for bundled executables
mkdir -p scripts/bundled-runtimes

# Bundle Bun as a standalone executable
bun build --compile --minify \
  --target=bun \
  --outfile scripts/bundled-runtimes/bun-cli \
  $(which bun)
```

**Result**: `scripts/bundled-runtimes/bun-cli` (~90MB standalone binary)

### Step 2: Create Wrapper Script

Create `scripts/bun-mutation-runner.sh`:

```bash
#!/usr/bin/env bash
# scripts/bun-mutation-runner.sh
# Wrapper to run Bun CLI for mutation testing

set -euo pipefail

# Activate Bun CLI mode
export BUN_BE_BUN=1

# Use bundled Bun executable
BUNDLED_BUN="${BASH_SOURCE%/*}/bundled-runtimes/bun-cli"

# Verify executable exists
if [[ ! -x "$BUNDLED_BUN" ]]; then
  echo "Error: Bundled Bun executable not found at $BUNDLED_BUN"
  echo "Run: bun build --compile --outfile scripts/bundled-runtimes/bun-cli \$(which bun)"
  exit 1
fi

# Run Bun with all arguments passed through
exec "$BUNDLED_BUN" "$@"
```

Make it executable:
```bash
chmod +x scripts/bun-mutation-runner.sh
```

### Step 3: Update Stryker Configuration

Modify `stryker.config.json`:

**IMPORTANT**: Use absolute path, not relative path, since Stryker runs in a sandbox directory.

```json
{
  "testRunner": "command",
  "commandRunner": {
    "command": "/absolute/path/to/project/scripts/bun-mutation-runner.sh test ./test/bun ./test/integration"
  },
  "concurrency": 8,
  "timeoutMS": 30000,
  "reporters": ["clear-text", "progress"]
}
```

**Note**: Both `json` and `html` reporters have been removed because large mutation reports (8000+ mutants) cause `RangeError: Invalid string length` when serializing to JSON. The `clear-text` reporter provides all necessary information in the console output, including a detailed table of mutation scores per file.

### Step 4: Add NPM Scripts

Update `package.json`:

```json
{
  "scripts": {
    "build:bun-bundle": "mkdir -p scripts/bundled-runtimes && bun build --compile --minify --target=bun --outfile scripts/bundled-runtimes/bun-cli $(which bun)",
    "test:mutation:bundled": "bun run build:bun-bundle && bun run test:mutation:fast",
    "verify:bun-bundle": "BUN_BE_BUN=1 ./scripts/bundled-runtimes/bun-cli --version"
  }
}
```

## Usage

### Initial Setup
```bash
# Build the bundled Bun executable (one-time)
bun run build:bun-bundle

# Verify it works
bun run verify:bun-bundle
```

### Run Mutation Tests
```bash
# Standard mutation testing (now uses bundled Bun)
bun run test:mutation:fast

# Or explicit bundled version
bun run test:mutation:bundled
```

## Benefits

1. **Eliminates ENOEXEC Errors**
   - Controlled executable format
   - No symlink resolution issues
   - Direct binary execution

2. **Consistent Across Environments**
   - Same binary in dev, CI, and production
   - No dependency on system Bun installation
   - Reproducible builds

3. **No Code Changes Required**
   - Works with existing Stryker setup
   - No modifications to test files
   - Drop-in replacement

## Trade-offs

### Pros
- Fixes ENOEXEC bug completely
- No external dependencies
- Portable across similar platforms

### Cons
- **Binary Size**: ~90MB per platform
- **Platform-Specific**: Need separate binaries for macOS, Linux, Windows
- **Maintenance**: Must rebuild when updating Bun version
- **Git Consideration**: Should add to `.gitignore` (built locally or in CI)

## Platform-Specific Builds

If you need to support multiple platforms:

```bash
# macOS (x64)
bun build --compile --target=bun-darwin-x64 --outfile scripts/bundled-runtimes/bun-cli-darwin-x64 $(which bun)

# macOS (ARM64 / M1/M2)
bun build --compile --target=bun-darwin-arm64 --outfile scripts/bundled-runtimes/bun-cli-darwin-arm64 $(which bun)

# Linux (x64)
bun build --compile --target=bun-linux-x64 --outfile scripts/bundled-runtimes/bun-cli-linux-x64 $(which bun)

# Linux (ARM64)
bun build --compile --target=bun-linux-arm64 --outfile scripts/bundled-runtimes/bun-cli-linux-arm64 $(which bun)
```

Then update wrapper to detect platform:
```bash
# Detect platform
case "$(uname -s)-$(uname -m)" in
  Darwin-x86_64) BUNDLED_BUN="scripts/bundled-runtimes/bun-cli-darwin-x64" ;;
  Darwin-arm64)  BUNDLED_BUN="scripts/bundled-runtimes/bun-cli-darwin-arm64" ;;
  Linux-x86_64)  BUNDLED_BUN="scripts/bundled-runtimes/bun-cli-linux-x64" ;;
  Linux-aarch64) BUNDLED_BUN="scripts/bundled-runtimes/bun-cli-linux-arm64" ;;
  *) echo "Unsupported platform"; exit 1 ;;
esac
```

## Git Configuration

Add to `.gitignore`:
```gitignore
# Bundled runtime executables (built locally or in CI)
scripts/bundled-runtimes/
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Mutation Tests with Bundled Bun

jobs:
  mutation-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install

      - name: Build bundled Bun executable
        run: bun run build:bun-bundle

      - name: Run mutation tests
        run: bun run test:mutation:bundled

      - name: Upload mutation report
        uses: actions/upload-artifact@v4
        with:
          name: mutation-report
          path: test/results/mutation/
```

## Alternative: Simpler Workaround

If bundling Bun is too complex, a simpler workaround is to reference the system Bun directly:

```json
{
  "commandRunner": {
    "command": "/usr/local/bin/bun test ./test/bun ./test/integration"
  }
}
```

Or use an absolute path from `which bun`:
```bash
which bun
# Output: /Users/yourusername/.bun/bin/bun
```

Then in `stryker.config.json`:
```json
{
  "commandRunner": {
    "command": "/Users/yourusername/.bun/bin/bun test ./test/bun ./test/integration"
  }
}
```

However, this is **less portable** than the bundled approach.

## Verification

To verify the workaround is working:

```bash
# Test the bundled Bun CLI
BUN_BE_BUN=1 ./scripts/bundled-runtimes/bun-cli --version

# Run a simple test
BUN_BE_BUN=1 ./scripts/bundled-runtimes/bun-cli test test/bun/jwt.service.test.ts

# Run mutation tests and watch for ENOEXEC errors
bun run test:mutation:bundled 2>&1 | grep -i enoexec
# Should return no results if fixed
```

## Status

- **Issue**: SIO-276 - ENOEXEC bug when Stryker spawns Bun
- **Workaround**: Bundled Bun executable with `BUN_BE_BUN=1`
- **Status**: Documented, not yet implemented
- **Priority**: Medium (mutation tests still run, just slower due to compatibility issues)
- **Effort**: ~2 hours to implement and test

## Next Steps

1. Test bundled Bun executable creation
2. Verify it works with Stryker
3. Measure if ENOEXEC errors are eliminated
4. If successful, standardize as permanent solution
5. Consider upstreaming fix to `stryker-mutator-bun-runner`

## References

- **Issue**: SIO-276 in Linear
- **Bun Docs**: [Executables - Act as Bun CLI](https://bun.com/docs/bundler/executables#act-as-the-bun-cli)
- **Related**: Known issue in Stryker + Bun integration
