import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CatalogImportSource, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AmazonPaapiClient } from './amazon-paapi.client';
import { ImportPricingEngine } from '../import-pricing.engine';
import { mapAmazonAvailabilityText } from './availability.mapper';
import { buildAmazonDetailUrl } from '../utils/amazon-url.utils';
import { ImportedProductCardDto } from '../types/imported-product.types';
import { ImportedCatalogRepository } from '../repositories/imported-catalog.repository';
import { ImportedProductMapper } from '../imported-product.mapper';
import { Decimal } from '@prisma/client/runtime/library';

export interface ImportByAsinOptions {
  pastedUrl?: string;
  forceRefresh?: boolean;
}

@Injectable()
export class AmazonProductImporter {
  private readonly logger = new Logger(AmazonProductImporter.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly catalogRepository: ImportedCatalogRepository,
    private readonly paapi: AmazonPaapiClient,
    private readonly pricing: ImportPricingEngine,
    private readonly config: ConfigService,
    private readonly mapper: ImportedProductMapper,
  ) {}

  async importFromAsin(asin: string, options?: ImportByAsinOptions): Promise<ImportedProductCardDto> {
    const normalized = asin.trim().toUpperCase();
    if (!/^[A-Z0-9]{10}$/.test(normalized)) {
      throw new BadRequestException('ASIN inválido.');
    }

    if (!this.paapi.isConfigured()) {
      throw new ServiceUnavailableException(
        'Amazon Product Advertising API no está configurada en el servidor.',
      );
    }

    const existing = await this.catalogRepository.findBySourceAndSourceIdWithLatestPrice(
      CatalogImportSource.AMAZON,
      normalized,
    );

    const ttlMs = this.syncTtlMs();
    const fresh =
      existing?.lastSyncedAt && Date.now() - existing.lastSyncedAt.getTime() < ttlMs;
    if (existing && fresh && !options?.forceRefresh) {
      return this.mapper.toCardDto(existing, [], true);
    }

    let apiResult: Awaited<ReturnType<AmazonPaapiClient['getItemsByAsins']>>;
    try {
      apiResult = await this.paapi.getItemsByAsins([normalized]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`PA-API error: ${msg}`);
      throw new ServiceUnavailableException(`No se pudo consultar Amazon: ${msg}`);
    }

    const item = apiResult.items.find((i) => i.asin === normalized);
    if (!item) {
      const detail = apiResult.errors.length ? apiResult.errors.join('; ') : 'Producto no encontrado.';
      throw new NotFoundException(detail);
    }

    const warnings: string[] = [];
    if (item.priceAmount == null) {
      warnings.push('SIN_PRECIO_EN_API');
    }
    if (!item.primaryImageUrl) {
      warnings.push('SIN_IMAGEN');
    }

    const marketplaceHost =
      this.config.get<string>('AMAZON_PRODUCT_DETAIL_HOST') || 'www.amazon.com';
    const canonicalUrl = item.detailPageUrl || buildAmazonDetailUrl(normalized, marketplaceHost);
    const slug = `amazon-${normalized.toLowerCase()}`;
    const availabilityKind = mapAmazonAvailabilityText(item.availabilityDisplay);
    const description = this.extractDescription(item);

    const basePriceDec = item.priceAmount != null ? new Decimal(item.priceAmount) : null;

    const hadExisting = !!existing;

    const productRow = await this.prisma.$transaction(async (tx) => {
      const upserted = await tx.importedCatalogProduct.upsert({
        where: { source_sourceId: { source: CatalogImportSource.AMAZON, sourceId: normalized } },
        create: {
          source: CatalogImportSource.AMAZON,
          sourceId: normalized,
          slug,
          title: item.title || `Amazon ${normalized}`,
          brand: item.brand,
          description,
          mainImageUrl: item.primaryImageUrl,
          availability: item.availabilityDisplay,
          availabilityKind,
          sourceUrl: canonicalUrl,
          basePriceUsd: basePriceDec ?? undefined,
          currency: item.priceCurrency || 'USD',
          lastSyncedAt: new Date(),
        },
        update: {
          title: item.title || `Amazon ${normalized}`,
          brand: item.brand,
          description,
          mainImageUrl: item.primaryImageUrl,
          availability: item.availabilityDisplay,
          availabilityKind,
          sourceUrl: canonicalUrl,
          basePriceUsd: basePriceDec,
          currency: item.priceCurrency || 'USD',
          lastSyncedAt: new Date(),
        },
      });

      await tx.importedProductImage.deleteMany({ where: { productId: upserted.id } });
      if (item.primaryImageUrl) {
        await tx.importedProductImage.create({
          data: {
            productId: upserted.id,
            url: item.primaryImageUrl,
            sortOrder: 0,
            isPrimary: true,
          },
        });
      }

      if (options?.pastedUrl?.trim()) {
        const pasted = options.pastedUrl.trim();
        const dup = await tx.importedProductSourceRecord.findFirst({
          where: { productId: upserted.id, url: pasted },
        });
        if (!dup) {
          await tx.importedProductSourceRecord.create({
            data: {
              productId: upserted.id,
              kind: 'user_pasted',
              url: pasted,
              metadata: { asin: normalized } as Prisma.InputJsonValue,
            },
          });
        }
      }

      if (basePriceDec != null) {
        const br = this.pricing.calculate({ basePriceUsd: basePriceDec.toNumber() });
        await tx.importedProductPrice.create({
          data: {
            productId: upserted.id,
            basePriceUsd: new Decimal(br.basePriceUsd),
            shippingUsd: new Decimal(br.shippingUsd),
            importTaxUsd: new Decimal(br.importTaxUsd),
            marginUsd: new Decimal(br.marginUsd),
            finalPriceUsd: new Decimal(br.finalPriceUsd),
            exchangeRate: new Decimal(br.exchangeRate),
            finalPriceLocal: new Decimal(br.finalPriceLocal),
            localCurrency: br.localCurrency,
            pricingConfigSnapshot: br.config as Prisma.InputJsonValue,
          },
        });
      }

      return tx.importedCatalogProduct.findUniqueOrThrow({
        where: { id: upserted.id },
        include: { prices: { orderBy: { calculatedAt: 'desc' }, take: 1 } },
      });
    });

    return this.mapper.toCardDto(productRow, warnings, hadExisting);
  }

  /** Fuerza nueva llamada a PA-API y recalcula precio */
  async revalidateProduct(productId: string): Promise<ImportedProductCardDto> {
    const row = await this.catalogRepository.findByIdWithLatestPrice(productId);
    if (!row || row.source !== CatalogImportSource.AMAZON) {
      throw new NotFoundException('Producto importado no encontrado.');
    }
    return this.importFromAsin(row.sourceId, { forceRefresh: true });
  }

  private syncTtlMs(): number {
    const h = Number(this.config.get('IMPORT_SYNC_TTL_HOURS') || 24);
    return (Number.isFinite(h) && h > 0 ? h : 24) * 3600 * 1000;
  }

  private extractDescription(item: { rawItem: Record<string, unknown> }): string | null {
    const info = item.rawItem.ItemInfo as
      | {
          Features?: { DisplayValues?: string[] };
        }
      | undefined;
    const feats = info?.Features?.DisplayValues;
    if (Array.isArray(feats) && feats.length) {
      return feats.slice(0, 5).join('\n');
    }
    return null;
  }
}
