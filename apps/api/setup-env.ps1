# Script para configurar el archivo .env
# Ejecutar: .\setup-env.ps1

Write-Host "=== Configuración de Base de Datos ===" -ForegroundColor Cyan
Write-Host ""

# Verificar si .env existe
$envPath = Join-Path $PSScriptRoot ".env"
$envRootPath = Join-Path (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent) ".env"

if (Test-Path $envPath) {
    Write-Host "Archivo .env encontrado en: $envPath" -ForegroundColor Green
    $currentContent = Get-Content $envPath -Raw
    if ($currentContent -match 'DATABASE_URL') {
        Write-Host "DATABASE_URL encontrado en el archivo." -ForegroundColor Green
        Write-Host ""
        Write-Host "Contenido actual:" -ForegroundColor Yellow
        Get-Content $envPath | Select-String "DATABASE_URL"
    } else {
        Write-Host "DATABASE_URL NO encontrado. Agregando..." -ForegroundColor Yellow
        Add-Content -Path $envPath -Value "`nDATABASE_URL=`"postgresql://usuario:password@localhost:5432/nombre_base_datos?schema=public`""
        Write-Host "DATABASE_URL agregado. Por favor edita el archivo .env con tus credenciales." -ForegroundColor Green
    }
} elseif (Test-Path $envRootPath) {
    Write-Host "Archivo .env encontrado en la raíz: $envRootPath" -ForegroundColor Green
    $currentContent = Get-Content $envRootPath -Raw
    if ($currentContent -match 'DATABASE_URL') {
        Write-Host "DATABASE_URL encontrado en el archivo." -ForegroundColor Green
        Write-Host ""
        Write-Host "Contenido actual:" -ForegroundColor Yellow
        Get-Content $envRootPath | Select-String "DATABASE_URL"
    }
} else {
    Write-Host "Archivo .env NO encontrado. Creando..." -ForegroundColor Yellow
    $envContent = @"
# Database Configuration
DATABASE_URL="postgresql://usuario:password@localhost:5432/nombre_base_datos?schema=public"
"@
    Set-Content -Path $envPath -Value $envContent
    Write-Host "Archivo .env creado en: $envPath" -ForegroundColor Green
    Write-Host "Por favor edita el archivo con tus credenciales de PostgreSQL." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Instrucciones ===" -ForegroundColor Cyan
Write-Host "1. Edita el archivo .env y configura DATABASE_URL con tus credenciales"
Write-Host "2. Ejecuta: npx prisma migrate dev --name add_inventory_models"
Write-Host "3. Ejecuta: npx prisma generate"
Write-Host "4. Reinicia el servidor: npm run start:dev"
Write-Host ""

