import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CatalogImportSource } from '@prisma/client';
import { AmazonProductImporter } from './amazon/amazon-product-importer.service';
import { AmazonPaapiClient } from './amazon/amazon-paapi.client';
import {
  extractAmazonAsinFromUrl,
  isAmazonProductUrl,
} from './utils/amazon-url.utils';
import {
  HybridSearchResponse,
  ImportedProductCardDto,
} from './types/imported-product.types';
import { ImportedCatalogRepository } from './repositories/imported-catalog.repository';
import { ImportedProductMapper } from './imported-product.mapper';

@Injectable()
export class ImportedProductsService {
  constructor(
    private readonly catalogRepository: ImportedCatalogRepository,
    private readonly amazonImporter: AmazonProductImporter,
    private readonly paapi: AmazonPaapiClient,
    private readonly mapper: ImportedProductMapper,
  ) {}

  /**
   * Búsqueda híbrida: URL Amazon → importar; texto → catálogo local.
   */
  async hybridSearch(
    rawQuery: string,
    forceRefresh?: boolean,
  ): Promise<HybridSearchResponse> {
    const q = rawQuery.trim();
    if (!q) {
      throw new BadRequestException('La búsqueda no puede estar vacía.');
    }

    if (isAmazonProductUrl(q)) {
      const asin = extractAmazonAsinFromUrl(q);
      if (!asin) {
        throw new BadRequestException(
          'No se pudo extraer el ASIN del enlace. Usa una URL de producto Amazon (p. ej. contiene /dp/XXXXXXXXXX).',
        );
      }
      const product = await this.amazonImporter.importFromAsin(asin, {
        pastedUrl: q,
        forceRefresh,
      });
      return { mode: 'amazon_imported', query: q, product };
    }

    const rows = await this.catalogRepository.searchByText(q, 30);
    const results = rows.map((r) => this.mapper.toCardDto(r, [], true));
    return { mode: 'local_catalog', query: q, results };
  }

  async importAmazonUrl(url: string, forceRefresh?: boolean): Promise<ImportedProductCardDto> {
    if (!isAmazonProductUrl(url)) {
      throw new BadRequestException('La URL no es un enlace válido de Amazon.');
    }
    const asin = extractAmazonAsinFromUrl(url);
    if (!asin) {
      throw new BadRequestException('No se pudo extraer el ASIN de la URL.');
    }
    return this.amazonImporter.importFromAsin(asin, { pastedUrl: url, forceRefresh });
  }

  async getBySourceAndSourceId(
    source: string,
    sourceId: string,
    opts?: { importIfMissing?: boolean },
  ): Promise<ImportedProductCardDto> {
    const src = this.parseSource(source);
    const sid = sourceId.trim().toUpperCase();

    const row = await this.catalogRepository.findBySourceAndSourceIdWithLatestPrice(src, sid);

    if (row) {
      return this.mapper.toCardDto(row, [], true);
    }

    const importIfMissing = opts?.importIfMissing !== false;
    if (importIfMissing && src === CatalogImportSource.AMAZON && this.paapi.isConfigured()) {
      return this.amazonImporter.importFromAsin(sid, { forceRefresh: false });
    }

    throw new NotFoundException('Producto no encontrado en el catálogo importado.');
  }

  async getById(id: string): Promise<ImportedProductCardDto> {
    const row = await this.catalogRepository.findByIdWithLatestPrice(id);
    if (!row) {
      throw new NotFoundException('Producto no encontrado.');
    }
    return this.mapper.toCardDto(row, [], true);
  }

  async revalidate(productId: string): Promise<ImportedProductCardDto> {
    return this.amazonImporter.revalidateProduct(productId);
  }

  async searchLocalCatalog(query: string, take = 20): Promise<ImportedProductCardDto[]> {
    const rows = await this.catalogRepository.searchByText(query, take);
    return rows.map((r) => this.mapper.toCardDto(r, [], true));
  }

  private parseSource(source: string): CatalogImportSource {
    const s = source.trim().toLowerCase();
    if (s === 'amazon') return CatalogImportSource.AMAZON;
    throw new BadRequestException(`Fuente no soportada: ${source}`);
  }
}
