import { Injectable } from '@nestjs/common';
import { CatalogImportSource, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ImportedProductWithLatestPrice } from '../types/imported-product-row.type';

const latestPriceInclude = {
  prices: { orderBy: { calculatedAt: 'desc' as const }, take: 1 },
} satisfies Prisma.ImportedCatalogProductInclude;

/**
 * Acceso a datos del catálogo importado (tablas imported_catalog_products, precios, etc.).
 * Equivale conceptualmente a "products" + fuentes/imágenes/precios del dominio Tiendamia-like.
 */
@Injectable()
export class ImportedCatalogRepository {
  constructor(private readonly prisma: PrismaService) {}

  findBySourceAndSourceIdWithLatestPrice(
    source: CatalogImportSource,
    sourceId: string,
  ): Promise<ImportedProductWithLatestPrice | null> {
    return this.prisma.importedCatalogProduct.findUnique({
      where: { source_sourceId: { source, sourceId } },
      include: latestPriceInclude,
    }) as Promise<ImportedProductWithLatestPrice | null>;
  }

  findByIdWithLatestPrice(id: string): Promise<ImportedProductWithLatestPrice | null> {
    return this.prisma.importedCatalogProduct.findUnique({
      where: { id },
      include: latestPriceInclude,
    }) as Promise<ImportedProductWithLatestPrice | null>;
  }

  searchByText(query: string, take: number): Promise<ImportedProductWithLatestPrice[]> {
    const q = query.trim();
    if (!q) return Promise.resolve([]);
    return this.prisma.importedCatalogProduct.findMany({
      where: {
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { brand: { contains: q, mode: 'insensitive' } },
          { sourceId: { equals: q.toUpperCase(), mode: 'insensitive' } },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      take,
      include: latestPriceInclude,
    }) as Promise<ImportedProductWithLatestPrice[]>;
  }
}
