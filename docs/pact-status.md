# Pact — status

The one "where are we" file. Read it first; update it at the end of every phase.
Spec: [pact-requirements.md](pact-requirements.md) (R-numbers). Plan: [pact-plan.md](pact-plan.md).

**Last updated:** 2026-09-30, end of Phase 1, on branch `feat/phase-1-foundation` (not pushed;
there is no CI in this trial, see [trial-local-only](memory/trial-local-only.md)).

## Phases

| Phase                              | State    | Notes                                                                                 |
| ---------------------------------- | -------- | ------------------------------------------------------------------------------------- |
| 0 — Device path                    | **next** | Thu 2026-10-01 morning: device build on the iPhone (free Apple ID), OTP, local notif. |
| 1 — Events, schema, day math, seed | done     | Except `AiUsage` and `ANTHROPIC_API_KEY`, moved to Phase 2 (see open items).          |
| 2 — API for the slice              | next     | After Phase 0. Contract, `pactStore`, proofs storage, AI judge, the slice's routes.   |
| 3 — Mobile slice                   | –        | **Thursday checkpoint:** R-slice steps 1–6 on the iPhone by Thu 2026-10-01 night.     |
| 4 — Social loop                    | –        | After the Fri 2026-10-02 feedback call.                                               |
| 5 — Closer, results, onboarding    | –        |                                                                                       |
| 6 — Dogfood and gates              | –        |                                                                                       |

## What exists and where

**Events** (registered, none fired yet; `check:events` warns "never fired" until Phases 2–4):

- `apps/web/src/lib/analytics/events.ts`: `PACT_EVENTS` (recorded server-side by the routes),
  `JOIN_PAGE_EVENTS` (the public join page, via the beacon), `SERVER_ONLY_EVENT_NAMES`.
- `apps/web/src/app/api/track/route.ts`: refuses server-only names (400 `server_only_event`);
  `join_open_app_clicked` has the `target` discriminator. Test: `route.test.mts` beside it.
- `apps/mobile/lib/analytics.ts`: the 19 pact events in the `EventName` union.

**Schema** (`apps/web/prisma/schema/`):

- `pacts.prisma`: `Pact`, `PactMember`, `CheckIn`, `Nudge`, `CheckInReport` and their enums.
- `accounts.prisma`: `Profile.aiConsentAt` and the back-relations.
- Migrations `20260930004416_pact_domain` (generated) and `20260930004417_pact_domain_security`
  (RLS on, all revoked from `anon` / `authenticated`).

**Day math** (`apps/web/src/lib/pacts/`, pure, no I/O):

- `day.ts`: the calendar. `todayIn`, `closesAt`, `canonicalTimeZone`, `isPactDay`,
  `pactDaysThrough`, `pactStatus`, `joinedDayFor`, `isHeldOn`, `endDayFor`, and the
  `Day` ↔ `@db.Date` helpers.
- `progress.ts`: what check-ins add up to. `todayBoard`, `chain`, `streaks`, `memberRecords`,
  `pactResult`.
- `challenges.ts`: the challenge list and `challengeFor(pactId, day)`.
- Tests: `day.test.mts`, `progress.test.mts` (run in `npm test`).

**Seed:** `apps/web/scripts/seed-demo.ts`, run with `npm run seed:demo` (root or web workspace).

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

## Open items

- **`AiUsage` model:** the plan says to adopt it from template-web as-is, but
  `8xsocial/template-web` is private or not visible to this account. Needed before Phase 2's judge
  writes to `ai_usage`. **Parked (2026-09-30):** the developer is asking 8x in #help on
  2026-10-01 whether template-web is available. If it isn't by Phase 2, design a minimal
  `AiUsage` model here and record it below as a deviation from AGENTS.md's "adopt as-is".
- **`ANTHROPIC_API_KEY` (R30):** not yet declared in `apps/web/src/lib/env.ts` and
  `apps/web/.env.example`. Do it with Phase 2.
- **`apps/web/.env.local` does not exist yet.** Phase 0 creates it (LAN IP, Supabase keys).
- **`test:db` ran as a superuser** on the local replay, not as CI's non-superuser role.

## How to run things

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

**Day math tests alone:**

```bash
cd apps/web && node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --conditions=react-server \
  --import ./scripts/register-ts.mjs --test src/lib/pacts/*.test.mts
```
