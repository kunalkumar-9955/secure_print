import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { WebhooksController } from './webhooks.controller';
import { CashfreeProvider } from './cashfree.provider';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CleanupModule } from '../cleanup/cleanup.module';

@Module({
  imports: [CleanupModule],
  controllers: [PaymentsController, WebhooksController],
  providers: [PaymentsService, CashfreeProvider, PrismaService, AuditService],
  exports: [PaymentsService, CashfreeProvider],
})
export class PaymentsModule {}
