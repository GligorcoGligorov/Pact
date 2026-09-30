-- The security statement for the table the generated migration just before this one created
-- (docs/rules/migrations.md). Only server code writes `ai_usage`, as the table owner, which RLS
-- never gates. No policies, never FORCE, and nothing for the API roles that Supabase's default
-- privileges granted them.
ALTER TABLE "ai_usage" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "ai_usage" FROM anon, authenticated;
