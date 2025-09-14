# OpenAPI Documentation Generation Implementation Guide

This guide documents how to replicate the automated OpenAPI documentation generation system used in this project for other codebases.

## Architecture Overview

The system consists of three core components:

1. **OpenAPI Generator Class** (`src/openapi-generator.ts`) - Core logic for generating OpenAPI specifications
2. **Generation Script** (`scripts/generate-openapi.ts`) - CLI script for building documentation files
3. **Package.json Scripts** - Integration with build process and developer workflow

## Core Components

### 1. OpenAPI Generator Class

**Purpose**: Programmatically generate OpenAPI 3.0.3 specifications from route definitions.

**Key Features**:
- Route registration system
- Schema definitions for request/response objects
- Parameter extraction (path, query)
- Response mapping based on HTTP methods
- Reusable component definitions
- Operation ID generation

**Structure**:
```typescript
class OpenAPIGenerator {
  private routes: RouteDefinition[] = [];
  private apiVersion = "1.0.0";
  private baseUrl = "http://localhost:3000";

  registerRoute(route: RouteDefinition): void
  generateSpec(): any
  registerAllRoutes(): void
}
```

### 2. Generation Script

**Purpose**: CLI interface for generating documentation files in multiple formats.

**Features**:
- Command-line argument parsing
- Multiple output formats (JSON, YAML, both)
- Verbose mode with statistics
- Configurable output directory
- YAML conversion without external dependencies

### 3. Package Scripts Integration

**Purpose**: Integrate documentation generation into development workflow.

**Integration Points**:
- Development server startup
- Build process (both dev and production)
- Standalone documentation generation
- CI/CD pipeline compatibility

## Implementation Steps

### Step 1: Create OpenAPI Generator Class

```typescript
// src/openapi-generator.ts
export interface RouteDefinition {
  path: string;
  method: string;
  summary: string;
  description: string;
  tags: string[];
}

class OpenAPIGenerator {
  // Core implementation here
}

export const apiDocGenerator = new OpenAPIGenerator();
```

**Key Implementation Details**:

1. **Route Registration System**:
   - Define interface for route metadata
   - Store routes in private array
   - Batch registration method for all endpoints

2. **Schema Definitions**:
   - Define data models (Product, User, etc.)
   - Request/response schemas
   - Error response formats
   - Pagination metadata

3. **Component Generation**:
   - Reusable schemas
   - Common headers (versioning, pagination, CORS)
   - Response templates
   - Parameter definitions

4. **Operation ID Generation**:
   - Convert paths to camelCase
   - Map HTTP methods to action verbs
   - Handle path parameters

### Step 2: Create Generation Script

```typescript
// scripts/generate-openapi.ts
#!/usr/bin/env bun

import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { apiDocGenerator } from "../src/openapi-generator.js";

interface GenerationOptions {
  outputDir?: string;
  format?: "json" | "yaml" | "both";
  verbose?: boolean;
}

async function generateOpenAPISpec(options: GenerationOptions = {}): Promise<void> {
  // Implementation here
}

// CLI interface with argument parsing
async function main(): Promise<void> {
  // Parse arguments and call generateOpenAPISpec
}

if (import.meta.main) {
  main().catch(console.error);
}
```

**Key Implementation Details**:

1. **Command Line Interface**:
   ```bash
   -o, --output <dir>     # Output directory
   -f, --format <format>  # json, yaml, or both
   -v, --verbose         # Detailed output
   -h, --help            # Usage information
   ```

2. **File Generation**:
   - Create output directory if needed
   - Generate JSON format with proper formatting
   - Convert to YAML using custom converter
   - Provide generation statistics

3. **YAML Conversion**:
   - Custom YAML converter to avoid dependencies
   - Handle arrays, objects, and primitive values
   - Proper indentation and escaping

### Step 3: Package.json Script Configuration

```json
{
  "scripts": {
    "generate-docs": "bun scripts/generate-openapi.ts",
    "generate-docs:json": "bun scripts/generate-openapi.ts --format json",
    "generate-docs:yaml": "bun scripts/generate-openapi.ts --format yaml",
    "generate-docs:verbose": "bun scripts/generate-openapi.ts --verbose",
    "dev": "bun run generate-docs && bun src/server.ts",
    "build": "bun run generate-docs && bun build src/server.ts --outdir=./dist",
    "build:prod": "bun run generate-docs && bun build src/server.ts --outdir=./dist --minify"
  }
}
```

## Configuration Patterns

### Route Definition Pattern

```typescript
// Register routes programmatically
apiDocGenerator.registerRoute({
  path: "/api/v1/products",
  method: "GET",
  summary: "Get all products",
  description: "Retrieve all products with pagination and optional filtering",
  tags: ["Products"]
});
```

### Schema Definition Pattern

```typescript
private generateComponents(): any {
  return {
    schemas: {
      Product: {
        type: "object",
        required: ["id", "name", "price"],
        properties: {
          id: { type: "integer", example: 1 },
          name: { type: "string", example: "Product Name" },
          price: { type: "number", example: 29.99 }
        }
      }
    },
    responses: {
      ValidationError: {
        description: "Validation error response",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" }
          }
        }
      }
    }
  };
}
```

### Parameter Handling Pattern

```typescript
// Path parameters
if (route.path.includes("{id}")) {
  operation.parameters = [
    {
      name: "id",
      in: "path",
      required: true,
      schema: { type: "integer", minimum: 1 }
    }
  ];
}

// Query parameters for collection endpoints
if (route.path === "/api/v1/products" && route.method === "GET") {
  operation.parameters = [
    {
      name: "page",
      in: "query",
      schema: { type: "integer", default: 1 }
    }
  ];
}
```

## Integration with Build Process

### Development Workflow

1. **Hot Reload Integration**:
   ```json
   "dev": "bun run generate-docs && bun src/server.ts"
   ```

2. **Build Process**:
   ```json
   "build": "bun run generate-docs && bun build src/server.ts --outdir=./dist"
   ```

3. **CI/CD Pipeline**:
   ```yaml
   - name: Generate Documentation
     run: bun run generate-docs:verbose

   - name: Upload Documentation
     uses: actions/upload-artifact@v3
     with:
       name: openapi-docs
       path: public/
   ```

### File Structure

```
project/
├── src/
│   ├── server.ts
│   ├── openapi-generator.ts
│   └── types.ts
├── scripts/
│   └── generate-openapi.ts
├── public/
│   ├── openapi.json
│   └── openapi-generated.yaml
└── package.json
```

## Best Practices

### 1. Schema Design

- **Consistent Naming**: Use PascalCase for schema names
- **Comprehensive Examples**: Provide realistic example values
- **Validation Rules**: Include min/max, required fields
- **Reusable Components**: Create common schemas for pagination, errors

### 2. Route Organization

- **Tag Grouping**: Group related endpoints with tags
- **Consistent Descriptions**: Use clear, actionable descriptions
- **Operation IDs**: Generate consistent, predictable operation IDs
- **Parameter Documentation**: Document all parameters with examples

### 3. Error Handling

- **Standard Error Formats**: Define consistent error response schemas
- **HTTP Status Codes**: Map responses to appropriate status codes
- **Validation Errors**: Provide detailed validation error formats

### 4. Versioning Strategy

- **URL Versioning**: Include version in path (`/api/v1/`)
- **Version Headers**: Add `X-API-Version` header to responses
- **Backward Compatibility**: Maintain documentation for multiple versions

## Customization for Other Projects

### 1. Adapt Schema Definitions

Replace the product-specific schemas with your domain models:

```typescript
// Instead of Product schema
User: {
  type: "object",
  required: ["id", "email", "name"],
  properties: {
    id: { type: "string", format: "uuid" },
    email: { type: "string", format: "email" },
    name: { type: "string", minLength: 1 }
  }
}
```

### 2. Modify Route Registration

Update the `registerAllRoutes()` method with your API endpoints:

```typescript
registerAllRoutes(): void {
  // Authentication endpoints
  this.registerRoute({
    path: "/api/v1/auth/login",
    method: "POST",
    summary: "User login",
    description: "Authenticate user with credentials",
    tags: ["Authentication"]
  });

  // User management endpoints
  this.registerRoute({
    path: "/api/v1/users",
    method: "GET",
    summary: "Get all users",
    description: "Retrieve all users with pagination",
    tags: ["Users"]
  });
}
```

### 3. Configure Runtime Framework

This implementation is framework-agnostic. For different runtimes:

**Node.js with Express**:
```typescript
// Replace Bun-specific imports
import { writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
```

**Deno**:
```typescript
import { ensureDir } from "https://deno.land/std/fs/mod.ts";
```

## Usage Examples

### Generate All Formats

```bash
# Generate both JSON and YAML
bun run generate-docs

# JSON only
bun run generate-docs:json

# YAML only
bun run generate-docs:yaml

# With detailed output
bun run generate-docs:verbose
```

### Custom Output Directory

```bash
bun scripts/generate-openapi.ts --output ./docs/api --format json --verbose
```

### Programmatic Usage

```typescript
import { generateOpenAPISpec } from "./scripts/generate-openapi.ts";

await generateOpenAPISpec({
  outputDir: "./api-docs",
  format: "both",
  verbose: true
});
```

## Maintenance

### Updating Documentation

1. **Add New Endpoints**: Register new routes in `registerAllRoutes()`
2. **Update Schemas**: Modify schema definitions in `generateComponents()`
3. **Version Updates**: Update API version in constructor
4. **Parameter Changes**: Update parameter generation logic

### Validation

1. **Schema Validation**: Use tools like Swagger Editor to validate generated specs
2. **Example Testing**: Test example values against actual API responses
3. **Documentation Review**: Regular reviews to ensure accuracy

This implementation provides a scalable, maintainable approach to API documentation that integrates seamlessly with modern development workflows.