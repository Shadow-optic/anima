# Status

**Last updated:** 2026-11-23 · Score engine `anima-v2.0`

## Done

- One backend: Supabase (auth, Postgres, row level security). Appwrite and the Express/Prisma design are gone from the build.
- The core loop works end to end on real persistence: onboarding → Score → choose or enter a food → log meals and care → Score moves.
- Guest mode: the same loop with data in the browser, moved into the account at sign-up.
- Food Score engine and a rate-any-label tool.
- Shareable Score card: link, image, share sheet, public page.
- Every factor cites its sources and states its limits in the app.

## Verified

- `npm test`: 12 engine tests (ratings, Score behaviour, citations resolve, share-link validation).
- `npm run typecheck` and `npm run build:web` pass.
- Full browser walk-through of the built site in guest mode, desktop and phone widths, no console errors.
- `supabase/migrations/0001_init.sql` applied to Postgres 16 with a stand-in `auth` schema: a second user and an anonymous visitor can neither read nor write another user's rows; deleting a user removes their data.

## Not verified

- The account path (`lib/repo/supabase.ts`, sign-up, guest-to-account move) has not been run against a live Supabase project. It typechecks and the schema it targets is tested, but it needs a pass with real project keys.

## Known gaps

| Gap | Why it matters |
|---|---|
| Catalog is sample data | Nothing real can be recommended or sold until real label data is licensed or collected. |
| No checkout, cart, inventory or fulfilment | The Shop is a rated catalog only. |
| Share links carry the card in the URL | Works on static hosting, but link previews show the site's generic image, and a card is the owner's snapshot, not verified by ANIMA. A server-rendered share page would fix both. |
| 38 breeds | Others fall back to the mixed-breed profile. |
| Weights are not fitted to outcomes | They are evidence-informed judgement. Calibrating them needs outcome data. |
| Native apps | The code is Expo, so iOS and Android can follow, but local storage and auth session storage are browser-only today. |
| No analytics | Nothing measures the funnel yet. |
| Password reset | The email is sent, but there is no "set new password" screen for the return link. |

## Next

1. Run the account path against a Supabase project and fix what turns up.
2. Real product data for 50–100 foods people already buy, so a visitor finds their own bag.
3. Server-rendered share page with a per-pet preview image.
4. Analytics on the onboarding and share funnel.
