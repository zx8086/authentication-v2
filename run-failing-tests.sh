#!/bin/bash

set -e

echo "=== Running Failing Playwright Tests ==="

# Make sure server is not running
echo "Stopping any existing server..."
pkill -f "bun.*src/index.ts" 2>/dev/null || true
lsof -ti :3000 | xargs kill -9 2>/dev/null || echo 'No processes on port 3000'
sleep 2

# Start server in background
echo "Starting authentication server..."
bun src/index.ts &
SERVER_PID=$!

# Wait for server to start
echo "Waiting for server to be ready..."
sleep 5

# Test health
echo "Testing server health..."
curl -f http://localhost:3000/health > /dev/null 2>&1 || {
    echo "❌ Server health check failed"
    kill $SERVER_PID 2>/dev/null
    exit 1
}
echo "✅ Server is healthy"

# Run the specific failing tests with verbose output
echo "Running failing tests..."
echo "Test 1: Different consumers get different tokens"
npx playwright test --project=chromium --grep "Different consumers get different tokens" --reporter=line --verbose

echo -e "\nTest 2: Handles non-existent consumers"
npx playwright test --project=chromium --grep "Handles non-existent consumers" --reporter=line --verbose

# Cleanup
echo "Stopping server..."
kill $SERVER_PID 2>/dev/null || true
sleep 2

echo "Test run completed"