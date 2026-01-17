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

**Header Validation**
- Maximum header length: **256 characters** for `X-Consumer-ID` and `X-Consumer-Username`
- Headers exceeding this limit return `AUTH_007` (Invalid Request Format)
- This is a security measure to prevent injection attacks

**Response - Success (200 OK)**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 900
}
```

**Response Fields**
| Field | Type | Description |
|-------|------|-------------|
| `access_token` | String | JWT token string |
| `expires_in` | Integer | Token lifetime in seconds (default: 900 = 15 minutes) |

**Response - Unauthorized (401)**
```json
{
  "error": "Unauthorized",
  "message": "Missing Kong consumer headers",
  "timestamp": "2025-01-15T12:00:00.000Z"
}
```

**Response - Service Unavailable (503)**
```json
{
  "error": "Service Unavailable",
  "message": "Authentication service is temporarily unavailable. Please try again later.",
  "details": "Kong gateway connectivity issues",
  "timestamp": "2025-01-15T12:00:00.000Z"
}
```

**Error Responses**
- **401 Unauthorized**: Missing `X-Consumer-ID` header, missing `X-Consumer-Username`, or `X-Anonymous-Consumer` is "true"
- **503 Service Unavailable**: Kong Admin API unreachable or consumer secret lookup failed

## Health Check Endpoints

### GET /health
Main health check endpoint with comprehensive dependency status.

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
  "version": "1.0.0",
  "environment": "production",
  "uptime": 3600,
  "highAvailability": false,
  "dependencies": {
    "kong": {
      "status": "healthy",
      "responseTime": 45,
      "details": {
        "adminUrl": "http://kong:8001",
        "mode": "API_GATEWAY"
      }
    },
    "cache": {
      "status": "healthy",
      "type": "memory",
      "responseTime": 1,
      "staleCache": {
        "available": true
      }
    },
    "telemetry": {
      "traces": {
        "status": "healthy",
        "endpoint": "https://otel.example.com/v1/traces",
        "responseTime": 10
      },
      "metrics": {
        "status": "healthy",
        "endpoint": "https://otel.example.com/v1/metrics",
        "responseTime": 8
      },
      "logs": {
        "status": "healthy",
        "endpoint": "https://otel.example.com/v1/logs",
        "responseTime": 12
      }
    }
  },
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response - Degraded (503)**
```json
{
  "status": "degraded",
  "timestamp": "2025-01-15T12:00:00.000Z",
  "version": "1.0.0",
  "environment": "production",
  "uptime": 3600,
  "highAvailability": true,
  "dependencies": {
    "kong": {
      "status": "unhealthy",
      "responseTime": 5000,
      "details": {
        "adminUrl": "http://kong:8001",
        "mode": "API_GATEWAY",
        "error": "Connection timeout"
      }
    },
    "cache": {
      "status": "healthy",
      "type": "redis",
      "responseTime": 2,
      "staleCache": {
        "available": true,
        "responseTime": 1
      }
    },
    "telemetry": {
      "traces": {
        "status": "healthy",
        "endpoint": "https://otel.example.com/v1/traces",
        "responseTime": 10
      },
      "metrics": {
        "status": "healthy",
        "endpoint": "https://otel.example.com/v1/metrics",
        "responseTime": 8
      },
      "logs": {
        "status": "healthy",
        "endpoint": "https://otel.example.com/v1/logs",
        "responseTime": 12
      }
    }
  },
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response Fields**
| Field | Type | Description |
|-------|------|-------------|
| `status` | String | Overall health: "healthy", "degraded", or "unhealthy" |
| `timestamp` | String | ISO-8601 timestamp |
| `version` | String | Service version from package.json |
| `environment` | String | Current NODE_ENV |
| `uptime` | Integer | Process uptime in seconds |
| `highAvailability` | Boolean | Whether HA mode is enabled (Redis) |
| `dependencies.kong` | Object | Kong gateway health status |
| `dependencies.cache` | Object | Cache system health (memory or redis) |
| `dependencies.telemetry` | Object | OTLP endpoint health per signal type |
| `requestId` | String | UUID for request tracing |

### GET /health/ready
Readiness probe verifying the service can handle requests (validates Kong connectivity).

**Request**
```http
GET /health/ready HTTP/1.1
Host: auth-service.example.com
```

**Response - Ready (200 OK)**
```json
{
  "ready": true,
  "timestamp": "2025-01-15T12:00:00.000Z",
  "checks": {
    "kong": {
      "status": "healthy",
      "responseTime": 45,
      "details": {
        "adminUrl": "http://kong:8001",
        "mode": "API_GATEWAY"
      }
    }
  },
  "responseTime": 50,
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response - Not Ready (503)**
```json
{
  "ready": false,
  "timestamp": "2025-01-15T12:00:00.000Z",
  "checks": {
    "kong": {
      "status": "unhealthy",
      "responseTime": 5000,
      "details": {
        "adminUrl": "http://kong:8001",
        "mode": "API_GATEWAY",
        "error": "Connection timeout"
      }
    }
  },
  "responseTime": 5010,
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response Fields**
| Field | Type | Description |
|-------|------|-------------|
| `ready` | Boolean | Whether service is ready to accept traffic |
| `timestamp` | String | ISO-8601 timestamp |
| `checks.kong` | Object | Kong connectivity check result |
| `responseTime` | Integer | Total check duration in milliseconds |
| `requestId` | String | UUID for request tracing |

**Usage**
- Use for readiness probes in any orchestration platform (Kubernetes, Docker Swarm, Nomad, etc.)
- Use with load balancers to determine if instance should receive traffic
- Different from `/health` which checks liveness (service is running)
- Instance should not receive traffic until this returns 200

### GET /health/telemetry
Telemetry system health and configuration details.

**Request**
```http
GET /health/telemetry HTTP/1.1
Host: auth-service.example.com
```

**Response - Success (200 OK)**
```json
{
  "telemetry": {
    "mode": "otlp",
    "status": {
      "initialized": true,
      "metricsExportStats": {
        "totalExports": 100,
        "successfulExports": 98,
        "failedExports": 2
      }
    },
    "simple": {
      "traces": "active",
      "metrics": "active",
      "logs": "active"
    },
    "configuration": {
      "serviceName": "authentication-service",
      "serviceVersion": "1.0.0",
      "environment": "production",
      "endpoints": {
        "traces": "https://otel.example.com/v1/traces",
        "metrics": "https://otel.example.com/v1/metrics",
        "logs": "https://otel.example.com/v1/logs"
      },
      "timeout": 30000,
      "batchSize": 2048,
      "queueSize": 10000
    }
  },
  "timestamp": "2025-01-15T12:00:00.000Z"
}
```

**Response Fields**
| Field | Type | Description |
|-------|------|-------------|
| `telemetry.mode` | String | Telemetry mode: "console", "otlp", or "both" |
| `telemetry.status` | Object | Initialization and export statistics |
| `telemetry.simple` | Object | Simple status per signal type |
| `telemetry.configuration` | Object | Current telemetry configuration |
| `timestamp` | String | ISO-8601 timestamp |

### GET /health/metrics
Metrics system health with circuit breaker summary.

**Request**
```http
GET /health/metrics HTTP/1.1
Host: auth-service.example.com
```

**Response - Success (200 OK)**
```json
{
  "metrics": {
    "status": {
      "initialized": true,
      "meterProvider": "active"
    },
    "exports": {
      "totalExports": 100,
      "successfulExports": 98,
      "failedExports": 2,
      "lastExportTime": "2025-01-15T11:59:50.000Z"
    },
    "configuration": {
      "exportInterval": 10000,
      "batchTimeout": 30000,
      "endpoint": "https://otel.example.com/v1/metrics"
    }
  },
  "circuitBreakers": {
    "enabled": true,
    "totalBreakers": 3,
    "states": {
      "closed": 3,
      "open": 0,
      "halfOpen": 0
    }
  },
  "timestamp": "2025-01-15T12:00:00.000Z"
}
```

**Response Fields**
| Field | Type | Description |
|-------|------|-------------|
| `metrics.status` | Object | Metrics system initialization status |
| `metrics.exports` | Object | Export statistics |
| `metrics.configuration` | Object | Current metrics configuration |
| `circuitBreakers` | Object | Summary of all circuit breaker states |
| `timestamp` | String | ISO-8601 timestamp |

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
| `view` | String | Metrics view type | `operational` |

**Available Views**
| View | Description |
|------|-------------|
| `operational` | Runtime metrics, memory, cache, circuit breakers, consumer volume |
| `infrastructure` | Infrastructure-level metrics status |
| `telemetry` | Telemetry system mode and export stats |
| `exports` | Detailed export statistics |
| `config` | Configuration summary (Kong, telemetry endpoints) |
| `full` | All metrics combined |

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
    "entries": [],
    "activeEntries": 45,
    "hitRate": "0.90",
    "averageLatencyMs": 1
  },
  "circuitBreakers": {
    "kong_get_consumer_secret": {
      "state": "closed",
      "failures": 0,
      "successes": 500
    },
    "kong_health_check": {
      "state": "closed",
      "failures": 0,
      "successes": 100
    }
  },
  "telemetry": {
    "mode": "both",
    "exportStats": {
      "totalExports": 100,
      "successfulExports": 98,
      "failedExports": 2
    }
  },
  "kong": {
    "adminUrl": "http://kong:8001",
    "mode": "API_GATEWAY"
  },
  "consumers": {
    "volume": {
      "high": 10,
      "medium": 50,
      "low": 200,
      "total": 260
    }
  }
}
```

**Response - Config View (200 OK)**
```json
{
  "timestamp": "2025-01-15T12:00:00.000Z",
  "configuration": {
    "kong": {
      "adminUrl": "http://kong:8001",
      "mode": "API_GATEWAY"
    },
    "telemetry": {
      "mode": "both",
      "initialized": true,
      "serviceName": "authentication-service",
      "serviceVersion": "1.0.0",
      "environment": "production",
      "endpoints": {
        "traces": "https://otel.example.com/v1/traces",
        "metrics": "https://otel.example.com/v1/metrics",
        "logs": "https://otel.example.com/v1/logs"
      },
      "timeout": 30000,
      "batchSize": 2048,
      "queueSize": 10000
    }
  }
}
```

**Response - Invalid View (400)**
```json
{
  "error": "Invalid view parameter",
  "message": "Valid views: operational, infrastructure, telemetry, exports, config, full",
  "timestamp": "2025-01-15T12:00:00.000Z"
}
```

## Debug Endpoints

### POST /debug/metrics/test
Record test metrics for verification (development/staging only).

**Request**
```http
POST /debug/metrics/test HTTP/1.1
Host: auth-service.example.com
```

**Response - Success (200 OK)**
```json
{
  "success": true,
  "message": "Test metrics recorded successfully",
  "metricsRecorded": 5,
  "timestamp": "2025-01-15T12:00:00.000Z"
}
```

**Response - Error (500)**
```json
{
  "success": false,
  "error": "Failed to record test metrics",
  "message": "Detailed error message",
  "timestamp": "2025-01-15T12:00:00.000Z"
}
```

### POST /debug/metrics/export
Force immediate metrics export (development/staging only).

**Request**
```http
POST /debug/metrics/export HTTP/1.1
Host: auth-service.example.com
```

**Response - Success (200 OK)**
```json
{
  "success": true,
  "message": "Metrics exported successfully",
  "exportedMetrics": 10,
  "duration": 150,
  "errors": [],
  "timestamp": "2025-01-15T12:00:00.000Z"
}
```

## Profiling Endpoints (Development/Staging Only)

All profiling endpoints require `PROFILING_ENABLED=true` in environment configuration.

### POST /debug/profiling/start
Start a profiling session for performance analysis.

**Request**
```http
POST /debug/profiling/start?type=cpu&manual=true HTTP/1.1
Host: auth-service.example.com
```

**Query Parameters**
| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `type` | String | Profile type: "cpu" or "heap" | `cpu` |
| `manual` | Boolean | Manual toggle mode via SIGUSR2 | `true` |

**Response - Success (200 OK)**
```json
{
  "success": true,
  "message": "Profiling session started successfully",
  "sessionId": "prof-1705320000000-abc123def",
  "type": "cpu",
  "manual": true,
  "instructions": "Send SIGUSR2 signal to toggle profiling or use the stop endpoint",
  "requestId": "req-1705320000000-xyz789"
}
```

**Response - Session Already Running (400)**
```json
{
  "error": "Bad Request",
  "message": "Cannot start profiling session - another session is already running",
  "statusCode": 400,
  "requestId": "req-1705320000000-xyz789"
}
```

**Response - Profiling Disabled (200)**
```json
{
  "success": true,
  "message": "Profiling service is available but disabled via configuration",
  "enabled": false,
  "sessionId": null,
  "instructions": "Enable profiling by setting PROFILING_ENABLED=true in your environment configuration",
  "requestId": "req-1705320000000-xyz789"
}
```

### POST /debug/profiling/stop
Stop the current profiling session.

**Request**
```http
POST /debug/profiling/stop?sessionId=prof-12345 HTTP/1.1
Host: auth-service.example.com
```

**Query Parameters**
| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `sessionId` | String | Optional session identifier | `global` |

**Response - Success (200 OK)**
```json
{
  "success": true,
  "message": "Profiling session stopped successfully",
  "sessionId": "global",
  "instructions": "Profile data is available in Chrome DevTools at chrome://inspect",
  "note": "Use Chrome DevTools to capture and export CPU/Memory profiles",
  "requestId": "req-1705320000000-xyz789"
}
```

### GET /debug/profiling/status
Check profiling system status and available commands.

**Request**
```http
GET /debug/profiling/status HTTP/1.1
Host: auth-service.example.com
```

**Response - Success (200 OK)**
```json
{
  "success": true,
  "enabled": true,
  "sessions": [],
  "environment": "development",
  "integration": "Chrome DevTools Protocol",
  "instructions": "Use Chrome DevTools at chrome://inspect for profiling",
  "availableCommands": {
    "start": "POST /debug/profiling/start?type=cpu&manual=true",
    "stop": "POST /debug/profiling/stop?sessionId=<id>",
    "status": "GET /debug/profiling/status",
    "cleanup": "POST /debug/profiling/cleanup"
  },
  "requestId": "req-1705320000000-xyz789"
}
```

### GET /debug/profiling/reports
List available profiling reports.

**Request**
```http
GET /debug/profiling/reports HTTP/1.1
Host: auth-service.example.com
```

**Response - Success (200 OK)**
```json
{
  "success": true,
  "reports": [
    {
      "path": "/path/to/profiling/profile-12345.html",
      "name": "profile-12345.html",
      "url": "/debug/profiling/report?file=%2Fpath%2Fto%2Fprofiling%2Fprofile-12345.html"
    }
  ],
  "total": 1,
  "instructions": "Open the HTML files in your browser for interactive flamegraph analysis",
  "requestId": "req-1705320000000-xyz789"
}
```

### GET /debug/profiling/report
Retrieve a specific profiling report file.

**Request**
```http
GET /debug/profiling/report?file=/path/to/report.html HTTP/1.1
Host: auth-service.example.com
```

**Query Parameters**
| Parameter | Type | Description | Required |
|-----------|------|-------------|----------|
| `file` | String | Path to the report file | Yes |

**Response - Success (200 OK)**
Returns HTML content of the flamegraph report with `Content-Type: text/html`.

**Response - Missing Parameter (400)**
```json
{
  "error": "Bad Request",
  "message": "File parameter is required",
  "statusCode": 400,
  "requestId": "req-1705320000000-xyz789"
}
```

**Response - Not Found (404)**
```json
{
  "error": "Not Found",
  "message": "Report file not found",
  "statusCode": 404,
  "requestId": "req-1705320000000-xyz789"
}
```

### POST /debug/profiling/cleanup
Clean up profiling artifacts.

**Request**
```http
POST /debug/profiling/cleanup HTTP/1.1
Host: auth-service.example.com
```

**Response - Success (200 OK)**
```json
{
  "success": true,
  "message": "Profiling artifacts cleaned up successfully",
  "cleaned": [
    "*.pb files (pprof binary files)",
    "*.html files (flamegraph reports)",
    "flame-* artifacts",
    "profiling/ directory"
  ],
  "requestId": "req-1705320000000-xyz789"
}
```

## Error Handling

### HTTP Status Codes
| Status Code | Scenario | Response Body |
|-------------|----------|---------------|
| 200 OK | Successful operation | JSON response with data |
| 400 Bad Request | Invalid parameters or request | Error details |
| 401 Unauthorized | Missing consumer ID or anonymous consumer | Error details |
| 404 Not Found | Endpoint or resource not found | Error details |
| 500 Internal Server Error | Unexpected errors | Error details |
| 503 Service Unavailable | Kong Admin API unreachable | Error details |

### Error Response Format
```json
{
  "error": "Error Type",
  "message": "Detailed error message",
  "timestamp": "2025-01-15T12:00:00.000Z",
  "statusCode": 401,
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "errorCode": "AUTH_001"
}
```

### Structured Error Codes

The service uses standardized error codes for programmatic error handling:

| Code | HTTP | Title | Description |
|------|------|-------|-------------|
| `AUTH_001` | 401 | Missing Consumer Headers | Required Kong consumer headers not present |
| `AUTH_002` | 401 | Consumer Not Found | Consumer not found or has no JWT credentials |
| `AUTH_003` | 500 | JWT Creation Failed | Internal error during token generation |
| `AUTH_004` | 503 | Kong API Unavailable | Kong gateway temporarily unavailable |
| `AUTH_005` | 503 | Circuit Breaker Open | Service protected by circuit breaker |
| `AUTH_006` | 429 | Rate Limit Exceeded | Request rate limit exceeded |
| `AUTH_007` | 400 | Invalid Request Format | Request format invalid (e.g., header too long) |
| `AUTH_008` | 500 | Internal Server Error | Unexpected internal error |
| `AUTH_009` | 401 | Anonymous Consumer | Anonymous consumers not allowed |
| `AUTH_010` | 401 | Token Expired | JWT token has expired |
| `AUTH_011` | 400 | Invalid Token | JWT token is invalid or malformed |
| `AUTH_012` | 400 | Missing Authorization | Bearer token required but not provided |

For detailed troubleshooting of each error code, see the [Troubleshooting Guide](../operations/TROUBLESHOOTING.md).

### Common Error Scenarios
```typescript
// Missing Kong headers
if (!request.headers.get("x-consumer-id")) {
  return createUnauthorizedResponse("Missing Kong consumer headers", requestId);
}

// Anonymous consumer
if (request.headers.get("x-anonymous-consumer") === "true") {
  return createUnauthorizedResponse("Anonymous consumers are not allowed", requestId);
}

// Kong API failure
try {
  const secret = await kongService.getConsumerSecret(consumerId);
} catch (error) {
  return new Response("Service Unavailable", { status: 503 });
}

// JWT generation failure
try {
  const token = await NativeBunJWT.createToken(...);
} catch (error) {
  return createInternalErrorResponse("An unexpected error occurred", requestId);
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

## Circuit Breaker Protection

Rate limiting is typically handled at the Kong Gateway level, but the service includes circuit breaker protection to prevent overwhelming the Kong Admin API:

### Circuit Breaker Configuration (Actual Defaults)
- **Timeout**: 5000ms (5 seconds) for Kong API calls
- **Error Threshold**: 50% failure rate over rolling window
- **Reset Timeout**: 60000ms (60 seconds) for circuit recovery
- **Rolling Count Timeout**: 10000ms (10 seconds)
- **Rolling Count Buckets**: 10
- **Volume Threshold**: 3 requests minimum before circuit can open
- **Stale Data Tolerance**: 30 minutes (default)

### Circuit Breaker States
- **closed**: Normal operation, requests pass through
- **open**: Circuit breaker active, requests use stale cache fallback
- **half-open**: Testing if service has recovered with limited requests

### Per-Operation Circuit Breakers
The service uses operation-specific circuit breakers:
- `kong_get_consumer_secret` - Consumer secret lookup
- `kong_health_check` - Health check operations
- `kong_list_consumers` - Consumer listing operations
