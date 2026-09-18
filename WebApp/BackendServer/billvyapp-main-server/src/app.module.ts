import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import configuration from './config/configuration';
import { validateEnv } from './config/env.validation';

import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { ScopeGuard } from './common/guards/scope.guard';
import { ScopeModule } from './common/scope/scope.module';

import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { RolesModule } from './roles/roles.module';

// Phase 1 skeletons - registered so the module graph is complete.
import { AppointmentsModule } from './appointments/appointments.module';
import { BillsModule } from './bills/bills.module';
import { CustomersModule } from './customers/customers.module';
import { FranchisesModule } from './franchises/franchises.module';
import { InventoryModule } from './inventory/inventory.module';
import { LoyaltyModule } from './loyalty/loyalty.module';
import { MediaModule } from './media/media.module';
import { MembershipsModule } from './memberships/memberships.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PaymentsModule } from './payments/payments.module';
import { ProductCategoriesModule } from './product-categories/product-categories.module';
import { ProductsModule } from './products/products.module';
import { PurchasesModule } from './purchases/purchases.module';
import { SalonsModule } from './salons/salons.module';
import { ServiceCategoriesModule } from './service-categories/service-categories.module';
import { ServicesModule } from './services/services.module';
import { UsersModule } from './users/users.module';
import { VendorsModule } from './vendors/vendors.module';
import { SettingsModule } from './settings/settings.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [configuration],
      validate: validateEnv,
    }),

    // Baseline limit for every route. Auth endpoints tighten this with @Throttle.
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: 60_000, limit: 100 }],
    }),

    PrismaModule,
    RedisModule,
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          url: config.getOrThrow<string>('redis.url'),
          maxRetriesPerRequest: null,
        },
      }),
    }),
    ScopeModule,
    AuditModule,

    HealthModule,
    AuthModule,
    RolesModule,

    UsersModule,
    FranchisesModule,
    SalonsModule,
    CustomersModule,
    ServiceCategoriesModule,
    ServicesModule,
    AppointmentsModule,
    ProductCategoriesModule,
    ProductsModule,
    VendorsModule,
    PurchasesModule,
    InventoryModule,
    BillsModule,
    PaymentsModule,
    MembershipsModule,
    LoyaltyModule,
    NotificationsModule,
    MediaModule,
    SettingsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,

    // Rate limiting runs before authentication so unauthenticated floods are
    // rejected without touching the database.
    { provide: APP_GUARD, useClass: ThrottlerGuard },

    // Authentication is deny-by-default across the whole API; routes opt out
    // with @Public(). Authorization is layered: role, then franchise/salon/own
    // scope. Guards without metadata pass through.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ScopeGuard },

    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
