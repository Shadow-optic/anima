#!/bin/bash

# Docker build for multi-platform Expo application

set -e

DOCKERFILE="${1:-Dockerfile.multiplatform}"
TARGET="${2:-web-runtime}"
TAG="${3:-anima:latest}"

echo "🔨 Building Docker image for ANIMA"
echo "Dockerfile: $DOCKERFILE"
echo "Target: $TARGET"
echo "Tag: $TAG"
echo ""

docker build \
    -f "$DOCKERFILE" \
    --target "$TARGET" \
    -t "$TAG" \
    .

echo ""
echo "✅ Build complete!"
echo ""
echo "Available targets:"
echo "  - builder         (build stage with dependencies)"
echo "  - web-runtime     (Expo web platform)"
echo "  - eas-builder     (EAS CLI for iOS/Android builds)"
echo "  - api-runtime     (Mock API server)"
echo ""
echo "To build specific target:"
echo "  ./docker-build.sh Dockerfile.multiplatform web-runtime anima:web"
echo "  ./docker-build.sh Dockerfile.multiplatform eas-builder anima:eas"
echo "  ./docker-build.sh Dockerfile.multiplatform api-runtime anima:api"
