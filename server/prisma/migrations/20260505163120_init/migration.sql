/*
  Warnings:

  - You are about to drop the column `accountId` on the `refresh_tokens` table. All the data in the column will be lost.
  - You are about to drop the `tokens` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `userId` to the `refresh_tokens` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "refresh_tokens" DROP CONSTRAINT "refresh_tokens_accountId_fkey";

-- AlterTable
ALTER TABLE "refresh_tokens" DROP COLUMN "accountId",
ADD COLUMN     "userId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "platforms" DROP DEFAULT;

-- DropTable
DROP TABLE "tokens";

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
