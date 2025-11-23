import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
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

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    SecurityModule,
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
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}

