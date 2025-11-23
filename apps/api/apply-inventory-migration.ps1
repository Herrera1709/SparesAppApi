# Script para aplicar la migración de inventario
Write-Host "=== Aplicando Migración de Inventario ===" -ForegroundColor Cyan
Write-Host ""

# Verificar que .env existe
if (-not (Test-Path ".env")) {
    Write-Host "ERROR: Archivo .env no encontrado" -ForegroundColor Red
    exit 1
}

Write-Host "1. Sincronizando schema con la base de datos..." -ForegroundColor Yellow
npx prisma db push --accept-data-loss
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR al sincronizar schema" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "2. Regenerando cliente de Prisma..." -ForegroundColor Yellow
npx prisma generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR al regenerar cliente" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "3. Verificando estado de migraciones..." -ForegroundColor Yellow
npx prisma migrate status

Write-Host ""
Write-Host "=== ¡Migración completada! ===" -ForegroundColor Green
Write-Host "Ahora puedes reiniciar el servidor y poblar los datos de ejemplo." -ForegroundColor Green

