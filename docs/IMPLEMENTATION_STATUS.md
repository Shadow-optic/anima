# ANIMA Implementation Status

## Built Runtime Surfaces

- Expo Router app for iOS, Android, and web.
- Route groups:
  - `app/(auth)/login.tsx`
  - `app/(tabs)/index.tsx`
  - `app/(tabs)/nutrition.tsx`
  - `app/(tabs)/health.tsx`
  - `app/(tabs)/scan.tsx`
  - `app/(tabs)/marketplace.tsx`
  - `app/(tabs)/profile.tsx`
  - `app/onboarding/index.tsx`
  - `app/pet/[id].tsx`
  - `app/portal.tsx`

## Core App Modules

- `config/api.ts`: Supabase + API client + mock mode switching.
- `config/theme.ts`: design tokens and score styling.
- `hooks/useApi.ts`: all server-state hooks and mutations.
- `stores/index.ts`: Zustand stores with cross-platform local storage fallback.
- `components/ui.tsx`: reusable UI primitives.
- `shared/types/index.ts`: cross-layer domain types.
- `shared/constants/`: breed, nutrient, and biomarker constants.

## Local Backend for Development

- `server/mock-api.mjs`: mock REST API with in-memory state and endpoints for:
  - pets, scores, score history/recompute
  - nutrition plans and meal logging
  - biocard scan + biomarkers
  - environment, care timeline, behavioral insights, food alerts
  - food search and photo vitals

## Runbook

1. `npm install`
2. `npm run mock:api`
3. `npm run start:web` or `npm run ios` / `npm run android`
