# Zed IDE DevContainer Setup

Containerized infrastructure for local Bun development. Your app runs natively; Kong, Redis, and Postgres run in Docker.

## Architecture

```
Host Machine
  |-- Bun app (native, localhost:3000)
  |     |-- connects to --> localhost:8001 (Kong Admin)
  |     |-- connects to --> localhost:6379 (Redis)
  |
  +-- Docker (via .devcontainer/)
        |-- Kong 3.9 (:8000, :8001, :8002)
        |-- PostgreSQL 16 (:5432)
        |-- Redis 7 (:6379)
        +-- Toolbox (admin shell for Zed)
```

Your Bun app calls Kong and Redis as clients - Kong does **not** proxy back to your app.

## Quick Start

### Option 1: Zed IDE (Recommended)

1. Open the project folder in Zed
2. Click **"Open in Dev Container"**
3. Infrastructure starts automatically (Kong, Postgres, Redis)
4. Run your Bun app locally as usual

### Option 2: Command Line

```bash
# Start infrastructure
bun run devcontainer:up

# Start app with devcontainer environment
bun run dev:devcontainer

# Stop infrastructure
bun run devcontainer:down
```

## Services

| Service | Port | Connect from your app |
|---------|------|-----------------------|
| Kong Admin | 8001 | `http://localhost:8001` |
| Kong Proxy | 8000 | `http://localhost:8000` |
| Kong Manager | 8002 | `http://localhost:8002` |
| Redis | 6379 | `redis://localhost:6379` |
| PostgreSQL | 5432 | `localhost:5432` |

Data persists via Docker named volumes (`kong-db-data`, `redis-data`).

## Kong Configuration with decK

The decK config lives at **`kong/kong.yml`** in your project root - version-controlled alongside your code. Manage it from your host terminal:

```bash
# Sync configuration to Kong
deck gateway sync kong/kong.yml

# Dump current Kong state
deck gateway dump -o kong/kong.yml

# Show configuration drift
deck gateway diff kong/kong.yml
```

Or use the Zed tasks via `Cmd+Shift+P` -> "task: spawn".

## Zed Tasks

| Task | What it does |
|------|-------------|
| `kong: status` | Check Kong health |
| `kong: list services` | Show configured services |
| `kong: list routes` | Show configured routes |
| `kong: list plugins` | Show active plugins |
| `kong: sync config (decK)` | Apply declarative config |
| `kong: dump config (decK)` | Export current Kong state |
| `kong: diff config (decK)` | Show config drift |
| `kong: view logs` | Tail Kong container logs |
| `kong: restart` | Restart the Kong container |
| `redis: ping` | Check Redis connectivity |
| `redis: monitor` | Live stream all Redis commands |
| `redis: info stats` | Redis server statistics |
| `redis: keys (all)` | List all Redis keys |
| `redis: flush all` | Clear all Redis data |
| `redis: interactive CLI` | Open redis-cli session |
| `postgres: interactive psql` | Open psql session |
| `postgres: list tables` | List Kong tables |
| `postgres: kong services (SQL)` | Query Kong services table |
| `postgres: kong routes (SQL)` | Query Kong routes table |
| `postgres: db size` | Show database size |
| `infra: status check` | Verify Kong + Redis + Postgres health |

## Environment Workflow

The project maintains two development modes:

| Mode | Command | KONG_ADMIN_URL | Use Case |
|------|---------|----------------|----------|
| Live Testing | `bun run dev` | `http://192.168.178.3:30001` | Tests against real Kong |
| DevContainer | `bun run dev:devcontainer` | `http://localhost:8001` | Local Docker development |

### Switching Between Modes

```bash
# Live testing mode (default)
bun run dev

# DevContainer mode
bun run devcontainer:up        # Start Docker infrastructure
bun run dev:devcontainer       # Start with devcontainer env

# Return to live testing
bun run devcontainer:down      # Stop Docker infrastructure
bun run dev                    # Back to live testing
```

## Scripts

| Script | Description |
|--------|-------------|
| `devcontainer:up` | Start infrastructure containers |
| `devcontainer:down` | Stop infrastructure containers |
| `devcontainer:down:clean` | Stop and remove volumes (full reset) |
| `devcontainer:logs` | Follow infrastructure logs |
| `devcontainer:status` | Show running containers |
| `dev:devcontainer` | Copy .env.devcontainer and start dev server |

## File Structure

```
project-root/
|-- .devcontainer/
|   |-- devcontainer.json      # Zed-compatible dev container spec
|   |-- docker-compose.yml     # Kong + Redis + Postgres + toolbox
|   +-- post-create.sh         # Installs decK, httpie, redis-cli
|-- .zed/
|   |-- tasks.json             # Infra management tasks
|   +-- settings.json          # Project settings + env vars
|-- kong/
|   +-- kong.yml               # decK config (version-controlled)
|-- .env.devcontainer          # DevContainer environment variables
+-- ...
```

## Port Conflicts

DevContainer uses standard ports that may conflict with other services:

| DevContainer | Test Compose | Notes |
|--------------|--------------|-------|
| 8000, 8001 | 8100, 8101 | No conflict |
| 6379 | 6380 | No conflict |
| 5432 | 5433 | No conflict |

DevContainer and test infrastructure (`docker-compose.test.yml`) can run simultaneously.

## Troubleshooting

### Config changes to devcontainer.json

Zed doesn't auto-rebuild. Stop the container and reopen:
```bash
docker compose -f .devcontainer/docker-compose.yml down
# Then reopen in Zed
```

### Data reset

```bash
# Keep volumes (preserves data)
bun run devcontainer:down

# Destroy volumes (full reset)
bun run devcontainer:down:clean
```

### Redis-only reset

Use the `redis: flush all` Zed task or:
```bash
redis-cli -h localhost flushall
```
