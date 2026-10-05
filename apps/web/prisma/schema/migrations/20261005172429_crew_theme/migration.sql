-- CreateEnum
CREATE TYPE "pact_color" AS ENUM ('coral', 'tangerine', 'sun', 'rose', 'violet', 'ocean', 'sky');

-- AlterTable
ALTER TABLE "pacts" ADD COLUMN     "color" "pact_color" NOT NULL DEFAULT 'sky',
ADD COLUMN     "emoji" TEXT NOT NULL DEFAULT '✨';
