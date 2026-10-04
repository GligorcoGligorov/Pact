# Pact — status

The one "where are we" file. Read it first; update it at the end of every phase.
Spec: [pact-requirements.md](pact-requirements.md) (R-numbers). Plan: [pact-plan.md](pact-plan.md).

**Last updated:** 2026-10-04, end of Phase 4, on branch `feat/phase-4-web-social` (no CI in
this trial, see [trial-local-only](memory/trial-local-only.md)). Build traps:
[device-build-traps](memory/device-build-traps.md).

## Phases

| Phase                              | State    | Notes                                                                              |
| ---------------------------------- | -------- | ---------------------------------------------------------------------------------- |
| 0 — Device path                    | done     | On the simulator, from an EAS cloud build. iPhone only if there's time.            |
| 1 — Events, schema, day math, seed | done     | `AiUsage` and the AI keys moved to Phase 2, and done there.                        |
| 2 — API for the slice              | done     | All but the eval's 12 real photos (see open items).                                |
| 3 — Mobile slice                   | done     | Built and committed 2026-10-03; a hand tap-through on the simulator is still owed. |
| 4 — Social loop                    | done     | Join page, landing, feed, nudges, crew complete, reminder, safety. 2026-10-04.     |
| 5 — Closer, results, onboarding    | **next** |                                                                                    |
| 6 — Dogfood and gates              | –        |                                                                                    |

## What exists and where

**Events** (registered in Phase 1; Phase 2's routes fire `pact_created`, `pact_joined`,
`check_in_created`, `check_in_judged` and `user_activated`; the rest wait for Phases 3–4):

- `apps/web/src/lib/analytics/events.ts`: `PACT_EVENTS` (recorded server-side by the routes),
  `JOIN_PAGE_EVENTS` (the public join page, via the beacon), `SERVER_ONLY_EVENT_NAMES`.
- `apps/web/src/app/api/track/route.ts`: refuses server-only names (400 `server_only_event`);
  `join_open_app_clicked` has the `target` discriminator. Test: `route.test.mts` beside it.
- `apps/mobile/lib/analytics.ts`: the 19 pact events in the `EventName` union.

**Schema** (`apps/web/prisma/schema/`):

- `pacts.prisma`: `Pact`, `PactMember`, `CheckIn`, `Nudge`, `CheckInReport` and their enums.
- `accounts.prisma`: `Profile.aiConsentAt` and the back-relations.
- `ai.prisma`: `AiUsage` (`ai_usage`), one row per model call, designed here (see Decisions).
- Migrations `20260930004416_pact_domain`, `20260930200645_ai_usage` (generated) and their
  `_security` migrations (RLS on, all revoked from `anon` / `authenticated`).

**Day math** (`apps/web/src/lib/pacts/`, pure, no I/O):

- `day.ts`: the calendar. `todayIn`, `closesAt`, `canonicalTimeZone`, `isPactDay`,
  `pactDaysThrough`, `pactStatus`, `joinedDayFor`, `isHeldOn`, `endDayFor`, and the
  `Day` ↔ `@db.Date` helpers.
- `progress.ts`: what check-ins add up to. `todayBoard`, `chain`, `streaks`, `memberRecords`,
  `pactResult`.
- `challenges.ts`: the challenge list and `challengeFor(pactId, day)`.
- Tests: `day.test.mts`, `progress.test.mts` (run in `npm test`).

**Seed:** `apps/web/scripts/seed-demo.ts`, run with `npm run seed:demo` (root or web workspace).

**App config and device path (Phase 0):**

- `apps/mobile/app.json`: Pact, `pact://`, `com.gligorcogligorov.pact`, the camera purpose
  string, no microphone, `expo-notifications`; owner `gligorcos-team`, EAS project
  `@gligorcos-team/pact` (`62e729af-e435-45b2-9c49-50f2361ad44f`).
- `apps/mobile/app.config.ts`: `PACT_LOCAL_SIGNING=1` drops the push and Apple sign-in
  entitlements (a free Apple ID can't sign them).
- `apps/mobile/eas.json`: the `simulator` profile (dev client, `ios.simulator`, local signing).
- `apps/mobile/lib/notifications.ts`: local notifications (permission, foreground handler,
  scheduling). `apps/mobile/lib/proofPhoto.ts`: the check-in photo; on a simulator in a dev build
  it comes from the library. Settings → Developer (dev builds only): test notification and photo.
- `supabase/templates/sign-in-code.html`: the sign-in emails carry the six-digit code.

**The slice's API (Phase 2)**, all under `/api/app/v1`, each route with a `route.test.mts`:

- Contract: `packages/contract/src/v1/pacts.ts` (eight endpoints in `endpoints.ts`), `ai_consent`
  on the profile, and the error codes `pact_full`, `pact_closed`, `not_held`,
  `already_checked_in`, `saver_used`.
- `GET`/`POST pacts`, `GET pacts/:id` (the pact, its members, today's board), `GET invites/:code`,
  `POST invites/:code/join`, `POST pacts/:id/check-ins/upload`, `POST pacts/:id/check-ins`,
  `GET check-ins/:id` (the verdict poll).
- `apps/web/src/server/db/pacts.ts` (`pactStore`, with a real-database suite in `pacts.test.mts`),
  `ai-usage.ts`, and `profiles.ts`'s `hasAiConsent`.
- `apps/web/src/server/api/pact-wire.ts` (rows → wire, the board), `pact-guards.ts` (held today),
  `background.ts` (`after()`), `pact-fixtures.mts` (test rows).
- `apps/web/src/server/storage/proofs.ts`: proof photos under `<user id>/proofs/`.
- `apps/web/src/server/ai/`: `prompt.ts` (the approved prompt and the answer parser),
  `providers.ts` (the interface), `gemini.ts`, `groq.ts`, `registry.ts`, `judge.ts`, and
  `judge.eval.mts` (hand-run, see below).

**The mobile slice (Phase 3)**, in `apps/mobile`:

- `lib/pacts.ts`: TanStack Query hooks for every slice endpoint, the photo upload
  (`submitPhotoCheckIn`), the 1 s verdict poll, `useMyUserId`, date helpers.
- Screens: `(tabs)/index` (home), `pact/new`, `pact/[id]/index` (board), `pact/[id]/invite`,
  `pact/[id]/check-in` (consent → camera → preview → verdict), `join/index`, `join/[code]`.
- `components/pact/`: `PactCard`, `Avatars` (avatars, stack, `crewLine`), `Ring`, `Chain`,
  `Countdown`, `MemberRow`, `StateChip`, `WeekStrip`, `VerdictView`, `Confetti`.
- API, additive: `GET pacts` and `GET pacts/:id` both carry `progress` (chain, current and best
  streak); `GET pacts` also carries each pact's `today` board, for home's crew, ring and streak.

**The social loop (Phase 4)**:

- Web: `/join/[code]` (`app/join/[code]/`: the page, its Open Graph image, a friendly 404),
  `components/join/` (crew faces, ring, live countdown, the email-code join panel, the code box),
  `server/pacts/join-page.ts` (R27's public data only, from `pactStore.publicPage`). The landing at
  `/` is `components/pact-landing/PactLanding.tsx`, with real screens in `public/screens/`.
- Feed and reactions: `GET /feed`, `POST/DELETE /check-ins/:id/reactions/:reaction`,
  `server/db/crew-feed.ts`, table `check_in_reactions`; the Activity tab and `FeedCard`.
- Nudges: `POST /pacts/:id/nudges`, `server/ai/nudge.ts` (Groq line, safety filter, fixed
  fallback, `ai_usage` feature `nudge`), `server/db/inbox.ts`; notifications carry `pact_id`.
  The app: `lib/inbox.ts` (banners from the inbox), the Nudge pill in `MemberRow`.
- Crew complete: `server/pacts/crew-complete.ts` (after each check-in), `KeptCard` on the board.
- Reminder: `lib/reminders.ts` (22:00 pact-local, local notifications).
- Safety: `POST check-ins/:id/report`, `POST/DELETE blocks/:user`, `POST pacts/:id/leave`,
  `DELETE pacts/:id/members/:member`, `server/db/safety.ts`, table `user_blocks`; the feed's ⋯
  menu and `pact/[id]/settings`.

## Decisions made in code

- **R6, late join (decided 2026-09-30):** a lobby join is held from the start day; a join to an
  active pact is held from the **next** pact day, so a join never breaks a day in progress. A join
  on the end day would hold them to nothing: the join route must refuse it as `pact_closed`
  (`joinedDayFor(...) > endDay`). The pact's creator is not a joiner: the create route sets the
  owner's `joinedDay` to the start day.
- **`left_day`** is the day they left, the first day **not** held. Leaving never breaks today, and
  the days before still count (R7).
- **Where the spec was silent** (each pinned by a test in `progress.test.mts`):
  - A day nobody was held to is **broken**, not kept.
  - Today counts toward a member's record (days done / days held) only once they are in.
  - Today stays `open` in the chain but counts toward the streak once kept.
  - A member never held to any day (left in the lobby) has no rate and never loses; a member who
    left mid-pact keeps their record and can lose.
  - Completion rates compare exactly (cross-multiplied), so 2/3 and 4/6 tie.
  - Pact length is in calendar days for both cadences: a 7-day weekdays pact holds 5 days.
  - A check-in on a day its author was not held to counts for nothing.
- **Timezones:** a pact stores `canonicalTimeZone(...)`, ICU's spelling (an alias such as
  `America/Argentina/Buenos_Aires` becomes `America/Buenos_Aires`). `closesAt` bisects over the
  local date, so 23/25-hour days, skipped midnights and skipped dates close correctly.
- **Challenges** step through the list by a stride coprime to its length: no repeat within a cycle.
- **Events:** the route-side pact events are recorded with `dedupeDaily: false` and carry
  `pact_id` (the DB's unique constraints bound them). `user_activated` is `dedupeForever`.
- **Schema:** `Pact.owner` is `onDelete: Restrict`, so account deletion must pass the pact on first
  (R28, Phase 4). `CheckIn` references its membership `(pact_id, user_id)`, so only a member can
  have one.
- **Seed:** lives in the web workspace to reuse the day math, writes PNG placeholders (no image
  dependency), and refuses any non-local database or Supabase URL.

**Phase 0 (decided 2026-09-30):** the trial runs on the **iOS simulator**; the demo video is
recorded from it. Expo SDK 55 needs Xcode 26 (Swift 6.2) and this Mac has Xcode 16.2 on macOS
14.5, so the app is built by **EAS in the cloud** (`--profile simulator`) and runs against
localhost through Metro. Nothing else uses EAS: no EAS environment variables, no updates, no
submit. Verified: sign-in as `ana.demo@example.com` with the Mailpit code, and the test local
notification. The iPhone build stays parked (free Apple ID, iOS 18.5, and the same Xcode limit).

**AI judge on free providers (decided 2026-09-30, replaces R13's Claude Haiku and R30's
`ANTHROPIC_API_KEY`):** the judge sits behind a small provider interface. Default: Google
Gemini, a Flash model with image input, via `GEMINI_API_KEY`. Fallback: Groq, via
`GROQ_API_KEY`. With neither key set the verdict is `not_configured` (R14). Both keys are
declared in `apps/web/src/lib/env.ts` and `.env.example`, and their values are never read into
a conversation. The verdict, reason and caption, and every rule in R13–R16, are unchanged.
Only test photos go to a model.

**Groq first, Gemini second (decided 2026-10-03):** the eval on the real photos (below) had
Gemini time out or answer 503 on 7 of 11, while Groq answered each in about 1 s. Groq's
accuracy held up, so it is now the primary provider and Gemini the fallback
(`registry.ts`).

**The judge's eval (2026-10-03): 17 of 19,** above the plan's bar of 16 of 20. The 8 synthetic
fakes agree 8 of 8, and the 11 real photos (`eval-photos/real/`; the photos and their
`labels.json` stay local) agree 9 of 11. Both misses were finger counts: a peace sign lying
flat on a book page read as missing, and two fingers read as three. The AI only advises (R15),
so these are acceptable.

**The judge's models (decided 2026-10-01):** `gemini-3.8-flash`, because `gemini-2.5-flash`
is closed to new keys and Google names 3.8 Flash as its replacement; and Groq's
`qwen/qwen3.8-27b`, because Llama 4 Scout is gone from the key's model list and Qwen answered a
test image correctly. Both checked against the keys without printing them.

**The judge's behaviour (Phase 2):**

- It runs in `after()`: the check-in answers first, `pending`, and the app polls
  `GET check-ins/:id`. It never throws and never blocks; every verdict counts (R15).
- `skipped` for a saver or without AI consent (checked when the check-in is made and again
  before the photo leaves storage); `not_configured` with no key; `error` when every provider
  fails. A verdict is written once, only over `pending`.
- Each provider call writes one `ai_usage` row (provider, model, outcome, error code, tokens,
  latency). A failure, a timeout (20 s) or an answer that isn't the JSON asked for moves on to
  the next provider.
- The prompt was reviewed and approved on 2026-10-01, with four caption examples added for the
  voice. The habit is fenced as data, with angle brackets stripped.
- `user_activated` (`first_group_check_in`) fires on a person's first check-in in a pact with
  two or more active members: first-party once (`dedupeForever`) and to the Play Events API only
  if it wasn't recorded before.
- A member who left can't rejoin by code (409 `conflict`); a member joining again gets 200.

**`AiUsage` (decided 2026-09-30, a deviation from AGENTS.md's "adopt template-web's as-is"):**
`8xsocial/template-web` isn't available, so `ai_usage` is designed here: one row per call, no
prompt or answer stored, the user and check-in set to null when they are deleted. Adopt
template-web's whole if it becomes available.

**Play Stats, pulse, 8xsend (decided 2026-09-30):** 8x confirmed the trial doesn't need them.
`.mcp.json` and the setup docs for the two servers are removed; the Play Stats API code stays
untouched. Events stay registered locally and `check:events` still gates them. Where AGENTS.md,
the session brief or a skill says to ask `pulse`, skip that step for the trial. See
[no-play-stats-in-trial](memory/no-play-stats-in-trial.md).

**Phase 3 design (decided 2026-10-03, from the developer's feedback):** ref 01 is the style of
every screen: light and warm, big type, soft white cards, one green accent, photos only inside
cards, never under text. Ref 03's big thin countdown is used on the board only. The verdict is
a light page: the photo as a tilted polaroid, "Day N kept", the caption, then the streak
ticking up and the crew. Home is social first: each card shows the crew's faces with today's
checks, the ring and the streak; New pact and Join sit behind a "+".

**Phase 3 smaller calls:**

- Brand: the daylight preset, accent `#2f7d3d` with white text on its fills (decided
  2026-10-03: white on the first green, `#50a65c`, was 3.0:1 and failed AA), ground `#f8faed`,
  ink `#232323`. In dark mode the hero card is lifted a step and outlined. Font:
  Bricolage Grotesque, already bundled (Space Grotesk would need a package and web wiring and
  has no 800). The countdown uses the system font for its thin numerals.
- No clipboard: `expo-clipboard` is native; the invite uses the share sheet (it has Copy) and a
  selectable code. Pact lengths are 7/14/21/30 presets.
- Strings are inline English like the template's other screens; no screen uses i18next yet.
- AI consent "Not now" lasts the app session; those check-ins are `skipped`.
- The demo pact is "6am Run Club". The local DB's hand-made test pacts were renamed
  ("Hydration Squad", "Page Turners"); Ben and Cleo were added to Hydration Squad by hand.

## Open items

- **Reports have no admin screen:** they're stored in `check_in_reports` for an admin to read.
  Unblocking is in Settings → Blocked people.
- **The banner icon is Expo's placeholder:** crew banners and reminders show the dev client's
  icon. Pact's own app icon arrives with the next native build (`app.json`), not over the air.
- **Nudge lines** come from Groq with a word filter (bodies, weight, insults) and a fixed
  fallback; read a sample of real lines in `notifications` before a public launch.
- **Link previews** render at `/join/<code>/opengraph-image`; WhatsApp and iMessage only unfurl
  them from a public URL (the trial is localhost only).
- **The seed's photos** come from `apps/web/eval-photos/real/` (gitignored, local only); on another
  machine the demo check-ins fall back to flat placeholders.
- **Push is in-app, by design (decided 2026-10-04):** nudges and crew messages arrive as real iOS
  banners while the app is open or reopened (it reads its inbox every 15 s). Closed-app push
  needs a paid Apple Developer account and a new build; a known, deliberate limit of the trial.
- **Deep link by hand:** `pact://join/STREAK` from Safari on the simulator wasn't checked (iOS
  asks "Open in Pact?" and simctl can't tap). The rest of the slice was checked on 2026-10-03:
  a real app check-in (Ana), the real verdict screen as a modal (Cleo), the last check-in
  keeping the day (Ben, streak 0 → 1), create and join by code, and declined consent → `skipped`
  (Dan), each through the local API.
- **Proof photos are JPEG** (fixed 2026-10-03): the simulator library sent HEIC, which Groq
  refuses with a 400. Watch `ai_usage` for `http_400` from Groq on real camera photos.
- **Demo state:** `npm run seed:demo` leaves Ana out today on 6am Run Club (Ben and Cleo in),
  for a live check-in. Re-run it on the demo day: "today" is the day it runs. Hydration Squad
  and Page Turners are hand-made local pacts, not seeded.
- **Splash and status bar** are set to the new ground in `app.json`; they show from the next
  build only.
- **The 12th real photo** was never taken; the eval passed without it (see Decisions).
- **Finger counting** is the judge's weak spot (both real-photo misses). Watch for it in
  dogfooding before touching the prompt.
- **Caption repetition:** "A minimalist approach to…" opened 4 of the 8 synthetic captions. The
  synthetic images are flat drawings, which invites it; check on the real photos before tuning.
- **Gemini latency:** up to 23 s and 7 of 11 failures (503s and timeouts) on the real photos,
  which is why Groq now goes first. Watch `ai_usage` for Groq's error rate as the primary.
- **`test:db`** passes 25 of 25 on the local replay (`pact_replay`, as `supabase_admin`), the
  runtime-role suite included. Against the stack's own `postgres` database two runtime-role
  tests fail: the stack turns RLS on for `auth.users`, which CI's shim doesn't. Use the replay.

## How to run things

**The app on the simulator** (local stack running):

```bash
npm run web:dev                                    # terminal 1
cd apps/mobile && npx expo start --dev-client      # terminal 2, then press i
```

Pact must already be installed on the simulator. The first bundle takes about 40 s; if the app
says "Error loading app", tap OK and reload. The app reaches the API and Supabase at `127.0.0.1`
(simulator only), so a network change can't break it; a real phone needs the Mac's LAN address
instead (see [device-build-traps](memory/device-build-traps.md)).

**A new app build**, only after a native change (a dependency with native code, `app.json`,
`app.config.ts`):

```bash
cd apps/mobile && npx eas-cli@latest build --profile simulator --platform ios
# download the .app from the build page, then:
xcrun simctl install booted Pact.app
```

**Demo seed** (local stack running, its database migrated). Once `apps/web/.env.local` exists,
`npm run seed:demo` reads it. Until then, pass the stack's values:

```bash
eval "$(supabase status -o env | grep -E '^(API_URL|SECRET_KEY|DB_URL)=' | sed 's/^/export SB_/')"
DATABASE_URL=$SB_DB_URL SUPABASE_URL=$SB_API_URL SUPABASE_SECRET_KEY=$SB_SECRET_KEY npm run seed:demo
```

It prints the invite code (`STREAK`) and the four demo emails; their sign-in codes arrive in
Mailpit. `--timezone=<IANA>` overrides the Mac's zone. Safe to re-run.

**Migrate the stack's database** (what the app and the seed use):

```bash
export DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55322/postgres DIRECT_URL=$DATABASE_URL
npm run db:migrate
```

**Local replay** for any `*.prisma` change (generate the migration, check drift and RLS): see
[local-replay-on-supabase](memory/local-replay-on-supabase.md). It runs as `supabase_admin` in a
throwaway `pact_replay` database, then
`node scripts/generate-migration.mjs --name <name> --db-url "$DATABASE_URL"`, the hand-written
RLS migration, `prisma migrate diff --exit-code` and `npm run check:rls`.

**The slice end to end** (web server and stack running): sign in two demo accounts with their
Mailpit codes, then create → preview → join → upload → PUT → check in → poll. Done by hand on
2026-09-30 with a generated test image: every step answered as specified, `not_configured`
with no key, and the five first-party events landed.

**The judge's eval** (keys in `apps/web/.env.local`; calls the real APIs, writes nothing):

```bash
swift apps/web/scripts/eval-synthetic-photos.swift             # the 8 synthetic fakes, once
npm run eval:judge --workspace=@app/web                        # Groq, then Gemini
npm run eval:judge --workspace=@app/web -- --provider=groq     # one provider alone
```

Every folder in `apps/web/eval-photos/` (gitignored) with a `labels.json` is read. Each label:
`{ "file", "habit", "challenge", "expected": "pass" | "suspicious", "why" }`.

**Day math tests alone:**

```bash
cd apps/web && node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --conditions=react-server \
  --import ./scripts/register-ts.mjs --test src/lib/pacts/*.test.mts
```
