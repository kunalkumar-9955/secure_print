import { Module, Global } from '@nestjs/common';
import { CleanupService } from './cleanup.service';
import { PrismaService } from '../../database/prisma.service';
import { StorageModule } from '../storage/storage.module';
import { AuditService } from '../audit/audit.service';

@Global()
@Module({
  imports: [StorageModule],
  providers: [CleanupService, PrismaService, AuditService],
  exports: [CleanupService],
})
export class CleanupModule {}
