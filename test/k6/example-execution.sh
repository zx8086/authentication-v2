#!/bin/bash

# Example K6 Test Suite Execution Script for Authentication Service
# This script demonstrates how to run the complete test suite with proper environment setup

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TARGET_HOST="${TARGET_HOST:-localhost}"
TARGET_PORT="${TARGET_PORT:-3000}"
TARGET_PROTOCOL="${TARGET_PROTOCOL:-http}"
TIMEOUT="${TIMEOUT:-30s}"

echo -e "${BLUE}=== AUTHENTICATION SERVICE K6 TEST SUITE ===${NC}"
echo -e "${BLUE}Target: ${TARGET_PROTOCOL}://${TARGET_HOST}:${TARGET_PORT}${NC}"
echo -e "${BLUE}Timeout: ${TIMEOUT}${NC}"
echo ""

# Function to check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}Checking prerequisites...${NC}"

    # Check K6 installation
    if ! command -v k6 &> /dev/null; then
        echo -e "${RED}ERROR: K6 is not installed. Please install K6 first.${NC}"
        echo "macOS: brew install k6"
        echo "Ubuntu: https://k6.io/docs/getting-started/installation/"
        exit 1
    fi

    # Check Bun installation
    if ! command -v bun &> /dev/null; then
        echo -e "${RED}ERROR: Bun is not installed. Please install Bun first.${NC}"
        echo "Install: curl -fsSL https://bun.sh/install | bash"
        exit 1
    fi

    # Check service connectivity
    echo -e "${YELLOW}Checking service connectivity...${NC}"
    if ! curl -f -s --max-time 5 "${TARGET_PROTOCOL}://${TARGET_HOST}:${TARGET_PORT}/health" > /dev/null; then
        echo -e "${RED}ERROR: Cannot connect to authentication service at ${TARGET_PROTOCOL}://${TARGET_HOST}:${TARGET_PORT}${NC}"
        echo "Please ensure the service is running and accessible."
        exit 1
    fi

    echo -e "${GREEN}✓ All prerequisites met${NC}"
    echo ""
}

# Function to run a test with timing and error handling
run_test() {
    local test_name="$1"
    local test_command="$2"
    local description="$3"

    echo -e "${BLUE}Starting: ${test_name}${NC}"
    echo -e "${YELLOW}Description: ${description}${NC}"
    echo -e "${YELLOW}Command: ${test_command}${NC}"
    echo ""

    local start_time=$(date +%s)

    if eval "$test_command"; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        echo -e "${GREEN}✓ ${test_name} completed successfully in ${duration}s${NC}"
        echo ""
        return 0
    else
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        echo -e "${RED}✗ ${test_name} failed after ${duration}s${NC}"
        echo ""
        return 1
    fi
}

# Function to run quick validation
run_quick_tests() {
    echo -e "${BLUE}=== QUICK VALIDATION (6 minutes) ===${NC}"
    echo ""

    run_test "Health Smoke Test" "bun run k6:smoke:health" "Quick validation of health, metrics, and OpenAPI endpoints"
    run_test "Token Smoke Test" "bun run k6:smoke:tokens" "Basic JWT token generation validation and error handling"

    echo -e "${GREEN}✓ Quick validation completed${NC}"
    echo ""
}

# Function to run performance tests
run_performance_tests() {
    echo -e "${BLUE}=== PERFORMANCE TESTS (34 minutes) ===${NC}"
    echo ""

    run_test "Health Smoke Test" "bun run k6:smoke:health" "Prerequisites check"
    run_test "Authentication Load Test" "bun run k6:load:auth" "Normal production load testing with 10-20 VUs"
    run_test "System Stress Test" "bun run k6:stress:system" "Find breaking points with gradual load increase to 250 VUs"

    echo -e "${GREEN}✓ Performance validation completed${NC}"
    echo ""
}

# Function to run realistic scenario tests
run_realistic_tests() {
    echo -e "${BLUE}=== REALISTIC SCENARIOS (42 minutes) ===${NC}"
    echo ""

    run_test "Health Smoke Test" "bun run k6:smoke:health" "Prerequisites check"
    run_test "Token Smoke Test" "bun run k6:smoke:tokens" "Basic validation"
    run_test "Spike Test" "bun run k6:scenario:spike" "Sudden traffic burst simulation"
    run_test "User Journey Test" "bun run k6:scenario:journey" "Realistic user behavior patterns"

    echo -e "${GREEN}✓ Realistic scenario validation completed${NC}"
    echo ""
}

# Function to run complete test suite
run_all_tests() {
    echo -e "${BLUE}=== COMPLETE TEST SUITE (70+ minutes) ===${NC}"
    echo ""

    run_test "Health Smoke Test" "bun run k6:smoke:health" "Health endpoints validation"
    run_test "Token Smoke Test" "bun run k6:smoke:tokens" "JWT generation validation"
    run_test "Authentication Load Test" "bun run k6:load:auth" "Production load simulation"
    run_test "System Stress Test" "bun run k6:stress:system" "Breaking point analysis"
    run_test "Spike Test" "bun run k6:scenario:spike" "Traffic burst simulation"
    run_test "User Journey Test" "bun run k6:scenario:journey" "End-to-end user workflows"

    echo -e "${GREEN}✓ Complete test suite finished${NC}"
    echo ""
}

# Function to display test suite info
show_info() {
    echo -e "${BLUE}=== TEST SUITE INFORMATION ===${NC}"
    echo ""
    echo -e "${YELLOW}Available test categories:${NC}"
    echo "  quick     - Smoke tests only (6 minutes)"
    echo "  performance - Load and stress tests (34 minutes)"
    echo "  realistic - Scenario-based tests (42 minutes)"
    echo "  all       - Complete test suite (70+ minutes)"
    echo ""
    echo -e "${YELLOW}Individual test commands:${NC}"
    echo "  bun run k6:smoke:health    - Health endpoints (3 min)"
    echo "  bun run k6:smoke:tokens    - Token generation (3 min)"
    echo "  bun run k6:load:auth       - Load testing (10 min)"
    echo "  bun run k6:stress:system   - Stress testing (18 min)"
    echo "  bun run k6:scenario:spike  - Spike testing (8 min)"
    echo "  bun run k6:scenario:journey - User journeys (28 min)"
    echo ""
    echo -e "${YELLOW}Environment variables:${NC}"
    echo "  TARGET_HOST=${TARGET_HOST}"
    echo "  TARGET_PORT=${TARGET_PORT}"
    echo "  TARGET_PROTOCOL=${TARGET_PROTOCOL}"
    echo "  TIMEOUT=${TIMEOUT}"
    echo ""
}

# Function to display results summary
show_results_summary() {
    echo -e "${BLUE}=== RESULTS SUMMARY ===${NC}"
    echo ""

    if ls *-results.json 1> /dev/null 2>&1; then
        echo -e "${YELLOW}Generated result files:${NC}"
        for file in *-results.json; do
            if [[ -f "$file" ]]; then
                local size=$(du -h "$file" | cut -f1)
                echo "  $file ($size)"
            fi
        done
        echo ""

        echo -e "${YELLOW}Key metrics summary:${NC}"
        echo "Use the following commands to analyze results:"
        echo "  jq '.tokenGeneration.successRate' *-results.json"
        echo "  jq '.httpPerformance.p95ResponseTime' *-results.json"
        echo "  jq '.businessMetrics.peakConcurrentUsers' *-results.json"
        echo ""
    else
        echo -e "${YELLOW}No result files found. Tests may not have completed successfully.${NC}"
        echo ""
    fi
}

# Main execution logic
main() {
    case "${1:-}" in
        "quick")
            check_prerequisites
            run_quick_tests
            show_results_summary
            ;;
        "performance")
            check_prerequisites
            run_performance_tests
            show_results_summary
            ;;
        "realistic")
            check_prerequisites
            run_realistic_tests
            show_results_summary
            ;;
        "all")
            check_prerequisites
            run_all_tests
            show_results_summary
            ;;
        "info")
            show_info
            ;;
        "check")
            check_prerequisites
            echo -e "${GREEN}✓ System ready for K6 testing${NC}"
            ;;
        *)
            echo -e "${BLUE}Authentication Service K6 Test Suite${NC}"
            echo ""
            echo "Usage: $0 [quick|performance|realistic|all|info|check]"
            echo ""
            echo -e "${YELLOW}Test Categories:${NC}"
            echo "  quick       - Run smoke tests only (6 minutes)"
            echo "  performance - Run performance-focused tests (34 minutes)"
            echo "  realistic   - Run realistic usage scenarios (42 minutes)"
            echo "  all         - Run complete test suite (70+ minutes)"
            echo ""
            echo -e "${YELLOW}Utility Commands:${NC}"
            echo "  info        - Show detailed test information"
            echo "  check       - Verify prerequisites and connectivity"
            echo ""
            echo -e "${YELLOW}Examples:${NC}"
            echo "  $0 quick                    # Quick validation"
            echo "  $0 performance             # Performance testing"
            echo "  TARGET_HOST=localhost $0 all # Test against localhost"
            echo ""
            exit 1
            ;;
    esac
}

# Export environment variables for K6
export TARGET_HOST
export TARGET_PORT
export TARGET_PROTOCOL
export TIMEOUT

# Run main function with all arguments
main "$@"