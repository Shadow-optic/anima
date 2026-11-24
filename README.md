# ANIMA

A website that gives a dog or cat a **Longevity Score** built on published veterinary research, and rates pet food from its label. Nutrition is the largest part of the Score, and the rated catalog is the base for a future food and treat store.

> "More life. More time. More of them."

## What runs today

| Area | What it does |
|---|---|
| Landing page (`/`) | Explains the Score and food ratings; no account needed to start. |
| Onboarding (`/onboarding`) | Five steps to a first Score, computed in the browser. |
| Score (`/(tabs)`) | The Score, the biggest opportunity to raise it, every factor with its calculation and sources, and a daily trend. |
| Nutrition | Calorie target, meal and treat logging, weekly diet summary. |
| Shop | Every food graded A–E and ranked by fit for the pet. Ordering is not open yet. |
| Food detail (`/food/[id]`) | Full rating breakdown, fit for the pet, daily portion and cost. |
| Rate a label (`/food/new`) | Type in any food's guaranteed analysis and ingredients and get a grade. |
| Care | Vet check-ups, dental, vaccines, parasite prevention, body condition, activity. |
| Share (`/share?d=…`) | Public Score card; link, downloadable image, device share sheet. |
| Science (`/science`) | Method, limits and every citation. |

## Run it

```bash
npm install
npm start          # dev server, opens the website
npm test           # engine tests
npm run typecheck
npm run build:web  # static site in dist/
```

With no configuration the site runs in **guest mode**: everything is saved in the visitor's browser.

## Accounts and saved data (Supabase)

Supabase is the only backend.

1. Create a Supabase project.
2. Run `supabase/migrations/0001_init.sql` in the SQL editor (or `supabase db push`).
3. Copy `.env.example` to `.env` and fill in the project URL and anon key.
4. In Supabase → Authentication → URL configuration, set the site URL to where the site is hosted.

Once configured, sign-up and sign-in appear. When a guest creates an account, the pets, meals and care records they made in the browser are moved into the account.

Row level security restricts every table to its owner. The anon key is public by design.

## How it is put together

```
app/            Screens (Expo Router). Website first; the same code can build iOS and Android later.
components/     UI primitives, Score and food components, share card.
hooks/useData   All reads and writes. Screens never touch storage directly.
lib/repo/       Persistence: LocalRepo (browser) and SupabaseRepo (account), one interface.
shared/         Dependency-free engines, used by the app and the tests:
  food/rating     ANIMA Food Score (0–100, grade A–E) from label data
  food/catalog    Sample catalog (illustrative products, clearly labelled)
  score/longevity Longevity Score engine (anima-v2.0)
  score/evidence  Every citation and the stated limits of each factor
  nutrition/energy Calorie targets and dry-matter maths
  constants/breeds Breed life expectancy and reference data
  share/card      Share-link encoding and validation
supabase/       Database schema and security policies.
tests/          Engine tests.
legacy/         Earlier backend, research code and mocked screens. Not built.
docs/           Status, and the original strategy documents (docs/vision).
```

## The two scores

**Longevity Score (0–999).** Nutrition 25%, body condition 20%, breed baseline 20%, life stage 15%, preventive care 10%, activity 10%. Factors without data sit at a neutral 50 and are labelled as placeholders. It is a wellness index, not a lifespan prediction.

**Food Score (0–100, A–E).** Complete-and-balanced statement 30, nutrient profile on a dry-matter basis 30, ingredients 15, maker transparency 15, recall record 10, then adjusted for the individual pet. Food quality is 55% of the nutrition factor.

The weights are judgement calls informed by the evidence; they have not been fitted to outcome data. `shared/score/evidence.ts` and the `/science` page give the sources and say where the evidence is thin.

## Deploying

The build is a static single-page site. Any static host works as long as unknown paths fall back to `index.html`:

- **Vercel / Netlify / Cloudflare Pages:** `vercel.json` and `public/_redirects` are included. Set the three `EXPO_PUBLIC_*` variables in the host's build settings.
- **Docker:** `docker build --build-arg EXPO_PUBLIC_SUPABASE_URL=… --build-arg EXPO_PUBLIC_SUPABASE_ANON_KEY=… -t anima .` serves the site with nginx on port 8080.

## Before selling food

The catalog in `shared/food/catalog.ts` is sample data. Selling needs real label data for real products, a recall feed, the makers' answers to the WSAVA questions, and checkout. See `docs/STATUS.md`.
