#!/bin/bash

set -e

echo "=== Testing Cache Pollution Fixes ==="

# Clean up any existing server
echo "1. Stopping any existing server..."
pkill -f "bun.*src/index.ts" 2>/dev/null || true
lsof -ti :3000 | xargs kill -9 2>/dev/null || echo 'No processes on port 3000'
sleep 2

# Clear Redis to ensure clean state
echo "2. Clearing Redis cache..."
if command -v redis-cli &> /dev/null; then
    redis-cli flushall > /dev/null 2>&1 || echo "Could not flush Redis (may not be running)"
fi

# Start server
echo "3. Starting authentication server..."
bun src/index.ts &
SERVER_PID=$!

# Wait for server to start
echo "4. Waiting for server to be ready..."
sleep 5

# Test health
echo "5. Testing server health..."
if ! curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo "❌ Server health check failed"
    kill $SERVER_PID 2>/dev/null
    exit 1
fi
echo "✅ Server is healthy"

echo "6. Running cache pollution tests..."

# Test 1: Different consumers should get different tokens
echo "Test 1: Testing different consumers get different tokens..."
TOKEN1_RESPONSE=$(curl -s -H "X-Consumer-Id: test-consumer-001" -H "X-Consumer-Username: test-consumer-001" http://localhost:3000/tokens)
TOKEN2_RESPONSE=$(curl -s -H "X-Consumer-Id: test-consumer-002" -H "X-Consumer-Username: test-consumer-002" http://localhost:3000/tokens)

if command -v jq &> /dev/null; then
    TOKEN1=$(echo "$TOKEN1_RESPONSE" | jq -r '.access_token // empty')
    TOKEN2=$(echo "$TOKEN2_RESPONSE" | jq -r '.access_token // empty')

    if [[ -n "$TOKEN1" && "$TOKEN1" != "null" && -n "$TOKEN2" && "$TOKEN2" != "null" ]]; then
        # Decode JWT payloads
        PAYLOAD1=$(echo "$TOKEN1" | cut -d. -f2 | base64 -d 2>/dev/null | jq -r '.key // empty' 2>/dev/null || echo "")
        PAYLOAD2=$(echo "$TOKEN2" | cut -d. -f2 | base64 -d 2>/dev/null | jq -r '.key // empty' 2>/dev/null || echo "")

        if [[ -n "$PAYLOAD1" && -n "$PAYLOAD2" ]]; then
            if [[ "$PAYLOAD1" == "$PAYLOAD2" ]]; then
                echo "❌ CACHE POLLUTION DETECTED: Different consumers have the same JWT key!"
                echo "   Consumer 1 key: $PAYLOAD1"
                echo "   Consumer 2 key: $PAYLOAD2"
            else
                echo "✅ Different consumers have different JWT keys"
                echo "   Consumer 1 key: $PAYLOAD1"
                echo "   Consumer 2 key: $PAYLOAD2"
            fi
        else
            echo "⚠️  Could not extract JWT keys for comparison"
        fi
    else
        echo "❌ One or both token requests failed"
        echo "Token 1 response: $TOKEN1_RESPONSE"
        echo "Token 2 response: $TOKEN2_RESPONSE"
    fi
else
    echo "⚠️  jq not available, skipping detailed token comparison"
fi

# Test 2: Non-existent consumer should get 401 or 503
echo "Test 2: Testing non-existent consumer rejection..."
TIMESTAMP=$(date +%s)
NON_EXISTENT_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -H "X-Consumer-Id: non-existent-$TIMESTAMP" -H "X-Consumer-Username: ghost-user-$TIMESTAMP" http://localhost:3000/tokens)

if [[ "$NON_EXISTENT_RESPONSE" == "401" || "$NON_EXISTENT_RESPONSE" == "503" ]]; then
    echo "✅ Non-existent consumer properly rejected with status $NON_EXISTENT_RESPONSE"
else
    echo "❌ Non-existent consumer got unexpected status: $NON_EXISTENT_RESPONSE (expected 401 or 503)"
fi

# Test 3: Same consumer should get consistent tokens
echo "Test 3: Testing same consumer gets consistent tokens..."
TOKEN3_RESPONSE=$(curl -s -H "X-Consumer-Id: test-consumer-001" -H "X-Consumer-Username: test-consumer-001" http://localhost:3000/tokens)

if command -v jq &> /dev/null; then
    TOKEN3=$(echo "$TOKEN3_RESPONSE" | jq -r '.access_token // empty')

    if [[ -n "$TOKEN1" && -n "$TOKEN3" && "$TOKEN1" != "null" && "$TOKEN3" != "null" ]]; then
        PAYLOAD1_2=$(echo "$TOKEN1" | cut -d. -f2 | base64 -d 2>/dev/null | jq -r '.key // empty' 2>/dev/null || echo "")
        PAYLOAD3=$(echo "$TOKEN3" | cut -d. -f2 | base64 -d 2>/dev/null | jq -r '.key // empty' 2>/dev/null || echo "")

        if [[ -n "$PAYLOAD1_2" && -n "$PAYLOAD3" ]]; then
            if [[ "$PAYLOAD1_2" == "$PAYLOAD3" ]]; then
                echo "✅ Same consumer gets consistent JWT key"
                echo "   Consistent key: $PAYLOAD1_2"
            else
                echo "❌ Same consumer got different JWT keys!"
                echo "   First key:  $PAYLOAD1_2"
                echo "   Second key: $PAYLOAD3"
            fi
        fi
    fi
fi

echo "7. Running official Playwright tests..."

# Run the specific failing tests
echo "Running: Different consumers get different tokens"
npx playwright test --project=chromium --grep "Different consumers get different tokens" --reporter=line || echo "Test completed with exit code $?"

echo "Running: Handles non-existent consumers"
npx playwright test --project=chromium --grep "Handles non-existent consumers" --reporter=line || echo "Test completed with exit code $?"

# Cleanup
echo "8. Stopping server..."
kill $SERVER_PID 2>/dev/null || true
sleep 2

echo "Cache pollution fix test completed."