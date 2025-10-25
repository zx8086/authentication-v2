#!/bin/bash
# validate-container-security.sh - Enhanced security validation

set -e

IMAGE_NAME="${1:-authentication-service:latest}"

echo "=== Container Security Validation ==="

# 1. Check non-root user
USER_ID=$(docker inspect --format='{{.Config.User}}' "${IMAGE_NAME}" 2>/dev/null || echo "")
if [[ "$USER_ID" == "0" ]] || [[ "$USER_ID" == "root" ]] || [[ -z "$USER_ID" ]]; then
  echo "❌ FAIL: Container runs as root"
  exit 1
fi
echo "✅ Non-root user: ${USER_ID}"

# 2. Check PID 1 signal handling
ENTRYPOINT=$(docker inspect --format='{{.Config.Entrypoint}}' "${IMAGE_NAME}" 2>/dev/null || echo "")
if [[ "$ENTRYPOINT" != *"dumb-init"* ]] && [[ "$ENTRYPOINT" != *"tini"* ]]; then
  echo "⚠️  WARNING: No init process in ENTRYPOINT"
fi
echo "✅ Entrypoint: ${ENTRYPOINT}"

# 3. Test graceful shutdown (macOS compatible)
echo "Testing graceful shutdown..."
CONTAINER_ID=$(docker run -d --rm "${IMAGE_NAME}")
sleep 2
START_TIME=$(date +%s)
docker stop "${CONTAINER_ID}" > /dev/null 2>&1
END_TIME=$(date +%s)
STOP_DURATION=$((END_TIME - START_TIME))

if [[ $STOP_DURATION -gt 2 ]]; then
  echo "❌ FAIL: Shutdown took ${STOP_DURATION}s (should be <2s)"
  exit 1
fi
echo "✅ Graceful shutdown: ${STOP_DURATION}s"

# 4. Check health check
HEALTHCHECK=$(docker inspect --format='{{.Config.Healthcheck}}' "${IMAGE_NAME}" 2>/dev/null || echo "")
if [[ "$HEALTHCHECK" == "<nil>" ]]; then
  echo "⚠️  WARNING: No health check configured"
else
  echo "✅ Health check configured"
fi

# 5. Check image size
IMAGE_SIZE=$(docker image inspect "${IMAGE_NAME}" --format='{{.Size}}' 2>/dev/null | awk '{print int($1/1024/1024)}')
echo "📦 Image size: ${IMAGE_SIZE}MB"

if [[ $IMAGE_SIZE -gt 500 ]]; then
  echo "⚠️  WARNING: Large image size - consider optimization"
elif [[ $IMAGE_SIZE -lt 200 ]]; then
  echo "✅ Excellent image size optimization"
fi

# 6. Check base image
BASE_IMAGE=$(docker inspect --format='{{index .Config.Labels "org.opencontainers.image.base.name"}}' "${IMAGE_NAME}" 2>/dev/null || echo "")
if [[ "$BASE_IMAGE" == *"distroless"* ]]; then
  echo "✅ Distroless base image: ${BASE_IMAGE}"
else
  echo "⚠️  WARNING: Not using distroless base image"
fi

# 7. Security scan if available
if command -v docker >/dev/null 2>&1; then
  echo "🔍 Running security scan..."
  if docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy image --severity HIGH,CRITICAL "${IMAGE_NAME}" 2>/dev/null | grep -q "Total: 0"; then
    echo "✅ No high/critical vulnerabilities found"
  else
    echo "⚠️  Security scan detected issues - review vulnerabilities"
  fi
fi

echo "=== ✅ Validation Complete ==="