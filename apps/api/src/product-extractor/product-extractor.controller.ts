import { Controller, Post, Body, UseGuards, Get, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ProductExtractorService } from './product-extractor.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ExtractProductDto } from './dto/extract-product.dto';
import { ValidateUrlQueryDto } from './dto/validate-url-query.dto';

@Controller('product-extractor')
@UseGuards(JwtAuthGuard)
export class ProductExtractorController {
  constructor(private readonly productExtractorService: ProductExtractorService) {}

  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests por minuto
  @Post('extract')
  async extractProduct(@Body() dto: ExtractProductDto) {
    // Validar URL antes de procesar
    if (!this.productExtractorService.isValidProductUrl(dto.url)) {
      throw new Error('URL de producto no válida');
    }
    return this.productExtractorService.extractProductInfo(dto.url);
  }

  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 requests por minuto
  @Get('validate-url')
  async validateUrl(@Query() queryDto: ValidateUrlQueryDto) {
    if (!queryDto.url) {
      return { isValid: false };
    }
    return {
      isValid: this.productExtractorService.isValidProductUrl(queryDto.url),
    };
  }
}

