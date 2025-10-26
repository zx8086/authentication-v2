// Simple script to test cache key generation and verify the hypothesis

const { generateCacheKey } = require("./src/adapters/kong-utils");

console.log("=== Cache Key Generation Test ===");

const consumers = [
  "test-consumer-001",
  "test-consumer-002",
  "test-consumer-003",
  "non-existent-123456",
  "ghost-user-789012",
];

console.log("Testing cache key generation:");
consumers.forEach((consumerId) => {
  const cacheKey = generateCacheKey(consumerId);
  console.log(`  ${consumerId} → ${cacheKey}`);
});

console.log("\nTesting circuit breaker cache key format:");
consumers.forEach((consumerId) => {
  const circuitBreakerKey = `consumer_secret:${consumerId}`;
  console.log(`  ${consumerId} → ${circuitBreakerKey}`);
});

console.log("\nTesting shared circuit breaker cache key format (OLD - potentially problematic):");
consumers.forEach((consumerId) => {
  const sharedCircuitBreakerKey = `getConsumerSecret:${consumerId}`;
  console.log(`  ${consumerId} → ${sharedCircuitBreakerKey}`);
});

console.log("\n=== Summary ===");
console.log("If all consumers use the same cache key pattern, there should be no collision.");
console.log("The issue might be in the circuit breaker stale cache implementation.");
