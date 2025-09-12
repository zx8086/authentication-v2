# Dockerfile optimized for Bun runtime
FROM oven/bun:1.1.35-alpine AS base
WORKDIR /app

# Install system dependencies if needed
RUN apk --no-cache add curl

# Dependencies stage - cache dependencies separately
FROM base AS deps
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile --production

# Development stage
FROM base AS development
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile
COPY . .
EXPOSE 3000
CMD ["bun", "--hot", "src/server.ts"]

# Build stage - run tests and build
FROM base AS build
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Run tests to ensure code quality
RUN bun test

# Run type checking
RUN bun run typecheck

# Build the application
RUN bun build src/server.ts --target=bun --outdir=dist --minify

# Production stage - minimal runtime image
FROM oven/bun:1.1.35-alpine AS production
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S bunuser && \
    adduser -S bunuser -u 1001 -G bunuser

# Copy built application
COPY --from=build --chown=bunuser:bunuser /app/dist ./dist

# Copy production dependencies
COPY --from=deps --chown=bunuser:bunuser /app/node_modules ./node_modules

# Copy package.json for metadata
COPY --chown=bunuser:bunuser package.json ./

# Copy any other necessary files
COPY --chown=bunuser:bunuser src/config ./src/config

# Switch to non-root user
USER bunuser

# Set production environment
ENV NODE_ENV=production
ENV BUN_ENV=production

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Graceful shutdown handling
STOPSIGNAL SIGTERM

# Start the application
CMD ["bun", "run", "dist/server.js"]

# Multi-target support
FROM production AS release