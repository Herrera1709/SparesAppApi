import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ImportedProductsController } from './imported-products.controller';
import {
  AmazonProductRouteController,
  ImportProductRootController,
} from './import-product-api.controller';
import { ImportedProductsService } from './imported-products.service';
import { AmazonPaapiClient } from './amazon/amazon-paapi.client';
import { AmazonProductImporter } from './amazon/amazon-product-importer.service';
import { ImportPricingEngine } from './import-pricing.engine';
import { ImportedCatalogRepository } from './repositories/imported-catalog.repository';
import { ImportedProductMapper } from './imported-product.mapper';

@Module({
  imports: [PrismaModule],
  controllers: [
    ImportedProductsController,
    ImportProductRootController,
    AmazonProductRouteController,
  ],
  providers: [
    ImportedCatalogRepository,
    ImportedProductMapper,
    ImportPricingEngine,
    AmazonPaapiClient,
    AmazonProductImporter,
    ImportedProductsService,
  ],
  exports: [
    ImportedProductsService,
    ImportedCatalogRepository,
    AmazonPaapiClient,
    AmazonProductImporter,
    ImportPricingEngine,
    ImportedProductMapper,
  ],
})
export class ImportedProductsModule {}
