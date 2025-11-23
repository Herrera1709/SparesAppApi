-- ============================================
-- MIGRACIÓN: Agregar campos de verificación de email
-- ============================================
-- Ejecuta este script en tu base de datos PostgreSQL
-- Puedes usar psql, pgAdmin, o cualquier cliente de PostgreSQL

-- Agregar columnas si no existen
ALTER TABLE "users" 
ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "emailVerificationToken" TEXT,
ADD COLUMN IF NOT EXISTS "emailVerificationTokenExpiry" TIMESTAMP(3);

-- Actualizar usuarios existentes (asumimos que ya estaban verificados)
UPDATE "users" 
SET "emailVerified" = true 
WHERE "emailVerified" IS NULL OR "emailVerified" = false;

-- Verificar que las columnas se agregaron correctamente
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users' 
AND column_name IN ('emailVerified', 'emailVerificationToken', 'emailVerificationTokenExpiry');

