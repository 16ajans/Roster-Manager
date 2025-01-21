/*
  Warnings:

  - The `paid` column on the `Team` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Team" DROP COLUMN "paid",
ADD COLUMN     "paid" "State" NOT NULL DEFAULT 'AWAITING';
