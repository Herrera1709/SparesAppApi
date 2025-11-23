-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "emailVerificationToken" TEXT,
ADD COLUMN IF NOT EXISTS "emailVerificationTokenExpiry" TIMESTAMP(3);

-- Actualizar usuarios existentes para que tengan emailVerified = true (asumimos que ya estaban verificados)
UPDATE "users" SET "emailVerified" = true WHERE "emailVerified" IS NULL OR "emailVerified" = false;

