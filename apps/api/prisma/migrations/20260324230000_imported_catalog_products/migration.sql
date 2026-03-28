-- CreateEnum
CREATE TYPE "CatalogImportSource" AS ENUM ('AMAZON');

-- CreateEnum
CREATE TYPE "CatalogAvailabilityKind" AS ENUM ('IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK', 'UNKNOWN');

-- CreateTable
CREATE TABLE "imported_catalog_products" (
    "id" TEXT NOT NULL,
    "source" "CatalogImportSource" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "brand" TEXT,
    "description" TEXT,
    "mainImageUrl" TEXT,
    "availability" TEXT,
    "availabilityKind" "CatalogAvailabilityKind" NOT NULL DEFAULT 'UNKNOWN',
    "sourceUrl" TEXT NOT NULL,
    "basePriceUsd" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "imported_catalog_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imported_product_sources" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "imported_product_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imported_product_images" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "imported_product_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imported_product_prices" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "basePriceUsd" DECIMAL(12,2) NOT NULL,
    "shippingUsd" DECIMAL(12,2) NOT NULL,
    "importTaxUsd" DECIMAL(12,2) NOT NULL,
    "marginUsd" DECIMAL(12,2) NOT NULL,
    "finalPriceUsd" DECIMAL(12,2) NOT NULL,
    "exchangeRate" DECIMAL(18,6) NOT NULL,
    "finalPriceLocal" DECIMAL(14,2) NOT NULL,
    "localCurrency" TEXT NOT NULL DEFAULT 'CRC',
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pricingConfigSnapshot" JSONB,

    CONSTRAINT "imported_product_prices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "imported_catalog_products_slug_key" ON "imported_catalog_products"("slug");

-- CreateIndex
CREATE INDEX "imported_catalog_products_title_idx" ON "imported_catalog_products"("title");

-- CreateIndex
CREATE INDEX "imported_catalog_products_source_sourceId_idx" ON "imported_catalog_products"("source", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "imported_catalog_products_source_sourceId_key" ON "imported_catalog_products"("source", "sourceId");

-- CreateIndex
CREATE INDEX "imported_product_sources_productId_idx" ON "imported_product_sources"("productId");

-- CreateIndex
CREATE INDEX "imported_product_images_productId_idx" ON "imported_product_images"("productId");

-- CreateIndex
CREATE INDEX "imported_product_prices_productId_idx" ON "imported_product_prices"("productId");

-- CreateIndex
CREATE INDEX "imported_product_prices_calculatedAt_idx" ON "imported_product_prices"("calculatedAt");

-- AddForeignKey
ALTER TABLE "imported_product_sources" ADD CONSTRAINT "imported_product_sources_productId_fkey" FOREIGN KEY ("productId") REFERENCES "imported_catalog_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imported_product_images" ADD CONSTRAINT "imported_product_images_productId_fkey" FOREIGN KEY ("productId") REFERENCES "imported_catalog_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imported_product_prices" ADD CONSTRAINT "imported_product_prices_productId_fkey" FOREIGN KEY ("productId") REFERENCES "imported_catalog_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
