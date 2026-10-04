-- The security statement for the table the generated migration just before this one created
-- (docs/rules/migrations.md). Only server code reads and writes `check_in_reactions`, as the
-- table owner, which RLS never gates. No policies, never FORCE, and nothing for the API roles
-- that Supabase's default privileges granted them.
ALTER TABLE "check_in_reactions" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "check_in_reactions" FROM anon, authenticated;
