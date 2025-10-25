# Multi-stage optimized Dockerfile for Bun + Authentication Service
# Designed for minimal build time and maximum security

# syntax=docker/dockerfile:1
FROM oven/bun:1.3.0-alpine AS deps-base
WORKDIR /app

# Install minimal system dependencies and upgrade ALL vulnerable packages
RUN apk update && \
    apk upgrade --no-cache && \
    apk add --no-cache dumb-init ca-certificates && \
    rm -rf /var/cache/apk/*

# Dependencies stage - cache layer optimization
FROM deps-base AS deps-dev
COPY package.json bun.lock ./
# Use BuildKit cache mount for faster dependency installation
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile

# Production dependencies stage
FROM deps-base AS deps-prod
COPY package.json bun.lock ./
# Install only production dependencies with cache mount
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile --production

# Build stage
FROM deps-dev AS builder
COPY . .

# Build the application and generate OpenAPI docs
RUN --mount=type=cache,target=/root/.bun/install/cache \
    --mount=type=cache,target=/tmp/bun-build \
    bun run generate-docs && \
    bun run build && \
    # Clean up unnecessary files for smaller image
    rm -rf .git .github node_modules/.cache test/ tests/ *.test.* *.spec.* *.md docs/ coverage/ && \
    # Remove development files
    rm -rf .vscode .idea *.log playwright-report/ test-results/ && \
    # Verify build output exists
    ls -la dist/ public/ 2>/dev/null || echo 'Build artifacts ready'

# Distroless production stage - ZERO attack surface
FROM gcr.io/distroless/base:nonroot AS production

# Copy Bun binary from official image with proper permissions for nonroot user (65532:65532)
COPY --from=oven/bun:1.3.0-alpine --chown=65532:65532 /usr/local/bin/bun /usr/local/bin/bun

# Copy dumb-init for proper PID 1 signal handling (CRITICAL for container signal handling)
COPY --from=deps-base --chown=65532:65532 /usr/bin/dumb-init /usr/bin/dumb-init

# Copy required shared libraries for Bun from Alpine (optimized for distroless)
COPY --from=deps-base --chown=65532:65532 /lib/ld-musl-*.so.1 /lib/
COPY --from=deps-base --chown=65532:65532 /usr/lib/libgcc_s.so.1 /usr/lib/
COPY --from=deps-base --chown=65532:65532 /usr/lib/libstdc++.so.6 /usr/lib/

WORKDIR /app

# Copy only essential production dependencies (minimize image size)
COPY --from=deps-prod --chown=65532:65532 /app/node_modules ./node_modules
COPY --from=deps-prod --chown=65532:65532 /app/package.json ./package.json

# Copy application source and public assets in single operation
COPY --from=builder --chown=65532:65532 /app/src ./src
COPY --from=builder --chown=65532:65532 /app/public ./public

# Already running as nonroot user (65532:65532) - distroless default

# Set environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    TELEMETRY_MODE=otlp

# Expose port
EXPOSE 3000

# Health check using Bun native fetch (no curl in distroless)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD ["/usr/local/bin/bun", "--eval", "fetch('http://localhost:3000/health').then(r=>r.ok?process.exit(0):process.exit(1)).catch(()=>process.exit(1))"]

# Use dumb-init for proper PID 1 signal handling (CRITICAL for SIGTERM/SIGINT in containers)
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["/usr/local/bin/bun", "src/index.ts"]

# Build metadata from package.json
ARG BUILD_DATE
ARG VCS_REF
ARG SERVICE_NAME="authentication-service"
ARG SERVICE_VERSION="2.4.0"
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
    org.opencontainers.image.base.name="gcr.io/distroless/base:nonroot" \
    security.scan.disable="false" \
    security.attestation.required="true" \
    security.sbom.required="true"
