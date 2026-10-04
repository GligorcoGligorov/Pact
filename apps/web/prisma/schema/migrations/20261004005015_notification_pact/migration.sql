-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "pact_id" UUID;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_pact_id_fkey" FOREIGN KEY ("pact_id") REFERENCES "pacts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
