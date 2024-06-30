/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `Division` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `Player` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[discord]` on the table `Player` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `Team` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[discord]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Assignment" ALTER COLUMN "id" SET DEFAULT gen_random_uuid(),
ALTER COLUMN "alt_tag" DROP NOT NULL,
ALTER COLUMN "scoresaber" DROP NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'REVIEW';

-- AlterTable
ALTER TABLE "Division" ALTER COLUMN "id" SET DEFAULT gen_random_uuid(),
ALTER COLUMN "min_players" DROP NOT NULL,
ALTER COLUMN "max_players" DROP NOT NULL,
ALTER COLUMN "description" DROP NOT NULL,
ALTER COLUMN "manager_role" DROP NOT NULL,
ALTER COLUMN "player_role" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Player" ALTER COLUMN "id" SET DEFAULT gen_random_uuid(),
ALTER COLUMN "status" SET DEFAULT 'AWAITING';

-- AlterTable
ALTER TABLE "Team" ALTER COLUMN "id" SET DEFAULT gen_random_uuid(),
ALTER COLUMN "locale" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "id" SET DEFAULT gen_random_uuid(),
ALTER COLUMN "avatar" DROP NOT NULL,
ALTER COLUMN "auth" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Division_name_key" ON "Division"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Player_name_key" ON "Player"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Player_discord_key" ON "Player"("discord");

-- CreateIndex
CREATE UNIQUE INDEX "Team_name_key" ON "Team"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_discord_key" ON "User"("discord");
