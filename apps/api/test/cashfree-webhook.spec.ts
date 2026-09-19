import { CashfreeProvider } from '../src/modules/payments/cashfree.provider';
import * as crypto from 'crypto';

describe('CashfreeProvider Webhook Security', () => {
  let provider: CashfreeProvider;

  beforeEach(() => {
    process.env.CASHFREE_WEBHOOK_SECRET = 'test_webhook_secret_key_12345';
    provider = new CashfreeProvider();
  });

  it('verifies a valid HMAC-SHA256 signature correctly', () => {
    const rawBody = JSON.stringify({
      data: { order: { order_id: 'SP_ORD_101', order_amount: 15.0 } },
      event: 'PAYMENT_SUCCESS',
    });
    const timestamp = '1789745000';

    const expectedSignature = crypto
      .createHmac('sha256', 'test_webhook_secret_key_12345')
      .update(`${timestamp}${rawBody}`)
      .digest('base64');

    const isValid = provider.verifyWebhookSignature(rawBody, expectedSignature, timestamp);
    expect(isValid).toBe(true);
  });

  it('rejects tampered webhook body or forged signature', () => {
    const rawBody = JSON.stringify({
      data: { order: { order_id: 'SP_ORD_101', order_amount: 15.0 } },
    });
    const tamperedBody = JSON.stringify({
      data: { order: { order_id: 'SP_ORD_101', order_amount: 0.01 } }, // Tampered
    });
    const timestamp = '1789745000';

    const signature = crypto
      .createHmac('sha256', 'test_webhook_secret_key_12345')
      .update(`${timestamp}${rawBody}`)
      .digest('base64');

    const isValid = provider.verifyWebhookSignature(tamperedBody, signature, timestamp);
    expect(isValid).toBe(false);
  });
});
