# Pact

A habit app for small crews of friends: one habit, a daily photo check-in, and a stake for whoever slips.

**Nobody notices when you quit. Your friends will.**

Pact is a habit app for a small crew. You and up to seven friends pick one habit, a fixed run of
days and a stake ("loser buys the coffees"). Every day each of you checks in with a photo that
shows the habit and that day's challenge, so it can't be an old photo. An AI takes a look,
flags anything odd and adds a one-liner, but it only advises and never fails anyone. A day only
counts when everyone is in: miss one and the chain breaks for the whole crew. At the end,
Pact reveals the results, hands out awards and names who pays.

Built during the 8x Playmakers C1 trial (2-week build).

## Features

- **Crews of up to eight**, joined with an invite code or a `/join/[code]` link.
- **Daily photo check-ins** with that day's challenge, so an old photo won't pass.
- **An AI judge** (Groq, with Gemini as fallback) that flags odd photos and never fails anyone.
- **Shared chains:** a day counts only when the whole crew is in.
- **Nudges, crew messages and an activity feed** inside the app.
- **Results with awards and the loser named**, on a public web page with a share card and link
  previews.
- **A marketing site** with the landing, join and results pages, in light and dark.

## Tech stack

- **Mobile:** Expo SDK 55, React Native 0.83, expo-router, NativeWind, TanStack Query, i18next
- **Web and API:** Next.js 15 (App Router), React 19, Tailwind, Prisma 6
- **Backend:** Supabase (Auth and Postgres)
- **Shared:** a Zod contract (`packages/contract`) and brand tokens (`packages/brand`) used by
  both apps
- **AI:** Groq, with Gemini as the fallback
- **Analytics and errors:** PostHog, first-party events, Sentry on mobile
- **Tooling:** npm workspaces, Node 22, TypeScript, Jest, ESLint, Prettier, gitleaks

## Screenshots / Demo

- **Demo video:** _coming soon_ <!-- add the link here -->
- **Live site:** _coming soon_ <!-- add the URL here -->

### The app

|                                                                         |                                                                |                                                                     |
| ----------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------- |
| ![Intro](docs/design/ui-revamp/shots/12-intro-after-1.png)              | ![Home](docs/design/ui-revamp/shots/02-home-after.png)         | ![Board](docs/design/ui-revamp/shots/01-board-after.png)            |
| ![Check-in kept](docs/design/ui-revamp/shots/03-verdict-after-kept.png) | ![Activity](docs/design/ui-revamp/shots/13-activity-after.png) | ![Results](docs/design/ui-revamp/shots/04-results-after-reveal.png) |

### The website

![Landing: the crew wall](docs/design/web-revamp/shots/01-hero-1440.jpg)

|                                                                     |                                                                                      |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| ![How it works](docs/design/web-revamp/shots/03-how-step1-1440.jpg) | ![Your turn: sign a pact](docs/design/web-revamp/shots/04-your-turn-signed-1440.jpg) |
| ![Join a pact](docs/design/web-revamp/shots/07-join-1440.jpg)       | ![Results as stories](docs/design/web-revamp/shots/08-results-1-1440.jpg)            |

Every shot, with before and after: [docs/design/ui-revamp/](docs/design/ui-revamp/plan.md)
(the app) and [docs/design/web-revamp/](docs/design/web-revamp/plan.md) (the website).

## Run it in 5 commands

You need Node 22.18+, Docker, the Supabase CLI, Xcode's iOS simulator, and Pact's simulator
build installed on it (`npx eas-cli build --profile simulator --platform ios`, then
`xcrun simctl install booted Pact.app`). Create `apps/web/.env.local` and `apps/mobile/.env.local`
from their `.env.example` files, using the values `supabase status` prints. The AI keys
(`GROQ_API_KEY`, `GEMINI_API_KEY`) are optional: without them the verdict is `not_configured`.

```bash
npm install
supabase start
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55322/postgres DIRECT_URL=postgresql://postgres:postgres@127.0.0.1:55322/postgres npm run db:migrate
npm run demo:reset     # clean, seed "6am Run Club" (live) + "Sunrise Yoga" (finished), close days
npm run web:dev & (cd apps/mobile && npx expo start --dev-client)   # then press i
```

Sign in as `ana.demo@example.com` (or `ben`, `cleo`, `dan`); the code arrives in Mailpit at
<http://127.0.0.1:55324>. Ana is not in yet today on 6am Run Club, ready for a live check-in, and
Sunrise Yoga's results are waiting. Re-run `npm run demo:reset` on the demo day: "today" is the
day it runs. More (the closer, the judge's eval, a new build): [docs/pact-status.md](docs/pact-status.md#how-to-run-things).

## Architecture

```
 apps/mobile (Expo, iOS simulator) ──sign-in only──────────────▶ Supabase Auth (email code)
        │
        └─HTTPS, bearer token─▶ apps/web /api/app/v1/* (Next.js) ──Prisma──▶ Postgres
                                   │   pacts, check-ins, nudges, feed, results, saver
                                   ├─ after(): the AI judge ─▶ Groq, then Gemini (fallback)
                                   ├─ /join/[code], /results/[pact]   public pages + OG images
                                   ├─ /results/[pact]/card            the share card (next/og PNG)
                                   └─ the closer (cron route, or npm run pacts:close)
                                         closes days, breaks or keeps chains, finishes pacts,
                                         writes the in-app inbox
```

- **One data path.** The app never talks to tables: every read and write goes through
  `/api/app/v1`, validated on both sides by the Zod contract in `packages/contract`. Supabase is
  for identity only; the server verifies the token and never trusts a user id from the app.
- **Day math lives on the server** (`apps/web/src/lib/pacts/`): pact days in the pact's own time
  zone (DST-safe), who was held to which day, chains, streaks, records and the loser, all
  pinned by tests.
- **The judge never blocks.** A check-in answers at once as `pending`; the verdict is written
  in the background and the app polls for it.
- **Analytics** are registered before the feature: 62 mobile events and 41 web events, checked
  by `npm run check:events`.

This repo started from the 8x mobile monorepo template; [AGENTS.md](AGENTS.md) and
[docs/rules/](docs/rules/) are the engineering rules it follows.

## Decisions

- **The AI advises, the crew decides.** A flagged photo still counts; the crew sees the flag and
  can report it. Wrongly failing someone would hurt a crew more than letting one fake through.
- **Free AI providers.** Groq goes first and Gemini is the fallback, behind a small provider
  interface. Groq was fast and accurate on the eval (17 of 19 agreed); Gemini timed out or
  answered 503 on 7 of 11 real photos.
- **A late join never breaks a day in progress.** Joining an active pact holds you from the next
  day; leaving never breaks today, and the days before still count.
- **Ties: nobody pays.** When the whole crew ties, everybody wins; a partial tie at the bottom
  splits the stake.
- **Share without a native module.** The server draws the share card and the app shares the
  PNG, so the feature shipped without a new store build.
- **The results page is public by link**, for finished pacts only: names, records, awards and
  the stake, never photos or captions.
- **Push is in-app.** Nudges and crew messages arrive as iOS banners while the app is open (it
  reads its inbox every 15 s). Closed-app push needs a paid Apple Developer account and a new
  build.

## Limits

- **Simulator only.** Expo SDK 55 needs Xcode 26 and this Mac has 16.2, so the app is built by
  EAS in the cloud for the simulator; no device build, no TestFlight, no OTA channel in use.
- **Local only.** No deployment: link previews unfurl only from a public URL, and the cron runs
  by hand (`npm run pacts:close`).
- **The judge is weakest at counting fingers** (both of its real-photo misses).
- **Not tapped through by hand:** the drumroll, a real saver use and a rematch tap are covered
  by route and database tests, but nobody has tapped them in the simulator yet.
- **No admin screen for reports** (they are stored in `check_in_reports`), and the banner icon
  is Expo's placeholder until the next native build.
- **The demo's photos** come from a local, gitignored folder; on another machine the seeded
  check-ins show flat placeholders.

Full status, every decision and open item: [docs/pact-status.md](docs/pact-status.md).
