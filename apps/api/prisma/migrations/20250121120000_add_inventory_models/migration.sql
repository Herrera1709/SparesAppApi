-- CreateEnum
CREATE TYPE "InventoryMovementType" AS ENUM ('IN', 'OUT', 'ADJUSTMENT', 'TRANSFER', 'RETURN', 'DAMAGED', 'EXPIRED');

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "brand" TEXT,
    "price" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "cost" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "imageUrl" TEXT,
    "barcode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "minQuantity" INTEGER NOT NULL DEFAULT 0,
    "maxQuantity" INTEGER,
    "location" TEXT,
    "warehouse" TEXT,
    "reservedQuantity" INTEGER NOT NULL DEFAULT 0,
    "lastRestockedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_movements" (
    "id" TEXT NOT NULL,
    "inventoryId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" "InventoryMovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" TEXT,
    "referenceId" TEXT,
    "referenceType" TEXT,
    "performedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_productId_location_warehouse_key" ON "inventory"("productId", "location", "warehouse");

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "inventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_performedBy_fkey" FOREIGN KEY ("performedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

