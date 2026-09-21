import { Injectable, NotFoundException, BadRequestException, ServiceUnavailableException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CashfreeProvider, CashfreeCredentials } from './cashfree.provider';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { AuditService } from '../audit/audit.service';
import { CleanupService } from '../cleanup/cleanup.service';
import { PaymentStatus, PaymentMethod, JobStatus } from '@secureprint/shared-types';
import { encryptJson, decryptJson } from '../../common/utils/crypto.util';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private cashfree: CashfreeProvider,
    private realtime: RealtimeGateway,
    private auditService: AuditService,
    private cleanupService: CleanupService,
  ) {}

  async resolveShopCashfreeCredentials(shopId: string): Promise<CashfreeCredentials | undefined> {
    const account = await this.prisma.paymentProviderAccount.findFirst({
      where: { shopId, provider: 'CASHFREE', status: 'ACTIVE' },
    });

    if (account && account.encryptedCredentials) {
      const decrypted = decryptJson<{ appId: string; secretKey: string; webhookSecret?: string }>(
        account.encryptedCredentials,
      );
      if (decrypted?.appId && decrypted?.secretKey) {
        return {
          appId: decrypted.appId,
          secretKey: decrypted.secretKey,
          webhookSecret: decrypted.webhookSecret,
          environment: (account.environment as any) || 'SANDBOX',
        };
      }
    }

    // Check platform-level fallback credentials from environment
    const platformAppId = process.env.CASHFREE_APP_ID;
    const platformSecretKey = process.env.CASHFREE_SECRET_KEY;
    if (
      platformAppId &&
      platformSecretKey &&
      platformAppId !== 'TEST_APP_ID' &&
      platformSecretKey !== 'TEST_SECRET_KEY' &&
      platformAppId.trim() !== '' &&
      platformSecretKey.trim() !== ''
    ) {
      return {
        appId: platformAppId,
        secretKey: platformSecretKey,
        webhookSecret: process.env.CASHFREE_WEBHOOK_SECRET,
        environment: process.env.CASHFREE_ENV === 'PRODUCTION' ? 'PRODUCTION' : 'SANDBOX',
      };
    }

    return undefined;
  }

  async createOnlineOrder(jobId: string) {
    const job = await this.prisma.printJob.findUnique({
      where: { id: jobId },
      include: {
        session: true,
        shop: true,
      },
    });

    if (!job) throw new NotFoundException('Print job not found.');

    // ABSOLUTE RULE: No payment before printing completed
    if (!job.printingCompleted) {
      throw new BadRequestException(
        'Payment cannot be accepted before document printing is completed by the shop.',
      );
    }

    const pricing = job.pricingSnapshotJson as any;
    const finalAmount = Number(pricing.finalAmount);
    if (!finalAmount || finalAmount <= 0) {
      throw new BadRequestException('Invalid calculated print amount.');
    }

    // Resolve shop credentials or fallback
    const credentials = await this.resolveShopCashfreeCredentials(job.shopId);
    if (!credentials && process.env.NODE_ENV === 'production') {
      throw new ServiceUnavailableException(
        'Online payment gateway is temporarily unconfigured on this shop. Please pay cash at the counter or contact the operator.',
      );
    }

    const orderId = `SP_ORD_${job.jobCode}_${Date.now()}`;

    // Create payment record in DB
    const payment = await this.prisma.payment.create({
      data: {
        shopId: job.shopId,
        jobId: job.id,
        amount: finalAmount,
        currency: pricing.currency || 'INR',
        provider: PaymentMethod.CASHFREE,
        providerOrderId: orderId,
        status: PaymentStatus.CREATED,
      },
    });

    // Request order from Cashfree provider using resolved credentials
    const returnUrl = `${process.env.PUBLIC_BASE_URL || 'https://secure-print-web.vercel.app'}/job/${job.id}/payment?order_id=${orderId}`;
    const notifyUrl = `${process.env.API_BASE_URL || 'https://secure-print-api.onrender.com'}/api/v1/webhooks/cashfree`;

    const orderResult = await this.cashfree.createOrder(
      {
        orderId,
        amount: finalAmount,
        currency: pricing.currency || 'INR',
        customerDetails: {
          customerId: job.session.id,
          customerName: job.session.customerName,
        },
        orderMeta: {
          returnUrl,
          notifyUrl,
        },
      },
      credentials,
    );

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.PENDING },
    });

    await this.prisma.printJob.update({
      where: { id: job.id },
      data: {
        status: JobStatus.PAYMENT_PENDING,
        paymentMethod: PaymentMethod.CASHFREE,
      },
    });

    this.realtime.emitPaymentUpdate(job.id, job.shopId, {
      jobId: job.id,
      status: PaymentStatus.PENDING,
      amount: finalAmount,
    });

    return {
      orderId,
      paymentSessionId: orderResult.paymentSessionId,
      paymentUrl: orderResult.paymentUrl,
      amount: finalAmount,
      currency: pricing.currency || 'INR',
      environment: credentials?.environment || (process.env.CASHFREE_ENV === 'PRODUCTION' ? 'PRODUCTION' : 'SANDBOX'),
    };
  }

  async verifyPayment(jobId: string, providerOrderId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { jobId, providerOrderId },
      include: { job: { include: { shop: true, session: true } } },
    });

    if (!payment) throw new NotFoundException('Payment order not found.');

    // If already verified, return verified state
    if (payment.status === PaymentStatus.SUCCESS) {
      return { status: PaymentStatus.SUCCESS, verified: true };
    }

    const credentials = await this.resolveShopCashfreeCredentials(payment.shopId);

    // Query payment provider server-to-server
    const providerStatus = await this.cashfree.getOrderStatus(providerOrderId, credentials);

    // Strict validation checks
    if (providerStatus.status !== PaymentStatus.SUCCESS) {
      return {
        status: providerStatus.status,
        verified: false,
        message: 'Payment is not verified yet.',
      };
    }

    const job = payment.job;
    const pricing = job.pricingSnapshotJson as any;
    const expectedAmount = Number(pricing.finalAmount);

    // Amount match check
    if (providerStatus.amount > 0 && Math.abs(providerStatus.amount - expectedAmount) > 0.01) {
      this.logger.error(`Amount mismatch: expected ${expectedAmount}, got ${providerStatus.amount}`);
      throw new BadRequestException('Security verification failed: payment amount mismatch.');
    }

    // Atomic transaction for payment success
    await this.applyPaymentSuccess(payment.id, providerStatus.providerPaymentId || providerOrderId);

    return {
      status: PaymentStatus.SUCCESS,
      verified: true,
    };
  }

  async requestCashPayment(jobId: string) {
    const job = await this.prisma.printJob.findUnique({
      where: { id: jobId },
      include: { session: true },
    });

    if (!job) throw new NotFoundException('Print job not found.');

    if (!job.printingCompleted) {
      throw new BadRequestException('Printing must be completed before requesting payment.');
    }

    const pricing = job.pricingSnapshotJson as any;

    await this.prisma.$transaction(async (tx) => {
      await tx.printJob.update({
        where: { id: jobId },
        data: {
          paymentMethod: PaymentMethod.CASH,
          status: JobStatus.AWAITING_PAYMENT,
        },
      });

      await tx.payment.create({
        data: {
          shopId: job.shopId,
          jobId: job.id,
          amount: Number(pricing.finalAmount),
          currency: pricing.currency || 'INR',
          provider: PaymentMethod.CASH,
          status: PaymentStatus.PENDING,
        },
      });
    });

    this.realtime.emitPaymentUpdate(job.id, job.shopId, {
      jobId: job.id,
      method: PaymentMethod.CASH,
      status: 'CASH_REQUESTED',
      customerName: job.session.customerName,
      amount: pricing.finalAmount,
    });

    return {
      message: 'Cash payment requested. Please pay at the counter.',
    };
  }

  async confirmCashPayment(jobId: string, staffUserId: string, staffRole?: string) {
    const job = await this.prisma.printJob.findUnique({
      where: { id: jobId },
      include: {
        payments: { where: { provider: PaymentMethod.CASH }, orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (!job) throw new NotFoundException('Print job not found.');

    let payment = job.payments[0];
    const pricing = job.pricingSnapshotJson as any;

    if (!payment) {
      payment = await this.prisma.payment.create({
        data: {
          shopId: job.shopId,
          jobId: job.id,
          amount: Number(pricing.finalAmount),
          currency: pricing.currency || 'INR',
          provider: PaymentMethod.CASH,
          status: PaymentStatus.PENDING,
        },
      });
    }

    await this.applyPaymentSuccess(payment.id, `CASH_${Date.now()}`, staffUserId);

    await this.auditService.log({
      actorId: staffUserId,
      actorRole: staffRole,
      shopId: job.shopId,
      action: 'CASH_PAYMENT_CONFIRMED',
      entity: 'PAYMENT',
      entityId: payment.id,
      metadata: { jobId, amount: pricing.finalAmount },
    });

    return {
      success: true,
      message: 'Cash payment confirmed successfully.',
    };
  }

  private async applyPaymentSuccess(
    paymentId: string,
    providerPaymentRef: string,
    confirmedByUserId?: string,
  ) {
    const now = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      const existingPayment = await tx.payment.findUnique({
        where: { id: paymentId },
        include: {
          job: {
            include: {
              shop: true,
              session: true,
              files: true,
              receipts: { take: 1 },
            },
          },
        },
      });

      if (!existingPayment) throw new NotFoundException('Payment not found');

      // If already processed to SUCCESS with receipt, skip duplicate execution
      if (existingPayment.status === PaymentStatus.SUCCESS && existingPayment.job.receipts.length > 0) {
        return {
          payment: existingPayment,
          job: existingPayment.job,
          receipt: existingPayment.job.receipts[0],
          alreadyCompleted: true,
        };
      }

      const payment = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.SUCCESS,
          verifiedAt: existingPayment.verifiedAt || now,
          providerPaymentId: providerPaymentRef || existingPayment.providerPaymentId,
          confirmedByUserId: confirmedByUserId || existingPayment.confirmedByUserId,
        },
        include: {
          job: {
            include: {
              shop: true,
              session: true,
              files: true,
            },
          },
        },
      });

      const job = payment.job;

      // Update job to PAYMENT_SUCCESS
      await tx.printJob.update({
        where: { id: job.id },
        data: {
          status: JobStatus.PAYMENT_SUCCESS,
          paymentStatus: PaymentStatus.SUCCESS,
        },
      });

      // Check if receipt already exists
      let receipt = await tx.receipt.findFirst({
        where: { jobId: job.id },
      });

      if (!receipt) {
        const receiptNumber = `RCP-${job.jobCode}-${Date.now().toString().slice(-4)}`;
        const pricing = job.pricingSnapshotJson as any;

        receipt = await tx.receipt.create({
          data: {
            jobId: job.id,
            shopId: job.shopId,
            receiptNumber,
            customerName: job.session.customerName,
            shopDetailsJson: {
              name: job.shop.name,
              address: job.shop.address,
              phone: job.shop.phone,
            },
            jobDetailsJson: {
              jobCode: job.jobCode,
              options: job.printOptionsJson,
              files: job.files.map((f) => ({ name: f.originalName, pages: f.pageCount })),
            },
            pricingBreakdownJson: pricing,
            paymentDetailsJson: {
              method: payment.provider,
              amount: payment.amount,
              currency: payment.currency,
              reference: providerPaymentRef,
              paidAt: now.toISOString(),
            },
            issuedAt: now,
          },
        });
      }

      // Check if cleanup job already exists
      const existingCleanup = await tx.cleanupJob.findFirst({
        where: { jobId: job.id },
      });

      if (!existingCleanup) {
        const cleanupDate = new Date(now.getTime() + 10000); // 10-second server-side delay
        await tx.cleanupJob.create({
          data: {
            jobId: job.id,
            shopId: job.shopId,
            status: 'PENDING',
            scheduledFor: cleanupDate,
          },
        });
      }

      return { payment, job, receipt, alreadyCompleted: false };
    });

    if (result.alreadyCompleted) {
      return result;
    }

    // Realtime notification: Payment Verified
    this.realtime.emitPaymentUpdate(result.job.id, result.job.shopId, {
      jobId: result.job.id,
      status: PaymentStatus.SUCCESS,
      receiptNumber: result.receipt.receiptNumber,
    });

    // Schedule 10-second server-side cleanup worker!
    await this.cleanupService.scheduleDocumentCleanup(result.job.id, result.job.shopId);

    return result;
  }

  async getShopPaymentConfig(shopId: string) {
    const account = await this.prisma.paymentProviderAccount.findFirst({
      where: { shopId, provider: 'CASHFREE' },
    });

    if (account && account.encryptedCredentials) {
      const decrypted = decryptJson<{ appId: string; secretKey: string; webhookSecret?: string }>(
        account.encryptedCredentials,
      );
      if (decrypted?.appId) {
        const appId = decrypted.appId;
        const masked = appId.length > 8 ? `${appId.slice(0, 4)}••••${appId.slice(-4)}` : '••••••••';
        return {
          isConfigured: account.status === 'ACTIVE',
          status: account.status,
          provider: 'CASHFREE',
          environment: account.environment,
          appIdMasked: masked,
          hasWebhookSecret: Boolean(decrypted.webhookSecret),
          updatedAt: account.updatedAt,
        };
      }
    }

    // Check platform fallback
    const platformAppId = process.env.CASHFREE_APP_ID;
    const isPlatform = Boolean(
      platformAppId &&
      platformAppId !== 'TEST_APP_ID' &&
      platformAppId.trim() !== ''
    );

    return {
      isConfigured: isPlatform,
      status: isPlatform ? 'ACTIVE' : 'NOT_CONFIGURED',
      provider: 'CASHFREE',
      environment: process.env.CASHFREE_ENV === 'PRODUCTION' ? 'PRODUCTION' : 'SANDBOX',
      appIdMasked: isPlatform ? `${platformAppId!.slice(0, 4)}••••` : null,
      hasWebhookSecret: Boolean(process.env.CASHFREE_WEBHOOK_SECRET),
      isPlatformDefault: isPlatform,
    };
  }

  async updateShopPaymentConfig(
    shopId: string,
    appId: string,
    secretKey: string,
    environment: 'SANDBOX' | 'PRODUCTION' = 'SANDBOX',
    webhookSecret?: string,
  ) {
    const testResult = await this.cashfree.testCredentials({
      appId,
      secretKey,
      environment,
    });

    if (!testResult.valid) {
      throw new BadRequestException(
        `Failed to verify Cashfree credentials: ${testResult.message || 'Invalid API keys'}`,
      );
    }

    const encryptedCredentials = encryptJson({
      appId,
      secretKey,
      webhookSecret,
    });

    const existing = await this.prisma.paymentProviderAccount.findFirst({
      where: { shopId, provider: 'CASHFREE' },
    });

    if (existing) {
      await this.prisma.paymentProviderAccount.update({
        where: { id: existing.id },
        data: {
          encryptedCredentials,
          environment,
          status: 'ACTIVE',
          updatedAt: new Date(),
        },
      });
    } else {
      await this.prisma.paymentProviderAccount.create({
        data: {
          shopId,
          provider: 'CASHFREE',
          encryptedCredentials,
          environment,
          status: 'ACTIVE',
        },
      });
    }

    return {
      success: true,
      message: 'Cashfree payment gateway configured and verified successfully.',
      environment,
    };
  }

  async testShopPaymentConfig(appId: string, secretKey: string, environment: 'SANDBOX' | 'PRODUCTION') {
    return this.cashfree.testCredentials({ appId, secretKey, environment });
  }

  async getPublicPaymentMethods(jobId: string) {
    const job = await this.prisma.printJob.findUnique({
      where: { id: jobId },
      include: {
        shop: {
          include: { shopSettings: true },
        },
      },
    });
    if (!job) throw new NotFoundException('Print job not found.');

    const creds = await this.resolveShopCashfreeCredentials(job.shopId);
    return {
      isOnlineConfigured: Boolean(creds),
      environment: creds?.environment || 'SANDBOX',
      cashAccepted: job.shop.shopSettings?.cashAccepted ?? true,
    };
  }

  async getShopPayments(shopId: string, limit = 50) {
    return this.prisma.payment.findMany({
      where: { shopId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        job: {
          select: {
            id: true,
            jobCode: true,
            status: true,
            pricingSnapshotJson: true,
            session: {
              select: { customerName: true },
            },
            receipts: {
              select: { receiptNumber: true, id: true },
              take: 1,
            },
          },
        },
      },
    });
  }

  async getPlatformPayments(limit = 100) {
    return this.prisma.payment.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        shop: {
          select: { id: true, name: true, slug: true },
        },
        job: {
          select: {
            id: true,
            jobCode: true,
            status: true,
            session: {
              select: { customerName: true },
            },
            receipts: {
              select: { receiptNumber: true, id: true },
              take: 1,
            },
          },
        },
      },
    });
  }
}
