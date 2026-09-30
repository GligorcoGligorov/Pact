---
name: trial-local-only
description: Pact is an 8x trial run locally — no deploy, no CI, no store; free Apple ID limits
metadata:
  type: project
---

Pact is an 8x trial, not a store launch (decided 2026-09-30). 8x said: no deploy, no CI, everything
runs locally. The app runs on the developer's iPhone as a dev build signed with a **free Apple ID**.

**Update 2026-09-30 (8x, #announcements):** localhost only: no Vercel, no hosted Supabase, no
Expo/EAS environments. 8x judges from a short demo video plus a live demo. The simulator is an
acceptable demo target if the device build won't run.

**Simulator only (decided 2026-09-30 evening):** Phase 0 and the Thursday slice run on the iOS
simulator; the demo video is recorded from it. The developer unplugged the iPhone because Xcode
preparing it made the Mac unusable. Check-ins on the simulator use the dev-only photo-library
fallback (`apps/mobile/lib/proofPhoto.ts`). Retry the device build only if there's time.

**EAS Build, for the binary only (decided 2026-09-30):** Expo SDK 55 can't compile on this Mac
(see [[device-build-traps]]), so the simulator app is built in the cloud with
`eas build --profile simulator --platform ios` under `gligorcos-team`. It runs against localhost
through Metro. No EAS environment variables, updates or submits: the "no Expo/EAS environments"
rule still holds for everything else.

**Why:** the trial is judged on the product loop, not on release engineering.

**How to apply:**

- Skip `store-review`, store builds, EAS submit and Vercel cron scheduling. The hourly closer is
  triggered by hand (`npm run pacts:close`).
- No CI means migrations are generated locally with `scripts/generate-migration.mjs` against a replay.
- A free Apple ID can't sign push (`aps-environment`) or Sign in with Apple, so reminders are
  local notifications and sign-in is email OTP.
- The phone reaches the API and Supabase over the Mac's LAN IP, never `127.0.0.1`.

Spec: docs/pact-requirements.md, docs/pact-plan.md. See [[pact-activation]].
