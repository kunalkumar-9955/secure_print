import { Module } from '@nestjs/common';
import { ShopsService } from './shops.service';
import { ShopsController } from './shops.controller';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';

@Module({
  controllers: [ShopsController],
  providers: [ShopsService, PrismaService, AuditService],
  exports: [ShopsService],
})
export class ShopsModule {}
