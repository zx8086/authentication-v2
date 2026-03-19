# Zed Tasks Guide

Standalone guide to building Zed IDE task definitions for any project. Drop this file into your project and start building task configurations.

## Quick Start

### 1. Create `.zed/tasks.json`

```jsonc
[
  // === SERVER ===
  {
    "label": "server: start",
    "command": "echo '=== Starting Server ===' && bun run dev",
    "use_new_terminal": true,
    "allow_concurrent_runs": false,
    "reveal": "always"
  },

  // === HEALTH ===
  {
    "label": "server: health check",
    "command": "echo '=== Health Check ===' && (set -o pipefail; curl -s http://localhost:3000/health | jq .) || echo 'Status: Not responding'",
    "use_new_terminal": false,
    "allow_concurrent_runs": true,
    "reveal": "always"
  },

  // === TEST ===
  {
    "label": "test: all",
    "command": "echo '=== Running Tests ===' && bun test",
    "use_new_terminal": false,
    "allow_concurrent_runs": false,
    "reveal": "always"
  }
]
```

### 2. Run Tasks

Open Zed's command palette: `Cmd+Shift+P` > type **"task: spawn"** > select a task.

---

## What Are Zed Tasks

Zed tasks are predefined shell commands stored in `.zed/tasks.json`. They provide:

- **One-click execution** from the command palette (`Cmd+Shift+P` > "task: spawn")
- **Integrated terminal output** displayed in Zed's terminal panel
- **JSONC format** supporting comments for organization
- **Parameterized behavior** via `use_new_terminal`, `allow_concurrent_runs`, and `reveal`
- **Environment configuration** via the `env` property

Tasks are project-specific. The `.zed/tasks.json` file lives in the project root and can be version-controlled.

---

## Task Schema Reference

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `label` | string | required | Display name in the command palette |
| `command` | string | required | Shell command to execute |
| `use_new_terminal` | boolean | `false` | Open in a new terminal tab (for interactive/long-running tasks) |
| `allow_concurrent_runs` | boolean | `false` | Allow multiple instances of this task to run simultaneously |
| `reveal` | string | `"always"` | When to show the terminal panel (`"always"` or `"never"`) |
| `cwd` | string | project root | Working directory for the command |
| `env` | object | `{}` | Environment variables passed to the command |

### Example with All Properties

```jsonc
{
  "label": "test: integration",
  "command": "echo '=== Integration Tests ===' && bun test test/integration/",
  "use_new_terminal": false,
  "allow_concurrent_runs": false,
  "reveal": "always",
  "cwd": "/path/to/project",
  "env": {
    "NODE_ENV": "test",
    "LOG_LEVEL": "error"
  }
}
```

---

## Task Types

### One-Shot Tasks

Run a command, display output, and finish. Used for status checks, queries, and quick operations.

```jsonc
{
  "label": "db: status",
  "command": "echo '=== Database Status ===' && (set -o pipefail; curl -s http://localhost:5432/health | jq .) || echo 'Status: Not available'",
  "use_new_terminal": false,
  "allow_concurrent_runs": true,
  "reveal": "always"
}
```

### Interactive Tasks

Open a persistent session in a new terminal tab. Used for CLI tools, REPL sessions, and log streaming.

```jsonc
{
  "label": "db: interactive CLI",
  "command": "psql -h localhost -U app -d myapp",
  "use_new_terminal": true,
  "allow_concurrent_runs": false,
  "reveal": "always"
}
```

### Long-Running Tasks

Start a server or watcher process that runs until manually stopped.

```jsonc
{
  "label": "dev: start (watch mode)",
  "command": "bun run --watch src/index.ts",
  "use_new_terminal": true,
  "allow_concurrent_runs": false,
  "reveal": "always"
}
```

### Property Recommendations by Type

| Type | `use_new_terminal` | `allow_concurrent_runs` | `reveal` |
|------|--------------------|-------------------------|----------|
| One-shot (status, queries) | `false` | `true` | `"always"` |
| Interactive (CLI, REPL) | `true` | `false` | `"always"` |
| Long-running (servers, watchers) | `true` | `false` | `"always"` |
| Background (build, compile) | `false` | `false` | `"always"` |

---

## Naming Conventions

Use the `category: action (qualifier)` pattern for task labels. This provides consistent filtering in the command palette.

### Format

```
category: action
category: action (qualifier)
```

### Recommended Prefixes

| Prefix | Use Case | Examples |
|--------|----------|---------|
| `server:` | App server management | `server: start`, `server: health check`, `server: kill` |
| `dev:` | Development workflow | `dev: start (watch mode)`, `dev: clean restart` |
| `test:` | Testing | `test: all`, `test: unit`, `test: e2e`, `test: coverage` |
| `docker:` | Container management | `docker: ps`, `docker: build`, `docker: logs` |
| `db:` | Database operations | `db: status`, `db: migrate`, `db: seed`, `db: interactive CLI` |
| `cache:` | Cache operations | `cache: ping`, `cache: flush`, `cache: keys` |
| `queue:` | Message queue | `queue: status`, `queue: purge`, `queue: interactive CLI` |
| `deps:` | Dependencies | `deps: up`, `deps: down`, `deps: outdated`, `deps: audit` |
| `quality:` | Linting and formatting | `quality: check`, `quality: fix` |
| `git:` | Version control | `git: status`, `git: recent commits`, `git: branch list` |
| `docs:` | Documentation | `docs: generate`, `docs: serve` |
| `env:` | Environment | `env: show (safe)`, `env: diff`, `env: validate` |
| `infra:` | Infrastructure | `infra: status check`, `infra: up`, `infra: down` |
| `profile:` | Performance profiling | `profile: cpu`, `profile: heap`, `profile: list` |
| `ci:` | CI/CD pipeline | `ci: status`, `ci: trigger build` |

---

## Command Patterns

### Header Echo

Start every command with a header for identification in terminal output:

```bash
echo '=== Task Name ===' && command
```

### curl + jq with Fallback

Safely parse JSON responses with a fallback message:

```bash
(set -o pipefail; curl -s http://localhost:3000/health | jq .) || echo 'Status: Not responding'
```

**Why `set -o pipefail`:** Without it, `curl` failing is masked by `jq` succeeding on empty input.

**Why not `curl -f`:** The `-f` flag suppresses the response body on HTTP errors. If you need the error response body (e.g., for JSON error details), omit `-f`.

### Docker Exec by Filter

Run commands inside containers without hardcoding container IDs:

```bash
docker exec $(docker ps -qf "name=my-service") redis-cli ping
```

### Docker Table Format

Display container information in a readable table:

```bash
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
```

### Process Management

Check if a port is in use and kill the process:

```bash
# Check port
lsof -i :3000

# Kill process on port
kill -9 $(lsof -t -i :3000) 2>/dev/null; echo 'Port 3000 cleared'
```

### Environment Loading from .env

Source variables from a `.env` file before running a command:

```bash
set -a && source .env && set +a && your-command
```

### Aligned Key-Value Output

Display configuration or status in an aligned format:

```bash
echo '=== Configuration ===' && printf '  %-20s %s\n' \
  'Database:' "$DATABASE_URL" \
  'Cache:' "$CACHE_URL" \
  'Log Level:' "$LOG_LEVEL"
```

### Multi-Command with Error Handling

Chain commands with proper error handling:

```bash
echo '=== Deploy ===' && bun run build && bun run test && echo 'Deploy: Ready' || echo 'Deploy: Failed'
```

---

## Organizing with JSONC Comments

Use section separator comments to group related tasks. This makes `.zed/tasks.json` scannable when it grows large.

```jsonc
[
  // === SERVER ===
  { "label": "server: start", "command": "..." },
  { "label": "server: stop", "command": "..." },
  { "label": "server: health check", "command": "..." },

  // === DATABASE ===
  { "label": "db: status", "command": "..." },
  { "label": "db: migrate", "command": "..." },
  { "label": "db: seed", "command": "..." },

  // === TESTING ===
  { "label": "test: all", "command": "..." },
  { "label": "test: unit", "command": "..." },
  { "label": "test: e2e", "command": "..." },

  // === QUALITY ===
  { "label": "quality: check", "command": "..." },
  { "label": "quality: fix", "command": "..." }
]
```

### Naming Convention for Sections

```
// === CATEGORY ===
```

Use uppercase for the category name. Keep sections in a logical order: server, development, infrastructure, database, testing, quality, git, CI/CD.

---

## Task Categories for Any Project

### Service Health

```jsonc
{
  "label": "server: health check",
  "command": "echo '=== Health Check ===' && (set -o pipefail; curl -s http://localhost:3000/health | jq .) || echo 'Status: Not responding'",
  "use_new_terminal": false,
  "allow_concurrent_runs": true,
  "reveal": "always"
}
```

### Development Workflow

```jsonc
{
  "label": "dev: start (watch mode)",
  "command": "bun run --watch src/index.ts",
  "use_new_terminal": true,
  "allow_concurrent_runs": false,
  "reveal": "always"
}
```

### Infrastructure

```jsonc
{
  "label": "infra: status check",
  "command": "echo '=== Infrastructure ===' && echo 'Database:' && (redis-cli -h localhost -p 5432 ping 2>/dev/null && echo '  OK' || echo '  DOWN') && echo 'Cache:' && (redis-cli ping 2>/dev/null && echo '  OK' || echo '  DOWN')",
  "use_new_terminal": false,
  "allow_concurrent_runs": true,
  "reveal": "always"
}
```

### Database

```jsonc
{
  "label": "db: migrate",
  "command": "echo '=== Running Migrations ===' && bun run migrate",
  "use_new_terminal": false,
  "allow_concurrent_runs": false,
  "reveal": "always"
}
```

### Testing

```jsonc
{
  "label": "test: all",
  "command": "echo '=== Running Tests ===' && bun test",
  "use_new_terminal": false,
  "allow_concurrent_runs": false,
  "reveal": "always"
}
```

### Quality

```jsonc
{
  "label": "quality: check",
  "command": "echo '=== Quality Check ===' && bun run typecheck && bun run lint",
  "use_new_terminal": false,
  "allow_concurrent_runs": false,
  "reveal": "always"
}
```

### Git Operations

```jsonc
{
  "label": "git: recent commits",
  "command": "echo '=== Recent Commits ===' && git log --oneline -15",
  "use_new_terminal": false,
  "allow_concurrent_runs": true,
  "reveal": "always"
}
```

### CI/CD

```jsonc
{
  "label": "ci: workflow status",
  "command": "echo '=== CI Status ===' && gh run list --limit 5",
  "use_new_terminal": false,
  "allow_concurrent_runs": true,
  "reveal": "always"
}
```

### Environment

```jsonc
{
  "label": "env: show (safe)",
  "command": "echo '=== Environment ===' && env | grep -v SECRET | grep -v PASSWORD | grep -v TOKEN | sort",
  "use_new_terminal": false,
  "allow_concurrent_runs": true,
  "reveal": "always"
}
```

### Documentation

```jsonc
{
  "label": "docs: generate",
  "command": "echo '=== Generating Docs ===' && bun run docs:generate",
  "use_new_terminal": false,
  "allow_concurrent_runs": false,
  "reveal": "always"
}
```

### Observability

```jsonc
{
  "label": "metrics: endpoint check",
  "command": "echo '=== Metrics ===' && (set -o pipefail; curl -s http://localhost:3000/metrics | head -20) || echo 'Status: Not available'",
  "use_new_terminal": false,
  "allow_concurrent_runs": true,
  "reveal": "always"
}
```

### Containers

```jsonc
{
  "label": "docker: ps",
  "command": "echo '=== Running Containers ===' && docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'",
  "use_new_terminal": false,
  "allow_concurrent_runs": true,
  "reveal": "always"
}
```

---

## Starter tasks.json

Copy this file to `.zed/tasks.json` as a starting point. Customize commands for your project.

```jsonc
[
  // === SERVER ===
  {
    "label": "server: start",
    "command": "bun run dev",
    "use_new_terminal": true,
    "allow_concurrent_runs": false,
    "reveal": "always"
  },
  {
    "label": "server: health check",
    "command": "echo '=== Health Check ===' && (set -o pipefail; curl -s http://localhost:3000/health | jq .) || echo 'Status: Not responding'",
    "use_new_terminal": false,
    "allow_concurrent_runs": true,
    "reveal": "always"
  },
  {
    "label": "server: kill (port 3000)",
    "command": "echo '=== Killing Port 3000 ===' && kill -9 $(lsof -t -i :3000) 2>/dev/null && echo 'Process killed' || echo 'No process on port 3000'",
    "use_new_terminal": false,
    "allow_concurrent_runs": false,
    "reveal": "always"
  },

  // === DEVELOPMENT ===
  {
    "label": "dev: start (watch mode)",
    "command": "bun run --watch src/index.ts",
    "use_new_terminal": true,
    "allow_concurrent_runs": false,
    "reveal": "always"
  },
  {
    "label": "dev: clean restart",
    "command": "echo '=== Clean Restart ===' && kill -9 $(lsof -t -i :3000) 2>/dev/null; bun run dev",
    "use_new_terminal": true,
    "allow_concurrent_runs": false,
    "reveal": "always"
  },

  // === TESTING ===
  {
    "label": "test: all",
    "command": "echo '=== Running Tests ===' && bun test",
    "use_new_terminal": false,
    "allow_concurrent_runs": false,
    "reveal": "always"
  },
  {
    "label": "test: watch",
    "command": "bun test --watch",
    "use_new_terminal": true,
    "allow_concurrent_runs": false,
    "reveal": "always"
  },
  {
    "label": "test: coverage",
    "command": "echo '=== Test Coverage ===' && bun test --coverage",
    "use_new_terminal": false,
    "allow_concurrent_runs": false,
    "reveal": "always"
  },

  // === QUALITY ===
  {
    "label": "quality: check",
    "command": "echo '=== Quality Check ===' && bun run typecheck && bun run lint",
    "use_new_terminal": false,
    "allow_concurrent_runs": false,
    "reveal": "always"
  },
  {
    "label": "quality: fix",
    "command": "echo '=== Auto-fixing ===' && bun run lint --fix",
    "use_new_terminal": false,
    "allow_concurrent_runs": false,
    "reveal": "always"
  },

  // === DATABASE ===
  {
    "label": "db: status",
    "command": "echo '=== Database Status ===' && pg_isready -h localhost -U app -d myapp && echo 'Status: Ready' || echo 'Status: Not available'",
    "use_new_terminal": false,
    "allow_concurrent_runs": true,
    "reveal": "always"
  },
  {
    "label": "db: migrate",
    "command": "echo '=== Running Migrations ===' && bun run migrate",
    "use_new_terminal": false,
    "allow_concurrent_runs": false,
    "reveal": "always"
  },

  // === CACHE ===
  {
    "label": "cache: ping",
    "command": "echo '=== Cache Ping ===' && redis-cli ping && echo 'Status: Connected' || echo 'Status: Not available'",
    "use_new_terminal": false,
    "allow_concurrent_runs": true,
    "reveal": "always"
  },
  {
    "label": "cache: flush",
    "command": "echo '=== Flushing Cache ===' && redis-cli flushall && echo 'Cache cleared'",
    "use_new_terminal": false,
    "allow_concurrent_runs": false,
    "reveal": "always"
  },

  // === DOCKER ===
  {
    "label": "docker: ps",
    "command": "echo '=== Running Containers ===' && docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'",
    "use_new_terminal": false,
    "allow_concurrent_runs": true,
    "reveal": "always"
  },
  {
    "label": "docker: build",
    "command": "echo '=== Building Image ===' && docker build -t myapp:latest .",
    "use_new_terminal": false,
    "allow_concurrent_runs": false,
    "reveal": "always"
  },

  // === GIT ===
  {
    "label": "git: status",
    "command": "echo '=== Git Status ===' && git status",
    "use_new_terminal": false,
    "allow_concurrent_runs": true,
    "reveal": "always"
  },
  {
    "label": "git: recent commits",
    "command": "echo '=== Recent Commits ===' && git log --oneline -15",
    "use_new_terminal": false,
    "allow_concurrent_runs": true,
    "reveal": "always"
  },

  // === ENVIRONMENT ===
  {
    "label": "env: show (safe)",
    "command": "echo '=== Environment (filtered) ===' && env | grep -v SECRET | grep -v PASSWORD | grep -v TOKEN | grep -v KEY | sort",
    "use_new_terminal": false,
    "allow_concurrent_runs": true,
    "reveal": "always"
  },

  // === DEPENDENCIES ===
  {
    "label": "deps: outdated",
    "command": "echo '=== Outdated Packages ===' && bun outdated",
    "use_new_terminal": false,
    "allow_concurrent_runs": true,
    "reveal": "always"
  }
]
```

---

## Best Practices

1. **Use consistent `category: action` naming** -- makes tasks filterable and predictable in the command palette

2. **Add JSONC section comments** -- `// === CATEGORY ===` separators keep large task files navigable

3. **Prevent concurrent server tasks** -- set `allow_concurrent_runs: false` for servers and watchers to avoid port conflicts

4. **Include error fallbacks** -- use `(set -o pipefail; command | jq .) || echo 'Fallback'` for curl-based tasks

5. **Add header echoes** -- `echo '=== Task Name ==='` at the start of each command identifies output in shared terminals

6. **Keep tasks atomic** -- each task should do one thing well; chain multiple tasks manually when needed

7. **Use `use_new_terminal: true` for interactive tasks** -- CLI sessions, log streaming, and watch mode need their own terminal

8. **Avoid hardcoded paths** -- use relative paths or environment variables for portability across machines

9. **Filter sensitive data** -- strip secrets from output using `grep -v SECRET | grep -v PASSWORD`

10. **Version control `.zed/tasks.json`** -- tasks are project knowledge; share them with the team

---

## Anti-Patterns

### 1. Hardcoded Container IDs

```jsonc
// BAD: container ID changes on every restart
{ "command": "docker exec abc123 redis-cli ping" }

// GOOD: filter by name
{ "command": "docker exec $(docker ps -qf 'name=my-cache') redis-cli ping" }
```

### 2. Missing pipefail

```jsonc
// BAD: curl failure masked by jq
{ "command": "curl -s http://localhost:3000/health | jq ." }

// GOOD: pipefail catches curl errors
{ "command": "(set -o pipefail; curl -s http://localhost:3000/health | jq .) || echo 'Not responding'" }
```

### 3. Concurrent Server Tasks

```jsonc
// BAD: multiple server instances fight for the same port
{ "label": "dev: start", "allow_concurrent_runs": true }

// GOOD: prevent multiple instances
{ "label": "dev: start", "allow_concurrent_runs": false }
```

### 4. Using curl -f with jq

```jsonc
// BAD: -f suppresses the error response body
{ "command": "curl -sf http://localhost:3000/health | jq ." }

// GOOD: omit -f to preserve error details
{ "command": "(set -o pipefail; curl -s http://localhost:3000/health | jq .) || echo 'Not responding'" }
```

### 5. No Identification in Output

```jsonc
// BAD: no context when scrolling through terminal history
{ "command": "curl -s http://localhost:3000/health | jq ." }

// GOOD: header identifies the task
{ "command": "echo '=== Health Check ===' && (set -o pipefail; curl -s http://localhost:3000/health | jq .) || echo 'Not responding'" }
```

### 6. Infinite Retry Loops

```jsonc
// BAD: never exits if service is down
{ "command": "while ! curl -s localhost:3000/health; do sleep 1; done" }

// GOOD: bounded retry with exit
{ "command": "for i in $(seq 1 10); do curl -s localhost:3000/health && exit 0; sleep 2; done; echo 'Timed out'" }
```
