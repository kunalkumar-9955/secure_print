import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { StorageService } from '../storage/storage.service';
import { JobsService } from '../jobs/jobs.service';
import { AgentStatus, PrinterStatus, PrintAttemptStatus, JobStatus } from '@secureprint/shared-types';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PrintersService {
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
    private jobsService: JobsService,
  ) {}

  async getShopPrinters(shopId: string) {
    const printers = await this.prisma.printer.findMany({
      where: { shopId },
      include: {
        agent: {
          select: {
            id: true,
            machineName: true,
            status: true,
            lastHeartbeatAt: true,
          },
        },
      },
      orderBy: [{ isDefault: 'desc' }, { windowsPrinterName: 'asc' }],
    });

    return printers;
  }

  async triggerTestPrint(printerId: string, actorId?: string, actorRole?: string) {
    const printer = await this.prisma.printer.findUnique({
      where: { id: printerId },
      include: { agent: true, shop: true },
    });

    if (!printer || printer.status === PrinterStatus.OFFLINE || printer.status === PrinterStatus.ERROR) {
      throw new BadRequestException('Printer is unavailable.');
    }

    if (!printer.agent) {
      throw new BadRequestException('Desktop Agent is offline.');
    }

    // Check heartbeat threshold (45 seconds)
    const threshold = new Date(Date.now() - 45000);
    const isOnline = printer.agent.lastHeartbeatAt && printer.agent.lastHeartbeatAt > threshold;

    if (!isOnline) {
      throw new BadRequestException('Desktop Agent is offline.');
    }

    // 1. Create or retrieve system test session
    let session = await this.prisma.customerSession.findFirst({
      where: { shopId: printer.shopId, customerName: 'System Test Print' },
      orderBy: { createdAt: 'desc' },
    });

    if (!session) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 1);
      session = await this.prisma.customerSession.create({
        data: {
          shop: { connect: { id: printer.shopId } },
          sessionToken: uuidv4(),
          customerName: 'System Test Print',
          deviceInfo: 'Counter Dashboard',
          expiresAt,
        },
      });
    }

    // 2. Generate small test PDF document
    const testPdfBuffer = this.generateTestPdfBuffer(printer.windowsPrinterName, printer.shop.name);
    const jobId = uuidv4();
    const fileId = uuidv4();
    const jobCode = `SP-TEST-${Math.floor(1000 + Math.random() * 9000)}`;

    const multerFakeFile: Express.Multer.File = {
      buffer: testPdfBuffer,
      originalname: `SecurePrint_Test_${printer.windowsPrinterName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
      mimetype: 'application/pdf',
      size: testPdfBuffer.length,
      fieldname: 'file',
      encoding: '7bit',
      destination: '',
      filename: '',
      path: '',
      stream: null as any,
    };

    const uploadRes = await this.storageService.saveFile(printer.shopId, jobId, fileId, multerFakeFile);

    // 3. Create real PrintJob in database
    const testJob = await this.prisma.printJob.create({
      data: {
        id: jobId,
        shopId: printer.shopId,
        sessionId: session.id,
        jobCode,
        status: JobStatus.REQUEST_SENT,
        printOptionsJson: {
          copies: 1,
          duplex: 'NONE',
          colorMode: 'BW',
          paperSize: 'A4',
          orientation: 'PORTRAIT',
        },
        pricingSnapshotJson: {
          totalPageCount: 1,
          bwPageCount: 1,
          colorPageCount: 0,
          copies: 1,
          ratePerBwPage: 0,
          ratePerColorPage: 0,
          duplexMultiplier: 1,
          subtotal: 0,
          taxAmount: 0,
          finalAmount: 0,
          currency: 'INR',
          calculatedAt: new Date().toISOString(),
        },
        files: {
          create: {
            id: fileId,
            shopId: printer.shopId,
            storageKey: uploadRes.storageKey,
            originalName: uploadRes.originalName,
            mimeType: uploadRes.mimeType,
            sizeBytes: BigInt(uploadRes.sizeBytes),
            pageCount: 1,
          },
        },
      },
    });

    // 4. Submit to agent via jobsService
    await this.jobsService.submitToAgent(testJob.id, printer.id, actorId, actorRole);

    // 5. Poll up to 6 seconds for Desktop Agent to acknowledge and accept the job
    const maxWaitMs = 6000;
    const startWait = Date.now();
    let attemptAccepted = false;
    let finalAttempt: any = null;

    while (Date.now() - startWait < maxWaitMs) {
      await new Promise((resolve) => setTimeout(resolve, 600));
      finalAttempt = await this.prisma.printAttempt.findFirst({
        where: { jobId: testJob.id },
        orderBy: { createdAt: 'desc' },
      });

      if (
        finalAttempt &&
        (finalAttempt.status === PrintAttemptStatus.PRINTING ||
          finalAttempt.status === PrintAttemptStatus.COMPLETED)
      ) {
        attemptAccepted = true;
        break;
      }

      if (finalAttempt && finalAttempt.status === PrintAttemptStatus.FAILED) {
        throw new BadRequestException(
          `Test print failed on agent: ${finalAttempt.errorMessage || 'Spooler rejection'}`,
        );
      }
    }

    if (!attemptAccepted) {
      throw new BadRequestException('Desktop Agent did not accept the test print.');
    }

    return {
      success: true,
      message: `Test print accepted by Desktop Agent on '${printer.agent.machineName}' and spooled to '${printer.windowsPrinterName}'.`,
      jobId: testJob.id,
      jobCode,
      printerName: printer.windowsPrinterName,
      agentMachine: printer.agent.machineName,
      attemptStatus: finalAttempt?.status || 'PRINTING',
    };
  }

  private generateTestPdfBuffer(printerName: string, shopName: string): Buffer {
    const lines = [
      '%PDF-1.4',
      '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
      '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
      '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj',
      '4 0 obj << /Length 260 >> stream',
      'BT',
      '/F1 22 Tf',
      '72 720 Td',
      '(SECUREPRINT TEST PRINT) Tj',
      '0 -32 Td',
      '/F1 12 Tf',
      `(${printerName.replace(/[()]/g, '')}) Tj`,
      '0 -20 Td',
      `(${shopName.replace(/[()]/g, '')}) Tj`,
      '0 -20 Td',
      '(Verified Real Windows Spooler Execution) Tj',
      '0 -20 Td',
      `(${new Date().toISOString()}) Tj`,
      'ET',
      'endstream',
      'endobj',
      '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
      'xref',
      '0 6',
      '0000000000 65535 f ',
      '0000000009 00000 n ',
      '0000000058 00000 n ',
      '0000000115 00000 n ',
      '0000000234 00000 n ',
      '0000000540 00000 n ',
      'trailer << /Size 6 /Root 1 0 R >>',
      'startxref',
      '610',
      '%%EOF',
    ];
    return Buffer.from(lines.join('\n'), 'utf-8');
  }

  async setDefaultPrinter(printerId: string, shopId: string) {
    const target = await this.prisma.printer.findFirst({
      where: { id: printerId, shopId },
    });
    if (!target) throw new NotFoundException('Printer not found for this shop.');

    await this.prisma.$transaction([
      this.prisma.printer.updateMany({
        where: { shopId },
        data: { isDefault: false },
      }),
      this.prisma.printer.update({
        where: { id: printerId },
        data: { isDefault: true },
      }),
    ]);

    return { success: true, printerId, isDefault: true };
  }

  async deletePrinter(printerId: string, shopId: string) {
    const target = await this.prisma.printer.findFirst({
      where: { id: printerId, shopId },
    });
    if (!target) throw new NotFoundException('Printer not found for this shop.');

    await this.prisma.printAttempt.deleteMany({
      where: { printerId },
    });

    await this.prisma.printer.delete({
      where: { id: printerId },
    });

    return { success: true, deletedPrinterId: printerId };
  }
}
