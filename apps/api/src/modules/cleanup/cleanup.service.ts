import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { StorageService } from '../storage/storage.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { AuditService } from '../audit/audit.service';
import { JobStatus, PaymentStatus } from '@secureprint/shared-types';

@Injectable()
export class CleanupService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CleanupService.name);
  private pollerTimer: NodeJS.Timeout | null = null;

  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
    private realtime: RealtimeGateway,
    private auditService: AuditService,
  ) {}

  onModuleInit() {
    this.logger.log('Initializing persistent background cleanup poller (every 15s)...');
    this.pollerTimer = setInterval(async () => {
      await this.processOverdueCleanups();
    }, 15000);
    // Run an immediate sweep on startup to catch any jobs pending from previous shutdowns
    this.processOverdueCleanups().catch((err) =>
      this.logger.error('Startup cleanup sweep error:', err),
    );
  }

  onModuleDestroy() {
    if (this.pollerTimer) {
      clearInterval(this.pollerTimer);
      this.pollerTimer = null;
    }
  }

  async processOverdueCleanups(): Promise<void> {
    try {
      const now = new Date();
      const overdueJobs = await this.prisma.cleanupJob.findMany({
        where: {
          status: 'PENDING',
          scheduledFor: { lte: now },
        },
        take: 20,
      });

      if (overdueJobs.length > 0) {
        this.logger.log(`Found ${overdueJobs.length} overdue document cleanup jobs. Executing...`);
        for (const job of overdueJobs) {
          await this.executeCleanup(job.jobId, job.shopId);
        }
      }
    } catch (err: any) {
      this.logger.error(`Error in processOverdueCleanups: ${err.message}`);
    }
  }

  async scheduleDocumentCleanup(jobId: string, shopId: string): Promise<void> {
    this.logger.log(`Enqueued 10-second server-side cleanup timer for job: ${jobId}`);

    // Fast-path in-memory timer
    setTimeout(async () => {
      await this.executeCleanup(jobId, shopId);
    }, 10000);
  }

  async executeCleanup(jobId: string, shopId: string): Promise<void> {
    try {
      this.logger.log(`Executing verified document cleanup for job: ${jobId}`);

      const job = await this.prisma.printJob.findUnique({
        where: { id: jobId },
        include: {
          files: true,
          payments: { where: { status: PaymentStatus.SUCCESS } },
        },
      });

      if (!job) {
        this.logger.warn(`Cleanup skipped: Job ${jobId} not found.`);
        return;
      }

      // Re-verify payment state before destructive deletion
      if (job.payments.length === 0) {
        this.logger.error(`Cleanup aborted: Job ${jobId} does not have a verified payment!`);
        return;
      }

      // Delete each file from private object storage
      for (const file of job.files) {
        if (!file.isDeleted) {
          await this.storageService.deleteFile(file.storageKey);

          await this.prisma.printJobFile.update({
            where: { id: file.id },
            data: {
              isDeleted: true,
              deletedAt: new Date(),
            },
          });
        }
      }

      // Update job state to FILES_DELETED
      await this.prisma.printJob.update({
        where: { id: jobId },
        data: {
          status: JobStatus.FILES_DELETED,
        },
      });

      // Update cleanup job table
      await this.prisma.cleanupJob.updateMany({
        where: { jobId, status: 'PENDING' },
        data: {
          status: 'COMPLETED',
          executedAt: new Date(),
        },
      });

      // Broadcast realtime event: Files Deleted
      this.realtime.emitCleanupCompleted(jobId, shopId);

      await this.auditService.log({
        shopId,
        action: 'FILES_PERMANENTLY_DELETED',
        entity: 'PRINT_JOB',
        entityId: jobId,
        metadata: { fileCount: job.files.length, cleanupDelayMs: 10000 },
      });

      this.logger.log(`Cleanup successfully completed for job: ${jobId}. All private documents deleted.`);
    } catch (err: any) {
      this.logger.error(`Cleanup failed for job: ${jobId}: ${err.message}`, err);

      await this.prisma.cleanupJob.updateMany({
        where: { jobId, status: 'PENDING' },
        data: {
          status: 'FAILED',
          errorDetails: err.message,
        },
      });
    }
  }
}
