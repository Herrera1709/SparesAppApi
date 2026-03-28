import { Controller, Get, Query } from '@nestjs/common';
import { ExternalProductsService, ExternalSearchResult } from './external-products.service';
import { SearchQueryDto } from './dto/search-query.dto';
import { PublicApi } from '../common/security/public-api.decorator';

@Controller('external-products')
@PublicApi()
export class ExternalProductsController {
  constructor(private readonly externalProductsService: ExternalProductsService) {}

  @Get('search')
  async search(@Query() dto: SearchQueryDto): Promise<ExternalSearchResult> {
    const source = dto.source || 'ebay';
    const limit = dto.limit ?? 20;
    return this.externalProductsService.search(dto.q, source, limit);
  }

  @Get('featured')
  async featured(): Promise<ExternalSearchResult> {
    return this.externalProductsService.getFeaturedEbay(24);
  }
}
