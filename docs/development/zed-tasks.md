# Zed Tasks Reference

This document describes the Zed IDE tasks available in `.zed/tasks.json` for managing infrastructure, development, and deployment workflows.

## Overview

The project includes 97 pre-configured Zed tasks organized by category. Tasks can be run from Zed's command palette (`Cmd+Shift+P` > "task: spawn").

## Task Categories

| Category | Count | Description |
|----------|-------|-------------|
| Kong | 9 | API Gateway management |
| Redis | 15 | Redis cache operations |
| Valkey | 12 | Valkey cache operations |
| Postgres | 5 | Kong database queries |
| Infrastructure | 6 | Combined status checks |
| Devcontainer | 7 | Docker Compose management |
| Development | 6 | Server and dev workflows |
| Testing | 6 | Unit, E2E, and performance tests |
| Quality | 2 | Linting and formatting |
| GitHub | 7 | Security alerts and workflows |
| OTEL | 12 | OpenTelemetry observability |
| Docker | 10 | Image verification and security |

---

## Kong Tasks

| Task | Description |
|------|-------------|
| `kong: status` | Gateway status (connections, memory) |
| `kong: list services` | All registered services |
| `kong: list routes` | All registered routes |
| `kong: list plugins` | All enabled plugins |
| `kong: sync config (decK)` | Sync `kong/kong.yml` to gateway |
| `kong: dump config (decK)` | Export current config as YAML |
| `kong: diff config (decK)` | Show pending config changes |
| `kong: view logs` | Stream Kong container logs |
| `kong: restart` | Restart Kong container |

**Prerequisites:** Kong running on `localhost:8001`

---

## Redis Tasks

| Task | Description |
|------|-------------|
| `redis: ping` | Health check (PONG response) |
| `redis: monitor (live commands)` | Stream all commands in real-time |
| `redis: info stats` | Server statistics |
| `redis: keys (all)` | List all keys |
| `redis: flush all` | Clear all data |
| `redis: interactive CLI` | Open redis-cli session |
| `redis: start (standalone)` | Start standalone container (port 6379) |
| `redis: stop` | Stop standalone container |
| `redis: remove` | Remove standalone container |
| `redis: restart (standalone)` | Full restart cycle |
| `redis: logs` | Stream container logs |
| `redis: status` | Container status |
| `redis: bigkeys` | Find largest keys |
| `redis: memkeys` | Memory usage by key |
| `redis: scan auth keys` | Find auth_service keys |

**Standalone Configuration:**
- Container: `auth-redis`
- Port: `6379`
- Memory: 128MB with LRU eviction
- Persistence: AOF enabled

---

## Valkey Tasks

| Task | Description |
|------|-------------|
| `valkey: ping` | Health check (PONG response) |
| `valkey: info server` | Server information |
| `valkey: info stats` | Server statistics |
| `valkey: keys (all)` | List all keys |
| `valkey: flush all` | Clear all data |
| `valkey: interactive CLI` | Open valkey-cli session |
| `valkey: start (standalone)` | Start standalone container (port 6380) |
| `valkey: stop` | Stop standalone container |
| `valkey: remove` | Remove standalone container |
| `valkey: restart (standalone)` | Full restart cycle |
| `valkey: logs` | Stream container logs |
| `valkey: status` | Container status |

**Standalone Configuration:**
- Container: `auth-valkey`
- Port: `6380`
- Memory: 128MB with LRU eviction
- Persistence: AOF enabled

---

## Postgres Tasks

| Task | Description |
|------|-------------|
| `postgres: interactive psql` | Open psql session |
| `postgres: list tables` | Show Kong database tables |
| `postgres: kong services (SQL)` | Query services table |
| `postgres: kong routes (SQL)` | Query routes table |
| `postgres: db size` | Database size |

**Connection:** Uses Kong database container (`kong-db`)

---

## Infrastructure Tasks

| Task | Description |
|------|-------------|
| `infra: status check` | Check all services (Kong, Redis, Valkey, Postgres) |
| `deps: up (Kong + Redis)` | Start Kong and Redis |
| `deps: up (Kong + Valkey)` | Start Kong and Valkey |
| `deps: up (all)` | Start all dependencies |
| `deps: down` | Stop all dependencies |
| `docker: ps` | List running containers |
| `docker: ps (all)` | List all containers |

---

## Devcontainer Tasks

| Task | Description |
|------|-------------|
| `devcontainer: up` | Start full devcontainer stack |
| `devcontainer: down` | Stop devcontainer |
| `devcontainer: down (clean volumes)` | Stop and remove volumes |
| `devcontainer: logs` | Stream all container logs |
| `devcontainer: status` | Show container status |

**Compose File:** `.devcontainer/docker-compose.yml`

---

## Development Tasks

| Task | Description |
|------|-------------|
| `dev: start (watch mode)` | Start with hot reload |
| `dev: start (devcontainer env)` | Start with devcontainer config |
| `dev: start with Valkey` | Start using Valkey cache |
| `dev: clean restart` | Kill port 3000 and restart |
| `dev: quickstart` | Generate OpenAPI, then start |
| `server: kill (port 3000)` | Kill process on port 3000 |
| `server: health check` | Full health endpoint response |
| `server: health check (Valkey)` | Cache-specific health |

---

## Testing Tasks

| Task | Description |
|------|-------------|
| `test: bun (all)` | Run all Bun tests |
| `test: bun (watch)` | Watch mode for tests |
| `test: e2e (direct)` | Playwright tests (direct) |
| `test: e2e (via Kong)` | Playwright tests (via gateway) |
| `test: e2e UI` | Playwright UI mode |
| `test: k6 smoke (quick)` | Quick performance smoke tests |

---

## Quality Tasks

| Task | Description |
|------|-------------|
| `quality: check (all)` | Run all quality checks |
| `quality: fix` | Auto-fix quality issues |
| `docs: generate OpenAPI` | Generate OpenAPI spec |

---

## GitHub Tasks

| Task | Description |
|------|-------------|
| `github: security alerts (open only)` | Open code scanning alerts |
| `github: security alerts (all)` | All code scanning alerts |
| `github: security alerts (Dependabot)` | Open Dependabot alerts |
| `github: trigger security audit` | Run security audit workflow |
| `github: docker security (Trivy)` | CVEs from latest build |
| `github: latest workflow run` | Recent CI/CD runs |
| `github: workflow artifacts` | Artifacts from latest run |

**Prerequisites:** GitHub CLI (`gh`) authenticated

---

## OpenTelemetry Tasks

| Task | Description |
|------|-------------|
| `otel: status (all endpoints)` | Check all OTLP endpoints |
| `otel: ping collector` | Test collector connectivity |
| `otel: traces endpoint check` | Test traces endpoint |
| `otel: metrics endpoint check` | Test metrics endpoint |
| `otel: logs endpoint check` | Test logs endpoint |
| `otel: show config` | Display OTEL configuration |
| `otel: network connectivity test` | TCP connectivity test |
| `otel: service telemetry health` | Service telemetry status |
| `otel: ssh tunnel start` | Start SSH tunnel to collector |
| `otel: ssh tunnel stop` | Stop SSH tunnel |
| `otel: ssh tunnel status` | Check tunnel status |

**Configuration:** Loaded from `.env` file

---

## Docker Image Tasks

| Task | Description |
|------|-------------|
| `docker: scout CVEs (pushed image)` | Scan for CRITICAL/HIGH CVEs |
| `docker: scout quickview (pushed image)` | Security overview |
| `docker: scout SBOM (pushed image)` | Software Bill of Materials |
| `docker: scout recommendations` | Base image recommendations |
| `docker: inspect labels (pushed image)` | OCI labels |
| `docker: verify metadata (pushed image)` | Version, created, revision |
| `docker: verify version (registry API)` | Registry tags and platforms |
| `docker: image size (pushed)` | Image manifest and sizes |
| `docker: attestations (SLSA provenance)` | SLSA attestations |

**Image:** `docker.io/zx8086/authentication-v2:latest`

---

## Task Properties

Tasks use the following Zed task properties:

| Property | Values | Description |
|----------|--------|-------------|
| `use_new_terminal` | `true/false` | Open in new terminal tab |
| `allow_concurrent_runs` | `true/false` | Allow multiple instances |
| `reveal` | `always` | Show output panel |

- **Interactive tasks** (logs, CLI sessions) use `use_new_terminal: true`
- **One-shot tasks** (status, queries) use `reveal: always`

---

## Output Format

All tasks include a header for identification:

```
=== Task Name ===
[output]
```

Tasks show full output without filtering to provide complete information for debugging and verification.

---

## Adding New Tasks

Edit `.zed/tasks.json` to add tasks:

```json
{
  "label": "category: task name",
  "command": "echo '=== Task Header ===' && your-command-here",
  "use_new_terminal": false,
  "reveal": "always",
}
```

**Conventions:**
- Use `category: name` format for labels
- Include `=== Header ===` echo for identification
- Use `jq .` for JSON output formatting
- Use `2>&1` to capture stderr when needed
