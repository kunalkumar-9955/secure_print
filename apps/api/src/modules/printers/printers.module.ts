import { Module } from '@nestjs/common';
import { PrintersService } from './printers.service';
import { PrintersController } from './printers.controller';
import { PrismaService } from '../../database/prisma.service';
import { StorageModule } from '../storage/storage.module';
import { JobsModule } from '../jobs/jobs.module';

@Module({
  imports: [StorageModule, JobsModule],
  controllers: [PrintersController],
  providers: [PrintersService, PrismaService],
  exports: [PrintersService],
})
export class PrintersModule {}
