import { Controller, Post, Body, UseGuards, Get, Query } from '@nestjs/common';
import { ProductExtractorService } from './product-extractor.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IsUrl } from 'class-validator';

class ExtractProductDto {
  @IsUrl({}, { message: 'La URL debe ser válida' })
  url: string;
}

@Controller('product-extractor')
@UseGuards(JwtAuthGuard)
export class ProductExtractorController {
  constructor(private readonly productExtractorService: ProductExtractorService) {}

  @Post('extract')
  async extractProduct(@Body() dto: ExtractProductDto) {
    return this.productExtractorService.extractProductInfo(dto.url);
  }

  @Get('validate-url')
  async validateUrl(@Query('url') url: string) {
    return {
      isValid: this.productExtractorService.isValidProductUrl(url),
    };
  }
}

