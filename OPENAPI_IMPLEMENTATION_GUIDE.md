# OpenAPI Documentation Generation Implementation Guide - Updated

This guide documents the enhanced OpenAPI documentation generation system with dynamic configuration, Kong integration, and production-ready patterns.

## Architecture Overview

The system consists of four core components:

1. **OpenAPI Generator Class** (`src/openapi-generator.ts`) - Core logic for generating OpenAPI specifications
2. **Generation Script** (`scripts/generate-openapi.ts`) - CLI script for building documentation files
3. **Dynamic Configuration** (`src/config/index.ts`) - Environment-based API information and configuration
4. **Package.json Scripts** - Integration with build process and developer workflow

## Key Enhancements

### Dynamic Configuration
- Environment variable-based API information (title, description, version, contact)
- Runtime configuration injection via `setConfig()`
- Environment-aware server URL generation
- Support for development, staging, and production environments

### Kong Integration
- Kong-specific header patterns for consumer authentication
- Security scheme definitions for API key authentication
- Support for anonymous consumer detection and rejection
- Kong Admin API health check integration

### Production-Ready Features
- OpenTelemetry telemetry status endpoints
- Comprehensive health checks with dependency monitoring
- Performance metrics and debugging endpoints
- Standardized error response schemas with request IDs

## Updated Implementation

### Enhanced OpenAPI Generator Class

```typescript
// src/openapi-generator.ts
export interface RouteDefinition {
  path: string;
  method: string;
  summary: string;
  description: string;
  tags: string[];
  requiresAuth?: boolean;
  parameters?: any[];
  requestBody?: any;
  responses?: any;
}

class OpenAPIGenerator {
  private routes: RouteDefinition[] = [];
  private apiVersion = "1.0.0";
  private config: any = null;

  setConfig(config: any): void {
    this.config = config;
  }

  private generateServers(): any[] {
    const servers = [];

    if (this.config) {
      // Dynamic server generation based on current config
      const currentUrl = `http://localhost:${this.config.server.port}`;
      const envDescription = this.config.server.nodeEnv === "production"
        ? "Production server"
        : this.config.server.nodeEnv === "staging"
          ? "Staging server"
          : "Development server";

      servers.push({
        url: currentUrl,
        description: `${envDescription} (current)`
      });
    }

    return servers;
  }

  generateSpec(): any {
    // Use dynamic API info from config if available
    const apiInfo = this.config?.apiInfo || {
      title: "Authentication Service API",
      description: "High-performance authentication service with Kong integration",
      version: this.apiVersion,
      contactName: "PVH Corp",
      contactEmail: "api-support@pvh.com"
    };

    return {
      openapi: "3.0.3",
      info: {
        title: apiInfo.title,
        description: apiInfo.description,
        version: apiInfo.version,
        contact: {
          name: apiInfo.contactName,
          email: apiInfo.contactEmail
        }
      },
      servers: this.generateServers(),
      // ... rest of spec generation
    };
  }
}
```

### Environment Variables for Dynamic Configuration

```bash
# API Information (all optional, will use defaults if not provided)
API_TITLE="PVH Authentication Service API"
API_DESCRIPTION="High-performance authentication service with Kong integration"
API_VERSION="1.0.0"
API_CONTACT_NAME="PVH Corp"
API_CONTACT_EMAIL="api-support@pvh.com"
API_LICENSE_NAME="Proprietary"
API_LICENSE_IDENTIFIER="UNLICENSED"
```

### Kong Authentication Patterns

```typescript
// Kong consumer headers for /tokens endpoint
if (route.path === "/tokens") {
  operation.parameters = [
    {
      name: "x-consumer-id",
      in: "header",
      required: true,
      description: "Kong consumer ID",
      schema: { type: "string", example: "demo_user" }
    },
    {
      name: "x-consumer-username",
      in: "header",
      required: true,
      description: "Kong consumer username",
      schema: { type: "string", example: "demo_user" }
    },
    {
      name: "x-anonymous-consumer",
      in: "header",
      required: false,
      description: "Indicates if request is from anonymous consumer",
      schema: { type: "string", enum: ["true", "false"], example: "false" }
    }
  ];
}
```

### Enhanced Schema Definitions

```typescript
schemas: {
  TokenResponse: {
    type: "object",
    required: ["access_token", "expires_in"],
    properties: {
      access_token: {
        type: "string",
        description: "JWT access token",
        example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
      },
      expires_in: {
        type: "integer",
        description: "Token expiration time in seconds",
        example: 900,
        minimum: 1
      }
    }
  },
  HealthResponse: {
    type: "object",
    required: ["status", "timestamp", "version", "uptime", "dependencies"],
    properties: {
      status: {
        type: "string",
        enum: ["healthy", "degraded", "unhealthy"],
        example: "healthy"
      },
      dependencies: {
        type: "object",
        properties: {
          kong: {
            type: "object",
            properties: {
              status: { type: "string", enum: ["healthy", "unhealthy"] },
              response_time: { type: "integer", minimum: 0 },
              url: { type: "string", format: "uri" }
            }
          }
        }
      }
    }
  },
  ErrorResponse: {
    type: "object",
    required: ["error", "message", "statusCode", "timestamp"],
    properties: {
      error: { type: "string", example: "VALIDATION_ERROR" },
      message: { type: "string", example: "Missing required Kong consumer headers" },
      statusCode: { type: "integer", example: 400, minimum: 400, maximum: 599 },
      timestamp: { type: "string", format: "date-time" },
      requestId: { type: "string", format: "uuid" }
    }
  }
}
```

### Route Registration Examples

```typescript
registerAllRoutes(): void {
  // API documentation endpoint
  this.registerRoute({
    path: "/",
    method: "GET",
    summary: "OpenAPI specification",
    description: "Get the OpenAPI 3.0.3 specification for this API",
    tags: ["Documentation"]
  });

  // Authentication endpoints
  this.registerRoute({
    path: "/tokens",
    method: "GET",
    summary: "Issue JWT token",
    description: "Generate a JWT access token for authenticated Kong consumers",
    tags: ["Authentication"],
    requiresAuth: false // Uses Kong consumer headers instead
  });

  // Health check endpoints
  this.registerRoute({
    path: "/health",
    method: "GET",
    summary: "System health check",
    description: "Get comprehensive system health status including dependency checks",
    tags: ["Health"]
  });

  this.registerRoute({
    path: "/health/telemetry",
    method: "GET",
    summary: "Telemetry health status",
    description: "Get OpenTelemetry configuration and initialization status",
    tags: ["Health"]
  });

  // Metrics endpoints
  this.registerRoute({
    path: "/metrics",
    method: "GET",
    summary: "Performance metrics",
    description: "Get service performance metrics and operational statistics",
    tags: ["Metrics"]
  });

  // Debug endpoints
  this.registerRoute({
    path: "/debug/metrics/stats",
    method: "GET",
    summary: "Export statistics",
    description: "Get detailed metrics export statistics",
    tags: ["Debug", "Metrics"]
  });
}
```

### Updated Package.json Scripts

```json
{
  "scripts": {
    "generate-docs": "bun scripts/generate-openapi.ts",
    "generate-docs:json": "bun scripts/generate-openapi.ts --format json",
    "generate-docs:yaml": "bun scripts/generate-openapi.ts --format yaml",
    "generate-docs:verbose": "bun scripts/generate-openapi.ts --verbose",
    "dev": "bun run generate-docs && bun src/server.ts",
    "start": "bun run src/server.ts",
    "build": "bun run generate-docs && bun build src/server.ts --target=bun --outdir=dist --minify",
    "typecheck": "tsc --noEmit",
    "check": "biome check ."
  }
}
```

### Enhanced Generation Script

```typescript
// scripts/generate-openapi.ts
async function generateOpenAPISpec(options: GenerationOptions = {}): Promise<GenerationStats> {
  const startTime = Date.now();

  // Load configuration and set it on the generator
  const defaultConfig = {
    server: { port: 3000, nodeEnv: "development" }
  };
  apiDocGenerator.setConfig(defaultConfig);

  // Register all routes and generate specification
  apiDocGenerator.registerAllRoutes();
  const openApiSpec = apiDocGenerator.generateSpec();

  const stats: GenerationStats = {
    duration: 0,
    filesGenerated: [],
    totalSize: 0,
    routeCount: Object.keys(openApiSpec.paths).length,
    schemaCount: Object.keys(openApiSpec.components.schemas).length
  };

  // Generate files in specified formats
  if (format === "json" || format === "both") {
    const jsonContent = JSON.stringify(openApiSpec, null, 2);
    const jsonPath = path.join(outputDir, "openapi.json");
    await writeFile(jsonPath, jsonContent, "utf-8");
    stats.filesGenerated.push(jsonPath);
    stats.totalSize += Buffer.byteLength(jsonContent, "utf-8");
  }

  if (format === "yaml" || format === "both") {
    const yamlContent = `# OpenAPI 3.0.3 specification
# Generated on: ${new Date().toISOString()}
${convertToYaml(openApiSpec)}`;
    const yamlPath = path.join(outputDir, "openapi-generated.yaml");
    await writeFile(yamlPath, yamlContent, "utf-8");
    stats.filesGenerated.push(yamlPath);
    stats.totalSize += Buffer.byteLength(yamlContent, "utf-8");
  }

  stats.duration = Date.now() - startTime;
  return stats;
}
```

## Usage Examples

### With Environment Configuration

```bash
# Set custom API info via environment variables
export API_TITLE="Custom Authentication API"
export API_DESCRIPTION="Custom description for my API"
export API_VERSION="2.0.0"

# Generate documentation with custom info
bun run generate-docs:verbose
```

### Programmatic Usage with Configuration

```typescript
import { generateOpenAPISpec } from "./scripts/generate-openapi.ts";
import { loadConfig } from "./src/config/index.js";

// Load dynamic configuration
const config = loadConfig();

// Generate documentation with runtime config
const stats = await generateOpenAPISpec({
  outputDir: "./api-docs",
  format: "both",
  verbose: true
});

console.log(`Generated ${stats.filesGenerated.length} files`);
console.log(`Routes: ${stats.routeCount}, Schemas: ${stats.schemaCount}`);
```

## Migration from Basic Implementation

### 1. Add Dynamic Configuration Support

```typescript
// Before: Static configuration
class OpenAPIGenerator {
  private apiVersion = "1.0.0";
  private baseUrl = "http://localhost:3000";
}

// After: Dynamic configuration
class OpenAPIGenerator {
  private config: any = null;

  setConfig(config: any): void {
    this.config = config;
  }

  generateSpec(): any {
    const apiInfo = this.config?.apiInfo || defaultApiInfo;
    // Use dynamic configuration...
  }
}
```

### 2. Enhance Schema Definitions

```typescript
// Before: Basic schemas
Product: {
  type: "object",
  properties: {
    id: { type: "integer" },
    name: { type: "string" }
  }
}

// After: Comprehensive schemas with validation
TokenResponse: {
  type: "object",
  required: ["access_token", "expires_in"],
  properties: {
    access_token: {
      type: "string",
      description: "JWT access token",
      example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    },
    expires_in: {
      type: "integer",
      description: "Token expiration time in seconds",
      example: 900,
      minimum: 1
    }
  }
}
```

### 3. Add Authentication Patterns

```typescript
// Before: Basic parameters
operation.parameters = [
  { name: "id", in: "path", required: true }
];

// After: Kong authentication headers
if (route.path === "/tokens") {
  operation.parameters = [
    {
      name: "x-consumer-id",
      in: "header",
      required: true,
      description: "Kong consumer ID",
      schema: { type: "string", example: "demo_user" }
    }
    // ... additional Kong headers
  ];
}
```

## Best Practices

### 1. Configuration Management
- Use environment variables for API information
- Provide sensible defaults for all configuration values
- Validate configuration at startup
- Support multiple environments (dev, staging, prod)

### 2. Schema Design
- Include comprehensive validation rules
- Provide realistic example values
- Use consistent naming conventions
- Document all fields with descriptions

### 3. Authentication Integration
- Define security schemes clearly
- Document authentication requirements
- Provide examples for auth headers
- Handle authentication errors appropriately

### 4. Error Handling
- Use standardized error response formats
- Include request IDs for tracing
- Map HTTP status codes correctly
- Provide detailed error descriptions

This enhanced implementation provides a production-ready OpenAPI documentation system with dynamic configuration, Kong integration, and comprehensive observability features.