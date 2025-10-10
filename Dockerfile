# Multi-stage optimized Dockerfile for Bun + Authentication Service
# Designed for minimal build time and maximum security

# syntax=docker/dockerfile:1
FROM oven/bun:1.2.23-alpine AS deps-base
WORKDIR /app

# Install minimal system dependencies and upgrade ALL vulnerable packages
RUN apk update && \
    apk upgrade --no-cache && \
    apk add --no-cache dumb-init ca-certificates && \
    rm -rf /var/cache/apk/*

# Dependencies stage - cache layer optimization
FROM deps-base AS deps-dev
COPY package.json bun.lockb* ./
# Use --production=false to install all dependencies including devDependencies for build
RUN bun install --frozen-lockfile

# Production dependencies stage
FROM deps-base AS deps-prod
COPY package.json bun.lockb* ./
# Install only production dependencies
RUN bun install --frozen-lockfile --production

# Build stage
FROM deps-dev AS builder
COPY . .

# Generate OpenAPI docs and build the application
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun run generate-docs && \
    bun run build && \
    # Clean up unnecessary files to reduce layer size
    rm -rf .git node_modules/.cache test/ tests/ *.test.* *.spec.* && \
    # Verify build output
    ls -la dist/

# Final production stage - minimal footprint
FROM oven/bun:1.2.23-alpine AS production

# Update packages, install runtime dependencies, and create non-root user
RUN apk update && \
    apk upgrade --no-cache && \
    apk add --no-cache dumb-init curl && \
    rm -rf /var/cache/apk/* && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 bunuser && \
    mkdir -p /app && \
    chown bunuser:nodejs /app

WORKDIR /app

# Copy production dependencies with proper ownership
COPY --from=deps-prod --chown=bunuser:nodejs /app/node_modules ./node_modules
COPY --from=deps-prod --chown=bunuser:nodejs /app/package.json ./
COPY --from=builder --chown=bunuser:nodejs /app/src ./src
COPY --from=builder --chown=bunuser:nodejs /app/public ./public

# Switch to non-root user before setting environment
USER bunuser

# Set environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    TELEMETRY_MODE=otlp

# Expose port
EXPOSE 3000

# Health check with reasonable timeout
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f -H "User-Agent: Docker-Health-Check" http://localhost:3000/health || exit 1

# Use dumb-init to handle signals properly and prevent zombie processes
ENTRYPOINT ["dumb-init", "--"]
CMD ["bun", "src/server.ts"]

# Build metadata from package.json
ARG BUILD_DATE
ARG VCS_REF
ARG SERVICE_NAME="authentication-service"
ARG SERVICE_VERSION="1.0.0"
ARG SERVICE_DESCRIPTION="High-performance JWT authentication service built with Bun"
ARG SERVICE_AUTHOR="Simon Owusu"
ARG SERVICE_LICENSE="UNLICENSED"

LABEL org.opencontainers.image.title="${SERVICE_NAME}" \
    org.opencontainers.image.description="${SERVICE_DESCRIPTION}" \
    org.opencontainers.image.vendor="${SERVICE_AUTHOR}" \
    org.opencontainers.image.version="${SERVICE_VERSION}" \
    org.opencontainers.image.created="${BUILD_DATE}" \
    org.opencontainers.image.revision="${VCS_REF}" \
    org.opencontainers.image.licenses="${SERVICE_LICENSE}" \
    org.opencontainers.image.base.name="oven/bun:1.2.23-alpine"
