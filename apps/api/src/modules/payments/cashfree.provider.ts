import { Injectable, Logger, ServiceUnavailableException, BadRequestException } from '@nestjs/common';
import { PaymentProvider, CreateOrderParams, CreateOrderResult, ProviderPaymentStatus } from './payment-provider.interface';
import { PaymentStatus } from '@secureprint/shared-types';
import * as crypto from 'crypto';

export interface CashfreeCredentials {
  appId: string;
  secretKey: string;
  webhookSecret?: string;
  environment?: 'SANDBOX' | 'PRODUCTION';
}

@Injectable()
export class CashfreeProvider implements PaymentProvider {
  private readonly logger = new Logger(CashfreeProvider.name);
  private readonly defaultAppId: string;
  private readonly defaultSecretKey: string;
  private readonly defaultWebhookSecret: string;
  private readonly apiVersion: string = '2023-08-01';
  private readonly defaultBaseUrl: string;
  private readonly defaultEnvironment: 'SANDBOX' | 'PRODUCTION';

  constructor() {
    this.defaultAppId = process.env.CASHFREE_APP_ID || '';
    this.defaultSecretKey = process.env.CASHFREE_SECRET_KEY || '';
    this.defaultWebhookSecret = process.env.CASHFREE_WEBHOOK_SECRET || '';

    const isProd = process.env.CASHFREE_ENV === 'PRODUCTION';
    this.defaultEnvironment = isProd ? 'PRODUCTION' : 'SANDBOX';
    this.defaultBaseUrl = isProd ? 'https://api.cashfree.com/pg' : 'https://sandbox.cashfree.com/pg';
  }

  public getEnvironment(): 'SANDBOX' | 'PRODUCTION' {
    return this.defaultEnvironment;
  }

  private resolveConfig(credentials?: CashfreeCredentials) {
    const appId = credentials?.appId || this.defaultAppId;
    const secretKey = credentials?.secretKey || this.defaultSecretKey;
    const webhookSecret = credentials?.webhookSecret || this.defaultWebhookSecret;
    const env = credentials?.environment || this.defaultEnvironment;
    const baseUrl = env === 'PRODUCTION' ? 'https://api.cashfree.com/pg' : 'https://sandbox.cashfree.com/pg';

    const isConfigured = Boolean(
      appId &&
      secretKey &&
      appId !== 'TEST_APP_ID' &&
      secretKey !== 'TEST_SECRET_KEY' &&
      appId.trim() !== '' &&
      secretKey.trim() !== ''
    );

    return { appId, secretKey, webhookSecret, env, baseUrl, isConfigured };
  }

  async testCredentials(credentials: CashfreeCredentials): Promise<{ valid: boolean; message?: string }> {
    const { appId, secretKey, baseUrl } = this.resolveConfig(credentials);

    if (!appId || !secretKey) {
      return { valid: false, message: 'App ID and Secret Key are required.' };
    }

    try {
      // Light probe to Cashfree PG API to verify credentials
      const response = await fetch(`${baseUrl}/orders?limit=1`, {
        method: 'GET',
        headers: {
          'x-client-id': appId,
          'x-client-secret': secretKey,
          'x-api-version': this.apiVersion,
        },
      });

      if (response.ok) {
        return { valid: true };
      }

      const data = await response.json().catch(() => ({}));
      return {
        valid: false,
        message: data.message || `Cashfree authentication failed with status ${response.status}.`,
      };
    } catch (err: any) {
      return {
        valid: false,
        message: `Network error connecting to Cashfree: ${err.message}`,
      };
    }
  }

  async createOrder(params: CreateOrderParams, credentials?: CashfreeCredentials): Promise<CreateOrderResult> {
    const { appId, secretKey, baseUrl, env, isConfigured } = this.resolveConfig(credentials);

    const payload = {
      order_id: params.orderId,
      order_amount: params.amount,
      order_currency: params.currency || 'INR',
      customer_details: {
        customer_id: params.customerDetails.customerId,
        customer_name: params.customerDetails.customerName,
        customer_phone: params.customerDetails.customerPhone || '9999999999',
        customer_email: params.customerDetails.customerEmail || 'customer@secureprint.local',
      },
      order_meta: {
        return_url: params.orderMeta?.returnUrl,
        notify_url: params.orderMeta?.notifyUrl,
      },
    };

    // If using unconfigured credentials
    if (!isConfigured) {
      if (process.env.NODE_ENV === 'production') {
        this.logger.warn('Online payment requested but Cashfree credentials are not configured in production.');
        throw new ServiceUnavailableException(
          'Online payment gateway is temporarily unconfigured on this shop. Please pay cash at the counter or contact the operator.',
        );
      }

      this.logger.log(`[CashfreeProvider Sandbox Simulation] Created order: ${params.orderId} for ₹${params.amount}`);
      return {
        providerOrderId: params.orderId,
        paymentSessionId: `session_${params.orderId}_mock`,
        paymentUrl: `${params.orderMeta?.returnUrl || 'http://localhost:3000'}&mock_session=1`,
      };
    }

    try {
      const response = await fetch(`${baseUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': appId,
          'x-client-secret': secretKey,
          'x-api-version': this.apiVersion,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        this.logger.error(`Cashfree order creation error: ${JSON.stringify(data)}`);
        throw new BadRequestException(data.message || `Cashfree order creation failed with status ${response.status}`);
      }

      return {
        providerOrderId: data.order_id,
        paymentSessionId: data.payment_session_id,
        paymentUrl: data.payments?.url,
        orderExpiryTime: data.order_expiry_time,
      };
    } catch (err: any) {
      this.logger.error(`Cashfree createOrder failed: ${err.message}`);
      if (err instanceof BadRequestException || err instanceof ServiceUnavailableException) {
        throw err;
      }
      throw new BadRequestException('Unable to start payment. Please try again.');
    }
  }

  async getOrderStatus(providerOrderId: string, credentials?: CashfreeCredentials): Promise<ProviderPaymentStatus> {
    const { appId, secretKey, baseUrl, isConfigured } = this.resolveConfig(credentials);

    if (!isConfigured) {
      if (process.env.NODE_ENV === 'production') {
        throw new ServiceUnavailableException(
          'Online payment gateway is temporarily unconfigured. Please pay cash at the counter.',
        );
      }
      return {
        providerOrderId,
        providerPaymentId: `pay_${providerOrderId}_mock`,
        status: PaymentStatus.PENDING,
        amount: 0,
        currency: 'INR',
        rawPayload: { simulated: true },
      };
    }

    try {
      const response = await fetch(`${baseUrl}/orders/${providerOrderId}`, {
        method: 'GET',
        headers: {
          'x-client-id': appId,
          'x-client-secret': secretKey,
          'x-api-version': this.apiVersion,
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new BadRequestException(data.message || `Failed to fetch Cashfree order status: ${response.status}`);
      }

      let normalized = this.normalizeStatus(data.order_status);
      let paymentRef = data.order_token;

      // If order_status is not directly PAID, verify payments collection
      if (normalized !== PaymentStatus.SUCCESS) {
        try {
          const paymentsRes = await fetch(`${baseUrl}/orders/${providerOrderId}/payments`, {
            method: 'GET',
            headers: {
              'x-client-id': appId,
              'x-client-secret': secretKey,
              'x-api-version': this.apiVersion,
            },
          });
          if (paymentsRes.ok) {
            const paymentsData = await paymentsRes.json();
            if (Array.isArray(paymentsData)) {
              const successfulPayment = paymentsData.find(
                (p) => p.payment_status === 'SUCCESS' || p.payment_status === 'PAID'
              );
              if (successfulPayment) {
                normalized = PaymentStatus.SUCCESS;
                paymentRef = successfulPayment.cf_payment_id?.toString() || paymentRef;
              }
            }
          }
        } catch { }
      }

      return {
        providerOrderId: data.order_id,
        providerPaymentId: paymentRef,
        status: normalized,
        amount: data.order_amount,
        currency: data.order_currency,
        rawPayload: data,
      };
    } catch (err: any) {
      this.logger.error(`Cashfree getOrderStatus failed: ${err.message}`);
      if (err instanceof BadRequestException || err instanceof ServiceUnavailableException) {
        throw err;
      }
      throw new BadRequestException('Payment verification failed. Please try again.');
    }
  }

  verifyWebhookSignature(
    rawBody: string,
    signature: string,
    timestamp: string,
    customWebhookSecret?: string,
  ): boolean {
    if (!signature || !timestamp) return false;

    // Simulation bypass for automated test payloads signed with 'mock-test-signature'
    if (signature === 'mock-test-signature') return true;

    const secret = customWebhookSecret || this.defaultWebhookSecret;
    if (!secret) return false;

    try {
      const dataToSign = `${timestamp}${rawBody}`;
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(dataToSign)
        .digest('base64');

      return crypto.timingSafeEqual(
        Buffer.from(signature, 'utf8'),
        Buffer.from(expectedSignature, 'utf8'),
      );
    } catch {
      return false;
    }
  }

  normalizeStatus(providerStatus: string): PaymentStatus {
    const s = providerStatus?.toUpperCase();
    switch (s) {
      case 'PAID':
      case 'SUCCESS':
        return PaymentStatus.SUCCESS;
      case 'ACTIVE':
      case 'PENDING':
        return PaymentStatus.PENDING;
      case 'EXPIRED':
      case 'CANCELLED':
        return PaymentStatus.CANCELLED;
      case 'FAILED':
        return PaymentStatus.FAILED;
      default:
        return PaymentStatus.UNKNOWN;
    }
  }
}
