/* src/openapi/schemas/index.ts */

/**
 * OpenAPI schema definitions module.
 *
 * This module exports all schema-related functions for the OpenAPI specification.
 */

export {
  createDebugResponseSchema,
  createErrorCodeReferenceSchema,
  createErrorResponseSchema,
  createErrorSchemas,
} from "./error-schemas";

export {
  createCommonParameters,
  createDeprecationHeaders,
  createSecuritySchemes,
} from "./security-schemas";

export { createTags } from "./tags";
