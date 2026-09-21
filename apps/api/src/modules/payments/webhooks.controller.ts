import { Controller, Post, Headers, Req, BadRequestException, Logger, HttpCode, HttpStatus } from '@nestjs/common';
import { Request } from 'express';
import { CashfreeProvider } from './cashfree.provider';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../../database/prisma.service';

@Controller('api/v1/webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private cashfree: CashfreeProvider,
    private paymentsService: PaymentsService,
    private prisma: PrismaService,
  ) {}

  @Post('cashfree')
  @HttpCode(HttpStatus.OK)
  async handleCashfreeWebhook(
    @Headers('x-webhook-signature') signature: string,
    @Headers('x-webhook-timestamp') timestamp: string,
    @Req() req: Request,
  ) {
    const rawBody =
      (req as any).rawBody && Buffer.isBuffer((req as any).rawBody)
        ? (req as any).rawBody.toString('utf8')
        : typeof req.body === 'string'
        ? req.body
        : JSON.stringify(req.body);

    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const orderId = payload?.data?.order?.order_id || payload?.orderId;

    // Check platform webhook secret first
    let isValid = this.cashfree.verifyWebhookSignature(rawBody, signature, timestamp);

    // If invalid or platform not configured, check shop-specific webhook secret
    if (!isValid && orderId) {
      const payment = await this.prisma.payment.findFirst({
        where: { providerOrderId: orderId },
      });
      if (payment) {
        const creds = await this.paymentsService.resolveShopCashfreeCredentials(payment.shopId);
        if (creds?.webhookSecret) {
          isValid = this.cashfree.verifyWebhookSignature(rawBody, signature, timestamp, creds.webhookSecret);
        }
      }
    }

    if (!isValid) {
      this.logger.warn('Cashfree webhook signature verification failed.');
      throw new BadRequestException('Invalid webhook signature.');
    }

    const eventType = payload?.type || payload?.event || 'PAYMENT_SUCCESS';

    if (!orderId) {
      this.logger.warn('Webhook payload missing order ID.');
      return { received: true };
    }

    // Idempotency check using PaymentEvent
    const payment = await this.prisma.payment.findFirst({
      where: { providerOrderId: orderId },
    });

    if (!payment) {
      this.logger.warn(`No internal payment matching providerOrderId: ${orderId}`);
      return { received: true };
    }

    const existingEvent = await this.prisma.paymentEvent.findFirst({
      where: { paymentId: payment.id, eventType, isProcessed: true },
    });

    if (existingEvent) {
      this.logger.log(`Webhook event ${eventType} for order ${orderId} already processed. Skipping.`);
      return { received: true, idempotent: true };
    }

    // Record payment event
    const eventRecord = await this.prisma.paymentEvent.create({
      data: {
        paymentId: payment.id,
        eventType,
        payloadJson: payload,
        signature,
        isProcessed: false,
      },
    });

    // Execute server-to-server verification and completion
    try {
      await this.paymentsService.verifyPayment(payment.jobId, orderId);

      await this.prisma.paymentEvent.update({
        where: { id: eventRecord.id },
        data: {
          isProcessed: true,
          processedAt: new Date(),
        },
      });
    } catch (err: any) {
      this.logger.error(`Webhook processing error for order ${orderId}: ${err.message}`);
    }

    return { received: true, success: true };
  }
}
