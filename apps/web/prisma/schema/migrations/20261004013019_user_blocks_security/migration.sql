-- The security statement for the table the generated migration just before this one created
-- (docs/rules/migrations.md). Only server code reads and writes `user_blocks`, as the table
-- owner, which RLS never gates. No policies, never FORCE, and nothing for the API roles that
-- Supabase's default privileges granted them.
ALTER TABLE "user_blocks" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "user_blocks" FROM anon, authenticated;
