// test/shared/credentials/jwt-credentials.ts

import { ANONYMOUS_CONSUMER, TEST_CONSUMERS } from "../consumers";
import { TestConsumerSecretFactory } from "./secret-factory";

export interface JwtCredential {
  key: string;
  secret: string;
  algorithm: string;
}

function generateJwtCredentials(): Record<string, JwtCredential> {
  const credentials: Record<string, JwtCredential> = {};

  TEST_CONSUMERS.forEach((consumer, index) => {
    const consumerNum = String(index + 1).padStart(3, "0");
    const secret = TestConsumerSecretFactory.createWithId(`cache-consumer-${consumerNum}`);
    credentials[consumer.id] = {
      key: secret.jwtKey,
      secret: secret.jwtSecret,
      algorithm: "HS256",
    };
  });

  const anonSecret = TestConsumerSecretFactory.createWithId("cache-anonymous");
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
