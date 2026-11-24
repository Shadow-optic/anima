# Legacy

Code that is not part of the running website. Kept for reference; nothing here is built, typechecked or deployed.

| Folder | What it is |
|---|---|
| `backend/` | The earlier Express + Prisma + Redis backend design (`routes.ts`, `longevityScorer.ts`, `nutritionEngine.ts`, `schema.prisma`) and the mock API the app used to run against. Replaced by Supabase and the client-side engines in `shared/`. |
| `research/` | Ambient-intelligence concepts: photo vitals, voice monitoring, environment risk, BioCard biomarker quantification. None were wired to real data. |
| `screens/` | Screens that showed mocked data from the above (BioCard scan, health intelligence, web portal, pet detail). |
| `prototypes/` | Standalone JSX presentation prototypes. |

The Appwrite backend was removed outright (see git history before the "one backend" commit) because the project now uses Supabase only.
