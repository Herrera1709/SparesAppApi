import { BadRequestException, Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ImportedProductsService } from './imported-products.service';
import { ImportProductDto } from './dto/import-product.dto';
import { PublicApi } from '../common/security/public-api.decorator';

/**
 * Rutas “planas” pedidas para integración tipo Tiendamia (prefijo global /api):
 * - POST /api/import-product
 * - GET  /api/product/amazon/:asin
 */
@Controller()
@PublicApi()
export class ImportProductRootController {
  constructor(private readonly importedProductsService: ImportedProductsService) {}

  @Post('import-product')
  importProduct(@Body() dto: ImportProductDto) {
    const link = dto.url?.trim() || dto.input?.trim();
    if (!link) {
      throw new BadRequestException('Envía el campo `url` o `input` con el enlace del producto en Amazon.');
    }
    return this.importedProductsService.importAmazonUrl(link, dto.forceRefresh);
  }
}

@Controller('product')
@PublicApi()
export class AmazonProductRouteController {
  constructor(private readonly importedProductsService: ImportedProductsService) {}

  @Get('amazon/:asin')
  getAmazonCard(
    @Param('asin') asin: string,
    @Query('importIfMissing') importIfMissing?: string,
  ) {
    const flag = importIfMissing === undefined ? true : importIfMissing === 'true' || importIfMissing === '1';
    return this.importedProductsService.getBySourceAndSourceId('amazon', asin, {
      importIfMissing: flag,
    });
  }
}
