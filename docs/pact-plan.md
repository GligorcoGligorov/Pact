# Pact v1 — plan

Requirements: [pact-requirements.md](pact-requirements.md) (R-numbers below refer to it).
Everything runs locally. Each phase ends with its gates (`local-review`'s commands, minus CI
and store review) and a commit on a branch.

**Calendar:**

- Wed 2026-09-30: Phase 0 and the start of Phase 1.
- **Thu 2026-10-01, night: Phases 1–3 done, the slice on the iPhone.**
- Fri 2026-10-02: feedback call.
- After the call: Phases 4–7.

## Data model

A new `apps/web/prisma/schema/pacts.prisma`, plus back-relations on `Profile`. Every table
gets its RLS migration: RLS on, no policies, everything revoked from `anon` and `authenticated`.

```prisma
model Pact {
  id            String      @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  ownerId       String      @map("owner_id") @db.Uuid
  name          String
  habit         String
  cadence       PactCadence @default(daily)      // daily | weekdays
  timezone      String                           // IANA, validated, never changes
  startDay      DateTime    @map("start_day") @db.Date
  endDay        DateTime    @map("end_day") @db.Date
  stake         String?
  inviteCode    String      @unique @map("invite_code")
  maxMembers    Int         @default(8) @map("max_members")
  cancelledAt   DateTime?   @map("cancelled_at") @db.Timestamptz(6)
  closedThrough DateTime?   @map("closed_through") @db.Date  // closer bookkeeping only
  createdAt     DateTime    @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt     DateTime    @default(now()) @map("updated_at") @db.Timestamptz(6)
  @@index([endDay])
  @@map("pacts")
}

model PactMember {
  id           String    @id ... @db.Uuid
  pactId       String    @map("pact_id") @db.Uuid     // onDelete: Cascade
  userId       String    @map("user_id") @db.Uuid     // onDelete: Cascade
  role         PactRole  @default(member)             // owner | member
  joinedDay    DateTime  @map("joined_day") @db.Date  // max(join date local, startDay)
  leftAt       DateTime? @map("left_at") @db.Timestamptz(6)
  leftDay      DateTime? @map("left_day") @db.Date    // last day NOT held
  saverUsedDay DateTime? @map("saver_used_day") @db.Date  // set by a conditional update: one per pact
  createdAt    DateTime  ...
  @@unique([pactId, userId])
  @@index([userId])
  @@map("pact_members")
}

model CheckIn {
  id             String      @id ... @db.Uuid
  pactId         String      @map("pact_id") @db.Uuid
  userId         String      @map("user_id") @db.Uuid
  day            DateTime    @db.Date                 // server-computed, pact-local
  kind           CheckInKind                          // photo | saver
  challenge      String?                              // the text it was taken against
  photoPath      String?     @map("photo_path")
  photoDeletedAt DateTime?   @map("photo_deleted_at") @db.Timestamptz(6)
  note           String?
  verdict        AiVerdict   @default(pending)
  // pending | pass | suspicious | error | not_configured | skipped
  aiReason       String?     @map("ai_reason")
  aiCaption      String?     @map("ai_caption")
  judgedAt       DateTime?   @map("judged_at") @db.Timestamptz(6)
  createdAt      DateTime    ...
  @@unique([pactId, userId, day])
  @@index([pactId, createdAt])
  @@map("check_ins")
}

model Nudge {
  id, pactId, fromUserId, toUserId, day @db.Date, createdAt
  @@unique([pactId, fromUserId, toUserId, day])
  @@map("nudges")
}

model CheckInReport {
  id, checkInId (Cascade), reporterId (Cascade), reason ReportReason, detail String?,
  createdAt, resolvedAt?
  @@unique([checkInId, reporterId])
  @@map("check_in_reports")
}

// Profile gains: aiConsentAt DateTime? @map("ai_consent_at")  (R16, the person's own setting)
// AiUsage: adopted as-is from template-web (finding 6).
```

There's no `PactDay` table and no stored streak or result. The board, chain, streak and result
are pure functions of `(pact, members, check-ins, now)` (R10). The only closer-written state
is `Pact.closedThrough`, `CheckIn.photoPath` / `photoDeletedAt`, and inbox rows.

## `/api/app/v1` contract

All the shapes go in `packages/contract/src/v1/pacts.ts`, with entries in `endpoints.ts`, and
every route goes through `createAppRoute`. A pact route answers **404 to non-members**, the
same answer as a missing pact.

| Route                               | Body / query                    | Response                                                       | Errors                                                             |
| ----------------------------------- | ------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------ |
| `GET /pacts`                        | –                               | `{ pacts: PactSummary[] }`                                     |                                                                    |
| `POST /pacts`                       | `createPactInput`               | `{ pact: PactDetail }`                                         | 400 bad timezone/dates                                             |
| `GET /pacts/:id`                    | –                               | `{ pact: PactDetail }`                                         | 404                                                                |
| `POST /pacts/:id/cancel`            | –                               | `{ pact }`                                                     | 403 not owner, 409 not lobby                                       |
| `DELETE /pacts/:id/members/me`      | –                               | `{ ok }`                                                       |                                                                    |
| `DELETE /pacts/:id/members/:userId` | –                               | `{ ok }`                                                       | 403 not owner                                                      |
| `GET /invites/:code`                | –                               | `{ invite: InvitePreview }`                                    | 404                                                                |
| `POST /invites/:code/join`          | `{ source }`                    | `{ pact: PactDetail }`                                         | 404, 409 `pact_full` / `pact_closed`                               |
| `POST /pacts/:id/check-ins/upload`  | `{ content_type }`              | `{ upload }` (same shape as `/uploads`)                        | 409 `not_held`                                                     |
| `POST /pacts/:id/check-ins`         | `createCheckInInput`            | `{ check_in: CheckIn }`                                        | 409 `already_checked_in` / `saver_used` / `not_held`, 400 bad path |
| `GET /check-ins/:id`                | –                               | `{ check_in }` (the app polls this until `verdict != pending`) | 404                                                                |
| `GET /pacts/:id/feed`               | `pageQuery`                     | `{ entries: FeedEntry[], next_cursor }`                        |                                                                    |
| `POST /pacts/:id/nudges`            | `{ to_user_id }`                | `{ ok }`                                                       | 409 `already_in` / `already_nudged`                                |
| `POST /check-ins/:id/report`        | `{ reason, detail? }`           | `{ ok }`                                                       |                                                                    |
| `PATCH /profile` (existing)         | + `ai_consent: true` (optional) | + `ai_consent_at`                                              |                                                                    |

The Zod schemas:

```ts
createPactInput = z.object({
  name: z.string().trim().min(1).max(60),
  habit: z.string().trim().min(1).max(80),
  cadence: z.enum(['daily', 'weekdays']),
  timezone: z.string(),                       // validated against Intl on the server
  start_day: isoDate,
  days: z.number().int().min(7).max(90),
  stake: z.string().trim().max(80).optional()
})

createCheckInInput = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('photo'), photo_path: proofPathSchema,
             note: z.string().max(140).optional() }),
  z.object({ kind: z.literal('saver') })
])

memberState = z.enum(['in', 'saver', 'out'])
verdict = z.enum(['pending', 'pass', 'suspicious', 'error', 'not_configured', 'skipped'])

TodayBoard = { day: isoDate, challenge: string, closes_at: isoDateTime,
               in_count: int, held_count: int,
               members: { user_id, display_name, avatar_url, state: memberState,
                          check_in_id: uuid | null, nudged_by_me: boolean }[] }

PactSummary = { id, name, habit, status: 'lobby' | 'active' | 'completed' | 'cancelled',
                start_day, end_day, current_streak: int, today: TodayBoard | null }

PactDetail = PactSummary & {
  cadence, timezone, stake, invite_code, is_owner: boolean, saver_available: boolean,
  best_streak: int,
  members: { user_id, display_name, avatar_url, role, joined_day, days_done, days_held }[],
  chain: { day: isoDate, status: 'kept' | 'broken' | 'open' }[],
  result: { members: { user_id, days_done, days_held, is_loser }[], stake } | null }

CheckIn = { id, pact_id, user_id, day, kind, challenge, photo_url: string | null,
            note, verdict, ai_reason, ai_caption, created_at }

FeedEntry = { type: 'check_in', at, check_in: CheckIn }
          | { type: 'member', at, user_id, change: 'joined' | 'left' | 'removed' }
          | { type: 'day', at, day, status: 'kept' | 'broken' }

InvitePreview = { code, pact_name, habit, start_day, end_day, stake,
                  member_count, status, is_member: boolean }
```

`photo_url` is a signed URL that lasts one hour. It is `null` once the photo is deleted, and
`null` for a reporter who reported it.

## Mobile screens

| Route                       | Screen                                                                                                         | Phase |
| --------------------------- | -------------------------------------------------------------------------------------------------------------- | ----- |
| `(auth)/login`              | existing, email OTP                                                                                            | 0     |
| `(tabs)/index`              | My pacts: today card per pact                                                                                  | 3     |
| `pact/new`                  | Create                                                                                                         | 3     |
| `pact/[id]`                 | Board: countdown, members, challenge, check-in CTA, chain; feed and nudge added in 4                           | 3     |
| `pact/[id]/invite`          | Code and share sheet                                                                                           | 3     |
| `join/index`, `join/[code]` | Type a code / deep-link preview, then join                                                                     | 3     |
| `pact/[id]/check-in`        | Consent (first time), then camera, then preview + note, then submit, then "judging…", then verdict and caption | 3     |
| `check-in/[id]`             | Full photo, reason, report                                                                                     | 4     |
| `(tabs)/activity`           | Inbox (existing screen, nudge rows)                                                                            | 4     |
| `pact/[id]/settings`        | Members, saver, leave, remove, cancel                                                                          | 4     |
| `pact/[id]/result`          | Result and share card                                                                                          | 5     |
| `(onboarding)`              | Name, then Create / I have a code                                                                              | 5     |

`explore` and `detail/[id]` go when Phase 3 lands. `upgrade` stays and is left unreachable.

---

## Phase 0 — The device path (Wed)

No feature code. This phase proves findings 2 and 3 before anything depends on them.

**Files:**

- `apps/mobile/app.json`: name `Pact`, `scheme: pact`, bundle id
  `com.gligorcogligorov.pact`, camera purpose string, Android
  `CAMERA` unblocked.
- `apps/mobile/app.config.ts` (new): a local-build switch that removes `usesAppleSignIn` and
  the `aps-environment` entitlement when `PACT_LOCAL_SIGNING=1`.
- Install `expo-notifications`.
- `docs/ENV_SETUP.md`: a "Running on your iPhone" section (LAN IP for `EXPO_PUBLIC_SITE_URL`
  and `EXPO_PUBLIC_SUPABASE_URL`, `SENTRY_DISABLE_AUTO_UPLOAD=true`, personal team signing).
- `docs/memory/`: a note on the trial's constraints.

**Verify:** `npx expo run:ios --device` builds and installs on the iPhone with the free Apple
ID. Email OTP sign-in works on the phone against the Mac's Next.js and Supabase. A test local
notification scheduled 10 s out shows up.
**If signing fails:** stop and decide (Expo Go isn't an option with RevenueCat/Sentry native;
the fallback is the iOS simulator for Thursday).

## Phase 1 — Events, schema, day math, seed (Wed → Thu morning)

**Files:**

- **Events:**
  - `apps/mobile/lib/analytics.ts`: the mobile events.
  - `apps/web/src/lib/analytics/events.ts`: `PACT_EVENTS`, spread into `ALL_EVENT_NAMES`.
  - `apps/web/src/app/api/track/route.ts`: `EVENT_DISCRIMINATORS`.

  Registered through the `events` skill.

- **Schema:**
  - `apps/web/prisma/schema/pacts.prisma` (new),
  - `accounts.prisma` (back-relations, `aiConsentAt`),
  - the AI usage model from template-web.

  Migration generated locally with `scripts/generate-migration.mjs` against a replay, then
  the hand-written RLS migration for the new tables.

- `apps/web/src/lib/pacts/day.ts` (new), pure date math:
  - `todayIn(tz, now)`,
  - `isPactDay(pact, day)` (for weekdays),
  - `closesAt(tz, day)`,
  - `heldOn(member, day)`,
  - `challengeFor(pactId, day)`,
  - `chain(...)`, `streaks(...)`, `result(...)`.

  Tests in `day.test.mts`: DST in both directions, a day crossing UTC midnight, weekdays,
  late join, leave, a saver, loser ties, everyone at 100%.

- `apps/web/src/lib/pacts/challenges.ts`: about 30 prompts, each checkable in a photo.
- `scripts/seed-demo.mjs` (new) and `npm run seed:demo`: Supabase admin API users, Prisma
  rows and placeholder JPEGs, idempotent (R29).
- `apps/web/src/lib/env.ts` and `apps/web/.env.example`: `ANTHROPIC_API_KEY` (R30).

**Verify:**

- `npm test` (day math),
- `npm run check:events`, `npm run check:env`,
- the local replay: `prisma migrate diff --exit-code` shows no drift, `npm run check:rls`,
- `npm run seed:demo` twice → the same row counts.

## Phase 2 — API for the slice (Thu)

**Files:**

- `packages/contract/src/v1/pacts.ts` (new), `endpoints.ts`, `contract.test.mts`.
- `apps/web/src/server/db/pacts.ts` (new, `pactStore`): pacts, members, join with capacity in
  a transaction, check-ins, the conditional saver update.
- `apps/web/src/server/storage/proofs.ts` (new): proof upload URLs, own-path check, existence
  check, signed read URLs, removal.
- `apps/web/src/server/ai/judge.ts` (new): the Anthropic SDK with Haiku 4.5, a structured
  verdict, and `not_configured` / `error` / `skipped` (R13–R16). It writes to `ai_usage`.
  Tested with a mocked client.
- Routes under `apps/web/src/app/api/app/v1/`:
  - `pacts/route.ts`,
  - `pacts/[id]/route.ts`,
  - `invites/[code]/route.ts`,
  - `invites/[code]/join/route.ts`,
  - `pacts/[id]/check-ins/upload/route.ts`,
  - `pacts/[id]/check-ins/route.ts` (the judge runs in `after()`; `recordUserEvent`; the
    `user_activated` check),
  - `check-ins/[id]/route.ts`.

  Each has a `route.test.mts` on `app-test-kit.mts`.

- `profile` route and contract: the optional `ai_consent`.
- A short eval: `apps/web/src/server/ai/judge.eval.mts` runs about 20 labelled photos
  (a few per challenge, plus fakes such as an old photo, a screenshot or the wrong object)
  and prints the agreement rate. It only runs by hand, never in `npm test`.

**Verify:**

- route tests pass,
- curl the whole slice with a seeded user's token: create → join from a second token →
  upload → check-in → poll → verdict,
- with no key, the verdict is `not_configured`,
- the eval agrees on at least 16 of the 20 photos.

## Phase 3 — Mobile slice (Thu) → **Thursday checkpoint**

**Files:**

- `apps/mobile/lib/pacts.ts`: TanStack Query hooks over `lib/api.ts`.
- The screens marked Phase 3 in the table.
- `apps/mobile/components/pact/`: `TodayBoard`, `MemberRow`, `Chain`, `Countdown`,
  `VerdictCard`.
- The camera uses `launchCameraAsync` only, at quality 0.6.
- A deep-link handler for `pact://join/<code>`.
- `i18n` strings for every new screen.

**Verify, on the iPhone:** R-slice steps 1–6. Also sign in as a seeded demo member on the
simulator to see the board update from the other side.

## Phase 4 — Social loop (Fri after the call → Mon)

**Files:**

- **Web page first, so it helps demos soonest:**
  - `apps/web/src/app/join/[code]/page.tsx`: a Server Component on `pactStore` that shows
    only public fields, with `noindex`,
  - the `join_page_view` / `join_open_app_clicked` events.
- Routes:
  - `pacts/[id]/feed`,
  - `pacts/[id]/nudges` (writes a `team` notification),
  - `check-ins/[id]/report`,
  - `pacts/[id]/members/...`,
  - `pacts/[id]/cancel`.
- Mobile:
  - the feed on the board,
  - the nudge button,
  - inbox rows that deep-link to the pact,
  - `check-in/[id]`,
  - `pact/[id]/settings` (saver, leave, remove),
  - `apps/mobile/lib/reminders.ts`: schedules the local 22:00 reminder, cancels it on
    check-in and reschedules on foreground (R21).
- `apps/web/src/server/account/delete-account.ts`: removes the whole user folder and
  transfers ownership (R28), with a test.

**Verify:**

- `/join/<seeded code>` in a browser with and without a session; an unknown code returns 404,
- nudge the seeded member from the phone and see it in their inbox,
- schedule a reminder for "now + 1 min" in dev and see it arrive,
- report hides the photo,
- `account-deletion.test.mts` passes.

## Phase 5 — Closer, results, onboarding (Tue)

**Files:**

- `apps/web/src/app/api/cron/pacts/route.ts`: `CRON_SECRET`, idempotent through
  `closedThrough` (R26).
- `scripts/close-pacts.mjs`: `npm run pacts:close`, which calls the route with the local
  secret.
- A `--now=<iso>` override that only works when `NODE_ENV !== 'production'`, for "advance
  time" demos.
- `pact/[id]/result`.
- The share card: rendered in-app with `react-native-view-shot`, which is native, fine for a
  dev build.
- The reworked `(onboarding)`.

**Verify:**

- running `pacts:close` twice writes each notification once,
- with the seed at `--now=end+31d`, the photos are gone and `photo_url` is null,
- result tests (loser ties) pass,
- sharing the card from the phone works.

## Phase 6 — Dogfood and gates

A real 3-day pact with at least 3 people across two day boundaries, closed with `pacts:close`
each morning. Then run `local-review`'s gates: secrets, typecheck, lint, format, standards,
events, env, tests, the web build and the database gates on a replay. `check:store` runs too,
and its failures are recorded rather than fixed, because store work is out of scope.

## Risks

- **Free Apple ID signing (Phase 0).** If the build won't sign without the push or Apple
  sign-in entitlements, the Thursday demo moves to the simulator. Its camera is unavailable,
  so the demo there needs a dev-only "use a sample photo" path.
- **Thursday is tight.** Phases 1–3 fit in about 1.5 days only if Phase 0 goes cleanly. Cuts,
  in order: the seed's placeholder photos (use one image), the create form's optional fields
  (the stake), the chain view.
- **Day math is the product.** A wrong `todayIn` shows the wrong people as `out` and breaks
  streaks. The test matrix in Phase 1 comes before any route uses it.
- **AI false positives.** Mitigated by design (R15: advisory only), plus the Phase 2 eval.
  Watch `check_in_judged` by `verdict`: a high `suspicious` rate on real check-ins means the
  prompt is wrong, not the users.
- **Schema changes are hand-generated locally.** There's no CI to catch drift, so run the
  replay and `check:rls` at the end of every phase that touches `*.prisma`.
- **Photos to a third party.** Consent is enforced server-side (`aiConsentAt`), not only in
  the UI.
- **Money and entitlement:** untouched. No route in this plan writes `plan_type`, `premium_*`
  or a subscription. The Play Stats API is unchanged.
