/*
  Warnings:

  - Made the column `alt_tag` on table `Assignment` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Assignment" ALTER COLUMN "alt_tag" SET NOT NULL;
