import { Module } from '@nestjs/common';
import { ProductExtractorService } from './product-extractor.service';
import { ProductExtractorController } from './product-extractor.controller';

@Module({
  providers: [ProductExtractorService],
  controllers: [ProductExtractorController],
  exports: [ProductExtractorService],
})
export class ProductExtractorModule {}

