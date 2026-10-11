-- AlterTable
ALTER TABLE "pact_members" ADD COLUMN     "signature" TEXT,
ADD COLUMN     "signed_at" TIMESTAMPTZ(6);
