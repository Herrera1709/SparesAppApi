# Solución para Errores de Prisma - emailVerified

## Problema
El cliente de Prisma no se ha regenerado después de actualizar el schema, causando errores de TypeScript que indican que los campos `emailVerified`, `emailVerificationToken`, y `emailVerificationTokenExpiry` no existen.

## Solución Paso a Paso

### Paso 1: Detener el Servidor de NestJS
En la terminal donde está corriendo el servidor, presiona `Ctrl+C` para detenerlo.

### Paso 2: Aplicar la Migración SQL a la Base de Datos

Conéctate a tu base de datos PostgreSQL y ejecuta:

```sql
-- Agregar columnas si no existen
ALTER TABLE "users" 
ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "emailVerificationToken" TEXT,
ADD COLUMN IF NOT EXISTS "emailVerificationTokenExpiry" TIMESTAMP(3);

-- Actualizar usuarios existentes (asumimos que ya estaban verificados)
UPDATE "users" 
SET "emailVerified" = true 
WHERE "emailVerified" IS NULL OR "emailVerified" = false;
```

**O usando psql desde la terminal:**
```bash
psql -U tu_usuario -d spares_app -f apps/api/prisma/migrations/20250122000000_add_email_verification/migration.sql
```

### Paso 3: Regenerar el Cliente de Prisma

```bash
cd apps/api
npx prisma generate
```

Esto regenerará los tipos TypeScript con los nuevos campos.

### Paso 4: Marcar la Migración como Aplicada (Opcional)

Si ejecutaste el SQL manualmente, marca la migración como aplicada:

```bash
cd apps/api
npx prisma migrate resolve --applied 20250122000000_add_email_verification
```

### Paso 5: Reiniciar el Servidor

```bash
npm run start:dev
```

## Verificación

Después de estos pasos, los errores de TypeScript deberían desaparecer y el servidor debería compilar correctamente.

## Nota Importante

Si el servidor sigue corriendo cuando intentas regenerar Prisma, obtendrás un error `EPERM` porque el archivo está en uso. **Siempre detén el servidor antes de regenerar Prisma.**

