// test/shared/test-jwt-credentials.ts

import { TestConsumerSecretFactory } from "./test-consumer-secrets";
import { ANONYMOUS_CONSUMER, TEST_CONSUMERS } from "./test-consumers";

// Generate JWT credentials using factory pattern to avoid hardcoded secrets (CWE-547).
// NOTE: These are TEST CREDENTIALS for isolated Kong test environments only.
// They are deterministic for test reproducibility. Production credentials come from environment variables.

export interface JwtCredential {
  key: string;
  secret: string;
  algorithm: string;
}

function generateJwtCredentials(): Record<string, JwtCredential> {
  const credentials: Record<string, JwtCredential> = {};

  // Generate credentials for each test consumer (deterministic based on index)
  TEST_CONSUMERS.forEach((consumer, index) => {
    const consumerNum = String(index + 1).padStart(3, "0");
    const secret = TestConsumerSecretFactory.createForCache(`consumer-${consumerNum}`);
    credentials[consumer.id] = {
      key: secret.jwtKey,
      secret: secret.jwtSecret,
      algorithm: "HS256",
    };
  });

  // Generate anonymous consumer credentials
  const anonSecret = TestConsumerSecretFactory.createForCache("anonymous");
  credentials[ANONYMOUS_CONSUMER.id] = {
    key: anonSecret.jwtKey,
    secret: anonSecret.jwtSecret,
    algorithm: "HS256",
  };

  return credentials;
}

export const JWT_CREDENTIALS = generateJwtCredentials();

export function getJwtCredentialByIndex(index: number): JwtCredential | null {
  if (index < 0 || index >= TEST_CONSUMERS.length) {
    return null;
  }
  return JWT_CREDENTIALS[TEST_CONSUMERS[index].id];
}

export function getAnonymousJwtCredential(): JwtCredential {
  return JWT_CREDENTIALS[ANONYMOUS_CONSUMER.id];
}
