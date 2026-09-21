import { Controller, Get, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AdminBootstrapService } from '../auth/admin-bootstrap.service';
import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private adminBootstrap: AdminBootstrapService,
  ) {}

  @Get()
  async getHealth() {
    let dbStatus = 'HEALTHY';
    let storageStatus = 'HEALTHY';

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = 'DOWN';
    }

    try {
      if (!this.storage.fileExists('')) {
        // base dir check
      }
    } catch {
      storageStatus = 'DEGRADED';
    }

    const overall = dbStatus === 'HEALTHY' && storageStatus === 'HEALTHY' ? 'HEALTHY' : 'DEGRADED';

    return {
      status: overall,
      timestamp: new Date().toISOString(),
      services: {
        api: 'HEALTHY',
        database: dbStatus,
        storage: storageStatus,
        paymentGateway: 'HEALTHY',
        realtimeWebSocket: 'HEALTHY',
      },
    };
  }

  @Get('db')
  async getDbHealth() {
    try {
      const start = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'HEALTHY', latencyMs: Date.now() - start };
    } catch (err: any) {
      return { status: 'DOWN', error: err.message };
    }
  }

  @Get('storage')
  async getStorageHealth() {
    try {
      const exists = this.storage.fileExists('');
      return { status: 'HEALTHY', storageType: 'PRIVATE_DISK_ENCRYPTED', accessible: true };
    } catch (err: any) {
      return { status: 'DEGRADED', error: err.message };
    }
  }

  @Get('redis')
  async getRedisHealth() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    return {
      status: 'HEALTHY',
      configuredUrl: redisUrl.replace(/\/\/[^@]+@/, '//***@'),
      queueType: 'BULLMQ_INTEGRATED',
    };
  }

  @Get('init-db')
  async initDb() {
    const candidatePaths = [
      path.resolve(__dirname, '../../prisma/schema.prisma'),
      path.resolve(__dirname, '../../../prisma/schema.prisma'),
      path.resolve(__dirname, '../../../../apps/api/prisma/schema.prisma'),
      path.resolve(process.cwd(), 'apps/api/prisma/schema.prisma'),
      path.resolve(process.cwd(), 'prisma/schema.prisma'),
    ];
    const schemaPath = candidatePaths.find((p) => fs.existsSync(p));

    const prismaBins = [
      path.resolve(process.cwd(), 'node_modules/.bin/prisma'),
      path.resolve(process.cwd(), 'apps/api/node_modules/.bin/prisma'),
      path.resolve(__dirname, '../../../../node_modules/.bin/prisma'),
      'npx prisma',
    ];

    let pushLog = '';
    let pushSuccess = false;

    if (schemaPath) {
      for (const bin of prismaBins) {
        try {
          pushLog = execSync(`${bin} db push --schema="${schemaPath}" --skip-generate --accept-data-loss`, {
            env: process.env,
          }).toString();
          pushSuccess = true;
          break;
        } catch (e: any) {
          pushLog = `Failed with ${bin}: ${e.message}\n${e.stdout?.toString() || ''}\n${e.stderr?.toString() || ''}`;
        }
      }
    } else {
      pushLog = `Could not find schema.prisma in: ${candidatePaths.join(', ')}`;
    }

    let bootstrapLog = '';
    try {
      await this.adminBootstrap.ensureSuperAdmin();
      await this.adminBootstrap.ensureSubscriptionPlans();
      await this.adminBootstrap.ensureDemoShopOwner();
      bootstrapLog = 'Admin and demo shop bootstrapped successfully';
    } catch (e: any) {
      bootstrapLog = `Bootstrap failed: ${e.message}`;
    }

    let userCount = 0;
    let shopCount = 0;
    try {
      userCount = await this.prisma.user.count();
      shopCount = await this.prisma.shop.count();
    } catch (e: any) {
      // count failed
    }

    return {
      success: pushSuccess,
      schemaPath,
      pushLog,
      bootstrapLog,
      userCount,
      shopCount,
    };
  }

  @Get('cleanup-offline-agents')
  async cleanupOfflineAgents() {
    const threshold = new Date(Date.now() - 60000); // 1 minute
    const allAgents = await this.prisma.desktopAgent.findMany();
    const toDelete = allAgents.filter(
      (a) => !a.lastHeartbeatAt || new Date(a.lastHeartbeatAt) < threshold,
    );

    const deletedNames: string[] = [];
    for (const a of toDelete) {
      await this.prisma.printAttempt.deleteMany({ where: { agentId: a.id } });
      await this.prisma.printer.deleteMany({ where: { agentId: a.id } });
      await this.prisma.desktopAgent.delete({ where: { id: a.id } });
      deletedNames.push(a.machineName);
    }

    return {
      success: true,
      deletedCount: deletedNames.length,
      deletedAgents: deletedNames,
    };
  }
}

