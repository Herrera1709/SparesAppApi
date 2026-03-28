import { CatalogImportSource } from '@prisma/client';

/** Respuesta enriquecida para API y frontend */
export interface ImportedProductCardDto {
  id: string;
  source: CatalogImportSource;
  sourceId: string;
  slug: string;
  title: string;
  brand: string | null;
  description: string | null;
  mainImageUrl: string | null;
  availability: string | null;
  sourceUrl: string;
  basePriceUsd: number | null;
  currency: string;
  lastSyncedAt: string | null;
  /** Ruta en el SPA (no incluye dominio) */
  localPath: string;
  /** GET JSON de esta ficha bajo el prefijo /api */
  apiPath: string;
  pricing: {
    basePriceUsd: number;
    shippingUsd: number;
    importTaxUsd: number;
    marginUsd: number;
    finalPriceUsd: number;
    exchangeRate: number;
    finalPriceLocal: number;
    localCurrency: string;
    calculatedAt: string;
  } | null;
  warnings: string[];
  /** true si el registro ya existía en BD antes de esta operación */
  alreadyImported: boolean;
}

export type HybridSearchMode = 'amazon_imported' | 'local_catalog';

export interface HybridSearchResponse {
  mode: HybridSearchMode;
  query: string;
  /** Relleno si mode === amazon_imported */
  product?: ImportedProductCardDto;
  /** Relleno si mode === local_catalog */
  results?: ImportedProductCardDto[];
}
