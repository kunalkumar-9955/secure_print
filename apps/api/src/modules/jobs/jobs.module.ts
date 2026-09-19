import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { PrismaService } from '../../database/prisma.service';
import { StorageModule } from '../storage/storage.module';
import { PricingModule } from '../pricing/pricing.module';
import { AuditService } from '../audit/audit.service';

@Module({
  imports: [StorageModule, PricingModule],
  controllers: [JobsController],
  providers: [JobsService, PrismaService, AuditService],
  exports: [JobsService],
})
export class JobsModule {}
