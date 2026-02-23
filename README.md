# ANIMA — Pet Longevity Intelligence Platform

> **"More life. More time. More of them."**

ANIMA is the world's first vertically integrated pet longevity platform — a biological operating system that builds a living computational model of each pet's unique biology and uses it to extend healthy lifespan through precision nutrition, predictive health intelligence, and proprietary at-home diagnostics.

---

## Current Build Status (February 23, 2026)

This repository now includes a runnable cross-platform implementation:

- **Mobile + Web App (Expo Router):** `app/`
- **Shared UI and domain modules:** `components/`, `config/`, `hooks/`, `stores/`, `shared/`
- **Local development backend:** `server/mock-api.mjs` (no external services required)

### Quick Start

1. Install dependencies:

```bash
npm install
```

2. Start the local API (Terminal 1):

```bash
npm run mock:api
```

3. Start the app (Terminal 2):

```bash
npm run start:web
```

Or run native targets:

```bash
npm run ios
npm run android
```

### Demo Mode Defaults

- `EXPO_PUBLIC_USE_MOCK_DATA=true` is enabled by default in `config/api.ts`.
- If Supabase keys are not configured, the app auto-signs into a demo account and uses the local mock API.

---

## Dual-Track Development Strategy

ANIMA runs two parallel development tracks that converge into a single platform:

| | **Track A: The App** | **Track B: The Lab** |
|---|---|---|
| **What** | Consumer nutrition app → longevity platform | Proprietary BioCard diagnostic hardware |
| **When** | Public from Day 1 | Stealth R&D, public at Month 8–12 |
| **Revenue** | Subscriptions, marketplace, food affiliates | Consumable cartridges, reader hardware |
| **Data** | Behavioral, dietary, activity | Biological, molecular, genetic |
| **Moat** | Network effects, Longevity Score standard | Hardware IP, reagent formulations, manufacturing |
| **Funds** | User revenue → funds Track B R&D | — |

### Why Dual-Track Works

The app isn't a separate product from BioCard — it's the **distribution channel**. Every app user is a warm lead for BioCard. Every BioCard scan makes the app smarter. The tracks don't just converge — they compound.

```
Month 0                    Month 6                   Month 12                  Month 18
  │                          │                          │                         │
  ├─ App Launch (MVP)        ├─ 50K users               ├─ 200K users             ├─ 500K users
  │  Free + Premium tiers    │  Premium conversion 5%   │  BioCard waitlist 20K   │  BioCard public launch
  │                          │                          │                         │  Vet portal beta
  ├─ BioCard R&D starts      ├─ Channel validation      ├─ BioCard beta (500)     │
  │  Material testing        │  Reagent chemistry        │  Clinical validation    ├─ Full platform
  │  Channel geometry        │  First colorimetric       │  Manufacturing prep     │  Digital Twin v2
  │                          │  Phone CV pipeline        │                         │  Predictive engine
  ▼                          ▼                          ▼                         ▼
```

---

## Repository Structure

```
anima/
├── README.md                          # You are here
├── docs/
│   ├── ARCHITECTURE.md                # System architecture & data flow
│   ├── TRACK_A_MILESTONES.md          # App development milestones
│   ├── TRACK_B_MILESTONES.md          # BioCard R&D milestones
│   ├── DATA_MODEL.md                  # Database schema & relationships
│   └── BIOCARD_PROTOCOLS.md           # Lab protocols & fabrication
│
├── src/
│   ├── app/                           # React Native (Expo) mobile app
│   │   ├── components/                # Reusable UI components
│   │   │   ├── LongevityScore.tsx     # The Score™ display widget
│   │   │   ├── DigitalTwin.tsx        # Pet biological profile view
│   │   │   ├── MealPlan.tsx           # Daily nutrition protocol
│   │   │   ├── BioCardScanner.tsx     # Camera-based BioCard reader
│   │   │   └── FoodSearch.tsx         # Brand/recipe search & cart
│   │   ├── screens/                   # App screens
│   │   │   ├── Onboarding.tsx         # Pet profile creation flow
│   │   │   ├── Dashboard.tsx          # Main hub — Score + Twin
│   │   │   ├── NutritionEngine.tsx    # Meal plans & food management
│   │   │   ├── HealthTimeline.tsx     # Biomarker trends over time
│   │   │   ├── BioCardScan.tsx        # Scan flow & results
│   │   │   └── Marketplace.tsx        # Products, kits, supplements
│   │   ├── services/                  # API clients & business logic
│   │   ├── models/                    # Client-side data models
│   │   ├── hooks/                     # Custom React hooks
│   │   ├── utils/                     # Utilities
│   │   └── config/                    # Configuration & theme
│   │
│   ├── api/                           # Node.js + Express backend
│   │   ├── routes/                    # Endpoint handlers
│   │   ├── middleware/                # Auth, validation, rate limiting
│   │   ├── services/                  # Core business logic
│   │   │   ├── nutritionEngine.ts     # AI meal plan generation
│   │   │   ├── longevityScorer.ts     # Score computation engine
│   │   │   ├── digitalTwin.ts         # Twin model management
│   │   │   ├── biomarkerAnalysis.ts   # BioCard → biomarkers
│   │   │   └── predictiveEngine.ts    # Disease risk prediction
│   │   └── models/                    # Prisma schema
│   │
│   ├── biocard/                       # Hardware R&D (Track B)
│   │   ├── designs/                   # CAD & fabrication specs
│   │   ├── protocols/                 # Lab SOPs
│   │   ├── firmware/                  # ANIMA Reader (ESP32)
│   │   └── analysis/                  # CV & data pipeline
│   │
│   └── shared/                        # Shared types & constants
│       ├── types/                     # TypeScript definitions
│       └── constants/                 # Biomarker refs, breeds, nutrients
│
├── tests/                             # Test suites
└── scripts/                           # Dev & deployment
```

---

## Tech Stack

### Mobile App (Track A)
| Layer | Choice | Why |
|-------|--------|-----|
| Framework | React Native + Expo SDK 52 | Cross-platform, OTA updates, Expo modules |
| Language | TypeScript (strict) | Type safety across full stack |
| State | Zustand + TanStack Query | Lightweight global state + server cache |
| Navigation | Expo Router | File-based, deep linking built-in |
| UI | Custom design system | Brand IS the product — no generic libraries |
| Camera/CV | expo-camera + TFLite | On-device BioCard reading, no server round-trip |
| Auth | Supabase Auth | Social + email, row-level security |
| Analytics | PostHog + Mixpanel | Product analytics + marketing attribution |

### Backend API
| Layer | Choice | Why |
|-------|--------|-----|
| Runtime | Node.js 22 + Express | Fast, proven, massive ecosystem |
| Database | PostgreSQL 16 (Supabase) | pgvector for embeddings, RLS, real-time |
| ORM | Prisma 6 | Type-safe queries, migrations, studio |
| Cache | Redis (Upstash) | Session, rate limiting, score cache |
| ML | FastAPI microservices | Heavy compute isolated, GPU-ready |
| Search | Typesense | Blazing fast food database full-text |
| Storage | Supabase Storage | Images, BioCard scans, vet records |
| Queue | BullMQ | Score recomputation, Twin updates, async |
| Hosting | Railway + Supabase + Vercel | Auto-scaling, managed infra |

### BioCard Pipeline (Track B)
| Layer | Choice | Why |
|-------|--------|-----|
| CAD | FreeCAD + OpenSCAD | Parametric design, scriptable |
| Slicing | ChiTuBox / LightBurn | Saturn 16K / Falcon A1 Pro |
| CV | OpenCV + scikit-image | Card detection, color quantification |
| ML | PyTorch | Biomarker regression from colorimetric |
| Analysis | pandas + matplotlib | Lab data, calibration curves |
| Firmware | PlatformIO (ESP32-S3) | ANIMA Reader prototype |

---

## Track A: App Development Timeline

### Phase A1 — Foundation (Weeks 1–6)
Ship the core: pet profiles, basic score, nutrition engine.

- **Wk 1:** Expo scaffold, Supabase project, CI/CD, design tokens
- **Wk 2:** Auth + onboarding, pet profile creation, photo upload
- **Wk 3:** Longevity Score v0 (breed risk + age + weight + BCS)
- **Wk 4:** Food database ingestion (top 200 brands), search/filter
- **Wk 5:** Nutrition Engine v1 — caloric needs, macro targets, meal plans
- **Wk 6:** Polish, TestFlight beta, 50 testers onboarded

### Phase A2 — Growth Engine (Weeks 7–14)
Daily engagement loops, social features, premium tier.

- **Wk 7–8:** Meal tracking (barcode scan, recipe entry, photo log)
- **Wk 9:** Auto-cart (Chewy/Amazon affiliate integration)
- **Wk 10:** Premium tier launch ($9.99/mo)
- **Wk 11:** Score v1 (nutrition quality + activity + preventive care)
- **Wk 12:** Social sharing (Score cards for Instagram/TikTok)
- **Wk 13:** Vet records (manual entry, vaccination tracking)
- **Wk 14:** **APP STORE LAUNCH** 🚀

### Phase A3 — Intelligence Layer (Weeks 15–26)
Wearables, Digital Twin, predictive features, BioCard integration.

- **Wk 15–16:** Wearable integration (FitBark/Whistle/Fi)
- **Wk 17–18:** Digital Twin v1 (unified model, trend analysis)
- **Wk 19–20:** Predictive alerts ("weight trend suggests…")
- **Wk 21–22:** Functional food recommendations from Twin state
- **Wk 23–24:** BioCard scan flow integrated into app
- **Wk 25–26:** Vet Portal MVP (web dashboard)

### Phase A4 — Platform Scale (Weeks 27–52)
Marketplace, partnerships, B2B — become infrastructure.

- **Wk 27–30:** Marketplace v1 (third-party listings, reviews)
- **Wk 31–34:** Custom functional food blends (D2C, 60%+ margin)
- **Wk 35–38:** Insurance pilot (Score-based premium discounts)
- **Wk 39–42:** Vet SaaS ($99–$299/mo/practice)
- **Wk 43–46:** Data licensing (anonymized population health)
- **Wk 47–52:** International expansion (UK/CA/AU)

---

## Track B: BioCard R&D Timeline

### Phase B1 — Fabrication Validation (Weeks 1–4)
Prove both machines make microfluidic channels.

- **Wk 1:** Materials: cast PMMA, Siraya Blu Clear, dyes, 3M 9795R adhesive
- **Wk 2:** Falcon laser channel tests (200μm–2mm in PMMA)
- **Wk 3:** Saturn 16K enclosed channel prints, flow validation
- **Wk 4:** Capillary flow testing, optimal geometry identification

### Phase B2 — Colorimetric PoC (Weeks 5–12)
First working diagnostic: pH + urea from saliva.

- **Wk 5–6:** pH BioCard design (2-well, pre-loaded indicator)
- **Wk 7–8:** Phone CV pipeline v1 (card detect → well isolate → color extract)
- **Wk 9–10:** Multi-analyte (add urea/BUN, total protein wells)
- **Wk 11–12:** Stability testing (shelf life, humidity, batch consistency)

### Phase B3 — Beta Hardware (Weeks 13–26)
Ship 500 BioCards to beta users, validate real-world accuracy.

- **Wk 13–14:** V1 finalized, QR lot codes laser-engraved
- **Wk 15–16:** Reagent scale-up, documented SOPs, QC
- **Wk 17–18:** 500-unit manufacturing run
- **Wk 19–20:** Beta recruitment from app user base
- **Wk 21–22:** Beta data collection, failure mode tracking
- **Wk 23–24:** Lab correlation (BioCard vs. vet panel, N=50)
- **Wk 25–26:** V2 iteration based on beta learnings

### Phase B4 — Production & Reader (Weeks 27–52)
Contract manufacturing, public launch, reader prototype.

- **Wk 27–30:** Injection mold tooling (Protolabs/Xometry)
- **Wk 31–34:** First production run (5,000 units), QC validation
- **Wk 35–38:** **PUBLIC BIOCARD LAUNCH** 🧬
- **Wk 39–42:** ANIMA Reader prototype (ESP32-S3 + camera + LED)
- **Wk 43–46:** Reader beta (100 units to power users)
- **Wk 47–52:** Reader industrial design, compliance prep

---

## Revenue Model

| Stream | % Rev | Margin | Timeline |
|--------|-------|--------|----------|
| App Subscriptions | 25% | 90%+ | Month 3+ |
| BioCard Consumables | 30% | 85–95% | Month 12+ |
| Custom Functional Foods | 20% | 60%+ | Month 18+ |
| Marketplace & Affiliates | 10% | 90% | Month 8+ |
| Reader Hardware | 5% | 0–10% | Month 18+ |
| Data Licensing & Vet SaaS | 10% | 90% | Month 18+ |

### Subscription Tiers

| Tier | Price | What They Get |
|------|-------|---------------|
| **Free** | $0 | 1 pet, basic Score, 3 meal plans/wk, ads |
| **Premium** | $9.99/mo | 3 pets, full Score, unlimited plans, no ads |
| **Pro + BioCard** | $29.99/mo | ∞ pets, 2 BioCards/mo, Twin, predictive alerts |
| **Vet Practice** | $99–$299/mo | Clinical dashboard, patient Twins, SOAP integration |

---

## Getting Started

```bash
# Prerequisites: node>=22, pnpm>=9, python>=3.12, postgresql>=16

git clone https://github.com/anima-pet/anima.git && cd anima
pnpm install
cp .env.example .env  # Fill in keys

pnpm db:migrate && pnpm db:seed
pnpm dev:app    # Expo (mobile)
pnpm dev:api    # Express (backend)
pnpm dev:web    # Next.js (vet portal)
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for full system design.

---

## License

Proprietary. All rights reserved.
Patent pending: Longevity Score™ methodology, BioCard™ diagnostic platform.

---

*Built with 🧬 by ANIMA — Because they deserve more time.*
