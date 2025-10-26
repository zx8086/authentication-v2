#!/bin/bash

set -e

echo "=== Quick Test: Cache Pollution Fix ==="

# Stop any existing server
pkill -f "bun.*src/index.ts" 2>/dev/null || true
lsof -ti :3000 | xargs kill -9 2>/dev/null || echo 'No processes on port 3000'
sleep 2

# Start server
echo "Starting server..."
bun src/index.ts &
SERVER_PID=$!
sleep 3

# Test health
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ Server is healthy"
else
    echo "❌ Server health check failed"
    kill $SERVER_PID 2>/dev/null
    exit 1
fi

echo "Running specific failing Playwright tests..."

# Test the specific failing scenarios
echo "Test 1: Different consumers get different tokens"
npx playwright test --project=chromium --grep "Different consumers get different tokens" --reporter=line

echo "Test 2: Handles non-existent consumers"
npx playwright test --project=chromium --grep "Handles non-existent consumers" --reporter=line

# Stop server
kill $SERVER_PID 2>/dev/null
echo "Quick test completed."