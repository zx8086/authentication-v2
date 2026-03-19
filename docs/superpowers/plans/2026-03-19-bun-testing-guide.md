# Bun Testing Guide - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a standalone, project-agnostic testing guide covering the Bun test runner, Playwright API E2E testing, and K6 performance testing -- droppable into any Bun HTTP server project.

**Architecture:** Single markdown file following the established `docs/guides/` pattern (H1 + one-liner, Quick Start, `---` separators between sections, reference tables, Best Practices). Content extracted and generalized from the project's 3190+ tests, `bunfig.toml`, `playwright.config.ts`, and K6 test infrastructure. All examples use generic service/endpoint names -- zero project-specific references.

**Tech Stack:** Bun test runner, Playwright (API testing mode), K6 performance testing, JSONC/TOML configuration

---

## File Structure

| # | File | Action | Responsibility |
|---|------|--------|----------------|
| 1 | `docs/guides/bun-testing-guide.md` | Create (~800 lines) | Standalone testing reference |
| 2 | `docs/README.md` | Modify (line 101) | Add 1 row to Standalone Guides table |
| 3 | `docs/development/testing.md` | Modify (line 1-3) | Add cross-reference blockquote |

---

## Guide Structure (Section Outline)

The guide will have 15 sections matching the structure below. All code examples use generic names (`my-service`, `my-app`, `/health`, `/users`, etc.).

| # | Section | Content |
|---|---------|---------|
| 1 | Title + one-liner | "Drop this file into your project and start testing." |
| 2 | Quick Start | `bunfig.toml` + first test file + run command |
| 3 | Bun Test Runner | `describe`/`test`/`expect` API, lifecycle hooks, `test.concurrent`, `test.skip`, `test.todo` |
| 4 | bunfig.toml Reference | Property table: `maxConcurrency`, `env`, `preload`, `concurrentTestGlob`, `serialTestGlob`, `timeout`, `ci`, `coveragePathIgnorePatterns` |
| 5 | Preload Scripts | Environment loading pattern, `.env` file parsing, test setup |
| 6 | Test Organization | Directory-by-domain pattern, selective execution, naming conventions |
| 7 | Test Types | Unit, integration, chaos/resilience -- with property table (isolation, speed, dependencies) |
| 8 | Assertion Patterns | `expect` matchers reference, async assertions, error testing, Zod schema validation |
| 9 | Mocking | `mock.fn()`, `mock.module()`, spies, when to mock vs use live backends |
| 10 | Playwright API E2E | Setup, `playwright.config.ts` template, API-mode testing (no browser UI), projects, CI-safe patterns, multi-browser |
| 11 | K6 Performance Testing | Install, test file structure, smoke/load/stress/spike/soak patterns, thresholds, environment variables |
| 12 | CI/CD Integration | GitHub Actions workflow for all three tiers, artifact management, parallel execution |
| 13 | Package.json Scripts | Hierarchical script organization pattern, script naming conventions |
| 14 | Best Practices | 10 items covering all three tiers |
| 15 | Anti-Patterns | 6 items (artificial timeouts, mocking everything, `toBeDefined()` instead of value assertions, etc.) |

---

## Tasks

### Task 1: Create the Guide

**Files:**
- Create: `docs/guides/bun-testing-guide.md`

- [ ] **Step 1: Write the full guide**

Write `docs/guides/bun-testing-guide.md` with all 15 sections listed above. Use the Write tool. The content MUST:

1. Follow the exact structural pattern of existing guides:
   - H1 title on line 1
   - One-liner description on line 3 including "Drop this file into your project and start testing."
   - `## Quick Start` as first section
   - `---` horizontal rules between major sections
   - Tables for reference data
   - `## Best Practices` as the final content section (numbered list, 10 items)
2. Use ONLY generic names: `my-service`, `my-app`, `/health`, `/users`, `/metrics`, `app`, `db`, `cache` -- NO project-specific references
3. Include NO emojis
4. Include complete, copy-pasteable code examples (not stubs or "add your code here")

**Section details:**

**Quick Start** -- minimal `bunfig.toml` + first test + run command:
```toml
[test]
preload = ["./test/preload.ts"]
timeout = "30s"
```
```typescript
import { describe, expect, test } from "bun:test";
// simple test example
```
```bash
bun test
```

**Bun Test Runner** -- cover the API surface:
- `describe()`, `test()`, `it()`, `expect()`
- `beforeAll`, `afterAll`, `beforeEach`, `afterEach`
- `test.concurrent()` for CPU-bound pure tests
- `test.skip()`, `test.todo()`, `test.only()`
- `test.each()` for parameterized tests

**bunfig.toml Reference** -- property table with types, defaults, descriptions for all test-related settings.

**Preload Scripts** -- generic `.env` loader pattern (extracted from `test/preload.ts` but with generic variable names).

**Test Organization** -- the subdirectory-by-domain layout:
```
test/
|-- unit/
|   |-- handlers/
|   |-- services/
|   |-- utils/
|-- integration/
|-- e2e/
|-- k6/
|-- shared/
```
Plus selective execution: `bun test test/unit/handlers/`.

**Test Types** -- table comparing unit/integration/chaos with columns: Type, Isolation, Speed, Dependencies, When to Use.

**Assertion Patterns** -- `toBe`, `toEqual`, `toHaveProperty`, `toThrow`, `toBeGreaterThan`, `toHaveLength`, async patterns with `expect(promise).resolves`/`.rejects`, Zod `.safeParse()` validation testing.

**Mocking** -- `mock.fn()`, `mock.module()`, spy patterns. Include guidance on when to mock (external HTTP APIs, randomness, time) vs when to use live backends (databases, caches in integration tests).

**Playwright API E2E** -- cover:
- Install: `bun add -d @playwright/test && bunx playwright install`
- `playwright.config.ts` template for API testing (no browser rendering needed)
- `defineConfig` with `testDir`, `fullyParallel`, `retries`, `workers`, `reporter`, `use.baseURL`
- Projects for CI-safe vs full suites
- API request pattern: `test("endpoint works", async ({ request }) => { ... })`
- Multi-browser projects (chromium, firefox, webkit)
- Environment-based `baseURL` configuration

**K6 Performance Testing** -- cover:
- Install: `brew install k6` / apt
- Test file structure: `options` export + `default` function
- Test types with duration/VU recommendations table: smoke (3min, 3 VUs), load (10min, 10-20 VUs), stress (18min, 50-100 VUs), spike (8min, variable), soak (1h+, steady)
- Threshold configuration: `http_req_duration`, `http_req_failed`, `http_reqs`
- Environment variables for parameterization
- `check()` assertions pattern

**CI/CD Integration** -- GitHub Actions workflow template covering all three tiers in a single pipeline.

**Package.json Scripts** -- hierarchical naming pattern (`test:unit`, `test:e2e`, `test:k6:smoke`, `test:suite`).

**Best Practices** -- 10 items:
1. Organize tests by domain, not by type
2. Use `test.concurrent()` for pure functions
3. Use `serialTestGlob` for tests that share state
4. Prefer value assertions over existence checks
5. Use preload scripts for environment setup
6. Set bounded timeouts (never infinite)
7. Use CI-safe test subsets for pipelines without full infrastructure
8. Keep smoke tests under 5 minutes
9. Pin K6/Playwright versions in CI
10. Clean up test artifacts (servers, containers, files) in `afterAll`

**Anti-Patterns** -- 6 items:
1. Artificial timeouts on tests (`setTimeout` inside tests)
2. `expect(result).toBeDefined()` instead of value assertions
3. Mocking everything (lose integration confidence)
4. Hardcoded URLs instead of environment-based configuration
5. Sequential execution of independent tests (use `test.concurrent`)
6. Skipping cleanup in `afterAll` (leaks processes/ports)

- [ ] **Step 2: Verify no project-specific references**

Run:
```bash
grep -i -E 'authentication|kong|pvh|auth-service|zx8086|pvhcorp' docs/guides/bun-testing-guide.md
```
Expected: zero matches. If any found, fix them.

- [ ] **Step 3: Verify structural consistency**

Manually check:
- Line 1 is an H1 title
- Line 3 has the one-liner with "Drop this file"
- First `##` section is "Quick Start"
- `---` separators between major sections
- No emojis anywhere
- Best Practices is a numbered list

---

### Task 2: Update Cross-References

**Files:**
- Modify: `docs/README.md` (line ~101, after the last guide row)
- Modify: `docs/development/testing.md` (lines 1-3, after H1)

- [ ] **Step 4: Add row to docs/README.md Standalone Guides table**

Add after the `zed-tasks-guide.md` row (which is currently the last row):
```markdown
| [bun-testing-guide.md](guides/bun-testing-guide.md) | Bun test runner, Playwright E2E, and K6 performance testing |
```

- [ ] **Step 5: Add cross-reference blockquote to docs/development/testing.md**

Insert after line 1 (the `# Testing Guide` heading), before line 2:
```markdown

> For a project-agnostic testing reference, see the [Bun Testing Guide](../guides/bun-testing-guide.md).
```

This matches the pattern used in `devcontainer.md` and `zed-tasks.md`.

- [ ] **Step 6: Commit**

```bash
git add docs/guides/bun-testing-guide.md docs/README.md docs/development/testing.md
git commit -m "docs: add standalone Bun testing guide"
```

---

### Task 3: Verification

- [ ] **Step 7: Run quality checks**

```bash
bun run quality:check
```
Expected: all checks pass (typecheck, biome, yaml).

- [ ] **Step 8: Verify all links resolve**

Check that these paths exist:
- `docs/guides/bun-testing-guide.md` (the new file)
- The relative link in `docs/README.md` resolves: `guides/bun-testing-guide.md`
- The relative link in `docs/development/testing.md` resolves: `../guides/bun-testing-guide.md`

- [ ] **Step 9: Final project-specific term grep**

```bash
grep -i -E 'authentication|kong|pvh|auth-service|zx8086|pvhcorp|SIO-' docs/guides/bun-testing-guide.md
```
Expected: zero matches.

---

## Acceptance Criteria

1. `docs/guides/bun-testing-guide.md` exists with ~800 lines covering all 15 sections
2. Zero project-specific terms in the guide
3. Structural consistency with existing guides (H1, one-liner, Quick Start, `---` separators, tables, Best Practices)
4. Cross-reference in `docs/development/testing.md` (blockquote after H1)
5. Row added to `docs/README.md` Standalone Guides table
6. `bun run quality:check` passes
7. No emojis anywhere in the guide
