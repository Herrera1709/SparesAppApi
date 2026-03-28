import { Injectable } from '@nestjs/common';
import { ImportedProductCardDto } from './types/imported-product.types';
import { ImportedProductWithLatestPrice } from './types/imported-product-row.type';

/**
 * Normaliza filas Prisma → DTO de ficha pública (API + frontend).
 */
@Injectable()
export class ImportedProductMapper {
  toCardDto(
    row: ImportedProductWithLatestPrice,
    warnings: string[],
    alreadyImported: boolean,
  ): ImportedProductCardDto {
    const last = row.prices[0];
    return {
      id: row.id,
      source: row.source,
      sourceId: row.sourceId,
      slug: row.slug,
      title: row.title,
      brand: row.brand,
      description: row.description,
      mainImageUrl: row.mainImageUrl,
      availability: row.availability,
      sourceUrl: row.sourceUrl,
      basePriceUsd: row.basePriceUsd != null ? Number(row.basePriceUsd) : null,
      currency: row.currency,
      lastSyncedAt: row.lastSyncedAt ? row.lastSyncedAt.toISOString() : null,
      localPath: `/product/amazon/${row.sourceId}`,
      apiPath: `/api/product/amazon/${encodeURIComponent(row.sourceId)}`,
      pricing: last
        ? {
            basePriceUsd: Number(last.basePriceUsd),
            shippingUsd: Number(last.shippingUsd),
            importTaxUsd: Number(last.importTaxUsd),
            marginUsd: Number(last.marginUsd),
            finalPriceUsd: Number(last.finalPriceUsd),
            exchangeRate: Number(last.exchangeRate),
            finalPriceLocal: Number(last.finalPriceLocal),
            localCurrency: last.localCurrency,
            calculatedAt: last.calculatedAt.toISOString(),
          }
        : null,
      warnings,
      alreadyImported,
    };
  }
}
