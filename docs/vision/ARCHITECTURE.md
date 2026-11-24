# ANIMA System Architecture

## Overview

ANIMA is a multi-layered platform composed of three primary systems: a consumer mobile app, a backend intelligence API, and a hardware diagnostics pipeline. These converge through the **Digital Twin** — a per-pet biological model that aggregates all data sources into a unified health representation.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ANIMA PLATFORM                               │
│                                                                     │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────────┐    │
│  │  Mobile   │   │   Vet    │   │ BioCard  │   │  3rd Party   │    │
│  │   App     │   │  Portal  │   │ Scanner  │   │  Wearables   │    │
│  └────┬─────┘   └────┬─────┘   └────┬─────┘   └──────┬───────┘    │
│       │              │              │                  │            │
│  ─────┴──────────────┴──────────────┴──────────────────┴────────   │
│                         API Gateway (Express)                       │
│  ───────────────────────────────────────────────────────────────   │
│       │              │              │                  │            │
│  ┌────┴─────┐  ┌─────┴────┐  ┌─────┴────┐  ┌─────────┴────────┐  │
│  │ Nutrition │  │ Longevity│  │ BioCard  │  │   Digital Twin   │  │
│  │  Engine   │  │  Scorer  │  │ Analysis │  │     Engine       │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────────┬─────────┘  │
│       │              │              │                  │            │
│  ─────┴──────────────┴──────────────┴──────────────────┴────────   │
│                      Data Layer (PostgreSQL + Redis)                │
│  ───────────────────────────────────────────────────────────────   │
│       │              │              │                  │            │
│  ┌────┴─────┐  ┌─────┴────┐  ┌─────┴────┐  ┌─────────┴────────┐  │
│  │   Food   │  │   Pet    │  │ Biomarker│  │   ML Models      │  │
│  │    DB    │  │ Profiles │  │ Readings │  │ (FastAPI / GPU)   │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 1. Mobile App Architecture

### Framework: React Native + Expo (Managed Workflow)

```
app/
├── (auth)/                  # Auth group (login, signup, forgot)
│   ├── login.tsx
│   ├── signup.tsx
│   └── _layout.tsx
├── (tabs)/                  # Main tab navigator
│   ├── index.tsx            # Dashboard (Score + Quick Actions)
│   ├── nutrition.tsx        # Meal plans & food log
│   ├── health.tsx           # Timeline + biomarkers
│   ├── marketplace.tsx      # Products & kits
│   └── _layout.tsx
├── onboarding/              # Pet profile creation wizard
│   ├── species.tsx
│   ├── breed.tsx
│   ├── basics.tsx           # Name, age, weight, sex
│   ├── conditions.tsx       # Known health conditions
│   ├── diet.tsx             # Current diet
│   └── score-reveal.tsx     # First Score calculation
├── pet/[id]/                # Per-pet deep views
│   ├── twin.tsx             # Full Digital Twin view
│   ├── biocard.tsx          # BioCard scan flow
│   └── history.tsx          # Health timeline
└── _layout.tsx              # Root layout
```

### State Management Strategy

```
┌──────────────────────────────────────────────────┐
│                  App State Model                  │
│                                                   │
│  Zustand (Global Sync State)                      │
│  ├── auth: { user, session, tokens }              │
│  ├── activePet: { id, name, species, breed }      │
│  ├── ui: { theme, bottomSheet, modals }           │
│  └── offline: { pendingSync[], lastSync }         │
│                                                   │
│  TanStack Query (Server State Cache)              │
│  ├── ['pets']           → all user's pets          │
│  ├── ['pet', id]        → single pet profile       │
│  ├── ['score', petId]   → longevity score          │
│  ├── ['twin', petId]    → digital twin state       │
│  ├── ['meals', petId]   → meal plan history        │
│  ├── ['biomarkers', id] → biomarker readings       │
│  ├── ['foods', query]   → food search results      │
│  └── ['marketplace']    → product catalog          │
│                                                   │
│  AsyncStorage (Offline Persistence)               │
│  ├── @anima/auth-tokens                           │
│  ├── @anima/active-pet                            │
│  ├── @anima/meal-drafts                           │
│  └── @anima/pending-scans                         │
└──────────────────────────────────────────────────┘
```

### Data Flow: BioCard Scan

```
User taps "Scan BioCard"
        │
        ▼
┌─────────────────────┐
│   Camera Activates   │  expo-camera, torch on
│   Guide overlay      │  Alignment frame shown
└────────┬────────────┘
         │ Frame captured
         ▼
┌─────────────────────┐
│   On-Device CV       │  TFLite model
│   1. Detect card     │  Edge detection + QR
│   2. Perspective     │  Homography transform
│   3. Isolate wells   │  Known positions from QR
│   4. Extract RGB     │  Per-well mean color
└────────┬────────────┘
         │ { cardId, wells: [{ id, r, g, b }], calibrationStrip: [...] }
         ▼
┌─────────────────────┐
│   Color Calibration  │  Normalize against
│   (on-device)        │  printed calibration strip
└────────┬────────────┘
         │ Normalized color values
         ▼
┌─────────────────────┐
│   Upload to API      │  POST /api/biocard/scan
│   { image, colors,   │  Raw image + extracted data
│     cardQR, petId }  │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│   Server Processing  │
│   1. Validate scan   │  QR decode → lot, expiry, version
│   2. ML quantify     │  Color → concentration (PyTorch)
│   3. Range check     │  Flag abnormal values
│   4. Update Twin     │  Push new biomarker readings
│   5. Recompute Score │  Trigger async Score update
└────────┬────────────┘
         │ { biomarkers: [{ name, value, unit, range, status }] }
         ▼
┌─────────────────────┐
│   Results Screen     │  Animated reveal
│   Score updated      │  Before/after delta
│   Twin visualization │  New data points lit up
│   Action items       │  "Increase omega-3 by..."
└─────────────────────┘
```

---

## 2. Backend API Architecture

### Service Layer Design

```
┌─────────────────────────────────────────────────────────────────┐
│                        Express API Server                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Routes (thin handlers — validate, delegate, respond)            │
│  ├── POST /auth/signup          → AuthService                    │
│  ├── POST /auth/login           → AuthService                    │
│  ├── GET  /pets                 → PetService                     │
│  ├── POST /pets                 → PetService + ScoreService      │
│  ├── GET  /pets/:id/score       → ScoreService                   │
│  ├── GET  /pets/:id/twin        → TwinService                    │
│  ├── POST /pets/:id/meals       → NutritionService               │
│  ├── GET  /pets/:id/meals/plan  → NutritionService               │
│  ├── POST /biocard/scan         → BioCardService + TwinService   │
│  ├── GET  /foods/search         → FoodService (Typesense)        │
│  ├── GET  /marketplace          → MarketplaceService             │
│  └── POST /vet/patients         → VetService                     │
│                                                                  │
│  Services (business logic — no HTTP awareness)                   │
│  ├── NutritionEngine   │ Meal plan generation, caloric calc      │
│  ├── LongevityScorer   │ Score computation, factor weighting     │
│  ├── DigitalTwin       │ Twin state aggregation, trend analysis  │
│  ├── BioCardAnalysis   │ Image processing, biomarker quant       │
│  ├── PredictiveEngine  │ Risk prediction from Twin + population  │
│  ├── FoodDatabase      │ Product catalog, nutrition facts        │
│  └── Marketplace       │ Product listings, cart, affiliates      │
│                                                                  │
│  Infrastructure                                                  │
│  ├── Prisma (PostgreSQL)  │ Primary data store                   │
│  ├── Redis (Upstash)      │ Cache, sessions, rate limits         │
│  ├── BullMQ               │ Async jobs (score recomp, Twin)      │
│  ├── Supabase Storage     │ Images, scans, documents             │
│  └── Typesense            │ Full-text food search                │
│                                                                  │
│  ML Microservices (FastAPI, separate containers)                  │
│  ├── /ml/nutrition-plan   │ GPT-4o: meal plan generation         │
│  ├── /ml/biocard-quant    │ PyTorch: colorimetric → values       │
│  ├── /ml/risk-predict     │ XGBoost: disease risk from features  │
│  └── /ml/food-embed       │ Embeddings for food similarity       │
└─────────────────────────────────────────────────────────────────┘
```

### Longevity Score Computation

The Score is ANIMA's most important artifact — it must be transparent, reproducible, and incrementally improvable.

```
Score™ = weighted_sum(factors) normalized to 0–999

FACTORS (Phase 1 — App Only):
┌────────────────────────┬────────┬──────────────────────────────┐
│ Factor                 │ Weight │ Source                       │
├────────────────────────┼────────┼──────────────────────────────┤
│ Genetic Baseline       │ 25%    │ Breed avg lifespan + risks   │
│ Body Condition         │ 20%    │ Weight vs. breed ideal range │
│ Nutrition Quality      │ 20%    │ Diet completeness score      │
│ Age-Adjusted Health    │ 15%    │ Age percentile for breed     │
│ Preventive Care        │ 10%    │ Vaccinations, dental, etc.   │
│ Activity Level         │ 10%    │ Self-reported or wearable    │
└────────────────────────┴────────┴──────────────────────────────┘

FACTORS (Phase 2 — With BioCard):
┌────────────────────────┬────────┬──────────────────────────────┐
│ Factor                 │ Weight │ Source                       │
├────────────────────────┼────────┼──────────────────────────────┤
│ Genetic Baseline       │ 15%    │ Breed + DNA panel (if avail) │
│ Biomarker Health       │ 25%    │ BioCard readings + vet labs  │
│ Body Condition         │ 12%    │ Weight + LiDAR/photo BCS     │
│ Nutrition Quality      │ 15%    │ Diet completeness + Twin fit │
│ Metabolic Trajectory   │ 15%    │ Biomarker trends over time   │
│ Preventive Care        │ 8%     │ Vacc, dental, parasite, etc. │
│ Activity & Sleep       │ 10%    │ Wearable data               │
└────────────────────────┴────────┴──────────────────────────────┘

Score Ranges:
  900–999: Exceptional  │  "Top 5% of [breed]"
  750–899: Excellent    │  "Thriving"
  600–749: Good         │  "Healthy, room to optimize"
  400–599: Fair         │  "Action recommended"
  200–399: At Risk      │  "Vet consultation advised"
  0–199:   Critical     │  "Immediate attention needed"
```

### Digital Twin Architecture

The Twin is a living document that grows with every data point.

```
┌────────────────────────────────────────────────────────────┐
│                     DIGITAL TWIN                            │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Identity Layer (immutable)                          │   │
│  │  species, breed, sex, dob, neutered, microchip      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Genetic Layer (write-once)                          │   │
│  │  breed_composition, genetic_risks[], carrier_status  │   │
│  │  Source: DNA panel (Embark/Wisdom) or breed defaults  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Biomarker Layer (time-series, append-only)          │   │
│  │  ┌──────────────────────────────────────────────┐   │   │
│  │  │ Reading { timestamp, source, biomarkers[] }  │   │   │
│  │  │  source: biocard_v1 | vet_lab | wearable     │   │   │
│  │  │  biomarkers: [{ name, value, unit, method }] │   │   │
│  │  └──────────────────────────────────────────────┘   │   │
│  │  Derived: trends, velocities, anomaly flags          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Nutrition Layer (daily log)                         │   │
│  │  meals[], supplements[], hydration, treats           │   │
│  │  Derived: nutrient totals, deficiencies, excesses    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Activity Layer (continuous)                         │   │
│  │  steps, active_mins, rest, sleep_quality             │   │
│  │  Source: wearable API or manual entry                │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Medical Layer (event-based)                         │   │
│  │  vet_visits[], vaccinations[], medications[],        │   │
│  │  procedures[], diagnoses[], allergies[]              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Computed Layer (derived, recomputed on data change) │   │
│  │  longevity_score, risk_predictions[],                │   │
│  │  nutrition_recommendations[], health_trajectory,     │   │
│  │  population_percentiles, anomaly_alerts[]            │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────┘
```

---

## 3. Database Schema

### Core Entities (Prisma)

```prisma
// See src/api/models/schema.prisma for full schema

model User {
  id            String   @id @default(cuid())
  email         String   @unique
  name          String?
  avatarUrl     String?
  tier          Tier     @default(FREE)
  stripeId      String?  @unique
  pets          Pet[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model Pet {
  id               String        @id @default(cuid())
  userId           String
  user             User          @relation(fields: [userId])
  name             String
  species          Species
  breed            String
  breedSecondary   String?
  dateOfBirth      DateTime
  sex              Sex
  neutered         Boolean
  weightKg         Float
  bodyCondition    Int           // 1-9 BCS scale
  photoUrl         String?
  microchipId      String?
  twin             DigitalTwin?
  scores           LongevityScore[]
  meals            Meal[]
  biomarkerSets    BiomarkerSet[]
  vetRecords       VetRecord[]
  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt
}

model DigitalTwin {
  id               String        @id @default(cuid())
  petId            String        @unique
  pet              Pet           @relation(fields: [petId])
  geneticProfile   Json?         // breed risks, DNA panel results
  currentState     Json          // latest computed state snapshot
  riskPredictions  Json?         // disease risk scores
  recommendations  Json?         // current action items
  lastComputed     DateTime      @default(now())
  version          Int           @default(1)
}

model LongevityScore {
  id            String   @id @default(cuid())
  petId         String
  pet           Pet      @relation(fields: [petId])
  score         Int      // 0-999
  factors       Json     // { genetic: 85, biomarker: 72, ... }
  version       String   // "v1.0", "v2.0" — algorithm version
  computedAt    DateTime @default(now())
}

model BiomarkerSet {
  id            String      @id @default(cuid())
  petId         String
  pet           Pet         @relation(fields: [petId])
  source        DataSource
  sourceId      String?     // BioCard lot#, lab accession#
  readings      Biomarker[]
  scannedAt     DateTime
  imageUrl      String?     // raw scan image
  createdAt     DateTime    @default(now())
}

model Biomarker {
  id               String       @id @default(cuid())
  biomarkerSetId   String
  biomarkerSet     BiomarkerSet @relation(fields: [biomarkerSetId])
  name             String       // "BUN", "pH", "cortisol"
  value            Float
  unit             String       // "mg/dL", "pH", "μg/dL"
  referenceMin     Float?
  referenceMax     Float?
  status           BiomarkerStatus
  confidence       Float?       // 0-1, for BioCard readings
}

model Meal {
  id            String   @id @default(cuid())
  petId         String
  pet           Pet      @relation(fields: [petId])
  type          MealType // BREAKFAST, LUNCH, DINNER, SNACK, TREAT
  items         MealItem[]
  loggedAt      DateTime
  photoUrl      String?
  notes         String?
}

model MealItem {
  id            String   @id @default(cuid())
  mealId        String
  meal          Meal     @relation(fields: [mealId])
  foodId        String?  // ref to food database
  name          String
  amountGrams   Float
  calories      Float?
  nutrients     Json?    // { protein: 25, fat: 12, ... }
}

model Food {
  id            String   @id @default(cuid())
  brand         String
  name          String
  type          FoodType // KIBBLE, WET, RAW, FREEZE_DRIED, HOMEMADE
  species       Species
  aafcoStage    String?  // "all_life_stages", "adult", "puppy"
  caloriesPer   Float    // kcal per 100g
  nutrients     Json     // full nutrient profile
  ingredients   String[]
  imageUrl      String?
  affiliateUrl  String?
  price         Float?
  verified      Boolean  @default(false)
}

// Enums
enum Tier        { FREE, PREMIUM, PRO, VET }
enum Species     { DOG, CAT }
enum Sex         { MALE, FEMALE }
enum MealType    { BREAKFAST, LUNCH, DINNER, SNACK, TREAT }
enum FoodType    { KIBBLE, WET, RAW, FREEZE_DRIED, HOMEMADE, SUPPLEMENT }
enum DataSource  { BIOCARD, VET_LAB, WEARABLE, MANUAL }
enum BiomarkerStatus { NORMAL, LOW, HIGH, CRITICAL }
```

---

## 4. BioCard CV Pipeline

### Image Processing Flow

```
Raw Phone Image (4032x3024)
        │
        ▼
┌──────────────────────┐
│  1. QR Code Detect   │  pyzbar / Vision framework
│     → card_version   │  Determines well layout, reagent map
│     → lot_number     │  Batch traceability
│     → expiry_date    │  Reject if expired
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│  2. Card Detection   │  Canny edge → contour → largest rect
│     → 4 corners      │  Find card boundaries
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│  3. Perspective Warp │  cv2.getPerspectiveTransform
│     → flat card      │  Normalize to standard orientation
│     (800x500 px)     │  Remove angle/distance variation
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│  4. Calibration      │  Extract calibration strip colors
│     Strip Read       │  Known: white, black, R, G, B patches
│     → color matrix   │  Compute correction matrix for this
│                      │  specific lighting/camera condition
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│  5. Well Isolation   │  Known positions from card version
│     → N ROIs         │  Extract circular/rectangular regions
│     (one per well)   │  Mask edges (meniscus artifacts)
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│  6. Color Quant      │  Per well:
│     → RGB values     │  - Apply calibration correction
│     (calibrated)     │  - Convert to LAB color space
│                      │  - Mean + std of central 60% pixels
│                      │  - Reject if std > threshold (bubble)
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│  7. Concentration    │  Per biomarker:
│     Regression       │  - Lookup calibration curve for reagent
│     → mg/dL etc.     │  - LAB color → concentration (trained model)
│                      │  - Report value + confidence interval
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│  8. Validation       │  Control well check (known color?)
│     → pass/fail      │  Value within physically possible range?
│     → confidence     │  Confidence above minimum threshold?
│                      │  If fail → ask user to rescan
└────────┬─────────────┘
         │
         ▼
{ biomarkers: [
    { name: "BUN", value: 18.3, unit: "mg/dL", confidence: 0.87 },
    { name: "pH", value: 6.8, unit: "pH", confidence: 0.92 },
    ...
  ],
  scanQuality: 0.89,
  cardInfo: { lot: "BC-2026-0142", version: "v1", expiry: "2026-08" }
}
```

---

## 5. Infrastructure & Deployment

```
┌────────────────────────────────────────────────────────────────┐
│                     Production Infrastructure                   │
│                                                                 │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐      │
│  │   Vercel     │     │   Railway    │     │  Supabase   │      │
│  │  (Vet Web)   │     │  (API +     │     │  (DB +      │      │
│  │  Next.js     │     │   Workers)  │     │   Auth +    │      │
│  │  SSR/ISR     │     │  Express +  │     │   Storage)  │      │
│  │              │     │  BullMQ     │     │  PG + RLS   │      │
│  └──────┬──────┘     └──────┬──────┘     └──────┬──────┘      │
│         │                   │                    │              │
│         └───────────────────┼────────────────────┘              │
│                             │                                   │
│  ┌─────────────┐     ┌─────┴───────┐     ┌─────────────┐      │
│  │   Upstash    │     │  Typesense  │     │  PostHog    │      │
│  │   (Redis)    │     │  (Search)   │     │ (Analytics) │      │
│  │  Cache +     │     │  Food DB    │     │  Events +   │      │
│  │  Rate Limit  │     │  Full-text  │     │  Funnels    │      │
│  └─────────────┘     └─────────────┘     └─────────────┘      │
│                                                                 │
│  ┌─────────────────────────────────────────────────────┐       │
│  │   ML Services (Railway GPU or Modal)                 │       │
│  │   FastAPI containers, auto-scale to 0                │       │
│  │   ├── nutrition-plan (GPT-4o API)                    │       │
│  │   ├── biocard-quant (PyTorch, CPU ok)                │       │
│  │   └── risk-predict (XGBoost, CPU ok)                 │       │
│  └─────────────────────────────────────────────────────┘       │
│                                                                 │
│  Mobile: Expo EAS Build → App Store / Play Store               │
│  Updates: Expo OTA for JS bundles, EAS for native              │
└────────────────────────────────────────────────────────────────┘
```

### Environment Strategy

| Environment | Purpose | Database | API URL |
|-------------|---------|----------|---------|
| `local` | Development | Local PG + Docker | localhost:3000 |
| `preview` | PR previews | Supabase branch | pr-{n}.anima.dev |
| `staging` | Pre-release testing | Supabase staging | staging.anima.dev |
| `production` | Live | Supabase prod | api.animapet.com |

---

## 6. Security & Privacy

### Data Classification

| Level | Examples | Storage | Access |
|-------|----------|---------|--------|
| **Public** | Breed data, food catalog | No encryption at rest | Anyone |
| **Internal** | Anonymized population stats | Encrypted at rest | ANIMA team |
| **Confidential** | Pet profiles, meal logs | Encrypted + RLS | Owner + shared vets |
| **Restricted** | Biomarker readings, DNA | Encrypted + RLS + audit log | Owner + explicit share |

### Row-Level Security (Supabase RLS)

```sql
-- Users can only access their own pets
CREATE POLICY "Users see own pets" ON pets
  FOR SELECT USING (user_id = auth.uid());

-- Vets can see shared patients
CREATE POLICY "Vets see shared patients" ON pets
  FOR SELECT USING (
    id IN (
      SELECT pet_id FROM vet_shares
      WHERE vet_id = auth.uid() AND active = true
    )
  );

-- Biomarker data requires pet ownership
CREATE POLICY "Biomarker access" ON biomarker_sets
  FOR SELECT USING (
    pet_id IN (
      SELECT id FROM pets WHERE user_id = auth.uid()
    )
  );
```

---

## 7. API Rate Limits & Tiers

| Tier | Requests/min | Score Recompute/day | BioCard Scans/mo | Food Search/min |
|------|-------------|---------------------|-------------------|-----------------|
| Free | 30 | 3 | 0 | 10 |
| Premium | 120 | 10 | 0 | 60 |
| Pro | 300 | unlimited | 4 | 120 |
| Vet | 600 | unlimited | N/A | 300 |

---

## 8. Monitoring & Observability

| Layer | Tool | What |
|-------|------|------|
| APM | Sentry | Errors, performance, sessions |
| Metrics | Railway metrics + custom | API latency, DB queries, queue depth |
| Logs | Railway logs → Axiom | Structured JSON logs, search |
| Analytics | PostHog | User funnels, feature flags, A/B tests |
| Uptime | BetterStack | Endpoint monitoring, incident alerts |
| BioCard QC | Custom dashboard | Scan success rate, accuracy drift, lot tracking |
