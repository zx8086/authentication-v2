#!/bin/bash

# Comprehensive test investigation script

echo "=== Investigation: Playwright Test Failures ==="

# Kill any existing server
echo "1. Cleaning up any existing processes..."
lsof -ti :3000 | xargs kill -9 2>/dev/null || echo 'No processes found on port 3000'
sleep 2

# Check Redis if HIGH_AVAILABILITY=true
echo "2. Checking Redis status..."
if command -v redis-cli &> /dev/null; then
    echo "Redis CLI available, checking connection..."
    redis-cli ping || echo "Redis not responding or not running"
    echo "Flushing Redis cache to ensure clean state..."
    redis-cli flushall || echo "Could not flush Redis"
else
    echo "Redis CLI not available locally"
fi

# Start the server in debug mode
echo "3. Starting authentication server..."
bun src/index.ts &
SERVER_PID=$!

# Wait for server startup
echo "4. Waiting for server to be ready..."
sleep 5

# Test server health
echo "5. Testing server health..."
if curl -f http://localhost:3000/health; then
    echo "✓ Server is healthy!"
else
    echo "✗ Server health check failed!"
    kill $SERVER_PID 2>/dev/null
    exit 1
fi

echo "6. Running diagnostic tests..."

# Test 1: Basic token generation for single consumer
echo "Test 1: Single consumer token generation"
curl -s -H "X-Consumer-Id: test-consumer-001" -H "X-Consumer-Username: test-consumer-001" http://localhost:3000/tokens > /tmp/token1.json
echo "Token 1 response:"
cat /tmp/token1.json | jq . 2>/dev/null || cat /tmp/token1.json

# Test 2: Different consumer
echo -e "\nTest 2: Different consumer token generation"
curl -s -H "X-Consumer-Id: test-consumer-002" -H "X-Consumer-Username: test-consumer-002" http://localhost:3000/tokens > /tmp/token2.json
echo "Token 2 response:"
cat /tmp/token2.json | jq . 2>/dev/null || cat /tmp/token2.json

# Test 3: Non-existent consumer
echo -e "\nTest 3: Non-existent consumer"
curl -s -H "X-Consumer-Id: non-existent-$(date +%s)" -H "X-Consumer-Username: ghost-user-$(date +%s)" http://localhost:3000/tokens > /tmp/token3.json
echo "Non-existent consumer response:"
cat /tmp/token3.json | jq . 2>/dev/null || cat /tmp/token3.json

# Test 4: Compare JWT payloads if both tokens were generated successfully
echo -e "\nTest 4: Analyzing JWT token differences..."
if command -v jq &> /dev/null; then
    TOKEN1=$(cat /tmp/token1.json | jq -r '.access_token // empty' 2>/dev/null)
    TOKEN2=$(cat /tmp/token2.json | jq -r '.access_token // empty' 2>/dev/null)

    if [[ -n "$TOKEN1" && "$TOKEN1" != "null" ]]; then
        echo "Token 1 payload:"
        echo "$TOKEN1" | cut -d. -f2 | base64 -d 2>/dev/null | jq . 2>/dev/null || echo "Could not decode token 1"
    fi

    if [[ -n "$TOKEN2" && "$TOKEN2" != "null" ]]; then
        echo "Token 2 payload:"
        echo "$TOKEN2" | cut -d. -f2 | base64 -d 2>/dev/null | jq . 2>/dev/null || echo "Could not decode token 2"
    fi
else
    echo "jq not available for JSON parsing"
fi

# Test 5: Check cache state
echo -e "\nTest 5: Cache diagnostics..."
curl -s http://localhost:3000/debug/cache/stats 2>/dev/null | jq . 2>/dev/null || echo "Cache stats endpoint not available"

# Clean up temporary files
rm -f /tmp/token*.json

# Run the actual Playwright tests
echo -e "\n7. Running Playwright tests..."
echo "Running: Different consumers get different tokens"
npx playwright test --project=chromium --grep "Different consumers get different tokens" --reporter=line

echo -e "\nRunning: Handles non-existent consumers"
npx playwright test --project=chromium --grep "Handles non-existent consumers" --reporter=line

# Stop the server
echo -e "\n8. Cleanup..."
kill $SERVER_PID 2>/dev/null
sleep 2

echo "Investigation completed."