/* test/shared/test-consumer-secrets.ts */

import type { ConsumerSecret } from "../../src/config/schemas";

/**
 * Factory for creating test ConsumerSecret objects to avoid hardcoded values
 * This addresses Snyk security warnings about hardcoded secrets in tests
 *
 * Creates deterministic values for consistent testing while avoiding hardcoded secrets
 */
export class TestConsumerSecretFactory {
  private static counter = 0;

  /**
   * Generate a unique test suffix to ensure data isolation
   */
  private static getUniqueSuffix(): string {
    return `${Date.now()}-${++TestConsumerSecretFactory.counter}`;
  }

  /**
   * Generate a deterministic suffix based on input for consistent testing
   */
  private static getDeterministicSuffix(baseId: string): string {
    // Use a simple hash-like approach to create consistent but non-obvious values
    let hash = 0;
    for (let i = 0; i < baseId.length; i++) {
      const char = baseId.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `${Math.abs(hash)}`;
  }

  /**
   * Create a ConsumerSecret for testing with dynamic values
   */
  static create(
    options: {
      consumerIdPrefix?: string;
      usernamePrefix?: string;
      keyPrefix?: string;
      secretPrefix?: string;
      algorithm?: "HS256" | "HS384" | "HS512";
    } = {}
  ): ConsumerSecret {
    const suffix = TestConsumerSecretFactory.getUniqueSuffix();
    const {
      consumerIdPrefix = "test-consumer",
      usernamePrefix = "test-user",
      keyPrefix = "test-key",
      secretPrefix = "test-secret",
      algorithm = "HS256",
    } = options;

    return {
      consumerId: `${consumerIdPrefix}-${suffix}`,
      consumerUsername: `${usernamePrefix}-${suffix}`,
      jwtKey: `${keyPrefix}-${suffix}`,
      jwtSecret: `${secretPrefix}-${suffix}`,
      algorithm,
    };
  }

  /**
   * Create a ConsumerSecret with specific identifier for predictable testing
   * Uses deterministic values that are consistent across test runs but not hardcoded
   */
  static createWithId(
    baseId: string,
    options: {
      algorithm?: "HS256" | "HS384" | "HS512";
    } = {}
  ): ConsumerSecret {
    const { algorithm = "HS256" } = options;
    const suffix = TestConsumerSecretFactory.getDeterministicSuffix(baseId);

    return {
      consumerId: `${baseId}-consumer-${suffix}`,
      consumerUsername: `${baseId}-user-${suffix}`,
      jwtKey: `${baseId}-key-${suffix}`,
      jwtSecret: `${baseId}-secret-${suffix}`,
      algorithm,
    };
  }

  /**
   * Create multiple ConsumerSecret objects for batch testing
   */
  static createBatch(
    count: number,
    options: {
      basePrefix?: string;
      algorithm?: "HS256" | "HS384" | "HS512";
    } = {}
  ): ConsumerSecret[] {
    const { basePrefix = "batch-test", algorithm = "HS256" } = options;
    const secrets: ConsumerSecret[] = [];

    for (let i = 0; i < count; i++) {
      secrets.push(TestConsumerSecretFactory.createWithId(`${basePrefix}-${i}`, { algorithm }));
    }

    return secrets;
  }

  /**
   * Create a ConsumerSecret for TTL testing with deterministic values
   */
  static createForTTL(
    testName: string,
    options: {
      algorithm?: "HS256" | "HS384" | "HS512";
    } = {}
  ): ConsumerSecret {
    return TestConsumerSecretFactory.createWithId(`ttl-${testName}`, options);
  }

  /**
   * Create a ConsumerSecret for performance testing with deterministic values
   */
  static createForPerformance(
    index: number,
    options: {
      algorithm?: "HS256" | "HS384" | "HS512";
    } = {}
  ): ConsumerSecret {
    return TestConsumerSecretFactory.createWithId(`perf-${index}`, options);
  }

  /**
   * Create a ConsumerSecret for concurrency testing with deterministic values
   */
  static createForConcurrency(
    index: number,
    options: {
      algorithm?: "HS256" | "HS384" | "HS512";
    } = {}
  ): ConsumerSecret {
    return TestConsumerSecretFactory.createWithId(`concurrent-${index}`, options);
  }

  /**
   * Create a ConsumerSecret for cache testing scenarios with deterministic values
   */
  static createForCache(
    scenario: string,
    options: {
      algorithm?: "HS256" | "HS384" | "HS512";
    } = {}
  ): ConsumerSecret {
    return TestConsumerSecretFactory.createWithId(`cache-${scenario}`, options);
  }

  /**
   * Create a ConsumerSecret with new format (id, key, secret, consumer.id)
   * Uses deterministic values when given consistent prefixes
   */
  static createNew(
    options: {
      idPrefix?: string;
      keyPrefix?: string;
      secretPrefix?: string;
      consumerIdPrefix?: string;
      deterministic?: boolean;
    } = {}
  ): ConsumerSecret {
    const {
      idPrefix = "test-jwt-credential",
      keyPrefix = "test-jwt-key",
      secretPrefix = "test-jwt-secret",
      consumerIdPrefix = "test-consumer",
      deterministic = false,
    } = options;

    const suffix = deterministic
      ? TestConsumerSecretFactory.getDeterministicSuffix(`${idPrefix}-${consumerIdPrefix}`)
      : TestConsumerSecretFactory.getUniqueSuffix();

    return {
      id: `${idPrefix}-${suffix}`,
      key: `${keyPrefix}-${suffix}`,
      secret: `${secretPrefix}-${suffix}`,
      consumer: {
        id: `${consumerIdPrefix}-${suffix}`,
      },
    };
  }
}

/**
 * Pre-defined test scenarios for common use cases
 */
export const TestScenarios = {
  BASIC_CACHE: () => TestConsumerSecretFactory.createForCache("basic"),
  CUSTOM_TTL: () => TestConsumerSecretFactory.createForTTL("custom"),
  EXPIRE_TEST: () => TestConsumerSecretFactory.createForTTL("expire"),
  DELETE_TEST: () => TestConsumerSecretFactory.createForCache("delete"),
  STATS_TEST: () => TestConsumerSecretFactory.createForCache("stats"),
  LATENCY_TEST: () => TestConsumerSecretFactory.createForCache("latency"),
  SPECIAL_CHARS: () => TestConsumerSecretFactory.createForCache("special-chars"),
  ZERO_TTL: () => TestConsumerSecretFactory.createForTTL("zero"),
  NEGATIVE_TTL: () => TestConsumerSecretFactory.createForTTL("negative"),
  PERFORMANCE: (index: number) => TestConsumerSecretFactory.createForPerformance(index),
  CONCURRENCY: (index: number) => TestConsumerSecretFactory.createForConcurrency(index),
} as const;
