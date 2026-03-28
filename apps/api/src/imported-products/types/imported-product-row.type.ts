import { ImportedCatalogProduct, ImportedProductPrice } from '@prisma/client';

/** Fila de catálogo importado con último precio calculado (para mapper / API) */
export type ImportedProductWithLatestPrice = ImportedCatalogProduct & {
  prices: ImportedProductPrice[];
};
