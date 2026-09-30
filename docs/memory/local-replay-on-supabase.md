---
name: local-replay-on-supabase
description: The migration replay runs on the Supabase stack's Postgres only as supabase_admin, in a throwaway database
metadata:
  type: project
---

This Mac has no standalone Postgres (no `createdb`, `initdb` or `pg_ctl`), so the local replay
in docs/rules/migrations.md runs on the Supabase stack's Postgres (port 55322) in a throwaway
database. As `postgres` it fails: `prisma/ci/supabase-shim.sql` alters `service_role`, which
only a superuser may do. Connect as the stack's superuser `supabase_admin` (password
`postgres`, the local default) instead (found 2026-09-30):

```bash
B=postgresql://supabase_admin:postgres@127.0.0.1:55322
psql "$B/postgres" -c "drop database if exists pact_replay" -c "create database pact_replay"
psql "$B/pact_replay" -v ON_ERROR_STOP=1 -q -f apps/web/prisma/ci/supabase-shim.sql
export DATABASE_URL=$B/pact_replay DIRECT_URL=$B/pact_replay
# then migrate deploy, generate-migration.mjs, migrate diff, check:rls as in the rule
```

**Why:** there is no CI in this trial ([[trial-local-only]]), so this replay is the only
drift and RLS check the schema gets.

**How to apply:** use it for every `*.prisma` change. The stack's own `postgres` database is
what the app and `npm run seed:demo` use; migrate it with `npm run db:migrate` and
`DATABASE_URL` exported as `postgres@…/postgres`. `test:db` on the replay here runs as a
superuser, not as CI's non-superuser role.
