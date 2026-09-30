# Pact v1 — requirements

Status: approved, 2026-09-30. Plan: [pact-plan.md](pact-plan.md).

Pact is an **8x trial, run locally**: no deploy, no store submission, no CI. It runs on the
developer's iPhone (a development build signed with a free Apple ID) against the Next.js API and
the Supabase stack on the developer's Mac.

## What the codebase says (findings that shape this spec)

1. **Migrations are written by CI, and there is no CI here.** `scripts/generate-migration.mjs`
   does the same thing locally against a replayed database, so we run it by hand
   ([migrations.md](rules/migrations.md), "A local replay"). It **refuses `DROP TABLE`**, so
   deleting the template's `Item` / `Task` / `Activity` tables would need hand-written SQL.
   v1 leaves those tables alone and removes only their screens and routes (see
   [Out of scope](#out-of-scope)).
2. **A free Apple ID can't sign two things this app has turned on:** Sign in with Apple
   (`usesAppleSignIn: true` in `app.json`) and the push entitlement (`aps-environment`), which
   the `expo-notifications` config plugin adds. The local build turns off both. Sign-in is
   email OTP, which the template already has. Local scheduled notifications need the
   notifications module but not the push entitlement. **This is the riskiest assumption in the
   spec, so Phase 0 proves it first.**
3. **The phone can't reach `127.0.0.1`.** `EXPO_PUBLIC_SUPABASE_URL` defaults to
   `http://127.0.0.1:55321`, and signed storage URLs come back with that host. On the iPhone,
   the API (`EXPO_PUBLIC_SITE_URL`) and Supabase must both use the Mac's LAN address, and the
   web server must set Supabase's public URL to the same host.
4. **Proof photos can reuse the private `user-uploads` bucket** (5 MiB, JPEG/PNG/WebP/HEIC,
   no policies). They go under `<user id>/proofs/`, so no storage migration is needed. Account
   deletion today removes only `<user id>/avatar/`, so it must also remove the whole
   `<user id>/` folder.
5. **Nudges fit the existing inbox.** `Notification` already has a `team` category and a
   `GET /api/app/v1/notifications` route, and the Activity tab already reads it. A nudge is a
   `Notification` row, with no enum change.
6. **The template has no AI call.** Per AGENTS.md, adding one adopts template-web's AI usage
   rule and `ai_usage` table as-is. template-web isn't available to this play, so Pact
   designs a minimal `ai_usage` table itself (changed 2026-09-30, a recorded deviation).
7. **Events:** the mobile registry has no product events yet, just the `TODO` in
   `apps/mobile/lib/analytics.ts`. `user_activated` has not been assigned to any action.
   PostHog and Play Events are off locally (no keys), so first-party `analytics_events` is the
   sink that will actually hold data during the trial.

## Problem

People quit habits because nobody notices when they stop. Solo habit trackers let a missed
day pass in silence. Nobody sees it until the streak is already gone.

## Success criteria

- **Activation (the "aha"):** a person's **first check-in in a pact where at least one other
  member is held to the same day**. Measured by `user_activated`
  (`activation_type: 'first_group_check_in'`), emitted server-side from the check-in route.
- **Primary metric:** share of held member-days with a check-in (the pact completion rate),
  from `check_in_created` in first-party analytics.
- **Loop health:** `pact_created` → `invite_shared` → `pact_joined` (a second member) →
  `check_in_created` → a check-in on day 2 for the same person.
- **Trial demo bar:** on Friday 2026-10-02, the whole slice runs on a real iPhone (R-slice
  below), and the seeded demo pact makes every screen look lived-in.

## Requirements

### Pacts

- **R1.** A signed-in person creates a pact with:
  - a name,
  - a habit (1–80 chars),
  - a cadence (`daily` or `weekdays`),
  - a length (7–90 days),
  - a start day (today or later),
  - an optional stake (free text, ≤ 80 chars, never money).

  The pact's **timezone is the creator's device timezone** at creation, as an IANA name that
  the server validates. It never changes.

- **R2.** Every pact has a unique 6-character invite code. The alphabet leaves out ambiguous
  characters (0/O, 1/I/L). The creator becomes the pact's `owner`.
- **R3.** A pact's status comes from its dates on every read, never from a stored flag:
  - `lobby` before the start day,
  - `active` from the start day through the end day,
  - `completed` after that,
  - `cancelled` only when the owner cancels during the lobby phase.
- **R4.** A pact holds at most 8 active members.

### Joining

- **R5.** A signed-in person joins with the code, from a deep link or by typing it. Joining is
  idempotent. A full, cancelled or completed pact refuses the join with a distinct error code.
- **R6.** Late joiners are allowed. A member who joins in the lobby is **held** from the start
  day. A member who joins an active pact is held from the **next** pact-local day, so a join
  never breaks a day already in progress: a friend who joins at 23:50 can't be expected to
  check in within ten minutes. A join that would hold them to no day (on the end day) is
  refused as `pact_closed`. They stay held until the day they leave or the end day.
  (Changed 2026-09-30: held from the join day itself let a late join break the group's day.)
- **R7.** A member can leave. The owner can remove a member. Days before the member left still
  count toward their record. Neither the pact nor the member is held after that.

### The day

- **R8.** "Today" is always the server's current date in the pact's timezone. The client never
  sends a day. The day closes at local midnight. `weekdays` pacts have no Saturday or Sunday
  days.
- **R9.** Each pact-day has a **daily challenge**: a short, visible instruction such as "hold up
  three fingers" or "include something blue". It is picked deterministically from a fixed list
  by hashing the pact id and the day, so every reader sees the same one without any stored row.
  The check-in stores the challenge text it was taken against.
- **R10.** Every read of today's board, the chain and the streak is **computed from check-ins
  and membership**, never only from anything the closer wrote. Reads give the right answer
  even if the closer has never run.

### Check-ins

- **R11.** A held member checks in once per pact-day, for today only, while the pact is
  active. The database enforces one row per pact, person and day.
- **R12.** A photo check-in is taken with the **in-app camera only** (no library picker). The
  device uploads it to a signed URL under its own `<user id>/proofs/` folder. The server
  accepts only a path in that folder that exists in storage.
- **R13.** After a check-in is created, it is judged asynchronously. The server downloads the
  photo from storage (never from the request body) and asks a vision model, behind a small
  provider interface, for three things, as structured output: Google Gemini (a Flash model)
  by default, Groq as the fallback (changed 2026-09-30 from Claude Haiku 4.5, to use free
  providers; the models are in docs/pact-status.md):
  - `verdict`: `pass` or `suspicious`, judged on the habit and the challenge,
  - `reason`: one sentence,
  - `caption`: a one-line deadpan comment.
- **R14.** When the AI call fails, the verdict is `error`. When neither `GEMINI_API_KEY` nor
  `GROQ_API_KEY` is set, the verdict is `not_configured` and the app shows "AI judge not configured". Nothing throws.
- **R15.** Every verdict counts as a check-in. **The AI advises; it never fails anyone.** A
  `suspicious` check-in shows its flag and the AI's reason to the whole group.
- **R16.** The first time a person checks in, the app asks for consent before the photo is
  sent to the AI provider. That person's check-ins are never judged without consent: their
  verdict is `skipped`.
- **R17.** Each member has **one streak saver per pact**. It is a check-in with no photo that
  keeps the day, and the group sees it (`kind: saver`). A second saver in the same pact is
  refused, even from concurrent requests.

### Board, streak and chain

- **R18.** Today's board shows:
  - each held member's state (`in`, `saver` or `out`),
  - the challenge,
  - `closes_at` (the next local midnight),
  - how many members are in, out of how many are held.
- **R19.** A pact-day is **kept** when every member held that day checked in, and **broken**
  otherwise. Today stays **open** until it closes. The chain is every day from the start to
  today. The current streak counts consecutive kept days back from yesterday, plus today if
  it's already kept. The best streak is the longest run.

### Nudges and reminders

- **R20.** A member can nudge a held member who is still `out` today, once per pair per day.
  A nudge writes a `team` notification to the recipient's inbox.
- **R21.** The app schedules a **local** notification at 22:00 pact-local time ("2h left") for
  each active pact the person hasn't checked into today. It cancels it after they check in and
  re-schedules on every app foreground. There are no remote push notifications in v1.

### Feed, safety, results

- **R22.** A pact's feed pages through, newest first: check-ins (with a short-lived signed
  photo URL, the verdict, the reason and the caption), joins and leaves, and closed days.
  Only members can read it.
- **R23.** A member can report a check-in (`fake`, `inappropriate` or `other`). Reports are
  stored for an admin, and the reporter stops seeing that photo.
- **R24.** When a pact completes, the result shows each member's days done out of days held,
  the best streak and the stake. The **loser** is whoever has the lowest completion rate, and
  everyone tied at the lowest rate loses together. If everyone is at 100%, nobody loses. The
  result is computed on read.
- **R25.** A shareable result card: an image of the chain, the members and the loser, shared
  through the system share sheet.

### Closer (idempotent, dev-triggered)

- **R26.** `POST /api/cron/pacts` is protected by the `CRON_SECRET` bearer and is safe to run
  any number of times. Each pact records `closed_through` (a date) so each step happens once.
  For every pact-day that has ended since its `closed_through`, it:
  - writes the "day kept / broken" inbox notifications,
  - writes the "pact finished" notification when the pact completes.

  It also deletes proof photos **30 days after a pact's end day**, setting `photo_path` to null
  and `photo_deleted_at`. `npm run pacts:close` triggers it locally.

### Web

- **R27.** `/join/[code]` on the Next.js site is public and server-rendered. It shows:
  - the pact name, habit, dates and stake,
  - member display names and avatars,
  - today's progress (x of y in, and the chain).

  It has an **Open in app** button (`pact://join/<code>`) and shows the code for typing.
  It never shows photos, verdicts or anything beyond this list. An unknown code returns a
  404 page.

### Account, data, demo

- **R28.** Deleting an account deletes that person's check-ins, memberships and nudges, and
  their whole storage folder. A pact the person owned passes to its earliest-joined remaining
  member, or is deleted if nobody is left.
- **R29.** `npm run seed:demo` is idempotent. It creates:
  - 4 demo accounts,
  - one active pact (started 7 days ago) with a week of check-ins, including one `suspicious`
    check-in, one saver and one broken day,
  - placeholder proof photos in storage.

  It prints the invite code so the developer's real account can join from the phone.

- **R30.** `GEMINI_API_KEY` and `GROQ_API_KEY` are declared in the web env schema and
  `.env.example` (`check:env`), and are optional (changed 2026-09-30 from `ANTHROPIC_API_KEY`).

### The Thursday slice (R-slice)

Working on the iPhone by Thursday night, 2026-10-01:

1. Sign in (email OTP).
2. Create a pact.
3. Join it by code from a second account: a seeded demo account signed in on the iOS
   simulator.
4. Camera check-in against the daily challenge.
5. AI verdict and caption.
6. Today's board.

It covers R1–R3, R5, R6, R8–R16 and R18. Everything else comes after.

## Events

`EVENT_DISCRIMINATORS` lists the discriminators. The `events` skill registers each event
before the phase that fires it.

**Mobile** (`EventName` in `apps/mobile/lib/analytics.ts`, sent to PostHog through `track()`).
Screen views use the existing `screen_viewed`.

| Event                               | Metadata (discriminator in **bold**)                                      | Why                              |
| ----------------------------------- | ------------------------------------------------------------------------- | -------------------------------- |
| `pact_create_started`               | –                                                                         | create funnel start              |
| `pact_created`                      | `cadence`, `days`, `has_stake`                                            | create funnel end                |
| `invite_shared`                     | **`method`**: `share_sheet` \| `copy_code`                                | the growth loop                  |
| `join_viewed`                       | **`source`**: `deep_link` \| `code`                                       | join funnel start                |
| `pact_joined`                       | **`source`**                                                              | join funnel end                  |
| `join_failed`                       | **`reason`**: `not_found` \| `full` \| `closed` \| `network`              | join drop-off                    |
| `check_in_started`                  | –                                                                         | check-in funnel start            |
| `ai_consent_answered`               | **`granted`**: boolean                                                    | consent drop-off                 |
| `check_in_photo_taken`              | –                                                                         | camera drop-off                  |
| `check_in_submitted`                | **`kind`**: `photo` \| `saver`                                            | funnel end                       |
| `check_in_failed`                   | **`reason`**: `upload` \| `already_checked_in` \| `not_held` \| `network` | failures                         |
| `check_in_verdict_viewed`           | **`verdict`**                                                             | did the "wow" land               |
| `nudge_sent`                        | –                                                                         | social pressure                  |
| `reminder_opened`                   | –                                                                         | whether the local reminder works |
| `check_in_reported`                 | **`reason`**                                                              | safety                           |
| `pact_left` / `pact_member_removed` | –                                                                         | churn inside a pact              |
| `pact_result_viewed`                | –                                                                         | end of loop                      |
| `pact_result_shared`                | –                                                                         | growth                           |

**Web registry** (`apps/web/src/lib/analytics/events.ts`), a new `PACT_EVENTS` group. These
are written first-party through `recordUserEvent` from the routes, because the device can't
write first-party. They feed retention cohorts and the admin segments:

| Event                   | Metadata                             | Fired by                                 |
| ----------------------- | ------------------------------------ | ---------------------------------------- |
| `pact_created`          | `cadence`                            | `POST /pacts`                            |
| `pact_joined`           | **`source`**                         | `POST /invites/:code/join`               |
| `check_in_created`      | **`kind`**                           | `POST /pacts/:id/check-ins`              |
| `check_in_judged`       | **`verdict`**                        | the AI judge                             |
| `nudge_sent`            | –                                    | `POST /pacts/:id/nudges`                 |
| `join_page_view`        | –                                    | `/join/[code]`, guest, through `gaEvent` |
| `join_open_app_clicked` | **`target`**: `app` \| `code_copied` | `/join/[code]`                           |

**Lifecycle:** `user_activated` (`activation_type: 'first_group_check_in'`), emitted once per
person, first-party and to the Play Events API (which does nothing locally without a key).
No money moments, since v1 has no payments.

## Out of scope

- Remote push, APNs, store builds, store submission, `store-review`, deploys, CI, cron
  scheduling.
- Payments, real-money stakes, the paywall (`upgrade` screen stays unreachable), premium.
- Public discovery, chat, comments, reactions, group voting on `suspicious`.
- Cadences other than daily and weekdays. Per-member timezones.
- Dropping the template's `items`, `tasks` and `activity_feed` tables (their screens and routes
  go; the tables stay until a hand-written migration is worth it).
- Universal links / deferred deep links (the web page links to the custom scheme and shows
  the code).
- The Play Stats API and the `pulse` / `8xsend` MCP servers: 8x confirmed in #help that the
  trial doesn't need them (2026-09-30). The servers are removed; the API's code stays as is.

## Decisions

Recorded 2026-09-30.

1. **Supabase for the phone:** the local stack, reached on the Mac's LAN IP. Nothing is hosted.
2. **Second account:** the iOS simulator, signed in as a seeded demo member, for the Thursday
   slice. A friend with an iPhone joins for the Phase 6 multi-day test if one is available.
   The seed script covers the demo data.
3. **Names:** app name `Pact`, scheme `pact`, bundle identifier `com.gligorcogligorov.pact`
   (iOS and Android).

## Open questions

None open.
