// test/shared/credentials/index.ts - Barrel export

export {
  getAnonymousJwtCredential,
  getJwtCredentialByIndex,
  JWT_CREDENTIALS,
  type JwtCredential,
} from "./jwt-credentials";
export { TestConsumerSecretFactory, TestScenarios } from "./secret-factory";
