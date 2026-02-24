# ANIMA Multi-Platform Quick Reference

## 🚀 Commands

### Development (Web)
```bash
# Start web + API + database
docker-compose -f docker-compose.multiplatform.yml up

# Access: http://localhost:8081
```

### Building (iOS/Android)
```bash
# Setup credentials
eas credentials

# Configure .env.local
export EXPO_TOKEN=$(cat ~/.expo/credentials)

# Build specific platform
./build.sh web      # Expo web browser
./build.sh ios      # iOS App Store
./build.sh android  # Google Play
./build.sh all      # All platforms
```

### Docker Images
```bash
# Build web image
./docker-build.sh Dockerfile.multiplatform web-runtime anima:web

# Build iOS/Android builder
./docker-build.sh Dockerfile.multiplatform eas-builder anima:eas

# Build API server
./docker-build.sh Dockerfile.multiplatform api-runtime anima:api

# View all images
docker images | grep anima
```

---

## 📦 Available Docker Targets

| Target | Purpose | Port | Image Size |
|--------|---------|------|------------|
| `web-runtime` | Expo web dev server | 8081 | 229MB |
| `eas-builder` | iOS/Android builder | 3000 | 261MB |
| `api-runtime` | Mock API server | 4010 | 229MB |
| `builder` | Dependencies only | - | Used by others |

---

## 🔧 Configuration Files

- **`.env.local`** - Environment variables (API, Supabase, EAS tokens)
- **`eas.json`** - EAS build profiles (development, preview, production)
- **`app.json`** - Expo app metadata & capabilities
- **`docker-compose.multiplatform.yml`** - Service orchestration
- **`Dockerfile.multiplatform`** - Multi-stage container builds
- **`build.sh`** - Platform-specific build orchestration
- **`docker-build.sh`** - Docker image builder

---

## 📱 Platform-Specific Setup

### Web
```bash
# Just run dev server
docker-compose -f docker-compose.multiplatform.yml up web
```

### iOS
```bash
eas credentials                    # Link Apple Developer account
export EXPO_TOKEN=xxx
./build.sh ios                     # Cloud build via EAS
eas submit --platform ios          # Submit to App Store
```

### Android
```bash
eas credentials                    # Link Google Play account
export EXPO_TOKEN=xxx
./build.sh android                 # Cloud build via EAS
eas submit --platform android      # Submit to Play Store
```

---

## 🔐 Required Credentials

| Platform | Credential | Where to Get |
|----------|-----------|--------------|
| Web | None | Local dev |
| iOS | EXPO_TOKEN | expo.dev/settings/tokens |
| iOS | Apple ID | developer.apple.com |
| Android | EXPO_TOKEN | expo.dev/settings/tokens |
| Android | Service Account | Google Play Console |

---

## 📝 File Locations

```
anima/
├── Dockerfile.multiplatform     # Multi-target builds
├── docker-compose.multiplatform.yml
├── eas.json                     # Build profiles
├── build.sh                     # Platform builder
├── docker-build.sh              # Image builder
├── .env.local                   # Credentials (⚠️ Don't commit)
├── DEPLOY.md                    # Full deployment guide
└── MULTIPLATFORM.md             # This file
```

---

## 🐛 Common Issues

| Issue | Solution |
|-------|----------|
| Port 8081 in use | Change port: `PORT=8082 docker-compose up` |
| EXPO_TOKEN not found | `eas credentials` then `export EXPO_TOKEN=...` |
| Build fails with peer deps | Already handled: `--legacy-peer-deps` in Dockerfile |
| Database connection error | `docker-compose ps` and check postgres service |
| iOS build slow (first time) | Normal: 5-10 minutes. Cached builds: 1-2 minutes |

---

## 📊 Service Ports

| Service | Port | URL |
|---------|------|-----|
| Expo Web | 8081 | http://localhost:8081 |
| Mock API | 4010 | http://localhost:4010 |
| PostgreSQL | 5432 | postgres://localhost:5432 |
| EAS Builder | 3000 | http://localhost:3000 |

---

## 🔄 Development Workflow

```
1. docker-compose up                    # Start dev environment
2. Edit code in ./app, ./components     # Hot reload via bind mounts
3. http://localhost:8081                # View changes instantly
4. docker-compose exec web npm test     # Run tests
5. docker-compose down                  # Stop services
```

---

## 📤 Deployment Pipeline

```
Local Development (Web)
       ↓
   Test on Web (http://localhost:8081)
       ↓
   ./build.sh ios / android
       ↓
   EAS Cloud Build (5-10 mins)
       ↓
   Test on Device (TestFlight / Internal Track)
       ↓
   eas submit --platform ios/android
       ↓
   Review in App Store / Play Store
       ↓
   ✅ Live!
```

---

## 🧹 Cleanup

```bash
# Stop all services
docker-compose -f docker-compose.multiplatform.yml down

# Remove unused images
docker image prune

# Remove unused volumes
docker volume prune

# Clean everything (⚠️ Deletes data)
docker system prune -a --volumes
```

---

## 📚 Learn More

- [Full Deployment Guide](./DEPLOY.md)
- [Expo Docs](https://docs.expo.dev)
- [EAS Build Guide](https://docs.expo.dev/build/introduction/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
