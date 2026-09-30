---
name: trial-local-only
description: Pact is an 8x trial run locally — no deploy, no CI, no store; free Apple ID limits
metadata:
  type: project
---

Pact is an 8x trial, not a store launch (decided 2026-09-30). 8x said: no deploy, no CI, everything
runs locally. The app runs on the developer's iPhone as a dev build signed with a **free Apple ID**.

**Why:** the trial is judged on the product loop, not on release engineering.

**How to apply:**

- Skip `store-review`, store builds, EAS submit and Vercel cron scheduling. The hourly closer is
  triggered by hand (`npm run pacts:close`).
- No CI means migrations are generated locally with `scripts/generate-migration.mjs` against a replay.
- A free Apple ID can't sign push (`aps-environment`) or Sign in with Apple, so reminders are
  local notifications and sign-in is email OTP.
- The phone reaches the API and Supabase over the Mac's LAN IP, never `127.0.0.1`.

Spec: docs/pact-requirements.md, docs/pact-plan.md. See [[pact-activation]].
