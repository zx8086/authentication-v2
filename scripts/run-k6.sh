#!/bin/bash

# K6 test runner with environment variable support
# Usage: scripts/run-k6.sh <test-file> <output-file> [env-vars]

TEST_FILE="$1"
OUTPUT_FILE="$2"
NEED_KONG_VARS="$3"

# Create results directory
mkdir -p test/results/k6

# Load environment variables if .env exists
if [ -f .env ]; then
  source .env
fi

# Run K6 with or without Kong environment variables
if [ "$NEED_KONG_VARS" = "true" ]; then
  # For tests that need Kong Admin API access
  k6 run --env KONG_ADMIN_URL="$KONG_ADMIN_URL" --env KONG_ADMIN_TOKEN="$KONG_ADMIN_TOKEN" --out json="$OUTPUT_FILE" "$TEST_FILE"
else
  # For simple endpoint tests
  k6 run --out json="$OUTPUT_FILE" "$TEST_FILE"
fi