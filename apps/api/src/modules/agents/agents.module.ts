import { Module } from '@nestjs/common';
import { AgentsService } from './agents.service';
import { AgentsController } from './agents.controller';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';

@Module({
  controllers: [AgentsController],
  providers: [AgentsService, PrismaService, AuditService],
  exports: [AgentsService],
})
export class AgentsModule {}
