# Payment Architecture & Cashfree Provider Integration

SecurePrint strictly abstracts payment gateways behind a provider-neutral interface to eliminate vendor lock-in.

---

## 1. Provider Interface

```typescript
export interface PaymentProvider {
  createOrder(params: CreateOrderParams): Promise<CreateOrderResult>;
  getOrderStatus(providerOrderId: string): Promise<ProviderPaymentStatus>;
  verifyWebhookSignature(rawBody: string, signature: string, timestamp: string): boolean;
  normalizeStatus(providerStatus: string): PaymentStatus;
}
```

---

## 2. Cashfree Flow

1. Customer completes physical print and arrives at `/job/:jobId/payment`.
2. Backend validates `job.printingCompleted === true`.
3. Backend creates payment order with exact calculated snapshot amount.
4. Customer completes UPI/Card checkout via Cashfree.
5. Return URL returns customer to `/job/:jobId/payment?order_id=...`.
6. UI displays **"Verifying Payment..."** while backend verifies payment server-to-server (`getOrderStatus`).
7. Server validates:
   - Gateway status === `SUCCESS`
   - Order ID matches internal payment
   - Exact amount matches server-calculated pricing snapshot
   - Currency matches
8. Atomic database transaction applies success:
   - `Payment.status = SUCCESS`
   - `PrintJob.status = PAYMENT_SUCCESS`
   - Generates independent `Receipt`
   - Schedules 10-second server-side file deletion worker.
9. Only when backend responds with `verified: true` does the frontend route to `/job/:jobId/success`.

---

## 3. Webhook Signature Verification

Cashfree webhook signatures are verified using HMAC-SHA256:
```typescript
const dataToSign = `${timestamp}${rawBody}`;
const expectedSignature = crypto
  .createHmac('sha256', this.webhookSecret)
  .update(dataToSign)
  .digest('base64');
```
Invalid signatures are rejected immediately with HTTP 400.

---

## 4. Counter Cash Confirmation

When walk-in customers choose "Pay Cash at Counter":
- Customer status transitions to `AWAITING_PAYMENT` / `CASH_REQUESTED`.
- Shopkeeper sees live prompt in `/admin/print-queue`.
- Only authenticated shop staff or owners can call `POST /api/v1/payments/confirm-cash`.
- Customers cannot self-confirm cash payments under any circumstance.
- System records staff `userId`, timestamp, and writes an audit log before scheduling document cleanup.
