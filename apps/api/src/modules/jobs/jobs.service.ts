import { Injectable, NotFoundException, BadRequestException, ForbiddenException, GoneException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { StorageService } from '../storage/storage.service';
import { PricingService } from '../pricing/pricing.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { AuditService } from '../audit/audit.service';
import { PrintOptions, JobStatus, canTransition, ShopStatus, PrinterStatus } from '@secureprint/shared-types';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class JobsService {
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
    private pricingService: PricingService,
    private realtime: RealtimeGateway,
    private auditService: AuditService,
  ) {}

  async createJob(
    sessionId: string,
    file: Express.Multer.File,
    options: PrintOptions,
    pageCount = 1,
  ) {
    const session = await this.prisma.customerSession.findUnique({
      where: { id: sessionId },
      include: {
        shop: {
          include: { shopSettings: true },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Customer session not found or expired.');
    }

    if (session.shop.status !== ShopStatus.ACTIVE) {
      throw new ForbiddenException('Shop is currently not active.');
    }

    // Server-side price calculation
    const pricingRules = (session.shop.shopSettings?.pricingRulesJson as any) || {};
    const pricingSnapshot = this.pricingService.calculate(options, pageCount, pricingRules);

    const fileId = uuidv4();
    const jobId = uuidv4();
    const jobCode = `SP-${Math.floor(1000 + Math.random() * 9000)}`;

    // Save to private storage
    const uploadRes = await this.storageService.saveFile(session.shopId, jobId, fileId, file);

    const printJob = await this.prisma.$transaction(async (tx) => {
      const job = await tx.printJob.create({
        data: {
          id: jobId,
          shopId: session.shopId,
          sessionId: session.id,
          jobCode,
          status: JobStatus.REQUEST_SENT,
          printOptionsJson: options as any,
          pricingSnapshotJson: pricingSnapshot as any,
          printingCompleted: false,
        },
      });

      await tx.printJobFile.create({
        data: {
          id: fileId,
          jobId: job.id,
          shopId: session.shopId,
          storageKey: uploadRes.storageKey,
          originalName: uploadRes.originalName,
          mimeType: uploadRes.mimeType,
          sizeBytes: BigInt(uploadRes.sizeBytes),
          pageCount,
        },
      });

      return job;
    });

    // Realtime notification to shop queue
    this.realtime.emitNewJob(session.shopId, {
      ...printJob,
      customerName: session.customerName,
      pricing: pricingSnapshot,
    });

    await this.auditService.log({
      shopId: session.shopId,
      action: 'PRINT_JOB_CREATED',
      entity: 'PRINT_JOB',
      entityId: printJob.id,
      metadata: { jobCode, amount: pricingSnapshot.finalAmount },
    });

    return {
      ...printJob,
      customerName: session.customerName,
      pricing: pricingSnapshot,
    };
  }

  async getJobById(jobId: string) {
    const job = await this.prisma.printJob.findUnique({
      where: { id: jobId },
      include: {
        session: { select: { customerName: true, createdAt: true } },
        shop: { select: { id: true, name: true, slug: true, address: true, phone: true } },
        files: { select: { id: true, originalName: true, mimeType: true, sizeBytes: true, pageCount: true, isDeleted: true, deletedAt: true } },
        payments: { select: { id: true, amount: true, currency: true, provider: true, status: true, verifiedAt: true } },
        printAttempts: { orderBy: { createdAt: 'desc' } },
        receipts: true,
      },
    });

    if (!job) throw new NotFoundException('Print job not found.');
    return {
      ...job,
      files: job.files.map((f) => ({
        ...f,
        sizeBytes: f.sizeBytes.toString(),
      })),
    };
  }

  async updateJobOptions(jobId: string, options: PrintOptions) {
    const job = await this.prisma.printJob.findUnique({
      where: { id: jobId },
      include: {
        shop: {
          include: { shopSettings: true },
        },
        files: true,
        session: true,
      },
    });

    if (!job) throw new NotFoundException('Print job not found.');

    const pageCount = job.files?.[0]?.pageCount || 1;
    const pricingRules = (job.shop.shopSettings?.pricingRulesJson as any) || {};
    const pricingSnapshot = this.pricingService.calculate(options, pageCount, pricingRules);

    const updated = await this.prisma.printJob.update({
      where: { id: jobId },
      data: {
        printOptionsJson: options as any,
        pricingSnapshotJson: pricingSnapshot as any,
      },
      include: {
        session: { select: { customerName: true, createdAt: true } },
        shop: { select: { id: true, name: true, slug: true, address: true, phone: true } },
        files: { select: { id: true, originalName: true, mimeType: true, sizeBytes: true, pageCount: true, isDeleted: true, deletedAt: true } },
        payments: { select: { id: true, amount: true, currency: true, provider: true, status: true, verifiedAt: true } },
        printAttempts: { orderBy: { createdAt: 'desc' } },
        receipts: true,
      },
    });

    const serializedFiles = updated.files.map((f) => ({
      ...f,
      sizeBytes: f.sizeBytes.toString(),
    }));

    const result = {
      ...updated,
      files: serializedFiles,
      customerName: job.session.customerName,
      pricing: pricingSnapshot,
    };

    this.realtime.emitJobUpdate(job.id, job.shopId, result);

    return result;
  }

  async getShopQueue(shopId: string) {
    const jobs = await this.prisma.printJob.findMany({
      where: { shopId },
      orderBy: { createdAt: 'desc' },
      include: {
        session: { select: { customerName: true } },
        files: { select: { id: true, originalName: true, mimeType: true, isDeleted: true } },
        payments: { select: { status: true, provider: true, amount: true } },
      },
    });

    return jobs.map((j) => ({
      ...j,
      customerName: j.session.customerName,
    }));
  }

  async getShopHistory(shopId: string, limit = 100) {
    const jobs = await this.prisma.printJob.findMany({
      where: { shopId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        session: { select: { customerName: true } },
        files: { select: { id: true, originalName: true, mimeType: true, pageCount: true, isDeleted: true, deletedAt: true } },
        payments: { select: { status: true, provider: true, amount: true, verifiedAt: true } },
        receipts: { select: { id: true, receiptNumber: true } },
      },
    });

    return jobs.map((j) => ({
      ...j,
      customerName: j.session.customerName,
    }));
  }

  async transitionStatus(
    jobId: string,
    newStatus: JobStatus,
    actorId?: string,
    actorRole?: string,
  ) {
    const job = await this.prisma.printJob.findUnique({
      where: { id: jobId },
    });

    if (!job) throw new NotFoundException('Print job not found.');

    const currentStatus = job.status as JobStatus;

    if (!canTransition(currentStatus, newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${newStatus}.`,
      );
    }

    const isPrintingCompleted =
      newStatus === JobStatus.PRINTING_COMPLETED ||
      newStatus === JobStatus.AWAITING_PAYMENT ||
      job.printingCompleted;

    const updated = await this.prisma.printJob.update({
      where: { id: jobId },
      data: {
        status: newStatus,
        printingCompleted: isPrintingCompleted,
      },
      include: { session: true },
    });

    // Broadcast realtime event
    this.realtime.emitJobUpdate(jobId, job.shopId, {
      jobId,
      status: newStatus,
      printingCompleted: isPrintingCompleted,
    });

    await this.auditService.log({
      actorId,
      actorRole,
      shopId: job.shopId,
      action: `JOB_STATUS_CHANGED_${newStatus}`,
      entity: 'PRINT_JOB',
      entityId: jobId,
      metadata: { from: currentStatus, to: newStatus },
    });

    return updated;
  }

  async submitToAgent(jobId: string, printerId?: string, actorId?: string, actorRole?: string) {
    const job = await this.prisma.printJob.findUnique({
      where: { id: jobId },
      include: { files: true },
    });

    if (!job) throw new NotFoundException('Job not found.');

    // Prevent duplicate printing
    if (
      job.status === JobStatus.PRINTING ||
      job.status === JobStatus.PRINTING_COMPLETED ||
      job.status === JobStatus.AWAITING_PAYMENT ||
      job.status === JobStatus.PAYMENT_PENDING ||
      job.status === JobStatus.PAYMENT_SUCCESS ||
      job.status === JobStatus.FILES_DELETED
    ) {
      throw new BadRequestException(
        `Job is already in ${job.status} state. Duplicate print dispatch is not permitted.`,
      );
    }

    // 1. Verify that the shop has an ONLINE Desktop Agent
    const heartbeatThreshold = new Date(Date.now() - 45000);
    const onlineAgent = await this.prisma.desktopAgent.findFirst({
      where: {
        shopId: job.shopId,
        pairingCode: null,
        lastHeartbeatAt: { gt: heartbeatThreshold },
      },
      include: {
        printers: true,
      },
      orderBy: { lastHeartbeatAt: 'desc' },
    });

    if (!onlineAgent) {
      throw new BadRequestException('Desktop Agent is offline.');
    }

    // 2. Determine target printer
    let targetPrinterId = printerId;
    if (!targetPrinterId) {
      // Look for default printer or first ready printer
      const defaultPrinter =
        onlineAgent.printers.find((p) => p.isDefault && p.status === PrinterStatus.READY) ||
        onlineAgent.printers.find((p) => p.status === PrinterStatus.READY) ||
        onlineAgent.printers[0] ||
        (await this.prisma.printer.findFirst({
          where: { shopId: job.shopId, isDefault: true, status: PrinterStatus.READY },
        })) ||
        (await this.prisma.printer.findFirst({
          where: { shopId: job.shopId, status: PrinterStatus.READY },
        }));

      if (!defaultPrinter || defaultPrinter.status === PrinterStatus.OFFLINE || defaultPrinter.status === PrinterStatus.ERROR) {
        throw new BadRequestException('Printer is unavailable.');
      }
      targetPrinterId = defaultPrinter.id;
    } else {
      const printer = await this.prisma.printer.findFirst({
        where: { id: targetPrinterId, shopId: job.shopId },
      });
      if (!printer || printer.status === PrinterStatus.OFFLINE || printer.status === PrinterStatus.ERROR) {
        throw new BadRequestException('Printer is unavailable.');
      }
    }

    // 3. Transition job status to PRINTING
    if (job.status === JobStatus.REQUEST_SENT) {
      await this.transitionStatus(jobId, JobStatus.SHOP_RECEIVED, actorId, actorRole);
    }
    await this.transitionStatus(jobId, JobStatus.PRINTING, actorId, actorRole);

    // 4. Create PrintAttempt linked to the online agent and target printer
    const attempt = await this.prisma.printAttempt.create({
      data: {
        jobId,
        agentId: onlineAgent.id,
        printerId: targetPrinterId,
        status: 'SUBMITTED',
        startedAt: new Date(),
      },
    });

    // 5. Broadcast realtime update to shopkeeper and customer tracking
    this.realtime.emitJobUpdate(jobId, job.shopId, {
      jobId,
      status: JobStatus.PRINTING,
      attemptId: attempt.id,
      printerId: targetPrinterId,
      agentId: onlineAgent.id,
    });

    return attempt;
  }

  async markPrintingCompleted(jobId: string, actorId?: string, actorRole?: string) {
    // 1. Transition PRINTING -> PRINTING_COMPLETED
    await this.transitionStatus(jobId, JobStatus.PRINTING_COMPLETED, actorId, actorRole);
    // 2. Transition PRINTING_COMPLETED -> AWAITING_PAYMENT
    const updated = await this.transitionStatus(jobId, JobStatus.AWAITING_PAYMENT, actorId, actorRole);
    return updated;
  }

  async getFileForJob(jobId: string, fileId: string) {
    const fileRecord = await this.prisma.printJobFile.findFirst({
      where: { id: fileId, jobId },
    });

    if (!fileRecord) throw new NotFoundException('File record not found.');

    if (fileRecord.isDeleted) {
      throw new GoneException(
        'Document has been permanently deleted according to the SecurePrint privacy policy.',
      );
    }

    const filePath = this.storageService.getFilePath(fileRecord.storageKey);
    return {
      filePath,
      originalName: fileRecord.originalName,
      mimeType: fileRecord.mimeType,
    };
  }
}
