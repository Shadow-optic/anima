#!/bin/bash

# ANIMA Multi-Platform Build Script
# Builds iOS, Android, and Web platforms using EAS CLI

set -e

PLATFORMS="${1:-web}"  # Default to web, or pass: ios, android, all
BUILD_ENV="${2:-development}"

echo "🚀 ANIMA Multi-Platform Build"
echo "Platform: $PLATFORMS"
echo "Environment: $BUILD_ENV"
echo ""

# Ensure .env is configured
if [ ! -f ".env.local" ]; then
    echo "❌ .env.local not found. Copy from .env.example and configure credentials."
    exit 1
fi

# Source environment
set -a
source .env.local
set +a

# Build Web Platform
build_web() {
    echo "📱 Building Web Platform..."
    docker-compose -f docker-compose.multiplatform.yml run --rm web npm run start:web &
    echo "✅ Web platform running on http://localhost:8081"
}

# Build iOS (requires EAS CLI)
build_ios() {
    if [ -z "$EXPO_TOKEN" ]; then
        echo "❌ EXPO_TOKEN not set. Configure in .env.local to build iOS."
        exit 1
    fi
    
    echo "🍎 Building iOS..."
    docker-compose -f docker-compose.multiplatform.yml run \
        -e EXPO_TOKEN="$EXPO_TOKEN" \
        --rm eas-builder \
        eas build --platform ios --non-interactive
    
    echo "✅ iOS build complete. Check Expo for status."
}

# Build Android (requires EAS CLI)
build_android() {
    if [ -z "$EXPO_TOKEN" ]; then
        echo "❌ EXPO_TOKEN not set. Configure in .env.local to build Android."
        exit 1
    fi
    
    echo "🤖 Building Android..."
    docker-compose -f docker-compose.multiplatform.yml run \
        -e EXPO_TOKEN="$EXPO_TOKEN" \
        --rm eas-builder \
        eas build --platform android --non-interactive
    
    echo "✅ Android build complete. Check Expo for status."
}

# Build all platforms
build_all() {
    echo "🔨 Building all platforms..."
    build_web
    build_ios
    build_android
}

# Execute based on platform argument
case "$PLATFORMS" in
    web)
        build_web
        ;;
    ios)
        build_ios
        ;;
    android)
        build_android
        ;;
    all)
        build_all
        ;;
    *)
        echo "Invalid platform: $PLATFORMS"
        echo "Usage: ./build.sh [web|ios|android|all]"
        exit 1
        ;;
esac

echo ""
echo "✨ Build script completed!"
