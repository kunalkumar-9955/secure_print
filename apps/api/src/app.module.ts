import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './database/prisma.service';
import { AuditModule } from './modules/audit/audit.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { StorageModule } from './modules/storage/storage.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { AuthModule } from './modules/auth/auth.module';
import { ShopsModule } from './modules/shops/shops.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { CustomersModule } from './modules/customers/customers.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { AgentsModule } from './modules/agents/agents.module';
import { PrintersModule } from './modules/printers/printers.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { CleanupModule } from './modules/cleanup/cleanup.module';
import { ReceiptsModule } from './modules/receipts/receipts.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuditModule,
    RealtimeModule,
    StorageModule,
    PricingModule,
    AuthModule,
    ShopsModule,
    SubscriptionsModule,
    CustomersModule,
    JobsModule,
    AgentsModule,
    PrintersModule,
    PaymentsModule,
    CleanupModule,
    ReceiptsModule,
    AnalyticsModule,
    HealthModule,
  ],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
