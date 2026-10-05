-- AlterTable
ALTER TABLE "pacts" ADD COLUMN     "rematch_of" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "pacts_rematch_of_key" ON "pacts"("rematch_of");

-- AddForeignKey
ALTER TABLE "pacts" ADD CONSTRAINT "pacts_rematch_of_fkey" FOREIGN KEY ("rematch_of") REFERENCES "pacts"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
