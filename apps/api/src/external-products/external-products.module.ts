import { Module } from '@nestjs/common';
import { ExternalProductsController } from './external-products.controller';
import { ExternalProductsService } from './external-products.service';

@Module({
  controllers: [ExternalProductsController],
  providers: [ExternalProductsService],
  exports: [ExternalProductsService],
})
export class ExternalProductsModule {}
