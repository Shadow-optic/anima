# ANIMA Multi-Platform Deployment Guide

## Architecture Overview

This project supports **three deployment targets** using containerized Expo:

```
┌─────────────────────────────────────────────────────────┐
│         ANIMA Multi-Platform Build Pipeline            │
├─────────────────────────────────────────────────────────┤
│  Web (Browser)  │  iOS (App Store)  │  Android (Play)  │
│  Port 8081      │  Via EAS Cloud    │  Via EAS Cloud   │
└─────────────────────────────────────────────────────────┘
         ↓               ↓                    ↓
    Expo Web CLI    EAS Build CLI        EAS Build CLI
    (localhost)     (CI/Cloud)           (CI/Cloud)
```

---

## Quick Start

### 1. **Web Platform (Development)**

```bash
# Start all services (web + API + database)
docker-compose -f docker-compose.multiplatform.yml up

# Access at http://localhost:8081
```

### 2. **iOS & Android (Production Builds)**

First, configure credentials in `.env.local`:

```bash
# Get EXPO_TOKEN from https://expo.dev/settings/tokens
EXPO_TOKEN=your_expo_token_here

# iOS credentials (for App Store submission)
APPLE_ID=your-apple-id@email.com
APPLE_TEAM_ID=XXXXXXXXXX
ASC_APP_ID=1234567890

# Android credentials (for Play Store submission)
ANDROID_SERVICE_ACCOUNT_JSON=/path/to/google-play-key.json
```

Then build:

```bash
# Build web only
./build.sh web

# Build iOS only
./build.sh ios

# Build Android only
./build.sh android

# Build all platforms
./build.sh all
```

---

## GitHub to A0.dev Auto-Deploy

The repository includes a deploy workflow at `.github/workflows/deploy.yml` that now:
- Builds and pushes the production Docker image to GHCR on every push to `main`
- Also runs on version tags like `v1.0.0`
- Supports manual runs from the GitHub Actions UI

To trigger A0.dev deployments automatically after each `main` push:

1. In the GitHub repo, add a secret named `A0_DEPLOY_HOOK_URL`
2. Set it to your A0.dev deploy webhook URL
3. Push to `main`

The workflow will POST this payload to your webhook:

```json
{"repository":"owner/repo","sha":"<commit-sha>"}
```

If `A0_DEPLOY_HOOK_URL` is not set, the workflow still builds and publishes the image.

---

## Detailed Setup

### Prerequisites

- Docker & Docker Compose
- Node.js 22+ (for local development)
- Expo CLI: `npm install -g expo-cli`
- EAS CLI: `npm install -g eas-cli`
- Valid Expo account (https://expo.dev)

### Environment Configuration

Copy and configure `.env.local`:

```bash
cp .env.example .env.local
```

Required variables:

```env
# API & Database
EXPO_PUBLIC_API_URL=http://localhost:4010
DATABASE_URL=postgresql://anima:anima_dev_password@postgres:5432/anima_db

# Supabase (optional, for production)
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# EAS/Expo (required for iOS/Android builds)
EXPO_TOKEN=your-token-from-https://expo.dev/settings/tokens
```

### Project Structure

```
anima/
├── Dockerfile                    # Single-stage web build
├── Dockerfile.multiplatform      # Multi-target builds (web, iOS, Android, API)
├── docker-compose.yml            # Development (web + API + DB)
├── docker-compose.multiplatform.yml  # Production (web + iOS/Android + API + DB)
├── eas.json                      # Expo Application Services config
├── build.sh                      # Build orchestration script
├── docker-build.sh               # Docker image builder
├── app.json                      # Expo app config
├── app/                          # App screens/routes
├── components/                   # React components
├── server/                       # Mock API server
└── schema.prisma                 # Database schema
```

---

## Web Platform (Expo Web)

### Local Development

```bash
docker-compose -f docker-compose.multiplatform.yml up web mock-api postgres
```

Services:
- **Web**: http://localhost:8081 (Expo web dev server)
- **Mock API**: http://localhost:4010 (Node.js mock endpoints)
- **PostgreSQL**: localhost:5432 (Database)

Hot reload enabled via bind mounts for:
- `/app/app`
- `/app/components`
- `/app/hooks`
- `/app/stores`
- `/app/shared`

### Building for Deployment

```bash
# Build web container
./docker-build.sh Dockerfile.multiplatform web-runtime anima:web-prod

# Run web container (production)
docker run -d \
  --name anima-web-prod \
  -p 8081:8081 \
  -e NODE_ENV=production \
  -e EXPO_PUBLIC_API_URL=https://api.example.com \
  anima:web-prod
```

---

## iOS Platform (App Store)

### Prerequisites

- Apple Developer Account ($99/year)
- Xcode 15+ (macOS only)
- Valid Apple Team ID
- App Specific Password for App Store Connect

### Build Steps

1. **Link iOS credentials to Expo**:
   ```bash
   eas credentials
   # Follow prompts to set up iOS signing
   ```

2. **Configure eas.json** (already done):
   ```json
   {
     "build": {
       "production": {
         "ios": {
           "buildType": "archive",
           "scheme": "ANIMA"
         }
       }
     }
   }
   ```

3. **Build iOS**:
   ```bash
   EXPO_TOKEN=your-token ./build.sh ios
   # Or using EAS directly:
   # eas build --platform ios --profile production
   ```

4. **Submit to App Store**:
   ```bash
   eas submit --platform ios --profile production
   ```

### Build Profiles (in eas.json)

- **development**: Internal testing (simulator builds)
- **preview**: Ad-hoc distribution (TestFlight)
- **production**: App Store submission (archive)

---

## Android Platform (Google Play)

### Prerequisites

- Google Play Developer Account ($25 one-time)
- App signing key (Google Play handles this)
- Service account for API uploads

### Build Steps

1. **Link Android credentials to Expo**:
   ```bash
   eas credentials
   # Follow prompts for Android keystore
   ```

2. **Generate Play Store API key**:
   - Go to Google Play Console → Settings → API Access
   - Create service account
   - Download JSON key file
   - Set `ANDROID_SERVICE_ACCOUNT_JSON` in `.env.local`

3. **Build Android**:
   ```bash
   EXPO_TOKEN=your-token ./build.sh android
   # Or using EAS directly:
   # eas build --platform android --profile production
   ```

4. **Submit to Play Store**:
   ```bash
   eas submit --platform android --profile production
   ```

### Build Profiles

- **development**: APK for internal testing
- **preview**: APK for Google Play internal testing track
- **production**: AAB (App Bundle) for Play Store

---

## Docker Images

Three containerized build targets:

### 1. Web Runtime (`anima:web`)
```bash
docker build -f Dockerfile.multiplatform --target web-runtime -t anima:web .
docker run -p 8081:8081 anima:web
```
- Runs `npm run start:web`
- Exposes Expo web dev server on port 8081
- Includes hot reload support

### 2. EAS Builder (`anima:eas`)
```bash
docker build -f Dockerfile.multiplatform --target eas-builder -t anima:eas .
docker run -e EXPO_TOKEN=xxx anima:eas eas build --platform ios
```
- Runs EAS CLI for cloud builds
- Requires `EXPO_TOKEN` environment variable
- Mounts source code for building

### 3. API Server (`anima:api`)
```bash
docker build -f Dockerfile.multiplatform --target api-runtime -t anima:api .
docker run -p 4010:4010 anima:api
```
- Runs mock API server on port 4010
- Interfaces with PostgreSQL
- Used in development and testing

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Build & Deploy ANIMA

on:
  push:
    branches: [main]

jobs:
  build-web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: docker/build-push-action@v4
        with:
          file: Dockerfile.multiplatform
          target: web-runtime
          tags: anima:web-${{ github.sha }}

  build-ios:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - run: eas build --platform ios --non-interactive
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}

  build-android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: eas build --platform android --non-interactive
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
```

---

## Troubleshooting

### Web Platform Issues

**Port 8081 already in use**:
```bash
# Change port in docker-compose
PORT=8082 docker-compose up
```

**Hot reload not working**:
- Verify bind mounts are mounted: `docker inspect anima-web | grep Mounts`
- Check file system events: `docker-compose logs web`

### iOS/Android Build Failures

**"EXPO_TOKEN not set"**:
```bash
export EXPO_TOKEN=$(cat ~/.expo/credentials)
./build.sh ios
```

**"Unable to resolve dependency tree"**:
```bash
npm install --legacy-peer-deps
```

**EAS build slow**:
- First builds take 5-10 minutes (cache warming)
- Subsequent builds use BuildKit cache (~1-2 minutes)

### Database Connection Issues

**"Connection refused" on postgres:5432**:
```bash
docker-compose ps  # Check if postgres is running
docker-compose logs postgres  # View logs
```

**Database migration errors**:
```bash
# Run migrations inside container
docker-compose exec web npx prisma migrate deploy
```

---

## Deployment Checklist

- [ ] Configure `.env.local` with API endpoints
- [ ] Set `EXPO_TOKEN` for EAS builds
- [ ] Configure iOS credentials (eas credentials)
- [ ] Configure Android credentials (eas credentials)
- [ ] Update version in `app.json`
- [ ] Run `npm run typecheck` locally
- [ ] Test on web platform first
- [ ] Build development profile (iOS/Android)
- [ ] Test on physical devices
- [ ] Build production profile
- [ ] Submit to App Store / Google Play

---

## References

- [Expo Documentation](https://docs.expo.dev)
- [EAS Build](https://docs.expo.dev/build/introduction/)
- [EAS Submit](https://docs.expo.dev/submit/introduction/)
- [Docker Documentation](https://docs.docker.com)
- [Apple App Store Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Policies](https://play.google.com/about/developer-content-policy/)
