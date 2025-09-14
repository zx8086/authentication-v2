# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Common Development Tasks
```bash
# Start development server with hot reload
bun run dev

# Start production server
bun run start

# Build for production
bun run build

# Run tests
bun test

# Run tests in watch mode
bun run test:watch

# Run tests with coverage
bun run test:coverage

# Type checking
bun run typecheck

# Health check endpoint
bun run health-check
```

### Testing Individual Components
```bash
# Run specific test file
bun test tests/jwt.service.test.ts
bun test tests/kong.service.test.ts
bun test tests/server.test.ts
```

## Architecture Overview

This is a high-performance authentication service migrated from .NET Core to Bun runtime, maintaining 100% API compatibility while achieving significant performance improvements.

### Core Architecture
- **Runtime**: Bun native with zero external dependencies for core functionality
- **Server**: Native `Bun.serve()` HTTP server (100k+ req/sec capability)
- **JWT Generation**: Uses `crypto.subtle` Web API for HMAC-SHA256 signing
- **Kong Integration**: Native `fetch` with intelligent caching and connection pooling
- **Performance**: Built-in performance monitoring and rate limiting

### Service Layer Structure
- **JWT Service** (`src/services/jwt.service.ts`): Native crypto.subtle JWT generation with HMAC-SHA256
- **Kong Service** (`src/services/kong.service.ts`): Kong Admin API integration with caching and health checks
- **Performance Utils** (`src/utils/performance.ts`): Rate limiting and performance monitoring

### Configuration Management
- Environment-based configuration in `src/config/index.ts`
- Required environment variables: `JWT_AUTHORITY`, `JWT_AUDIENCE`, `KONG_ADMIN_URL`, `KONG_ADMIN_TOKEN`
- Configuration validation with detailed error messages for missing variables

### API Endpoints
- `GET /tokens` - JWT token issuance (requires Kong consumer headers)
- `GET /health` - Health check with Kong dependency status
- `GET /metrics` - Performance metrics and cache statistics

### Key Design Patterns
- **Error Handling**: Comprehensive error handling with request IDs for tracing
- **Rate Limiting**: Per-consumer rate limiting with sliding window algorithm
- **Caching**: Kong consumer secret caching to reduce Admin API calls
- **Performance Monitoring**: Built-in metrics collection and reporting
- **CORS Support**: Configurable CORS with origin validation

### Kong Integration Details
- Requires Kong consumer headers: `x-consumer-id`, `x-consumer-username`
- Rejects anonymous consumers (`x-anonymous-consumer: true`)
- Creates and caches JWT credentials for Kong consumers
- Health checks Kong Admin API connectivity

### Environment Configuration
Copy `.env.example` to `.env` and configure:
- Server settings (PORT, NODE_ENV)
- JWT configuration (authority, audience, key claim name)
- Kong integration (admin URL, admin token)
- CORS origins
- Rate limiting parameters
- Optional OpenTelemetry endpoint

### Migration Context
This service is a complete migration from .NET Core 3.1, maintaining identical API contracts while improving:
- 3-4x performance improvement
- 60% reduction in memory usage
- 5x smaller container images
- <100ms cold start times

See `MIGRATION.md` for detailed migration procedures and performance comparisons.
- DO not use emojis and do not add comments for every single code change we make. We should have minimal comments throughout the code base