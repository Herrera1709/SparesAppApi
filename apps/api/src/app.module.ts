import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AddressesModule } from './addresses/addresses.module';
import { OrdersModule } from './orders/orders.module';
import { LockersModule } from './lockers/lockers.module';
import { PaymentsModule } from './payments/payments.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { TicketsModule } from './tickets/tickets.module';
import { PricingModule } from './pricing/pricing.module';
import { AuditModule } from './audit/audit.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ChatModule } from './chat/chat.module';
import { ProductExtractorModule } from './product-extractor/product-extractor.module';
import { InventoryModule } from './inventory/inventory.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    AddressesModule,
    OrdersModule,
    LockersModule,
    PaymentsModule,
    WishlistModule,
    TicketsModule,
    PricingModule,
    AuditModule,
    NotificationsModule,
    ChatModule,
    ProductExtractorModule,
    InventoryModule,
  ],
})
export class AppModule {}

