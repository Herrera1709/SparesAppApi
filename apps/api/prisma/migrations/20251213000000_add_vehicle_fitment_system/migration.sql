-- AlterTable: Actualizar tabla products para campos de repuestos
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "partNumber" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "oemNumber" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "images" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "isUniversal" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "products_category_idx" ON "products"("category");
CREATE INDEX IF NOT EXISTS "products_brand_idx" ON "products"("brand");
CREATE INDEX IF NOT EXISTS "products_sku_idx" ON "products"("sku");
CREATE INDEX IF NOT EXISTS "products_partNumber_idx" ON "products"("partNumber");
CREATE INDEX IF NOT EXISTS "products_oemNumber_idx" ON "products"("oemNumber");

-- CreateTable: Vehículos
CREATE TABLE IF NOT EXISTS "vehicles" (
    "id" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "yearFrom" INTEGER,
    "yearTo" INTEGER,
    "bodyType" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Variantes de Vehículo
CREATE TABLE IF NOT EXISTS "vehicle_variants" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "trim" TEXT,
    "engine" TEXT,
    "transmission" TEXT,
    "driveType" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Compatibilidad de Repuestos
CREATE TABLE IF NOT EXISTS "part_fitments" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "vehicleVariantId" TEXT,
    "yearFrom" INTEGER,
    "yearTo" INTEGER,
    "position" TEXT,
    "side" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "part_fitments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "vehicles_make_idx" ON "vehicles"("make");
CREATE INDEX IF NOT EXISTS "vehicles_model_idx" ON "vehicles"("model");
CREATE INDEX IF NOT EXISTS "vehicles_make_model_idx" ON "vehicles"("make", "model");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "vehicle_variants_vehicleId_idx" ON "vehicle_variants"("vehicleId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "part_fitments_productId_idx" ON "part_fitments"("productId");
CREATE INDEX IF NOT EXISTS "part_fitments_vehicleId_idx" ON "part_fitments"("vehicleId");
CREATE INDEX IF NOT EXISTS "part_fitments_vehicleVariantId_idx" ON "part_fitments"("vehicleVariantId");
CREATE INDEX IF NOT EXISTS "part_fitments_productId_vehicleId_idx" ON "part_fitments"("productId", "vehicleId");
CREATE INDEX IF NOT EXISTS "part_fitments_productId_vehicleVariantId_idx" ON "part_fitments"("productId", "vehicleVariantId");

-- CreateUniqueConstraint
CREATE UNIQUE INDEX IF NOT EXISTS "vehicles_make_model_yearFrom_yearTo_key" ON "vehicles"("make", "model", "yearFrom", "yearTo");

-- AddForeignKey
ALTER TABLE "vehicle_variants" ADD CONSTRAINT "vehicle_variants_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_fitments" ADD CONSTRAINT "part_fitments_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_fitments" ADD CONSTRAINT "part_fitments_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_fitments" ADD CONSTRAINT "part_fitments_vehicleVariantId_fkey" FOREIGN KEY ("vehicleVariantId") REFERENCES "vehicle_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

