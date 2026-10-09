import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { BaselineInterceptor } from './common/performance/baseline.interceptor';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import configuration from './config/configuration';
import { validateEnv } from './config/env.validation';

import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { RecentAuthGuard } from './common/guards/recent-auth.guard';
import { ScopeGuard } from './common/guards/scope.guard';
import { SubscriptionActiveGuard } from './common/guards/subscription-active.guard';
import { MaintenanceGuard } from './common/guards/maintenance.guard';
import { ScopeModule } from './common/scope/scope.module';
import { DatetimeModule } from './common/datetime/datetime.module';

import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { redisConnectionOptions } from './redis/redis-security';
import { RolesModule } from './roles/roles.module';

// Phase 1 skeletons - registered so the module graph is complete.
import { AppointmentsModule } from './appointments/appointments.module';
import { BillsModule } from './bills/bills.module';
import { CustomersModule } from './customers/customers.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { FranchisesModule } from './franchises/franchises.module';
import { InventoryModule } from './inventory/inventory.module';
import { LoyaltyModule } from './loyalty/loyalty.module';
import { MediaModule } from './media/media.module';
import { MembershipsModule } from './memberships/memberships.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PaymentsModule } from './payments/payments.module';
import { PlatformPlansModule } from './platform-plans/platform-plans.module';
import { FranchiseSubscriptionsModule } from './franchise-subscriptions/franchise-subscriptions.module';
import { PlatformReportsModule } from './platform-reports/platform-reports.module';
import { ProductCategoriesModule } from './product-categories/product-categories.module';
import { ProductsModule } from './products/products.module';
import { PurchasesModule } from './purchases/purchases.module';
import { SalonsModule } from './salons/salons.module';
import { SalonPhotosModule } from './salon-photos/salon-photos.module';
import { SearchModule } from './search/search.module';
import { ServiceCategoriesModule } from './service-categories/service-categories.module';
import { ServicesModule } from './services/services.module';
import { SettingsModule } from './settings/settings.module';
import { SupportTicketsModule } from './support-tickets/support-tickets.module';
import { UsersModule } from './users/users.module';
import { VendorsModule } from './vendors/vendors.module';
import { ExpensesModule } from './expenses/expenses.module';

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
          ...redisConnectionOptions(
            config.getOrThrow<string>('redis.url'),
            config.get<string>('nodeEnv') === 'production',
            config.get<string>('redis.caPath'),
          ),
          // Queue producers fail promptly. BullMQ creates blocking worker connections with null retries.
          maxRetriesPerRequest: 2,
          enableOfflineQueue: false,
        },
      }),
    }),
    ScopeModule,
    DatetimeModule,
    AuditModule,

    HealthModule,
    AuthModule,
    RolesModule,

    UsersModule,
    FranchisesModule,
    SalonsModule,
    SalonPhotosModule,
    CustomersModule,
    CampaignsModule,
    ServiceCategoriesModule,
    ServicesModule,
    AppointmentsModule,
    ProductCategoriesModule,
    ProductsModule,
    VendorsModule,
    ExpensesModule,
    PurchasesModule,
    InventoryModule,
    BillsModule,
    PaymentsModule,
    MembershipsModule,
    PlatformPlansModule,
    FranchiseSubscriptionsModule,
    PlatformReportsModule,
    LoyaltyModule,
    NotificationsModule,
    MediaModule,
    SettingsModule,
    SearchModule,
    SupportTicketsModule,
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
    { provide: APP_GUARD, useClass: RecentAuthGuard },
    { provide: APP_GUARD, useClass: ScopeGuard },
    { provide: APP_GUARD, useClass: MaintenanceGuard },
    { provide: APP_GUARD, useClass: SubscriptionActiveGuard },

    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: BaselineInterceptor },
  ],
})
export class AppModule {}
