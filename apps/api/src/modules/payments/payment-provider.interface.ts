import { PaymentStatus } from '@secureprint/shared-types';

export interface CreateOrderParams {
  orderId: string;
  amount: number;
  currency: string;
  customerDetails: {
    customerId: string;
    customerName: string;
    customerPhone?: string;
    customerEmail?: string;
  };
  orderMeta?: {
    returnUrl?: string;
    notifyUrl?: string;
  };
}

export interface CreateOrderResult {
  providerOrderId: string;
  paymentSessionId: string;
  paymentUrl?: string;
  orderExpiryTime?: string;
}

export interface ProviderPaymentStatus {
  providerOrderId: string;
  providerPaymentId?: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  rawPayload: any;
}

export interface PaymentProvider {
  createOrder(params: CreateOrderParams): Promise<CreateOrderResult>;
  getOrderStatus(providerOrderId: string): Promise<ProviderPaymentStatus>;
  verifyWebhookSignature(rawBody: string, signature: string, timestamp: string): boolean;
  normalizeStatus(providerStatus: string): PaymentStatus;
}
