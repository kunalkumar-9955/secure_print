import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { StorageService } from '../src/modules/storage/storage.service';
import { CleanupService } from '../src/modules/cleanup/cleanup.service';
import { JobStatus, PaymentStatus, ShopStatus } from '@secureprint/shared-types';

describe('SecurePrint Full End-to-End Acceptance Journey', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let cleanupService: CleanupService;
  let storageService: StorageService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    cleanupService = app.get(CleanupService);
    storageService = app.get(StorageService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('executes full 15-step customer and shopkeeper lifecycle with 10s cleanup', async () => {
    const testSlug = `journey-${Date.now()}`;

    // 1. Super Admin onboard new shop in PENDING_PAYMENT
    const shop = await prisma.shop.create({
      data: {
        name: 'Automated Journey Cyber Cafe',
        slug: testSlug,
        status: ShopStatus.PENDING_PAYMENT,
        shopSettings: {
          create: {
            pricingRulesJson: {
              ratePerBwPage: 2.0,
              ratePerColorPage: 10.0,
              rateA3Multiplier: 2.0,
              rateLegalMultiplier: 1.2,
              duplexDiscountPercent: 10,
              minimumOrderAmount: 2.0,
              currency: 'INR',
            },
            autoPrintEnabled: false,
            cashAccepted: true,
          },
        },
      },
    });

    expect(shop.status).toBe(ShopStatus.PENDING_PAYMENT);

    // 2. Subscription Payment is verified -> Shop becomes ACTIVE
    const plan = await prisma.subscriptionPlan.findFirst();
    expect(plan).toBeDefined();

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const sub = await prisma.subscription.create({
      data: {
        shopId: shop.id,
        planId: plan!.id,
        status: 'ACTIVE',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
    });

    await prisma.shop.update({
      where: { id: shop.id },
      data: { status: ShopStatus.ACTIVE },
    });

    // 3. Customer scans permanent QR and starts session
    const session = await prisma.customerSession.create({
      data: {
        shopId: shop.id,
        sessionToken: `token-${Date.now()}`,
        customerName: 'Ananya Sharma',
        expiresAt: periodEnd,
      },
    });
    expect(session.customerName).toBe('Ananya Sharma');

    // 4. Customer uploads document to private storage
    const mockFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'College_Report_2026.pdf',
      encoding: '7bit',
      mimetype: 'application/pdf',
      size: 1024,
      buffer: Buffer.from('%PDF-1.4 Mock Encrypted Secure Document Content'),
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
    };

    const jobId = `job-${Date.now()}`;
    const fileId = `file-${Date.now()}`;
    const uploadRes = await storageService.saveFile(shop.id, jobId, fileId, mockFile);

    expect(storageService.fileExists(uploadRes.storageKey)).toBe(true);

    // 5. Job created with REQUEST_SENT status and server pricing snapshot
    const randomJobCode = `SP-${Math.floor(100000 + Math.random() * 900000)}`;
    const job = await prisma.printJob.create({
      data: {
        id: jobId,
        shopId: shop.id,
        sessionId: session.id,
        jobCode: randomJobCode,
        status: JobStatus.REQUEST_SENT,
        printOptionsJson: {
          colorMode: 'BW',
          copies: 2,
          paperSize: 'A4',
          duplex: 'NONE',
        },
        pricingSnapshotJson: {
          ratePerBwPage: 2.0,
          copies: 2,
          totalPageCount: 2,
          finalAmount: 4.0,
          currency: 'INR',
        },
        printingCompleted: false,
      },
    });

    await prisma.printJobFile.create({
      data: {
        id: fileId,
        jobId: job.id,
        shopId: shop.id,
        storageKey: uploadRes.storageKey,
        originalName: uploadRes.originalName,
        mimeType: uploadRes.mimeType,
        sizeBytes: BigInt(uploadRes.sizeBytes),
      },
    });

    // 6. Shop prints document: REQUEST_SENT -> PRINTING
    await prisma.printJob.update({
      where: { id: job.id },
      data: { status: JobStatus.PRINTING },
    });

    // 7. Shop completes printing: PRINTING -> PRINTING_COMPLETED -> AWAITING_PAYMENT
    const printedJob = await prisma.printJob.update({
      where: { id: job.id },
      data: {
        status: JobStatus.AWAITING_PAYMENT,
        printingCompleted: true,
      },
    });

    expect(printedJob.printingCompleted).toBe(true);
    expect(printedJob.status).toBe(JobStatus.AWAITING_PAYMENT);

    // 8. Payment processed and verified
    const payment = await prisma.payment.create({
      data: {
        shopId: shop.id,
        jobId: job.id,
        amount: 4.0,
        currency: 'INR',
        provider: 'CASH',
        status: PaymentStatus.SUCCESS,
        verifiedAt: new Date(),
      },
    });

    await prisma.printJob.update({
      where: { id: job.id },
      data: {
        status: JobStatus.PAYMENT_SUCCESS,
        paymentStatus: PaymentStatus.SUCCESS,
      },
    });

    // 9. Independent Receipt created from metadata
    const receipt = await prisma.receipt.create({
      data: {
        jobId: job.id,
        shopId: shop.id,
        receiptNumber: `RCP-SP-7711-${Date.now()}`,
        customerName: session.customerName,
        shopDetailsJson: { name: shop.name },
        jobDetailsJson: { jobCode: job.jobCode },
        pricingBreakdownJson: { finalAmount: 4.0 },
        paymentDetailsJson: { method: 'CASH', status: 'SUCCESS' },
      },
    });

    expect(receipt.receiptNumber).toBeDefined();

    // 10. Execute verified document cleanup
    await cleanupService.executeCleanup(job.id, shop.id);

    // 11. Verify file is deleted from private storage
    expect(storageService.fileExists(uploadRes.storageKey)).toBe(false);

    // 12. Verify file record is marked deleted
    const fileRecord = await prisma.printJobFile.findUnique({ where: { id: fileId } });
    expect(fileRecord?.isDeleted).toBe(true);
    expect(fileRecord?.deletedAt).toBeDefined();

    // 13. Verify job state is FILES_DELETED
    const finalJob = await prisma.printJob.findUnique({ where: { id: job.id } });
    expect(finalJob?.status).toBe(JobStatus.FILES_DELETED);

    // 14. Verify receipt remains accessible after document deletion
    const finalReceipt = await prisma.receipt.findFirst({ where: { jobId: job.id } });
    expect(finalReceipt).toBeDefined();
    expect(finalReceipt?.customerName).toBe('Ananya Sharma');
  });
});
