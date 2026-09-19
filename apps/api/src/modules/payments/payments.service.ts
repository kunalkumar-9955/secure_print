import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CashfreeProvider } from './cashfree.provider';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { AuditService } from '../audit/audit.service';
import { CleanupService } from '../cleanup/cleanup.service';
import { PaymentStatus, PaymentMethod, JobStatus } from '@secureprint/shared-types';
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

    // Request order from Cashfree provider
    const returnUrl = `${process.env.PUBLIC_BASE_URL || 'http://localhost:3000'}/job/${job.id}/payment?order_id=${orderId}`;
    const orderResult = await this.cashfree.createOrder({
      orderId,
      amount: finalAmount,
      currency: pricing.currency || 'INR',
      customerDetails: {
        customerId: job.session.id,
        customerName: job.session.customerName,
      },
      orderMeta: {
        returnUrl,
      },
    });

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

    // Query payment provider server-to-server
    const providerStatus = await this.cashfree.getOrderStatus(providerOrderId);

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
      const payment = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.SUCCESS,
          verifiedAt: now,
          providerPaymentId: providerPaymentRef,
          confirmedByUserId,
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

      // Create Receipt from database metadata
      const receiptNumber = `RCP-${job.jobCode}-${Date.now().toString().slice(-4)}`;
      const pricing = job.pricingSnapshotJson as any;

      const receipt = await tx.receipt.create({
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

      // Create CleanupJob record
      const cleanupDate = new Date(now.getTime() + 10000); // 10-second server-side delay
      await tx.cleanupJob.create({
        data: {
          jobId: job.id,
          shopId: job.shopId,
          status: 'PENDING',
          scheduledFor: cleanupDate,
        },
      });

      return { payment, job, receipt };
    });

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
