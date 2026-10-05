---
name: restart-web-after-migration
description: After a Prisma schema change, restart `next dev`; it keeps the old client on globalThis and new selects 500
metadata:
  type: project
---

`src/server/db/client.ts` caches the PrismaClient on `globalThis` outside production, so a running
`npm run web:dev` keeps the client it started with even after `prisma generate`. A route that
selects a new field or relation then answers 500 ("Couldn't load …" in the app) until the dev
server restarts (found 2026-10-06 with `pacts.rematch_of`).

**Why:** hot reload swaps modules, not the cached client.

**How to apply:** after migrating the stack's database and regenerating, stop and restart
`web:dev`. Don't run `npm run web:build` while `web:dev` is running: both write `apps/web/.next`.
See [[local-replay-on-supabase]].
