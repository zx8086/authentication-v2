#!/bin/bash

# K6 test runner with environment variable support and optional profiling
# Usage: scripts/run-k6.sh <test-file> <output-file> [need-kong-vars]
#
# Environment variables:
#   ENABLE_PROFILING=true  - Enable Bun profiling during K6 tests

TEST_FILE="$1"
OUTPUT_FILE="$2"
NEED_KONG_VARS="$3"

# Create results directories
mkdir -p test/results/k6
mkdir -p test/results/profiling

# Load environment variables if .env exists
if [ -f .env ]; then
  source .env
fi

# Function to wait for server readiness
wait_for_server() {
  echo "Waiting for server to be ready..."
  for i in {1..30}; do
    if curl -s http://localhost:3000/health/ready > /dev/null 2>&1; then
      echo "Server is ready!"
      return 0
    fi
    sleep 1
  done
  echo "Error: Server failed to start within 30 seconds"
  return 1
}

# Function to cleanup server on exit
cleanup_server() {
  if [ -n "$SERVER_PID" ]; then
    echo "Stopping server (PID: $SERVER_PID)..."
    kill -SIGTERM $SERVER_PID 2>/dev/null || true
    wait $SERVER_PID 2>/dev/null || true
    echo "Server stopped"
  fi
}

# Register cleanup handler
trap cleanup_server EXIT INT TERM

# Check if profiling is enabled
if [ "${ENABLE_PROFILING}" = "true" ]; then
  echo "========================================="
  echo "  K6 Test with Profiling Enabled"
  echo "========================================="
  echo ""

  # Start server with profiling flags
  echo "Starting server with profiling enabled..."
  bun --cpu-prof-md --cpu-prof-dir=test/results/profiling \
      --heap-prof-md --heap-prof-dir=test/results/profiling \
      src/index.ts > test/results/profiling/server.log 2>&1 &

  SERVER_PID=$!
  echo "Server started with PID: $SERVER_PID"

  # Wait for server to be ready
  if ! wait_for_server; then
    echo "Server logs:"
    tail -20 test/results/profiling/server.log
    exit 1
  fi

  echo ""
  echo "Running K6 test: $TEST_FILE"
  echo ""
fi

# Run K6 with or without Kong environment variables
if [ "$NEED_KONG_VARS" = "true" ]; then
  # For tests that need Kong Admin API access
  k6 run --env KONG_ADMIN_URL="$KONG_ADMIN_URL" --env KONG_ADMIN_TOKEN="$KONG_ADMIN_TOKEN" --out json="$OUTPUT_FILE" "$TEST_FILE"
  K6_EXIT_CODE=$?
else
  # For simple endpoint tests
  k6 run --out json="$OUTPUT_FILE" "$TEST_FILE"
  K6_EXIT_CODE=$?
fi

# If profiling was enabled, analyze the profiles
if [ "${ENABLE_PROFILING}" = "true" ]; then
  echo ""
  echo "========================================="
  echo "  Profiling Results"
  echo "========================================="

  # Stop server gracefully to trigger profile generation
  echo ""
  echo "Stopping server to capture profiles..."
  kill -SIGTERM $SERVER_PID 2>/dev/null || true

  # Wait for profile generation
  sleep 3

  # Analyze CPU profile if it exists
  CPU_PROFILE=$(ls -t test/results/profiling/CPU.*.md 2>/dev/null | head -1)
  if [ -n "$CPU_PROFILE" ]; then
    echo ""
    bun scripts/profiling/analyze-profile.ts "$CPU_PROFILE"
  else
    echo "Warning: No CPU profile generated"
  fi

  # List all generated profiles
  echo ""
  echo "Generated profiles:"
  ls -lh test/results/profiling/*.md 2>/dev/null || echo "  (none)"

  echo ""
  echo "========================================="
  echo "  K6 Test Complete"
  echo "========================================="
fi

# Exit with K6's exit code
exit $K6_EXIT_CODE
