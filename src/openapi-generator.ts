/* src/openapi-generator.ts */

import type { RouteDefinition } from "./config";

class OpenAPIGenerator {
  private routes: RouteDefinition[] = [];
  private apiVersion = "1.0.0";
  private config: any = null;

  registerRoute(route: RouteDefinition): void {
    this.routes.push(route);
  }

  setConfig(config: any): void {
    this.config = config;
  }

  private generateServers(): any[] {
    const servers = [];

    if (this.config) {
      // Current environment server (dynamic based on actual running config)
      const currentUrl = `http://localhost:${this.config.server.port}`;
      const envDescription =
        this.config.server.nodeEnv === "production"
          ? "Production server"
          : this.config.server.nodeEnv === "staging"
            ? "Staging server"
            : "Development server";

      servers.push({
        url: currentUrl,
        description: `${envDescription} (current)`,
      });

      // Add environment-specific servers
      if (this.config.server.nodeEnv !== "development") {
        servers.push({
          url: "http://localhost:3000",
          description: "Development server",
        });
      }

      if (this.config.server.nodeEnv !== "staging") {
        servers.push({
          url: "https://auth-staging.pvh.com",
          description: "Staging server",
        });
      }

      if (this.config.server.nodeEnv !== "production") {
        servers.push({
          url: "https://auth.pvh.com",
          description: "Production server",
        });
      }
    } else {
      // Fallback if no config provided
      servers.push(
        {
          url: "http://localhost:3000",
          description: "Development server",
        },
        {
          url: "https://auth-staging.pvh.com",
          description: "Staging server",
        },
        {
          url: "https://auth.pvh.com",
          description: "Production server",
        }
      );
    }

    return servers;
  }

  generateSpec(): any {
    // Use dynamic API info from config if available, otherwise use defaults
    const apiInfo = this.config?.apiInfo || {
      title: "Authentication Service API",
      description:
        "High-performance authentication service with Kong integration, OpenTelemetry observability, and comprehensive health monitoring",
      version: this.apiVersion,
      contactName: "PVH Corp",
      contactEmail: "api-support@pvh.com",
      licenseName: "Proprietary",
      licenseIdentifier: "UNLICENSED",
    };

    return {
      openapi: "3.0.3",
      info: {
        title: apiInfo.title,
        description: apiInfo.description,
        version: apiInfo.version,
        contact: {
          name: apiInfo.contactName,
          email: apiInfo.contactEmail,
        },
        license: {
          name: apiInfo.licenseName,
          identifier: apiInfo.licenseIdentifier,
        },
      },
      servers: this.generateServers(),
      security: [
        {
          KongAdminToken: [],
        },
      ],
      paths: this.generatePaths(),
      components: this.generateComponents(),
      tags: [
        {
          name: "Documentation",
          description: "API documentation and specification endpoints",
        },
        {
          name: "Authentication",
          description: "JWT token issuance and authentication operations",
        },
        {
          name: "Health",
          description: "System health and dependency status monitoring",
        },
        {
          name: "Metrics",
          description: "Performance metrics and operational statistics",
        },
        {
          name: "Debug",
          description: "Debug endpoints for development and troubleshooting",
        },
      ],
    };
  }

  private generatePaths(): any {
    const paths: any = {};

    for (const route of this.routes) {
      if (!paths[route.path]) {
        paths[route.path] = {};
      }

      const operation: any = {
        summary: route.summary,
        description: route.description,
        tags: route.tags,
        operationId: this.generateOperationId(route.path, route.method),
        responses: route.responses || this.generateDefaultResponses(route),
      };

      // Add parameters if specified
      if (route.parameters) {
        operation.parameters = route.parameters;
      }

      // Add Kong consumer headers for /tokens endpoint
      if (route.path === "/tokens") {
        operation.parameters = [
          {
            name: "x-consumer-id",
            in: "header",
            required: true,
            description: "Kong consumer ID",
            schema: {
              type: "string",
              example: "demo_user",
            },
          },
          {
            name: "x-consumer-username",
            in: "header",
            required: true,
            description: "Kong consumer username",
            schema: {
              type: "string",
              example: "demo_user",
            },
          },
          {
            name: "x-anonymous-consumer",
            in: "header",
            required: false,
            description:
              "Indicates if the request is from an anonymous consumer (must not be 'true' for token issuance)",
            schema: {
              type: "string",
              enum: ["true", "false"],
              example: "false",
            },
          },
        ];
      }

      // Add request body if specified
      if (route.requestBody) {
        operation.requestBody = route.requestBody;
      }

      // Add security requirements
      if (route.requiresAuth) {
        operation.security = [{ KongAdminToken: [] }];
      }

      paths[route.path][route.method.toLowerCase()] = operation;
    }

    return paths;
  }

  private generateOperationId(path: string, method: string): string {
    // Convert path to camelCase operation ID
    const cleanPath = path
      .replace(/^\//, "") // Remove leading slash
      .replace(/\{(\w+)\}/g, "By$1") // Convert {id} to ById
      .replace(/[/-]/g, "_") // Replace slashes and hyphens with underscores
      .split("_")
      .map((part, index) => {
        if (index === 0) return part.toLowerCase();
        return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
      })
      .join("");

    const methodPrefix =
      {
        GET: "get",
        POST: "create",
        PUT: "update",
        DELETE: "delete",
        PATCH: "patch",
      }[method.toUpperCase()] || method.toLowerCase();

    return `${methodPrefix}${cleanPath.charAt(0).toUpperCase() + cleanPath.slice(1)}`;
  }

  private generateDefaultResponses(route: RouteDefinition): any {
    const responses: any = {
      "200": {
        description: "Successful operation",
        content: {
          "application/json": {
            schema: this.getResponseSchema(route.path, route.method),
          },
        },
      },
      "400": {
        description: "Bad Request",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      "500": {
        description: "Internal Server Error",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
    };

    // Add specific error responses for /tokens endpoint
    if (route.path === "/tokens") {
      responses["401"] = {
        description: "Unauthorized - Missing or invalid Kong consumer headers",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      };
      responses["403"] = {
        description: "Forbidden - Anonymous consumers are not allowed",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      };
      responses["429"] = {
        description: "Rate limit exceeded",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      };
    }

    return responses;
  }

  private getResponseSchema(path: string, method: string): any {
    // Map endpoints to their response schemas
    if (path === "/tokens" && method === "GET") {
      return { $ref: "#/components/schemas/TokenResponse" };
    }
    if (path === "/health" && method === "GET") {
      return { $ref: "#/components/schemas/HealthResponse" };
    }
    if (path === "/health/telemetry" && method === "GET") {
      return { $ref: "#/components/schemas/TelemetryStatus" };
    }
    if (path === "/health/metrics" && method === "GET") {
      return { $ref: "#/components/schemas/MetricsHealth" };
    }
    if (path === "/metrics" && method === "GET") {
      return { $ref: "#/components/schemas/PerformanceMetrics" };
    }
    if (path === "/debug/metrics/test" && method === "POST") {
      return { $ref: "#/components/schemas/DebugResponse" };
    }
    if (path === "/debug/metrics/export" && method === "POST") {
      return { $ref: "#/components/schemas/DebugResponse" };
    }
    if (path === "/debug/metrics/stats" && method === "GET") {
      return { $ref: "#/components/schemas/MetricsStats" };
    }

    return { type: "object" };
  }

  private generateComponents(): any {
    return {
      schemas: {
        TokenResponse: {
          type: "object",
          required: ["access_token", "expires_in"],
          properties: {
            access_token: {
              type: "string",
              description: "JWT access token",
              example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            },
            expires_in: {
              type: "integer",
              description: "Token expiration time in seconds",
              example: 900,
              minimum: 1,
            },
          },
          description: "JWT token response",
        },

        HealthResponse: {
          type: "object",
          required: ["status", "timestamp", "version", "uptime", "environment", "dependencies"],
          properties: {
            status: {
              type: "string",
              enum: ["healthy", "degraded", "unhealthy"],
              description: "Overall system health status",
              example: "healthy",
            },
            timestamp: {
              type: "string",
              format: "date-time",
              description: "Health check timestamp",
              example: "2024-01-15T10:30:00.000Z",
            },
            version: {
              type: "string",
              description: "Service version",
              example: "1.0.0",
            },
            uptime: {
              type: "integer",
              description: "Service uptime in seconds",
              example: 3600,
              minimum: 0,
            },
            environment: {
              type: "string",
              description: "Deployment environment",
              example: "development",
            },
            dependencies: {
              type: "object",
              properties: {
                kong: {
                  type: "object",
                  required: ["status", "response_time", "url"],
                  properties: {
                    status: {
                      type: "string",
                      enum: ["healthy", "unhealthy"],
                      description: "Kong Admin API status",
                      example: "healthy",
                    },
                    response_time: {
                      type: "integer",
                      description: "Kong response time in milliseconds",
                      example: 45,
                      minimum: 0,
                    },
                    url: {
                      type: "string",
                      format: "uri",
                      description: "Kong Admin API URL",
                      example: "https://kong-admin.example.com",
                    },
                  },
                },
              },
            },
          },
          description: "System health status with dependency information",
        },

        TelemetryStatus: {
          type: "object",
          required: ["initialized", "config"],
          properties: {
            initialized: {
              type: "boolean",
              description: "Whether OpenTelemetry is initialized",
              example: true,
            },
            config: {
              type: "object",
              properties: {
                serviceName: {
                  type: "string",
                  description: "OpenTelemetry service name",
                  example: "authentication-service",
                },
                serviceVersion: {
                  type: "string",
                  description: "Service version for telemetry",
                  example: "1.0.0",
                },
                environment: {
                  type: "string",
                  enum: ["development", "staging", "production"],
                  description: "Deployment environment",
                  example: "development",
                },
                mode: {
                  type: "string",
                  enum: ["console", "otlp", "both"],
                  description: "Telemetry output mode",
                  example: "both",
                },
                tracesEndpoint: {
                  type: "string",
                  format: "uri",
                  description: "OTLP traces endpoint",
                  example: "https://otel-http.example.com/v1/traces",
                },
                metricsEndpoint: {
                  type: "string",
                  format: "uri",
                  description: "OTLP metrics endpoint",
                  example: "https://otel-http.example.com/v1/metrics",
                },
                logsEndpoint: {
                  type: "string",
                  format: "uri",
                  description: "OTLP logs endpoint",
                  example: "https://otel-http.example.com/v1/logs",
                },
              },
            },
          },
          description: "OpenTelemetry configuration and status",
        },

        MetricsHealth: {
          type: "object",
          required: ["timestamp", "telemetry", "metrics", "export_statistics"],
          properties: {
            timestamp: {
              type: "string",
              format: "date-time",
              description: "Metrics health check timestamp",
              example: "2024-01-15T10:30:00.000Z",
            },
            telemetry: {
              $ref: "#/components/schemas/TelemetryStatus",
            },
            metrics: {
              type: "object",
              properties: {
                total_instruments: {
                  type: "integer",
                  description: "Total number of metric instruments",
                  example: 23,
                  minimum: 0,
                },
              },
            },
            export_statistics: {
              type: "object",
              properties: {
                totalExports: {
                  type: "integer",
                  description: "Total number of metric exports",
                  example: 145,
                  minimum: 0,
                },
                successCount: {
                  type: "integer",
                  description: "Number of successful exports",
                  example: 143,
                  minimum: 0,
                },
                failureCount: {
                  type: "integer",
                  description: "Number of failed exports",
                  example: 2,
                  minimum: 0,
                },
                successRate: {
                  type: "number",
                  description: "Export success rate percentage",
                  example: 98.62,
                  minimum: 0,
                  maximum: 100,
                },
              },
            },
          },
          description: "Comprehensive metrics system health information",
        },

        PerformanceMetrics: {
          type: "object",
          required: ["timestamp", "uptime", "metrics"],
          properties: {
            timestamp: {
              type: "string",
              format: "date-time",
              description: "Metrics collection timestamp",
              example: "2024-01-15T10:30:00.000Z",
            },
            uptime: {
              type: "integer",
              description: "Service uptime in seconds",
              example: 3600,
              minimum: 0,
            },
            metrics: {
              type: "object",
              properties: {
                requests: {
                  type: "object",
                  properties: {
                    total: {
                      type: "integer",
                      description: "Total requests processed",
                      example: 15420,
                      minimum: 0,
                    },
                    rate: {
                      type: "number",
                      description: "Requests per second",
                      example: 4.28,
                      minimum: 0,
                    },
                  },
                },
                response_time: {
                  type: "object",
                  properties: {
                    avg: {
                      type: "number",
                      description: "Average response time in milliseconds",
                      example: 12.5,
                      minimum: 0,
                    },
                    p95: {
                      type: "number",
                      description: "95th percentile response time in milliseconds",
                      example: 45.2,
                      minimum: 0,
                    },
                  },
                },
              },
            },
          },
          description: "Service performance metrics and statistics",
        },

        MetricsStats: {
          type: "object",
          required: ["timestamp", "message", "export_statistics", "metrics_status"],
          properties: {
            timestamp: {
              type: "string",
              format: "date-time",
              description: "Statistics retrieval timestamp",
              example: "2024-01-15T10:30:00.000Z",
            },
            message: {
              type: "string",
              description: "Status message",
              example: "Metrics statistics retrieved successfully",
            },
            export_statistics: {
              type: "object",
              properties: {
                totalExports: {
                  type: "integer",
                  description: "Total number of metric exports",
                  example: 145,
                  minimum: 0,
                },
                successCount: {
                  type: "integer",
                  description: "Number of successful exports",
                  example: 143,
                  minimum: 0,
                },
                failureCount: {
                  type: "integer",
                  description: "Number of failed exports",
                  example: 2,
                  minimum: 0,
                },
                successRate: {
                  type: "number",
                  description: "Export success rate percentage",
                  example: 98.62,
                  minimum: 0,
                  maximum: 100,
                },
                lastExportTime: {
                  type: "string",
                  format: "date-time",
                  description: "Last successful export timestamp",
                  example: "2024-01-15T10:29:45.000Z",
                },
              },
            },
            metrics_status: {
              type: "object",
              properties: {
                total_instruments: {
                  type: "integer",
                  description: "Total number of metric instruments",
                  example: 23,
                  minimum: 0,
                },
              },
            },
          },
          description: "Detailed metrics export statistics and status",
        },

        DebugResponse: {
          type: "object",
          required: ["timestamp", "message", "success"],
          properties: {
            timestamp: {
              type: "string",
              format: "date-time",
              description: "Operation timestamp",
              example: "2024-01-15T10:30:00.000Z",
            },
            message: {
              type: "string",
              description: "Operation result message",
              example: "Test metrics recorded successfully",
            },
            success: {
              type: "boolean",
              description: "Operation success status",
              example: true,
            },
            details: {
              type: "object",
              description: "Additional operation details",
              additionalProperties: true,
            },
          },
          description: "Debug operation response",
        },

        ErrorResponse: {
          type: "object",
          required: ["error", "message", "statusCode", "timestamp"],
          properties: {
            error: {
              type: "string",
              description: "Error type or code",
              example: "VALIDATION_ERROR",
            },
            message: {
              type: "string",
              description: "Human-readable error message",
              example: "Missing required Kong consumer headers",
            },
            statusCode: {
              type: "integer",
              description: "HTTP status code",
              example: 400,
              minimum: 400,
              maximum: 599,
            },
            timestamp: {
              type: "string",
              format: "date-time",
              description: "Error occurrence timestamp",
              example: "2024-01-15T10:30:00.000Z",
            },
            requestId: {
              type: "string",
              format: "uuid",
              description: "Unique request identifier for tracing",
              example: "550e8400-e29b-41d4-a716-446655440000",
            },
            details: {
              type: "object",
              description: "Additional error context",
              additionalProperties: true,
            },
          },
          description: "Standard error response format",
        },
      },

      securitySchemes: {
        KongAdminToken: {
          type: "apiKey",
          in: "header",
          name: "Kong-Admin-Token",
          description: "Kong Admin API authentication token",
        },
      },

      parameters: {
        ConsumerIdHeader: {
          name: "x-consumer-id",
          in: "header",
          required: true,
          description: "Kong consumer ID",
          schema: {
            type: "string",
            example: "demo_user",
          },
        },
        ConsumerUsernameHeader: {
          name: "x-consumer-username",
          in: "header",
          required: true,
          description: "Kong consumer username",
          schema: {
            type: "string",
            example: "demo_user",
          },
        },
        AnonymousConsumerHeader: {
          name: "x-anonymous-consumer",
          in: "header",
          required: false,
          description: "Indicates if the request is from an anonymous consumer",
          schema: {
            type: "string",
            enum: ["true", "false"],
            example: "false",
          },
        },
      },
    };
  }

  registerAllRoutes(): void {
    // OpenAPI specification endpoint
    this.registerRoute({
      path: "/",
      method: "GET",
      summary: "OpenAPI specification",
      description:
        "Get the OpenAPI 3.0.3 specification for this API. Returns JSON by default, or YAML if Accept header includes application/yaml, text/yaml, or application/x-yaml.",
      tags: ["Documentation"],
      responses: {
        "200": {
          description: "OpenAPI specification",
          content: {
            "application/json": {
              schema: {
                type: "object",
                description: "OpenAPI 3.0.3 specification object",
              },
            },
            "application/yaml": {
              schema: {
                type: "string",
                description: "OpenAPI 3.0.3 specification in YAML format",
              },
            },
          },
        },
      },
    });

    // Authentication endpoints
    this.registerRoute({
      path: "/tokens",
      method: "GET",
      summary: "Issue JWT token",
      description:
        "Generate a JWT access token for authenticated Kong consumers. Requires valid Kong consumer headers and rejects anonymous consumers.",
      tags: ["Authentication"],
      requiresAuth: false, // Uses Kong consumer headers instead
    });

    // Health check endpoints
    this.registerRoute({
      path: "/health",
      method: "GET",
      summary: "System health check",
      description:
        "Get comprehensive system health status including dependency checks (Kong Admin API connectivity) and service information.",
      tags: ["Health"],
    });

    this.registerRoute({
      path: "/health/telemetry",
      method: "GET",
      summary: "Telemetry health status",
      description:
        "Get OpenTelemetry configuration and initialization status, including OTLP endpoints and service metadata.",
      tags: ["Health"],
    });

    this.registerRoute({
      path: "/health/metrics",
      method: "GET",
      summary: "Metrics health and debugging",
      description:
        "Get comprehensive metrics system health including export statistics, telemetry configuration, and instrument counts.",
      tags: ["Health", "Metrics"],
    });

    // Performance metrics endpoint
    this.registerRoute({
      path: "/metrics",
      method: "GET",
      summary: "Performance metrics",
      description:
        "Get service performance metrics including request rates, response times, uptime, and operational statistics.",
      tags: ["Metrics"],
    });

    // Debug endpoints
    this.registerRoute({
      path: "/debug/metrics/test",
      method: "POST",
      summary: "Record test metrics",
      description:
        "Manually record test metrics for debugging and validation purposes. Used for testing OpenTelemetry metrics collection.",
      tags: ["Debug", "Metrics"],
    });

    this.registerRoute({
      path: "/debug/metrics/export",
      method: "POST",
      summary: "Force metrics export",
      description:
        "Manually trigger an immediate metrics export to the configured OTLP endpoint. Used for debugging export functionality.",
      tags: ["Debug", "Metrics"],
    });

    this.registerRoute({
      path: "/debug/metrics/stats",
      method: "GET",
      summary: "Export statistics",
      description:
        "Get detailed metrics export statistics including success rates, failure counts, and timing information.",
      tags: ["Debug", "Metrics"],
    });
  }

  convertToYaml(obj: any): string {
    const yamlHeader = `# OpenAPI 3.0.3 specification for Authentication Service
# Generated on: ${new Date().toISOString()}
# This file is auto-generated. Do not edit manually.

`;
    return yamlHeader + this.objectToYaml(obj, 0);
  }

  private objectToYaml(obj: any, indent = 0): string {
    const spaces = "  ".repeat(indent);

    if (obj === null || obj === undefined) return "null";
    if (typeof obj === "string") {
      if (obj.includes("\n") || obj.includes('"')) {
        return `|\n${spaces}  ${obj.split("\n").join(`\n${spaces}  `)}`;
      }
      if (obj.includes(":") || obj.includes("[") || obj.includes("{") || /^\d/.test(obj)) {
        return `"${obj.replace(/"/g, '\\"')}"`;
      }
      return obj;
    }
    if (typeof obj === "number" || typeof obj === "boolean") return obj.toString();

    if (Array.isArray(obj)) {
      if (obj.length === 0) return "[]";
      return obj
        .map(
          (item) =>
            `\n${spaces}- ${this.objectToYaml(item, indent + 1).replace(/\n/g, `\n${spaces}  `)}`
        )
        .join("");
    }

    if (typeof obj === "object") {
      const entries = Object.entries(obj);
      if (entries.length === 0) return "{}";

      return entries
        .map(([key, value]) => {
          const yamlValue = this.objectToYaml(value, indent + 1);
          if (typeof value === "object" && !Array.isArray(value) && value !== null) {
            return `\n${spaces}${key}:${yamlValue.startsWith("\n") ? yamlValue : ` ${yamlValue}`}`;
          }
          return `\n${spaces}${key}: ${yamlValue}`;
        })
        .join("");
    }

    return obj.toString();
  }
}

export const apiDocGenerator = new OpenAPIGenerator();
