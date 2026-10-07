-- Added to schema.prisma in 3f18ac3 without a migration. IF NOT EXISTS keeps
-- this safe on databases where the column was already added by hand/db push.
ALTER TABLE "Assignment" ADD COLUMN IF NOT EXISTS "twitch" TEXT;
