-- The security statement for each table the generated migration just before this one created
-- (docs/rules/migrations.md). The app reaches pacts only through /api/app/v1, as the table
-- owner, which RLS never gates. No policies, never FORCE, and nothing for the API roles that
-- Supabase's default privileges granted them.
ALTER TABLE "pacts" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "pacts" FROM anon, authenticated;

ALTER TABLE "pact_members" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "pact_members" FROM anon, authenticated;

ALTER TABLE "check_ins" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "check_ins" FROM anon, authenticated;

ALTER TABLE "nudges" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "nudges" FROM anon, authenticated;

ALTER TABLE "check_in_reports" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "check_in_reports" FROM anon, authenticated;
