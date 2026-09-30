-- CreateEnum
CREATE TYPE "pact_cadence" AS ENUM ('daily', 'weekdays');

-- CreateEnum
CREATE TYPE "pact_role" AS ENUM ('owner', 'member');

-- CreateEnum
CREATE TYPE "check_in_kind" AS ENUM ('photo', 'saver');

-- CreateEnum
CREATE TYPE "ai_verdict" AS ENUM ('pending', 'pass', 'suspicious', 'error', 'not_configured', 'skipped');

-- CreateEnum
CREATE TYPE "report_reason" AS ENUM ('fake', 'inappropriate', 'other');

-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "ai_consent_at" TIMESTAMPTZ(6);

-- CreateTable
CREATE TABLE "pacts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "habit" TEXT NOT NULL,
    "cadence" "pact_cadence" NOT NULL DEFAULT 'daily',
    "timezone" TEXT NOT NULL,
    "start_day" DATE NOT NULL,
    "end_day" DATE NOT NULL,
    "stake" TEXT,
    "invite_code" TEXT NOT NULL,
    "max_members" INTEGER NOT NULL DEFAULT 8,
    "cancelled_at" TIMESTAMPTZ(6),
    "closed_through" DATE,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pact_members" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "pact_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "pact_role" NOT NULL DEFAULT 'member',
    "joined_day" DATE NOT NULL,
    "left_at" TIMESTAMPTZ(6),
    "left_day" DATE,
    "saver_used_day" DATE,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pact_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "check_ins" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "pact_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "day" DATE NOT NULL,
    "kind" "check_in_kind" NOT NULL,
    "challenge" TEXT,
    "photo_path" TEXT,
    "photo_deleted_at" TIMESTAMPTZ(6),
    "note" TEXT,
    "verdict" "ai_verdict" NOT NULL DEFAULT 'pending',
    "ai_reason" TEXT,
    "ai_caption" TEXT,
    "judged_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "check_ins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nudges" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "pact_id" UUID NOT NULL,
    "from_user_id" UUID NOT NULL,
    "to_user_id" UUID NOT NULL,
    "day" DATE NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nudges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "check_in_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "check_in_id" UUID NOT NULL,
    "reporter_id" UUID NOT NULL,
    "reason" "report_reason" NOT NULL,
    "detail" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMPTZ(6),

    CONSTRAINT "check_in_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pacts_invite_code_key" ON "pacts"("invite_code");

-- CreateIndex
CREATE INDEX "pacts_owner_id_idx" ON "pacts"("owner_id");

-- CreateIndex
CREATE INDEX "pacts_end_day_idx" ON "pacts"("end_day");

-- CreateIndex
CREATE INDEX "pact_members_user_id_idx" ON "pact_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "pact_members_pact_id_user_id_key" ON "pact_members"("pact_id", "user_id");

-- CreateIndex
CREATE INDEX "check_ins_pact_id_day_idx" ON "check_ins"("pact_id", "day");

-- CreateIndex
CREATE INDEX "check_ins_pact_id_created_at_idx" ON "check_ins"("pact_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "check_ins_pact_id_user_id_day_key" ON "check_ins"("pact_id", "user_id", "day");

-- CreateIndex
CREATE INDEX "nudges_from_user_id_idx" ON "nudges"("from_user_id");

-- CreateIndex
CREATE INDEX "nudges_to_user_id_idx" ON "nudges"("to_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "nudges_pact_id_from_user_id_to_user_id_day_key" ON "nudges"("pact_id", "from_user_id", "to_user_id", "day");

-- CreateIndex
CREATE INDEX "check_in_reports_reporter_id_idx" ON "check_in_reports"("reporter_id");

-- CreateIndex
CREATE UNIQUE INDEX "check_in_reports_check_in_id_reporter_id_key" ON "check_in_reports"("check_in_id", "reporter_id");

-- AddForeignKey
ALTER TABLE "pacts" ADD CONSTRAINT "pacts_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pact_members" ADD CONSTRAINT "pact_members_pact_id_fkey" FOREIGN KEY ("pact_id") REFERENCES "pacts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pact_members" ADD CONSTRAINT "pact_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_pact_id_user_id_fkey" FOREIGN KEY ("pact_id", "user_id") REFERENCES "pact_members"("pact_id", "user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "nudges" ADD CONSTRAINT "nudges_pact_id_fkey" FOREIGN KEY ("pact_id") REFERENCES "pacts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "nudges" ADD CONSTRAINT "nudges_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "nudges" ADD CONSTRAINT "nudges_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "check_in_reports" ADD CONSTRAINT "check_in_reports_check_in_id_fkey" FOREIGN KEY ("check_in_id") REFERENCES "check_ins"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "check_in_reports" ADD CONSTRAINT "check_in_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
