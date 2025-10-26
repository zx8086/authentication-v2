#!/usr/bin/env bun

// Quick debug script to test the specific issue

import { $ } from "bun";

console.log("=== Debug Test Script ===");

// 1. Kill any existing server
console.log("1. Stopping any existing server...");
await $`lsof -ti :3000 | xargs kill -9 2>/dev/null || echo 'No processes found'`.quiet();
await Bun.sleep(1000);

// 2. Start the server
console.log("2. Starting authentication server...");
const server = Bun.spawn(["bun", "src/index.ts"], {
  stdout: "pipe",
  stderr: "pipe",
});

// Wait for server to start
await Bun.sleep(3000);

try {
  // 3. Test server health
  console.log("3. Testing server health...");
  const healthResponse = await fetch("http://localhost:3000/health");
  if (!healthResponse.ok) {
    throw new Error(`Health check failed: ${healthResponse.status}`);
  }
  console.log("✓ Server is healthy");

  // 4. Test different consumers
  console.log("4. Testing different consumers...");

  const consumer1Headers = {
    "X-Consumer-Id": "test-consumer-001",
    "X-Consumer-Username": "test-consumer-001",
  };

  const consumer2Headers = {
    "X-Consumer-Id": "test-consumer-002",
    "X-Consumer-Username": "test-consumer-002",
  };

  const response1 = await fetch("http://localhost:3000/tokens", {
    headers: consumer1Headers,
  });

  const response2 = await fetch("http://localhost:3000/tokens", {
    headers: consumer2Headers,
  });

  if (response1.ok && response2.ok) {
    const token1Data = await response1.json();
    const token2Data = await response2.json();

    console.log("Response 1:", JSON.stringify(token1Data, null, 2));
    console.log("Response 2:", JSON.stringify(token2Data, null, 2));

    // Decode JWT payloads to compare
    const payload1 = JSON.parse(
      Buffer.from(token1Data.access_token.split(".")[1], "base64url").toString()
    );
    const payload2 = JSON.parse(
      Buffer.from(token2Data.access_token.split(".")[1], "base64url").toString()
    );

    console.log("JWT Payload 1:", JSON.stringify(payload1, null, 2));
    console.log("JWT Payload 2:", JSON.stringify(payload2, null, 2));

    if (payload1.key === payload2.key) {
      console.error("🚨 BUG DETECTED: Different consumers have the same JWT key!");
      console.error(`Consumer 1 key: ${payload1.key}`);
      console.error(`Consumer 2 key: ${payload2.key}`);
    } else {
      console.log("✓ Different consumers have different JWT keys");
    }

    if (payload1.sub === payload2.sub) {
      console.error("🚨 BUG DETECTED: Different consumers have the same subject!");
    } else {
      console.log("✓ Different consumers have different subjects");
    }
  } else {
    console.error("One or both token requests failed");
    console.error("Response 1 status:", response1.status);
    console.error("Response 2 status:", response2.status);
  }

  // 5. Test non-existent consumer
  console.log("5. Testing non-existent consumer...");
  const nonExistentResponse = await fetch("http://localhost:3000/tokens", {
    headers: {
      "X-Consumer-Id": `non-existent-${Date.now()}`,
      "X-Consumer-Username": `ghost-user-${Date.now()}`,
    },
  });

  console.log("Non-existent consumer status:", nonExistentResponse.status);
  if (nonExistentResponse.status !== 401 && nonExistentResponse.status !== 503) {
    console.error(
      `🚨 BUG DETECTED: Non-existent consumer got ${nonExistentResponse.status}, expected 401 or 503`
    );
  } else {
    console.log("✓ Non-existent consumer properly rejected");
  }
} catch (error) {
  console.error("Test failed:", error);
} finally {
  // 6. Stop the server
  console.log("6. Stopping server...");
  server.kill();
  await Bun.sleep(1000);
}

console.log("Debug test completed.");
