# Instrucciones para Aplicar la Migración de Verificación de Email

## Problema Identificado
El campo `emailVerified` no existe en la base de datos, por lo que los usuarios pueden iniciar sesión sin verificar su email.

## Solución Implementada

### 1. Schema de Prisma Actualizado
El schema ya incluye los campos necesarios:
- `emailVerified` (Boolean, default: false)
- `emailVerificationToken` (String, opcional)
- `emailVerificationTokenExpiry` (DateTime, opcional)

### 2. Migración Creada
Se creó el archivo de migración en:
`prisma/migrations/20250122000000_add_email_verification/migration.sql`

### 3. Opciones para Aplicar la Migración

#### Opción A: Ejecutar SQL Directamente (Recomendado)
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

#### Opción B: Usar Prisma DB Push (Sin crear migración)
```bash
cd apps/api
npx prisma db push
```

#### Opción C: Marcar la migración como aplicada
Si ejecutaste el SQL manualmente:
```bash
cd apps/api
npx prisma migrate resolve --applied 20250122000000_add_email_verification
```

## Verificaciones Realizadas

### Backend
✅ El método `login` ahora incluye `emailVerified` en el `select`
✅ Verifica explícitamente que `emailVerified` sea `true` antes de permitir login
✅ Maneja casos donde el campo es `null` o `undefined`

### Frontend
✅ El componente de login detecta errores de verificación
✅ Muestra opción para reenviar correo de verificación
✅ Mensajes de error claros para el usuario

## Pruebas Recomendadas

1. **Crear un nuevo usuario**: Debe recibir correo de verificación
2. **Intentar login sin verificar**: Debe mostrar error y opción de reenvío
3. **Verificar email**: Debe permitir login después de verificación
4. **Usuarios existentes**: Deben poder iniciar sesión (se marcaron como verificados)

## Notas Importantes

- Los usuarios existentes se marcan como `emailVerified = true` para no bloquearlos
- Los nuevos usuarios deben verificar su email antes de poder iniciar sesión
- El token de verificación expira en 24 horas

