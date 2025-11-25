# API Reference

## Endpoints Overview

The Authentication Service provides a RESTful API for JWT token generation and system monitoring. All endpoints return JSON responses with appropriate HTTP status codes.

## Core Endpoints

### GET /
Returns the OpenAPI specification for the service.

**Request**
```http
GET / HTTP/1.1
Host: auth-service.example.com
Accept: application/json
```

**Response - JSON (200 OK)**
```json
{
  "openapi": "3.0.0",
  "info": {
    "title": "Authentication Service API",
    "version": "1.0.0",
    "description": "JWT token generation service for Kong consumers"
  },
  "servers": [...],
  "paths": {...}
}
```

**Response - YAML (200 OK)**
```yaml
openapi: 3.0.0
info:
  title: Authentication Service API
  version: 1.0.0
  description: JWT token generation service for Kong consumers
```

### GET /tokens
Issues a new JWT token for authenticated consumers.

**Request**
```http
GET /tokens HTTP/1.1
Host: auth-service.example.com
X-Consumer-ID: 98765432-9876-5432-1098-765432109876
X-Consumer-Username: example-consumer
X-Anonymous-Consumer: false
```

**Required Headers**
| Header | Type | Description |
|--------|------|-------------|
| `X-Consumer-ID` | UUID | Kong consumer identifier |
| `X-Consumer-Username` | String | Kong consumer username |
| `X-Anonymous-Consumer` | Boolean | Must be "false" or absent |

**Response - Success (200 OK)**
```json
{
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJwdmgtY29uc3VtZXIiLCJrZXkiOiJhYmMxMjNkZWY0NTYiLCJqdGkiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJpYXQiOjE2MzQ1Njc4OTAsIm5hbWUiOiJwdmgtY29uc3VtZXIiLCJ1bmlxdWVfbmFtZSI6InB2aGNvcnAuY29tI3B2aC1jb25zdW1lciIsImV4cCI6MTYzNDU2ODc5MCwiaXNzIjoiaHR0cHM6Ly9zdHMtYXBpLnB2aGNvcnAuY29tLyIsImF1ZCI6Imh0dHA6Ly9hcGkucHZoY29ycC5jb20vIn0.x8f3k9dmvR2K1nP5mX7Q9Z3yL4wB6",
    "expires_in": 900
}
```

**Response Fields**
| Field | Type | Description |
|-------|------|-------------|
| `access_token` | String | JWT token string |
| `expires_in` | Integer | Token lifetime in seconds |

**Error Responses**
- **401 Unauthorized**: Missing `X-Consumer-ID` header or `X-Anonymous-Consumer` is "true"
- **503 Service Unavailable**: Kong Admin API unreachable or consumer secret creation failed

## Health Check Endpoints

### GET /health
Main health check endpoint with dependency status.

**Request**
```http
GET /health HTTP/1.1
Host: auth-service.example.com
```

**Response - Healthy (200 OK)**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T12:00:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "environment": "production",
  "dependencies": {
    "kong": {
      "status": "healthy",
      "mode": "KONNECT",
      "url": "https://us.api.konghq.com/v2/control-planes/abc123",
      "responseTime": 45
    },
    "telemetry": {
      "status": "healthy",
      "mode": "otlp",
      "endpoints": {
        "traces": "https://otel.example.com/v1/traces",
        "metrics": "https://otel.example.com/v1/metrics"
      }
    }
  }
}
```

**Response - Unhealthy (503)**
```json
{
  "status": "unhealthy",
  "timestamp": "2025-01-15T12:00:00.000Z",
  "dependencies": {
    "kong": {
      "status": "unhealthy",
      "error": "Connection timeout"
    }
  }
}
```

### GET /health/ready
Readiness check verifying service can handle requests (Kong connectivity validated).

**Request**
```http
GET /health/ready HTTP/1.1
Host: auth-service.example.com
```

**Response - Ready (200 OK)**
```json
{
  "status": "ready",
  "timestamp": "2025-01-15T12:00:00.000Z",
  "checks": {
    "kong": {
      "status": "healthy",
      "mode": "KONNECT",
      "responseTime": 45
    },
    "circuitBreaker": {
      "state": "CLOSED"
    }
  }
}
```

**Response - Not Ready (503)**
```json
{
  "status": "not_ready",
  "timestamp": "2025-01-15T12:00:00.000Z",
  "checks": {
    "kong": {
      "status": "unhealthy",
      "error": "Connection timeout"
    },
    "circuitBreaker": {
      "state": "OPEN"
    }
  }
}
```

**Usage**
- Use for readiness probes in any orchestration platform (Kubernetes, Docker Swarm, Nomad, etc.)
- Use with load balancers to determine if instance should receive traffic
- Different from `/health` which checks liveness (service is running)
- Instance should not receive traffic until this returns 200

### GET /health/telemetry
Telemetry system health check.

**Request**
```http
GET /health/telemetry HTTP/1.1
Host: auth-service.example.com
```

**Response - Success (200 OK)**
```json
{
  "status": "healthy",
  "mode": "otlp",
  "endpoints": {
    "traces": "https://otel.example.com/v1/traces",
    "metrics": "https://otel.example.com/v1/metrics",
    "logs": "https://otel.example.com/v1/logs"
  },
  "exporters": {
    "traces": "active",
    "metrics": "active",
    "logs": "active"
  }
}
```

### GET /health/metrics
Metrics system health and debugging information.

**Request**
```http
GET /health/metrics HTTP/1.1
Host: auth-service.example.com
```

**Response - Success (200 OK)**
```json
{
  "status": "healthy",
  "metricsEnabled": true,
  "exportInterval": 10000,
  "lastExport": "2025-01-15T12:00:00.000Z",
  "counters": {
    "http_requests_total": 1000,
    "jwt_tokens_generated": 500,
    "kong_operations": 600,
    "cache_hits": 450,
    "cache_misses": 150
  }
}
```

## Metrics Endpoints

### GET /metrics
Unified metrics endpoint with multiple views for operational, infrastructure, and telemetry data.

**Request**
```http
GET /metrics HTTP/1.1
Host: auth-service.example.com
```

**Query Parameters**
| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `view` | String | Metrics view: `operational`, `infrastructure`, `telemetry`, `exports`, `config`, `full` | `operational` |

**Response - Operational View (200 OK)**
```json
{
  "timestamp": "2025-01-15T12:00:00.000Z",
  "uptime": 3600,
  "memory": {
    "used": 64,
    "total": 128,
    "rss": 80,
    "external": 16
  },
  "cache": {
    "strategy": "local-memory",
    "size": 150,
    "activeEntries": 45,
    "hitRate": "0.90",
    "operations": {
      "hits": 450,
      "misses": 50,
      "sets": 100
    }
  },
  "kong": {
    "mode": "KONNECT",
    "circuitBreaker": {
      "state": "CLOSED",
      "failures": 0,
      "successes": 500
    }
  }
}
```

**Available Views**
```bash
# Operational metrics (default)
GET /metrics

# Infrastructure view
GET /metrics?view=infrastructure

# Telemetry system status
GET /metrics?view=telemetry

# Export statistics
GET /metrics?view=exports

# Configuration summary
GET /metrics?view=config

# Complete metrics data
GET /metrics?view=full
```

## Debug Endpoints

### POST /debug/metrics/test
Record test metrics for verification (development only).

**Request**
```http
POST /debug/metrics/test HTTP/1.1
Host: auth-service.example.com
Content-Type: application/json

{
  "count": 10,
  "type": "test-metric"
}
```

**Response - Success (200 OK)**
```json
{
  "success": true,
  "message": "Test metrics recorded successfully",
  "metricsRecorded": {
    "testCounter": 10,
    "testHistogram": 5,
    "timestamp": "2025-01-15T12:00:00.000Z"
  }
}
```

### POST /debug/metrics/export
Force immediate metrics export (development only).

**Request**
```http
POST /debug/metrics/export HTTP/1.1
Host: auth-service.example.com
```

**Response - Success (200 OK)**
```json
{
  "success": true,
  "exported": {
    "metrics": 50,
    "timestamp": "2025-01-15T12:00:00.000Z"
  }
}
```

## Profiling Endpoints (Development Only)

### POST /debug/profiling/start
Start a profiling session for performance analysis.

**Request**
```http
POST /debug/profiling/start HTTP/1.1
Host: auth-service.example.com
```

**Response - Success (200 OK)**
```json
{
  "success": true,
  "message": "Profiling session started",
  "sessionId": "prof-12345",
  "devToolsUrl": "chrome-devtools://devtools/bundled/inspector.html?ws=localhost:9229/12345"
}
```

### POST /debug/profiling/stop
Stop the current profiling session.

**Request**
```http
POST /debug/profiling/stop HTTP/1.1
Host: auth-service.example.com
```

**Response - Success (200 OK)**
```json
{
  "success": true,
  "message": "Profiling session stopped",
  "sessionId": "prof-12345",
  "duration": "45.2s",
  "artifacts": [
    "profiling/profile-12345.cpuprofile",
    "profiling/heap-12345.heapsnapshot"
  ]
}
```

### GET /debug/profiling/status
Check profiling system status.

**Request**
```http
GET /debug/profiling/status HTTP/1.1
Host: auth-service.example.com
```

**Response - Success (200 OK)**
```json
{
  "enabled": true,
  "active": false,
  "lastSession": {
    "id": "prof-12345",
    "startTime": "2025-01-15T11:30:00.000Z",
    "endTime": "2025-01-15T11:35:00.000Z",
    "duration": "5m"
  },
  "reports": [
    {
      "id": "prof-12345",
      "type": "cpu",
      "size": "2.4MB",
      "created": "2025-01-15T11:35:00.000Z"
    }
  ]
}
```

## Error Handling

### HTTP Status Codes
| Status Code | Scenario | Response Body |
|-------------|----------|---------------|
| 200 OK | Successful operation | JSON response with data |
| 401 Unauthorized | Missing consumer ID or anonymous consumer | Error details |
| 404 Not Found | Endpoint not found | Error details |
| 500 Internal Server Error | Unexpected errors | Error details |
| 503 Service Unavailable | Kong Admin API unreachable | Error details |

### Error Response Format
```json
{
  "error": "Error Type",
  "message": "Detailed error message",
  "timestamp": "2025-01-15T12:00:00.000Z",
  "statusCode": 401,
  "requestId": "req-12345-67890"
}
```

### Common Error Scenarios
```typescript
// Missing Kong headers
if (!request.headers.get("x-consumer-id")) {
  return new Response("Unauthorized", { status: 401 });
}

// Anonymous consumer
if (request.headers.get("x-anonymous-consumer") === "true") {
  return new Response("Unauthorized", { status: 401 });
}

// Kong API failure
try {
  const secret = await kongService.getOrCreateConsumerSecret(consumerId);
} catch (error) {
  logger.error("Kong API error", { error, consumerId });
  return new Response("Service Unavailable", { status: 503 });
}

// JWT generation failure
try {
  const token = await jwtService.generateToken(username, secret.key, secret.secret);
} catch (error) {
  logger.error("JWT generation error", { error });
  return new Response("Internal Server Error", { status: 500 });
}
```

## CORS Support

The service includes built-in CORS support for browser-based applications:

```http
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-Consumer-ID, X-Consumer-Username, X-Anonymous-Consumer
Access-Control-Max-Age: 86400
```

### CORS Configuration
- **Default**: `*` (wildcard - allows all origins)
- **Configurable**: Set `API_CORS` environment variable to specific origins
- **Security**: Use specific origins in production (e.g., `https://app.example.com`)

### Preflight Requests
```http
OPTIONS /tokens HTTP/1.1
Host: auth-service.example.com
Origin: https://example.com
Access-Control-Request-Method: GET
Access-Control-Request-Headers: X-Consumer-ID,X-Consumer-Username

HTTP/1.1 204 No Content
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-Consumer-ID, X-Consumer-Username, X-Anonymous-Consumer
Access-Control-Max-Age: 86400
```

## Rate Limiting

Rate limiting is typically handled at the Kong Gateway level, but the service includes circuit breaker protection to prevent overwhelming the Kong Admin API:

### Circuit Breaker Configuration
- **Timeout**: 500ms for Kong API calls
- **Error Threshold**: 50% failure rate over 10-second window
- **Reset Timeout**: 30 seconds for circuit recovery
- **Stale Data Tolerance**: 30 minutes (in-memory) or 2 hours (Redis HA mode)

### Circuit Breaker States
- **CLOSED**: Normal operation, requests pass through
- **OPEN**: Circuit breaker active, requests use stale cache
- **HALF_OPEN**: Testing if service has recovered