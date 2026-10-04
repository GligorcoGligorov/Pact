-- CreateEnum
CREATE TYPE "reaction_kind" AS ENUM ('fire', 'clap', 'laugh');

-- CreateTable
CREATE TABLE "check_in_reactions" (
    "check_in_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "reaction" "reaction_kind" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "check_in_reactions_pkey" PRIMARY KEY ("check_in_id","user_id","reaction")
);

-- CreateIndex
CREATE INDEX "check_in_reactions_user_id_idx" ON "check_in_reactions"("user_id");

-- AddForeignKey
ALTER TABLE "check_in_reactions" ADD CONSTRAINT "check_in_reactions_check_in_id_fkey" FOREIGN KEY ("check_in_id") REFERENCES "check_ins"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "check_in_reactions" ADD CONSTRAINT "check_in_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
