// test/shared/test-jwt-credentials.ts
// DEPRECATED: Import from './credentials' instead
// This file re-exports from the new modular structure for backward compatibility

export {
  getAnonymousJwtCredential,
  getJwtCredentialByIndex,
  JWT_CREDENTIALS,
  type JwtCredential,
} from "./credentials";
