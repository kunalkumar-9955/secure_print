import { Module } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';

@Module({
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, PrismaService, AuditService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
