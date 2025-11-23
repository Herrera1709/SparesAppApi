import { Module, forwardRef } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditModule } from '../audit/audit.module';
import { ProductExtractorModule } from '../product-extractor/product-extractor.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => NotificationsModule),
    AuditModule,
    ProductExtractorModule,
    InventoryModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}

