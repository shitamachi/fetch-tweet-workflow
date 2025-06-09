-- AlterTable
ALTER TABLE "UserDiff" ADD COLUMN "prevJson" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "FetchUserScreenName_screenName_key" ON "FetchUserScreenName"("screenName");
