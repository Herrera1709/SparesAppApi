import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ImportedProductsService } from './imported-products.service';
import { HybridSearchDto } from './dto/hybrid-search.dto';
import { ImportAmazonUrlDto } from './dto/import-amazon-url.dto';
import { PublicApi } from '../common/security/public-api.decorator';

/**
 * Catálogo importado (Amazon PA-API) — rutas bajo prefijo global /api
 *
 * - POST .../hybrid-search — URL Amazon o búsqueda local
 * - POST .../import — alias explícito de importación por URL
 * - POST .../import-product — alias solicitado (mismo cuerpo que /import)
 * - GET .../search — solo catálogo local
 * - GET .../:source/:sourceId — ficha por marketplace + ASIN
 * - POST .../:id/revalidate — refrescar desde PA-API
 */
@Controller('imported-products')
@PublicApi()
export class ImportedProductsController {
  constructor(private readonly importedProductsService: ImportedProductsService) {}

  @Post('hybrid-search')
  hybridSearch(@Body() dto: HybridSearchDto) {
    return this.importedProductsService.hybridSearch(dto.q, dto.forceRefresh);
  }

  @Post('import')
  importUrl(@Body() dto: ImportAmazonUrlDto) {
    return this.importedProductsService.importAmazonUrl(dto.url, dto.forceRefresh);
  }

  /** Alias pedido para integraciones / documentación */
  @Post('import-product')
  importProductAlias(@Body() dto: ImportAmazonUrlDto) {
    return this.importedProductsService.importAmazonUrl(dto.url, dto.forceRefresh);
  }

  @Get('search')
  searchLocal(@Query('q') q: string, @Query('limit') limit?: string) {
    const lim = limit ? parseInt(limit, 10) : 20;
    return this.importedProductsService.searchLocalCatalog(q || '', Number.isFinite(lim) ? lim : 20);
  }

  /** Debe ir antes de GET :source/:sourceId para no capturar "by-id" como fuente */
  @Get('by-id/:id')
  getById(@Param('id') id: string) {
    return this.importedProductsService.getById(id);
  }

  @Post(':id/revalidate')
  revalidate(@Param('id') id: string) {
    return this.importedProductsService.revalidate(id);
  }

  @Get(':source/:sourceId')
  getBySource(
    @Param('source') source: string,
    @Param('sourceId') sourceId: string,
    @Query('importIfMissing') importIfMissing?: string,
  ) {
    const flag = importIfMissing === undefined ? true : importIfMissing === 'true' || importIfMissing === '1';
    return this.importedProductsService.getBySourceAndSourceId(source, sourceId, {
      importIfMissing: flag,
    });
  }
}
