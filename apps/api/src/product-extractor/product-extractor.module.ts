import { Module } from '@nestjs/common';
import { ProductExtractorService } from './product-extractor.service';
import { ProductExtractorController } from './product-extractor.controller';
import { SSRFProtectionService } from '../common/security/ssrf-protection.service';

@Module({
  providers: [ProductExtractorService, SSRFProtectionService],
  controllers: [ProductExtractorController],
  exports: [ProductExtractorService],
})
export class ProductExtractorModule {}

