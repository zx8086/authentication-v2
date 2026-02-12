/* src/openapi/index.ts */

/**
 * OpenAPI Module
 *
 * This module provides OpenAPI specification generation for the authentication service.
 * Schema definitions are organized into focused sub-modules for better maintainability:
 *
 * - schemas/error-schemas.ts: RFC 7807 error response schemas
 * - schemas/security-schemas.ts: Security scheme definitions
 * - schemas/tags.ts: API tag definitions
 */

// Re-export all schema functions
export * from "./schemas";
