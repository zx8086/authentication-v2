# Docker Deployment

## Container Overview

The authentication service uses a **distroless base image** for maximum security and minimal attack surface.

### Key Characteristics
- **Base Image**: `gcr.io/distroless/base:nonroot` (no shell, no package manager)
- **Image Size**: 58MB (production optimized)
- **Security Score**: 10/10 (distroless + non-root user)
- **User**: Non-root (UID 65532)
- **Signal Handling**: dumb-init for proper PID 1 behavior

## Dockerfile

```dockerfile
# Multi-stage build for minimal production image
FROM oven/bun:1.2.23-alpine AS deps-base
WORKDIR /app
RUN apk add --no-cache dumb-init ca-certificates && \
    apk upgrade curl openssl

FROM deps-base AS deps-prod
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile --production

# Production stage - distroless for security
FROM gcr.io/distroless/base:nonroot AS production

# Copy dumb-init and Bun runtime
COPY --from=deps-base /usr/bin/dumb-init /usr/bin/dumb-init
COPY --from=oven/bun:1.2.23-alpine /usr/local/bin/bun /usr/local/bin/bun

WORKDIR /app

# Copy application files
COPY --from=deps-prod /app/node_modules ./node_modules/
COPY . .

# Non-root user (65532 is the distroless nonroot user)
USER 65532:65532

EXPOSE 3000

# Health check using Bun native fetch (no curl in distroless)
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD ["/usr/local/bin/bun", "--eval", "fetch('http://localhost:3000/health').then(r=>r.ok?process.exit(0):process.exit(1)).catch(()=>process.exit(1))"]

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["/usr/local/bin/bun", "src/index.ts"]
```

## Build Commands

### Local Development
```bash
# Build Docker image (with metadata and caching)
bun run docker:build

# Build and run locally
bun run docker:local

# Security validation (10-point check)
bun run docker:security:full
```

### Production Build
```bash
# Multi-platform build (AMD64 for production)
docker buildx build --platform linux/amd64 \
  --tag example/authentication-service:latest \
  --push .

# Verify image size (target: <100MB, actual: 58MB)
docker images | grep authentication-service
```

## Container Configuration

### Environment Variables
```bash
# Core Configuration
NODE_ENV=production
PORT=3000

# Kong Integration
KONG_MODE=KONNECT
KONG_ADMIN_URL=https://us.api.konghq.com/v2/control-planes/abc123
KONG_ADMIN_TOKEN=your-production-token
KONG_JWT_AUTHORITY=https://sts-api.example.com/
KONG_JWT_AUDIENCE=http://api.example.com/

# Telemetry
TELEMETRY_MODE=otlp
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=https://otel.example.com/v1/traces
OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=https://otel.example.com/v1/metrics

# High Availability (Optional)
HIGH_AVAILABILITY=true
REDIS_URL=rediss://redis.example.com:6380
```

### Running the Container
```bash
# Basic run
docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -e KONG_MODE=KONNECT \
  -e KONG_ADMIN_URL=https://us.api.konghq.com/v2/control-planes/abc123 \
  -e KONG_ADMIN_TOKEN=secret123 \
  -e KONG_JWT_AUTHORITY=https://sts-api.example.com/ \
  -e KONG_JWT_AUDIENCE=http://api.example.com/ \
  -e TELEMETRY_MODE=otlp \
  authentication-service:latest

# With Redis cache
docker run -p 3000:3000 \
  -e HIGH_AVAILABILITY=true \
  -e REDIS_URL=redis://redis:6379 \
  # ... other env vars
  authentication-service:latest
```

## Docker Compose

### Production Setup
```yaml
version: '3.8'

services:
  authentication-service:
    image: ${SERVICE_NAME:-authentication-service}:${VERSION:-latest}
    build:
      context: .
      target: production
      dockerfile: Dockerfile
      platforms:
        - linux/amd64

    # Security hardening for production
    user: "65532:65532"
    read_only: true

    cap_drop:
      - ALL
    cap_add:
      - CHOWN
      - SETGID
      - SETUID

    security_opt:
      - no-new-privileges:true

    # Resource limits optimized for 100k+ req/sec
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '1.0'
        reservations:
          memory: 512M
          cpus: '0.5'

    # Health check using Bun native fetch (distroless compatible)
    healthcheck:
      test: ["/usr/local/bin/bun", "--eval", "fetch('http://localhost:3000/health').then(r=>r.ok?process.exit(0):process.exit(1)).catch(()=>process.exit(1))"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 40s

    environment:
      - NODE_ENV=production
      - PORT=3000
      - KONG_MODE=${KONG_MODE:-API_GATEWAY}
      - KONG_ADMIN_URL=${KONG_ADMIN_URL}
      - KONG_ADMIN_TOKEN=${KONG_ADMIN_TOKEN}
      - KONG_JWT_AUTHORITY=${KONG_JWT_AUTHORITY}
      - KONG_JWT_AUDIENCE=${KONG_JWT_AUDIENCE}
      - TELEMETRY_MODE=${TELEMETRY_MODE:-otlp}

    ports:
      - "${HOST_PORT:-3000}:3000"

    # Temporary filesystem for distroless
    tmpfs:
      - /tmp:noexec,nosuid,nodev,size=100m,mode=1777

    restart: unless-stopped

  # Optional Redis for high availability
  redis:
    image: redis:7.4-alpine
    command: redis-server --appendonly yes --maxmemory 128mb --maxmemory-policy allkeys-lru
    user: "999:999"
    read_only: true
    deploy:
      resources:
        limits:
          memory: 128M
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 3s
      retries: 3
    restart: unless-stopped
```

## Container Security

### Security Features (10/10 Score)
- **Distroless base**: No shell, no package manager - minimal attack surface
- **Non-root user**: Runs as UID 65532 (distroless nonroot)
- **Read-only filesystem**: Immutable container with tmpfs for /tmp
- **Dropped capabilities**: All capabilities dropped, minimal additions
- **No privilege escalation**: `no-new-privileges:true`
- **OWASP headers**: All responses include security headers (HSTS, CSP, X-Frame-Options)
- **Health checks**: Built-in health monitoring via Bun native fetch
- **TLS/SSL**: Supports secure Redis connections (REDISS)

### Security Validation
```bash
# Run full security validation
bun run docker:security:full

# Trivy vulnerability scan
bun run docker:security:trivy

# Expected output: 10/10 security score
```

## Performance Characteristics

| Metric | Value |
|--------|-------|
| Image Size | 58MB |
| Memory Baseline | ~50-80MB |
| Memory Limit (Production) | 1G |
| CPU Overhead | <2% with full observability |
| Cold Start | <100ms |
| Throughput | 100k+ req/sec |

## Health Endpoints

| Endpoint | Purpose | Usage |
|----------|---------|-------|
| `/health` | Liveness probe | Full dependency check |
| `/health/ready` | Readiness probe | Kong connectivity check |
| `/metrics` | Operational metrics | Performance monitoring |

## Monitoring and Debugging

### Container Logs
```bash
# View logs
docker logs auth-service

# Follow logs (JSON structured)
docker logs -f auth-service

# View specific lines
docker logs --tail 100 auth-service
```

### Health Monitoring
```bash
# Check health status
docker inspect --format='{{.State.Health.Status}}' auth-service

# Health check logs
docker inspect --format='{{range .State.Health.Log}}{{.Output}}{{end}}' auth-service
```

### Container Stats
```bash
# Resource usage
docker stats --no-stream auth-service

# Detailed inspection
docker inspect auth-service
```

## Troubleshooting

### Common Issues

#### Container Won't Start
```bash
# Check logs for errors
docker logs auth-service

# Verify environment variables are set
docker inspect auth-service --format='{{range .Config.Env}}{{println .}}{{end}}' | grep KONG
```

#### Health Check Failing
```bash
# Test health endpoint directly
docker run --rm --network container:auth-service \
  curlimages/curl:latest curl -f http://localhost:3000/health

# Check readiness
docker run --rm --network container:auth-service \
  curlimages/curl:latest curl -f http://localhost:3000/health/ready
```

#### High Memory Usage
```bash
# Monitor memory usage
docker stats auth-service

# Check metrics endpoint
docker run --rm --network container:auth-service \
  curlimages/curl:latest curl http://localhost:3000/metrics
```

> **Note**: Distroless containers have no shell. Use sidecar containers or external tools for debugging.

## Container Registry

### Tagging Strategy
```bash
# Version tags
docker tag authentication-service:latest example/authentication-service:v2.4.0
docker tag authentication-service:latest example/authentication-service:latest

# Environment tags
docker tag authentication-service:latest example/authentication-service:production
```

### Registry Push
```bash
# Push to registry
docker push example/authentication-service:v2.4.0
docker push example/authentication-service:latest
```
