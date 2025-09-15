# Use the official Bun image
FROM oven/bun:1.2.21-slim AS base

# Set the working directory
WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

RUN bun run build

# Production stage
FROM oven/bun:1.2.21-slim AS production

WORKDIR /app

# Copy package files and install only production dependencies
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile --production

# Copy built application or source code
COPY --from=base /app/dist ./dist
COPY --from=base /app/src ./src

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 bunuser
USER bunuser

# Set default environment variables (override these in production)
ENV NODE_ENV=production
ENV PORT=3000
ENV TELEMETRY_MODE=console

# Expose the port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start the application
CMD ["bun", "src/server.ts"]
