import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PrismaService } from '../../database/prisma.service';
import { StorageModule } from '../storage/storage.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [StorageModule, AuthModule],
  controllers: [HealthController],
  providers: [PrismaService],
})
export class HealthModule {}
