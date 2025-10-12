#!/bin/bash

# docker-build.sh - Build Docker image with metadata from package.json

set -e

# Extract metadata from package.json using native tools
SERVICE_NAME=$(grep '"name"' package.json | head -1 | cut -d'"' -f4)
SERVICE_VERSION=$(grep '"version"' package.json | head -1 | cut -d'"' -f4)
SERVICE_DESCRIPTION=$(grep '"description"' package.json | head -1 | cut -d'"' -f4)
SERVICE_AUTHOR=$(grep '"author"' package.json | head -1 | cut -d'"' -f4)
SERVICE_LICENSE=$(grep '"license"' package.json | head -1 | cut -d'"' -f4)

# Get build metadata
BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
VCS_REF=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

# Default image name from package name or override with first argument
IMAGE_NAME=${1:-$SERVICE_NAME}
IMAGE_TAG=${2:-$SERVICE_VERSION}

echo "Building Docker image: ${IMAGE_NAME}:${IMAGE_TAG}"
echo "----------------------------------------"
echo "Service: ${SERVICE_NAME} v${SERVICE_VERSION}"
echo "Description: ${SERVICE_DESCRIPTION}"
echo "Author: ${SERVICE_AUTHOR}"
echo "License: ${SERVICE_LICENSE}"
echo "Build Date: ${BUILD_DATE}"
echo "Git Commit: ${VCS_REF}"
echo "----------------------------------------"

# Build target selection for optimization
BUILD_TARGET=${BUILD_TARGET:-production}

echo "Build target: ${BUILD_TARGET}"
echo "BuildKit enabled: $(docker buildx version >/dev/null 2>&1 && echo 'Yes' || echo 'No')"
echo "----------------------------------------"

# Build the Docker image with BuildKit optimization
DOCKER_BUILDKIT=1 docker build \
  --target "${BUILD_TARGET}" \
  --build-arg SERVICE_NAME="${SERVICE_NAME}" \
  --build-arg SERVICE_VERSION="${SERVICE_VERSION}" \
  --build-arg SERVICE_DESCRIPTION="${SERVICE_DESCRIPTION}" \
  --build-arg SERVICE_AUTHOR="${SERVICE_AUTHOR}" \
  --build-arg SERVICE_LICENSE="${SERVICE_LICENSE}" \
  --build-arg BUILD_DATE="${BUILD_DATE}" \
  --build-arg VCS_REF="${VCS_REF}" \
  --cache-from "${IMAGE_NAME}:cache" \
  --cache-to "type=inline" \
  -t "${IMAGE_NAME}:${IMAGE_TAG}" \
  -t "${IMAGE_NAME}:latest" \
  .

echo "----------------------------------------"
echo "Successfully built: ${IMAGE_NAME}:${IMAGE_TAG}"
echo "Also tagged as: ${IMAGE_NAME}:latest"
echo ""
echo "For CI/CD integration with security scanning, metadata extraction,"
echo "and multi-platform builds, coordinate with github-deployment-specialist"
echo ""
echo "Image optimization metrics:"
docker images "${IMAGE_NAME}:${IMAGE_TAG}" --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}" 2>/dev/null || echo "Image size information not available"