#!/bin/bash

# Script to debug the failing Playwright tests

echo "=== Playwright Test Debug Session ==="

# Kill any existing server
echo "Stopping any existing server..."
lsof -ti :3000 | xargs kill -9 2>/dev/null || echo 'No processes found on port 3000'

# Wait a moment
sleep 2

# Start the server in the background
echo "Starting authentication server..."
bun src/index.ts &
SERVER_PID=$!

# Wait for server to start
echo "Waiting for server to be ready..."
sleep 5

# Test server health
echo "Testing server health..."
curl -f http://localhost:3000/health || {
    echo "Server health check failed!"
    kill $SERVER_PID 2>/dev/null
    exit 1
}

echo "Server is healthy!"

# Run the specific failing tests
echo "Running specific failing Playwright tests..."
npx playwright test --project=chromium --grep "Different consumers get different tokens|Handles non-existent consumers"

TEST_EXIT_CODE=$?

# Stop the server
echo "Stopping server..."
kill $SERVER_PID 2>/dev/null

# Wait for cleanup
sleep 2

echo "Test run completed with exit code: $TEST_EXIT_CODE"
exit $TEST_EXIT_CODE