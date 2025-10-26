# Docker Deployment

## Docker Build Process

### Dockerfile
```dockerfile
FROM oven/bun:1.2.23-alpine AS deps-base
WORKDIR /app
RUN apk add --no-cache dumb-init ca-certificates && \
    apk upgrade curl openssl

FROM deps-base AS deps-prod
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile --production

FROM oven/bun:1.2.23-alpine AS production
RUN apk add --no-cache dumb-init curl && \
    apk upgrade curl openssl && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 bunuser && \
    mkdir -p /app && \
    chown bunuser:nodejs /app

WORKDIR /app
COPY --from=deps-prod --chown=bunuser:nodejs /app/node_modules ./node_modules/
COPY --chown=bunuser:nodejs . .

USER bunuser
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl --fail http://localhost:3000/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["bun", "src/index.ts"]
```

## Build Commands

### Local Development
```bash
# Build Docker image
bun run docker:build
# OR manually:
docker build -t authentication-service:latest .

# Enhanced build with metadata
bun run docker:build:enhanced

# Build for development
bun run docker:dev

# Build and run locally
bun run docker:local
```

### Production Build
```bash
# Multi-platform build (AMD64 + ARM64)
docker buildx build --platform linux/amd64,linux/arm64 \
  --tag example/authentication-service:latest \
  --push .

# Security-hardened build
docker build \
  --tag authentication-service:secure \
  --build-arg SECURITY_SCAN=true \
  .
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
REDIS_ENABLED=true
REDIS_URL=rediss://redis.example.com:6380
REDIS_PASSWORD=secure-password
```

### Running the Container
```bash
# Basic run
docker run -p 3000:3000 \
  -e KONG_MODE=KONNECT \
  -e KONG_ADMIN_URL=https://us.api.konghq.com/v2/control-planes/abc123 \
  -e KONG_ADMIN_TOKEN=secret123 \
  -e KONG_JWT_AUTHORITY=https://sts-api.example.com/ \
  -e KONG_JWT_AUDIENCE=http://api.example.com/ \
  -e TELEMETRY_MODE=otlp \
  -e OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=https://otel.example.com/v1/traces \
  authentication-service:latest

# With Redis cache
docker run -p 3000:3000 \
  -e KONG_MODE=API_GATEWAY \
  -e KONG_ADMIN_URL=http://kong-admin:8001 \
  -e KONG_ADMIN_TOKEN=admin-token \
  -e KONG_JWT_AUTHORITY=https://sts-api.example.com/ \
  -e KONG_JWT_AUDIENCE=http://api.example.com/ \
  -e REDIS_ENABLED=true \
  -e REDIS_URL=redis://redis:6379 \
  authentication-service:latest

# Development mode
docker run -p 3000:3000 \
  -e NODE_ENV=development \
  -e TELEMETRY_MODE=console \
  -e KONG_MODE=API_GATEWAY \
  -e KONG_ADMIN_URL=http://kong-admin:8001 \
  -e KONG_ADMIN_TOKEN=dev-token \
  -e KONG_JWT_AUTHORITY=https://sts-api.dev.example.com/ \
  -e KONG_JWT_AUDIENCE=http://api.dev.example.com/ \
  authentication-service:latest
```

## Docker Compose

### Basic Setup
```yaml
version: '3.8'

services:
  auth-service:
    build: .
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      KONG_MODE: API_GATEWAY
      KONG_ADMIN_URL: http://kong-admin:8001
      KONG_ADMIN_TOKEN: ${KONG_ADMIN_TOKEN}
      KONG_JWT_AUTHORITY: https://sts-api.example.com/
      KONG_JWT_AUDIENCE: http://api.example.com/
      TELEMETRY_MODE: otlp
      OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: https://otel.example.com/v1/traces
    healthcheck:
      test: ["CMD", "curl", "--fail", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    restart: unless-stopped
```

### With Redis Cache
```yaml
version: '3.8'

services:
  auth-service:
    build: .
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      KONG_MODE: API_GATEWAY
      KONG_ADMIN_URL: http://kong-admin:8001
      KONG_ADMIN_TOKEN: ${KONG_ADMIN_TOKEN}
      KONG_JWT_AUTHORITY: https://sts-api.example.com/
      KONG_JWT_AUDIENCE: http://api.example.com/
      REDIS_ENABLED: "true"
      REDIS_URL: redis://redis:6379
      TELEMETRY_MODE: otlp
    depends_on:
      - redis
    healthcheck:
      test: ["CMD", "curl", "--fail", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped

volumes:
  redis_data:
```

## Container Security

### Security Features
- **Non-root user**: Runs as `bunuser` (UID 1001)
- **Minimal base image**: Alpine Linux with security updates
- **Dependency scanning**: Automated vulnerability scanning in CI
- **Read-only filesystem**: Can be configured for enhanced security
- **Health checks**: Built-in health monitoring
- **TLS/SSL**: Supports secure Redis connections (REDISS)

### Security Hardening
```dockerfile
# Additional security measures
FROM oven/bun:1.2.23-alpine AS production

# Security updates and minimal packages
RUN apk add --no-cache dumb-init curl && \
    apk upgrade --no-cache && \
    rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 bunuser

# Set up application directory
WORKDIR /app
RUN chown bunuser:nodejs /app

# Copy application files
COPY --from=deps-prod --chown=bunuser:nodejs /app/node_modules ./node_modules/
COPY --chown=bunuser:nodejs . .

# Switch to non-root user
USER bunuser

# Security labels
LABEL security.scan="true" \
      security.vendor="example-corp" \
      security.version="1.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl --fail http://localhost:3000/health || exit 1

# Use init system
ENTRYPOINT ["dumb-init", "--"]
CMD ["bun", "src/index.ts"]
```

## Performance Optimization

### Container Performance
- **Image size**: <100MB with all dependencies
- **Memory usage**: ~50-80MB baseline
- **CPU usage**: <2% overhead with full observability
- **Cold start**: <100ms initialization time

### Optimization Strategies
```dockerfile
# Multi-stage build for minimal production image
FROM oven/bun:1.2.23-alpine AS deps-base
# ... dependency installation

FROM oven/bun:1.2.23-alpine AS production
# ... copy only production dependencies and source

# Layer optimization
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile --production

# Application code (changes frequently, separate layer)
COPY . .
```

## Container Registry

### Tagging Strategy
```bash
# Version tags
docker tag authentication-service:latest example/authentication-service:v1.2.3
docker tag authentication-service:latest example/authentication-service:latest

# Environment tags
docker tag authentication-service:latest example/authentication-service:staging
docker tag authentication-service:latest example/authentication-service:production

# Multi-platform tags
docker buildx build --platform linux/amd64,linux/arm64 \
  --tag example/authentication-service:v1.2.3-multi \
  --push .
```

### Registry Push
```bash
# Push to registry
docker push example/authentication-service:v1.2.3
docker push example/authentication-service:latest

# Multi-platform push
docker buildx build --platform linux/amd64,linux/arm64 \
  --tag example/authentication-service:latest \
  --push .
```

## Monitoring and Debugging

### Container Logs
```bash
# View logs
docker logs auth-service

# Follow logs
docker logs -f auth-service

# View specific lines
docker logs --tail 100 auth-service
```

### Container Inspection
```bash
# Inspect container
docker inspect auth-service

# Container stats
docker stats auth-service

# Execute commands in container
docker exec -it auth-service sh
docker exec auth-service curl http://localhost:3000/health
```

### Health Monitoring
```bash
# Check health status
docker inspect --format='{{.State.Health.Status}}' auth-service

# Health check logs
docker inspect --format='{{range .State.Health.Log}}{{.Output}}{{end}}' auth-service
```

## Troubleshooting

### Common Issues

#### Container Won't Start
```bash
# Check logs for errors
docker logs auth-service

# Verify environment variables
docker exec auth-service env | grep KONG

# Test health endpoint
docker exec auth-service curl -f http://localhost:3000/health
```

#### High Memory Usage
```bash
# Monitor memory usage
docker stats --no-stream auth-service

# Check for memory leaks
docker exec auth-service curl http://localhost:3000/metrics
```

#### Network Connectivity
```bash
# Test Kong connectivity
docker exec auth-service curl -v $KONG_ADMIN_URL/status

# Check DNS resolution
docker exec auth-service nslookup kong-admin

# Verify port binding
docker port auth-service
```

#### Performance Issues
```bash
# Check CPU usage
docker stats auth-service

# Profile the application
docker exec auth-service curl -X POST http://localhost:3000/debug/profiling/start
# ... run operations ...
docker exec auth-service curl -X POST http://localhost:3000/debug/profiling/stop
```