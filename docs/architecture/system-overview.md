# Architecture Overview

## System Architecture

```
┌─────────────────┐      ┌─────────────────┐      ┌──────────────────┐
│   Client App    │─────▶│  Kong Gateway   │─────▶│  Auth Service    │
└─────────────────┘      └─────────────────┘      └──────────────────┘
                                  │                         │
                                  │                         │
                          ┌───────▼────────┐        ┌───────▼────────┐
                          │ Kong Admin API │        │ Unified Cache  │
                          │   (Consumers)  │◀───────│  Architecture  │
                          └────────────────┘        └────────────────┘
                                  │                         │
                           ┌──────▼──────┐         ┌────────▼────────┐
                           │ Circuit     │         │  Redis Cache    │
                           │ Breaker     │         │  (HA Mode)      │
                           └─────────────┘         └─────────────────┘
                                                             │
                                                    ┌────────▼────────┐
                                                    │  OpenTelemetry  │
                                                    │ & Profiling     │
                                                    └─────────────────┘
```

**Note**: This is a simplified high-level architecture diagram. The Auth Service internal implementation includes additional layers not shown here:
- **Router Layer**: Bun Routes API for HTTP request routing (16 endpoints)
- **Middleware Layer**: Error handling and CORS preflight processing
- **Handler Layer**: 5 specialized handlers (tokens, health, metrics, openapi, profiling)
- **Service Layer**: JWT generation, cache management, telemetry instrumentation
- **Adapter Layer**: Kong Admin API integration with unified adapter pattern

See "Internal Components" section below for complete implementation details.

## Layered Architecture (Internal)

The Auth Service implements a clean layered architecture for maintainability and testability:

```
┌─────────────────────────────────────────────────────────┐
│                    HTTP Request Layer                    │
│              (Bun.serve() with Routes API)               │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│                   Router Layer (router.ts)               │
│  Route Matching → Handler Dispatch → Response Building  │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│              Middleware Layer (middleware/)              │
│         Error Handler → CORS Handler → Next()           │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│               Handler Layer (handlers/)                  │
│  tokens.ts │ health.ts │ metrics.ts │ openapi.ts │      │
│             profiling.ts                                 │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│               Service Layer (services/)                  │
│  JWT Service │ Cache Service │ Circuit Breaker │        │
│  Telemetry Service │ Kong Adapter                       │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│          External Integration Layer (adapters/)          │
│  Kong Admin API │ Redis Cache │ OpenTelemetry │         │
└─────────────────────────────────────────────────────────┘
```

**Layer Responsibilities**:

| Layer | Responsibility | Example Components |
|-------|----------------|-------------------|
| **Router** | Route matching, handler dispatch | `src/routes/router.ts` |
| **Middleware** | Cross-cutting concerns, error handling | `error-handler.ts`, `cors.ts` |
| **Handler** | HTTP request/response, business orchestration | `tokens.ts`, `health.ts`, `metrics.ts` |
| **Service** | Core business logic, domain operations | `jwt.service.ts`, `cache-manager.ts` |
| **Adapter** | External system integration | `kong.adapter.ts`, Redis client |

**Data Flow Example** (Token Generation):
1. Client → Kong Gateway (validates API key, injects consumer headers)
2. Kong → Router Layer (matches `/tokens` route)
3. Router → Middleware (error handling, CORS if needed)
4. Middleware → Handler (`tokens.ts` - orchestrates token generation)
5. Handler → Service Layer (`jwt.service.ts`, `cache-manager.ts`)
6. Service → Adapter (Kong Admin API for consumer secrets)
7. Response flows back through layers with proper error handling

## Component Dependencies

### External Dependencies
- **Kong Gateway**: Provides consumer authentication and request routing
- **Kong Admin API**: Manages consumer secrets and JWT configurations
- **Redis Cache**: Optional high-availability cache backend for enhanced resilience
- **OpenTelemetry Collector**: Receives distributed tracing, metrics, and logs

### Internal Components
- **HTTP Server**: Native Bun.serve() Routes API for maximum performance (100k+ req/sec)
- **JWT Service**: Token generation using crypto.subtle Web API with response builders
- **Type Definitions**: Shared types module (`src/types/`)
  - `circuit-breaker.types.ts`: Shared CircuitBreakerStats interface (avoids circular dependencies)
- **API Gateway Adapter**: Unified Kong adapter supporting both API Gateway and Konnect modes
  - `kong.adapter.ts`: Consolidated Kong integration with strategy pattern
  - Mode-specific strategies for different Kong deployments
- **Unified Cache Architecture**: Pluggable cache backends with intelligent fallback
  - `cache-factory.ts`: Cache backend selection and initialization
  - In-memory cache with configurable Redis backend
  - Automatic failover and stale data tolerance
- **Response Builders**: Standardized response patterns for consistency and type safety
- **Handler Layer**: Dedicated request handlers (`src/handlers/`) for focused business logic
  - `tokens.ts`: JWT token generation with Kong integration and caching
  - `health.ts`: Health checks with dependency monitoring and circuit breaker status
  - `metrics.ts`: Consolidated performance metrics and debugging endpoints
  - `openapi.ts`: Dynamic OpenAPI specification generation
  - `profiling.ts`: Chrome DevTools profiling integration
- **Middleware Layer**: Cross-cutting concerns (`src/middleware/`)
  - `error-handler.ts`: Centralized error handling with structured responses
  - `cors.ts`: CORS preflight request handling
- **Router Layer**: Native Bun Routes API integration (`src/routes/router.ts`)
- **Circuit Breaker**: Opossum-based resilience protection for Kong Admin API with stale cache fallback
- **Shared Circuit Breaker Service**: Centralized circuit breaker management with cache integration
- **Stale Cache Resilience**: Extended service availability (up to 2 hours) during Kong outages
- **Telemetry System**: Optimized OpenTelemetry instrumentation with cost reduction
- **Profiling Service**: Chrome DevTools integration for performance analysis
- **Configuration Manager**: 4-pillar configuration pattern with security validation
- **Health Monitors**: Enhanced health checks with circuit breaker and cache status

## Technology Stack
- **Runtime**: Bun v1.2.23+ (native JavaScript runtime)
- **Language**: TypeScript
- **HTTP Server**: Native Bun.serve() with built-in performance optimizations
- **JWT Generation**: Web Crypto API (crypto.subtle) with HMAC-SHA256
- **Caching**: Redis with in-memory fallback using unified cache architecture
- **Circuit Breakers**: Opossum library for Kong API resilience
- **Container**: Docker with distroless base (gcr.io/distroless/base:nonroot)
- **Monitoring**: OpenTelemetry with OTLP protocol
- **Profiling**: Chrome DevTools integration via Bun inspector
- **API Documentation**: Dynamic OpenAPI generation
- **Code Quality**: Biome for linting and formatting with performance optimization
- **Testing**: Bun test runner, Playwright E2E, K6 performance testing
- **CI/CD**: GitHub Actions with parallel job execution and Docker Cloud Builders

## Performance Characteristics
- **Throughput**: 100,000+ requests/second capability with native Bun Routes API
- **Memory Usage**: ~50-80MB baseline with optimized telemetry
- **Cold Start**: <100ms initialization time with hybrid caching
- **Response Time**: <10ms p99 for token generation (crypto.subtle + response builders)
- **Container Size**: 58MB (distroless multi-stage build)
- **Cache Performance**: 90%+ hit rate with memory-first hybrid strategy
- **Resilience**: Circuit breaker protection with Kong Admin API resilience and stale cache fallback