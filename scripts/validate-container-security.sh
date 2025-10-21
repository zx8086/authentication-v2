#!/bin/bash
# validate-container-security.sh
# Runtime security validation for authentication service

set -e

IMAGE_NAME="${1:-authentication-service:latest}"

echo "=== Container Security Validation ==="

# 1. Check non-root user
echo "Checking user privileges..."
USER_ID=$(docker inspect --format='{{.Config.User}}' "${IMAGE_NAME}" 2>/dev/null || echo "")
if [[ "$USER_ID" == "0" ]] || [[ "$USER_ID" == "root" ]] || [[ -z "$USER_ID" ]]; then
  echo "FAIL: Container runs as root or unspecified user"
  exit 1
fi
echo "PASS: Non-root user configured: ${USER_ID}"

# 2. Check entrypoint for init process
echo "Checking PID 1 signal handling..."
ENTRYPOINT=$(docker inspect --format='{{.Config.Entrypoint}}' "${IMAGE_NAME}")
if [[ "$ENTRYPOINT" != *"dumb-init"* ]] && [[ "$ENTRYPOINT" != *"tini"* ]]; then
  echo "WARNING: No init process in ENTRYPOINT: ${ENTRYPOINT}"
fi
echo "PASS: Entrypoint configured: ${ENTRYPOINT}"

# 3. Test graceful shutdown timing
echo "Testing graceful shutdown..."
CONTAINER_ID=$(docker run -d --rm \
  -e NODE_ENV=production \
  -e TELEMETRY_MODE=console \
  -e KONG_JWT_AUTHORITY=https://test.example.com \
  -e KONG_JWT_AUDIENCE=test.example.com \
  -e KONG_JWT_ISSUER=test.example.com \
  "${IMAGE_NAME}")

sleep 3
START_TIME=$(date +%s)
docker stop "${CONTAINER_ID}" > /dev/null 2>&1
END_TIME=$(date +%s)
STOP_DURATION=$((END_TIME - START_TIME))

if [[ $STOP_DURATION -gt 2 ]]; then
  echo "FAIL: Shutdown took ${STOP_DURATION}s (should be <2s)"
  exit 1
fi
echo "PASS: Graceful shutdown: ${STOP_DURATION}s"

# 4. Check health check configuration
echo "Checking health check..."
HEALTHCHECK=$(docker inspect --format='{{.Config.Healthcheck}}' "${IMAGE_NAME}")
if [[ "$HEALTHCHECK" == "<nil>" ]] || [[ -z "$HEALTHCHECK" ]]; then
  echo "WARNING: No health check configured"
else
  echo "PASS: Health check configured"
fi

# 5. Check image size
echo "Checking image optimization..."
IMAGE_SIZE=$(docker image inspect "${IMAGE_NAME}" --format='{{.Size}}' | awk '{print int($1/1024/1024)}')
echo "INFO: Image size: ${IMAGE_SIZE}MB"
if [[ $IMAGE_SIZE -gt 200 ]]; then
  echo "WARNING: Image size exceeds 200MB recommendation"
elif [[ $IMAGE_SIZE -gt 100 ]]; then
  echo "INFO: Image size acceptable but could be optimized"
else
  echo "PASS: Image size optimized"
fi

# 6. Check for shell access (distroless validation)
echo "Checking distroless implementation..."
if docker run --rm --entrypoint="" "${IMAGE_NAME}" /bin/sh -c "echo test" 2>/dev/null; then
  echo "FAIL: Shell access detected (not truly distroless)"
  exit 1
else
  echo "PASS: Distroless confirmed (no shell access)"
fi

# 7. Check security labels
echo "Checking security metadata..."
SECURITY_LABELS=$(docker inspect --format='{{range $k, $v := .Config.Labels}}{{if or (contains $k "security") (contains $k "attestation")}}{{$k}}={{$v}} {{end}}{{end}}' "${IMAGE_NAME}")
if [[ -n "$SECURITY_LABELS" ]]; then
  echo "PASS: Security labels present: ${SECURITY_LABELS}"
else
  echo "WARNING: Security labels missing"
fi

echo ""
echo "=== Security Validation Complete ==="
echo "Image: ${IMAGE_NAME}"
echo "Size: ${IMAGE_SIZE}MB"
echo "Shutdown time: ${STOP_DURATION}s"
echo "Status: PASS"