# Status

**Last updated:** 2026-11-23 · Score engine `anima-v2.0`

## Done

- One backend: Supabase (auth, Postgres, row level security). Appwrite and the Express/Prisma design are gone from the build.
- The core loop works end to end on real persistence: onboarding → Score → choose or enter a food → log meals and care → Score moves.
- Guest mode: the same loop with data in the browser, moved into the account at sign-up.
- Food Score engine and a rate-any-label tool.
- Shareable Score card: link, image, share sheet, public page.
- Every factor cites its sources and states its limits in the app.
- Real catalog: 44 products from 28 brands with sourced label data, maker facts and recalls found.
- Portion Autopilot: a feeding plan corrected from two-weekly weigh-ins, with safety limits.

## Verified

- `npm test`: 23 tests (ratings, Score behaviour, Autopilot decisions and limits, real catalog integrity, citations resolve, share-link validation).
- `npm run typecheck` and `npm run build:web` pass.
- Full browser walk-through of the built site in guest mode, desktop and phone widths, no console errors.
- Both migrations applied to Postgres 16 with a stand-in `auth` schema: a second user and an anonymous visitor can neither read nor write another user's rows; deleting a user removes their data.

## Not verified

- The account path (`lib/repo/supabase.ts`, sign-up, guest-to-account move) has not been run against a live Supabase project. It typechecks and the schema it targets is tested, but it needs a pass with real project keys.

## Known gaps

| Gap | Why it matters |
|---|---|
| Catalog is a dated snapshot | Label data was read on 24 Nov 2026 and recipes change. Several products rest on stated assumptions (Hill's publishes averages, not minimums; some pages show no AAFCO statement or crude fibre). It needs a refresh process and a legal review before public launch. |
| Recall data is incomplete | The FDA public list does not cover the full five years, so most brands are "unknown", not "clean". |
| Autopilot is not clinically validated | It follows published guideline thresholds, but ANIMA has not tested it on real pets. Weights are owner-reported. |
| No checkout, cart, inventory or fulfilment | The Shop is a rated catalog only. |
| Share links carry the card in the URL | Works on static hosting, but link previews show the site's generic image, and a card is the owner's snapshot, not verified by ANIMA. A server-rendered share page would fix both. |
| 38 breeds | Others fall back to the mixed-breed profile. |
| Weights are not fitted to outcomes | They are evidence-informed judgement. Calibrating them needs outcome data. |
| Native apps | The code is Expo, so iOS and Android can follow, but local storage and auth session storage are browser-only today. |
| No analytics | Nothing measures the funnel yet. |
| Password reset | The email is sent, but there is no "set new password" screen for the return link. |

## Next

1. Run the account path against a Supabase project and fix what turns up.
2. A refresh and review process for the catalog, then widen it (puppy, kitten, senior, large-breed lines).
3. Server-rendered share page with a per-pet preview image.
4. Analytics on the onboarding and share funnel.
