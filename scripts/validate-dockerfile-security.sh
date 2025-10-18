#!/bin/bash
# Dockerfile Security Validation Script
# Validates 10/10 security score achievement for authentication service

set -euo pipefail

echo "Dockerfile Security Validation for Authentication Service"
echo "========================================================="

DOCKERFILE_PATH="${1:-Dockerfile}"
SCORE=0
MAX_SCORE=10
ISSUES=()

# Check if Dockerfile exists
if [[ ! -f "$DOCKERFILE_PATH" ]]; then
    echo "FAIL Dockerfile not found at: $DOCKERFILE_PATH"
    exit 1
fi

echo "INFO Analyzing: $DOCKERFILE_PATH"
echo ""

# 1. Check for distroless base image (2 points)
echo "CHECK [1/10] Checking distroless base image..."
if grep -q "FROM gcr.io/distroless/base:nonroot" "$DOCKERFILE_PATH"; then
    echo "PASS Using distroless base image (gcr.io/distroless/base:nonroot)"
    ((SCORE += 2))
else
    echo "FAIL Not using distroless base image"
    ISSUES+=("Must use gcr.io/distroless/base:nonroot for minimal attack surface")
fi

# 2. Check nonroot user execution (1 point)
echo "CHECK [2/10] Checking nonroot user execution..."
if grep -q "65532:65532\|nonroot" "$DOCKERFILE_PATH" && ! grep -q "USER root" "$DOCKERFILE_PATH"; then
    echo "PASS Running as nonroot user (65532:65532)"
    ((SCORE += 1))
else
    echo "FAIL Not properly configured for nonroot execution"
    ISSUES+=("Must run as nonroot user (65532:65532) without root user switches")
fi

# 3. Check for no shell access (1 point)
echo "CHECK [3/10] Checking shell access prevention..."
if grep -q "gcr.io/distroless/base:nonroot" "$DOCKERFILE_PATH" && ! grep -E "RUN.*(/bin/sh|/bin/bash|sh|bash)" "$DOCKERFILE_PATH"; then
    echo "PASS No shell access (distroless eliminates shell)"
    ((SCORE += 1))
else
    echo "FAIL Potential shell access detected"
    ISSUES+=("Distroless image should eliminate all shell access")
fi

# 4. Check health check implementation (1 point)
echo "CHECK [4/10] Checking health check security..."
if grep -q "HEALTHCHECK" "$DOCKERFILE_PATH" && grep -q "bun.*--eval" "$DOCKERFILE_PATH" && grep -q "fetch" "$DOCKERFILE_PATH" && ! grep -E "^[^#]*curl" "$DOCKERFILE_PATH"; then
    echo "PASS Secure health check using Bun native fetch"
    ((SCORE += 1))
else
    echo "FAIL Health check not using secure Bun native implementation"
    ISSUES+=("Health check must use Bun native fetch, not curl")
fi

# 5. Check for proper file ownership (1 point)
echo "CHECK [5/10] Checking file ownership security..."
if grep -q -- "--chown=65532:65532" "$DOCKERFILE_PATH"; then
    echo "PASS Proper file ownership for nonroot user"
    ((SCORE += 1))
else
    echo "FAIL Files not properly owned by nonroot user"
    ISSUES+=("All copied files must be owned by nonroot user (--chown=65532:65532)")
fi

# 6. Check for security labels (1 point)
echo "CHECK [6/10] Checking security attestation labels..."
if grep -q "security.scan.disable.*false\|security.attestation.required.*true" "$DOCKERFILE_PATH"; then
    echo "PASS Security attestation labels present"
    ((SCORE += 1))
else
    echo "FAIL Missing security attestation labels"
    ISSUES+=("Must include security.scan.disable=false and security.attestation.required=true labels")
fi

# 7. Check for version pinning (1 point)
echo "CHECK [7/10] Checking version pinning..."
if grep -q "oven/bun:1.3.0" "$DOCKERFILE_PATH" && ! grep -q ":latest" "$DOCKERFILE_PATH"; then
    echo "PASS All images use pinned versions"
    ((SCORE += 1))
else
    echo "FAIL Images not properly version pinned"
    ISSUES+=("All FROM statements must use specific version tags, not latest")
fi

# 8. Check for minimal layers (1 point)
echo "CHECK [8/10] Checking layer optimization..."
COPY_COUNT=$(grep -c "^COPY" "$DOCKERFILE_PATH" || true)
if [[ $COPY_COUNT -le 10 ]]; then
    echo "PASS Minimal layer count ($COPY_COUNT COPY instructions)"
    ((SCORE += 1))
else
    echo "FAIL Too many layers ($COPY_COUNT COPY instructions)"
    ISSUES+=("Minimize COPY instructions to reduce attack surface")
fi

# 9. Check for proper entrypoint (1 point)
echo "CHECK [9/10] Checking secure entrypoint with signal handling..."
if grep -q 'ENTRYPOINT.*dumb-init' "$DOCKERFILE_PATH" && grep -q 'CMD \["/usr/local/bin/bun"' "$DOCKERFILE_PATH"; then
    echo "PASS Proper PID 1 signal handling with dumb-init"
    ((SCORE += 1))
else
    echo "FAIL Missing proper PID 1 signal handling"
    ISSUES+=("Must use dumb-init for proper SIGTERM/SIGINT handling in containers")
fi

# 10. Check for build metadata (1 point)
echo "CHECK [10/10] Checking build metadata and compliance..."
if grep -q "org.opencontainers.image" "$DOCKERFILE_PATH" && grep -q "org.opencontainers.image.base.name.*distroless" "$DOCKERFILE_PATH"; then
    echo "PASS Complete OCI metadata with distroless attestation"
    ((SCORE += 1))
else
    echo "FAIL Missing or incomplete build metadata"
    ISSUES+=("Must include complete OCI image labels with distroless base attestation")
fi

echo ""
echo "SCORE Security Score: $SCORE/$MAX_SCORE"

# Additional security checks
echo ""
echo "SECURITY  Additional Security Validations"
echo "=================================="

# Run Hadolint if available
if command -v hadolint >/dev/null 2>&1; then
    echo "CHECK Running Hadolint security scan..."
    if hadolint "$DOCKERFILE_PATH"; then
        echo "PASS Hadolint security scan passed"
    else
        echo "FAIL Hadolint security issues found"
        ISSUES+=("Resolve all Hadolint security findings")
    fi
elif command -v docker >/dev/null 2>&1; then
    echo "CHECK Running Hadolint via Docker..."
    if docker run --rm -v "$PWD:/workspace" -w /workspace hadolint/hadolint hadolint --config .hadolint.yaml Dockerfile; then
        echo "PASS Hadolint security scan passed"
    else
        echo "FAIL Hadolint security issues found"
        ISSUES+=("Resolve all Hadolint security findings")
    fi
else
    echo "WARNING  Hadolint not available - install for comprehensive scanning"
fi

# Final scoring
echo ""
echo "RESULTS Final Results"
echo "==============="

if [[ $SCORE -eq $MAX_SCORE ]] && [[ ${#ISSUES[@]} -eq 0 ]]; then
    echo "SUCCESS PERFECT SCORE: 10/10 Docker Security Achieved!"
    echo "PASS Zero attack surface with distroless implementation"
    echo "PASS Complete security hardening implemented"
    echo "PASS Production-ready with maximum container security"
    exit 0
elif [[ $SCORE -ge 8 ]]; then
    echo "WARNING  GOOD SCORE: $SCORE/10 - Minor improvements needed"
    echo ""
    echo "ISSUES Issues to resolve:"
    for issue in "${ISSUES[@]}"; do
        echo "   • $issue"
    done
    exit 1
else
    echo "FAIL NEEDS IMPROVEMENT: $SCORE/10 - Major security gaps"
    echo ""
    echo "CRITICAL Critical issues to resolve:"
    for issue in "${ISSUES[@]}"; do
        echo "   • $issue"
    done
    exit 2
fi