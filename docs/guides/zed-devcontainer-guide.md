# Zed DevContainer Guide

Standalone guide to building devcontainer configurations for any project using Zed IDE. Drop this file into your project and start building containerized development environments.

## Quick Start

### 1. Create `.devcontainer/devcontainer.json`

```jsonc
{
  "name": "My Project Dev Environment",
  "dockerComposeFile": "docker-compose.yml",
  "service": "toolbox",
  "runServices": ["toolbox"],
  "workspaceFolder": "/workspaces/${localWorkspaceFolderBasename}",
  "appPort": [3000, 5432, 6379],
  "postCreateCommand": ".devcontainer/post-create.sh",
  "remoteEnv": {
    "DATABASE_URL": "postgresql://app:secret@db:5432/myapp",
    "CACHE_URL": "redis://cache:6379"
  }
}
```

### 2. Create `.devcontainer/docker-compose.yml`

```yaml
services:
  toolbox:
    image: mcr.microsoft.com/devcontainers/base:ubuntu
    volumes:
      - ..:/workspaces/${COMPOSE_PROJECT_NAME:-myproject}:cached
    command: sleep infinity
    depends_on:
      db:
        condition: service_healthy
      cache:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: myapp
    ports:
      - "5432:5432"
    volumes:
      - db-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d myapp"]
      interval: 5s
      timeout: 3s
      retries: 5

  cache:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - cache-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

volumes:
  db-data:
  cache-data:
```

### 3. Open in Zed

1. Open the project folder in Zed
2. Click **"Open in Dev Container"** when prompted
3. Infrastructure starts automatically
4. Run your app locally as usual

---

## Architecture

DevContainers use a **toolbox pattern**: your application runs natively on the host machine while infrastructure services run in Docker containers. This gives you fast edit-reload cycles with production-like dependencies.

```
Host Machine                              Docker (via .devcontainer/)
+---------------------------+             +---------------------------+
| Your app (localhost:3000) |<----------->| Database (:5432)          |
|   |                       |  connects   |   |                      |
|   +-- Database client ----|------------>|   +-- healthcheck         |
|   +-- Cache client -------|------------>| Cache (:6379)             |
|   +-- Queue client -------|------------>|   +-- healthcheck         |
+---------------------------+             | Queue (:5672)             |
                                          |   +-- healthcheck         |
                                          | Toolbox (sleep infinity)  |
                                          |   +-- post-create.sh      |
                                          +---------------------------+
```

**How it works:**
- The `toolbox` service is a lightweight container that anchors the devcontainer lifecycle
- Infrastructure services (database, cache, queue) run alongside the toolbox
- Your app connects to services via `localhost:<port>` (ports are forwarded from Docker)
- Services connect back to your app via `host.docker.internal:<port>` when needed

---

## devcontainer.json Reference

| Property | Type | Description |
|----------|------|-------------|
| `name` | string | Display name in Zed's title bar |
| `dockerComposeFile` | string | Path to docker-compose.yml (relative to `.devcontainer/`) |
| `service` | string | Primary service that anchors the container lifecycle |
| `runServices` | string[] | Which services to start (subset of compose file) |
| `workspaceFolder` | string | Path inside the container where the project is mounted |
| `appPort` | number[] | Ports to forward from container to host |
| `postCreateCommand` | string | Script to run after container creation (one-time setup) |
| `postStartCommand` | string | Script to run each time the container starts |
| `remoteEnv` | object | Environment variables set inside the toolbox container |
| `features` | object | Dev container features to install (e.g., git, docker-in-docker) |
| `remoteUser` | string | User to run as inside the container (default: root) |

### Property Notes

- `runServices` controls which services start. Omit it to start all services in the compose file.
- `postCreateCommand` runs once after the container is first created. Use it for tool installation.
- `postStartCommand` runs every time the container starts. Use it for service readiness checks.
- `remoteEnv` variables are available inside the toolbox container, not in other services.

---

## docker-compose.yml Patterns

### Toolbox Service

The toolbox service anchors the devcontainer lifecycle. It stays running via `sleep infinity` while other services do the real work.

```yaml
services:
  toolbox:
    image: mcr.microsoft.com/devcontainers/base:ubuntu
    volumes:
      - ..:/workspaces/${COMPOSE_PROJECT_NAME:-myproject}:cached
    command: sleep infinity
    depends_on:
      db:
        condition: service_healthy
      cache:
        condition: service_healthy
```

**Key points:**
- `volumes` mounts the project root (`..` from `.devcontainer/`) into the container
- `:cached` improves file system performance on macOS
- `depends_on` with `condition: service_healthy` ensures services are ready before the toolbox starts
- `sleep infinity` keeps the container alive without consuming resources

### Healthchecks

Every service should have a healthcheck. This enables `depends_on` conditions and prevents race conditions during startup.

```yaml
# PostgreSQL
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U app -d myapp"]
  interval: 5s
  timeout: 3s
  retries: 5

# Redis / Valkey
healthcheck:
  test: ["CMD", "redis-cli", "ping"]
  interval: 5s
  timeout: 3s
  retries: 5

# MySQL
healthcheck:
  test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
  interval: 5s
  timeout: 3s
  retries: 5

# MongoDB
healthcheck:
  test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
  interval: 5s
  timeout: 3s
  retries: 5

# RabbitMQ
healthcheck:
  test: ["CMD", "rabbitmq-diagnostics", "-q", "ping"]
  interval: 10s
  timeout: 5s
  retries: 5

# Custom HTTP service
healthcheck:
  test: ["CMD-SHELL", "curl -sf http://localhost:8080/health || exit 1"]
  interval: 10s
  timeout: 5s
  retries: 5
```

### depends_on Conditions

```yaml
depends_on:
  db:
    condition: service_healthy      # Wait for healthcheck to pass
  migration:
    condition: service_completed_successfully  # Wait for one-off task
```

Use `service_healthy` for long-running services. Use `service_completed_successfully` for one-off tasks like database migrations.

### One-Off Migration Services

Services that run once and exit (database migrations, seed scripts):

```yaml
services:
  migration:
    image: postgres:16-alpine
    depends_on:
      db:
        condition: service_healthy
    environment:
      PGHOST: db
      PGUSER: app
      PGPASSWORD: secret
      PGDATABASE: myapp
    volumes:
      - ../migrations:/migrations:ro
    command: >
      sh -c "for f in /migrations/*.sql; do psql -f $$f; done"
    restart: "no"
```

The toolbox can then depend on the migration with `condition: service_completed_successfully`.

### Named Volumes

```yaml
volumes:
  db-data:          # Database persistence
  cache-data:       # Cache persistence
  queue-data:       # Message queue persistence
```

Named volumes survive `docker compose down`. Only `docker compose down -v` removes them.

### Bridge Networks

Docker Compose creates a default bridge network. Services reference each other by service name:

```yaml
# From the toolbox or any service:
# db:5432     -- connects to the database
# cache:6379  -- connects to the cache
# queue:5672  -- connects to the queue
```

For explicit network control:

```yaml
networks:
  backend:
    driver: bridge

services:
  db:
    networks: [backend]
  cache:
    networks: [backend]
  toolbox:
    networks: [backend]
```

---

## Post-Create Scripts

The `postCreateCommand` runs once after the container is created. Use it to install tools and verify service readiness.

### Template

```bash
#!/usr/bin/env bash
set -euo pipefail

echo "=== Installing Tools ==="

# Install CLI tools
apt-get update -qq && apt-get install -y -qq httpie jq > /dev/null 2>&1

# Install project-specific tools
# Example: database CLI, API gateway CLI, etc.

echo "=== Checking Service Readiness ==="

# Wait for database
for i in $(seq 1 30); do
  if pg_isready -h db -U app -d myapp > /dev/null 2>&1; then
    echo "Database: ready"
    break
  fi
  echo "Waiting for database... ($i/30)"
  sleep 2
done

# Wait for cache
for i in $(seq 1 30); do
  if redis-cli -h cache ping > /dev/null 2>&1; then
    echo "Cache: ready"
    break
  fi
  echo "Waiting for cache... ($i/30)"
  sleep 2
done

echo "=== Environment Ready ==="
echo "  Database: db:5432"
echo "  Cache:    cache:6379"
echo "  App:      localhost:3000"
```

**Best practices:**
- Always start with `set -euo pipefail` to fail on errors
- Redirect verbose install output to `/dev/null`
- Use bounded loops (not infinite) for service readiness checks
- End with a summary banner showing connection details

---

## Environment Variables

### Where to Define Variables

| Location | Scope | Use Case |
|----------|-------|----------|
| `remoteEnv` in devcontainer.json | Toolbox container only | App configuration (DB URL, API keys) |
| `environment` in docker-compose.yml | Per-service | Service configuration (Postgres user, Redis maxmemory) |
| `.env` file | All compose services | Shared values, secrets |

### remoteEnv (Toolbox)

Variables set in `remoteEnv` are available inside the toolbox container. Use these for your application configuration:

```jsonc
{
  "remoteEnv": {
    "DATABASE_URL": "postgresql://app:secret@db:5432/myapp",
    "CACHE_URL": "redis://cache:6379",
    "NODE_ENV": "development",
    "LOG_LEVEL": "debug"
  }
}
```

### Per-Service Environment

Variables set in `environment` blocks configure individual services:

```yaml
services:
  db:
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: myapp

  cache:
    environment:
      REDIS_MAXMEMORY: 128mb
      REDIS_MAXMEMORY_POLICY: allkeys-lru
```

### Internal Docker Hostnames vs Localhost Ports

| From | Connect to Database | Connect to Cache |
|------|---------------------|------------------|
| Inside Docker (toolbox, other services) | `db:5432` | `cache:6379` |
| Host machine (your app, browser) | `localhost:5432` | `localhost:6379` |

Services inside Docker use service names as hostnames. Your app on the host uses `localhost` with forwarded ports.

---

## Port Forwarding

### Mapping Strategy

Define ports in `docker-compose.yml` using `host:container` format:

```yaml
services:
  db:
    ports:
      - "5432:5432"   # Standard port
  cache:
    ports:
      - "6379:6379"   # Standard port
  gateway:
    ports:
      - "8000:8000"   # Proxy
      - "8001:8001"   # Admin API
```

Also list them in `devcontainer.json` `appPort` for Zed to forward:

```jsonc
{
  "appPort": [3000, 5432, 6379, 8000, 8001]
}
```

### Offset Ports for Parallel Stacks

When running multiple devcontainer stacks simultaneously, offset ports to avoid conflicts:

| Service | Stack A (default) | Stack B (+100) | Stack C (+200) |
|---------|-------------------|----------------|----------------|
| App | 3000 | 3100 | 3200 |
| Database | 5432 | 5532 | 5632 |
| Cache | 6379 | 6479 | 6579 |

```yaml
# Stack B docker-compose.yml
services:
  db:
    ports:
      - "5532:5432"
  cache:
    ports:
      - "6479:6379"
```

### Common Port Table

| Service | Default Port | Protocol |
|---------|-------------|----------|
| PostgreSQL | 5432 | TCP |
| MySQL | 3306 | TCP |
| MongoDB | 27017 | TCP |
| Redis / Valkey | 6379 | TCP |
| RabbitMQ | 5672 (AMQP), 15672 (Management) | TCP |
| Elasticsearch | 9200 (HTTP), 9300 (Transport) | TCP |
| MinIO | 9000 (API), 9001 (Console) | TCP |

---

## Volume Persistence

### Named Volumes (Databases, Caches)

Named volumes persist data across container restarts and rebuilds:

```yaml
volumes:
  db-data:
  cache-data:
  search-data:

services:
  db:
    volumes:
      - db-data:/var/lib/postgresql/data
  cache:
    volumes:
      - cache-data:/data
```

**Lifecycle:**
- `docker compose down` -- containers stop, volumes preserved
- `docker compose down -v` -- containers stop, volumes deleted (full reset)
- `docker compose up` -- containers start, volumes reattached

### Bind Mounts (Workspace, Config)

Bind mounts link host directories into containers:

```yaml
services:
  toolbox:
    volumes:
      - ..:/workspaces/${COMPOSE_PROJECT_NAME:-myproject}:cached  # Workspace
      - ../config/gateway.yml:/etc/gateway/gateway.yml:ro          # Config file
      - ../migrations:/migrations:ro                                # Migration scripts
```

**Flags:**
- `:cached` -- improves performance on macOS (host is source of truth)
- `:ro` -- read-only mount (prevents container from modifying host files)

### Naming Conventions

Use descriptive volume names that indicate the service and data type:

```yaml
volumes:
  postgres-data:       # PostgreSQL data directory
  redis-data:          # Redis persistence
  minio-data:          # Object storage data
  rabbitmq-data:       # Message queue data
```

---

## Example Templates

### Template A: App + Database + Cache

Full stack with PostgreSQL, Redis, and a migration service.

```yaml
# .devcontainer/docker-compose.yml
services:
  toolbox:
    image: mcr.microsoft.com/devcontainers/base:ubuntu
    volumes:
      - ..:/workspaces/${COMPOSE_PROJECT_NAME:-myproject}:cached
    command: sleep infinity
    depends_on:
      db:
        condition: service_healthy
      cache:
        condition: service_healthy
      migration:
        condition: service_completed_successfully

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: myapp
    ports:
      - "5432:5432"
    volumes:
      - db-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d myapp"]
      interval: 5s
      timeout: 3s
      retries: 5

  cache:
    image: redis:7-alpine
    command: redis-server --maxmemory 128mb --maxmemory-policy allkeys-lru --appendonly yes
    ports:
      - "6379:6379"
    volumes:
      - cache-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  migration:
    image: postgres:16-alpine
    depends_on:
      db:
        condition: service_healthy
    environment:
      PGHOST: db
      PGUSER: app
      PGPASSWORD: secret
      PGDATABASE: myapp
    volumes:
      - ../migrations:/migrations:ro
    command: >
      sh -c "for f in /migrations/*.sql; do echo \"Running $$f\"; psql -f $$f; done"
    restart: "no"

volumes:
  db-data:
  cache-data:
```

```jsonc
// .devcontainer/devcontainer.json
{
  "name": "App + Database + Cache",
  "dockerComposeFile": "docker-compose.yml",
  "service": "toolbox",
  "workspaceFolder": "/workspaces/${localWorkspaceFolderBasename}",
  "appPort": [3000, 5432, 6379],
  "postCreateCommand": ".devcontainer/post-create.sh",
  "remoteEnv": {
    "DATABASE_URL": "postgresql://app:secret@db:5432/myapp",
    "CACHE_URL": "redis://cache:6379"
  }
}
```

### Template B: App + Database

Minimal setup with just a database.

```yaml
# .devcontainer/docker-compose.yml
services:
  toolbox:
    image: mcr.microsoft.com/devcontainers/base:ubuntu
    volumes:
      - ..:/workspaces/${COMPOSE_PROJECT_NAME:-myproject}:cached
    command: sleep infinity
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: myapp
    ports:
      - "5432:5432"
    volumes:
      - db-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d myapp"]
      interval: 5s
      timeout: 3s
      retries: 5

volumes:
  db-data:
```

```jsonc
// .devcontainer/devcontainer.json
{
  "name": "App + Database",
  "dockerComposeFile": "docker-compose.yml",
  "service": "toolbox",
  "workspaceFolder": "/workspaces/${localWorkspaceFolderBasename}",
  "appPort": [3000, 5432],
  "postCreateCommand": ".devcontainer/post-create.sh",
  "remoteEnv": {
    "DATABASE_URL": "postgresql://app:secret@db:5432/myapp"
  }
}
```

### Template C: API Gateway + Backend + Database

Full stack with an API gateway that proxies requests to your app.

```yaml
# .devcontainer/docker-compose.yml
services:
  toolbox:
    image: mcr.microsoft.com/devcontainers/base:ubuntu
    volumes:
      - ..:/workspaces/${COMPOSE_PROJECT_NAME:-myproject}:cached
    command: sleep infinity
    depends_on:
      gateway:
        condition: service_healthy
      db:
        condition: service_healthy

  gateway:
    image: nginx:1.27-alpine
    ports:
      - "8080:80"
    volumes:
      - ../gateway/nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      db:
        condition: service_healthy
    healthcheck:
      test: ["CMD-SHELL", "curl -sf http://localhost:80/health || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 5

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: myapp
    ports:
      - "5432:5432"
    volumes:
      - db-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d myapp"]
      interval: 5s
      timeout: 3s
      retries: 5

volumes:
  db-data:
```

```jsonc
// .devcontainer/devcontainer.json
{
  "name": "API Gateway + Backend + Database",
  "dockerComposeFile": "docker-compose.yml",
  "service": "toolbox",
  "workspaceFolder": "/workspaces/${localWorkspaceFolderBasename}",
  "appPort": [3000, 5432, 8080],
  "postCreateCommand": ".devcontainer/post-create.sh",
  "remoteEnv": {
    "DATABASE_URL": "postgresql://app:secret@db:5432/myapp",
    "GATEWAY_URL": "http://localhost:8080"
  }
}
```

---

## File Structure

Recommended directory layout for devcontainer projects:

```
project-root/
|-- .devcontainer/
|   |-- devcontainer.json        # Zed-compatible dev container spec
|   |-- docker-compose.yml       # Service definitions
|   +-- post-create.sh           # One-time setup script
|-- .zed/
|   |-- tasks.json               # Infrastructure management tasks
|   +-- settings.json            # Project settings
|-- migrations/
|   |-- 001_create_tables.sql    # Database migrations
|   +-- 002_add_indexes.sql
|-- .env                         # Local environment variables
|-- .env.devcontainer            # DevContainer-specific overrides
+-- ...
```

**Notes:**
- `.devcontainer/` is the standard directory name recognized by Zed
- Keep `docker-compose.yml` inside `.devcontainer/` (referenced by `dockerComposeFile`)
- Store migrations and seed data in the project root, bind-mounted into containers
- Use `.env.devcontainer` for container-specific variable overrides

---

## Troubleshooting

### Config changes not taking effect

Zed does not auto-rebuild devcontainers when `devcontainer.json` changes. Stop the container and reopen:

```bash
docker compose -f .devcontainer/docker-compose.yml down
# Reopen the project in Zed
```

### Data reset

```bash
# Preserve data (volumes survive)
docker compose -f .devcontainer/docker-compose.yml down

# Full reset (delete volumes)
docker compose -f .devcontainer/docker-compose.yml down -v
```

### Port conflicts

Check what is using a port and kill it:

```bash
lsof -i :5432
kill -9 <PID>
```

Or offset ports in `docker-compose.yml` (see Port Forwarding section).

### Services not starting

1. Check service logs: `docker compose -f .devcontainer/docker-compose.yml logs <service>`
2. Verify healthchecks: `docker inspect --format='{{json .State.Health}}' <container>`
3. Ensure images exist: `docker compose -f .devcontainer/docker-compose.yml pull`
4. Check disk space: `docker system df`

### Container cannot reach host app

If a container service needs to call back to your app on the host:

```yaml
services:
  gateway:
    extra_hosts:
      - "host.docker.internal:host-gateway"
```

Then use `http://host.docker.internal:3000` from inside the container.

### Slow file system on macOS

Use `:cached` on bind mounts and avoid mounting `node_modules`:

```yaml
volumes:
  - ..:/workspaces/myproject:cached
  - node_modules:/workspaces/myproject/node_modules  # Named volume, not bind mount
```

---

## Best Practices

1. **Always add healthchecks** -- every service should have a healthcheck so `depends_on` conditions work reliably

2. **Use `depends_on` with conditions** -- `condition: service_healthy` prevents race conditions where your app starts before the database is ready

3. **Pin image versions** -- use `postgres:16-alpine` not `postgres:latest` to prevent unexpected breaking changes

4. **Make post-create scripts idempotent** -- they may run multiple times during rebuilds; use `apt-get install -y` and check-before-install patterns

5. **Use named volumes for data persistence** -- bind mounts for code, named volumes for database data and cache state

6. **Keep secrets out of committed files** -- use `.env` files (gitignored) for passwords and API keys, not hardcoded values in `docker-compose.yml`

7. **Use Alpine images where possible** -- `postgres:16-alpine` is smaller and faster to pull than `postgres:16`

8. **Set resource limits on services** -- prevent runaway containers from consuming all host resources:
   ```yaml
   deploy:
     resources:
       limits:
         memory: 512M
   ```

9. **Add `:ro` to read-only mounts** -- prevent containers from accidentally modifying config files or migration scripts

10. **Use `restart: "no"` for one-off services** -- migration and seed services should exit after completion, not restart
