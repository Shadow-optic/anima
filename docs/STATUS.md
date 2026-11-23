# ANIMA Implementation Status

**Last updated:** 2026-08-06 · engine `pure-v1.0`

## Built Runtime Surfaces

- Expo Router app for iOS, Android, and web.
- Route groups:
  - `app/(auth)/login.tsx`
  - `app/(tabs)/index.tsx` — Dashboard Score hero + factor bars
  - `app/(tabs)/nutrition.tsx` — Plan / log / search + quick-log meals
  - `app/(tabs)/health.tsx`
  - `app/(tabs)/scan.tsx`
  - `app/(tabs)/marketplace.tsx`
  - `app/(tabs)/profile.tsx`
  - `app/onboarding/index.tsx` — Wizard + **client pure Score reveal** with factor snapshot
  - `app/pet/[id].tsx`
  - `app/portal.tsx`

## Core Engines

| Module | Role |
|--------|------|
| `shared/score/pureScore.ts` | **NEW** Dependency-free Phase-1 Longevity Score. Client + offline. |
| `server/mock-api.mjs` | pure-v1.0 embedded. Breed-aware scores, NRC calories, meal nudges. |
| `longevityScorer.ts` | Full Prisma + Redis production engine (backend path). |
| `nutritionEngine.ts` | Full nutrition targets + meal plan generator (backend path). |

### pure-v1.0 Factor Weights

| Factor | Weight |
|--------|--------|
| Genetic Baseline | 25% |
| Body Condition | 20% |
| Nutrition Quality | 20% |
| Age & Health | 15% |
| Preventive Care | 10% |
| Activity Level | 10% |

Nutrition factor lifts with meal logging density (0 → 1 → 3 → 7 → 14+ meals in 7 days).

## Sprint Complete (2026-08-06)

1. ✅ Client pure scorer (`shared/score/pureScore.ts`)
2. ✅ Dashboard surfaces live factor breakdown from Score payload
3. ✅ Meal logging → Score invalidation (useLogMeal settles score query)
4. ✅ Onboarding polish: age→DOB, instant pure Score, factor snapshot on reveal

## Runbook

```bash
npm install
npm run mock:api      # Terminal 1 — pure-v1.0 on :4010
npm run start:web     # Terminal 2
```

Flow to verify:
1. Open onboarding → create a Labrador vs French Bulldog → Scores should differ.
2. Dashboard shows factor bars + labels from the pure engine.
3. Nutrition → Log This Meal → pull-to-refresh dashboard → Score moves.
